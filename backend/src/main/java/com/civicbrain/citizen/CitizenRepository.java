package com.civicbrain.citizen;

import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CitizenRepository extends JpaRepository<Citizen, Long> {
    Optional<Citizen> findByEmail(String email);
    boolean existsByEmail(String email);
    boolean existsByPhoneAndIdNot(String phone, Long id);
}
