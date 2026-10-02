package com.civicbrain.complaint;

import com.civicbrain.common.ApiException;
import com.civicbrain.common.PageResponse;
import com.civicbrain.complaint.ComplaintDtos.*;
import com.civicbrain.security.AuthPrincipal;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/citizen/complaints")
public class CitizenComplaintController {
    private final ComplaintService service;

    public CitizenComplaintController(ComplaintService service) { this.service = service; }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    public CreatedResponse create(@AuthenticationPrincipal AuthPrincipal me,
                                  @RequestPart("data") @Valid CreateComplaintRequest data,
                                  @RequestPart(value = "images", required = false) List<MultipartFile> images) {
        return service.create(me.id(), data, images);
    }

    @GetMapping
    public PageResponse<ComplaintSummary> list(@AuthenticationPrincipal AuthPrincipal me,
                                               @RequestParam(required = false) ComplaintStatus status,
                                               @RequestParam(defaultValue = "0") int page,
                                               @RequestParam(defaultValue = "20") int size) {
        return service.listForCitizen(me.id(), status, page, size);
    }

    @GetMapping("/nearby")
    public List<NearbyDto> nearby(@AuthenticationPrincipal AuthPrincipal me, @RequestParam double lat,
                                  @RequestParam double lng, @RequestParam(required = false) String category) {
        return service.nearby(me.id(), lat, lng, category);
    }

    @GetMapping("/{id}")
    public ComplaintDetail detail(@AuthenticationPrincipal AuthPrincipal me, @PathVariable long id) {
        return service.detailForCitizen(me.id(), id);
    }

    @PostMapping("/{id}/me-too")
    public MeTooResponse meToo(@AuthenticationPrincipal AuthPrincipal me, @PathVariable long id) {
        return service.meToo(me.id(), id);
    }

    @PostMapping("/{id}/confirm")
    public ComplaintDetail confirm(@AuthenticationPrincipal AuthPrincipal me, @PathVariable long id) {
        service.confirm(me.id(), id);
        return service.detailForCitizen(me.id(), id);
    }

    @PostMapping(value = "/{id}/reopen", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ComplaintDetail reopen(@AuthenticationPrincipal AuthPrincipal me, @PathVariable long id,
                                  @RequestPart("data") @Valid ReopenRequest data,
                                  @RequestPart(value = "image", required = false) MultipartFile image) {
        if (image == null) throw ApiException.validation("image", "Attach a photo showing the problem.");
        service.reopen(me.id(), id, data.reason(), image);
        return service.detailForCitizen(me.id(), id);
    }
}
