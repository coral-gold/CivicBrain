package com.civicbrain.complaint;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ComplaintCategoryRepository extends JpaRepository<ComplaintCategory, Long> {
    Optional<ComplaintCategory> findByCodeAndActiveTrue(String code);
    List<ComplaintCategory> findByActiveTrueOrderById();
}
