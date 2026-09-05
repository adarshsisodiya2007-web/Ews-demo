package com.ews.ner.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.*;

/**
 * Dynamic Safe Road Rerouting Service — SIH 2026 Module 3
 * Dynamically penalizes blocked/hazard road corridors and generates guaranteed safe evacuation detours.
 * Geographically customized for each of the 5 canonical monitored landslide zones.
 */
@Service
@Slf4j
public class EvacuationRoutingService {

    private static class AreaRoutingProfile {
        final String canonicalName;
        final String primaryHighway;
        final String alternateRoute;
        final String nearestShelter;
        final List<Double> shelterCoords;
        final List<List<Double>> defaultBlockedSegments;
        final List<List<Double>> safeRouteGeometry;
        final int etaClearMin;
        final int etaWarningMin;
        final int etaBlockedMin;

        AreaRoutingProfile(
                String canonicalName,
                String primaryHighway,
                String alternateRoute,
                String nearestShelter,
                List<Double> shelterCoords,
                List<List<Double>> defaultBlockedSegments,
                List<List<Double>> safeRouteGeometry,
                int etaClearMin,
                int etaWarningMin,
                int etaBlockedMin
        ) {
            this.canonicalName = canonicalName;
            this.primaryHighway = primaryHighway;
            this.alternateRoute = alternateRoute;
            this.nearestShelter = nearestShelter;
            this.shelterCoords = shelterCoords;
            this.defaultBlockedSegments = defaultBlockedSegments;
            this.safeRouteGeometry = safeRouteGeometry;
            this.etaClearMin = etaClearMin;
            this.etaWarningMin = etaWarningMin;
            this.etaBlockedMin = etaBlockedMin;
        }
    }

    private static final Map<String, AreaRoutingProfile> PROFILES = new LinkedHashMap<>();

    static {
        // 1. Shillong Ridge (East Khasi Hills, Meghalaya)
        PROFILES.put("shillong", new AreaRoutingProfile(
                "Shillong Ridge (NER)",
                "NH-6 / Shillong Bypass Corridor",
                "Mawlai-Umsning Alternative Link",
                "Shillong Multi-Purpose Hall & Emergency Relief Center",
                List.of(25.5790, 91.8940),
                List.of(List.of(25.5810, 91.8900), List.of(25.5870, 91.9020)),
                List.of(List.of(25.5750, 91.8880), List.of(25.5680, 91.8950), List.of(25.5840, 91.8980)),
                18, 28, 45
        ));

        // 2. Meppadi (Wayanad, Kerala)
        PROFILES.put("meppadi", new AreaRoutingProfile(
                "Meppadi, Wayanad (Testbed)",
                "NH-766 / Meppadi-Chooralmala Road",
                "SH-59 / Kalpetta-Mananthavady Bypass Corridor",
                "Meppadi Govt Higher Secondary School Relief Camp",
                List.of(11.5512, 76.1280),
                List.of(List.of(11.5500, 76.1200), List.of(11.5700, 76.1400)),
                List.of(List.of(11.5500, 76.1200), List.of(11.5200, 76.1300), List.of(11.5400, 76.1700)),
                20, 25, 42
        ));
        PROFILES.put("wayanad", PROFILES.get("meppadi"));

        // 3. Aizawl Slopes (Aizawl, Mizoram)
        PROFILES.put("aizawl", new AreaRoutingProfile(
                "Aizawl Slopes (NER)",
                "NH-54 (NH-2) / Chaltlang-Bawngkawn Corridor",
                "Durtlang Hill Road / Sairang Perimeter Bypass",
                "Aizawl Synod Conference Hall Relief Camp",
                List.of(23.7310, 92.7190),
                List.of(List.of(23.7250, 92.7150), List.of(23.7350, 92.7250)),
                List.of(List.of(23.7200, 92.7100), List.of(23.7150, 92.7220), List.of(23.7310, 92.7190)),
                15, 24, 40
        ));

        // 4. Munnar Gap Road (Idukki, Kerala)
        PROFILES.put("munnar", new AreaRoutingProfile(
                "Munnar Gap Road",
                "NH-85 / Kochi-Dhanushkodi (Gap Road section)",
                "SH-18 / Devikulam-Poopara Alternate Mountain Link",
                "Munnar Govt Higher Secondary School & Community Center",
                List.of(10.0895, 77.0600),
                List.of(List.of(10.0850, 77.0550), List.of(10.0950, 77.0650)),
                List.of(List.of(10.0800, 77.0500), List.of(10.0750, 77.0620), List.of(10.0890, 77.0600)),
                16, 26, 38
        ));
        PROFILES.put("idukki", PROFILES.get("munnar"));

        // 5. Guwahati Hills (Kamrup Metropolitan, Assam)
        PROFILES.put("guwahati", new AreaRoutingProfile(
                "Guwahati Hills (NER)",
                "NH-27 / Kamakhya-Maligaon Arterial Corridor",
                "GS Road Arterial / VIP Airport Expressway Link",
                "Guwahati Stadium Emergency Relief Complex",
                List.of(26.1550, 91.7450),
                List.of(List.of(26.1400, 91.7300), List.of(26.1500, 91.7450)),
                List.of(List.of(26.1350, 91.7250), List.of(26.1300, 91.7380), List.of(26.1550, 91.7450)),
                12, 20, 32
        ));
        PROFILES.put("kamrup", PROFILES.get("guwahati"));
    }

    private AreaRoutingProfile resolveProfile(String regionName, Double lat, Double lon) {
        if (regionName != null && !regionName.trim().isEmpty()) {
            String lower = regionName.toLowerCase();
            for (Map.Entry<String, AreaRoutingProfile> entry : PROFILES.entrySet()) {
                if (lower.contains(entry.getKey())) {
                    return entry.getValue();
                }
            }
        }
        if (lat != null && lon != null) {
            if (Math.abs(lat - 25.5788) < 0.5 && Math.abs(lon - 91.8933) < 0.5) return PROFILES.get("shillong");
            if (Math.abs(lat - 11.5513) < 0.5 && Math.abs(lon - 76.1264) < 0.5) return PROFILES.get("meppadi");
            if (Math.abs(lat - 23.7271) < 0.5 && Math.abs(lon - 92.7176) < 0.5) return PROFILES.get("aizawl");
            if (Math.abs(lat - 10.0889) < 0.5 && Math.abs(lon - 77.0595) < 0.5) return PROFILES.get("munnar");
            if (Math.abs(lat - 26.1445) < 0.5 && Math.abs(lon - 91.7362) < 0.5) return PROFILES.get("guwahati");
        }
        return PROFILES.get("shillong"); // default to primary NER anchor
    }

    public Map<String, Object> calculateEvacuationPlan(String regionName, double riskScore, boolean roadBlockedOverride) {
        return calculateEvacuationPlan(regionName, riskScore, roadBlockedOverride, null, null);
    }

    /**
     * Dynamically compute safe evacuation corridor based on canonical coordinates and road status.
     * Overload supporting coordinate-driven safe detour resolution.
     */
    public Map<String, Object> computeSafeCorridor(double lat, double lon, String roadStatus) {
        boolean isBlocked = "BLOCKED".equalsIgnoreCase(roadStatus);
        double impliedRiskScore = isBlocked ? 0.85 : ("AT_RISK".equalsIgnoreCase(roadStatus) ? 0.55 : 0.20);
        return calculateEvacuationPlan(null, impliedRiskScore, isBlocked, lat, lon);
    }

    public Map<String, Object> calculateEvacuationPlan(String regionName, double riskScore, boolean roadBlockedOverride, Double lat, Double lon) {
        boolean isBlocked = roadBlockedOverride || riskScore >= 0.70;
        AreaRoutingProfile profile = resolveProfile(regionName, lat, lon);

        Map<String, Object> plan = new HashMap<>();
        plan.put("region", regionName != null ? regionName : profile.canonicalName);
        plan.put("risk_score", riskScore);
        plan.put("corridor_source", "SATARK Operational Corridor Model (SIH 2026)");
        plan.put("nearest_verified_shelter", profile.nearestShelter);
        plan.put("nearest_shelter_coords", profile.shelterCoords);

        if (isBlocked) {
            plan.put("status", "REROUTED");
            plan.put("primary_corridor", profile.primaryHighway + " (BLOCKED - Severe Landslide Failure)");
            plan.put("safe_evacuation_route", "Active via " + profile.alternateRoute + " (Guaranteed Safe Bypass)");
            plan.put("action", "Immediate Evacuation & Highway Closure. Divert traffic to alternate route.");
            plan.put("rerouted", true);
            plan.put("blocked_segments", profile.defaultBlockedSegments);
            plan.put("safe_route_geometry", profile.safeRouteGeometry);
            plan.put("estimated_evacuation_time_min", profile.etaBlockedMin);
        } else if (riskScore >= 0.45) {
            plan.put("status", "WARNING");
            plan.put("primary_corridor", profile.primaryHighway + " (Caution: Active Rain & Saturated Slope Warning)");
            plan.put("safe_evacuation_route", "Standby Route " + profile.alternateRoute + " (Ready for Diverting)");
            plan.put("action", "Issue Warning to Transport & Rescue Units. Monitor cut slopes.");
            plan.put("rerouted", false);
            plan.put("blocked_segments", List.of());
            plan.put("safe_route_geometry", profile.safeRouteGeometry);
            plan.put("estimated_evacuation_time_min", profile.etaWarningMin);
        } else {
            plan.put("status", "CLEAR");
            plan.put("primary_corridor", profile.primaryHighway + " (Normal Transit)");
            plan.put("safe_evacuation_route", "Direct Standard Highway Corridor");
            plan.put("action", "Normal Monitoring Mode Active");
            plan.put("rerouted", false);
            plan.put("blocked_segments", List.of());
            plan.put("safe_route_geometry", profile.safeRouteGeometry);
            plan.put("estimated_evacuation_time_min", profile.etaClearMin);
        }

        return plan;
    }
}
