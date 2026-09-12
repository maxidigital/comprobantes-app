package com.maxidigital.comprobantes.security;

import com.maxidigital.comprobantes.exception.UnauthorizedException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

/**
 * No per-user login — just two shared secrets read from the "X-Access-Key"
 * header. GET requests accept either password (any heir can view); mutating
 * requests require the admin password (only the sibling running the estate).
 */
@Component
public class AccessKeyInterceptor implements HandlerInterceptor {

    private static final String HEADER = "X-Access-Key";

    private final String appPassword;
    private final String adminPassword;

    public AccessKeyInterceptor(@Value("${app.access-password}") String appPassword,
                                 @Value("${app.admin-password}") String adminPassword) {
        this.appPassword = appPassword;
        this.adminPassword = adminPassword;
    }

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) {
        String providedKey = request.getHeader(HEADER);
        boolean isAdmin = isConfigured(adminPassword) && adminPassword.equals(providedKey);
        boolean isViewer = isConfigured(appPassword) && appPassword.equals(providedKey);

        boolean isMutating = !"GET".equalsIgnoreCase(request.getMethod());

        if (isMutating && !isAdmin) {
            throw new UnauthorizedException("Se requiere la clave de administrador para esta acción");
        }
        if (!isMutating && !isAdmin && !isViewer) {
            throw new UnauthorizedException("Clave de acceso inválida");
        }

        return true;
    }

    private boolean isConfigured(String password) {
        return password != null && !password.isBlank();
    }
}
