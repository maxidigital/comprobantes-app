package com.maxidigital.comprobantes.controller;

import com.maxidigital.comprobantes.dto.AporteResponse;
import com.maxidigital.comprobantes.service.AportesPersonalesSheetService;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.util.List;

/** Solo la ve ADMIN en el frontend; el interceptor no la restringe más que a Movimientos (decisión del plan). */
@RestController
@RequestMapping("/api/aportes")
public class AportesPersonalesController {

    private final AportesPersonalesSheetService service;

    public AportesPersonalesController(AportesPersonalesSheetService service) {
        this.service = service;
    }

    @GetMapping
    public List<AporteResponse> listar() throws IOException {
        return service.readAllActive();
    }

    @PostMapping(consumes = "multipart/form-data")
    public AporteResponse crear(@RequestParam String fecha,
                                 @RequestParam String tipo,
                                 @RequestParam double monto,
                                 @RequestParam String concepto,
                                 @RequestParam String aportante,
                                 @RequestParam(required = false) String notas) throws IOException {
        return service.append(fecha, tipo, monto, concepto, aportante, notas);
    }

    @PutMapping(value = "/{id}", consumes = "multipart/form-data")
    public AporteResponse actualizar(@PathVariable String id,
                                      @RequestParam String fecha,
                                      @RequestParam String tipo,
                                      @RequestParam double monto,
                                      @RequestParam String concepto,
                                      @RequestParam String aportante,
                                      @RequestParam(required = false) String notas) throws IOException {
        return service.update(id, fecha, tipo, monto, concepto, aportante, notas);
    }

    @DeleteMapping("/{id}")
    public void eliminar(@PathVariable String id) throws IOException {
        service.softDelete(id);
    }
}
