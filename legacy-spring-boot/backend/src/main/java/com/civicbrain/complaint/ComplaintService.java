package com.civicbrain.complaint;

import com.civicbrain.admin.Role;
import com.civicbrain.citizen.Citizen;
import com.civicbrain.citizen.CitizenRepository;
import com.civicbrain.common.ApiException;
import com.civicbrain.common.PageResponse;
import com.civicbrain.complaint.ComplaintDtos.*;
import com.civicbrain.complaint.ComplaintMedia.Kind;
import com.civicbrain.complaint.StatusHistory.ActorType;
import com.civicbrain.security.AuthPrincipal;
import com.civicbrain.storage.FileStorage;
import com.civicbrain.storage.ImageProcessor;
import com.civicbrain.storage.ProcessedImage;
import com.civicbrain.storage.SignedUrlService;
import com.civicbrain.ward.WardService;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.multipart.MultipartFile;

@Service
public class ComplaintService {
    public static final int MAX_PER_DAY = 10;          // FR-C8
    public static final int MAX_IMAGES = 3;            // FR-C1
    public static final double DUPLICATE_RADIUS_M = 150;  // FR-C3
    public static final Duration REOPEN_WINDOW = Duration.ofDays(7);   // FR-C6

    private final ComplaintRepository complaints;
    private final ComplaintGeoRepository geo;
    private final ComplaintMediaRepository mediaRepo;
    private final StatusHistoryRepository historyRepo;
    private final ComplaintCategoryRepository categories;
    private final CitizenRepository citizens;
    private final WardService wards;
    private final ImageProcessor images;
    private final FileStorage storage;
    private final SignedUrlService signer;
    private final ApplicationEventPublisher events;
    private final Clock clock;
    private final TransactionTemplate tx;

    public ComplaintService(ComplaintRepository complaints, ComplaintGeoRepository geo, ComplaintMediaRepository mediaRepo,
                            StatusHistoryRepository historyRepo, ComplaintCategoryRepository categories,
                            CitizenRepository citizens, WardService wards, ImageProcessor images, FileStorage storage,
                            SignedUrlService signer, ApplicationEventPublisher events, Clock clock,
                            PlatformTransactionManager txManager) {
        this.complaints = complaints;
        this.geo = geo;
        this.mediaRepo = mediaRepo;
        this.historyRepo = historyRepo;
        this.categories = categories;
        this.citizens = citizens;
        this.wards = wards;
        this.images = images;
        this.storage = storage;
        this.signer = signer;
        this.events = events;
        this.clock = clock;
        this.tx = new TransactionTemplate(txManager);
    }

    // ------------------------------------------------------------------ citizen: create

    public CreatedResponse create(long citizenId, CreateComplaintRequest req, List<MultipartFile> files) {
        if (files == null || files.isEmpty() || files.size() > MAX_IMAGES) {
            throw ApiException.validation("images", "Attach 1 to " + MAX_IMAGES + " photos.");
        }
        Citizen citizen = citizens.findById(citizenId).orElseThrow(ApiException::notFound);
        if (complaints.countByCitizenIdAndCreatedAtAfter(citizenId, clock.instant().minus(Duration.ofDays(1))) >= MAX_PER_DAY) {
            throw new ApiException(HttpStatus.TOO_MANY_REQUESTS, "RATE_LIMITED",
                    "You can submit up to " + MAX_PER_DAY + " complaints per day.", null, 3600L);
        }
        Long categoryId = null;
        if (req.category() != null && !req.category().isBlank()) {
            categoryId = categories.findByCodeAndActiveTrue(req.category())
                    .orElseThrow(() -> ApiException.validation("category", "Unknown category")).getId();
        }
        // Validate + re-encode every image before touching the database.
        List<ProcessedImage> processed = new ArrayList<>();
        for (MultipartFile f : files) processed.add(images.process(f, "images"));

        // FR-C2: ward from GPS; fall back to the profile ward and flag the complaint.
        var byPoint = wards.findByPoint(req.lat(), req.lng());
        boolean outOfWard = byPoint.isEmpty();
        Long wardId = byPoint.map(WardService.WardRef::id)
                .orElseGet(() -> citizen.getWardNumber() == null ? null
                        : wards.findByNumber(citizen.getWardNumber()).map(WardService.WardRef::id).orElse(null));

        List<String> storedKeys = new ArrayList<>();
        final Long catId = categoryId;
        try {
            long id = tx.execute(status -> {
                long newId = geo.insert(citizenId, wardId, catId, req.description().trim(),
                        req.address() == null ? null : req.address().trim(), req.lat(), req.lng(), outOfWard);
                for (ProcessedImage img : processed) storedKeys.add(saveMedia(newId, Kind.BEFORE, img));
                addHistory(newId, null, ComplaintStatus.SUBMITTED, ActorType.CITIZEN, citizenId, null);
                events.publishEvent(new ComplaintSubmittedEvent(newId));   // delivered AFTER_COMMIT
                return newId;
            });
            return new CreatedResponse(id, ComplaintStatus.SUBMITTED.name(), outOfWard);
        } catch (RuntimeException e) {
            storedKeys.forEach(k -> { try { storage.delete(k); } catch (RuntimeException ignored) { } });
            throw e;
        }
    }

    private String saveMedia(long complaintId, Kind kind, ProcessedImage img) {
        String key = UUID.randomUUID().toString().replace("-", "") + ".jpg";
        storage.put(key, img.bytes());
        var m = new ComplaintMedia();
        m.setComplaintId(complaintId);
        m.setKind(kind);
        m.setStorageKey(key);
        m.setMime(img.mime());
        m.setSizeBytes(img.bytes().length);
        m.setWidth(img.width());
        m.setHeight(img.height());
        mediaRepo.save(m);
        return key;
    }

    // ------------------------------------------------------------------ citizen: read

    @Transactional(readOnly = true)
    public PageResponse<ComplaintSummary> listForCitizen(long citizenId, ComplaintStatus status, int page, int size) {
        Page<Complaint> p = complaints.findForCitizen(citizenId, status,
                PageRequest.of(Math.max(page, 0), clampSize(size), Sort.by(Sort.Direction.DESC, "createdAt", "id")));
        Map<Long, ComplaintCategory> cats = categoriesById();
        return PageResponse.of(p, c -> new ComplaintSummary(c.getId(), c.getStatus().name(), catRef(cats, c.getCategoryId()),
                c.getDescription(), c.getAddress(), c.getMeTooCount(), c.getCreatedAt()));
    }

    @Transactional(readOnly = true)
    public ComplaintDetail detailForCitizen(long citizenId, long id) {
        Complaint c = owned(citizenId, id);
        var ll = geo.latLng(id).orElseThrow(ApiException::notFound);
        Instant reopenUntil = null;
        boolean canConfirm = false;
        if (c.getStatus() == ComplaintStatus.RESOLVED) {
            canConfirm = true;
            reopenUntil = historyRepo.lastResolvedAt(id).map(t -> t.plus(REOPEN_WINDOW)).orElse(null);
        }
        return new ComplaintDetail(c.getId(), c.getStatus().name(), catRef(categoriesById(), c.getCategoryId()),
                c.getDescription(), c.getAddress(), ll.lat(), ll.lng(), c.getMeTooCount(), c.isOutOfWard(),
                c.getCreatedAt(), c.getUpdatedAt(), imageDtos(id), historyDtos(id), canConfirm, reopenUntil);
    }

    @Transactional(readOnly = true)
    public List<NearbyDto> nearby(long citizenId, double lat, double lng, String category) {
        if (lat < -90 || lat > 90) throw ApiException.validation("lat", "Invalid latitude");
        if (lng < -180 || lng > 180) throw ApiException.validation("lng", "Invalid longitude");
        return geo.nearby(lat, lng, DUPLICATE_RADIUS_M, category == null || category.isBlank() ? null : category, citizenId)
                .stream().map(n -> new NearbyDto(n.id(), n.description(), n.address(), n.status(), n.categoryCode(),
                        n.meTooCount(), Math.round(n.distanceM()), n.createdAt(), n.alreadyMeToo())).toList();
    }

    // ------------------------------------------------------------------ citizen: actions

    @Transactional
    public MeTooResponse meToo(long citizenId, long id) {
        Complaint c = complaints.findById(id).orElseThrow(ApiException::notFound);
        if (c.getCitizenId() == citizenId) {
            throw new ApiException(HttpStatus.CONFLICT, "CONFLICT", "You can't add \"me too\" to your own complaint.");
        }
        if (!c.getStatus().isOpen()) {
            throw new ApiException(HttpStatus.CONFLICT, "CONFLICT", "This complaint is no longer open.");
        }
        if (!geo.addMeToo(id, citizenId)) {
            throw new ApiException(HttpStatus.CONFLICT, "CONFLICT", "You have already added \"me too\".");
        }
        return new MeTooResponse(geo.meTooCount(id));
    }

    @Transactional
    public void confirm(long citizenId, long id) {
        transition(owned(citizenId, id), ComplaintStatus.CLOSED, ActorType.CITIZEN, citizenId, "Citizen confirmed the fix");
    }

    public void reopen(long citizenId, long id, String reason, MultipartFile image) {
        Complaint c = owned(citizenId, id);
        if (c.getStatus() != ComplaintStatus.RESOLVED) throw illegal(c.getStatus(), ComplaintStatus.REOPENED);
        Instant resolvedAt = historyRepo.lastResolvedAt(id).orElse(c.getUpdatedAt());
        if (clock.instant().isAfter(resolvedAt.plus(REOPEN_WINDOW))) {
            throw new ApiException(HttpStatus.CONFLICT, "REOPEN_WINDOW_CLOSED",
                    "The 7-day window to reopen this complaint has passed. Please file a new complaint.");
        }
        ProcessedImage img = images.process(image, "image");
        String[] key = new String[1];
        try {
            tx.executeWithoutResult(s -> {
                Complaint fresh = complaints.findById(id).orElseThrow(ApiException::notFound);
                key[0] = saveMedia(id, Kind.REOPEN, img);
                transition(fresh, ComplaintStatus.REOPENED, ActorType.CITIZEN, citizenId, reason.trim());
            });
        } catch (RuntimeException e) {
            if (key[0] != null) storage.delete(key[0]);
            throw e;
        }
    }

    /** FR-C6: RESOLVED complaints are closed automatically 7 days after resolution. */
    @Transactional
    public int autoCloseResolved() {
        List<Long> ids = complaints.findResolvedBefore(clock.instant().minus(REOPEN_WINDOW));
        for (Long id : ids) {
            transition(complaints.findById(id).orElseThrow(), ComplaintStatus.CLOSED, ActorType.SYSTEM, null,
                    "Auto-closed 7 days after resolution");
        }
        return ids.size();
    }

    // ------------------------------------------------------------------ staff

    @Transactional(readOnly = true)
    public PageResponse<StaffSummary> listForStaff(AuthPrincipal who, Integer wardNumber, ComplaintStatus status,
                                                   String categoryCode, String sort, int page, int size) {
        Integer effectiveWard = wardNumber;
        if (who.role() == Role.OFFICER) {
            if (who.assignedWardNumber() == null || (wardNumber != null && !wardNumber.equals(who.assignedWardNumber()))) {
                throw new ApiException(HttpStatus.FORBIDDEN, "FORBIDDEN", "You can only view your assigned ward.");
            }
            effectiveWard = who.assignedWardNumber();   // enforced here, not in the controller
        }
        Long wardId = null;
        if (effectiveWard != null) {
            var w = wards.findByNumber(effectiveWard);
            if (w.isEmpty()) return new PageResponse<>(List.of(), page, clampSize(size), 0);
            wardId = w.get().id();
        }
        Long categoryId = null;
        if (categoryCode != null && !categoryCode.isBlank()) {
            var cat = categories.findAll().stream().filter(c -> c.getCode().equals(categoryCode)).findFirst();
            if (cat.isEmpty()) return new PageResponse<>(List.of(), page, clampSize(size), 0);
            categoryId = cat.get().getId();
        }
        PageRequest pr = PageRequest.of(Math.max(page, 0), clampSize(size));
        Page<Complaint> p = "newest".equals(sort)
                ? complaints.findForStaffNewest(wardId, status, categoryId, pr)
                : complaints.findForStaffByPriority(wardId, status, categoryId, pr);
        Map<Long, ComplaintCategory> cats = categoriesById();
        Map<Long, Integer> wardNumbers = wardNumbersById();
        return PageResponse.of(p, c -> staffSummary(c, cats, wardNumbers));
    }

    @Transactional(readOnly = true)
    public StaffDetail detailForStaff(AuthPrincipal who, long id) {
        Complaint c = complaints.findById(id).orElseThrow(ApiException::notFound);
        if (who.role() == Role.OFFICER) {
            Long officerWard = who.assignedWardNumber() == null ? null
                    : wards.findByNumber(who.assignedWardNumber()).map(WardService.WardRef::id).orElse(null);
            if (officerWard == null || !officerWard.equals(c.getWardId())) throw ApiException.notFound();   // no existence leak
        }
        var ll = geo.latLng(id).orElseThrow(ApiException::notFound);
        CitizenRef citizen = citizens.findById(c.getCitizenId()).map(CitizenRef::of).orElse(null);
        return new StaffDetail(staffSummary(c, categoriesById(), wardNumbersById()), citizen, ll.lat(), ll.lng(),
                imageDtos(id), historyDtos(id));
    }

    // ------------------------------------------------------------------ state machine

    /** Applies a legal transition and records it; illegal ones are a 409 INVALID_TRANSITION (SRS §5.2). */
    public void transition(Complaint c, ComplaintStatus to, ActorType actor, Long actorId, String note) {
        ComplaintStatus from = c.getStatus();
        if (!from.canMoveTo(to)) throw illegal(from, to);
        if (to == ComplaintStatus.REJECTED && (note == null || note.isBlank())) {
            throw ApiException.validation("note", "A reason is mandatory when rejecting a complaint.");
        }
        c.setStatus(to);
        c.setUpdatedAt(clock.instant());
        complaints.save(c);
        addHistory(c.getId(), from, to, actor, actorId, note);
    }

    private static ApiException illegal(ComplaintStatus from, ComplaintStatus to) {
        return new ApiException(HttpStatus.CONFLICT, "INVALID_TRANSITION",
                "A complaint that is " + from + " cannot move to " + to + ".");
    }

    private void addHistory(long complaintId, ComplaintStatus from, ComplaintStatus to, ActorType type, Long actorId, String note) {
        var h = new StatusHistory();
        h.setComplaintId(complaintId);
        h.setFromStatus(from);
        h.setToStatus(to);
        h.setActorType(type);
        h.setActorId(actorId);
        h.setNote(note == null ? null : note.substring(0, Math.min(note.length(), 500)));
        h.setCreatedAt(clock.instant());
        historyRepo.save(h);
    }

    // ------------------------------------------------------------------ helpers

    /** Owner-only lookup. A foreign id is indistinguishable from a missing one (IDOR defence, NFR-S2). */
    private Complaint owned(long citizenId, long id) {
        return complaints.findById(id).filter(c -> c.getCitizenId() == citizenId).orElseThrow(ApiException::notFound);
    }

    private static int clampSize(int size) { return Math.min(Math.max(size, 1), 50); }

    private Map<Long, ComplaintCategory> categoriesById() {
        Map<Long, ComplaintCategory> m = new HashMap<>();
        categories.findAll().forEach(c -> m.put(c.getId(), c));
        return m;
    }

    private Map<Long, Integer> wardNumbersById() {
        Map<Long, Integer> m = new HashMap<>();
        wards.list().forEach(w -> m.put(w.id(), w.number()));
        return m;
    }

    private static CategoryRef catRef(Map<Long, ComplaintCategory> cats, Long id) {
        var c = id == null ? null : cats.get(id);
        return c == null ? null : new CategoryRef(c.getCode(), c.getNameEn());
    }

    private StaffSummary staffSummary(Complaint c, Map<Long, ComplaintCategory> cats, Map<Long, Integer> wardNumbers) {
        return new StaffSummary(c.getId(), c.getStatus().name(), catRef(cats, c.getCategoryId()), c.getDescription(),
                c.getAddress(), c.getWardId() == null ? null : wardNumbers.get(c.getWardId()), c.getPriorityScore(),
                c.getMeTooCount(), c.isOutOfWard(), c.getCreatedAt());
    }

    private List<ImageDto> imageDtos(long id) {
        return mediaRepo.findByComplaintIdOrderByIdAsc(id).stream()
                .map(m -> new ImageDto(m.getId(), m.getKind().name(), signer.urlFor(m.getStorageKey()))).toList();
    }

    private List<HistoryDto> historyDtos(long id) {
        return historyRepo.findByComplaintIdOrderByCreatedAtAscIdAsc(id).stream()
                .map(h -> new HistoryDto(h.getFromStatus() == null ? null : h.getFromStatus().name(),
                        h.getToStatus().name(), h.getActorType().name(), h.getNote(), h.getCreatedAt())).toList();
    }
}
