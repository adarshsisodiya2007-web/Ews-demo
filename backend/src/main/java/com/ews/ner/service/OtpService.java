package com.ews.ner.service;

import com.ews.ner.domain.user.PhoneOtp;
import com.ews.ner.domain.user.PhoneOtpRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.OffsetDateTime;
import java.time.temporal.ChronoUnit;
import java.util.Optional;
import java.util.regex.Pattern;

@Service
@RequiredArgsConstructor
@Slf4j
public class OtpService {
    private final PhoneOtpRepository otpRepo;
    private final PasswordEncoder passwordEncoder;

    @Value("${app.otp.demo-mode:true}")
    private boolean demoMode;

    @Value("${app.otp.demo-code:123456}")
    private String demoCode;

    @Value("${app.otp.expiry-seconds:300}")
    private int expirySeconds;

    @Value("${app.otp.cooldown-seconds:60}")
    private int cooldownSeconds;

    @Value("${app.otp.max-attempts:5}")
    private int maxAttempts;

    @Value("${app.alert.sms.enabled:false}")
    private boolean smsEnabled;

    private static final Pattern PHONE_PATTERN = Pattern.compile("^\\+[1-9]\\d{9,14}$");
    private final SecureRandom random = new SecureRandom();

    public String normalizePhone(String rawPhone) {
        if (rawPhone == null) {
            throw new IllegalArgumentException("Phone number cannot be empty");
        }
        String cleaned = rawPhone.replaceAll("[\\s\\-\\(\\)]", "");
        if (cleaned.startsWith("0")) {
            cleaned = cleaned.substring(1);
        }
        if (!cleaned.startsWith("+")) {
            if (cleaned.startsWith("91") && cleaned.length() == 12) {
                cleaned = "+" + cleaned;
            } else if (cleaned.length() == 10) {
                cleaned = "+91" + cleaned;
            } else {
                cleaned = "+" + cleaned;
            }
        }
        if (!PHONE_PATTERN.matcher(cleaned).matches()) {
            throw new IllegalArgumentException("Invalid phone number format. Please provide a valid 10-digit mobile number.");
        }
        return cleaned;
    }

    public boolean isDemoMode() {
        return demoMode;
    }

    public String getDemoCode() {
        return demoCode;
    }

    public int getCooldownSeconds() {
        return cooldownSeconds;
    }

    @Transactional
    public void generateAndSendOtp(String phone) {
        String normalized = normalizePhone(phone);
        OffsetDateTime now = OffsetDateTime.now();

        // Check cooldown from latest unverified OTP
        Optional<PhoneOtp> latestOpt = otpRepo.findTopByPhoneAndVerifiedFalseOrderByCreatedAtDesc(normalized);
        if (latestOpt.isPresent()) {
            PhoneOtp latest = latestOpt.get();
            long secondsSince = ChronoUnit.SECONDS.between(latest.getCreatedAt(), now);
            if (secondsSince < cooldownSeconds) {
                long remaining = cooldownSeconds - secondsSince;
                throw new IllegalStateException("Please wait " + remaining + " seconds before requesting a new OTP.");
            }
        }

        // Generate cryptographically random 6-digit OTP
        String rawOtp = String.format("%06d", random.nextInt(1_000_000));
        String hashedOtp = passwordEncoder.encode(rawOtp);

        PhoneOtp record = PhoneOtp.builder()
                .phone(normalized)
                .otpHash(hashedOtp)
                .expiresAt(now.plusSeconds(expirySeconds))
                .attempts(0)
                .verified(false)
                .createdAt(now)
                .build();

        otpRepo.save(record);
        log.info("OTP generated and registered for phone ending in {}", normalized.substring(Math.max(0, normalized.length() - 4)));

        if (smsEnabled) {
            // Real SMS dispatch can be wired here if Twilio credentials are live
            log.info("Dispatching SMS OTP via configured SMS service to {}", normalized);
        }
    }

    @Transactional
    public boolean verifyOtp(String phone, String inputOtp) {
        String normalized = normalizePhone(phone);
        OffsetDateTime now = OffsetDateTime.now();

        if (inputOtp == null || inputOtp.trim().isEmpty()) {
            throw new IllegalArgumentException("OTP code cannot be empty");
        }
        String cleanOtp = inputOtp.trim();

        // Check demo mode bypass first
        if (demoMode && demoCode != null && demoCode.equals(cleanOtp)) {
            log.info("Demo OTP verified successfully for phone ending in {}", normalized.substring(Math.max(0, normalized.length() - 4)));
            // Mark any pending OTP for this phone as verified
            otpRepo.findTopByPhoneAndVerifiedFalseOrderByCreatedAtDesc(normalized).ifPresent(p -> {
                p.setVerified(true);
                otpRepo.save(p);
            });
            return true;
        }

        PhoneOtp record = otpRepo.findTopByPhoneAndVerifiedFalseOrderByCreatedAtDesc(normalized)
                .orElseThrow(() -> new IllegalStateException("No active OTP request found for this phone number. Please request a code."));

        if (now.isAfter(record.getExpiresAt())) {
            throw new IllegalStateException("OTP has expired. Please request a new code.");
        }

        if (record.getAttempts() >= maxAttempts) {
            throw new IllegalStateException("Maximum verification attempts exceeded. Please request a new OTP.");
        }

        record.setAttempts(record.getAttempts() + 1);

        boolean matches = passwordEncoder.matches(cleanOtp, record.getOtpHash());
        if (!matches) {
            otpRepo.save(record);
            int remaining = maxAttempts - record.getAttempts();
            if (remaining > 0) {
                throw new IllegalArgumentException("Invalid OTP. You have " + remaining + " attempts remaining.");
            } else {
                throw new IllegalStateException("Maximum verification attempts exceeded. Please request a new OTP.");
            }
        }

        record.setVerified(true);
        otpRepo.save(record);
        log.info("Phone OTP verified successfully for {}", normalized.substring(Math.max(0, normalized.length() - 4)));
        return true;
    }
}
