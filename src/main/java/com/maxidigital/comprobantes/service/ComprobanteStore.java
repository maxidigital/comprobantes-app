package com.maxidigital.comprobantes.service;

import com.maxidigital.comprobantes.dto.ComprobanteResponse;

import java.io.IOException;
import java.util.List;

/** Pestaña de comprobantes de una caja — ver MovimientoStore. */
public interface ComprobanteStore {

    ComprobanteResponse append(String movimientoId, String url, String nombre) throws IOException;

    List<ComprobanteResponse> readAllActive() throws IOException;

    List<ComprobanteResponse> findActiveByMovimiento(String movimientoId) throws IOException;

    /** Devuelve el comprobante borrado, para poder borrar también el archivo en Drive. */
    ComprobanteResponse softDelete(String comprobanteId) throws IOException;

    void softDeleteAllForMovimiento(String movimientoId) throws IOException;
}
