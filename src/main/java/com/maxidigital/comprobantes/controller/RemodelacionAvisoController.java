package com.maxidigital.comprobantes.controller;

import com.maxidigital.comprobantes.service.RemodelacionAvisoSheetService;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Caja Remodelación Iriondo: los mismos endpoints que AvisoController, contra su propia pestaña. */
@RestController
@RequestMapping("/api/remodelacion/avisos")
public class RemodelacionAvisoController extends AvisoController {

    public RemodelacionAvisoController(RemodelacionAvisoSheetService avisos) {
        super(avisos);
    }
}
