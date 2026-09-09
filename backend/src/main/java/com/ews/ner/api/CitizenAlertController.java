package com.ews.ner.api;

import com.ews.ner.api.dto.ResponderAlertDTO;
import com.ews.ner.domain.alert.AlertRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Public read-only API for citizens to fetch active alerts matching their location.
 */
@RestController
@RequestMapping("/api/citizen/alerts")
@RequiredArgsConstructor
public class CitizenAlertController {

    private final AlertRepository alertRepo;

    /**
     * GET /api/citizen/alerts/active?regionId={uuid}&district={}&state={}
     * Returns active alerts matching the citizen's location.
     * Location matching priority:
     * 1. Exact regionId match
     * 2. District match (if scope=DISTRICT)
     * 3. State match (if scope=STATE)
     */
    @GetMapping("/active")
    public ResponseEntity<List<ResponderAlertDTO>> getActiveAlerts(
            @RequestParam(required = false) UUID regionId,
            @RequestParam(required = false) String district,
            @RequestParam(required = false) String state) {

        List<ResponderAlertDTO> result;

        if (regionId != null) {
            // Full match: region + district + state
            result = alertRepo.findActiveAlertsForLocation(regionId, district, state)
                    .stream().map(ResponderAlertDTO::from).collect(Collectors.toList());
        } else if (district != null && !district.isBlank()) {
            result = alertRepo.findActiveAlertsForDistrict(district)
                    .stream().map(ResponderAlertDTO::from).collect(Collectors.toList());
        } else if (state != null && !state.isBlank()) {
            result = alertRepo.findActiveAlertsForState(state)
                    .stream().map(ResponderAlertDTO::from).collect(Collectors.toList());
        } else {
            // No location provided — return all active alerts
            result = alertRepo.findActiveResponderAlerts()
                    .stream().map(ResponderAlertDTO::from).collect(Collectors.toList());
        }

        return ResponseEntity.ok(result);
    }

    /** GET /api/citizen/alerts/all — all active responder alerts (for map display) */
    @GetMapping("/all")
    public ResponseEntity<List<ResponderAlertDTO>> getAllActiveAlerts() {
        List<ResponderAlertDTO> result = alertRepo.findActiveResponderAlerts()
                .stream().map(ResponderAlertDTO::from).collect(Collectors.toList());
        return ResponseEntity.ok(result);
    }
}
