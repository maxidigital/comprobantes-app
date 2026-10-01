package com.maxidigital.comprobantes.service;

import com.google.api.services.sheets.v4.Sheets;
import com.maxidigital.comprobantes.dto.AporteResponse;
import com.maxidigital.comprobantes.service.SheetTab.Fila;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.util.List;

import static com.maxidigital.comprobantes.service.SheetTab.*;

/**
 * Caja "Aportes personales": la plata que un heredero pone de su bolsillo
 * para financiar la remodelación. INGRESO = alguien aporta, GASTO = la
 * sucesión le devuelve; el saldo es la deuda pendiente. Todo en **dólares**
 * para que la inflación no licúe la deuda. Un aportante por fila: un
 * aporte conjunto va en dos filas.
 *
 * La cotización (pesos por dólar) es opcional y el equivalente en pesos lo
 * calcula esta clase — sirve para cruzarlo a mano con el ingreso en pesos
 * de la caja Remodelación Iriondo (no hay ningún vínculo automático entre
 * cajas, a propósito: se carga todo a mano en cada una).
 */
@Service
public class AportesPersonalesSheetService {

    // Índices dentro de "datos" (SheetTab maneja id, creadoEn y estado)
    private static final int FECHA = 0, TIPO = 1, MONTO_USD = 2, COTIZACION = 3, MONTO_ARS = 4, CONCEPTO = 5,
            APORTANTE = 6, NOTAS = 7, CARGADO_POR = 8;

    private final SheetTab tab;

    public AportesPersonalesSheetService(Sheets sheets, @Value("${google.spreadsheet-id}") String spreadsheetId) {
        this.tab = new SheetTab(sheets, spreadsheetId, "Aportes Personales", List.of(
                "id", "fecha", "tipo", "montoUSD", "cotizacion", "montoARS", "concepto", "aportante", "notas",
                "cargadoPor", "creadoEn", "estado"));
    }

    public AporteResponse append(String fecha, String tipo, double monto, Double cotizacion, String concepto,
                                  String aportante, String notas, String cargadoPor) throws IOException {
        return toResponse(tab.append(datos(fecha, tipo, monto, cotizacion, concepto, aportante, notas, cargadoPor)));
    }

    public List<AporteResponse> readAllActive() throws IOException {
        return tab.readActive().stream().map(AportesPersonalesSheetService::toResponse).toList();
    }

    /** Conserva cargadoPor, que el formulario de edición no manda. */
    public AporteResponse update(String id, String fecha, String tipo, double monto, Double cotizacion,
                                  String concepto, String aportante, String notas) throws IOException {
        Fila actual = tab.find(id);
        return toResponse(tab.update(id, datos(fecha, tipo, monto, cotizacion, concepto, aportante, notas,
                actual.dato(CARGADO_POR))));
    }

    public void softDelete(String id) throws IOException {
        tab.softDelete(id);
    }

    // Montos como String: ver el comentario en MovimientoSheetService#append (locale del contenedor).
    private static List<String> datos(String fecha, String tipo, double monto, Double cotizacion, String concepto,
                                      String aportante, String notas, String cargadoPor) {
        String cot = cotizacion != null ? String.valueOf(cotizacion) : "";
        String ars = cotizacion != null ? String.valueOf(Math.round(monto * cotizacion * 100) / 100.0) : "";
        return List.of(toSheetDate(fecha), tipo, String.valueOf(monto), cot, ars, concepto, aportante,
                nullToEmpty(notas), nullToEmpty(cargadoPor));
    }

    private static AporteResponse toResponse(Fila f) {
        return new AporteResponse(f.id(), fromSheetDate(f.dato(FECHA)), f.dato(TIPO), parseDouble(f.dato(MONTO_USD)),
                parseOptional(f.dato(COTIZACION)), parseOptional(f.dato(MONTO_ARS)), f.dato(CONCEPTO),
                f.dato(APORTANTE), f.dato(NOTAS), f.creadoEn(), f.dato(CARGADO_POR));
    }

    private static Double parseOptional(String value) {
        return value.isBlank() ? null : parseDouble(value);
    }
}
