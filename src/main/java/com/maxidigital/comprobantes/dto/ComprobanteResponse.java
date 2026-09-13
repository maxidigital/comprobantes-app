package com.maxidigital.comprobantes.dto;

public record ComprobanteResponse(
        String id,
        String movimientoId,
        String url,
        String nombre,
        String creadoEn
) {
}
