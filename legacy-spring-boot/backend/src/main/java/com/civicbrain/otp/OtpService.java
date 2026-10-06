package com.civicbrain.otp;

import com.civicbrain.audit.AuditService;
import com.civicbrain.common.ApiException;
import com.civicbrain.config.AppProperties;
import com.civicbrain.mail.MailService;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.HexFormat;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** OTP lifecycle per FR-A2. Codes are only ever stored as HMAC-SHA256 hashes. */
@Service
public class OtpService {
    public static final int LENGTH = 6;
    public static final int TTL_SECONDS = 300;
    public static final int RESEND_SECONDS = 60;
    public static final int MAX_ATTEMPTS = 5;
    public static final int MAX_SENDS_PER_HOUR = 5;

    private final OtpCodeRepository repo;
    private final MailService mail;
    private final AuditService audit;
    private final Clock clock;
    private final byte[] hmacKey;
    private final SecureRandom random = new SecureRandom();

    public OtpService(OtpCodeRepository repo, MailService mail, AuditService audit, Clock clock, AppProperties props) {
        this.repo = repo;
        this.mail = mail;
        this.audit = audit;
        this.clock = clock;
        this.hmacKey = props.otpHmacSecret().getBytes(StandardCharsets.UTF_8);
    }

    /**
     * Issues an OTP. When {@code deliver} is false a consumed "decoy" row is written instead and nothing is
     * sent, so cooldown/hourly limits behave identically for registered and unregistered emails (FR-A6).
     */
    @Transactional(noRollbackFor = ApiException.class)
    public void issue(String email, OtpPurpose purpose, String name, boolean deliver, String ip, String ua) {
        Instant now = clock.instant();
        repo.findFirstByEmailOrderByIdDesc(email).ifPresent(last -> {
            long wait = RESEND_SECONDS - Duration.between(last.getCreatedAt(), now).getSeconds();
            if (wait > 0) throw new ApiException(HttpStatus.TOO_MANY_REQUESTS, "OTP_COOLDOWN",
                    "Please wait before requesting another code.", null, wait);
        });
        if (repo.countByEmailAndCreatedAtAfter(email, now.minus(Duration.ofHours(1))) >= MAX_SENDS_PER_HOUR) {
            throw new ApiException(HttpStatus.TOO_MANY_REQUESTS, "OTP_SEND_LIMIT",
                    "Too many codes requested. Please try again later.", null, 3600L);
        }
        repo.invalidateActive(email, purpose);

        String code = String.format("%0" + LENGTH + "d", random.nextInt(1_000_000));
        var row = new OtpCode();
        row.setEmail(email);
        row.setPurpose(purpose);
        row.setName(name);
        row.setCodeHash(hash(email, purpose, code));
        row.setExpiresAt(now.plusSeconds(TTL_SECONDS));
        row.setCreatedAt(now);
        row.setConsumed(!deliver);
        repo.save(row);

        if (deliver) {
            mail.sendOtp(email, code, TTL_SECONDS / 60, purpose == OtpPurpose.SIGNUP);
            audit.log("OTP_SENT", email, ip, ua, purpose.name());
        }
    }

    /** Verifies and consumes the active OTP; returns its row (signup needs the stored name). */
    @Transactional(noRollbackFor = ApiException.class)
    public OtpCode verify(String email, OtpPurpose purpose, String code, String ip, String ua) {
        OtpCode row = repo.findFirstByEmailAndPurposeAndConsumedFalseOrderByIdDesc(email, purpose)
                .orElseThrow(() -> fail(email, ip, ua, "OTP_INVALID", "NONE",
                        "That code is not valid. Please request a new one."));
        if (row.getExpiresAt().isBefore(clock.instant())) {
            row.setConsumed(true);
            throw fail(email, ip, ua, "OTP_EXPIRED", "EXPIRED", "That code has expired. Please request a new one.");
        }
        if (row.getAttempts() >= MAX_ATTEMPTS) {
            throw fail(email, ip, ua, "OTP_LOCKED", "LOCKED", "Too many wrong attempts. Please request a new code.");
        }
        boolean ok = MessageDigest.isEqual(
                row.getCodeHash().getBytes(StandardCharsets.UTF_8),
                hash(email, purpose, code == null ? "" : code).getBytes(StandardCharsets.UTF_8));
        if (!ok) {
            row.setAttempts(row.getAttempts() + 1);
            if (row.getAttempts() >= MAX_ATTEMPTS) {
                throw fail(email, ip, ua, "OTP_LOCKED", "LOCKED", "Too many wrong attempts. Please request a new code.");
            }
            throw fail(email, ip, ua, "OTP_INCORRECT", "WRONG",
                    "Incorrect code. " + (MAX_ATTEMPTS - row.getAttempts()) + " attempts left.");
        }
        row.setConsumed(true);   // single use
        audit.log("OTP_VERIFY_SUCCESS", email, ip, ua, purpose.name());
        return row;
    }

    private ApiException fail(String email, String ip, String ua, String code, String reason, String message) {
        audit.log("OTP_VERIFY_FAIL", email, ip, ua, reason);
        return new ApiException(code.equals("OTP_INVALID") || code.equals("OTP_EXPIRED") || code.equals("OTP_INCORRECT")
                ? HttpStatus.BAD_REQUEST : HttpStatus.TOO_MANY_REQUESTS, code, message);
    }

    private String hash(String email, OtpPurpose purpose, String code) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(hmacKey, "HmacSHA256"));
            return HexFormat.of().formatHex(mac.doFinal((email + "|" + purpose + "|" + code).getBytes(StandardCharsets.UTF_8)));
        } catch (Exception e) {
            throw new IllegalStateException(e);
        }
    }
}
