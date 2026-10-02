package com.civicbrain.complaint;

import java.time.Instant;
import java.util.List;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface ComplaintRepository extends JpaRepository<Complaint, Long> {
    @Query("select c from Complaint c where c.citizenId = :citizenId and (:status is null or c.status = :status)")
    Page<Complaint> findForCitizen(Long citizenId, ComplaintStatus status, Pageable pageable);

    long countByCitizenIdAndCreatedAtAfter(Long citizenId, Instant since);

    String STAFF_FILTER = """
            select c from Complaint c
            where (:wardId is null or c.wardId = :wardId)
              and (:status is null or c.status = :status)
              and (:categoryId is null or c.categoryId = :categoryId)
            """;

    /** Highest priority first; complaints without a score yet sort last, oldest first within a score. */
    @Query(STAFF_FILTER + " order by c.priorityScore desc nulls last, c.createdAt asc, c.id asc")
    Page<Complaint> findForStaffByPriority(Long wardId, ComplaintStatus status, Long categoryId, Pageable pageable);

    @Query(STAFF_FILTER + " order by c.createdAt desc, c.id desc")
    Page<Complaint> findForStaffNewest(Long wardId, ComplaintStatus status, Long categoryId, Pageable pageable);

    /** RESOLVED complaints whose latest RESOLVED transition is older than the cut-off (FR-C6 auto-close). */
    @Query(value = """
            select c.id from complaints c
            where c.status = 'RESOLVED'
              and (select max(h.created_at) from complaint_status_history h
                   where h.complaint_id = c.id and h.to_status = 'RESOLVED') < :cutoff
            """, nativeQuery = true)
    List<Long> findResolvedBefore(Instant cutoff);
}
