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

    private static final String DEFAULT_OPEN_METEO_ELEVATION_URL = "https://api.open-meteo.com/v1/elevation";
    private static final String OPENTOPOGRAPHY_BASE_URL = "https://portal.opentopography.org/API/v1/elevation";
    private static final String DATASET = "NASADEM_SRTM";
    private static final int RESOLUTION_METERS = 30;

    @Value("${app.weather.openmeteo.elevation-url:${application.weather.openmeteo.elevation-url:https://api.open-meteo.com/v1/elevation}}")
    private String openMeteoElevationUrl;

    @Value("${app.weather.opentopography.api-key:${application.weather.opentopography.api-key:${OPEN_TOPOGRAPHY_API_KEY:${OPENTOPOGRAPHY_API_KEY:619ea4b33002a569b3ac0b851e8b51d2}}}}")
    private String openTopographyApiKey;

    private final RestTemplate restTemplate = new RestTemplate();
    private final ObjectMapper objectMapper = new ObjectMapper();

    // Coordinate-keyed cache: elevation:OPEN_METEO:<lat>:<lon>
    private final Map<String, Map<String, Object>> cache = new ConcurrentHashMap<>();

    public Map<String, Object> getElevation(double lat, double lon) {
        // Validate coordinates
        if (Double.isNaN(lat) || Double.isNaN(lon) || lat < -90.0 || lat > 90.0 || lon < -180.0 || lon > 180.0) {
            Map<String, Object> err = new HashMap<>();
            err.put("available", false);
            err.put("latitude", lat);
            err.put("longitude", lon);
            err.put("source", "Open-Meteo");
            err.put("dataset", DATASET);
            err.put("resolutionMeters", RESOLUTION_METERS);
            err.put("error", "Invalid coordinates supplied for elevation lookup");
            err.put("status", "INVALID_COORDINATES");
            err.put("unit", "Meters");
            return err;
        }

        String cacheKey = String.format("elevation:%.4f:%.4f", lat, lon);
        if (cache.containsKey(cacheKey)) {
            log.debug("Returning cached elevation for key: {}", cacheKey);
            return new HashMap<>(cache.get(cacheKey));
        }

        // 1. Primary: Query Open-Meteo Elevation API (100% Free, NO API Key needed, NASA SRTM / Copernicus DEM)
        try {
            String baseUrl = (openMeteoElevationUrl != null && !openMeteoElevationUrl.trim().isEmpty())
                    ? openMeteoElevationUrl.trim() : DEFAULT_OPEN_METEO_ELEVATION_URL;
            String url = String.format("%s?latitude=%.4f&longitude=%.4f", baseUrl, lat, lon);
            log.info("Querying Free Open-Meteo NASA SRTM Elevation API: lat={}, lon={}", lat, lon);

            String responseStr = restTemplate.getForObject(url, String.class);
            if (responseStr != null && !responseStr.trim().isEmpty()) {
                JsonNode root = objectMapper.readTree(responseStr);
                JsonNode elevNode = root.path("elevation");
                if (elevNode.isArray() && elevNode.size() > 0 && !elevNode.get(0).isNull()) {
                    double elevation = elevNode.get(0).asDouble();
                    Map<String, Object> result = new HashMap<>();
                    result.put("available", true);
                    result.put("latitude", lat);
                    result.put("longitude", lon);
                    result.put("elevationMeters", elevation);
                    result.put("elevation_meters", elevation); // legacy compatibility
                    result.put("source", "Open-Meteo (NASA SRTM DEM)");
                    result.put("dataset", DATASET);
                    result.put("resolutionMeters", RESOLUTION_METERS);
                    result.put("status", "SUCCESS");
                    result.put("unit", "Meters");

                    cache.put(cacheKey, result);
                    return result;
                }
            }
        } catch (Exception e) {
            log.warn("Open-Meteo elevation query failed for lat={}, lon={}: {}. Attempting fallback.", lat, lon, e.getMessage());
        }

        // 2. Secondary fallback: Query OpenTopography if API Key is configured
        if (openTopographyApiKey != null && !openTopographyApiKey.trim().isEmpty()) {
            String otUrl = String.format(
                    "%s?demtype=NASADEM&latitude=%.4f&longitude=%.4f&outputFormat=JSON&API_Key=%s",
                    OPENTOPOGRAPHY_BASE_URL, lat, lon, openTopographyApiKey.trim()
            );
            try {
                log.info("Querying fallback OpenTopography NASA DEM: lat={}, lon={}", lat, lon);
                String responseStr = restTemplate.getForObject(otUrl, String.class);
                if (responseStr != null && !responseStr.trim().isEmpty()) {
                    JsonNode root = objectMapper.readTree(responseStr);
                    if (root.has("Elevation")) {
                        double elevation = root.get("Elevation").asDouble();
                        Map<String, Object> result = new HashMap<>();
                        result.put("available", true);
                        result.put("latitude", lat);
                        result.put("longitude", lon);
                        result.put("elevationMeters", elevation);
                        result.put("elevation_meters", elevation);
                        result.put("source", "OpenTopography");
                        result.put("dataset", "NASADEM");
                        result.put("resolutionMeters", RESOLUTION_METERS);
                        result.put("status", "SUCCESS");
                        result.put("unit", "Meters");

                        cache.put(cacheKey, result);
                        return result;
                    }
                }
            } catch (Exception e) {
                log.warn("OpenTopography fallback also failed: {}", e.getMessage());
            }
        }

        // Unavailable state
        Map<String, Object> unavailable = new HashMap<>();
        unavailable.put("available", false);
        unavailable.put("latitude", lat);
        unavailable.put("longitude", lon);
        unavailable.put("source", "Open-Meteo / OpenTopography");
        unavailable.put("dataset", DATASET);
        unavailable.put("resolutionMeters", RESOLUTION_METERS);
        unavailable.put("error", "Elevation unavailable");
        unavailable.put("status", "UNAVAILABLE");
        unavailable.put("unit", "Meters");
        return unavailable;
    }
}
