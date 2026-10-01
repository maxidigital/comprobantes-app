package com.maxidigital.comprobantes.controller;

import com.maxidigital.comprobantes.service.CajaAvisoSheetService;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Caja Varios (trámites de la sucesión): los mismos endpoints que AvisoController, contra su propia pestaña (ver CajasConfig). */
@RestController
@RequestMapping("/api/varios/avisos")
public class VariosAvisoController extends AvisoController {

    public VariosAvisoController(@Qualifier("variosAvisos") CajaAvisoSheetService avisos) {
        super(avisos);
    }
}
