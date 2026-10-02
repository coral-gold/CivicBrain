package com.civicbrain;

import static org.mockito.ArgumentMatchers.anyBoolean;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;

import com.civicbrain.admin.Admin;
import com.civicbrain.admin.AdminRepository;
import com.civicbrain.admin.Role;
import com.civicbrain.auth.AuthRateLimiters;
import com.civicbrain.citizen.*;
import com.civicbrain.mail.MailService;
import jakarta.servlet.http.Cookie;
import java.time.LocalDate;
import org.junit.jupiter.api.BeforeEach;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Import(TestFlywayConfig.class)
public abstract class BaseIntegrationTest {
    public static final String STRONG_PW = "Str0ng!Passw0rd";

    @Autowired protected MockMvc mvc;
    @Autowired protected JdbcTemplate jdbc;
    @Autowired protected CitizenRepository citizens;
    @Autowired protected AdminRepository admins;
    @Autowired protected PasswordEncoder encoder;
    @Autowired protected AuthRateLimiters limiters;
    @MockBean protected MailService mail;

    /** Keeps seeded reference data (categories) and removes everything else. */
    @BeforeEach
    void cleanDb() {
        jdbc.execute("TRUNCATE me_too, complaint_status_history, complaint_media, complaints, wards, otp_codes, "
                + "auth_audit_log, citizens, admins RESTART IDENTITY CASCADE");
        limiters.resetAll();
    }

    protected Citizen citizen(String email, boolean complete) {
        var c = new Citizen();
        c.setEmail(email);
        c.setFullName("Test Citizen");
        if (complete) {
            c.setPhone(String.valueOf(9_000_000_000L + Math.abs(email.hashCode()) % 99_999_999L));
            c.setGender(Gender.OTHER);
            c.setDateOfBirth(LocalDate.of(1995, 5, 5));
            c.setWardNumber(1);
            c.setStatus(AccountStatus.ACTIVE);
        }
        return citizens.save(c);
    }

    protected Admin staff(String email, Role role, Integer ward) {
        var a = new Admin();
        a.setEmail(email);
        a.setFullName("Staff " + role);
        a.setRole(role);
        a.setAssignedWardNumber(ward);
        a.setPasswordHash(encoder.encode(STRONG_PW));
        return admins.save(a);
    }

    protected Cookie sessionFor(Citizen c, com.civicbrain.security.JwtService jwt) {
        return new Cookie(com.civicbrain.security.SessionCookie.NAME, jwt.issue(c.getId(), Role.CITIZEN, c.profileComplete()));
    }

    /** Pulls the plaintext OTP out of the (mocked) outgoing email. */
    protected String lastOtpSentTo(String email) {
        var code = ArgumentCaptor.forClass(String.class);
        verify(mail, org.mockito.Mockito.atLeastOnce()).sendOtp(eq(email), code.capture(), anyInt(), anyBoolean());
        return code.getValue();
    }

    protected static String cookieValue(MvcResult r) {
        String h = r.getResponse().getHeader("Set-Cookie");
        return h == null ? null : h.split(";")[0].split("=", 2)[1];
    }
}
