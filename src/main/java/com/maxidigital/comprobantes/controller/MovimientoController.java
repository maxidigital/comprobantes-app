package com.maxidigital.comprobantes.controller;

import com.maxidigital.comprobantes.dto.MovimientoResponse;
import com.maxidigital.comprobantes.service.MovimientoSheetService;
import com.maxidigital.comprobantes.service.ReceiptDriveService;
import com.maxidigital.comprobantes.service.ReceiptDriveService.UploadedReceipt;
import jakarta.servlet.http.HttpServletResponse;
import com.maxidigital.comprobantes.exception.NotFoundException;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;

@RestController
@RequestMapping("/api/movimientos")
public class MovimientoController {

    private final MovimientoSheetService movimientoSheetService;
    private final ReceiptDriveService receiptDriveService;

    public MovimientoController(MovimientoSheetService movimientoSheetService,
                                 ReceiptDriveService receiptDriveService) {
        this.movimientoSheetService = movimientoSheetService;
        this.receiptDriveService = receiptDriveService;
    }

    @GetMapping
    public List<MovimientoResponse> listar() throws IOException {
        return movimientoSheetService.readAll();
    }

    @PostMapping(consumes = "multipart/form-data")
    public MovimientoResponse crear(@RequestParam String fecha,
                                     @RequestParam String tipo,
                                     @RequestParam double monto,
                                     @RequestParam String concepto,
                                     @RequestParam(required = false) String categoria,
                                     @RequestParam(required = false) String bien,
                                     @RequestParam(required = false) String notas,
                                     @RequestParam(required = false) String cargadoPor,
                                     @RequestParam(required = false) MultipartFile comprobante) throws IOException {
        String comprobanteUrl = null;
        String comprobanteNombre = null;

        if (comprobante != null && !comprobante.isEmpty()) {
            UploadedReceipt uploaded = receiptDriveService.upload(comprobante, fecha, concepto);
            comprobanteUrl = uploaded.url();
            comprobanteNombre = uploaded.fileName();
        }

        return movimientoSheetService.append(fecha, tipo, monto, concepto, categoria, bien,
                comprobanteUrl, comprobanteNombre, notas, cargadoPor);
    }

    @PutMapping(value = "/{id}", consumes = "multipart/form-data")
    public MovimientoResponse actualizar(@PathVariable String id,
                                          @RequestParam String fecha,
                                          @RequestParam String tipo,
                                          @RequestParam double monto,
                                          @RequestParam String concepto,
                                          @RequestParam(required = false) String categoria,
                                          @RequestParam(required = false) String bien,
                                          @RequestParam(required = false) String notas) throws IOException {
        return movimientoSheetService.update(id, fecha, tipo, monto, concepto, categoria, bien, notas);
    }

    @PutMapping(value = "/{id}/comprobante", consumes = "multipart/form-data")
    public MovimientoResponse adjuntarComprobante(@PathVariable String id,
                                                   @RequestParam(required = false) String fecha,
                                                   @RequestParam(required = false) String concepto,
                                                   @RequestParam MultipartFile comprobante) throws IOException {
        UploadedReceipt uploaded = receiptDriveService.upload(comprobante, fecha, concepto);
        return movimientoSheetService.attachComprobante(id, uploaded.url(), uploaded.fileName());
    }

    @DeleteMapping("/{id}/comprobante")
    public MovimientoResponse borrarComprobante(@PathVariable String id) throws IOException {
        MovimientoResponse movimiento = movimientoSheetService.findById(id);
        if (movimiento.comprobanteUrl() != null && !movimiento.comprobanteUrl().isBlank()) {
            receiptDriveService.deleteByUrl(movimiento.comprobanteUrl());
        }
        return movimientoSheetService.clearComprobante(id);
    }

    @GetMapping("/{id}/comprobante/archivo")
    public void descargarComprobante(@PathVariable String id, HttpServletResponse response) throws IOException {
        MovimientoResponse movimiento = movimientoSheetService.findById(id);
        if (movimiento.comprobanteUrl() == null || movimiento.comprobanteUrl().isBlank()) {
            throw new NotFoundException("Este movimiento no tiene comprobante adjunto");
        }
        receiptDriveService.streamToResponse(movimiento.comprobanteUrl(), response);
    }

    @DeleteMapping("/{id}")
    public void eliminar(@PathVariable String id) throws IOException {
        movimientoSheetService.softDelete(id);
    }
}
