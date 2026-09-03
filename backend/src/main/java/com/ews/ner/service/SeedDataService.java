package com.ews.ner.service;

import com.ews.ner.domain.region.Region;
import com.ews.ner.domain.region.RegionRepository;
import com.ews.ner.domain.sensor.SensorReading;
import com.ews.ner.domain.sensor.SensorReadingRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.Random;

/**
 * SYNTHETIC DATA SEEDER — for demo purposes only.
 * Generates 30 days of realistic NER monsoon sensor readings for all SQL-seeded regions.
 * Regions are already in the DB via Flyway V2/V3/V4 migrations.
 * This service only seeds sensor readings + computes initial risk scores.
 * Idempotent: skips if sensor data already present.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class SeedDataService {

    private final RegionRepository regionRepo;
    private final SensorReadingRepository sensorRepo;
    private final RiskService riskService;

    @Value("${app.seed.enabled:true}")
    private boolean seedEnabled;

    // SYNTHETIC DATA — NER monsoon baseline [mean_mm_per_day, stddev]
    // Sourced from IMD climatological normals for Jun–Sep monsoon season
    private static final Map<String, double[]> DISTRICT_RAINFALL = Map.of(
        "East Khasi Hills",    new double[]{80, 30},  // Wettest district on Earth (Mawsynram proximity)
        "Kamrup Metropolitan", new double[]{25, 15},  // Guwahati valley — moderate monsoon
        "Aizawl",              new double[]{45, 20}   // Mizoram hills — high but below Meghalaya
    );
    private static final double[] DEFAULT_RAINFALL = new double[]{30, 12};

    @EventListener(ApplicationReadyEvent.class)
    public void seedData() {
        if (!seedEnabled) {
            log.info("Seed data disabled (app.seed.enabled=false) — skipping");
            return;
        }

        // Idempotency: sensor readings are the only thing we need to seed
        // (Regions, terrain, historical events, users come from Flyway SQL migrations V2–V4)
        if (sensorRepo.count() > 0) {
            log.info("Sensor readings already present ({} rows) — skipping synthetic seed", sensorRepo.count());
            return;
        }

        List<Region> regions = regionRepo.findAll();
        if (regions.isEmpty()) {
            log.warn("No regions found — Flyway V2 migration may not have run yet. Skipping sensor seed.");
            return;
        }

        log.info("Seeding SYNTHETIC monsoon sensor data for {} NER regions...", regions.size());

        // Deterministic seed for reproducible demo data — same data on every restart
        Random rnd = new Random(42);
        OffsetDateTime now = OffsetDateTime.now();
        int totalReadings = 0;

        for (Region region : regions) {
            double[] baseline = DISTRICT_RAINFALL.getOrDefault(region.getDistrict(), DEFAULT_RAINFALL);
            double baseMm = baseline[0];
            double stdDev  = baseline[1];

            // SYNTHETIC DATA — 31 days of daily readings (one per day at noon)
            // Wet/dry spell model: 2–5 day blocks; diurnal afternoon peak
            boolean inWetSpell = rnd.nextDouble() < 0.4;
            double rain72hAccum = 0;

            for (int daysAgo = 30; daysAgo >= 0; daysAgo--) {
                // Transition wet/dry spell every 2–5 days (random)
                if (daysAgo % (2 + rnd.nextInt(4)) == 0) {
                    inWetSpell = !inWetSpell;
                }

                double spellFactor = inWetSpell ? 1.8 : 0.3;
                double rain24h = Math.max(0, baseMm * spellFactor + rnd.nextGaussian() * stdDev);

                // Simple 72h rolling approximation
                rain72hAccum = rain72hAccum * 0.65 + rain24h * 1.4;
                rain72hAccum = Math.min(rain72hAccum, rain24h * 4);

                // Soil moisture: rises with rainfall, higher on steep clay-rich slopes
                double soilBase = 20 + (rain24h / 2.8) + (inWetSpell ? 22 : 0);
                boolean steepClay = region.getDistrict().equals("Aizawl")
                    || region.getDistrict().equals("East Khasi Hills");
                if (steepClay) soilBase *= 1.12;
                double soilMoisture = Math.min(95, Math.max(10, soilBase + rnd.nextGaussian() * 5));

                // SYNTHETIC DATA — labeled clearly; one reading per day at noon IST
                sensorRepo.save(SensorReading.builder()
                    .regionId(region.getId())
                    .rainfallMm24h(bd(rain24h, 2))
                    .rainfallMm72h(bd(rain72hAccum, 2))
                    .soilMoisturePct(bd(soilMoisture, 2))
                    .temperatureC(bd(22 + rnd.nextGaussian() * 3, 1))
                    .source("SYNTHETIC") // SYNTHETIC DATA — replace with IMD/AWS feed in production
                    .recordedAt(now.minusDays(daysAgo).withHour(12).withMinute(0).withSecond(0))
                    .build());
                totalReadings++;
            }
        }

        log.info("SYNTHETIC sensor seed complete: {} readings across {} regions", totalReadings, regions.size());

        // Compute initial risk scores for all regions
        log.info("Computing initial risk scores...");
        int scored = 0;
        for (Region region : regions) {
            try {
                riskService.computeAndSave(region.getId());
                scored++;
            } catch (Exception e) {
                log.warn("Risk score failed for region '{}': {}", region.getName(), e.getMessage());
            }
        }
        log.info("Initial risk scores ready: {}/{} regions scored", scored, regions.size());
    }

    private BigDecimal bd(double val, int scale) {
        return BigDecimal.valueOf(Math.max(0, val)).setScale(scale, RoundingMode.HALF_UP);
    }
}
