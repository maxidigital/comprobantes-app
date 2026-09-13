package com.maxidigital.comprobantes.controller;

import com.maxidigital.comprobantes.dto.ComprobanteResponse;
import com.maxidigital.comprobantes.dto.MovimientoResponse;
import com.maxidigital.comprobantes.exception.NotFoundException;
import com.maxidigital.comprobantes.service.ComprobanteSheetService;
import com.maxidigital.comprobantes.service.MovimientoSheetService;
import com.maxidigital.comprobantes.service.ReceiptDriveService;
import com.maxidigital.comprobantes.service.ReceiptDriveService.UploadedReceipt;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/movimientos")
public class MovimientoController {

    private final MovimientoSheetService movimientoSheetService;
    private final ComprobanteSheetService comprobanteSheetService;
    private final ReceiptDriveService receiptDriveService;

    public MovimientoController(MovimientoSheetService movimientoSheetService,
                                 ComprobanteSheetService comprobanteSheetService,
                                 ReceiptDriveService receiptDriveService) {
        this.movimientoSheetService = movimientoSheetService;
        this.comprobanteSheetService = comprobanteSheetService;
        this.receiptDriveService = receiptDriveService;
    }

    @GetMapping
    public List<MovimientoResponse> listar() throws IOException {
        List<MovimientoResponse> base = movimientoSheetService.readAll();
        Map<String, List<ComprobanteResponse>> porMovimiento = comprobanteSheetService.readAllActive().stream()
                .collect(Collectors.groupingBy(ComprobanteResponse::movimientoId));
        return base.stream()
                .map(m -> m.withComprobantes(porMovimiento.getOrDefault(m.id(), List.of())))
                .toList();
    }

    @PostMapping(consumes = "multipart/form-data")
    public MovimientoResponse crear(@RequestParam String fecha,
                                     @RequestParam String tipo,
                                     @RequestParam double monto,
                                     @RequestParam String concepto,
                                     @RequestParam(required = false) String bien,
                                     @RequestParam(required = false) String notas,
                                     @RequestParam(required = false) String cargadoPor,
                                     @RequestParam(required = false) MultipartFile[] comprobantes) throws IOException {
        MovimientoResponse creado = movimientoSheetService.append(fecha, tipo, monto, concepto, bien,
                notas, cargadoPor);

        List<ComprobanteResponse> subidos = subirComprobantes(creado.id(), fecha, concepto, comprobantes);
        if (!subidos.isEmpty()) {
            movimientoSheetService.updateComprobantesCount(creado.id(), subidos.size());
        }
        return creado.withComprobantes(subidos);
    }

    @PutMapping(value = "/{id}", consumes = "multipart/form-data")
    public MovimientoResponse actualizar(@PathVariable String id,
                                          @RequestParam String fecha,
                                          @RequestParam String tipo,
                                          @RequestParam double monto,
                                          @RequestParam String concepto,
                                          @RequestParam(required = false) String bien,
                                          @RequestParam(required = false) String notas) throws IOException {
        MovimientoResponse actualizado = movimientoSheetService.update(id, fecha, tipo, monto, concepto,
                bien, notas);
        return actualizado.withComprobantes(comprobanteSheetService.findActiveByMovimiento(id));
    }

    /** Agrega uno o más comprobantes a un movimiento que ya existe (no reemplaza los que ya tenía). */
    @PostMapping(value = "/{id}/comprobantes", consumes = "multipart/form-data")
    public MovimientoResponse agregarComprobantes(@PathVariable String id,
                                                    @RequestParam MultipartFile[] comprobantes) throws IOException {
        MovimientoResponse movimiento = movimientoSheetService.findById(id);
        subirComprobantes(id, movimiento.fecha(), movimiento.concepto(), comprobantes);

        List<ComprobanteResponse> actuales = comprobanteSheetService.findActiveByMovimiento(id);
        movimientoSheetService.updateComprobantesCount(id, actuales.size());
        return movimiento.withComprobantes(actuales);
    }

    @DeleteMapping("/{movimientoId}/comprobantes/{comprobanteId}")
    public MovimientoResponse borrarComprobante(@PathVariable String movimientoId,
                                                 @PathVariable String comprobanteId) throws IOException {
        ComprobanteResponse borrado = comprobanteSheetService.softDelete(comprobanteId);
        receiptDriveService.deleteByUrl(borrado.url());

        MovimientoResponse movimiento = movimientoSheetService.findById(movimientoId);
        List<ComprobanteResponse> actuales = comprobanteSheetService.findActiveByMovimiento(movimientoId);
        movimientoSheetService.updateComprobantesCount(movimientoId, actuales.size());
        return movimiento.withComprobantes(actuales);
    }

    @GetMapping("/{movimientoId}/comprobantes/{comprobanteId}/archivo")
    public void descargarComprobante(@PathVariable String movimientoId,
                                      @PathVariable String comprobanteId,
                                      HttpServletResponse response) throws IOException {
        ComprobanteResponse comprobante = comprobanteSheetService.findActiveByMovimiento(movimientoId).stream()
                .filter(c -> c.id().equals(comprobanteId))
                .findFirst()
                .orElseThrow(() -> new NotFoundException("No existe ese comprobante"));
        receiptDriveService.streamToResponse(comprobante.url(), response);
    }

    @DeleteMapping("/{id}")
    public void eliminar(@PathVariable String id) throws IOException {
        movimientoSheetService.softDelete(id);
        comprobanteSheetService.softDeleteAllForMovimiento(id);
    }

    private List<ComprobanteResponse> subirComprobantes(String movimientoId, String fecha, String concepto,
                                                          MultipartFile[] archivos) throws IOException {
        List<ComprobanteResponse> subidos = new ArrayList<>();
        if (archivos == null) return subidos;

        for (MultipartFile archivo : archivos) {
            if (archivo == null || archivo.isEmpty()) continue;
            UploadedReceipt uploaded = receiptDriveService.upload(archivo, fecha, concepto);
            subidos.add(comprobanteSheetService.append(movimientoId, uploaded.url(), uploaded.fileName()));
        }
        return subidos;
    }
}
