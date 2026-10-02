package com.civicbrain.admin;

import com.civicbrain.config.AppProperties;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

/** FR-A9: the first SUPER_ADMIN is seeded from env vars; there is no public admin signup. */
@Component
public class AdminSeeder implements ApplicationRunner {
    private static final Logger log = LoggerFactory.getLogger(AdminSeeder.class);
    private final AdminRepository admins;
    private final PasswordEncoder encoder;
    private final AppProperties props;

    public AdminSeeder(AdminRepository admins, PasswordEncoder encoder, AppProperties props) {
        this.admins = admins;
        this.encoder = encoder;
        this.props = props;
    }

    @Override
    public void run(ApplicationArguments args) {
        String email = props.seedAdminEmail();
        if (email == null || email.isBlank() || props.seedAdminPassword() == null) return;
        email = email.trim().toLowerCase();
        if (admins.existsByEmail(email)) return;
        if (!PasswordPolicy.isValid(props.seedAdminPassword())) {
            throw new IllegalStateException("SEED_ADMIN_PASSWORD does not meet the password policy (FR-A9)");
        }
        var a = new Admin();
        a.setEmail(email);
        a.setFullName(props.seedAdminName());
        a.setRole(Role.SUPER_ADMIN);
        a.setPasswordHash(encoder.encode(props.seedAdminPassword()));
        admins.save(a);
        log.info("Seeded initial SUPER_ADMIN account");
    }
}
