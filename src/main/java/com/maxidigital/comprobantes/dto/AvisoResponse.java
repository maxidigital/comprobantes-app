package com.maxidigital.comprobantes.dto;

import java.util.List;

/**
 * Un aviso. Los servicios de la pestaña de avisos no saben de comprobantes
 * (devuelven la lista vacía, igual que MovimientoResponse); AvisoController
 * la completa con withComprobantes después de consultar su ComprobanteStore.
 */
public record AvisoResponse(
        String id,
        String fecha,
        String texto,
        String bien,
        String autor,
        String creadoEn,
        List<ComprobanteResponse> comprobantes
) {
    public AvisoResponse(String id, String fecha, String texto, String bien, String autor, String creadoEn) {
        this(id, fecha, texto, bien, autor, creadoEn, List.of());
    }

    public AvisoResponse withComprobantes(List<ComprobanteResponse> comprobantes) {
        return new AvisoResponse(id, fecha, texto, bien, autor, creadoEn, comprobantes);
    }
}
