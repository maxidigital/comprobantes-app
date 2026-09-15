package com.maxidigital.comprobantes.config;

import com.maxidigital.comprobantes.security.Rol;
import org.springframework.stereotype.Component;

import java.util.Locale;
import java.util.Map;

/**
 * Lista fija de usuarios conocidos (nombre + rol), hardcodeada acá en vez
 * de en una env var — son 3-4 nombres fijos de la familia, no hace falta
 * poder cambiarlos sin tocar código. No hay password por usuario ni tabla
 * en Sheets: la contraseña sigue siendo la única y compartida
 * (APP_PASSWORD); esto solo resuelve qué rol le corresponde al nombre que
 * la persona tipeó en el gate.
 */
@Component
public class UsuariosConfig {

    public record Usuario(String nombre, Rol rol) {
    }

    private static final Map<String, Usuario> USUARIOS = Map.of(
            "maxi", new Usuario("Maxi", Rol.ADMIN),
            "gustavo", new Usuario("Gustavo", Rol.EDITOR),
            "nico", new Usuario("Nico", Rol.VIEWER)
    );

    /** Devuelve el usuario (con el nombre "canónico", tal como está en USUARIOS) o null si no matchea ninguno. */
    public Usuario usuarioDe(String nombre) {
        if (nombre == null) {
            return null;
        }
        return USUARIOS.get(nombre.trim().toLowerCase(Locale.ROOT));
    }
}
