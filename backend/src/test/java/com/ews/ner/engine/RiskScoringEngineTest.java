package com.ews.ner.engine;

import com.ews.ner.domain.landslide.HistoricalLandslideRepository;
import com.ews.ner.domain.report.CitizenReportRepository;
import com.ews.ner.domain.risk.RiskScore;
import com.ews.ner.domain.sensor.SensorReading;
import com.ews.ner.domain.sensor.SensorReadingRepository;
import com.ews.ner.domain.terrain.TerrainProfile;
import com.ews.ner.domain.terrain.TerrainProfileRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
public class RiskScoringEngineTest {

    @Mock private RiskWeights weights;
    @Mock private SensorReadingRepository sensorRepo;
    @Mock private TerrainProfileRepository terrainRepo;
    @Mock private HistoricalLandslideRepository historyRepo;
    @Mock private CitizenReportRepository reportRepo;
    @Mock private ObjectMapper objectMapper;

    private RuleBasedScorer scorer = new RuleBasedScorer();
    private RiskScoringEngine engine;
    private UUID regionId = UUID.randomUUID();

    @BeforeEach
    void setUp() {
        engine = new RiskScoringEngine(weights, scorer, sensorRepo, terrainRepo, historyRepo, reportRepo, objectMapper);
        when(weights.getRainfall()).thenReturn(0.35);
        when(weights.getSoilMoisture()).thenReturn(0.25);
        when(weights.getSlope()).thenReturn(0.20);
        when(weights.getHistory()).thenReturn(0.12);
        when(weights.getCitizenReports()).thenReturn(0.08);
    }

    @Test
    void testZeroRiskShouldReturnLow() {
        when(sensorRepo.findTopByRegionIdOrderByRecordedAtDesc(regionId)).thenReturn(Optional.of(
            SensorReading.builder().rainfallMm24h(BigDecimal.ZERO).rainfallMm72h(BigDecimal.ZERO).soilMoisturePct(BigDecimal.ZERO).build()
        ));
        when(terrainRepo.findByRegionId(regionId)).thenReturn(Optional.of(
            TerrainProfile.builder().slopeAngleDeg(BigDecimal.ZERO).build()
        ));
        when(historyRepo.countByRegionIdAndEventDateAfter(any(), any())).thenReturn(0L);
        when(reportRepo.countByRegionIdAndStatusAndCreatedAtAfter(any(), any(), any())).thenReturn(0L);

        RiskScore score = engine.computeForRegion(regionId);
        assertEquals(RiskScore.Severity.LOW, score.getSeverityLevel());
        assertTrue(score.getComputedScore().doubleValue() < 25.0);
    }

    @Test
    void testMaxRiskShouldReturnCritical() {
        when(sensorRepo.findTopByRegionIdOrderByRecordedAtDesc(regionId)).thenReturn(Optional.of(
            SensorReading.builder().rainfallMm24h(BigDecimal.valueOf(150)).rainfallMm72h(BigDecimal.valueOf(300)).soilMoisturePct(BigDecimal.valueOf(80)).build()
        ));
        when(terrainRepo.findByRegionId(regionId)).thenReturn(Optional.of(
            TerrainProfile.builder().slopeAngleDeg(BigDecimal.valueOf(45)).build()
        ));
        when(historyRepo.countByRegionIdAndEventDateAfter(any(), any())).thenReturn(5L);
        when(reportRepo.countByRegionIdAndStatusAndCreatedAtAfter(any(), any(), any())).thenReturn(10L);

        RiskScore score = engine.computeForRegion(regionId);
        assertEquals(RiskScore.Severity.CRITICAL, score.getSeverityLevel());
        assertTrue(score.getComputedScore().doubleValue() >= 75.0);
    }

    @Test
    void testCitizenReportsAloneShouldPushScoreHigher() {
        when(sensorRepo.findTopByRegionIdOrderByRecordedAtDesc(regionId)).thenReturn(Optional.of(
            SensorReading.builder().rainfallMm24h(BigDecimal.ZERO).rainfallMm72h(BigDecimal.ZERO).soilMoisturePct(BigDecimal.ZERO).build()
        ));
        when(terrainRepo.findByRegionId(regionId)).thenReturn(Optional.of(
            TerrainProfile.builder().slopeAngleDeg(BigDecimal.ZERO).build()
        ));
        when(historyRepo.countByRegionIdAndEventDateAfter(any(), any())).thenReturn(0L);
        when(reportRepo.countByRegionIdAndStatusAndCreatedAtAfter(any(), any(), any())).thenReturn(5L); // Max reports

        RiskScore score = engine.computeForRegion(regionId);
        assertEquals(8.0, score.getComputedScore().doubleValue(), 0.1);
    }

    @Test
    void testToSmsSummaryLength() {
        ContributingFactors factors = ContributingFactors.builder()
            .rainfall(FactorScore.of(1.0, 0.35, "Rain"))
            .soilMoisture(FactorScore.of(0.8, 0.25, "Soil"))
            .slope(FactorScore.of(0.5, 0.20, "Slope"))
            .history(FactorScore.of(0.0, 0.12, "Hist"))
            .citizenReports(FactorScore.of(1.0, 0.08, "Rep"))
            .build();
        
        String summary = factors.toSmsSummary();
        assertTrue(summary.length() <= 160);
        assertTrue(summary.contains("Rain:100%"));
    }
}
