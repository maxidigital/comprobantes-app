package com.maxidigital.comprobantes.security;

import com.maxidigital.comprobantes.exception.UnauthorizedException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

/**
 * No per-user login — a single shared secret checked the same way for
 * every method. Whoever has the password can both view and edit; there's
 * no separate admin tier. Normally read from the "X-Access-Key" header,
 * but a plain "key" query param is also accepted — needed for the
 * comprobante file link, which is a bare <a href> the browser navigates
 * to directly and can't attach a custom header to.
 */
@Component
public class AccessKeyInterceptor implements HandlerInterceptor {

    private static final String HEADER = "X-Access-Key";
    private static final String QUERY_PARAM = "key";

    private final String accessPassword;

    public AccessKeyInterceptor(@Value("${app.access-password}") String accessPassword) {
        this.accessPassword = accessPassword;
    }

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) {
        String providedKey = request.getHeader(HEADER);
        if (providedKey == null) {
            providedKey = request.getParameter(QUERY_PARAM);
        }
        boolean isConfigured = accessPassword != null && !accessPassword.isBlank();

        if (!isConfigured || !accessPassword.equals(providedKey)) {
            throw new UnauthorizedException("Clave de acceso inválida");
        }

        return true;
    }
}
