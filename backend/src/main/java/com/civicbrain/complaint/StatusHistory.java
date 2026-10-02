package com.civicbrain.complaint;

import jakarta.persistence.*;
import java.time.Instant;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "complaint_status_history")
@Getter @Setter
public class StatusHistory {
    public enum ActorType { CITIZEN, STAFF, SYSTEM }

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    private Long complaintId;
    @Enumerated(EnumType.STRING)
    private ComplaintStatus fromStatus;
    @Enumerated(EnumType.STRING)
    private ComplaintStatus toStatus;
    @Enumerated(EnumType.STRING)
    private ActorType actorType;
    private Long actorId;
    private String note;
    private Instant createdAt = Instant.now();
}
