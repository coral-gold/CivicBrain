package com.civicbrain.complaint;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ComplaintMediaRepository extends JpaRepository<ComplaintMedia, Long> {
    List<ComplaintMedia> findByComplaintIdOrderByIdAsc(Long complaintId);
}
