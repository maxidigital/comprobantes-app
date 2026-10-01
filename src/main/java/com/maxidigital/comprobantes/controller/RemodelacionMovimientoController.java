package com.maxidigital.comprobantes.controller;

import com.maxidigital.comprobantes.service.CajaComprobanteSheetService;
import com.maxidigital.comprobantes.service.CajaMovimientoSheetService;
import com.maxidigital.comprobantes.service.ReceiptDriveService;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Caja Remodelación Iriondo: los mismos endpoints que MovimientoController, contra sus propias pestañas (ver CajasConfig). */
@RestController
@RequestMapping("/api/remodelacion/movimientos")
public class RemodelacionMovimientoController extends MovimientoController {

    public RemodelacionMovimientoController(@Qualifier("remodelacionMovimientos") CajaMovimientoSheetService movimientos,
                                             @Qualifier("remodelacionComprobantes") CajaComprobanteSheetService comprobantes,
                                             ReceiptDriveService receiptDriveService) {
        super(movimientos, comprobantes, receiptDriveService);
    }
}
