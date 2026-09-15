package com.maxidigital.comprobantes.security;

import com.maxidigital.comprobantes.config.UsuariosConfig;
import com.maxidigital.comprobantes.exception.ForbiddenException;
import com.maxidigital.comprobantes.exception.UnauthorizedException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpMethod;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

/**
 * Sigue habiendo una única contraseña compartida (no hay password por
 * usuario) — lo que se agregó es que el nombre que viene junto a esa
 * contraseña tiene que matchear uno de los usuarios listados en
 * UsuariosConfig, y el rol de ese usuario determina qué métodos puede
 * usar. Sin sesión: cada request manda de nuevo contraseña + nombre (via
 * headers, con un fallback por query param para el mismo caso ya
 * documentado — un <a href> bare no puede mandar headers custom).
 */
@Component
public class AccessKeyInterceptor implements HandlerInterceptor {

    public static final String NOMBRE_ATTR = "usuarioNombre";
    public static final String ROL_ATTR = "usuarioRol";

    private static final String KEY_HEADER = "X-Access-Key";
    private static final String KEY_QUERY_PARAM = "key";
    private static final String NAME_HEADER = "X-User-Name";
    private static final String NAME_QUERY_PARAM = "user";

    private final String accessPassword;
    private final UsuariosConfig usuariosConfig;

    public AccessKeyInterceptor(@Value("${app.access-password}") String accessPassword,
                                 UsuariosConfig usuariosConfig) {
        this.accessPassword = accessPassword;
        this.usuariosConfig = usuariosConfig;
    }

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) {
        String providedKey = request.getHeader(KEY_HEADER);
        if (providedKey == null) {
            providedKey = request.getParameter(KEY_QUERY_PARAM);
        }
        boolean isConfigured = accessPassword != null && !accessPassword.isBlank();
        if (!isConfigured || !accessPassword.equals(providedKey)) {
            throw new UnauthorizedException("Clave de acceso inválida");
        }

        String nombreProvisto = request.getHeader(NAME_HEADER);
        if (nombreProvisto == null) {
            nombreProvisto = request.getParameter(NAME_QUERY_PARAM);
        }
        UsuariosConfig.Usuario usuario = usuariosConfig.usuarioDe(nombreProvisto);
        if (usuario == null) {
            throw new UnauthorizedException("Usuario no reconocido");
        }

        if (usuario.rol() == Rol.VIEWER && !HttpMethod.GET.matches(request.getMethod())) {
            throw new ForbiddenException("Tu usuario solo tiene permiso de lectura");
        }

        request.setAttribute(NOMBRE_ATTR, usuario.nombre());
        request.setAttribute(ROL_ATTR, usuario.rol());
        return true;
    }
}
