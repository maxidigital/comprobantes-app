package com.maxidigital.comprobantes.config;

import com.google.api.client.googleapis.javanet.GoogleNetHttpTransport;
import com.google.api.client.http.HttpTransport;
import com.google.api.client.json.gson.GsonFactory;
import com.google.api.services.drive.Drive;
import com.google.api.services.sheets.v4.Sheets;
import com.google.api.services.sheets.v4.SheetsScopes;
import com.google.auth.http.HttpCredentialsAdapter;
import com.google.auth.oauth2.GoogleCredentials;
import com.google.auth.oauth2.UserCredentials;
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
 * Sheets uses a service account (fine — it only ever edits an existing
 * spreadsheet, which doesn't need storage quota). Drive uploads can't use
 * the service account: Google refuses to let service accounts own new
 * files outside a Shared Drive ("Service Accounts do not have storage
 * quota"), and Shared Drives require Google Workspace, which this
 * personal-Gmail setup doesn't have. So Drive uses a one-time OAuth grant
 * (drive.file scope) instead — the refresh token was minted once via
 * scripts/oauth_exchange.py and never needs a login again unless it's
 * revoked or (while the consent screen is still in "Testing" publishing
 * status) expires after 7 days — see CLAUDE.md.
 */
@Configuration
public class GoogleClientsConfig {

    private static final String APPLICATION_NAME = "Comprobantes";

    @Bean
    public Sheets sheetsService(@Value("${google.service-account-json}") String serviceAccountJson)
            throws IOException, GeneralSecurityException {
        HttpTransport httpTransport = GoogleNetHttpTransport.newTrustedTransport();
        HttpCredentialsAdapter credentials = new HttpCredentialsAdapter(loadServiceAccountCredentials(serviceAccountJson));

        return new Sheets.Builder(httpTransport, GsonFactory.getDefaultInstance(), credentials)
                .setApplicationName(APPLICATION_NAME)
                .build();
    }

    @Bean
    public Drive driveService(@Value("${google.oauth.client-id}") String clientId,
                               @Value("${google.oauth.client-secret}") String clientSecret,
                               @Value("${google.oauth.refresh-token}") String refreshToken)
            throws IOException, GeneralSecurityException {
        HttpTransport httpTransport = GoogleNetHttpTransport.newTrustedTransport();
        HttpCredentialsAdapter credentials = new HttpCredentialsAdapter(
                loadUserCredentials(clientId, clientSecret, refreshToken));

        return new Drive.Builder(httpTransport, GsonFactory.getDefaultInstance(), credentials)
                .setApplicationName(APPLICATION_NAME)
                .build();
    }

    private GoogleCredentials loadServiceAccountCredentials(String serviceAccountJson) throws IOException {
        if (serviceAccountJson == null || serviceAccountJson.isBlank()) {
            throw new IllegalStateException(
                    "Falta la variable de entorno GOOGLE_SERVICE_ACCOUNT_JSON con la clave de la cuenta de servicio");
        }

        try (InputStream keyStream = new ByteArrayInputStream(serviceAccountJson.getBytes(StandardCharsets.UTF_8))) {
            return GoogleCredentials.fromStream(keyStream)
                    .createScoped(List.of(SheetsScopes.SPREADSHEETS));
        }
    }

    private UserCredentials loadUserCredentials(String clientId, String clientSecret, String refreshToken) {
        if (clientId == null || clientId.isBlank() || refreshToken == null || refreshToken.isBlank()) {
            throw new IllegalStateException(
                    "Faltan GOOGLE_OAUTH_CLIENT_ID / GOOGLE_OAUTH_CLIENT_SECRET / GOOGLE_OAUTH_REFRESH_TOKEN");
        }

        return UserCredentials.newBuilder()
                .setClientId(clientId)
                .setClientSecret(clientSecret)
                .setRefreshToken(refreshToken)
                .build();
    }
}
