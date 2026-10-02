package com.civicbrain.audit;

import org.springframework.data.jpa.repository.JpaRepository;

public interface AuthAuditLogRepository extends JpaRepository<AuthAuditLog, Long> {}
