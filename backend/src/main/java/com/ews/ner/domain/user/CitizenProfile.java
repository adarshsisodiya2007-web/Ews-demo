package com.ews.ner.domain.user;

import jakarta.persistence.*;
import lombok.*;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "citizen_profile")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CitizenProfile {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "user_id", nullable = false, unique = true)
    private UUID userId;

    @Column(name = "full_name", nullable = false)
    private String fullName;

    private String gender;

    @Column(name = "age_group")
    private String ageGroup;

    @Builder.Default
    @Column(name = "preferred_language", nullable = false)
    private String preferredLanguage = "en";

    @Column(name = "blood_group")
    private String bloodGroup;

    @Column(name = "emergency_contact_name")
    private String emergencyContactName;

    @Column(name = "emergency_contact_phone")
    private String emergencyContactPhone;

    @Column(name = "accessibility_needs")
    private String accessibilityNeeds;

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) {
            createdAt = OffsetDateTime.now();
        }
        if (updatedAt == null) {
            updatedAt = OffsetDateTime.now();
        }
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = OffsetDateTime.now();
    }
}
