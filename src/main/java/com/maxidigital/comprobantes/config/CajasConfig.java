package com.maxidigital.comprobantes.config;

import com.google.api.services.sheets.v4.Sheets;
import com.maxidigital.comprobantes.service.CajaAvisoSheetService;
import com.maxidigital.comprobantes.service.CajaComprobanteSheetService;
import com.maxidigital.comprobantes.service.CajaMovimientoSheetService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Las cajas con el sistema completo de movimientos pero sin "bien"
 * (Remodelación Iriondo y Varios): cada una es el mismo trío de servicios
 * apuntando a sus propias pestañas. Agregar otra caja así = otro trío acá,
 * dos controllers que hereden de MovimientoController/AvisoController, su
 * path en WebConfig y su entrada en frontend/src/cajas.ts.
 */
@Configuration
public class CajasConfig {

    private final Sheets sheets;
    private final String spreadsheetId;

    public CajasConfig(Sheets sheets, @Value("${google.spreadsheet-id}") String spreadsheetId) {
        this.sheets = sheets;
        this.spreadsheetId = spreadsheetId;
    }

    @Bean
    public CajaMovimientoSheetService remodelacionMovimientos() {
        return new CajaMovimientoSheetService(sheets, spreadsheetId, "Remodelación Iriondo");
    }

    @Bean
    public CajaComprobanteSheetService remodelacionComprobantes() {
        return new CajaComprobanteSheetService(sheets, spreadsheetId, "Comprobantes Remodelación");
    }

    @Bean
    public CajaAvisoSheetService remodelacionAvisos() {
        return new CajaAvisoSheetService(sheets, spreadsheetId, "Avisos Remodelación");
    }

    @Bean
    public CajaMovimientoSheetService variosMovimientos() {
        return new CajaMovimientoSheetService(sheets, spreadsheetId, "Varios");
    }

    @Bean
    public CajaComprobanteSheetService variosComprobantes() {
        return new CajaComprobanteSheetService(sheets, spreadsheetId, "Comprobantes Varios");
    }

    @Bean
    public CajaAvisoSheetService variosAvisos() {
        return new CajaAvisoSheetService(sheets, spreadsheetId, "Avisos Varios");
    }

    // Comprobantes de avisos: una pestaña por caja (los ids de aviso de cada caja arrancan de 1).

    @Bean
    public CajaComprobanteSheetService alquileresAvisosComprobantes() {
        return new CajaComprobanteSheetService(sheets, spreadsheetId, "Comprobantes Avisos", "avisoId");
    }

    @Bean
    public CajaComprobanteSheetService remodelacionAvisosComprobantes() {
        return new CajaComprobanteSheetService(sheets, spreadsheetId, "Comprobantes Avisos Remodelación", "avisoId");
    }

    @Bean
    public CajaComprobanteSheetService variosAvisosComprobantes() {
        return new CajaComprobanteSheetService(sheets, spreadsheetId, "Comprobantes Avisos Varios", "avisoId");
    }

    @Bean
    public CajaComprobanteSheetService aportesAvisosComprobantes() {
        return new CajaComprobanteSheetService(sheets, spreadsheetId, "Comprobantes Avisos Aportes", "avisoId");
    }

    /** Aportes personales no tiene movimientos con comprobantes (eso es AportesPersonalesSheetService), pero sí avisos. */
    @Bean
    public CajaAvisoSheetService aportesAvisos() {
        return new CajaAvisoSheetService(sheets, spreadsheetId, "Avisos Aportes");
    }
}
