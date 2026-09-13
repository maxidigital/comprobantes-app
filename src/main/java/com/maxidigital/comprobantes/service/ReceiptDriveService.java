package com.maxidigital.comprobantes.service;

import com.google.api.client.http.InputStreamContent;
import com.google.api.services.drive.Drive;
import com.google.api.services.drive.model.File;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class ReceiptDriveService {

    private static final Pattern FILE_ID_PATTERN = Pattern.compile("/d/([a-zA-Z0-9_-]+)");

    private final Drive drive;
    private final String folderId;

    public ReceiptDriveService(Drive drive, @Value("${google.drive-folder-id}") String folderId) {
        this.drive = drive;
        this.folderId = folderId;
    }

    public record UploadedReceipt(String url, String fileName) {
    }

    /**
     * El nombre en Drive arranca con la fecha del movimiento (no la de
     * subida) en formato yyyy-MM-dd para que ordene bien alfabéticamente
     * en el listado de archivos, seguido de un resumen del concepto — así
     * se puede identificar un comprobante desde Drive sin tener que abrir
     * la app.
     */
    public UploadedReceipt upload(MultipartFile file, String fecha, String concepto) throws IOException {
        String originalName = file.getOriginalFilename() != null ? file.getOriginalFilename() : "comprobante";
        int dot = originalName.lastIndexOf('.');
        String extension = dot >= 0 ? originalName.substring(dot) : "";

        String prefix = (fecha != null && !fecha.isBlank()) ? fecha : "sin-fecha";
        String slug = slug(concepto);
        String driveName = slug.isEmpty() ? prefix + extension : prefix + "_" + slug + extension;

        File metadata = new File()
                .setName(driveName)
                .setParents(List.of(folderId));

        String mimeType = file.getContentType() != null ? file.getContentType() : "application/octet-stream";
        InputStreamContent content = new InputStreamContent(mimeType, file.getInputStream());
        content.setLength(file.getSize());

        File created = drive.files().create(metadata, content)
                .setFields("id, webViewLink")
                .execute();

        return new UploadedReceipt(created.getWebViewLink(), originalName);
    }

    /** Sirve el archivo directo (sin pasar por el visor de Drive) para mostrarlo inline en el navegador. */
    public void streamToResponse(String comprobanteUrl, HttpServletResponse response) throws IOException {
        String fileId = extractFileId(comprobanteUrl);

        File metadata = drive.files().get(fileId).setFields("mimeType, name").execute();
        response.setContentType(metadata.getMimeType() != null ? metadata.getMimeType() : "application/octet-stream");
        response.setHeader("Content-Disposition", "inline");

        drive.files().get(fileId).executeMediaAndDownloadTo(response.getOutputStream());
    }

    /** Borra el archivo de Drive — usado cuando se carga mal un comprobante y hay que sacarlo. */
    public void deleteByUrl(String comprobanteUrl) throws IOException {
        drive.files().delete(extractFileId(comprobanteUrl)).execute();
    }

    private static String extractFileId(String comprobanteUrl) {
        Matcher matcher = FILE_ID_PATTERN.matcher(comprobanteUrl);
        if (!matcher.find()) {
            throw new IllegalArgumentException("No se pudo interpretar el link de Drive: " + comprobanteUrl);
        }
        return matcher.group(1);
    }

    private static String slug(String text) {
        if (text == null) return "";
        String cleaned = text.trim()
                .replaceAll("[^\\p{L}\\p{N} ]", "")
                .replaceAll("\\s+", "-");
        return cleaned.length() > 40 ? cleaned.substring(0, 40) : cleaned;
    }
}
