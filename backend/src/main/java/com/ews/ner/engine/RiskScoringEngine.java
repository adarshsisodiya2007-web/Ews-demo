package com.ews.ner.engine;

import com.ews.ner.domain.landslide.HistoricalLandslideRepository;
import com.ews.ner.domain.report.CitizenReport.ReportStatus;
import com.ews.ner.domain.report.CitizenReportRepository;
import com.ews.ner.domain.risk.RiskScore;
import com.ews.ner.domain.risk.RiskScore.ScoreSource;
import com.ews.ner.domain.risk.RiskScore.Severity;
import com.ews.ner.domain.sensor.SensorReading;
import com.ews.ner.domain.sensor.SensorReadingRepository;
import com.ews.ner.domain.terrain.TerrainProfile;
import com.ews.ner.domain.terrain.TerrainProfileRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class RiskScoringEngine {
    private final RiskWeights weights;
    private final RuleBasedScorer scorer;
    private final SensorReadingRepository sensorRepo;
    private final TerrainProfileRepository terrainRepo;
    private final HistoricalLandslideRepository historyRepo;
    private final CitizenReportRepository reportRepo;
    private final ObjectMapper objectMapper;
    
    public RiskScore computeForRegion(UUID regionId) {
        SensorReading sensor = sensorRepo.findTopByRegionIdOrderByRecordedAtDesc(regionId)
            .orElse(defaultSensor(regionId));
        TerrainProfile terrain = terrainRepo.findByRegionId(regionId)
            .orElse(defaultTerrain(regionId));
        long historyCount = historyRepo.countByRegionIdAndEventDateAfter(regionId, LocalDate.now().minusYears(5));
        long reportCount = reportRepo.countByRegionIdAndStatusAndCreatedAtAfter(
            regionId, ReportStatus.PENDING, OffsetDateTime.now().minusHours(48));
        
        FactorScore rainfallFactor = scorer.scoreRainfall(sensor.getRainfallMm24h(), sensor.getRainfallMm72h());
        FactorScore soilFactor     = scorer.scoreSoilMoisture(sensor.getSoilMoisturePct());
        FactorScore slopeFactor    = scorer.scoreSlope(terrain.getSlopeAngleDeg());
        FactorScore histFactor     = scorer.scoreHistory(historyCount);
        FactorScore reportFactor   = scorer.scoreCitizenReports(reportCount);
        
        ContributingFactors factors = ContributingFactors.builder()
            .rainfall(FactorScore.of(rainfallFactor.score(), weights.getRainfall(), rainfallFactor.label()))
            .soilMoisture(FactorScore.of(soilFactor.score(), weights.getSoilMoisture(), soilFactor.label()))
            .slope(FactorScore.of(slopeFactor.score(), weights.getSlope(), slopeFactor.label()))
            .history(FactorScore.of(histFactor.score(), weights.getHistory(), histFactor.label()))
            .citizenReports(FactorScore.of(reportFactor.score(), weights.getCitizenReports(), reportFactor.label()))
            .build();
        
        double totalScore = factors.totalScore() * 100.0;
        Severity severity = toSeverity(totalScore);
        
        String factorsJson;
        try { factorsJson = objectMapper.writeValueAsString(factors); }
        catch (Exception e) { factorsJson = "{}"; }
        
        log.debug("Risk computed for region {}: score={} severity={}", regionId, String.format("%.2f", totalScore), severity);
        
        return RiskScore.builder()
            .regionId(regionId)
            .computedScore(BigDecimal.valueOf(totalScore).setScale(2, RoundingMode.HALF_UP))
            .severityLevel(severity)
            .contributingFactors(factorsJson)
            .scoreSource(ScoreSource.RULE_BASED)
            .computedAt(OffsetDateTime.now())
            .build();
    }
    
    private Severity toSeverity(double score) {
        if (score >= 75.0) return Severity.CRITICAL;
        if (score >= 50.0) return Severity.HIGH;
        if (score >= 25.0) return Severity.MODERATE;
        return Severity.LOW;
    }
    
    private SensorReading defaultSensor(UUID regionId) {
        SensorReading s = new SensorReading();
        s.setRegionId(regionId);
        s.setRainfallMm24h(BigDecimal.ZERO);
        s.setRainfallMm72h(BigDecimal.ZERO);
        s.setSoilMoisturePct(BigDecimal.ZERO);
        s.setRecordedAt(OffsetDateTime.now());
        return s;
    }
    
    private TerrainProfile defaultTerrain(UUID regionId) {
        TerrainProfile t = new TerrainProfile();
        t.setRegionId(regionId);
        t.setSlopeAngleDeg(BigDecimal.ZERO);
        t.setElevationM(0);
        return t;
    }
}
