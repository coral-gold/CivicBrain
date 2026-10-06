package com.civicbrain.complaint;

import java.util.EnumSet;
import java.util.Set;

/** SRS §5.2 state machine. {@link #canMoveTo} is the single source of truth for legal transitions. */
public enum ComplaintStatus {
    SUBMITTED, ANALYZED, PLANNED, APPROVED, SCHEDULED, IN_PROGRESS, RESOLVED, CLOSED, REOPENED, MERGED, REJECTED;

    public Set<ComplaintStatus> next() {
        return switch (this) {
            // SUBMITTED -> PLANNED lets an officer proceed manually when the AI pipeline failed (FR-AI7)
            case SUBMITTED -> EnumSet.of(ANALYZED, PLANNED, MERGED, REJECTED);
            case ANALYZED -> EnumSet.of(PLANNED, MERGED, REJECTED);
            case PLANNED -> EnumSet.of(APPROVED, MERGED, REJECTED);
            case APPROVED -> EnumSet.of(SCHEDULED);
            case SCHEDULED -> EnumSet.of(IN_PROGRESS);
            case IN_PROGRESS -> EnumSet.of(RESOLVED);
            case RESOLVED -> EnumSet.of(CLOSED, REOPENED);
            case REOPENED -> EnumSet.of(PLANNED);
            case CLOSED, MERGED, REJECTED -> EnumSet.noneOf(ComplaintStatus.class);
        };
    }

    public boolean canMoveTo(ComplaintStatus to) { return next().contains(to); }

    /** Statuses in which a complaint is still "live" for duplicate checks and "me too". */
    public boolean isOpen() {
        return this != CLOSED && this != MERGED && this != REJECTED && this != RESOLVED;
    }
}
