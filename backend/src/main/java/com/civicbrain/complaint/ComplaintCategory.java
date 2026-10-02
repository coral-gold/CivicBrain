package com.civicbrain.complaint;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "complaint_categories")
@Getter @Setter
public class ComplaintCategory {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    private String code;
    private String nameEn;
    private String nameMr;
    private String nameHi;
    private int slaHours;
    private boolean active = true;
}
