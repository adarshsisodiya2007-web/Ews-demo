package com.ews.ner.api;

import com.ews.ner.api.dto.ResponderAlertDTO;
import com.ews.ner.api.dto.ResponderAlertRequest;
import com.ews.ner.domain.alert.Alert;
import com.ews.ner.domain.alert.AlertRepository;
import com.ews.ner.service.LiveFeedService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * CRUD API for responder-managed landslide alerts.
 * Requires FIELD_OFFICER, DISTRICT_OFFICIAL, or ADMIN role.
 */
@RestController
@RequestMapping("/api/responder/alerts")
@RequiredArgsConstructor
@Slf4j
public class ResponderAlertController {

    private final AlertRepository alertRepo;
    private final LiveFeedService liveFeed;

    /** List all responder-created alerts (paginated) */
    @GetMapping
    public ResponseEntity<List<ResponderAlertDTO>> listAlerts() {
        List<ResponderAlertDTO> list = alertRepo
                .findByIsResponderCreatedTrueOrderByCreatedAtDesc()
                .stream().map(ResponderAlertDTO::from).collect(Collectors.toList());
        return ResponseEntity.ok(list);
    }

    /** Get single alert by id */
    @GetMapping("/{id}")
    public ResponseEntity<ResponderAlertDTO> getAlert(@PathVariable UUID id) {
        return alertRepo.findById(id)
                .filter(Alert::isResponderCreated)
                .map(a -> ResponseEntity.ok(ResponderAlertDTO.from(a)))
                .orElse(ResponseEntity.notFound().build());
    }

    /** Create and publish a new responder alert */
    @PostMapping
    public ResponseEntity<?> createAlert(@RequestBody ResponderAlertRequest req, Authentication auth) {
        // Validate required fields
        if (req.getTitle() == null || req.getTitle().isBlank()) {
            return ResponseEntity.badRequest().body("Alert title is required");
        }
        if (req.getSeverity() == null) {
            return ResponseEntity.badRequest().body("Severity is required");
        }
        if (req.getDescription() == null || req.getDescription().isBlank()) {
            return ResponseEntity.badRequest().body("Alert description is required");
        }
        // Location validation: must have regionId OR district OR state
        if (req.getRegionId() == null
                && (req.getDistrict() == null || req.getDistrict().isBlank())
                && (req.getState() == null || req.getState().isBlank())) {
            return ResponseEntity.badRequest().body("At least one location field (regionId, district, or state) is required");
        }
        if (req.getScope() == null || req.getScope().isBlank()) {
            req.setScope("EXACT_REGION");
        }

        OffsetDateTime now = OffsetDateTime.now();
        Alert alert = Alert.builder()
                .title(req.getTitle())
                .messageEn(req.getDescription())
                .messageAs(req.getDescription())  // default to same; can be enhanced later
                .severity(req.getSeverity())
                .status(Alert.AlertStatus.ACTIVE)
                .scope(req.getScope())
                .alertType(req.getAlertType() != null ? req.getAlertType() : "LANDSLIDE")
                .regionId(req.getRegionId())
                .locationName(req.getLocationName())
                .district(req.getDistrict())
                .state(req.getState())
                .lat(req.getLat())
                .lng(req.getLng())
                .channel(Alert.AlertChannel.APP)
                .startTime(req.getStartTime() != null ? req.getStartTime() : now)
                .expiryTime(req.getExpiryTime())
                .isResponderCreated(true)
                .createdAt(now)
                .updatedAt(now)
                .build();

        alert = alertRepo.save(alert);
        log.info("Responder alert created: {} [{}] for location: {}/{}",
                alert.getId(), alert.getSeverity(), alert.getDistrict(), alert.getState());

        // Real-time broadcast via WebSocket
        liveFeed.broadcastResponderAlert(alert);

        return ResponseEntity.status(HttpStatus.CREATED).body(ResponderAlertDTO.from(alert));
    }

    /** Update an existing responder alert */
    @PutMapping("/{id}")
    public ResponseEntity<?> updateAlert(@PathVariable UUID id,
                                          @RequestBody ResponderAlertRequest req) {
        return alertRepo.findById(id)
                .filter(Alert::isResponderCreated)
                .map(alert -> {
                    if (req.getTitle() != null && !req.getTitle().isBlank()) alert.setTitle(req.getTitle());
                    if (req.getDescription() != null) alert.setMessageEn(req.getDescription());
                    if (req.getSeverity() != null) alert.setSeverity(req.getSeverity());
                    if (req.getScope() != null) alert.setScope(req.getScope());
                    if (req.getAlertType() != null) alert.setAlertType(req.getAlertType());
                    if (req.getRegionId() != null) alert.setRegionId(req.getRegionId());
                    if (req.getLocationName() != null) alert.setLocationName(req.getLocationName());
                    if (req.getDistrict() != null) alert.setDistrict(req.getDistrict());
                    if (req.getState() != null) alert.setState(req.getState());
                    if (req.getLat() != null) alert.setLat(req.getLat());
                    if (req.getLng() != null) alert.setLng(req.getLng());
                    if (req.getExpiryTime() != null) alert.setExpiryTime(req.getExpiryTime());
                    alert.setUpdatedAt(OffsetDateTime.now());
                    Alert saved = alertRepo.save(alert);
                    liveFeed.broadcastResponderAlert(saved);
                    return ResponseEntity.ok(ResponderAlertDTO.from(saved));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    /** Resolve an alert */
    @PatchMapping("/{id}/resolve")
    public ResponseEntity<?> resolveAlert(@PathVariable UUID id) {
        return alertRepo.findById(id)
                .filter(Alert::isResponderCreated)
                .map(alert -> {
                    alert.setStatus(Alert.AlertStatus.RESOLVED);
                    alert.setUpdatedAt(OffsetDateTime.now());
                    Alert saved = alertRepo.save(alert);
                    liveFeed.broadcastResponderAlert(saved);  // notify citizens: RESOLVED
                    return ResponseEntity.ok(ResponderAlertDTO.from(saved));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    /** Cancel/deactivate an alert */
    @PatchMapping("/{id}/cancel")
    public ResponseEntity<?> cancelAlert(@PathVariable UUID id) {
        return alertRepo.findById(id)
                .filter(Alert::isResponderCreated)
                .map(alert -> {
                    alert.setStatus(Alert.AlertStatus.EXPIRED);
                    alert.setUpdatedAt(OffsetDateTime.now());
                    Alert saved = alertRepo.save(alert);
                    liveFeed.broadcastResponderAlert(saved);
                    return ResponseEntity.ok(ResponderAlertDTO.from(saved));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    /** Delete alert (admin only — enforced at security config level) */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteAlert(@PathVariable UUID id) {
        return alertRepo.findById(id)
                .filter(Alert::isResponderCreated)
                .map(alert -> {
                    alertRepo.delete(alert);
                    return ResponseEntity.ok().<Void>build();
                })
                .orElse(ResponseEntity.notFound().build());
    }
}
