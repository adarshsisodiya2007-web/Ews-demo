package com.ews.ner.api.dto;

import lombok.*;
import java.time.OffsetDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CitizenProfileDTO {
    private UUID id;
    private UUID userId;
    private String fullName;
    private String phone;
    private String gender;
    private String ageGroup;
    private String preferredLanguage;
    private String bloodGroup;
    private String emergencyContactName;
    private String emergencyContactPhone;
    private String accessibilityNeeds;
    private OffsetDateTime createdAt;
    private OffsetDateTime updatedAt;
}
