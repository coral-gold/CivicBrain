package com.civicbrain.audit;

import jakarta.persistence.*;
import java.time.Instant;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "auth_audit_log")
@Getter @Setter
public class AuthAuditLog {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    private String event;
    private String subject;
    private String ip;
    private String userAgent;
    private String detail;
    private Instant createdAt = Instant.now();
}
