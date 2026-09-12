package com.maxidigital.comprobantes.service;

import com.google.api.client.http.InputStreamContent;
import com.google.api.services.drive.Drive;
import com.google.api.services.drive.model.File;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.time.Instant;
import java.util.List;

@Service
public class ReceiptDriveService {

    private final Drive drive;
    private final String folderId;

    public ReceiptDriveService(Drive drive, @Value("${google.drive-folder-id}") String folderId) {
        this.drive = drive;
        this.folderId = folderId;
    }

    public record UploadedReceipt(String url, String fileName) {
    }

    public UploadedReceipt upload(MultipartFile file) throws IOException {
        String originalName = file.getOriginalFilename() != null ? file.getOriginalFilename() : "comprobante";
        String driveName = Instant.now().toEpochMilli() + "_" + originalName;

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
}
