package com.maxidigital.comprobantes.controller;

import com.maxidigital.comprobantes.service.CajaAvisoSheetService;
import com.maxidigital.comprobantes.service.CajaComprobanteSheetService;
import com.maxidigital.comprobantes.service.ReceiptDriveService;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Caja Aportes personales: los mismos endpoints que AvisoController, contra su propia pestaña (ver CajasConfig). */
@RestController
@RequestMapping("/api/aportes/avisos")
public class AportesAvisoController extends AvisoController {

    public AportesAvisoController(@Qualifier("aportesAvisos") CajaAvisoSheetService avisos,
                                  @Qualifier("aportesAvisosComprobantes") CajaComprobanteSheetService comprobantes,
                                  ReceiptDriveService receiptDriveService) {
        super(avisos, comprobantes, receiptDriveService);
    }
}
