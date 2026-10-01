package com.maxidigital.comprobantes.dto;

/**
 * monto está en dólares — ver AportesPersonalesSheetService. cotizacion y
 * montoArs son opcionales (null si el aporte se cargó sin cotización):
 * montoArs = monto * cotizacion, lo calcula el backend.
 */
public record AporteResponse(
        String id,
        String fecha,
        String tipo,
        double monto,
        Double cotizacion,
        Double montoArs,
        String concepto,
        String aportante,
        String notas,
        String creadoEn,
        String cargadoPor
) {
}
