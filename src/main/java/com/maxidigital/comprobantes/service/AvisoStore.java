package com.maxidigital.comprobantes.service;

import com.maxidigital.comprobantes.dto.AvisoResponse;

import java.io.IOException;
import java.util.List;

/** Pestaña de avisos de una caja — ver MovimientoStore. */
public interface AvisoStore {

    AvisoResponse append(String fecha, String texto, String bien, String autor) throws IOException;

    List<AvisoResponse> readAllActive() throws IOException;

    void softDelete(String id) throws IOException;
}
