package com.civicbrain.complaint;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@ConditionalOnProperty(name = "app.scheduling-enabled", havingValue = "true", matchIfMissing = true)
public class ComplaintScheduler {
    private static final Logger log = LoggerFactory.getLogger(ComplaintScheduler.class);
    private final ComplaintService service;

    public ComplaintScheduler(ComplaintService service) { this.service = service; }

    @Scheduled(fixedDelay = 3_600_000, initialDelay = 60_000)
    public void autoClose() {
        int n = service.autoCloseResolved();
        if (n > 0) log.info("Auto-closed {} resolved complaints", n);
    }
}
