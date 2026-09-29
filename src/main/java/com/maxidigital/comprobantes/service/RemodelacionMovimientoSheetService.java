package com.maxidigital.comprobantes.service;

import com.google.api.services.sheets.v4.Sheets;
import com.maxidigital.comprobantes.dto.MovimientoResponse;
import com.maxidigital.comprobantes.service.SheetTab.Fila;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

import static com.maxidigital.comprobantes.service.SheetTab.*;

/**
 * Movimientos de la caja "Remodelación Iriondo": los gastos de la obra, en
 * pesos, separados de la caja de los alquileres (MovimientoSheetService)
 * para que la plata no se mezcle. Mismo sistema que la sucesión
 * (comprobantes, avisos, cargadoPor) salvo el bien: es toda de Iriondo, así
 * que no hay columna y la respuesta lleva bien vacío.
 */
@Service
public class RemodelacionMovimientoSheetService implements MovimientoStore {

    // Índices dentro de "datos" (SheetTab maneja id, creadoEn y estado)
    private static final int FECHA = 0, TIPO = 1, MONTO = 2, CONCEPTO = 3, COMPROBANTES_COUNT = 4, NOTAS = 5,
            CARGADO_POR = 6;

    private final SheetTab tab;

    public RemodelacionMovimientoSheetService(Sheets sheets,
                                               @Value("${google.spreadsheet-id}") String spreadsheetId) {
        this.tab = new SheetTab(sheets, spreadsheetId, "Remodelación Iriondo", List.of(
                "id", "fecha", "tipo", "monto", "concepto", "comprobantesCount", "notas", "cargadoPor",
                "creadoEn", "estado"));
    }

    @Override
    public MovimientoResponse append(String fecha, String tipo, double monto, String concepto,
                                     String bien, String notas, String cargadoPor) throws IOException {
        return toResponse(tab.append(datos(fecha, tipo, monto, concepto, "0", notas, cargadoPor)));
    }

    @Override
    public List<MovimientoResponse> readAll() throws IOException {
        List<MovimientoResponse> result = new ArrayList<>(
                tab.readActive().stream().map(RemodelacionMovimientoSheetService::toResponse).toList());
        Collections.reverse(result);
        return result;
    }

    @Override
    public MovimientoResponse findById(String id) throws IOException {
        return toResponse(tab.find(id));
    }

    @Override
    public void softDelete(String id) throws IOException {
        tab.softDelete(id);
    }

    /** Conserva comprobantesCount y cargadoPor, que el formulario de edición no manda. */
    @Override
    public MovimientoResponse update(String id, String fecha, String tipo, double monto, String concepto,
                                     String bien, String notas) throws IOException {
        Fila actual = tab.find(id);
        return toResponse(tab.update(id, datos(fecha, tipo, monto, concepto,
                actual.dato(COMPROBANTES_COUNT), notas, actual.dato(CARGADO_POR))));
    }

    @Override
    public void updateComprobantesCount(String id, int count) throws IOException {
        tab.updateDato(id, COMPROBANTES_COUNT, String.valueOf(count));
    }

    // Monto como String: ver el comentario en MovimientoSheetService#append (locale del contenedor).
    private static List<String> datos(String fecha, String tipo, double monto, String concepto,
                                      String comprobantesCount, String notas, String cargadoPor) {
        return List.of(toSheetDate(fecha), tipo, String.valueOf(monto), concepto, comprobantesCount,
                nullToEmpty(notas), nullToEmpty(cargadoPor));
    }

    private static MovimientoResponse toResponse(Fila f) {
        return MovimientoResponse.of(f.id(), fromSheetDate(f.dato(FECHA)), f.dato(TIPO), parseDouble(f.dato(MONTO)),
                f.dato(CONCEPTO), "", List.of(), f.dato(NOTAS), f.creadoEn(), f.dato(CARGADO_POR));
    }
}
