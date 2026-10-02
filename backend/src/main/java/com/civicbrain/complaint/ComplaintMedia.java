package com.civicbrain.complaint;

import jakarta.persistence.*;
import java.time.Instant;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "complaint_media")
@Getter @Setter
public class ComplaintMedia {
    public enum Kind { BEFORE, AFTER, REOPEN }

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    private Long complaintId;
    @Enumerated(EnumType.STRING)
    private Kind kind;
    private String storageKey;
    private String mime;
    private int sizeBytes;
    private Integer width;
    private Integer height;
    private Instant createdAt = Instant.now();
}
