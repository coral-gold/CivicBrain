package com.civicbrain.otp;

import java.time.Instant;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

public interface OtpCodeRepository extends JpaRepository<OtpCode, Long> {
    Optional<OtpCode> findFirstByEmailAndPurposeAndConsumedFalseOrderByIdDesc(String email, OtpPurpose purpose);

    Optional<OtpCode> findFirstByEmailOrderByIdDesc(String email);

    long countByEmailAndCreatedAtAfter(String email, Instant since);

    @Modifying
    @Query("update OtpCode o set o.consumed = true where o.email = :email and o.purpose = :purpose and o.consumed = false")
    void invalidateActive(String email, OtpPurpose purpose);
}
