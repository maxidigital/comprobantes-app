package com.maxidigital.comprobantes.dto;

import java.util.List;

/**
 * Todo el historial del chat (lo guarda el frontend en localStorage, no hay
 * sesión server-side) — el último mensaje es la pregunta nueva. caja: sobre
 * qué caja es la pregunta nueva ("sucesion" = Alquileres, "remodelacion",
 * "varios"; null = Alquileres). Cada mensaje del usuario guarda además sobre
 * qué caja se hizo, porque la conversación es una sola aunque se cambie de caja.
 */
public record PreguntaRequest(List<MensajeChat> mensajes, String caja) {

    public record MensajeChat(String autor, String texto, String caja) {
        public static final String AUTOR_USUARIO = "USUARIO";
        public static final String AUTOR_IA = "IA";
    }
}
