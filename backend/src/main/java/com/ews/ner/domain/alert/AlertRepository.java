package com.ews.ner.domain.alert;

import com.ews.ner.domain.risk.RiskScore;
import org.springframework.data.jpa.repository.JpaRepository;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

public interface AlertRepository extends JpaRepository<Alert, UUID> {
    List<Alert> findByRegionIdOrderByCreatedAtDesc(UUID regionId);
    List<Alert> findTop50ByOrderByCreatedAtDesc();
    boolean existsByRegionIdAndSeverityAndCreatedAtAfter(UUID regionId, RiskScore.Severity severity, OffsetDateTime after);
}
