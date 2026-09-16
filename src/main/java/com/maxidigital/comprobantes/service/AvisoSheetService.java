package com.maxidigital.comprobantes.service;

import com.google.api.services.sheets.v4.Sheets;
import com.google.api.services.sheets.v4.model.AddSheetRequest;
import com.google.api.services.sheets.v4.model.BatchUpdateSpreadsheetRequest;
import com.google.api.services.sheets.v4.model.Request;
import com.google.api.services.sheets.v4.model.SheetProperties;
import com.google.api.services.sheets.v4.model.Spreadsheet;
import com.google.api.services.sheets.v4.model.ValueRange;
import com.maxidigital.comprobantes.dto.AvisoResponse;
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
 * Avisos del administrador (o el editor) a los demás herederos —
 * "subieron las expensas de Iriondo", por el estilo. Pestaña propia
 * (mismo patrón que ComprobanteSheetService: contador de ids propio,
 * ensureSheetExists porque es una pestaña nueva, baja lógica por
 * "estado"), completamente ajena a Movimientos: no afecta Totals ni el
 * balance. El frontend es quien intercala avisos y movimientos por fecha
 * para mostrarlos juntos.
 */
@Service
public class AvisoSheetService {

    private static final String SHEET_NAME = "Avisos";
    private static final String RANGE_ALL = SHEET_NAME + "!A:G";
    private static final List<Object> HEADER = List.of(
            "id", "fecha", "texto", "bien", "autor", "creadoEn", "estado");
    private static final String ESTADO_ACTIVO = "activo";
    private static final String ESTADO_ELIMINADO = "eliminado";

    private static final DateTimeFormatter ISO_DATE = DateTimeFormatter.ISO_LOCAL_DATE;
    private static final DateTimeFormatter SHEET_DATE = DateTimeFormatter.ofPattern("dd/MM/yyyy");

    private final Sheets sheets;
    private final String spreadsheetId;

    public AvisoSheetService(Sheets sheets, @Value("${google.spreadsheet-id}") String spreadsheetId) {
        this.sheets = sheets;
        this.spreadsheetId = spreadsheetId;
    }

    public AvisoResponse append(String fecha, String texto, String bien, String autor) throws IOException {
        ensureHeader();

        String id = String.valueOf(nextId(readRawRows()));
        String creadoEn = Instant.now().toString();
        List<Object> row = List.of(id, toSheetDate(fecha), texto, bien, nullToEmpty(autor), creadoEn, ESTADO_ACTIVO);

        ValueRange valueRange = new ValueRange().setValues(List.of(row));
        sheets.spreadsheets().values()
                .append(spreadsheetId, RANGE_ALL, valueRange)
                .setValueInputOption("RAW")
                .execute();

        return new AvisoResponse(id, fecha, texto, bien, nullToEmpty(autor), creadoEn);
    }

    public List<AvisoResponse> readAllActive() throws IOException {
        List<List<Object>> rows = readRawRows();
        List<AvisoResponse> result = new ArrayList<>();
        for (int i = 1; i < rows.size(); i++) {
            List<Object> row = rows.get(i);
            if (ESTADO_ELIMINADO.equals(cell(row, 6))) continue;
            result.add(toResponse(row));
        }
        Collections.reverse(result);
        return result;
    }

    public void softDelete(String id) throws IOException {
        List<List<Object>> rows = readRawRows();
        int rowIndex = locateRowIndex(rows, id);
        updateCell("G" + (rowIndex + 1), ESTADO_ELIMINADO);
    }

    private int locateRowIndex(List<List<Object>> rows, String id) {
        for (int i = 1; i < rows.size(); i++) {
            if (id.equals(cell(rows.get(i), 0))) {
                return i;
            }
        }
        throw new NotFoundException("No existe un aviso con id " + id);
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
                    .update(spreadsheetId, SHEET_NAME + "!A1:G1", header)
                    .setValueInputOption("RAW")
                    .execute();
        }
    }

    /** Crea la pestaña "Avisos" si todavía no existe. */
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

    private static int nextId(List<List<Object>> rows) {
        int max = 0;
        for (int i = 1; i < rows.size(); i++) {
            try {
                max = Math.max(max, Integer.parseInt(cell(rows.get(i), 0)));
            } catch (NumberFormatException ignored) {
                // filas con id en otro formato no cuentan para la secuencia
            }
        }
        return max + 1;
    }

    private static AvisoResponse toResponse(List<Object> row) {
        return new AvisoResponse(
                cell(row, 0), fromSheetDate(cell(row, 1)), cell(row, 2), cell(row, 3), cell(row, 4), cell(row, 5));
    }

    private static String cell(List<Object> row, int index) {
        return row.size() > index && row.get(index) != null ? String.valueOf(row.get(index)) : "";
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
            return sheetDate;
        }
    }
}
