package com.ews.ner.domain.alert;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import com.ews.ner.domain.risk.RiskScore;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

public interface AlertRepository extends JpaRepository<Alert, UUID> {

    List<Alert> findByRegionIdOrderByCreatedAtDesc(UUID regionId);

    List<Alert> findTop50ByOrderByCreatedAtDesc();

    boolean existsByRegionIdAndSeverityAndCreatedAtAfter(
            UUID regionId, RiskScore.Severity severity, OffsetDateTime after);

    // ── Responder-managed alerts ─────────────────────────────────────────────

    List<Alert> findByIsResponderCreatedTrueOrderByCreatedAtDesc();

    @Query("SELECT a FROM Alert a WHERE a.isResponderCreated = true AND a.status = 'ACTIVE' ORDER BY a.createdAt DESC")
    List<Alert> findActiveResponderAlerts();

    // Active alerts matching an exact region
    @Query("SELECT a FROM Alert a WHERE a.isResponderCreated = true AND a.status = 'ACTIVE' " +
           "AND (a.regionId = :regionId OR (a.scope = 'EXACT_REGION' AND a.regionId = :regionId)) " +
           "ORDER BY a.createdAt DESC")
    List<Alert> findActiveAlertsForRegion(@Param("regionId") UUID regionId);

    // Active alerts matching a district (scope = DISTRICT or EXACT_REGION within that district)
    @Query("SELECT a FROM Alert a WHERE a.isResponderCreated = true AND a.status = 'ACTIVE' " +
           "AND LOWER(a.district) = LOWER(:district) " +
           "ORDER BY a.createdAt DESC")
    List<Alert> findActiveAlertsForDistrict(@Param("district") String district);

    // Active alerts matching a state (scope = STATE)
    @Query("SELECT a FROM Alert a WHERE a.isResponderCreated = true AND a.status = 'ACTIVE' " +
           "AND a.scope = 'STATE' AND LOWER(a.state) = LOWER(:state) " +
           "ORDER BY a.createdAt DESC")
    List<Alert> findActiveAlertsForState(@Param("state") String state);

    // Fetch all active alerts for given location (region + district + state)
    @Query("SELECT a FROM Alert a WHERE a.isResponderCreated = true AND a.status = 'ACTIVE' " +
           "AND (" +
           "  (a.regionId = :regionId) OR " +
           "  (a.scope = 'DISTRICT' AND :district IS NOT NULL AND LOWER(a.district) = LOWER(:district)) OR " +
           "  (a.scope = 'STATE' AND :state IS NOT NULL AND LOWER(a.state) = LOWER(:state))" +
           ") ORDER BY a.createdAt DESC")
    List<Alert> findActiveAlertsForLocation(
            @Param("regionId") UUID regionId,
            @Param("district") String district,
            @Param("state") String state);

    // Alerts to expire (active but past expiry_time)
    @Query("SELECT a FROM Alert a WHERE a.status = 'ACTIVE' AND a.expiryTime IS NOT NULL AND a.expiryTime < :now")
    List<Alert> findAlertsToExpire(@Param("now") OffsetDateTime now);
}
