package com.maxidigital.comprobantes.service;

import com.maxidigital.comprobantes.dto.MovimientoResponse;

import java.io.IOException;
import java.util.List;

/**
 * Lo que MovimientoController necesita de una pestaña de movimientos. Hay
 * dos: la de la sucesión (MovimientoSheetService, con bien) y la de la
 * caja Remodelación Iriondo (RemodelacionMovimientoSheetService, sin bien)
 * — mismo sistema, planillas separadas para que la plata no se mezcle.
 */
public interface MovimientoStore {

    MovimientoResponse append(String fecha, String tipo, double monto, String concepto,
                              String bien, String notas, String cargadoPor) throws IOException;

    List<MovimientoResponse> readAll() throws IOException;

    MovimientoResponse findById(String id) throws IOException;

    void softDelete(String id) throws IOException;

    MovimientoResponse update(String id, String fecha, String tipo, double monto, String concepto,
                              String bien, String notas) throws IOException;

    void updateComprobantesCount(String id, int count) throws IOException;
}
