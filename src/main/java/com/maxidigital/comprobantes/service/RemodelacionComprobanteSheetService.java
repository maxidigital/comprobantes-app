package com.maxidigital.comprobantes.service;

import com.google.api.services.sheets.v4.Sheets;
import com.maxidigital.comprobantes.dto.ComprobanteResponse;
import com.maxidigital.comprobantes.service.SheetTab.Fila;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.util.Comparator;
import java.util.List;

/**
 * Comprobantes de la caja Remodelación Iriondo, en su propia pestaña: los
 * ids de movimiento de esta caja arrancan de 1 igual que los de la
 * sucesión, así que no pueden compartir la pestaña "Comprobantes". Los
 * archivos van a la misma carpeta de Drive.
 */
@Service
public class RemodelacionComprobanteSheetService implements ComprobanteStore {

    private final SheetTab tab;

    public RemodelacionComprobanteSheetService(Sheets sheets,
                                                @Value("${google.spreadsheet-id}") String spreadsheetId) {
        this.tab = new SheetTab(sheets, spreadsheetId, "Comprobantes Remodelación", List.of(
                "id", "movimientoId", "url", "nombre", "creadoEn", "estado"));
    }

    @Override
    public ComprobanteResponse append(String movimientoId, String url, String nombre) throws IOException {
        return toResponse(tab.append(List.of(movimientoId, url, nombre)));
    }

    @Override
    public List<ComprobanteResponse> readAllActive() throws IOException {
        return tab.readActive().stream().map(RemodelacionComprobanteSheetService::toResponse).toList();
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

    /** Cascada al eliminar el movimiento — no borra los archivos de Drive, igual que en la sucesión. */
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
