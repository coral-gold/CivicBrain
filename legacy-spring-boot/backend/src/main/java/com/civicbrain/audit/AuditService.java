package com.civicbrain.audit;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

/** Writes auth events in their own transaction so failures are recorded even if the caller rolls back (FR-A12). */
@Service
public class AuditService {
    private final AuthAuditLogRepository repo;

    public AuditService(AuthAuditLogRepository repo) { this.repo = repo; }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void log(String event, String subject, String ip, String userAgent, String detail) {
        var e = new AuthAuditLog();
        e.setEvent(event);
        e.setSubject(subject);
        e.setIp(ip);
        e.setUserAgent(userAgent);
        e.setDetail(detail);
        repo.save(e);
    }
}
