package com.civicbrain.config;

import com.civicbrain.admin.Admin;
import com.civicbrain.admin.AdminRepository;
import com.civicbrain.admin.Role;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

/**
 * DEV ONLY (DEMO_DATA=true): makes a fresh install usable without any set-up – three sample wards around
 * Pimpri-Chinchwad and a demo officer. Never enable in production: the officer password is public.
 */
@Component
@Order(100)
public class DemoDataSeeder implements ApplicationRunner {
    public static final String OFFICER_EMAIL = "officer@civicbrain.demo";
    public static final String OFFICER_PASSWORD = "Officer!Demo2026";
    private static final Logger log = LoggerFactory.getLogger(DemoDataSeeder.class);

    private final AppProperties props;
    private final JdbcTemplate jdbc;
    private final AdminRepository admins;
    private final PasswordEncoder encoder;

    public DemoDataSeeder(AppProperties props, JdbcTemplate jdbc, AdminRepository admins, PasswordEncoder encoder) {
        this.props = props;
        this.jdbc = jdbc;
        this.admins = admins;
        this.encoder = encoder;
    }

    @Override
    public void run(ApplicationArguments args) {
        if (!props.demoData()) return;
        Integer wards = jdbc.queryForObject("select count(*) from wards", Integer.class);
        if (wards != null && wards == 0) {
            String[][] w = {{"1", "Akurdi", "73.72", "18.60"}, {"2", "Nigdi", "73.72", "18.66"}, {"3", "Pimpri", "73.80", "18.60"}};
            for (String[] r : w) {
                double x = Double.parseDouble(r[2]), y = Double.parseDouble(r[3]), d = 0.08;
                jdbc.update("insert into wards (number, name, boundary) values (?, ?, ST_Multi(ST_GeomFromText(?, 4326)))",
                        Integer.parseInt(r[0]), r[1], String.format(java.util.Locale.ROOT,
                                "POLYGON((%f %f, %f %f, %f %f, %f %f, %f %f))", x, y, x + d, y, x + d, y + 0.06, x, y + 0.06, x, y));
            }
        }
        if (!admins.existsByEmail(OFFICER_EMAIL)) {
            var a = new Admin();
            a.setEmail(OFFICER_EMAIL);
            a.setFullName("Demo Officer (Ward 1)");
            a.setRole(Role.OFFICER);
            a.setAssignedWardNumber(1);
            a.setPasswordHash(encoder.encode(OFFICER_PASSWORD));
            admins.save(a);
        }
        log.warn("DEMO_DATA is on: sample wards and a demo officer are available. Do not use in production.");
    }
}
