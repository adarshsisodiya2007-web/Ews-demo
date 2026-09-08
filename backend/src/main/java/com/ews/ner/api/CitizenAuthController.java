package com.ews.ner.api;

import com.ews.ner.api.dto.*;
import com.ews.ner.config.JwtUtil;
import com.ews.ner.domain.user.*;
import com.ews.ner.infra.sms.SmsGatewayService;
import com.ews.ner.service.OtpService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
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
    private final SmsGatewayService smsGateway;
    private final AppUserRepository userRepo;
    private final CitizenProfileRepository profileRepo;
    private final JwtUtil jwtUtil;

    @GetMapping({"/sms-status", "/citizen/sms-status"})
    public ResponseEntity<?> getSmsStatus() {
        return ResponseEntity.ok(smsGateway.getSafeStatus());
    }

    @PostMapping("/citizen/send-otp")
    public ResponseEntity<?> sendOtp(@Valid @RequestBody SendOtpRequest req) {
        String normalizedPhone;
        try {
            normalizedPhone = otpService.normalizePhone(req.getPhone());
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Please enter a valid 10-digit Indian mobile number."));
        }

        try {
            otpService.generateAndSendOtp(normalizedPhone, "Your SATARK Citizen verification code is: %s. Valid for 5 minutes.");
        } catch (IllegalStateException e) {
            String msg = e.getMessage();
            if (msg != null && msg.contains("SMS service is currently unavailable")) {
                return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(Map.of("success", false, "message", "SMS service is currently unavailable. Please try again later."));
            }
            if (msg != null && msg.contains("Unable to send OTP right now")) {
                return ResponseEntity.status(HttpStatus.BAD_GATEWAY).body(Map.of("success", false, "message", "Unable to send OTP right now. Please try again."));
            }
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS).body(Map.of("success", false, "message", e.getMessage()));
        }

        boolean isDemo = otpService.isDemoMode() && otpService.isDemoPhone(normalizedPhone);

        return ResponseEntity.ok(SendOtpResponse.builder()
                .success(true)
                .message("OTP sent to your mobile number.")
                .demoMode(isDemo)
                .demoOtp(isDemo ? otpService.getDemoCode() : null)
                .cooldownSeconds(otpService.getCooldownSeconds())
                .build());
    }

    @PostMapping("/citizen/register")
    public ResponseEntity<?> registerCitizen(@Valid @RequestBody SendOtpRequest req) {
        String normalizedPhone;
        try {
            normalizedPhone = otpService.normalizePhone(req.getPhone());
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Please enter a valid 10-digit Indian mobile number."));
        }

        Optional<AppUser> existing = userRepo.findByPhone(normalizedPhone)
                .or(() -> userRepo.findByUsername(normalizedPhone));
        if (existing.isPresent()) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of(
                    "success", false,
                    "message", "This phone number is already registered. Please sign in."
            ));
        }

        AppUser newUser = AppUser.builder()
                .username(normalizedPhone)
                .phone(normalizedPhone)
                .role(AppUser.UserRole.CITIZEN)
                .languagePref("en")
                .active(true)
                .createdAt(OffsetDateTime.now())
                .build();
        userRepo.save(newUser);
        log.info("New citizen registered with phone ending in: {}", normalizedPhone.substring(Math.max(0, normalizedPhone.length() - 4)));

        try {
            otpService.generateAndSendOtp(normalizedPhone, "Your SATARK Citizen verification code is: %s. Valid for 5 minutes.");
        } catch (IllegalStateException e) {
            String msg = e.getMessage();
            if (msg != null && msg.contains("SMS service is currently unavailable")) {
                return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(Map.of("success", false, "message", "SMS service is currently unavailable. Please try again later."));
            }
            if (msg != null && msg.contains("Unable to send OTP right now")) {
                return ResponseEntity.status(HttpStatus.BAD_GATEWAY).body(Map.of("success", false, "message", "Unable to send OTP right now. Please try again."));
            }
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS).body(Map.of("success", false, "message", e.getMessage()));
        }

        boolean isDemo = otpService.isDemoMode() && otpService.isDemoPhone(normalizedPhone);

        return ResponseEntity.ok(SendOtpResponse.builder()
                .success(true)
                .message("OTP sent to your mobile number.")
                .demoMode(isDemo)
                .demoOtp(isDemo ? otpService.getDemoCode() : null)
                .cooldownSeconds(otpService.getCooldownSeconds())
                .build());
    }

    @PostMapping("/citizen/verify-otp")
    public ResponseEntity<?> verifyOtp(@Valid @RequestBody VerifyOtpRequest req) {
        String normalizedPhone;
        try {
            normalizedPhone = otpService.normalizePhone(req.getPhone());
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Please enter a valid 10-digit Indian mobile number."));
        }

        try {
            otpService.verifyOtp(normalizedPhone, req.getOtp());
        } catch (IllegalArgumentException | IllegalStateException e) {
            String msg = e.getMessage();
            if (msg != null && msg.contains("expired")) {
                return ResponseEntity.badRequest().body(Map.of("success", false, "message", "OTP expired. Please request a new OTP."));
            }
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Incorrect OTP. Please try again."));
        }

        // Automatic self-registration / first-login: ensure citizen user exists
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
                    log.info("Self-registering new citizen with phone ending in: {}", normalizedPhone.substring(Math.max(0, normalizedPhone.length() - 4)));
                    return userRepo.save(newUser);
                });

        String token = jwtUtil.generateToken(user.getUsername(), user.getRole().name());
        Optional<CitizenProfile> profileOpt = profileRepo.findByUserId(user.getId());

        CitizenProfileDTO profileDTO = profileOpt.map(p -> CitizenProfileDTO.builder()
                .id(p.getId())
                .userId(p.getUserId())
                .fullName(p.getFullName())
                .phone(user.getPhone())
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
