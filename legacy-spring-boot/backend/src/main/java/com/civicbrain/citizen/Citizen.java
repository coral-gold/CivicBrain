package com.civicbrain.citizen;

import jakarta.persistence.*;
import java.time.Instant;
import java.time.LocalDate;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "citizens")
@Getter @Setter
public class Citizen {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    private String email;
    private String fullName;
    private String phone;
    @Enumerated(EnumType.STRING)
    private Gender gender;
    private LocalDate dateOfBirth;
    private Integer wardNumber;
    @Enumerated(EnumType.STRING)
    private AccountStatus status = AccountStatus.PROFILE_PENDING;
    private boolean emailNotifications = true;
    private Instant createdAt = Instant.now();
    private Instant updatedAt = Instant.now();

    public boolean profileComplete() { return status == AccountStatus.ACTIVE; }
}
