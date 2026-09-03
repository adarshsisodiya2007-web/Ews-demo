package com.ews.ner.engine;

import org.springframework.stereotype.Component;
import java.math.BigDecimal;

@Component
public class RuleBasedScorer {
    private static final double RAINFALL_24H_MAX = 150.0;
    private static final double RAINFALL_72H_MAX = 300.0;
    private static final double SOIL_MAX = 80.0;
    private static final double SLOPE_MAX = 45.0;
    private static final int    HISTORY_MAX_EVENTS = 3;
    private static final int    REPORTS_MAX = 5;
    
    public FactorScore scoreRainfall(BigDecimal mm24h, BigDecimal mm72h) {
        double s24 = clamp(mm24h.doubleValue() / RAINFALL_24H_MAX);
        double s72 = clamp(mm72h.doubleValue() / RAINFALL_72H_MAX);
        double score = Math.max(s24, s72);
        String label = String.format("%.0fmm/24h, %.0fmm/72h", mm24h.doubleValue(), mm72h.doubleValue());
        return FactorScore.of(score, 0, label); 
    }
    
    public FactorScore scoreSoilMoisture(BigDecimal pct) {
        double score = clamp(pct.doubleValue() / SOIL_MAX);
        return FactorScore.of(score, 0, String.format("Soil %.0f%% saturated", pct.doubleValue()));
    }
    
    public FactorScore scoreSlope(BigDecimal deg) {
        double score = clamp(deg.doubleValue() / SLOPE_MAX);
        return FactorScore.of(score, 0, String.format("Slope angle %.1f°", deg.doubleValue()));
    }
    
    public FactorScore scoreHistory(long eventsInFiveYears) {
        double score = clamp((double) eventsInFiveYears / HISTORY_MAX_EVENTS);
        return FactorScore.of(score, 0, eventsInFiveYears + " event(s) in past 5 years");
    }
    
    public FactorScore scoreCitizenReports(long unresolvedCount) {
        double score = clamp((double) unresolvedCount / REPORTS_MAX);
        return FactorScore.of(score, 0, unresolvedCount + " unresolved field report(s)");
    }
    
    private double clamp(double v) { return Math.min(1.0, Math.max(0.0, v)); }
}
