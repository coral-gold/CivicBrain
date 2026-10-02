package com.civicbrain.auth;

import com.civicbrain.admin.AdminRepository;
import com.civicbrain.admin.Role;
import com.civicbrain.auth.AuthDtos.*;
import com.civicbrain.citizen.AccountStatus;
import com.civicbrain.citizen.CitizenRepository;
import com.civicbrain.common.ApiException;
import com.civicbrain.common.ClientIp;
import com.civicbrain.security.AuthPrincipal;
import com.civicbrain.security.SessionCookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
public class AuthController {
    private final CitizenAuthService citizenAuth;
    private final AdminAuthService adminAuth;
    private final AuthRateLimiters limits;
    private final ClientIp clientIp;
    private final SessionCookie cookie;
    private final CitizenRepository citizens;
    private final AdminRepository admins;

    public AuthController(CitizenAuthService citizenAuth, AdminAuthService adminAuth, AuthRateLimiters limits,
                          ClientIp clientIp, SessionCookie cookie, CitizenRepository citizens, AdminRepository admins) {
        this.citizenAuth = citizenAuth;
        this.adminAuth = adminAuth;
        this.limits = limits;
        this.clientIp = clientIp;
        this.cookie = cookie;
        this.citizens = citizens;
        this.admins = admins;
    }

    @PostMapping("/citizen/signup/request-otp")
    public OtpSentResponse signupRequest(@Valid @RequestBody SignupRequest b, HttpServletRequest req) {
        String ip = clientIp.of(req);
        limits.otpRequest(ip);
        return citizenAuth.requestSignup(b.name(), norm(b.email()), ip, ClientIp.userAgent(req));
    }

    @PostMapping("/citizen/signup/verify")
    public UserResponse signupVerify(@Valid @RequestBody VerifyRequest b, HttpServletRequest req, HttpServletResponse res) {
        String ip = clientIp.of(req);
        limits.otpVerify(ip);
        return new UserResponse(UserDto.of(citizenAuth.verifySignup(norm(b.email()), b.otp(), ip, ClientIp.userAgent(req), res)));
    }

    @PostMapping("/citizen/login/request-otp")
    public OtpSentResponse loginRequest(@Valid @RequestBody EmailRequest b, HttpServletRequest req) {
        String ip = clientIp.of(req);
        limits.otpRequest(ip);
        return citizenAuth.requestLogin(norm(b.email()), ip, ClientIp.userAgent(req));
    }

    @PostMapping("/citizen/login/verify")
    public UserResponse loginVerify(@Valid @RequestBody VerifyRequest b, HttpServletRequest req, HttpServletResponse res) {
        String ip = clientIp.of(req);
        limits.otpVerify(ip);
        return new UserResponse(UserDto.of(citizenAuth.verifyLogin(norm(b.email()), b.otp(), ip, ClientIp.userAgent(req), res)));
    }

    @PostMapping("/admin/login")
    public UserResponse adminLogin(@Valid @RequestBody AdminLoginRequest b, HttpServletRequest req, HttpServletResponse res) {
        String ip = clientIp.of(req);
        limits.adminLogin(ip);
        return new UserResponse(UserDto.of(adminAuth.login(norm(b.email()), b.password(), ip, ClientIp.userAgent(req), res)));
    }

    /** FR-A13: re-reads the DB; suspended/disabled/missing accounts get 401 and the cookie is cleared. */
    @GetMapping("/me")
    public UserResponse me(@AuthenticationPrincipal AuthPrincipal p, HttpServletResponse res) {
        if (p != null) {
            if (p.role() == Role.CITIZEN) {
                var c = citizens.findById(p.id()).filter(x -> x.getStatus() != AccountStatus.SUSPENDED);
                if (c.isPresent()) return new UserResponse(UserDto.of(c.get()));
            } else {
                var a = admins.findById(p.id()).filter(x -> x.active());
                if (a.isPresent()) return new UserResponse(UserDto.of(a.get()));
            }
        }
        cookie.clear(res);
        throw new ApiException(HttpStatus.UNAUTHORIZED, "SESSION_INVALID", "Your session is no longer valid.");
    }

    @PostMapping("/logout")
    public MessageResponse logout(HttpServletResponse res) {
        cookie.clear(res);
        return new MessageResponse("Signed out.");
    }

    static String norm(String email) { return email.trim().toLowerCase(); }
}
