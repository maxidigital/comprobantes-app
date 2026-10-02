package com.maxidigital.comprobantes.controller;

import com.maxidigital.comprobantes.service.CajaAvisoSheetService;
import com.maxidigital.comprobantes.service.CajaComprobanteSheetService;
import com.maxidigital.comprobantes.service.ReceiptDriveService;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Caja Remodelación Iriondo: los mismos endpoints que AvisoController, contra su propia pestaña (ver CajasConfig). */
@RestController
@RequestMapping("/api/remodelacion/avisos")
public class RemodelacionAvisoController extends AvisoController {

    public RemodelacionAvisoController(@Qualifier("remodelacionAvisos") CajaAvisoSheetService avisos,
                                  @Qualifier("remodelacionAvisosComprobantes") CajaComprobanteSheetService comprobantes,
                                  ReceiptDriveService receiptDriveService) {
        super(avisos, comprobantes, receiptDriveService);
    }
}
