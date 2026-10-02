package com.civicbrain;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.springframework.core.io.ClassPathResource;

/** Regression guard: the test profile supplies every setting, so a misplaced application.yml would go unnoticed. */
class ConfigGuardTest {
    @Test
    void mainApplicationYmlIsAtTheClasspathRoot() {
        assertThat(new ClassPathResource("application.yml").exists()).isTrue();
    }
}
