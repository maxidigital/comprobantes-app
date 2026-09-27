package com.maxidigital.comprobantes.config;

import com.theokanning.openai.service.OpenAiService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.time.Duration;

/**
 * Cliente de OpenAI para "Preguntale a la IA" — misma librería y mismo
 * estilo que re.mind2 (OPENAI_API_KEY leída directo de la env var). Si la
 * variable no está, el bean se crea igual (para no romper el arranque de
 * toda la app por una funcionalidad accesoria) y AsistenteIAService corta
 * antes de llamar con un mensaje claro.
 */
@Configuration
public class OpenAiConfig {

    @Bean
    public OpenAiService openAiService(@Value("${OPENAI_API_KEY:}") String apiKey) {
        return new OpenAiService(apiKey, Duration.ofSeconds(60));
    }
}
