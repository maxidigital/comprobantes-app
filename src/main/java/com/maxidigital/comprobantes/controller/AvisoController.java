package com.maxidigital.comprobantes.controller;

import com.maxidigital.comprobantes.dto.AvisoResponse;
import com.maxidigital.comprobantes.service.AvisoSheetService;
import com.maxidigital.comprobantes.service.AvisoStore;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.util.List;

/** Avisos de la caja Alquileres; RemodelacionAvisoController y VariosAvisoController heredan los mismos endpoints para su caja (ver MovimientoController). */
@RestController
@RequestMapping("/api/avisos")
public class AvisoController {

    private final AvisoStore avisoSheetService;

    @Autowired
    public AvisoController(AvisoSheetService avisoSheetService) {
        this((AvisoStore) avisoSheetService);
    }

    protected AvisoController(AvisoStore avisoSheetService) {
        this.avisoSheetService = avisoSheetService;
    }

    @GetMapping
    public List<AvisoResponse> listar() throws IOException {
        return avisoSheetService.readAllActive();
    }

    @PostMapping(consumes = "multipart/form-data")
    public AvisoResponse crear(@RequestParam String fecha,
                                @RequestParam String texto,
                                @RequestParam(required = false) String bien,
                                @RequestParam(required = false) String autor) throws IOException {
        return avisoSheetService.append(fecha, texto, bien, autor);
    }

    @DeleteMapping("/{id}")
    public void eliminar(@PathVariable String id) throws IOException {
        avisoSheetService.softDelete(id);
    }
}
