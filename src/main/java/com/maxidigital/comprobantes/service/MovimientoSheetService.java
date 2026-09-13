package com.maxidigital.comprobantes.service;

import com.google.api.services.sheets.v4.Sheets;
import com.google.api.services.sheets.v4.model.ValueRange;
import com.maxidigital.comprobantes.dto.MovimientoResponse;
import com.maxidigital.comprobantes.exception.NotFoundException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.time.Instant;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

/**
 * One shared spreadsheet for the whole estate (not one-per-user, unlike
 * re.mind2's NotesSheetService). Soft-delete via an "estado" column, same
 * reasoning as NotesSheetService: physically deleting a row would shift
 * every row after it, and two quick actions before the frontend refetches
 * could then hit the wrong row.
 *
 * La columna H se reaprovechó como "comprobantesCount": un contador de solo
 * lectura (lo mantiene MovimientoController llamando a
 * updateComprobantesCount después de cada alta/baja de comprobante) para
 * poder ver de un vistazo, sin cambiar de pestaña, cuántos comprobantes
 * tiene cada movimiento. La vieja columna I (comprobanteNombre) sí se borró
 * del todo — ver la migración puntual del 2026-09-13 en CLAUDE.md — así que
 * las columnas después de H corrieron un lugar (I pasó a ser notas, etc.).
 *
 * Esta clase no sabe nada de comprobantes: cada MovimientoResponse que
 * construye lleva una lista vacía como placeholder, y quien la llama
 * (MovimientoController) la completa con MovimientoResponse#withComprobantes
 * después de consultar ComprobanteSheetService.
 */
@Service
public class MovimientoSheetService {

    private static final String RANGE_ALL = "A:L";
    private static final List<Object> HEADER = List.of(
            "id", "fecha", "tipo", "monto", "concepto", "categoria", "bien",
            "comprobantesCount", "notas", "creadoEn", "estado", "cargadoPor");
    private static final String ESTADO_ACTIVO = "activo";
    private static final String ESTADO_ELIMINADO = "eliminado";

    // The API and the frontend's <input type="date"> always speak ISO
    // (yyyy-MM-dd) — only the spreadsheet itself shows dd/MM/yyyy, since
    // that's what a human opening the sheet directly expects to see.
    private static final DateTimeFormatter ISO_DATE = DateTimeFormatter.ISO_LOCAL_DATE;
    private static final DateTimeFormatter SHEET_DATE = DateTimeFormatter.ofPattern("dd/MM/yyyy");

    private final Sheets sheets;
    private final String spreadsheetId;

    public MovimientoSheetService(Sheets sheets, @Value("${google.spreadsheet-id}") String spreadsheetId) {
        this.sheets = sheets;
        this.spreadsheetId = spreadsheetId;
    }

    public MovimientoResponse append(String fecha, String tipo, double monto, String concepto, String categoria,
                                      String bien, String notas, String cargadoPor)
            throws IOException {
        ensureHeader();

        // Id secuencial y corto (1, 2, 3...) en vez de UUID — con dos
        // pestañas separadas (Movimientos/Comprobantes) hace falta poder
        // ubicar a ojo, leyendo la planilla a mano, qué comprobante
        // corresponde a qué movimiento; un UUID hace eso imposible.
        String id = String.valueOf(nextId(readRawRows()));
        String creadoEn = Instant.now().toString();

        // El monto se manda como String (no como double/Double crudo) a
        // propósito: dejar que el cliente de Sheets serialice el número
        // directamente terminó formateándolo con la configuración regional
        // del contenedor de Railway (coma en vez de punto) antes de
        // guardarlo como texto — String.valueOf(double) en Java nunca
        // depende del locale, siempre usa punto, así que evita el problema
        // de raíz en vez de solo camuflarlo.
        List<Object> row = List.of(
                id, toSheetDate(fecha), tipo, String.valueOf(monto), concepto,
                nullToEmpty(categoria), nullToEmpty(bien), "0",
                nullToEmpty(notas), creadoEn, ESTADO_ACTIVO, nullToEmpty(cargadoPor));

        ValueRange valueRange = new ValueRange().setValues(List.of(row));
        sheets.spreadsheets().values()
                .append(spreadsheetId, RANGE_ALL, valueRange)
                .setValueInputOption("RAW")
                .execute();

        return MovimientoResponse.of(id, fecha, tipo, monto, concepto, nullToEmpty(categoria), nullToEmpty(bien),
                List.of(), nullToEmpty(notas), creadoEn, nullToEmpty(cargadoPor));
    }

    public List<MovimientoResponse> readAll() throws IOException {
        List<List<Object>> rows = readRawRows();
        List<MovimientoResponse> result = new ArrayList<>();

        for (int i = 1; i < rows.size(); i++) {
            List<Object> row = rows.get(i);
            if (ESTADO_ELIMINADO.equals(cell(row, 10))) {
                continue;
            }
            result.add(MovimientoResponse.of(
                    cell(row, 0), fromSheetDate(cell(row, 1)), cell(row, 2),
                    parseDouble(cell(row, 3)), cell(row, 4), cell(row, 5), cell(row, 6),
                    List.of(), cell(row, 8), cell(row, 9), cell(row, 11)));
        }

        Collections.reverse(result);
        return result;
    }

    public MovimientoResponse findById(String id) throws IOException {
        List<List<Object>> rows = readRawRows();
        int rowIndex = locateRowIndex(rows, id);
        List<Object> row = rows.get(rowIndex);

        return MovimientoResponse.of(cell(row, 0), fromSheetDate(cell(row, 1)), cell(row, 2), parseDouble(cell(row, 3)),
                cell(row, 4), cell(row, 5), cell(row, 6), List.of(), cell(row, 8), cell(row, 9), cell(row, 11));
    }

    public void softDelete(String id) throws IOException {
        List<List<Object>> rows = readRawRows();
        int rowIndex = locateRowIndex(rows, id);
        updateCell("K" + (rowIndex + 1), ESTADO_ELIMINADO);
    }

    public MovimientoResponse update(String id, String fecha, String tipo, double monto, String concepto,
                                      String categoria, String bien, String notas) throws IOException {
        List<List<Object>> rows = readRawRows();
        int rowIndex = locateRowIndex(rows, id);
        List<Object> row = rows.get(rowIndex);
        int sheetRow = rowIndex + 1; // 1-indexed sheet row; header occupies row 1

        updateCell("B" + sheetRow, toSheetDate(fecha));
        updateCell("C" + sheetRow, tipo);
        updateCell("D" + sheetRow, String.valueOf(monto));
        updateCell("E" + sheetRow, concepto);
        updateCell("F" + sheetRow, nullToEmpty(categoria));
        updateCell("G" + sheetRow, nullToEmpty(bien));
        updateCell("I" + sheetRow, nullToEmpty(notas));

        return MovimientoResponse.of(id, fecha, tipo, monto, concepto, nullToEmpty(categoria), nullToEmpty(bien),
                List.of(), nullToEmpty(notas), cell(row, 9), cell(row, 11));
    }

    /** Mantiene la columna H ("comprobantesCount") al día — la llama MovimientoController después de cada alta/baja de comprobante. */
    public void updateComprobantesCount(String id, int count) throws IOException {
        List<List<Object>> rows = readRawRows();
        int rowIndex = locateRowIndex(rows, id);
        updateCell("H" + (rowIndex + 1), String.valueOf(count));
    }

    private int locateRowIndex(List<List<Object>> rows, String id) {
        for (int i = 1; i < rows.size(); i++) {
            if (id.equals(cell(rows.get(i), 0))) {
                return i;
            }
        }
        throw new NotFoundException("No existe un movimiento con id " + id);
    }

    private void updateCell(String cellRef, String value) throws IOException {
        ValueRange valueRange = new ValueRange().setValues(List.of(List.of(value)));
        sheets.spreadsheets().values()
                .update(spreadsheetId, cellRef, valueRange)
                .setValueInputOption("RAW")
                .execute();
    }

    private void ensureHeader() throws IOException {
        if (readRawRows().isEmpty()) {
            ValueRange header = new ValueRange().setValues(List.of(HEADER));
            sheets.spreadsheets().values()
                    .update(spreadsheetId, "A1:L1", header)
                    .setValueInputOption("RAW")
                    .execute();
        }
    }

    private List<List<Object>> readRawRows() throws IOException {
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

    private static String cell(List<Object> row, int index) {
        return row.size() > index && row.get(index) != null ? String.valueOf(row.get(index)) : "";
    }

    private static double parseDouble(String value) {
        try {
            return value.isBlank() ? 0 : Double.parseDouble(value);
        } catch (NumberFormatException e) {
            return 0;
        }
    }

    private static String nullToEmpty(String value) {
        return value != null ? value : "";
    }

    private static String toSheetDate(String isoDate) {
        try {
            return LocalDate.parse(isoDate, ISO_DATE).format(SHEET_DATE);
        } catch (DateTimeParseException e) {
            return isoDate;
        }
    }

    private static String fromSheetDate(String sheetDate) {
        try {
            return LocalDate.parse(sheetDate, SHEET_DATE).format(ISO_DATE);
        } catch (DateTimeParseException e) {
            // Rows written before this change (or edited by hand) may still
            // be plain ISO — leave them as-is instead of failing to load.
            return sheetDate;
        }
    }
}
