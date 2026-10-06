package com.civicbrain;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import com.civicbrain.admin.Role;
import com.civicbrain.otp.OtpService;
import com.civicbrain.security.JwtService;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.ResultActions;

class AuthApiTest extends BaseIntegrationTest {
    @Autowired JwtService jwt;

    private ResultActions postJson(String url, String json) throws Exception {
        return mvc.perform(post(url).contentType(MediaType.APPLICATION_JSON).content(json));
    }

    private ResultActions requestSignup(String name, String email) throws Exception {
        return postJson("/api/auth/citizen/signup/request-otp", "{\"name\":\"" + name + "\",\"email\":\"" + email + "\"}");
    }

    private ResultActions verifySignup(String email, String otp) throws Exception {
        return postJson("/api/auth/citizen/signup/verify", "{\"email\":\"" + email + "\",\"otp\":\"" + otp + "\"}");
    }

    private String wrong(String real) { return real.equals("000000") ? "111111" : "000000"; }

    @Test // AT-1
    void signupWithOtpCreatesPendingAccountAndCodeWorksOnce() throws Exception {
        requestSignup("Asha Patil", "asha@example.com").andExpect(status().isOk())
                .andExpect(jsonPath("$.resendAfterSeconds").value(60))
                .andExpect(jsonPath("$.expiresInSeconds").value(300));
        String otp = lastOtpSentTo("asha@example.com");
        assertThat(otp).matches("\\d{6}");

        var res = verifySignup("asha@example.com", otp).andExpect(status().isOk())
                .andExpect(jsonPath("$.user.status").value("PROFILE_PENDING"))
                .andExpect(jsonPath("$.user.profileComplete").value(false))
                .andReturn();
        String setCookie = res.getResponse().getHeader("Set-Cookie");
        assertThat(setCookie).contains("HttpOnly").contains("SameSite=Lax");

        verifySignup("asha@example.com", otp).andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("OTP_INVALID"));
        // OTP is only ever stored hashed
        assertThat(jdbc.queryForObject("select code_hash from otp_codes limit 1", String.class))
                .doesNotContain(otp).hasSize(64);
    }

    @Test // AT-2
    void fiveWrongCodesLockTheOtp() throws Exception {
        requestSignup("Asha", "lock@example.com");
        String otp = lastOtpSentTo("lock@example.com");
        for (int i = 1; i <= 4; i++) {
            verifySignup("lock@example.com", wrong(otp)).andExpect(jsonPath("$.code").value("OTP_INCORRECT"));
        }
        verifySignup("lock@example.com", wrong(otp)).andExpect(status().isTooManyRequests())
                .andExpect(jsonPath("$.code").value("OTP_LOCKED"));
        verifySignup("lock@example.com", otp).andExpect(jsonPath("$.code").value("OTP_LOCKED"));
        assertThat(citizens.existsByEmail("lock@example.com")).isFalse();
    }

    @Test // AT-3
    void expiredOtpIsRejected() throws Exception {
        requestSignup("Asha", "old@example.com");
        String otp = lastOtpSentTo("old@example.com");
        jdbc.update("update otp_codes set expires_at = now() - interval '1 second'");
        verifySignup("old@example.com", otp).andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("OTP_EXPIRED"));
    }

    @Test // AT-4
    void resendWithinSixtySecondsIsRateLimited() throws Exception {
        requestSignup("Asha", "fast@example.com").andExpect(status().isOk());
        requestSignup("Asha", "fast@example.com").andExpect(status().isTooManyRequests())
                .andExpect(jsonPath("$.code").value("OTP_COOLDOWN"))
                .andExpect(jsonPath("$.retryAfterSeconds").isNumber());
    }

    @Test
    void newOtpInvalidatesTheOldOne() throws Exception {
        requestSignup("Asha", "two@example.com");
        String first = lastOtpSentTo("two@example.com");
        jdbc.update("update otp_codes set created_at = now() - interval '2 minutes'");
        requestSignup("Asha", "two@example.com").andExpect(status().isOk());
        verifySignup("two@example.com", first).andExpect(jsonPath("$.code").value("OTP_INCORRECT"));
    }

    @Test
    void sixthSendInAnHourHitsSendLimit() throws Exception {
        for (int i = 0; i < OtpService.MAX_SENDS_PER_HOUR; i++) {
            requestSignup("Asha", "spam@example.com").andExpect(status().isOk());
            jdbc.update("update otp_codes set created_at = created_at - interval '2 minutes'");
        }
        requestSignup("Asha", "spam@example.com").andExpect(status().isTooManyRequests())
                .andExpect(jsonPath("$.code").value("OTP_SEND_LIMIT"));
    }

    @Test // AT-5
    void signupWithRegisteredEmailLooksIdenticalAndSendsAccountExistsMail() throws Exception {
        citizen("exists@example.com", true);
        String fresh = requestSignup("Asha", "new@example.com").andReturn().getResponse().getContentAsString();
        String existing = requestSignup("Asha", "exists@example.com").andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        assertThat(existing).isEqualTo(fresh);
        verify(mail).sendAccountExists("exists@example.com");
        verify(mail, never()).sendOtp(eq("exists@example.com"), any(), anyInt(), anyBoolean());
    }

    @Test // AT-6
    void loginWithUnknownEmailLooksIdenticalAndSendsNothing() throws Exception {
        citizen("known@example.com", true);
        String known = postJson("/api/auth/citizen/login/request-otp", "{\"email\":\"known@example.com\"}")
                .andReturn().getResponse().getContentAsString();
        String unknown = postJson("/api/auth/citizen/login/request-otp", "{\"email\":\"ghost@example.com\"}")
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        assertThat(unknown).isEqualTo(known);
        verify(mail, never()).sendOtp(eq("ghost@example.com"), any(), anyInt(), anyBoolean());
        // cooldown is also identical for the unknown address (no enumeration through limits)
        postJson("/api/auth/citizen/login/request-otp", "{\"email\":\"ghost@example.com\"}")
                .andExpect(jsonPath("$.code").value("OTP_COOLDOWN"));
    }

    @Test
    void passwordlessLoginIssuesSession() throws Exception {
        citizen("login@example.com", true);
        postJson("/api/auth/citizen/login/request-otp", "{\"email\":\"Login@Example.com\"}").andExpect(status().isOk());
        String otp = lastOtpSentTo("login@example.com");
        var r = postJson("/api/auth/citizen/login/verify", "{\"email\":\"login@example.com\",\"otp\":\"" + otp + "\"}")
                .andExpect(status().isOk()).andExpect(jsonPath("$.user.profileComplete").value(true)).andReturn();
        mvc.perform(get("/api/auth/me").cookie(new Cookie("cb_session", cookieValue(r))))
                .andExpect(status().isOk()).andExpect(jsonPath("$.user.email").value("login@example.com"));
    }

    private String profileJson(String phone, String dob, int ward) {
        return "{\"fullName\":\"Asha Patil\",\"phone\":\"" + phone + "\",\"gender\":\"FEMALE\",\"dateOfBirth\":\""
                + dob + "\",\"wardNumber\":" + ward + "}";
    }

    @Test // AT-7
    void invalidProfileReturnsFieldErrorsForEachField() throws Exception {
        var c = citizen("p@example.com", false);
        String dob = java.time.LocalDate.now().minusYears(10).toString();
        mvc.perform(put("/api/citizen/profile").cookie(sessionFor(c, jwt)).contentType(MediaType.APPLICATION_JSON)
                        .content(profileJson("5123456789", dob, 0)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"))
                .andExpect(jsonPath("$.fieldErrors.phone").exists())
                .andExpect(jsonPath("$.fieldErrors.dateOfBirth").exists())
                .andExpect(jsonPath("$.fieldErrors.wardNumber").exists());
        mvc.perform(put("/api/citizen/profile").cookie(sessionFor(c, jwt)).contentType(MediaType.APPLICATION_JSON)
                        .content(profileJson("9123456789", "1990-01-01", 31)))   // WARD_COUNT is 30
                .andExpect(jsonPath("$.fieldErrors.wardNumber").exists());
    }

    @Test
    void validProfileActivatesAccountAndRefreshesCookie() throws Exception {
        var c = citizen("ok@example.com", false);
        var r = mvc.perform(put("/api/citizen/profile").cookie(sessionFor(c, jwt)).contentType(MediaType.APPLICATION_JSON)
                        .content(profileJson("9123456789", "1990-01-01", 5)))
                .andExpect(status().isOk()).andExpect(jsonPath("$.user.status").value("ACTIVE")).andReturn();
        assertThat(r.getResponse().getHeader("Set-Cookie")).contains("cb_session=");
    }

    @Test // AT-8
    void duplicatePhoneIsAConflict() throws Exception {
        var other = citizen("other@example.com", true);
        var c = citizen("me@example.com", false);
        mvc.perform(put("/api/citizen/profile").cookie(sessionFor(c, jwt)).contentType(MediaType.APPLICATION_JSON)
                        .content(profileJson(other.getPhone(), "1990-01-01", 5)))
                .andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("PHONE_IN_USE"))
                .andExpect(jsonPath("$.fieldErrors.phone").exists());
    }

    @Test
    void incompleteProfileCannotUseCitizenApis() throws Exception {
        var c = citizen("pending@example.com", false);
        mvc.perform(get("/api/citizen/complaints").cookie(sessionFor(c, jwt))).andExpect(status().isForbidden());
    }

    @Test // AT-10
    void citizenCookieCannotCallAdminApis() throws Exception {
        var c = citizen("c@example.com", true);
        mvc.perform(get("/api/admin/complaints").cookie(sessionFor(c, jwt)))
                .andExpect(status().isForbidden()).andExpect(jsonPath("$.code").value("FORBIDDEN"));
        mvc.perform(get("/api/admin/complaints")).andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("UNAUTHENTICATED"));
    }

    private ResultActions adminLogin(String email, String pw, String ip) throws Exception {
        return mvc.perform(post("/api/auth/admin/login").with(r -> { r.setRemoteAddr(ip); return r; })
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"" + email + "\",\"password\":\"" + pw + "\"}"));
    }

    @Test // AT-11 + FR-A7
    void adminLockoutAfterFiveFailures() throws Exception {
        staff("boss@example.com", Role.ADMIN, null);
        String unknown = adminLogin("nobody@example.com", "Wrong-Pass-123!", "10.0.0.1").andExpect(status().isUnauthorized())
                .andReturn().getResponse().getContentAsString().replaceAll("\"timestamp\":\"[^\"]*\"", "");
        String badPw = adminLogin("boss@example.com", "Wrong-Pass-123!", "10.0.0.1").andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("INVALID_CREDENTIALS"))
                .andReturn().getResponse().getContentAsString().replaceAll("\"timestamp\":\"[^\"]*\"", "");
        assertThat(badPw).isEqualTo(unknown);
        for (int i = 0; i < 4; i++) adminLogin("boss@example.com", "Wrong-Pass-123!", "10.0.0.1");
        adminLogin("boss@example.com", STRONG_PW, "10.0.0.1").andExpect(status().isLocked())
                .andExpect(jsonPath("$.code").value("ACCOUNT_LOCKED")).andExpect(jsonPath("$.retryAfterSeconds").isNumber());
        jdbc.update("update admins set locked_until = now() - interval '1 second'");
        adminLogin("boss@example.com", STRONG_PW, "10.0.0.1").andExpect(status().isOk())
                .andExpect(jsonPath("$.user.role").value("ADMIN"));
    }

    @Test
    void adminLoginIsLimitedPerIp() throws Exception {
        for (int i = 0; i < 10; i++) adminLogin("x" + i + "@example.com", "Wrong-Pass-123!", "10.9.9.9");
        adminLogin("x@example.com", "Wrong-Pass-123!", "10.9.9.9").andExpect(status().isTooManyRequests())
                .andExpect(jsonPath("$.code").value("RATE_LIMITED"));
        adminLogin("x@example.com", "Wrong-Pass-123!", "10.9.9.10").andExpect(status().isUnauthorized());
    }

    @Test // AT-12
    void tamperedJwtIsSignedOut() throws Exception {
        var c = citizen("t@example.com", true);
        String token = jwt.issue(c.getId(), Role.CITIZEN, true);
        String forged = token.substring(0, token.length() - 3) + (token.endsWith("AAA") ? "BBB" : "AAA");
        mvc.perform(get("/api/auth/me").cookie(new Cookie("cb_session", forged)))
                .andExpect(status().isUnauthorized());
        // a token claiming ADMIN for a citizen id is useless because role is re-read from the DB
        String asAdmin = jwt.issue(c.getId(), Role.ADMIN, true);
        mvc.perform(get("/api/admin/complaints").cookie(new Cookie("cb_session", asAdmin)))
                .andExpect(status().isUnauthorized());
    }

    @Test // FR-A13
    void suspendedAccountGets401AndCookieCleared() throws Exception {
        var c = citizen("s@example.com", true);
        c.setStatus(com.civicbrain.citizen.AccountStatus.SUSPENDED);
        citizens.save(c);
        var r = mvc.perform(get("/api/auth/me").cookie(sessionFor(c, jwt))).andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("SESSION_INVALID")).andReturn();
        assertThat(r.getResponse().getHeader("Set-Cookie")).contains("Max-Age=0");
    }

    @Test // FR-A12
    void authEventsAreAudited() throws Exception {
        requestSignup("Asha", "aud@example.com");
        verifySignup("aud@example.com", wrong(lastOtpSentTo("aud@example.com")));
        adminLogin("nobody@example.com", "Wrong-Pass-123!", "10.1.1.1");
        var events = jdbc.queryForList("select event from auth_audit_log", String.class);
        assertThat(events).contains("OTP_SENT", "OTP_VERIFY_FAIL", "ADMIN_LOGIN_FAIL");
        assertThat(jdbc.queryForObject("select count(*) from auth_audit_log where ip is not null", Integer.class)).isPositive();
    }

    @Test
    void publicConfigIsOpen() throws Exception {
        mvc.perform(get("/api/public/config")).andExpect(status().isOk())
                .andExpect(jsonPath("$.wardCount").value(30)).andExpect(jsonPath("$.otpLength").value(6));
    }

    @Test
    void staffManagementIsSuperAdminOnly() throws Exception {
        var admin = staff("a@example.com", Role.ADMIN, null);
        var root = staff("root@example.com", Role.SUPER_ADMIN, null);
        var body = "{\"email\":\"o@example.com\",\"fullName\":\"Ofc\",\"role\":\"OFFICER\",\"assignedWardNumber\":3,\"password\":\""
                + STRONG_PW + "\"}";
        mvc.perform(post("/api/admin/staff").cookie(new Cookie("cb_session", jwt.issue(admin.getId(), Role.ADMIN, true)))
                .contentType(MediaType.APPLICATION_JSON).content(body)).andExpect(status().isForbidden());
        Cookie rootCookie = new Cookie("cb_session", jwt.issue(root.getId(), Role.SUPER_ADMIN, true));
        mvc.perform(post("/api/admin/staff").cookie(rootCookie).contentType(MediaType.APPLICATION_JSON)
                .content(body.replace(STRONG_PW, "weak"))).andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors.password").exists());
        mvc.perform(post("/api/admin/staff").cookie(rootCookie).contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isCreated()).andExpect(jsonPath("$.role").value("OFFICER"));
    }
}
