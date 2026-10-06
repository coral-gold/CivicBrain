package com.civicbrain.auth;

import com.civicbrain.admin.Admin;
import com.civicbrain.admin.AdminRepository;
import com.civicbrain.audit.AuditService;
import com.civicbrain.common.ApiException;
import jakarta.servlet.http.HttpServletResponse;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AdminAuthService {
    public static final int MAX_FAILURES = 5;
    public static final Duration LOCK = Duration.ofMinutes(15);

    private final AdminRepository admins;
    private final PasswordEncoder encoder;
    private final AuditService audit;
    private final Clock clock;
    private final com.civicbrain.security.SessionCookie cookie;
    private final String dummyHash;

    public AdminAuthService(AdminRepository admins, PasswordEncoder encoder, AuditService audit, Clock clock,
                            com.civicbrain.security.SessionCookie cookie) {
        this.admins = admins;
        this.encoder = encoder;
        this.audit = audit;
        this.clock = clock;
        this.cookie = cookie;
        this.dummyHash = encoder.encode("timing-equaliser-not-a-real-password");
    }

    @Transactional(noRollbackFor = ApiException.class)
    public Admin login(String email, String password, String ip, String ua, HttpServletResponse res) {
        Instant now = clock.instant();
        Admin a = admins.findByEmail(email).orElse(null);
        if (a == null) {
            encoder.matches(password, dummyHash);     // same work as a real check: no timing oracle
            throw invalid(email, ip, ua);
        }
        if (a.getLockedUntil() != null && a.getLockedUntil().isAfter(now)) {
            audit.log("ADMIN_LOGIN_BLOCKED", email, ip, ua, "LOCKED");
            throw new ApiException(HttpStatus.LOCKED, "ACCOUNT_LOCKED",
                    "Account temporarily locked. Try again later.", null,
                    Duration.between(now, a.getLockedUntil()).toSeconds() + 1);
        }
        if (!encoder.matches(password, a.getPasswordHash())) {
            a.setFailedAttempts(a.getFailedAttempts() + 1);
            if (a.getFailedAttempts() >= MAX_FAILURES) {
                a.setLockedUntil(now.plus(LOCK));
                a.setFailedAttempts(0);
                audit.log("ADMIN_LOCKED", email, ip, ua, "5 failures");
            }
            throw invalid(email, ip, ua);
        }
        if (!a.active()) {
            audit.log("ADMIN_LOGIN_FAIL", email, ip, ua, "DISABLED");
            throw new ApiException(HttpStatus.FORBIDDEN, "ACCOUNT_SUSPENDED", "This account has been disabled.");
        }
        a.setFailedAttempts(0);
        a.setLockedUntil(null);
        audit.log("ADMIN_LOGIN_SUCCESS", email, ip, ua, a.getRole().name());
        cookie.write(res, a.getId(), a.getRole(), true);
        return a;
    }

    private ApiException invalid(String email, String ip, String ua) {
        audit.log("ADMIN_LOGIN_FAIL", email, ip, ua, "BAD_CREDENTIALS");
        return new ApiException(HttpStatus.UNAUTHORIZED, "INVALID_CREDENTIALS", "Incorrect email or password.");
    }
}
