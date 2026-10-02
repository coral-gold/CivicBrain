package com.civicbrain.complaint;

import com.civicbrain.common.PageResponse;
import com.civicbrain.complaint.ComplaintDtos.*;
import com.civicbrain.security.AuthPrincipal;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

/** Read side of the officer queue; ward scoping is enforced in {@link ComplaintService} (NFR-S2). */
@RestController
@RequestMapping("/api/admin/complaints")
public class AdminComplaintController {
    private final ComplaintService service;

    public AdminComplaintController(ComplaintService service) { this.service = service; }

    @GetMapping
    public PageResponse<StaffSummary> list(@AuthenticationPrincipal AuthPrincipal me,
                                           @RequestParam(required = false) Integer ward,
                                           @RequestParam(required = false) ComplaintStatus status,
                                           @RequestParam(required = false) String category,
                                           @RequestParam(defaultValue = "priority") String sort,
                                           @RequestParam(defaultValue = "0") int page,
                                           @RequestParam(defaultValue = "20") int size) {
        return service.listForStaff(me, ward, status, category, sort, page, size);
    }

    @GetMapping("/{id}")
    public StaffDetail detail(@AuthenticationPrincipal AuthPrincipal me, @PathVariable long id) {
        return service.detailForStaff(me, id);
    }
}
