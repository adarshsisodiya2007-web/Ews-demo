package com.ews.ner.api.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class CitizenProfileRequest {
    @NotBlank(message = "Full name is required")
    private String fullName;

    private String gender;
    private String ageGroup;
    private String preferredLanguage;
    private String bloodGroup;
    private String emergencyContactName;
    private String emergencyContactPhone;
    private String accessibilityNeeds;
}
