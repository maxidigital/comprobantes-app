package com.maxidigital.comprobantes.service;

import com.google.api.services.sheets.v4.Sheets;
import com.maxidigital.comprobantes.dto.RemodelacionResponse;
import com.maxidigital.comprobantes.service.SheetTab.Fila;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.util.List;

import static com.maxidigital.comprobantes.service.SheetTab.*;

/**
 * Caja "Remodelación Iriondo": los gastos reales de la obra, en pesos.
 * Separada de Movimientos (la caja de los alquileres) para que la plata de
 * la obra no se mezcle con el flujo normal de la sucesión. Sin columna
 * "bien" (es toda de Iriondo) y sin comprobantes por ahora.
 */
@Service
public class RemodelacionIriondoSheetService {

    private final SheetTab tab;

    public RemodelacionIriondoSheetService(Sheets sheets, @Value("${google.spreadsheet-id}") String spreadsheetId) {
        this.tab = new SheetTab(sheets, spreadsheetId, "Remodelación Iriondo", List.of(
                "id", "fecha", "tipo", "monto", "concepto", "notas", "creadoEn", "estado"));
    }

    public RemodelacionResponse append(String fecha, String tipo, double monto, String concepto, String notas)
            throws IOException {
        return toResponse(tab.append(datos(fecha, tipo, monto, concepto, notas)));
    }

    public List<RemodelacionResponse> readAllActive() throws IOException {
        return tab.readActive().stream().map(RemodelacionIriondoSheetService::toResponse).toList();
    }

    public RemodelacionResponse update(String id, String fecha, String tipo, double monto, String concepto,
                                        String notas) throws IOException {
        return toResponse(tab.update(id, datos(fecha, tipo, monto, concepto, notas)));
    }

    public void softDelete(String id) throws IOException {
        tab.softDelete(id);
    }

    // Monto como String: ver el comentario en MovimientoSheetService#append (locale del contenedor).
    private static List<String> datos(String fecha, String tipo, double monto, String concepto, String notas) {
        return List.of(toSheetDate(fecha), tipo, String.valueOf(monto), concepto, nullToEmpty(notas));
    }

    private static RemodelacionResponse toResponse(Fila f) {
        return new RemodelacionResponse(f.id(), fromSheetDate(f.dato(0)), f.dato(1), parseDouble(f.dato(2)),
                f.dato(3), f.dato(4), f.creadoEn());
    }
}
