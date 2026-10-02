package com.civicbrain.otp;

import jakarta.persistence.*;
import java.time.Instant;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "otp_codes")
@Getter @Setter
public class OtpCode {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    private String email;
    @Enumerated(EnumType.STRING)
    private OtpPurpose purpose;
    private String name;
    private String codeHash;
    private Instant expiresAt;
    private int attempts;
    private boolean consumed;
    private Instant createdAt = Instant.now();
}
