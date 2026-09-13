package com.maxidigital.comprobantes.service;

import com.google.api.services.sheets.v4.Sheets;
import com.google.api.services.sheets.v4.model.AddSheetRequest;
import com.google.api.services.sheets.v4.model.BatchUpdateSpreadsheetRequest;
import com.google.api.services.sheets.v4.model.Request;
import com.google.api.services.sheets.v4.model.SheetProperties;
import com.google.api.services.sheets.v4.model.Spreadsheet;
import com.google.api.services.sheets.v4.model.ValueRange;
import com.maxidigital.comprobantes.dto.ComprobanteResponse;
import com.maxidigital.comprobantes.exception.NotFoundException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.stream.Collectors;

/**
 * Un movimiento puede tener varios comprobantes — se guardan como filas
 * propias en una pestaña separada ("Comprobantes") en vez de columnas en
 * Movimientos, mismo motivo de siempre para el soft-delete por fila: no
 * desincronizar índices entre dos acciones rápidas. La relación con el
 * movimiento es por movimientoId, no por posición de fila.
 */
@Service
public class ComprobanteSheetService {

    private static final String SHEET_NAME = "Comprobantes";
    private static final String RANGE_ALL = SHEET_NAME + "!A:F";
    private static final List<Object> HEADER = List.of("id", "movimientoId", "url", "nombre", "creadoEn", "estado");
    private static final String ESTADO_ACTIVO = "activo";
    private static final String ESTADO_ELIMINADO = "eliminado";

    private final Sheets sheets;
    private final String spreadsheetId;

    public ComprobanteSheetService(Sheets sheets, @Value("${google.spreadsheet-id}") String spreadsheetId) {
        this.sheets = sheets;
        this.spreadsheetId = spreadsheetId;
    }

    public ComprobanteResponse append(String movimientoId, String url, String nombre) throws IOException {
        ensureHeader();

        // Entero secuencial simple (no UUID) — para ubicar a qué movimiento
        // corresponde ya está la columna movimientoId al lado, no hace
        // falta que el id mismo la codifique.
        String id = String.valueOf(nextId(readRawRows()));
        String creadoEn = Instant.now().toString();
        List<Object> row = List.of(id, movimientoId, url, nombre, creadoEn, ESTADO_ACTIVO);

        ValueRange valueRange = new ValueRange().setValues(List.of(row));
        sheets.spreadsheets().values()
                .append(spreadsheetId, RANGE_ALL, valueRange)
                .setValueInputOption("RAW")
                .execute();

        return new ComprobanteResponse(id, movimientoId, url, nombre, creadoEn);
    }

    /** Todos los comprobantes activos de todos los movimientos, para hacer el join en memoria en un solo listado. */
    public List<ComprobanteResponse> readAllActive() throws IOException {
        List<List<Object>> rows = readRawRows();
        List<ComprobanteResponse> result = new ArrayList<>();
        for (int i = 1; i < rows.size(); i++) {
            List<Object> row = rows.get(i);
            if (ESTADO_ELIMINADO.equals(cell(row, 5))) continue;
            result.add(toResponse(row));
        }
        return result;
    }

    public List<ComprobanteResponse> findActiveByMovimiento(String movimientoId) throws IOException {
        return readAllActive().stream()
                .filter(c -> movimientoId.equals(c.movimientoId()))
                .sorted(Comparator.comparing(ComprobanteResponse::creadoEn))
                .collect(Collectors.toList());
    }

    /** Devuelve el comprobante borrado (para poder borrar también el archivo real en Drive) o null si ya no existía. */
    public ComprobanteResponse softDelete(String comprobanteId) throws IOException {
        List<List<Object>> rows = readRawRows();
        int rowIndex = locateRowIndex(rows, comprobanteId);
        List<Object> row = rows.get(rowIndex);
        updateCell("F" + (rowIndex + 1), ESTADO_ELIMINADO);
        return toResponse(row);
    }

    /** Baja lógica en cascada cuando se elimina el movimiento entero — no borra los archivos de Drive (mismo criterio que siempre tuvo el borrado de movimientos). */
    public void softDeleteAllForMovimiento(String movimientoId) throws IOException {
        List<List<Object>> rows = readRawRows();
        for (int i = 1; i < rows.size(); i++) {
            List<Object> row = rows.get(i);
            if (movimientoId.equals(cell(row, 1)) && !ESTADO_ELIMINADO.equals(cell(row, 5))) {
                updateCell("F" + (i + 1), ESTADO_ELIMINADO);
            }
        }
    }

    private int locateRowIndex(List<List<Object>> rows, String id) {
        for (int i = 1; i < rows.size(); i++) {
            if (id.equals(cell(rows.get(i), 0))) {
                return i;
            }
        }
        throw new NotFoundException("No existe un comprobante con id " + id);
    }

    private void updateCell(String cellRef, String value) throws IOException {
        ValueRange valueRange = new ValueRange().setValues(List.of(List.of(value)));
        sheets.spreadsheets().values()
                .update(spreadsheetId, SHEET_NAME + "!" + cellRef, valueRange)
                .setValueInputOption("RAW")
                .execute();
    }

    private void ensureHeader() throws IOException {
        if (readRawRows().isEmpty()) {
            ValueRange header = new ValueRange().setValues(List.of(HEADER));
            sheets.spreadsheets().values()
                    .update(spreadsheetId, SHEET_NAME + "!A1:F1", header)
                    .setValueInputOption("RAW")
                    .execute();
        }
    }

    /** Crea la pestaña "Comprobantes" si todavía no existe — apps más viejas (o un entorno nuevo) pueden no tenerla. */
    private void ensureSheetExists() throws IOException {
        Spreadsheet spreadsheet = sheets.spreadsheets().get(spreadsheetId).execute();
        boolean exists = spreadsheet.getSheets().stream()
                .anyMatch(s -> SHEET_NAME.equals(s.getProperties().getTitle()));

        if (!exists) {
            Request addSheet = new Request()
                    .setAddSheet(new AddSheetRequest().setProperties(new SheetProperties().setTitle(SHEET_NAME)));
            sheets.spreadsheets()
                    .batchUpdate(spreadsheetId, new BatchUpdateSpreadsheetRequest().setRequests(List.of(addSheet)))
                    .execute();
        }
    }

    private List<List<Object>> readRawRows() throws IOException {
        ensureSheetExists();
        ValueRange result = sheets.spreadsheets().values()
                .get(spreadsheetId, RANGE_ALL)
                .execute();
        List<List<Object>> values = result.getValues();
        return values != null ? values : List.of();
    }

    /** Recorre todos los ids ya usados (incluso de filas dadas de baja, para nunca repetir un número) y devuelve el siguiente. */
    private static int nextId(List<List<Object>> rows) {
        int max = 0;
        for (int i = 1; i < rows.size(); i++) {
            try {
                max = Math.max(max, Integer.parseInt(cell(rows.get(i), 0)));
            } catch (NumberFormatException ignored) {
                // filas viejas con id en otro formato (UUID) no cuentan para la secuencia
            }
        }
        return max + 1;
    }

    private static ComprobanteResponse toResponse(List<Object> row) {
        return new ComprobanteResponse(cell(row, 0), cell(row, 1), cell(row, 2), cell(row, 3), cell(row, 4));
    }

    private static String cell(List<Object> row, int index) {
        return row.size() > index && row.get(index) != null ? String.valueOf(row.get(index)) : "";
    }
}
