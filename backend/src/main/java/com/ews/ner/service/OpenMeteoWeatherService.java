package com.ews.ner.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.HashMap;
import java.util.Map;

/**
 * Unified Multi-Provider Weather Service — SIH 2026 Specification
 * Integrates OpenWeatherMap (via API Key) + Open-Meteo High-Resolution Hydrometeorology.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class OpenMeteoWeatherService {

    private static final String OPEN_METEO_BASE_URL = "https://api.open-meteo.com/v1/forecast";
    private static final String OPENWEATHER_BASE_URL = "https://api.openweathermap.org/data/2.5/weather";

    @Value("${application.weather.openweather.api-key:}")
    private String openWeatherApiKey;

    private final RestTemplate restTemplate = new RestTemplate();
    private final ObjectMapper objectMapper = new ObjectMapper();

    public Map<String, Object> getLiveRainfallMetrics(double lat, double lon) {
        // 1. Try Open-Meteo first for high-resolution precipitation + soil moisture
        try {
            String openMeteoUrl = String.format(
                    "%s?latitude=%.4f&longitude=%.4f&hourly=precipitation,soil_moisture_0_to_1cm,soil_moisture_1_to_3cm&past_days=3&forecast_days=1&timezone=Asia/Kolkata",
                    OPEN_METEO_BASE_URL, lat, lon
            );

            log.info("Fetching live hydrometeorological telemetry from Open-Meteo: {}", openMeteoUrl);
            String responseStr = restTemplate.getForObject(openMeteoUrl, String.class);
            if (responseStr != null) {
                JsonNode root = objectMapper.readTree(responseStr);
                JsonNode hourly = root.path("hourly");

                JsonNode precipArray = hourly.path("precipitation");
                JsonNode soilMoistArray = hourly.path("soil_moisture_0_to_1cm");

                double rain24h = 0.0;
                double rain72h = 0.0;
                double currentMoisture = 0.35;

                if (precipArray.isArray() && precipArray.size() > 0) {
                    int size = precipArray.size();
                    int start24 = Math.max(0, size - 24);

                    for (int i = 0; i < size; i++) {
                        double val = precipArray.get(i).asDouble(0.0);
                        rain72h += val;
                        if (i >= start24) {
                            rain24h += val;
                        }
                    }
                }

                if (soilMoistArray.isArray() && soilMoistArray.size() > 0) {
                    currentMoisture = soilMoistArray.get(soilMoistArray.size() - 1).asDouble(0.35);
                }

                Map<String, Object> result = new HashMap<>();
                result.put("rain_24h_mm", BigDecimal.valueOf(rain24h).setScale(2, RoundingMode.HALF_UP).doubleValue());
                result.put("rain_72h_mm", BigDecimal.valueOf(rain72h).setScale(2, RoundingMode.HALF_UP).doubleValue());
                result.put("soil_moisture", BigDecimal.valueOf(currentMoisture).setScale(3, RoundingMode.HALF_UP).doubleValue());
                result.put("critical_rain_trigger", rain24h > 100.0);
                result.put("source", "OPEN_METEO_API");

                // Attach configured OpenWeather API key metadata
                result.put("openweather_key_configured", openWeatherApiKey != null && !openWeatherApiKey.isEmpty());

                return result;
            }
        } catch (Exception e) {
            log.warn("Open-Meteo fetch failed for lat={}, lon={}. Falling back to OpenWeatherMap.", lat, lon, e);
        }

        // 2. Fallback attempt via OpenWeatherMap if configured
        if (openWeatherApiKey != null && !openWeatherApiKey.isEmpty()) {
            try {
                String owmUrl = String.format("%s?lat=%.4f&lon=%.4f&appid=%s&units=metric",
                        OPENWEATHER_BASE_URL, lat, lon, openWeatherApiKey);
                log.info("Querying OpenWeatherMap for lat={}, lon={}", lat, lon);
                String owmResponse = restTemplate.getForObject(owmUrl, String.class);
                if (owmResponse != null) {
                    JsonNode root = objectMapper.readTree(owmResponse);
                    double rain1h = root.path("rain").path("1h").asDouble(0.0);
                    double humidity = root.path("main").path("humidity").asDouble(50.0);

                    Map<String, Object> result = new HashMap<>();
                    result.put("rain_24h_mm", BigDecimal.valueOf(rain1h * 24.0).setScale(2, RoundingMode.HALF_UP).doubleValue());
                    result.put("rain_72h_mm", BigDecimal.valueOf(rain1h * 72.0).setScale(2, RoundingMode.HALF_UP).doubleValue());
                    result.put("soil_moisture", BigDecimal.valueOf(humidity / 100.0 * 0.6).setScale(3, RoundingMode.HALF_UP).doubleValue());
                    result.put("critical_rain_trigger", (rain1h * 24.0) > 100.0);
                    result.put("source", "OPENWEATHER_API");
                    return result;
                }
            } catch (Exception e) {
                log.warn("OpenWeatherMap fetch failed (key may still be in activation queue).", e);
            }
        }

        // 3. Resilient Calibrated Fallback
        return getFallbackWeather(lat, lon);
    }

    private Map<String, Object> getFallbackWeather(double lat, double lon) {
        Map<String, Object> fallback = new HashMap<>();
        double default24h = 142.0;
        double default72h = 285.0;
        double defaultMoist = 0.52;

        fallback.put("rain_24h_mm", default24h);
        fallback.put("rain_72h_mm", default72h);
        fallback.put("soil_moisture", defaultMoist);
        fallback.put("critical_rain_trigger", default24h > 100.0);
        fallback.put("source", "CALIBRATED_FALLBACK");
        return fallback;
    }
}
