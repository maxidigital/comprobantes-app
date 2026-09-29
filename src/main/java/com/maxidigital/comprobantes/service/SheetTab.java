package com.maxidigital.comprobantes.service;

import com.google.api.services.sheets.v4.Sheets;
import com.google.api.services.sheets.v4.model.AddSheetRequest;
import com.google.api.services.sheets.v4.model.BatchUpdateSpreadsheetRequest;
import com.google.api.services.sheets.v4.model.Request;
import com.google.api.services.sheets.v4.model.SheetProperties;
import com.google.api.services.sheets.v4.model.Spreadsheet;
import com.google.api.services.sheets.v4.model.ValueRange;
import com.maxidigital.comprobantes.exception.NotFoundException;

import java.io.IOException;
import java.time.Instant;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.List;

/**
 * La plomería repetida de "una pestaña propia con id secuencial y baja
 * lógica" — Avisos y Comprobantes la tienen copiada cada uno por su lado;
 * las cajas nuevas (Remodelación Iriondo, Aportes personales) la usan desde
 * acá en vez de sumar una tercera y cuarta copia. Pasar Avisos/Comprobantes
 * a esta clase queda como mejora aparte.
 *
 * Layout fijo de cada fila: {@code id | ...datos... | creadoEn | estado}.
 * Quien la usa solo arma y lee la parte de "datos"; el id, creadoEn y
 * estado los maneja esta clase. No es un bean: cada servicio crea la suya
 * con el nombre de su pestaña y su header.
 */
public class SheetTab {

    private static final String ESTADO_ACTIVO = "activo";
    private static final String ESTADO_ELIMINADO = "eliminado";

    // La API habla ISO (yyyy-MM-dd); la planilla muestra dd/MM/yyyy, que es
    // lo que espera ver alguien que la abre a mano.
    private static final DateTimeFormatter ISO_DATE = DateTimeFormatter.ISO_LOCAL_DATE;
    private static final DateTimeFormatter SHEET_DATE = DateTimeFormatter.ofPattern("dd/MM/yyyy");

    /** Una fila activa ya separada: {@code datos} son las columnas entre el id y creadoEn. */
    public record Fila(String id, List<String> datos, String creadoEn) {
        public String dato(int index) {
            return index < datos.size() ? datos.get(index) : "";
        }
    }

    private final Sheets sheets;
    private final String spreadsheetId;
    private final String sheetName;
    private final List<Object> header;
    private final String rangeAll;
    private final int estadoIndex;
    private volatile boolean sheetConfirmada = false;

    public SheetTab(Sheets sheets, String spreadsheetId, String sheetName, List<Object> header) {
        this.sheets = sheets;
        this.spreadsheetId = spreadsheetId;
        this.sheetName = sheetName;
        this.header = header;
        this.rangeAll = ref("A:" + columnLetter(header.size() - 1));
        this.estadoIndex = header.size() - 1;
    }

    /** Agrega una fila nueva y la devuelve como quedó guardada (con id y creadoEn asignados). */
    public Fila append(List<String> datos) throws IOException {
        checkDatos(datos);
        List<List<Object>> rows = readRawRows();
        if (rows.isEmpty()) {
            write(ref("A1:" + columnLetter(header.size() - 1) + "1"), header);
        }

        String id = String.valueOf(nextId(rows));
        String creadoEn = Instant.now().toString();
        List<Object> row = new ArrayList<>();
        row.add(id);
        row.addAll(datos);
        row.add(creadoEn);
        row.add(ESTADO_ACTIVO);

        sheets.spreadsheets().values()
                .append(spreadsheetId, rangeAll, new ValueRange().setValues(List.of(row)))
                .setValueInputOption("RAW")
                .execute();
        return new Fila(id, datos, creadoEn);
    }

    public List<Fila> readActive() throws IOException {
        List<List<Object>> rows = readRawRows();
        List<Fila> result = new ArrayList<>();
        for (int i = 1; i < rows.size(); i++) {
            List<Object> row = rows.get(i);
            if (ESTADO_ELIMINADO.equals(cell(row, estadoIndex))) continue;
            result.add(toFila(row));
        }
        return result;
    }

    /** Reescribe las columnas de datos de una fila (una sola llamada a la API, no celda por celda). */
    public Fila update(String id, List<String> datos) throws IOException {
        checkDatos(datos);
        List<List<Object>> rows = readRawRows();
        int rowIndex = locateRowIndex(rows, id);
        int sheetRow = rowIndex + 1;
        String rango = ref("B" + sheetRow + ":" + columnLetter(datos.size()) + sheetRow);
        write(rango, new ArrayList<>(datos));
        return new Fila(id, datos, cell(rows.get(rowIndex), estadoIndex - 1));
    }

    public void softDelete(String id) throws IOException {
        List<List<Object>> rows = readRawRows();
        int sheetRow = locateRowIndex(rows, id) + 1;
        write(ref(columnLetter(estadoIndex) + sheetRow), List.of(ESTADO_ELIMINADO));
    }

    public static String toSheetDate(String isoDate) {
        try {
            return LocalDate.parse(isoDate, ISO_DATE).format(SHEET_DATE);
        } catch (DateTimeParseException e) {
            return isoDate;
        }
    }

    public static String fromSheetDate(String sheetDate) {
        try {
            return LocalDate.parse(sheetDate, SHEET_DATE).format(ISO_DATE);
        } catch (DateTimeParseException e) {
            return sheetDate;
        }
    }

    public static double parseDouble(String value) {
        try {
            return value.isBlank() ? 0 : Double.parseDouble(value);
        } catch (NumberFormatException e) {
            return 0;
        }
    }

    public static String nullToEmpty(String value) {
        return value != null ? value : "";
    }

    private void checkDatos(List<String> datos) {
        // header = id + datos + creadoEn + estado
        if (datos.size() != header.size() - 3) {
            throw new IllegalArgumentException("La pestaña " + sheetName + " espera " + (header.size() - 3)
                    + " columnas de datos, llegaron " + datos.size());
        }
    }

    private Fila toFila(List<Object> row) {
        List<String> datos = new ArrayList<>();
        for (int c = 1; c < estadoIndex - 1; c++) {
            datos.add(cell(row, c));
        }
        return new Fila(cell(row, 0), datos, cell(row, estadoIndex - 1));
    }

    private int locateRowIndex(List<List<Object>> rows, String id) {
        for (int i = 1; i < rows.size(); i++) {
            if (id.equals(cell(rows.get(i), 0))) {
                return i;
            }
        }
        throw new NotFoundException("No existe una fila con id " + id + " en " + sheetName);
    }

    private void write(String range, List<Object> values) throws IOException {
        sheets.spreadsheets().values()
                .update(spreadsheetId, range, new ValueRange().setValues(List.of(values)))
                .setValueInputOption("RAW")
                .execute();
    }

    private List<List<Object>> readRawRows() throws IOException {
        ensureSheetExists();
        ValueRange result = sheets.spreadsheets().values().get(spreadsheetId, rangeAll).execute();
        List<List<Object>> values = result.getValues();
        return values != null ? values : List.of();
    }

    /** Crea la pestaña si todavía no existe. Una vez confirmada no se vuelve a consultar (una llamada menos por request). */
    private void ensureSheetExists() throws IOException {
        if (sheetConfirmada) return;
        Spreadsheet spreadsheet = sheets.spreadsheets().get(spreadsheetId).execute();
        boolean exists = spreadsheet.getSheets().stream()
                .anyMatch(s -> sheetName.equals(s.getProperties().getTitle()));
        if (!exists) {
            Request addSheet = new Request()
                    .setAddSheet(new AddSheetRequest().setProperties(new SheetProperties().setTitle(sheetName)));
            sheets.spreadsheets()
                    .batchUpdate(spreadsheetId, new BatchUpdateSpreadsheetRequest().setRequests(List.of(addSheet)))
                    .execute();
        }
        sheetConfirmada = true;
    }

    /** Recorre todos los ids ya usados (incluso de filas dadas de baja, para nunca repetir un número). */
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

    /** Los nombres de estas pestañas llevan espacios y tildes: en notación A1 van entre comillas simples. */
    private String ref(String cells) {
        return "'" + sheetName.replace("'", "''") + "'!" + cells;
    }

    /** 0 -> A, 1 -> B... (alcanza con una letra: ninguna pestaña pasa de 26 columnas). */
    private static String columnLetter(int index) {
        return String.valueOf((char) ('A' + index));
    }

    private static String cell(List<Object> row, int index) {
        return row.size() > index && row.get(index) != null ? String.valueOf(row.get(index)) : "";
    }
}
