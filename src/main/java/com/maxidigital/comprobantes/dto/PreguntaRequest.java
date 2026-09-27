package com.maxidigital.comprobantes.dto;

import java.util.List;

/** Todo el historial del chat (lo guarda el frontend en localStorage, no hay sesión server-side) — el último mensaje es la pregunta nueva. */
public record PreguntaRequest(List<MensajeChat> mensajes) {

    public record MensajeChat(String autor, String texto) {
        public static final String AUTOR_USUARIO = "USUARIO";
        public static final String AUTOR_IA = "IA";
    }
}
