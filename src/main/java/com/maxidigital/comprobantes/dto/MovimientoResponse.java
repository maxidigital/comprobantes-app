package com.maxidigital.comprobantes.dto;

import java.util.List;

public record MovimientoResponse(
        String id,
        String fecha,
        String tipo,
        double monto,
        String concepto,
        String bien,
        List<ComprobanteResponse> comprobantes,
        String notas,
        String creadoEn,
        String cargadoPor,
        boolean comprobantePendiente
) {

    public static MovimientoResponse of(String id, String fecha, String tipo, double monto, String concepto,
                                         String bien, List<ComprobanteResponse> comprobantes,
                                         String notas, String creadoEn, String cargadoPor) {
        return new MovimientoResponse(id, fecha, tipo, monto, concepto, bien,
                comprobantes, notas, creadoEn, cargadoPor, comprobantes.isEmpty());
    }

    /** Reconstruye la respuesta con la lista de comprobantes real — se arma en dos pasos porque viven en pestañas/servicios distintos. */
    public MovimientoResponse withComprobantes(List<ComprobanteResponse> comprobantes) {
        return MovimientoResponse.of(id, fecha, tipo, monto, concepto, bien,
                comprobantes, notas, creadoEn, cargadoPor);
    }
}
