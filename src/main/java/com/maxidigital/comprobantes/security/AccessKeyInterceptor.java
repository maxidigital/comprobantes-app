package com.maxidigital.comprobantes.security;

import com.maxidigital.comprobantes.exception.UnauthorizedException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

/**
 * No per-user login — a single shared secret read from the "X-Access-Key"
 * header, checked the same way for every method. Whoever has the password
 * can both view and edit; there's no separate admin tier.
 */
@Component
public class AccessKeyInterceptor implements HandlerInterceptor {

    private static final String HEADER = "X-Access-Key";

    private final String accessPassword;

    public AccessKeyInterceptor(@Value("${app.access-password}") String accessPassword) {
        this.accessPassword = accessPassword;
    }

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) {
        String providedKey = request.getHeader(HEADER);
        boolean isConfigured = accessPassword != null && !accessPassword.isBlank();

        if (!isConfigured || !accessPassword.equals(providedKey)) {
            throw new UnauthorizedException("Clave de acceso inválida");
        }

        return true;
    }
}
