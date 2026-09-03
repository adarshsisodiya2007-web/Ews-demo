package com.ews.ner.domain.risk;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface RiskScoreRepository extends JpaRepository<RiskScore, UUID> {
    Optional<RiskScore> findTopByRegionIdOrderByComputedAtDesc(UUID regionId);
    List<RiskScore> findBySeverityLevelIn(List<RiskScore.Severity> levels);
    
    @Query("SELECT rs FROM RiskScore rs WHERE rs.computedAt = (SELECT MAX(rs2.computedAt) FROM RiskScore rs2 WHERE rs2.regionId = rs.regionId)")
    List<RiskScore> findLatestForAllRegions();
}
