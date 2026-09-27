package com.maxidigital.comprobantes.controller;

import com.maxidigital.comprobantes.dto.PreguntaRequest;
import com.maxidigital.comprobantes.dto.PreguntaResponse;
import com.maxidigital.comprobantes.security.AccessKeyInterceptor;
import com.maxidigital.comprobantes.security.Rol;
import com.maxidigital.comprobantes.service.AsistenteIAService;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestAttribute;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.io.IOException;

/**
 * POST (no GET) porque el body lleva todo el historial de la conversación.
 * Es de solo lectura igual — ver la excepción puntual para VIEWER en
 * AccessKeyInterceptor.
 */
@RestController
@RequestMapping("/api/preguntas")
public class PreguntaController {

    private final AsistenteIAService asistenteIAService;

    public PreguntaController(AsistenteIAService asistenteIAService) {
        this.asistenteIAService = asistenteIAService;
    }

    @PostMapping
    public PreguntaResponse preguntar(@RequestBody PreguntaRequest request,
                                       @RequestAttribute(AccessKeyInterceptor.ROL_ATTR) Rol rol) throws IOException {
        return new PreguntaResponse(asistenteIAService.responder(request.mensajes(), rol != Rol.VIEWER));
    }
}
