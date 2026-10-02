package com.civicbrain.config;

import java.nio.charset.StandardCharsets;
import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app")
public record AppProperties(
        String jwtSecret,
        String otpHmacSecret,
        String mediaSigningSecret,
        boolean cookieSecure,
        boolean trustProxy,
        int wardCountFallback,
        String mailFrom,
        String seedAdminEmail,
        String seedAdminPassword,
        String seedAdminName,
        String storageDir,
        boolean schedulingEnabled) {

    public AppProperties {
        // Fail fast: secrets come only from env vars (NFR-S5) and must be strong enough to sign with.
        requireSecret("JWT_SECRET", jwtSecret);
        requireSecret("OTP_HMAC_SECRET", otpHmacSecret);
        requireSecret("MEDIA_SIGNING_SECRET", mediaSigningSecret);
    }

    private static void requireSecret(String name, String value) {
        if (value == null || value.getBytes(StandardCharsets.UTF_8).length < 32) {
            throw new IllegalStateException(name + " must be set to at least 32 bytes");
        }
    }
}
