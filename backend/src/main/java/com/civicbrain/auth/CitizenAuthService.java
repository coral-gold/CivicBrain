package com.civicbrain.auth;

import com.civicbrain.admin.Role;
import com.civicbrain.audit.AuditService;
import com.civicbrain.auth.AuthDtos.OtpSentResponse;
import com.civicbrain.citizen.AccountStatus;
import com.civicbrain.citizen.Citizen;
import com.civicbrain.citizen.CitizenRepository;
import com.civicbrain.common.ApiException;
import com.civicbrain.mail.MailService;
import com.civicbrain.otp.OtpCode;
import com.civicbrain.otp.OtpPurpose;
import com.civicbrain.otp.OtpService;
import jakarta.servlet.http.HttpServletResponse;
import java.time.Instant;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class CitizenAuthService {
    private static final OtpSentResponse SENT = new OtpSentResponse(
            "If the details are valid, a 6-digit code has been sent to your email.",
            OtpService.RESEND_SECONDS, OtpService.TTL_SECONDS);

    private final OtpService otp;
    private final CitizenRepository citizens;
    private final MailService mail;
    private final AuditService audit;
    private final com.civicbrain.security.SessionCookie cookie;

    public CitizenAuthService(OtpService otp, CitizenRepository citizens, MailService mail, AuditService audit,
                              com.civicbrain.security.SessionCookie cookie) {
        this.otp = otp;
        this.citizens = citizens;
        this.mail = mail;
        this.audit = audit;
        this.cookie = cookie;
    }

    /** FR-A6: identical response whether or not the email is registered. */
    @Transactional(noRollbackFor = ApiException.class)
    public OtpSentResponse requestSignup(String name, String email, String ip, String ua) {
        boolean exists = citizens.existsByEmail(email);
        otp.issue(email, OtpPurpose.SIGNUP, name.trim(), !exists, ip, ua);
        if (exists) mail.sendAccountExists(email);
        return SENT;
    }

    @Transactional(noRollbackFor = ApiException.class)
    public OtpSentResponse requestLogin(String email, String ip, String ua) {
        otp.issue(email, OtpPurpose.LOGIN, null, citizens.existsByEmail(email), ip, ua);
        return SENT;
    }

    @Transactional(noRollbackFor = ApiException.class)
    public Citizen verifySignup(String email, String code, String ip, String ua, HttpServletResponse res) {
        OtpCode row = otp.verify(email, OtpPurpose.SIGNUP, code, ip, ua);
        if (citizens.existsByEmail(email)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "OTP_INVALID", "That code is not valid. Please request a new one.");
        }
        var c = new Citizen();
        c.setEmail(email);
        c.setFullName(row.getName());
        c.setStatus(AccountStatus.PROFILE_PENDING);
        try {
            c = citizens.saveAndFlush(c);
        } catch (DataIntegrityViolationException e) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "OTP_INVALID", "That code is not valid. Please request a new one.");
        }
        cookie.write(res, c.getId(), Role.CITIZEN, c.profileComplete());
        return c;
    }

    @Transactional(noRollbackFor = ApiException.class)
    public Citizen verifyLogin(String email, String code, String ip, String ua, HttpServletResponse res) {
        otp.verify(email, OtpPurpose.LOGIN, code, ip, ua);
        Citizen c = citizens.findByEmail(email).orElseThrow(() ->
                new ApiException(HttpStatus.BAD_REQUEST, "OTP_INVALID", "That code is not valid. Please request a new one."));
        if (c.getStatus() == AccountStatus.SUSPENDED) {
            throw new ApiException(HttpStatus.FORBIDDEN, "ACCOUNT_SUSPENDED", "This account has been suspended.");
        }
        c.setUpdatedAt(Instant.now());
        cookie.write(res, c.getId(), Role.CITIZEN, c.profileComplete());
        return c;
    }
}
