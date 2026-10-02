package com.maxidigital.comprobantes.service;

import com.maxidigital.comprobantes.dto.AvisoResponse;

import java.io.IOException;
import java.util.List;

/** Pestaña de avisos de una caja — ver MovimientoStore. */
public interface AvisoStore {

    AvisoResponse append(String fecha, String texto, String bien, String autor) throws IOException;

    List<AvisoResponse> readAllActive() throws IOException;

    /** Un aviso puntual (activo o no); NotFoundException si no existe. */
    AvisoResponse findById(String id) throws IOException;

    /** Cambia fecha, texto y bien; el autor y creadoEn quedan los originales. */
    AvisoResponse update(String id, String fecha, String texto, String bien) throws IOException;

    void softDelete(String id) throws IOException;
}
