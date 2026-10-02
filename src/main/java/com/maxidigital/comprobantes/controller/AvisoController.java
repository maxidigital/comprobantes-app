package com.maxidigital.comprobantes.controller;

import com.maxidigital.comprobantes.dto.AvisoResponse;
import com.maxidigital.comprobantes.dto.ComprobanteResponse;
import com.maxidigital.comprobantes.exception.NotFoundException;
import com.maxidigital.comprobantes.service.AvisoSheetService;
import com.maxidigital.comprobantes.service.AvisoStore;
import com.maxidigital.comprobantes.service.ComprobanteStore;
import com.maxidigital.comprobantes.service.ReceiptDriveService;
import com.maxidigital.comprobantes.service.ReceiptDriveService.UploadedReceipt;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Avisos de la caja Alquileres; RemodelacionAvisoController, VariosAvisoController
 * y AportesAvisoController heredan los mismos endpoints para su caja (ver
 * MovimientoController). Los comprobantes de un aviso funcionan igual que
 * los de un movimiento, en su propia pestaña "Comprobantes Avisos ..."
 * (ver CajasConfig), pero sin "comprobante pendiente": un aviso no tiene
 * por qué llevar uno.
 */
@RestController
@RequestMapping("/api/avisos")
public class AvisoController {

    private final AvisoStore avisoSheetService;
    private final ComprobanteStore comprobantes;
    private final ReceiptDriveService receiptDriveService;

    @Autowired
    public AvisoController(AvisoSheetService avisoSheetService,
                           @Qualifier("alquileresAvisosComprobantes") ComprobanteStore comprobantes,
                           ReceiptDriveService receiptDriveService) {
        this((AvisoStore) avisoSheetService, comprobantes, receiptDriveService);
    }

    protected AvisoController(AvisoStore avisoSheetService, ComprobanteStore comprobantes,
                              ReceiptDriveService receiptDriveService) {
        this.avisoSheetService = avisoSheetService;
        this.comprobantes = comprobantes;
        this.receiptDriveService = receiptDriveService;
    }

    @GetMapping
    public List<AvisoResponse> listar() throws IOException {
        Map<String, List<ComprobanteResponse>> porAviso = comprobantes.readAllActive().stream()
                .collect(Collectors.groupingBy(ComprobanteResponse::movimientoId));
        return avisoSheetService.readAllActive().stream()
                .map(a -> a.withComprobantes(porAviso.getOrDefault(a.id(), List.of())))
                .toList();
    }

    @PostMapping(consumes = "multipart/form-data")
    public AvisoResponse crear(@RequestParam String fecha,
                                @RequestParam String texto,
                                @RequestParam(required = false) String bien,
                                @RequestParam(required = false) String autor,
                                @RequestParam(required = false) MultipartFile[] comprobantes) throws IOException {
        AvisoResponse creado = avisoSheetService.append(fecha, texto, bien, autor);
        return creado.withComprobantes(subirComprobantes(creado, comprobantes));
    }

    @PutMapping(value = "/{id}", consumes = "multipart/form-data")
    public AvisoResponse actualizar(@PathVariable String id,
                                    @RequestParam String fecha,
                                    @RequestParam String texto,
                                    @RequestParam(required = false) String bien) throws IOException {
        return avisoSheetService.update(id, fecha, texto, bien == null ? "" : bien)
                .withComprobantes(comprobantes.findActiveByMovimiento(id));
    }

    /** Agrega uno o más comprobantes a un aviso que ya existe (no reemplaza los que tenía). */
    @PostMapping(value = "/{id}/comprobantes", consumes = "multipart/form-data")
    public AvisoResponse agregarComprobantes(@PathVariable String id,
                                              @RequestParam MultipartFile[] comprobantes) throws IOException {
        AvisoResponse aviso = avisoSheetService.findById(id);
        subirComprobantes(aviso, comprobantes);
        return aviso.withComprobantes(this.comprobantes.findActiveByMovimiento(id));
    }

    @DeleteMapping("/{avisoId}/comprobantes/{comprobanteId}")
    public AvisoResponse borrarComprobante(@PathVariable String avisoId,
                                            @PathVariable String comprobanteId) throws IOException {
        ComprobanteResponse borrado = comprobantes.softDelete(comprobanteId);
        receiptDriveService.deleteByUrl(borrado.url());
        return avisoSheetService.findById(avisoId).withComprobantes(comprobantes.findActiveByMovimiento(avisoId));
    }

    @GetMapping("/{avisoId}/comprobantes/{comprobanteId}/archivo")
    public void descargarComprobante(@PathVariable String avisoId,
                                      @PathVariable String comprobanteId,
                                      HttpServletResponse response) throws IOException {
        ComprobanteResponse comprobante = comprobantes.findActiveByMovimiento(avisoId).stream()
                .filter(c -> c.id().equals(comprobanteId))
                .findFirst()
                .orElseThrow(() -> new NotFoundException("No existe ese comprobante"));
        receiptDriveService.streamToResponse(comprobante.url(), response);
    }

    /** Baja lógica del aviso y en cascada de sus comprobantes (los archivos de Drive quedan, igual que en movimientos). */
    @DeleteMapping("/{id}")
    public void eliminar(@PathVariable String id) throws IOException {
        avisoSheetService.softDelete(id);
        comprobantes.softDeleteAllForMovimiento(id);
    }

    private List<ComprobanteResponse> subirComprobantes(AvisoResponse aviso, MultipartFile[] archivos) throws IOException {
        List<ComprobanteResponse> subidos = new ArrayList<>();
        if (archivos == null) return subidos;
        for (MultipartFile archivo : archivos) {
            if (archivo == null || archivo.isEmpty()) continue;
            UploadedReceipt uploaded = receiptDriveService.upload(archivo, aviso.fecha(), "aviso " + aviso.texto());
            subidos.add(comprobantes.append(aviso.id(), uploaded.url(), uploaded.fileName()));
        }
        return subidos;
    }
}
