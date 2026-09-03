package com.ews.ner.api.dto;

import com.ews.ner.domain.user.AppUser.UserRole;
import lombok.Builder;
import lombok.Data;
import java.time.OffsetDateTime;

@Data
@Builder
public class LoginResponse {
    private String token;
    private String username;
    private UserRole role;
    private String district;
    private String languagePref;
    private OffsetDateTime expiresAt;
}
