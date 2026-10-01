package com.maxidigital.comprobantes.service;

import com.google.api.services.sheets.v4.Sheets;
import com.maxidigital.comprobantes.dto.AvisoResponse;
import com.maxidigital.comprobantes.service.SheetTab.Fila;

import java.io.IOException;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

import static com.maxidigital.comprobantes.service.SheetTab.*;

/** Avisos de una caja sin bien (ver CajaMovimientoSheetService) — como AvisoSheetService pero sin esa columna. */
public class CajaAvisoSheetService implements AvisoStore {

    private final SheetTab tab;

    public CajaAvisoSheetService(Sheets sheets, String spreadsheetId, String sheetName) {
        this.tab = new SheetTab(sheets, spreadsheetId, sheetName, List.of(
                "id", "fecha", "texto", "autor", "creadoEn", "estado"));
    }

    @Override
    public AvisoResponse append(String fecha, String texto, String bien, String autor) throws IOException {
        return toResponse(tab.append(List.of(toSheetDate(fecha), texto, nullToEmpty(autor))));
    }

    @Override
    public List<AvisoResponse> readAllActive() throws IOException {
        List<AvisoResponse> result = new ArrayList<>(
                tab.readActive().stream().map(CajaAvisoSheetService::toResponse).toList());
        Collections.reverse(result);
        return result;
    }

    @Override
    public void softDelete(String id) throws IOException {
        tab.softDelete(id);
    }

    private static AvisoResponse toResponse(Fila f) {
        return new AvisoResponse(f.id(), fromSheetDate(f.dato(0)), f.dato(1), "", f.dato(2), f.creadoEn());
    }
}
