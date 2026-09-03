package com.ews.ner.service;

import com.ews.ner.api.dto.CreateReportRequest;
import com.ews.ner.domain.region.Region;
import com.ews.ner.domain.region.RegionRepository;
import com.ews.ner.domain.report.CitizenReport;
import com.ews.ner.domain.report.CitizenReport.ReportStatus;
import com.ews.ner.domain.report.CitizenReportRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class ReportService {
    private final CitizenReportRepository reportRepo;
    private final RegionRepository regionRepo;
    private final RiskService riskService;
    private final LiveFeedService liveFeed;

    @Transactional
    public CitizenReport createReport(CreateReportRequest req, UUID reporterId, String photoUrl) {
        if (req.getClientReportId() != null && !req.getClientReportId().isBlank()) {
            java.util.Optional<CitizenReport> existing = reportRepo.findByClientReportId(req.getClientReportId());
            if (existing.isPresent()) {
                log.info("Duplicate report submission detected for clientReportId: {}. Returning existing record.", req.getClientReportId());
                return existing.get();
            }
        }

        BigDecimal lat = req.getGeoLat() != null ? req.getGeoLat() : req.getLat();
        BigDecimal lng = req.getGeoLng() != null ? req.getGeoLng() : req.getLng();
        Region region = (lat != null && lng != null) 
            ? regionRepo.findRegionByPoint(lng.doubleValue(), lat.doubleValue()) 
            : null;
        
        String resolvedPhoto = photoUrl != null ? photoUrl : req.getPhotoUrl();

        CitizenReport report = CitizenReport.builder()
                .geoLat(lat)
                .geoLng(lng)
                .regionId(region != null ? region.getId() : null)
                .category(req.getCategory() != null ? req.getCategory() : CitizenReport.ReportCategory.OTHER)
                .description(req.getDescription())
                .reporterType(req.getReporterType() != null ? req.getReporterType() : CitizenReport.ReporterType.CITIZEN)
                .reporterId(reporterId)
                .photoUrl(resolvedPhoto)
                .clientReportId(req.getClientReportId())
                .createdAt(OffsetDateTime.now())
                .syncedAt(req.getClientReportId() != null ? OffsetDateTime.now() : null)
                .build();
                
        report = reportRepo.save(report);
        liveFeed.broadcastReport(report);

        if (region != null && report.getStatus() == ReportStatus.PENDING) {
            riskService.computeAndSave(region.getId());
        }
        
        return report;
    }

    @Transactional
    public CitizenReport updateStatus(UUID reportId, ReportStatus status) {
        CitizenReport report = reportRepo.findById(reportId)
            .orElseThrow(() -> new IllegalArgumentException("Report not found"));
        report.setStatus(status);
        reportRepo.save(report);
        
        if (report.getRegionId() != null) {
            riskService.computeAndSave(report.getRegionId());
        }
        return report;
    }
    
    public List<CitizenReport> getReportsForRegion(UUID regionId) {
        return reportRepo.findByRegionIdAndStatusIn(regionId, List.of(ReportStatus.PENDING, ReportStatus.VERIFIED));
    }
    
    public List<CitizenReport> getRecentReports() {
        return reportRepo.findTop20ByOrderByCreatedAtDesc();
    }

    @Transactional
    public void deleteReport(UUID reportId) {
        CitizenReport report = reportRepo.findById(reportId)
            .orElseThrow(() -> new IllegalArgumentException("Report not found: " + reportId));
        UUID regionId = report.getRegionId();
        reportRepo.delete(report);
        log.info("Officer deleted incident report: {}", reportId);
        if (regionId != null) {
            riskService.computeAndSave(regionId);
        }
    }

    @Transactional
    public int bulkDeleteReports(List<UUID> reportIds) {
        if (reportIds == null || reportIds.isEmpty()) return 0;
        List<CitizenReport> reports = reportRepo.findAllById(reportIds);
        if (reports.isEmpty()) return 0;

        List<UUID> affectedRegions = reports.stream()
            .map(CitizenReport::getRegionId)
            .filter(java.util.Objects::nonNull)
            .distinct()
            .toList();

        reportRepo.deleteAll(reports);
        log.info("Officer bulk deleted {} incident reports", reports.size());

        affectedRegions.forEach(riskService::computeAndSave);
        return reports.size();
    }

    @Transactional
    public int cleanupOldReports(boolean includeResolved, boolean includeDismissed) {
        List<CitizenReport> all = reportRepo.findAll();
        List<CitizenReport> toDelete = all.stream().filter(r -> {
            String desc = r.getDescription() != null ? r.getDescription().toUpperCase() : "";
            boolean isEmergencySos = desc.contains("EMERGENCY SOS") || desc.contains("INJURED") || desc.contains("TRAPPED")
                    || desc.contains("DISTRESS BEACON");
            // Safety: Never bulk delete active emergencies
            if (isEmergencySos && r.getStatus() != ReportStatus.RESOLVED && r.getStatus() != ReportStatus.DISMISSED) {
                return false;
            }

            if (includeResolved && r.getStatus() == ReportStatus.RESOLVED) return true;
            if (includeDismissed && r.getStatus() == ReportStatus.DISMISSED) return true;

            return false;
        }).toList();

        if (toDelete.isEmpty()) return 0;

        List<UUID> affectedRegions = toDelete.stream()
            .map(CitizenReport::getRegionId)
            .filter(java.util.Objects::nonNull)
            .distinct()
            .toList();

        reportRepo.deleteAll(toDelete);
        log.info("Cleaned up {} old/resolved citizen reports", toDelete.size());

        affectedRegions.forEach(riskService::computeAndSave);
        return toDelete.size();
    }
}
