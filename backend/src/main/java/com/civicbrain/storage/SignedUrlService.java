package com.civicbrain.storage;

import com.civicbrain.config.AppProperties;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Clock;
import java.time.Duration;
import java.util.HexFormat;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.stereotype.Service;

/** Short-lived HMAC-signed media URLs (NFR-S3): the signature is the capability, keys are unguessable. */
@Service
public class SignedUrlService {
    static final Duration TTL = Duration.ofMinutes(15);
    private final byte[] secret;
    private final Clock clock;

    public SignedUrlService(AppProperties props, Clock clock) {
        this.secret = props.mediaSigningSecret().getBytes(StandardCharsets.UTF_8);
        this.clock = clock;
    }

    public String urlFor(String key) {
        long exp = clock.instant().plus(TTL).getEpochSecond();
        return "/api/media/" + key + "?exp=" + exp + "&sig=" + sign(key, exp);
    }

    public boolean valid(String key, long exp, String sig) {
        if (exp < clock.instant().getEpochSecond() || sig == null) return false;
        return MessageDigest.isEqual(sign(key, exp).getBytes(StandardCharsets.UTF_8), sig.getBytes(StandardCharsets.UTF_8));
    }

    private String sign(String key, long exp) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(secret, "HmacSHA256"));
            return HexFormat.of().formatHex(mac.doFinal((key + "|" + exp).getBytes(StandardCharsets.UTF_8)));
        } catch (Exception e) {
            throw new IllegalStateException(e);
        }
    }
}
