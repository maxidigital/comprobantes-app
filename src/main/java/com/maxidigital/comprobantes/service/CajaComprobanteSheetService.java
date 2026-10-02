package com.maxidigital.comprobantes.service;

import com.google.api.services.sheets.v4.Sheets;
import com.maxidigital.comprobantes.dto.ComprobanteResponse;
import com.maxidigital.comprobantes.service.SheetTab.Fila;

import java.io.IOException;
import java.util.Comparator;
import java.util.List;

/**
 * Comprobantes de una caja sin bien (ver CajaMovimientoSheetService), en su
 * propia pestaña: los ids de movimiento de cada caja arrancan de 1, así que
 * no pueden compartir la pestaña "Comprobantes" de Alquileres. Los archivos
 * van a la misma carpeta de Drive.
 */
public class CajaComprobanteSheetService implements ComprobanteStore {

    private final SheetTab tab;

    public CajaComprobanteSheetService(Sheets sheets, String spreadsheetId, String sheetName) {
        this(sheets, spreadsheetId, sheetName, "movimientoId");
    }

    /**
     * Con otra columna de referencia: los comprobantes de avisos usan
     * "avisoId" (pestañas "Comprobantes Avisos ..."). En la respuesta el id
     * referenciado sigue viajando como ComprobanteResponse#movimientoId.
     */
    public CajaComprobanteSheetService(Sheets sheets, String spreadsheetId, String sheetName, String columnaReferencia) {
        this.tab = new SheetTab(sheets, spreadsheetId, sheetName, List.of(
                "id", columnaReferencia, "url", "nombre", "creadoEn", "estado"));
    }

    @Override
    public ComprobanteResponse append(String movimientoId, String url, String nombre) throws IOException {
        return toResponse(tab.append(List.of(movimientoId, url, nombre)));
    }

    @Override
    public List<ComprobanteResponse> readAllActive() throws IOException {
        return tab.readActive().stream().map(CajaComprobanteSheetService::toResponse).toList();
    }

    @Override
    public List<ComprobanteResponse> findActiveByMovimiento(String movimientoId) throws IOException {
        return readAllActive().stream()
                .filter(c -> movimientoId.equals(c.movimientoId()))
                .sorted(Comparator.comparing(ComprobanteResponse::creadoEn))
                .toList();
    }

    @Override
    public ComprobanteResponse softDelete(String comprobanteId) throws IOException {
        ComprobanteResponse borrado = toResponse(tab.find(comprobanteId));
        tab.softDelete(comprobanteId);
        return borrado;
    }

    /** Cascada al eliminar el movimiento — no borra los archivos de Drive, igual que en Alquileres. */
    @Override
    public void softDeleteAllForMovimiento(String movimientoId) throws IOException {
        for (ComprobanteResponse c : findActiveByMovimiento(movimientoId)) {
            tab.softDelete(c.id());
        }
    }

    private static ComprobanteResponse toResponse(Fila f) {
        return new ComprobanteResponse(f.id(), f.dato(0), f.dato(1), f.dato(2), f.creadoEn());
    }
}
