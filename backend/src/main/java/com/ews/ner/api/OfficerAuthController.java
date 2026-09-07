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
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", e.getMessage()));
        }

        // Validate that this phone number belongs to an authorized officer
        Optional<AppUser> officerOpt = userRepo.findByPhone(normalizedPhone);
        if (officerOpt.isEmpty() || officerOpt.get().getRole() == AppUser.UserRole.CITIZEN) {
            log.warn("Officer send-otp rejected: Phone {} is not an authorized officer", normalizedPhone);
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of(
                    "success", false,
                    "authorized", false,
                    "message", "This mobile number is not registered as an authorized officer. Please check the number and try again."
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
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS).body(Map.of("success", false, "message", e.getMessage()));
        }

        return ResponseEntity.ok(SendOtpResponse.builder()
                .success(true)
                .message("Officer OTP sent successfully.")
                .demoMode(otpService.isDemoMode())
                .demoOtp(otpService.isDemoMode() ? otpService.getDemoCode() : null)
                .cooldownSeconds(otpService.getCooldownSeconds())
                .build());
    }

    @PostMapping("/verify-otp")
    public ResponseEntity<?> verifyOfficerOtp(@Valid @RequestBody VerifyOtpRequest req) {
        String normalizedPhone;
        try {
            normalizedPhone = otpService.normalizePhone(req.getPhone());
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", e.getMessage()));
        }

        try {
            otpService.verifyOtp(normalizedPhone, req.getOtp());
        } catch (IllegalArgumentException | IllegalStateException e) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", e.getMessage()));
        }

        AppUser officer = userRepo.findByPhone(normalizedPhone)
                .orElseThrow(() -> new IllegalStateException("Authorized officer account not found"));

        if (officer.getRole() == AppUser.UserRole.CITIZEN) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of(
                    "success", false,
                    "message", "Access denied. Mobile number is not mapped to an officer role."
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
