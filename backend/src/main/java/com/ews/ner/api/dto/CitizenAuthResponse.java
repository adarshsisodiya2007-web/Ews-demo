package com.ews.ner.api.dto;

import lombok.*;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CitizenAuthResponse {
    private String token;
    private UserSummary user;
    private boolean profileExists;
    private CitizenProfileDTO profile;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class UserSummary {
        private UUID id;
        private String username;
        private String phone;
        private String role;
    }
}
