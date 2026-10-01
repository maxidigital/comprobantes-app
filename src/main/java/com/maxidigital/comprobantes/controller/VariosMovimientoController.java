package com.maxidigital.comprobantes.controller;

import com.maxidigital.comprobantes.service.CajaComprobanteSheetService;
import com.maxidigital.comprobantes.service.CajaMovimientoSheetService;
import com.maxidigital.comprobantes.service.ReceiptDriveService;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Caja Varios (trámites de la sucesión): los mismos endpoints que MovimientoController, contra sus propias pestañas (ver CajasConfig). */
@RestController
@RequestMapping("/api/varios/movimientos")
public class VariosMovimientoController extends MovimientoController {

    public VariosMovimientoController(@Qualifier("variosMovimientos") CajaMovimientoSheetService movimientos,
                                       @Qualifier("variosComprobantes") CajaComprobanteSheetService comprobantes,
                                       ReceiptDriveService receiptDriveService) {
        super(movimientos, comprobantes, receiptDriveService);
    }
}
