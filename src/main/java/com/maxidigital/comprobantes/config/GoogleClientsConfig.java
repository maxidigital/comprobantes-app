package com.maxidigital.comprobantes.config;

import com.google.api.client.googleapis.javanet.GoogleNetHttpTransport;
import com.google.api.client.http.HttpTransport;
import com.google.api.client.json.gson.GsonFactory;
import com.google.api.services.drive.Drive;
import com.google.api.services.drive.DriveScopes;
import com.google.api.services.sheets.v4.Sheets;
import com.google.api.services.sheets.v4.SheetsScopes;
import com.google.auth.http.HttpCredentialsAdapter;
import com.google.auth.oauth2.GoogleCredentials;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.util.List;

/**
 * Both Sheets and Drive clients are built from the same service account
 * credential — the account needs Editor access on the shared spreadsheet
 * and the receipts folder, granted manually in Google Drive (see CLAUDE.md).
 */
@Configuration
public class GoogleClientsConfig {

    private static final String APPLICATION_NAME = "Comprobantes";

    @Bean
    public Sheets sheetsService(@Value("${google.service-account-json}") String serviceAccountJson)
            throws IOException, GeneralSecurityException {
        HttpTransport httpTransport = GoogleNetHttpTransport.newTrustedTransport();
        HttpCredentialsAdapter credentials = new HttpCredentialsAdapter(loadCredentials(serviceAccountJson));

        return new Sheets.Builder(httpTransport, GsonFactory.getDefaultInstance(), credentials)
                .setApplicationName(APPLICATION_NAME)
                .build();
    }

    @Bean
    public Drive driveService(@Value("${google.service-account-json}") String serviceAccountJson)
            throws IOException, GeneralSecurityException {
        HttpTransport httpTransport = GoogleNetHttpTransport.newTrustedTransport();
        HttpCredentialsAdapter credentials = new HttpCredentialsAdapter(loadCredentials(serviceAccountJson));

        return new Drive.Builder(httpTransport, GsonFactory.getDefaultInstance(), credentials)
                .setApplicationName(APPLICATION_NAME)
                .build();
    }

    private GoogleCredentials loadCredentials(String serviceAccountJson) throws IOException {
        if (serviceAccountJson == null || serviceAccountJson.isBlank()) {
            throw new IllegalStateException(
                    "Falta la variable de entorno GOOGLE_SERVICE_ACCOUNT_JSON con la clave de la cuenta de servicio");
        }

        try (InputStream keyStream = new ByteArrayInputStream(serviceAccountJson.getBytes(StandardCharsets.UTF_8))) {
            return GoogleCredentials.fromStream(keyStream)
                    .createScoped(List.of(SheetsScopes.SPREADSHEETS, DriveScopes.DRIVE));
        }
    }
}
