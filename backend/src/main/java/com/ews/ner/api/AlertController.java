package com.ews.ner.api;

import com.ews.ner.api.dto.AlertDTO;
import com.ews.ner.domain.alert.Alert;
import com.ews.ner.domain.alert.AlertRepository;
import com.ews.ner.domain.region.Region;
import com.ews.ner.domain.region.RegionRepository;
import com.ews.ner.domain.risk.RiskScore;
import com.ews.ner.domain.risk.RiskScoreRepository;
import com.ews.ner.service.AlertService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/alerts")
@RequiredArgsConstructor
public class AlertController {

    private final AlertService alertService;
    private final AlertRepository alertRepo;
    private final RegionRepository regionRepo;
    private final RiskScoreRepository riskScoreRepo;

    @GetMapping("/recent")
    public ResponseEntity<List<AlertDTO>> getRecentAlerts() {
        List<Alert> alerts = alertService.getRecentAlerts();
        return ResponseEntity.ok(toAlertDTOs(alerts));
    }

    @GetMapping("/region/{regionId}")
    public ResponseEntity<List<AlertDTO>> getAlertsForRegion(@PathVariable UUID regionId) {
        List<Alert> alerts = alertRepo.findByRegionIdOrderByCreatedAtDesc(regionId);
        return ResponseEntity.ok(toAlertDTOs(alerts));
    }

    @GetMapping
    public ResponseEntity<Page<AlertDTO>> getAllAlerts(Pageable pageable) {
        Page<Alert> page = alertRepo.findAll(pageable);
        // Pre-fetch regions for this page
        List<UUID> regionIds = page.getContent().stream().map(Alert::getRegionId).distinct().collect(Collectors.toList());
        Map<UUID, Region> regionMap = regionRepo.findAllById(regionIds).stream().collect(Collectors.toMap(Region::getId, r -> r));
        Map<UUID, RiskScore> scoreMap = riskScoreRepo.findLatestForAllRegions().stream()
            .collect(Collectors.toMap(RiskScore::getRegionId, s -> s, (a, b) -> a));

        return ResponseEntity.ok(page.map(alert -> toAlertDTO(alert, regionMap, scoreMap)));
    }

    // ── Helpers ────────────────────────────────────────────────────────────────

    private List<AlertDTO> toAlertDTOs(List<Alert> alerts) {
        if (alerts.isEmpty()) return List.of();

        // Batch-load regions and scores for all alerts in one query each
        List<UUID> regionIds = alerts.stream().map(Alert::getRegionId).distinct().collect(Collectors.toList());
        Map<UUID, Region> regionMap = regionRepo.findAllById(regionIds).stream()
            .collect(Collectors.toMap(Region::getId, r -> r));
        Map<UUID, RiskScore> scoreMap = riskScoreRepo.findLatestForAllRegions().stream()
            .filter(s -> regionIds.contains(s.getRegionId()))
            .collect(Collectors.toMap(RiskScore::getRegionId, s -> s, (a, b) -> a));

        return alerts.stream().map(a -> toAlertDTO(a, regionMap, scoreMap)).collect(Collectors.toList());
    }

    private AlertDTO toAlertDTO(Alert a, Map<UUID, Region> regionMap, Map<UUID, RiskScore> scoreMap) {
        AlertDTO dto = new AlertDTO();
        dto.setId(a.getId());
        dto.setRegionId(a.getRegionId());
        dto.setSeverity(a.getSeverity());
        dto.setMessageEn(a.getMessageEn());
        dto.setMessageAs(a.getMessageAs());
        dto.setContributingSummary(a.getContributingSummary());
        dto.setChannel(a.getChannel());
        dto.setStatus(a.getStatus());
        dto.setCreatedAt(a.getCreatedAt());

        Region region = regionMap.get(a.getRegionId());
        if (region != null) {
            dto.setRegionName(region.getName()); // Populated for ticker display
        }

        RiskScore score = scoreMap.get(a.getRegionId());
        if (score != null) {
            dto.setComputedScore(score.getComputedScore()); // Populated for ticker score chip
        }

        return dto;
    }
}
