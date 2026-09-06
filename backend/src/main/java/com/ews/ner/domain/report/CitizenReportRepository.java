package com.ews.ner.domain.report;

import org.springframework.data.jpa.repository.JpaRepository;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

public interface CitizenReportRepository extends JpaRepository<CitizenReport, UUID> {
    List<CitizenReport> findByRegionIdAndStatusIn(UUID regionId, List<CitizenReport.ReportStatus> statuses);
    long countByRegionIdAndStatusAndCreatedAtAfter(UUID regionId, CitizenReport.ReportStatus status, OffsetDateTime after);
    List<CitizenReport> findTop20ByOrderByCreatedAtDesc();
    java.util.Optional<CitizenReport> findByClientReportId(String clientReportId);
    java.util.Optional<CitizenReport> findByBeaconId(String beaconId);

    @org.springframework.data.jpa.repository.Query(
        "SELECT r FROM CitizenReport r WHERE r.beaconId IS NOT NULL AND r.status NOT IN (com.ews.ner.domain.report.CitizenReport.ReportStatus.RESOLVED, com.ews.ner.domain.report.CitizenReport.ReportStatus.DISMISSED) ORDER BY r.createdAt DESC"
    )
    List<CitizenReport> findActiveBeacons();
}
