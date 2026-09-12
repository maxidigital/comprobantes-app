package com.maxidigital.comprobantes.config;

import com.maxidigital.comprobantes.security.AccessKeyInterceptor;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class WebConfig implements WebMvcConfigurer {

    private final AccessKeyInterceptor accessKeyInterceptor;

    public WebConfig(AccessKeyInterceptor accessKeyInterceptor) {
        this.accessKeyInterceptor = accessKeyInterceptor;
    }

    /**
     * Cualquier origen — no vale la pena mantener una lista de dominios
     * permitidos sincronizada a mano (ya nos mordió una vez: el default de
     * desarrollo era el único permitido y bloqueaba todo en producción).
     * La seguridad real la da AccessKeyInterceptor (la contraseña), no
     * CORS — CORS acá es solo para que el navegador no se queje al pegarle
     * a la API desde el propio frontend servido por este mismo jar.
     */
    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/api/**")
            .allowedOriginPatterns("*")
            .allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS")
            .allowedHeaders("*");
    }

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(accessKeyInterceptor).addPathPatterns("/api/movimientos/**");
    }
}
