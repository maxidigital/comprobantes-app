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
import java.util.UUID;

/**
 * One shared spreadsheet for the whole estate (not one-per-user, unlike
 * re.mind2's NotesSheetService). Soft-delete via an "estado" column, same
 * reasoning as NotesSheetService: physically deleting a row would shift
 * every row after it, and two quick actions before the frontend refetches
 * could then hit the wrong row.
 */
@Service
public class MovimientoSheetService {

    private static final String RANGE_ALL = "A:M";
    private static final List<Object> HEADER = List.of(
            "id", "fecha", "tipo", "monto", "concepto", "categoria", "bien",
            "comprobanteUrl", "comprobanteNombre", "notas", "creadoEn", "estado", "cargadoPor");
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
                                      String bien, String comprobanteUrl, String comprobanteNombre, String notas,
                                      String cargadoPor)
            throws IOException {
        ensureHeader();

        String id = UUID.randomUUID().toString();
        String creadoEn = Instant.now().toString();

        List<Object> row = List.of(
                id, toSheetDate(fecha), tipo, monto, concepto,
                nullToEmpty(categoria), nullToEmpty(bien),
                nullToEmpty(comprobanteUrl), nullToEmpty(comprobanteNombre),
                nullToEmpty(notas), creadoEn, ESTADO_ACTIVO, nullToEmpty(cargadoPor));

        ValueRange valueRange = new ValueRange().setValues(List.of(row));
        sheets.spreadsheets().values()
                .append(spreadsheetId, RANGE_ALL, valueRange)
                .setValueInputOption("RAW")
                .execute();

        return MovimientoResponse.of(id, fecha, tipo, monto, concepto, nullToEmpty(categoria), nullToEmpty(bien),
                nullToEmpty(comprobanteUrl), nullToEmpty(comprobanteNombre), nullToEmpty(notas), creadoEn,
                nullToEmpty(cargadoPor));
    }

    public List<MovimientoResponse> readAll() throws IOException {
        List<List<Object>> rows = readRawRows();
        List<MovimientoResponse> result = new ArrayList<>();

        for (int i = 1; i < rows.size(); i++) {
            List<Object> row = rows.get(i);
            if (ESTADO_ELIMINADO.equals(cell(row, 11))) {
                continue;
            }
            result.add(MovimientoResponse.of(
                    cell(row, 0), fromSheetDate(cell(row, 1)), cell(row, 2),
                    parseDouble(cell(row, 3)), cell(row, 4), cell(row, 5), cell(row, 6),
                    cell(row, 7), cell(row, 8), cell(row, 9), cell(row, 10), cell(row, 12)));
        }

        Collections.reverse(result);
        return result;
    }

    public void softDelete(String id) throws IOException {
        List<List<Object>> rows = readRawRows();
        int rowIndex = locateRowIndex(rows, id);
        updateCell("L" + (rowIndex + 1), ESTADO_ELIMINADO);
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
        updateCell("J" + sheetRow, nullToEmpty(notas));

        return MovimientoResponse.of(id, fecha, tipo, monto, concepto, nullToEmpty(categoria), nullToEmpty(bien),
                cell(row, 7), cell(row, 8), nullToEmpty(notas), cell(row, 10), cell(row, 12));
    }

    public MovimientoResponse attachComprobante(String id, String comprobanteUrl, String comprobanteNombre)
            throws IOException {
        List<List<Object>> rows = readRawRows();
        int rowIndex = locateRowIndex(rows, id);
        List<Object> row = rows.get(rowIndex);
        int sheetRow = rowIndex + 1; // 1-indexed sheet row; header occupies row 1

        updateCell("H" + sheetRow, comprobanteUrl);
        updateCell("I" + sheetRow, comprobanteNombre);

        return MovimientoResponse.of(cell(row, 0), fromSheetDate(cell(row, 1)), cell(row, 2), parseDouble(cell(row, 3)),
                cell(row, 4), cell(row, 5), cell(row, 6), comprobanteUrl, comprobanteNombre,
                cell(row, 9), cell(row, 10), cell(row, 12));
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
                    .update(spreadsheetId, "A1:M1", header)
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
