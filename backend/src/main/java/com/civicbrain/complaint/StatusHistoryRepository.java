package com.civicbrain.complaint;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface StatusHistoryRepository extends JpaRepository<StatusHistory, Long> {
    List<StatusHistory> findByComplaintIdOrderByCreatedAtAscIdAsc(Long complaintId);

    @Query("select max(h.createdAt) from StatusHistory h where h.complaintId = :id and h.toStatus = 'RESOLVED'")
    Optional<Instant> lastResolvedAt(Long id);
}
