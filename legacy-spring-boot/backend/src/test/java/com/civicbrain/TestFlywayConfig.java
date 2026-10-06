package com.civicbrain;

import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.autoconfigure.flyway.FlywayMigrationStrategy;
import org.springframework.context.annotation.Bean;

/** Every test context starts from an empty schema so migrations are exercised from V1. */
@TestConfiguration
public class TestFlywayConfig {
    @Bean
    FlywayMigrationStrategy cleanMigrate() {
        return flyway -> { flyway.clean(); flyway.migrate(); };
    }
}
