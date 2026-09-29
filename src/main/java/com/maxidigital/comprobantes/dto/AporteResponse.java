package com.maxidigital.comprobantes.dto;

/** monto está en dólares — ver AportesPersonalesSheetService. */
public record AporteResponse(
        String id,
        String fecha,
        String tipo,
        double monto,
        String concepto,
        String aportante,
        String notas,
        String creadoEn
) {
}
