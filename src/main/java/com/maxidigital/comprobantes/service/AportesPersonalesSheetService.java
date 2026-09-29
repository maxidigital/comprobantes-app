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
 * (convertido a mano al cargarlo, sin cotización en vivo) para que la
 * inflación no licúe la deuda. Un aportante por fila: un aporte conjunto
 * va en dos filas.
 */
@Service
public class AportesPersonalesSheetService {

    private final SheetTab tab;

    public AportesPersonalesSheetService(Sheets sheets, @Value("${google.spreadsheet-id}") String spreadsheetId) {
        this.tab = new SheetTab(sheets, spreadsheetId, "Aportes Personales", List.of(
                "id", "fecha", "tipo", "montoUSD", "concepto", "aportante", "notas", "creadoEn", "estado"));
    }

    public AporteResponse append(String fecha, String tipo, double monto, String concepto, String aportante,
                                  String notas) throws IOException {
        return toResponse(tab.append(datos(fecha, tipo, monto, concepto, aportante, notas)));
    }

    public List<AporteResponse> readAllActive() throws IOException {
        return tab.readActive().stream().map(AportesPersonalesSheetService::toResponse).toList();
    }

    public AporteResponse update(String id, String fecha, String tipo, double monto, String concepto,
                                  String aportante, String notas) throws IOException {
        return toResponse(tab.update(id, datos(fecha, tipo, monto, concepto, aportante, notas)));
    }

    public void softDelete(String id) throws IOException {
        tab.softDelete(id);
    }

    // Monto como String: ver el comentario en MovimientoSheetService#append (locale del contenedor).
    private static List<String> datos(String fecha, String tipo, double monto, String concepto, String aportante,
                                      String notas) {
        return List.of(toSheetDate(fecha), tipo, String.valueOf(monto), concepto, aportante, nullToEmpty(notas));
    }

    private static AporteResponse toResponse(Fila f) {
        return new AporteResponse(f.id(), fromSheetDate(f.dato(0)), f.dato(1), parseDouble(f.dato(2)),
                f.dato(3), f.dato(4), f.dato(5), f.creadoEn());
    }
}
