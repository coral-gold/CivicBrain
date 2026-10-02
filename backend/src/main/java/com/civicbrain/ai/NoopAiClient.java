package com.civicbrain.ai;

import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
class AiClientConfig {
    /** Default until the AI service exists (M3): complaints simply stay SUBMITTED for manual handling. */
    @Bean
    @ConditionalOnMissingBean(AiClient.class)
    AiClient noopAiClient() {
        return id -> { };
    }
}
