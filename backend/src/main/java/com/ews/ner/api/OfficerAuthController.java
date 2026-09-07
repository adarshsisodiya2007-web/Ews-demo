package com.ews.ner.api;

import com.ews.ner.api.dto.*;
import com.ews.ner.config.JwtUtil;
import com.ews.ner.domain.user.AppUser;
import com.ews.ner.domain.user.AppUserRepository;
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
@RequestMapping("/api/auth/officer")
@RequiredArgsConstructor
@Slf4j
public class OfficerAuthController {

    private final OtpService otpService;
    private final AppUserRepository userRepo;
    private final JwtUtil jwtUtil;

    @PostMapping("/send-otp")
    public ResponseEntity<?> sendOfficerOtp(@Valid @RequestBody SendOtpRequest req) {
        String normalizedPhone;
        try {
            normalizedPhone = otpService.normalizePhone(req.getPhone());
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Please enter a valid 10-digit Indian mobile number."));
        }

        // Validate that this phone number belongs to an authorized officer
        Optional<AppUser> officerOpt = userRepo.findByPhone(normalizedPhone);
        if (officerOpt.isEmpty() || officerOpt.get().getRole() == AppUser.UserRole.CITIZEN) {
            log.warn("Officer send-otp rejected: Phone ending in {} is not an authorized officer",
                    normalizedPhone.substring(Math.max(0, normalizedPhone.length() - 4)));
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of(
                    "success", false,
                    "authorized", false,
                    "message", "This number is not authorized for Officer access."
            ));
        }

        AppUser officer = officerOpt.get();
        if (!officer.isActive()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of(
                    "success", false,
                    "message", "This officer account has been deactivated. Please contact your district administrator."
            ));
        }

        try {
            otpService.generateAndSendOtp(normalizedPhone, "Your SATARK Officer Verification OTP is: %s. Valid for 5 minutes.");
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

    @PostMapping("/verify-otp")
    public ResponseEntity<?> verifyOfficerOtp(@Valid @RequestBody VerifyOtpRequest req) {
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

        AppUser officer = userRepo.findByPhone(normalizedPhone)
                .orElseThrow(() -> new IllegalStateException("Authorized officer account not found"));

        if (officer.getRole() == AppUser.UserRole.CITIZEN) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of(
                    "success", false,
                    "message", "This number is not authorized for Officer access."
            ));
        }

        if (!officer.isActive()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of(
                    "success", false,
                    "message", "Officer account is disabled."
            ));
        }

        String token = jwtUtil.generateToken(officer.getUsername(), officer.getRole().name());

        return ResponseEntity.ok(LoginResponse.builder()
                .token(token)
                .username(officer.getUsername())
                .role(officer.getRole())
                .district(officer.getDistrict())
                .languagePref(officer.getLanguagePref())
                .expiresAt(OffsetDateTime.now().plusHours(10))
                .build());
    }
}
