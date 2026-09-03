package com.ews.ner.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.HashMap;
import java.util.Map;

/**
 * AI Landslide Susceptibility & Risk Engine — SIH 2026 Specification
 * Combines static topographic variables (slope angle, elevation) with dynamic hydrometeorological features.
 */
@Service
@Slf4j
public class LandslidePredictorEngine {

    // Rule-based weights calibrated with GSI historical susceptibility indices
    private static final double WEIGHT_SLOPE = 0.35;
    private static final double WEIGHT_RAIN_24H = 0.30;
    private static final double WEIGHT_SOIL_MOISTURE = 0.20;
    private static final double WEIGHT_RAIN_72H = 0.15;

    public Map<String, Object> computeRisk(double slopeDeg, double rain24h, double rain72h, double moisture) {
        // Feature Normalization
        double normSlope = Math.min(Math.max(0.0, slopeDeg) / 50.0, 1.0);
        double normR24 = Math.min(Math.max(0.0, rain24h) / 200.0, 1.0);
        double normR72 = Math.min(Math.max(0.0, rain72h) / 350.0, 1.0);
        double normMoist = Math.min(Math.max(0.0, moisture) / 0.6, 1.0);

        double score = (normSlope * WEIGHT_SLOPE) +
                       (normR24 * WEIGHT_RAIN_24H) +
                       (normMoist * WEIGHT_SOIL_MOISTURE) +
                       (normR72 * WEIGHT_RAIN_72H);

        double riskScore = BigDecimal.valueOf(score).setScale(3, RoundingMode.HALF_UP).doubleValue();

        String level;
        String action;

        if (riskScore >= 0.70) {
            level = "RED";
            action = "Immediate Evacuation & Highway Closure";
        } else if (riskScore >= 0.45) {
            level = "AMBER";
            action = "Issue Warning to Transport & Rescue Units";
        } else {
            level = "GREEN";
            action = "Normal Monitoring Mode";
        }

        Map<String, Object> assessment = new HashMap<>();
        assessment.put("score", riskScore);
        assessment.put("level", level);
        assessment.put("action_protocol", action);

        Map<String, Object> breakdown = new HashMap<>();
        breakdown.put("norm_slope", BigDecimal.valueOf(normSlope).setScale(2, RoundingMode.HALF_UP).doubleValue());
        breakdown.put("norm_r24", BigDecimal.valueOf(normR24).setScale(2, RoundingMode.HALF_UP).doubleValue());
        breakdown.put("norm_r72", BigDecimal.valueOf(normR72).setScale(2, RoundingMode.HALF_UP).doubleValue());
        breakdown.put("norm_moisture", BigDecimal.valueOf(normMoist).setScale(2, RoundingMode.HALF_UP).doubleValue());
        assessment.put("feature_breakdown", breakdown);

        return assessment;
    }
}
