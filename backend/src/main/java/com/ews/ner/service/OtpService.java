package com.ews.ner.service;

import com.ews.ner.domain.user.PhoneOtp;
import com.ews.ner.domain.user.PhoneOtpRepository;
import com.ews.ner.infra.sms.SmsGatewayService;
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
import java.util.Set;

@Service
@RequiredArgsConstructor
@Slf4j
public class OtpService {
    private final PhoneOtpRepository otpRepo;
    private final PasswordEncoder passwordEncoder;
    private final SmsGatewayService smsGateway;

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

    private static final Set<String> DEMO_PHONES = Set.of(
            "+919876543210", // Admin
            "+919876543211", // Kamrup Official
            "+919876543212", // EKH Official
            "+919876543213", // Aizawl Officer
            "+919876543214"  // Citizen Demo
    );

    private final SecureRandom random = new SecureRandom();

    /**
     * Normalizes Indian mobile number input safely to canonical +91XXXXXXXXXX.
     * Accepts: 9876543210, +919876543210, 919876543210, 09876543210, or with spaces/hyphens.
     */
    public String normalizePhone(String rawPhone) {
        if (rawPhone == null || rawPhone.trim().isEmpty()) {
            throw new IllegalArgumentException("Please enter a valid 10-digit Indian mobile number.");
        }
        String cleaned = rawPhone.trim().replaceAll("[\\s\\-\\(\\)]", "");
        if (cleaned.startsWith("+91")) {
            cleaned = cleaned.substring(3);
        } else if (cleaned.startsWith("91") && cleaned.length() == 12) {
            cleaned = cleaned.substring(2);
        } else if (cleaned.startsWith("0") && cleaned.length() == 11) {
            cleaned = cleaned.substring(1);
        } else if (cleaned.startsWith("+")) {
            cleaned = cleaned.substring(1);
        }

        if (!cleaned.matches("^[6-9]\\d{9}$")) {
            throw new IllegalArgumentException("Please enter a valid 10-digit Indian mobile number.");
        }
        return "+91" + cleaned;
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

    public boolean isDemoPhone(String phone) {
        if (phone == null) return false;
        try {
            String norm = normalizePhone(phone);
            return DEMO_PHONES.contains(norm);
        } catch (Exception e) {
            return false;
        }
    }

    @Transactional
    public void generateAndSendOtp(String phone) {
        generateAndSendOtp(phone, "Your SATARK Disaster Early Warning verification code is: %s. Valid for 5 minutes.");
    }

    @Transactional
    public void generateAndSendOtp(String phone, String messageTemplate) {
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

        boolean isDemo = demoMode && isDemoPhone(normalized);

        // For real numbers: verify that SMS delivery is actually configured & available
        if (!isDemo && !smsGateway.isLiveSmsAvailable()) {
            log.warn("Real SMS dispatch requested for {} but live SMS is not configured or unavailable",
                    maskPhone(normalized));
            throw new IllegalStateException("SMS service is currently unavailable. Please try again later.");
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

        // Send via SMS Gateway
        if (isDemo) {
            String demoOtpToSend = demoCode != null ? demoCode : rawOtp;
            smsGateway.sendSms(normalized, String.format(messageTemplate, demoOtpToSend));
        } else {
            try {
                String smsBody = String.format(messageTemplate, rawOtp);
                smsGateway.sendSms(normalized, smsBody);
            } catch (Exception e) {
                log.error("SMS dispatch failed for {}: {}", maskPhone(normalized), e.getMessage());
                throw new IllegalStateException("Unable to send OTP right now. Please try again.");
            }
        }
    }

    @Transactional
    public boolean verifyOtp(String phone, String inputOtp) {
        String normalized = normalizePhone(phone);
        OffsetDateTime now = OffsetDateTime.now();

        if (inputOtp == null || inputOtp.trim().isEmpty()) {
            throw new IllegalArgumentException("Incorrect OTP. Please try again.");
        }
        String cleanOtp = inputOtp.trim();

        // Allow demo code ONLY for designated SIH demo accounts in demo mode
        if (demoMode && isDemoPhone(normalized) && demoCode != null && demoCode.equals(cleanOtp)) {
            log.info("Demo OTP verified for SIH demo account {}", maskPhone(normalized));
            otpRepo.findTopByPhoneAndVerifiedFalseOrderByCreatedAtDesc(normalized).ifPresent(p -> {
                p.setVerified(true);
                otpRepo.save(p);
            });
            return true;
        }

        PhoneOtp record = otpRepo.findTopByPhoneAndVerifiedFalseOrderByCreatedAtDesc(normalized)
                .orElseThrow(() -> new IllegalStateException("No active OTP request found for this phone number. Please request a code."));

        if (now.isAfter(record.getExpiresAt())) {
            throw new IllegalStateException("OTP expired. Please request a new OTP.");
        }

        if (record.getAttempts() >= maxAttempts) {
            throw new IllegalStateException("Maximum verification attempts exceeded. Please request a new OTP.");
        }

        record.setAttempts(record.getAttempts() + 1);

        boolean matches = passwordEncoder.matches(cleanOtp, record.getOtpHash());
        if (!matches) {
            otpRepo.save(record);
            throw new IllegalArgumentException("Incorrect OTP. Please try again.");
        }

        record.setVerified(true);
        otpRepo.save(record);
        log.info("Phone OTP verified successfully for {}", maskPhone(normalized));
        return true;
    }

    private String maskPhone(String phone) {
        if (phone == null || phone.length() < 6) return "****";
        return phone.substring(0, Math.min(phone.length(), 6)) + "XXXX";
    }
}
