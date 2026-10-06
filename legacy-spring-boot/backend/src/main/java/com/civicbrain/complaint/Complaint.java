package com.civicbrain.complaint;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;
import lombok.Getter;
import lombok.Setter;

/**
 * The PostGIS {@code location} column is deliberately not mapped: it is written and queried with SQL
 * (see {@link ComplaintGeoRepository}); everything else is plain JPA.
 */
@Entity
@Table(name = "complaints")
@Getter @Setter
public class Complaint {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    private Long citizenId;
    private Long wardId;
    private Long categoryId;
    private String description;
    private String address;
    @Enumerated(EnumType.STRING)
    private ComplaintStatus status = ComplaintStatus.SUBMITTED;
    private BigDecimal priorityScore;
    private Long mergedIntoId;
    private int meTooCount;
    private boolean outOfWard;
    private Instant createdAt = Instant.now();
    private Instant updatedAt = Instant.now();
}
