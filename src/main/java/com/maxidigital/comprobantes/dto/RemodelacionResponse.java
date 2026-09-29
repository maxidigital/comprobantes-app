package com.maxidigital.comprobantes.dto;

public record RemodelacionResponse(
        String id,
        String fecha,
        String tipo,
        double monto,
        String concepto,
        String notas,
        String creadoEn
) {
}
