package com.ews.ner.api;

import com.ews.ner.service.EvacuationRoutingService;
import com.ews.ner.service.LandslidePredictorEngine;
import com.ews.ner.service.OpenMeteoWeatherService;
import com.ews.ner.service.TerrainElevationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

/**
 * SIH 2026 AI Landslide Early Warning System REST Gateway
 */
@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
@Slf4j
public class RiskAssessmentController {

    private final OpenMeteoWeatherService weatherService;
    private final LandslidePredictorEngine predictorEngine;
    private final EvacuationRoutingService routingService;
    private final TerrainElevationService elevationService;

    @GetMapping("/risk-assessment")
    public ResponseEntity<Map<String, Object>> getRiskAssessment(
            @RequestParam(defaultValue = "11.6854") double lat,
            @RequestParam(defaultValue = "76.1320") double lon,
            @RequestParam(defaultValue = "36.5") double slope,
            @RequestParam(required = false, defaultValue = "Meppadi, Wayanad") String regionName) {

        // 1. Fetch live hydrometeorological metrics from Open-Meteo & OpenWeather
        Map<String, Object> weather = weatherService.getLiveRainfallMetrics(lat, lon);

        double rain24h = ((Number) weather.getOrDefault("rain_24h_mm", 0.0)).doubleValue();
        double rain72h = ((Number) weather.getOrDefault("rain_72h_mm", 0.0)).doubleValue();
        double moisture = ((Number) weather.getOrDefault("soil_moisture", 0.35)).doubleValue();

        // 2. Fetch NASA SRTM 30m live elevation
        Map<String, Object> terrainElevation = elevationService.getElevation(lat, lon);

        // 3. Compute AI landslide susceptibility score
        Map<String, Object> assessment = predictorEngine.computeRisk(slope, rain24h, rain72h, moisture);
        double riskScore = ((Number) assessment.getOrDefault("score", 0.0)).doubleValue();

        // 4. Dynamic Safe Road Rerouting
        Map<String, Object> evacuationPlan = routingService.calculateEvacuationPlan(regionName, riskScore, false);

        Map<String, Object> response = new HashMap<>();
        Map<String, Object> location = new HashMap<>();
        location.put("lat", lat);
        location.put("lon", lon);
        location.put("slope_deg", slope);
        location.put("region_name", regionName);

        response.put("location", location);
        response.put("weather", weather);
        response.put("terrain_elevation", terrainElevation);
        response.put("assessment", assessment);
        response.put("evacuation_plan", evacuationPlan);

        return ResponseEntity.ok(response);
    }

    @GetMapping("/weather/live")
    public ResponseEntity<Map<String, Object>> getLiveWeather(
            @RequestParam(defaultValue = "11.6854") double lat,
            @RequestParam(defaultValue = "76.1320") double lon) {
        return ResponseEntity.ok(weatherService.getLiveRainfallMetrics(lat, lon));
    }

    @GetMapping("/terrain/elevation")
    public ResponseEntity<Map<String, Object>> getTerrainElevation(
            @RequestParam(defaultValue = "11.6854") double lat,
            @RequestParam(defaultValue = "76.1320") double lon) {
        return ResponseEntity.ok(elevationService.getElevation(lat, lon));
    }
}
