package com.maxidigital.comprobantes.controller;

import com.maxidigital.comprobantes.security.AccessKeyInterceptor;
import com.maxidigital.comprobantes.security.Rol;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/**
 * Un único endpoint para el gate de acceso: si AccessKeyInterceptor dejó
 * pasar el request (contraseña + nombre válidos), acá se devuelve el
 * nombre y el rol resueltos, para que el frontend sepa qué mostrar.
 */
@RestController
@RequestMapping("/api/auth")
public class AuthController {

    @GetMapping("/whoami")
    public Map<String, String> whoami(HttpServletRequest request) {
        String nombre = (String) request.getAttribute(AccessKeyInterceptor.NOMBRE_ATTR);
        Rol rol = (Rol) request.getAttribute(AccessKeyInterceptor.ROL_ATTR);
        return Map.of("nombre", nombre, "rol", rol.name());
    }
}
