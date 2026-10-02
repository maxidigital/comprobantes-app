package com.maxidigital.comprobantes.controller;

import com.maxidigital.comprobantes.service.CajaAvisoSheetService;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Caja Aportes personales: los mismos endpoints que AvisoController, contra su propia pestaña (ver CajasConfig). */
@RestController
@RequestMapping("/api/aportes/avisos")
public class AportesAvisoController extends AvisoController {

    public AportesAvisoController(@Qualifier("aportesAvisos") CajaAvisoSheetService avisos) {
        super(avisos);
    }
}
