package com.ews.ner.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * NASA NASADEM 30m Global Elevation Service — SIH 2026 Specification
 * Queries OpenTopography REST Point Elevation API using dataset=NASADEM.
 * Uses strict coordinate-keyed caching (elevation:NASADEM:lat:lon).
 * Never fabricates values when API key or remote service is unavailable.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class TerrainElevationService {

    private static final String BASE_URL = "https://portal.opentopography.org/API/v1/elevation";
    private static final String DATASET = "NASADEM";
    private static final int RESOLUTION_METERS = 30;

    @Value("${app.weather.opentopography.api-key:${application.weather.opentopography.api-key:${OPEN_TOPOGRAPHY_API_KEY:${OPENTOPOGRAPHY_API_KEY:619ea4b33002a569b3ac0b851e8b51d2}}}}")
    private String apiKey;

    private final RestTemplate restTemplate = new RestTemplate();
    private final ObjectMapper objectMapper = new ObjectMapper();

    // Coordinate-keyed cache: elevation:NASADEM:<lat>:<lon>
    private final Map<String, Map<String, Object>> cache = new ConcurrentHashMap<>();

    public Map<String, Object> getElevation(double lat, double lon) {
        // Validate coordinates
        if (Double.isNaN(lat) || Double.isNaN(lon) || lat < -90.0 || lat > 90.0 || lon < -180.0 || lon > 180.0) {
            Map<String, Object> err = new HashMap<>();
            err.put("available", false);
            err.put("latitude", lat);
            err.put("longitude", lon);
            err.put("source", "OpenTopography");
            err.put("dataset", DATASET);
            err.put("resolutionMeters", RESOLUTION_METERS);
            err.put("error", "Invalid coordinates supplied for NASADEM lookup");
            err.put("status", "INVALID_COORDINATES");
            err.put("unit", "Meters");
            return err;
        }

        String cacheKey = String.format("elevation:%s:%.4f:%.4f", DATASET, lat, lon);
        if (cache.containsKey(cacheKey)) {
            log.debug("Returning cached NASADEM elevation for key: {}", cacheKey);
            return new HashMap<>(cache.get(cacheKey));
        }

        // Check if OpenTopography API key is provided
        if (apiKey == null || apiKey.trim().isEmpty()) {
            log.warn("OPEN_TOPOGRAPHY_API_KEY is missing. Reporting truthful unavailable state without fake values.");
            Map<String, Object> missingKey = new HashMap<>();
            missingKey.put("available", false);
            missingKey.put("latitude", lat);
            missingKey.put("longitude", lon);
            missingKey.put("source", "OpenTopography");
            missingKey.put("dataset", DATASET);
            missingKey.put("resolutionMeters", RESOLUTION_METERS);
            missingKey.put("error", "OPEN_TOPOGRAPHY_API_KEY is missing");
            missingKey.put("status", "MISSING_API_KEY");
            missingKey.put("unit", "Meters");
            return missingKey;
        }

        String url = String.format(
                "%s?demtype=%s&latitude=%.4f&longitude=%.4f&outputFormat=JSON&API_Key=%s",
                BASE_URL, DATASET, lat, lon, apiKey.trim()
        );

        try {
            log.info("Querying NASA NASADEM 30m Elevation from OpenTopography: lat={}, lon={}", lat, lon);
            String responseStr = restTemplate.getForObject(url, String.class);
            if (responseStr != null && !responseStr.trim().isEmpty()) {
                JsonNode root = objectMapper.readTree(responseStr);
                if (root.has("Elevation")) {
                    double elevation = root.get("Elevation").asDouble();
                    Map<String, Object> result = new HashMap<>();
                    result.put("available", true);
                    result.put("latitude", lat);
                    result.put("longitude", lon);
                    result.put("elevationMeters", elevation);
                    result.put("elevation_meters", elevation); // legacy compatibility
                    result.put("source", "OpenTopography");
                    result.put("dataset", DATASET);
                    result.put("resolutionMeters", RESOLUTION_METERS);
                    result.put("status", "SUCCESS");
                    result.put("unit", "Meters");

                    cache.put(cacheKey, result);
                    return result;
                }
            }
        } catch (Exception e) {
            log.warn("OpenTopography NASADEM query failed for lat={}, lon={}: {}", lat, lon, e.getMessage());
        }

        // Truthful unavailable state — DO NOT fabricate or return hardcoded 879m
        Map<String, Object> unavailable = new HashMap<>();
        unavailable.put("available", false);
        unavailable.put("latitude", lat);
        unavailable.put("longitude", lon);
        unavailable.put("source", "OpenTopography");
        unavailable.put("dataset", DATASET);
        unavailable.put("resolutionMeters", RESOLUTION_METERS);
        unavailable.put("error", "NASADEM elevation unavailable");
        unavailable.put("status", "UNAVAILABLE");
        unavailable.put("unit", "Meters");
        return unavailable;
    }
}
