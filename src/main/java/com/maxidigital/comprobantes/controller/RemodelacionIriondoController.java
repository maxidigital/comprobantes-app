package com.maxidigital.comprobantes.controller;

import com.maxidigital.comprobantes.dto.RemodelacionResponse;
import com.maxidigital.comprobantes.service.RemodelacionIriondoSheetService;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.util.List;

/** Solo la ve ADMIN en el frontend; el interceptor no la restringe más que a Movimientos (decisión del plan). */
@RestController
@RequestMapping("/api/remodelacion")
public class RemodelacionIriondoController {

    private final RemodelacionIriondoSheetService service;

    public RemodelacionIriondoController(RemodelacionIriondoSheetService service) {
        this.service = service;
    }

    @GetMapping
    public List<RemodelacionResponse> listar() throws IOException {
        return service.readAllActive();
    }

    @PostMapping(consumes = "multipart/form-data")
    public RemodelacionResponse crear(@RequestParam String fecha,
                                       @RequestParam String tipo,
                                       @RequestParam double monto,
                                       @RequestParam String concepto,
                                       @RequestParam(required = false) String notas) throws IOException {
        return service.append(fecha, tipo, monto, concepto, notas);
    }

    @PutMapping(value = "/{id}", consumes = "multipart/form-data")
    public RemodelacionResponse actualizar(@PathVariable String id,
                                            @RequestParam String fecha,
                                            @RequestParam String tipo,
                                            @RequestParam double monto,
                                            @RequestParam String concepto,
                                            @RequestParam(required = false) String notas) throws IOException {
        return service.update(id, fecha, tipo, monto, concepto, notas);
    }

    @DeleteMapping("/{id}")
    public void eliminar(@PathVariable String id) throws IOException {
        service.softDelete(id);
    }
}
