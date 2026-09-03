package com.ews.ner.api;

import com.ews.ner.api.dto.CitizenProfileDTO;
import com.ews.ner.api.dto.CitizenProfileRequest;
import com.ews.ner.domain.user.*;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.time.OffsetDateTime;
import java.util.Map;

@RestController
@RequestMapping("/api/citizen")
@RequiredArgsConstructor
@Slf4j
public class CitizenProfileController {
    private final AppUserRepository userRepo;
    private final CitizenProfileRepository profileRepo;

    private AppUser getAuthenticatedUser(Principal principal) {
        if (principal == null || principal.getName() == null) {
            throw new RuntimeException("Unauthorized: No authenticated user session found");
        }
        return userRepo.findByUsername(principal.getName())
                .or(() -> userRepo.findByPhone(principal.getName()))
                .orElseThrow(() -> new RuntimeException("User not found for session: " + principal.getName()));
    }

    private CitizenProfileDTO toDTO(CitizenProfile p, AppUser user) {
        return CitizenProfileDTO.builder()
                .id(p.getId())
                .userId(p.getUserId())
                .fullName(p.getFullName())
                .phone(user.getPhone() != null ? user.getPhone() : user.getUsername())
                .gender(p.getGender())
                .ageGroup(p.getAgeGroup())
                .preferredLanguage(p.getPreferredLanguage())
                .bloodGroup(p.getBloodGroup())
                .emergencyContactName(p.getEmergencyContactName())
                .emergencyContactPhone(p.getEmergencyContactPhone())
                .accessibilityNeeds(p.getAccessibilityNeeds())
                .createdAt(p.getCreatedAt())
                .updatedAt(p.getUpdatedAt())
                .build();
    }

    @GetMapping("/profile")
    public ResponseEntity<?> getProfile(Principal principal) {
        AppUser user = getAuthenticatedUser(principal);
        java.util.Optional<CitizenProfile> profileOpt = profileRepo.findByUserId(user.getId());
        if (profileOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("message", "Citizen profile not created yet", "userId", user.getId().toString()));
        }
        return ResponseEntity.ok(toDTO(profileOpt.get(), user));
    }

    @PostMapping("/profile")
    public ResponseEntity<?> createProfile(@Valid @RequestBody CitizenProfileRequest req, Principal principal) {
        AppUser user = getAuthenticatedUser(principal);

        if (profileRepo.findByUserId(user.getId()).isPresent()) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(Map.of("message", "Profile already exists for this citizen. Use PUT to update."));
        }

        CitizenProfile profile = CitizenProfile.builder()
                .userId(user.getId())
                .fullName(req.getFullName().trim())
                .gender(req.getGender())
                .ageGroup(req.getAgeGroup())
                .preferredLanguage(req.getPreferredLanguage() != null ? req.getPreferredLanguage() : "en")
                .bloodGroup(req.getBloodGroup())
                .emergencyContactName(req.getEmergencyContactName())
                .emergencyContactPhone(req.getEmergencyContactPhone())
                .accessibilityNeeds(req.getAccessibilityNeeds())
                .createdAt(OffsetDateTime.now())
                .updatedAt(OffsetDateTime.now())
                .build();

        CitizenProfile saved = profileRepo.save(profile);

        if (req.getPreferredLanguage() != null) {
            user.setLanguagePref(req.getPreferredLanguage());
            userRepo.save(user);
        }

        log.info("Citizen profile created successfully for user {}", user.getUsername());
        return ResponseEntity.status(HttpStatus.CREATED).body(toDTO(saved, user));
    }

    @PutMapping("/profile")
    public ResponseEntity<?> updateProfile(@Valid @RequestBody CitizenProfileRequest req, Principal principal) {
        AppUser user = getAuthenticatedUser(principal);

        CitizenProfile profile = profileRepo.findByUserId(user.getId())
                .orElseGet(() -> CitizenProfile.builder()
                        .userId(user.getId())
                        .createdAt(OffsetDateTime.now())
                        .build());

        profile.setFullName(req.getFullName().trim());
        profile.setGender(req.getGender());
        profile.setAgeGroup(req.getAgeGroup());
        if (req.getPreferredLanguage() != null) {
            profile.setPreferredLanguage(req.getPreferredLanguage());
            user.setLanguagePref(req.getPreferredLanguage());
            userRepo.save(user);
        }
        profile.setBloodGroup(req.getBloodGroup());
        profile.setEmergencyContactName(req.getEmergencyContactName());
        profile.setEmergencyContactPhone(req.getEmergencyContactPhone());
        profile.setAccessibilityNeeds(req.getAccessibilityNeeds());
        profile.setUpdatedAt(OffsetDateTime.now());

        CitizenProfile saved = profileRepo.save(profile);
        log.info("Citizen profile updated successfully for user {}", user.getUsername());
        return ResponseEntity.ok(toDTO(saved, user));
    }

    @DeleteMapping("/profile")
    public ResponseEntity<?> deleteProfile(Principal principal) {
        AppUser user = getAuthenticatedUser(principal);
        profileRepo.findByUserId(user.getId()).ifPresent(profileRepo::delete);
        log.info("Citizen profile deleted on request for user {}", user.getUsername());
        return ResponseEntity.ok(Map.of("success", true, "message", "Citizen profile deleted successfully"));
    }
}
