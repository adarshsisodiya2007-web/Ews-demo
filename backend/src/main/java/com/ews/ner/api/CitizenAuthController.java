package com.ews.ner.api;

import com.ews.ner.api.dto.*;
import com.ews.ner.config.JwtUtil;
import com.ews.ner.domain.user.*;
import com.ews.ner.service.OtpService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.OffsetDateTime;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
@Slf4j
public class CitizenAuthController {
    private final OtpService otpService;
    private final AppUserRepository userRepo;
    private final CitizenProfileRepository profileRepo;
    private final JwtUtil jwtUtil;

    @PostMapping("/citizen/send-otp")
    public ResponseEntity<SendOtpResponse> sendOtp(@Valid @RequestBody SendOtpRequest req) {
        otpService.generateAndSendOtp(req.getPhone());
        return ResponseEntity.ok(SendOtpResponse.builder()
                .success(true)
                .message("OTP sent successfully to your phone number.")
                .demoMode(otpService.isDemoMode())
                .demoOtp(otpService.isDemoMode() ? otpService.getDemoCode() : null)
                .cooldownSeconds(otpService.getCooldownSeconds())
                .build());
    }

    @PostMapping("/citizen/verify-otp")
    public ResponseEntity<CitizenAuthResponse> verifyOtp(@Valid @RequestBody VerifyOtpRequest req) {
        otpService.verifyOtp(req.getPhone(), req.getOtp());
        String normalizedPhone = otpService.normalizePhone(req.getPhone());

        // Find existing citizen user or create new citizen account
        AppUser user = userRepo.findByPhone(normalizedPhone)
                .or(() -> userRepo.findByUsername(normalizedPhone))
                .orElseGet(() -> {
                    AppUser newUser = AppUser.builder()
                            .username(normalizedPhone)
                            .phone(normalizedPhone)
                            .role(AppUser.UserRole.CITIZEN)
                            .languagePref("en")
                            .active(true)
                            .createdAt(OffsetDateTime.now())
                            .build();
                    return userRepo.save(newUser);
                });

        if (user.getPhone() == null) {
            user.setPhone(normalizedPhone);
            user = userRepo.save(user);
        }

        final AppUser finalUser = user;
        String token = jwtUtil.generateToken(finalUser.getUsername(), finalUser.getRole().name());
        Optional<CitizenProfile> profileOpt = profileRepo.findByUserId(finalUser.getId());

        CitizenProfileDTO profileDTO = profileOpt.map(p -> CitizenProfileDTO.builder()
                .id(p.getId())
                .userId(p.getUserId())
                .fullName(p.getFullName())
                .phone(finalUser.getPhone())
                .gender(p.getGender())
                .ageGroup(p.getAgeGroup())
                .preferredLanguage(p.getPreferredLanguage())
                .bloodGroup(p.getBloodGroup())
                .emergencyContactName(p.getEmergencyContactName())
                .emergencyContactPhone(p.getEmergencyContactPhone())
                .accessibilityNeeds(p.getAccessibilityNeeds())
                .createdAt(p.getCreatedAt())
                .updatedAt(p.getUpdatedAt())
                .build()).orElse(null);

        return ResponseEntity.ok(CitizenAuthResponse.builder()
                .token(token)
                .user(CitizenAuthResponse.UserSummary.builder()
                        .id(user.getId())
                        .username(user.getUsername())
                        .phone(user.getPhone())
                        .role(user.getRole().name())
                        .build())
                .profileExists(profileOpt.isPresent())
                .profile(profileDTO)
                .build());
    }

    @PostMapping("/logout")
    public ResponseEntity<?> logout() {
        return ResponseEntity.ok(Map.of("success", true, "message", "Logged out successfully"));
    }
}
