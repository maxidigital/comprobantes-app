package com.maxidigital.comprobantes.dto;

public record MovimientoResponse(
        String id,
        String fecha,
        String tipo,
        double monto,
        String concepto,
        String categoria,
        String bien,
        String comprobanteUrl,
        String comprobanteNombre,
        String notas,
        String creadoEn,
        String cargadoPor,
        boolean comprobantePendiente
) {

    public static MovimientoResponse of(String id, String fecha, String tipo, double monto, String concepto,
                                         String categoria, String bien, String comprobanteUrl,
                                         String comprobanteNombre, String notas, String creadoEn,
                                         String cargadoPor) {
        boolean pendiente = comprobanteUrl == null || comprobanteUrl.isBlank();
        return new MovimientoResponse(id, fecha, tipo, monto, concepto, categoria, bien,
                comprobanteUrl, comprobanteNombre, notas, creadoEn, cargadoPor, pendiente);
    }
}
