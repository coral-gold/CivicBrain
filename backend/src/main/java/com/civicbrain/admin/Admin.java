package com.civicbrain.admin;

import jakarta.persistence.*;
import java.time.Instant;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "admins")
@Getter @Setter
public class Admin {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    private String email;
    private String fullName;
    private String passwordHash;
    @Enumerated(EnumType.STRING)
    private Role role;
    private Integer assignedWardNumber;
    private String status = "ACTIVE";
    private int failedAttempts;
    private Instant lockedUntil;
    private Instant createdAt = Instant.now();
    private Instant updatedAt = Instant.now();

    public boolean active() { return "ACTIVE".equals(status); }
}
