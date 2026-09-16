package com.maxidigital.comprobantes.dto;

public record AvisoResponse(
        String id,
        String fecha,
        String texto,
        String bien,
        String autor,
        String creadoEn
) {
}
