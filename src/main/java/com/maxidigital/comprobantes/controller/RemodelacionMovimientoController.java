package com.maxidigital.comprobantes.controller;

import com.maxidigital.comprobantes.service.ReceiptDriveService;
import com.maxidigital.comprobantes.service.RemodelacionComprobanteSheetService;
import com.maxidigital.comprobantes.service.RemodelacionMovimientoSheetService;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Caja Remodelación Iriondo: los mismos endpoints que MovimientoController, contra sus propias pestañas. */
@RestController
@RequestMapping("/api/remodelacion/movimientos")
public class RemodelacionMovimientoController extends MovimientoController {

    public RemodelacionMovimientoController(RemodelacionMovimientoSheetService movimientos,
                                             RemodelacionComprobanteSheetService comprobantes,
                                             ReceiptDriveService receiptDriveService) {
        super(movimientos, comprobantes, receiptDriveService);
    }
}
