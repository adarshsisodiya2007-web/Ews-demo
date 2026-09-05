/**
 * SATARK — Canonical Shared Risk State (Single Source of Truth)
 * 
 * Provides unified, synchronized hazard and risk data across:
 * - Citizen Portal (Desktop & Mobile)
 * - Officer Dashboard & AI Priority Panel
 * - Responder Portal
 * - Native Android Capacitor App (Citizen & Officer)
 * 
 * Synchronized via clock-epoch 5-minute windows:
 *   scenarioIndex = Math.floor(Date.now() / (5 * 60 * 1000)) % SCENARIOS.length
 */

import { RegionRisk, RiskAssessmentResponse, RiskDetail, AlertItem, RoadStatus, Severity } from '../types';

export type CanonicalAreaId = 'MEPPADI' | 'MUNNAR' | 'GUWAHATI_HILLS' | 'SHILLONG_RIDGE' | 'AIZAWL_SLOPES';

export interface CanonicalArea {
  id: string;
  canonicalId: CanonicalAreaId;
  name: string;
  district: string;
  state: string;
  lat: number;
  lon: number;
  slope: number;
  elev: number;
}

export const CANONICAL_AREAS: CanonicalArea[] = [
  {
    id: '11111111-0001-0001-0001-000000000001',
    canonicalId: 'MEPPADI',
    name: 'Meppadi, Wayanad (Testbed)',
    district: 'Wayanad',
    state: 'Kerala',
    lat: 11.5513,
    lon: 76.1264,
    slope: 38.5,
    elev: 899.8
  },
  {
    id: '22222222-0002-0002-0002-000000000002',
    canonicalId: 'MUNNAR',
    name: 'Munnar, Idukki (Western Ghats)',
    district: 'Idukki',
    state: 'Kerala',
    lat: 10.0889,
    lon: 77.0595,
    slope: 42.0,
    elev: 1450.0
  },
  {
    id: '33333333-0003-0003-0003-000000000003',
    canonicalId: 'GUWAHATI_HILLS',
    name: 'Guwahati Hills (NER)',
    district: 'Kamrup Metropolitan',
    state: 'Assam',
    lat: 26.1445,
    lon: 91.7362,
    slope: 28.0,
    elev: 55.7
  },
  {
    id: '44444444-0004-0004-0004-000000000004',
    canonicalId: 'SHILLONG_RIDGE',
    name: 'Shillong Ridge (NER)',
    district: 'East Khasi Hills',
    state: 'Meghalaya',
    lat: 25.5788,
    lon: 91.8933,
    slope: 34.0,
    elev: 1428.3
  },
  {
    id: '55555555-0005-0005-0005-000000000005',
    canonicalId: 'AIZAWL_SLOPES',
    name: 'Aizawl Slopes (NER)',
    district: 'Aizawl',
    state: 'Mizoram',
    lat: 23.7271,
    lon: 92.7176,
    slope: 45.0,
    elev: 1070.3
  }
];

export interface AreaRiskState {
  canonicalId: CanonicalAreaId;
  areaName: string;
  severity: Severity;
  score: number;             // 0.0 - 1.0 (e.g. 0.88)
  computedScore: number;     // 0 - 100 (e.g. 88)
  rain24h: number;           // mm
  rain72h: number;           // mm
  soilMoisture: number;      // 0.0 - 1.0 (e.g. 0.88)
  slope: number;             // deg
  elev: number;              // meters
  roadStatus: RoadStatus;
  actionProtocol: string;
  evacuationStatus: string;
  primaryCorridor: string;
  safeRoute: string;
  nearestShelter: string;
  shelterDistanceKm: number;
  estimatedTimeMin: number;
  citizenReportsCount: number;
}

export interface DemoScenario {
  id: string;
  label: string;
  description: string;
  criticalCount: number;
  highCount: number;
  moderateCount: number;
  lowCount: number;
  areas: Record<string, AreaRiskState>;
}

// Canonical Shelters per Area
export const AREA_SHELTERS: Record<CanonicalAreaId, { name: string; distanceKm: number }> = {
  MEPPADI: { name: 'Meppadi Govt Higher Secondary School Camp', distanceKm: 1.2 },
  MUNNAR: { name: 'Munnar Govt High School Community Shelter', distanceKm: 0.9 },
  GUWAHATI_HILLS: { name: 'Guwahati Stadium Relief Complex', distanceKm: 2.1 },
  SHILLONG_RIDGE: { name: 'Shillong Multi-Purpose Hall Relief Camp', distanceKm: 0.8 },
  AIZAWL_SLOPES: { name: 'Aizawl Synod Conference Relief Center', distanceKm: 1.5 }
};

/** Helper to construct area risk state indexed by both ID and Name */
function createScenarioAreas(areaList: AreaRiskState[]): Record<string, AreaRiskState> {
  const map: Record<string, AreaRiskState> = {};
  for (const a of areaList) {
    map[a.canonicalId] = a;
    map[a.areaName] = a;
  }
  return map;
}

export const DEMO_SCENARIOS: DemoScenario[] = [
  {
    id: 'scenario-a',
    label: 'Scenario A (Default - 2 Critical)',
    description: 'High monsoon trigger: Shillong Ridge & Meppadi at CRITICAL risk, Aizawl HIGH, Munnar MODERATE, Guwahati LOW',
    criticalCount: 2,
    highCount: 1,
    moderateCount: 1,
    lowCount: 1,
    areas: createScenarioAreas([
      {
        canonicalId: 'SHILLONG_RIDGE',
        areaName: 'Shillong Ridge (NER)',
        severity: 'CRITICAL',
        score: 0.88,
        computedScore: 88,
        rain24h: 210.0,
        rain72h: 385.0,
        soilMoisture: 0.88,
        slope: 34.0,
        elev: 1428.3,
        roadStatus: 'BLOCKED',
        actionProtocol: 'Immediate Evacuation & Highway Closure. High debris-flow susceptibility on Shillong Bypass.',
        evacuationStatus: 'REROUTED',
        primaryCorridor: 'NH-6 / Shillong Bypass (BLOCKED - Severe Slope Failure)',
        safeRoute: 'Recommended Evacuation Route: Mawlai-Umsning Alternative Link (Subject to real-time ground confirmation)',
        nearestShelter: AREA_SHELTERS.SHILLONG_RIDGE.name,
        shelterDistanceKm: AREA_SHELTERS.SHILLONG_RIDGE.distanceKm,
        estimatedTimeMin: 45,
        citizenReportsCount: 4
      },
      {
        canonicalId: 'MEPPADI',
        areaName: 'Meppadi, Wayanad (Testbed)',
        severity: 'CRITICAL',
        score: 0.84,
        computedScore: 84,
        rain24h: 195.0,
        rain72h: 360.0,
        soilMoisture: 0.84,
        slope: 38.5,
        elev: 899.8,
        roadStatus: 'BLOCKED',
        actionProtocol: 'Immediate Evacuation & Highway Closure. Critical runoff along tea estate slopes.',
        evacuationStatus: 'REROUTED',
        primaryCorridor: 'NH-766 / Meppadi-Chooralmala Rd (BLOCKED - High Debris Flow)',
        safeRoute: 'Recommended Evacuation Route: Kalpetta Bypass Corridor (Subject to ground confirmation)',
        nearestShelter: AREA_SHELTERS.MEPPADI.name,
        shelterDistanceKm: AREA_SHELTERS.MEPPADI.distanceKm,
        estimatedTimeMin: 45,
        citizenReportsCount: 3
      },
      {
        canonicalId: 'AIZAWL_SLOPES',
        areaName: 'Aizawl Slopes (NER)',
        severity: 'HIGH',
        score: 0.68,
        computedScore: 68,
        rain24h: 135.0,
        rain72h: 250.0,
        soilMoisture: 0.72,
        slope: 45.0,
        elev: 1070.3,
        roadStatus: 'AT_RISK',
        actionProtocol: 'High Landslide Risk. Restrict heavy transit, alert NDRF field units, monitor hillside cracks.',
        evacuationStatus: 'CAUTION',
        primaryCorridor: 'NH-54 / Chaltlang Corridor (AT_RISK - Single Lane Transit)',
        safeRoute: 'Recommended Evacuation Route: Durtlang Hill Road via West Ridge',
        nearestShelter: AREA_SHELTERS.AIZAWL_SLOPES.name,
        shelterDistanceKm: AREA_SHELTERS.AIZAWL_SLOPES.distanceKm,
        estimatedTimeMin: 32,
        citizenReportsCount: 1
      },
      {
        canonicalId: 'MUNNAR',
        areaName: 'Munnar, Idukki (Western Ghats)',
        severity: 'MODERATE',
        score: 0.48,
        computedScore: 48,
        rain24h: 75.0,
        rain72h: 150.0,
        soilMoisture: 0.55,
        slope: 42.0,
        elev: 1450.0,
        roadStatus: 'OPEN',
        actionProtocol: 'Issue Pre-warning. Prepare emergency shelters and monitor geotechnical sensors.',
        evacuationStatus: 'CLEAR',
        primaryCorridor: 'NH-85 / Kochi-Dhanushkodi Rd (OPEN)',
        safeRoute: 'Standard Transit Route: NH-85',
        nearestShelter: AREA_SHELTERS.MUNNAR.name,
        shelterDistanceKm: AREA_SHELTERS.MUNNAR.distanceKm,
        estimatedTimeMin: 20,
        citizenReportsCount: 0
      },
      {
        canonicalId: 'GUWAHATI_HILLS',
        areaName: 'Guwahati Hills (NER)',
        severity: 'LOW',
        score: 0.22,
        computedScore: 22,
        rain24h: 20.0,
        rain72h: 45.0,
        soilMoisture: 0.35,
        slope: 28.0,
        elev: 55.7,
        roadStatus: 'OPEN',
        actionProtocol: 'Normal Monitoring Active. Telemetry stable.',
        evacuationStatus: 'CLEAR',
        primaryCorridor: 'GS Road / Kamakhya Corridor (OPEN)',
        safeRoute: 'Standard Transit Route: GS Road',
        nearestShelter: AREA_SHELTERS.GUWAHATI_HILLS.name,
        shelterDistanceKm: AREA_SHELTERS.GUWAHATI_HILLS.distanceKm,
        estimatedTimeMin: 20,
        citizenReportsCount: 0
      }
    ])
  },
  {
    id: 'scenario-b',
    label: 'Scenario B (Meppadi & Munnar Critical)',
    description: 'South Corridor surge: Meppadi & Munnar Gap Road at CRITICAL risk, Shillong HIGH, Aizawl MODERATE, Guwahati LOW',
    criticalCount: 2,
    highCount: 1,
    moderateCount: 1,
    lowCount: 1,
    areas: createScenarioAreas([
      {
        canonicalId: 'MEPPADI',
        areaName: 'Meppadi, Wayanad (Testbed)',
        severity: 'CRITICAL',
        score: 0.92,
        computedScore: 92,
        rain24h: 235.0,
        rain72h: 420.0,
        soilMoisture: 0.92,
        slope: 38.5,
        elev: 899.8,
        roadStatus: 'BLOCKED',
        actionProtocol: 'Immediate Evacuation & Highway Closure. Massive slope saturation in Chooralmala tea estates.',
        evacuationStatus: 'REROUTED',
        primaryCorridor: 'NH-766 / Meppadi-Chooralmala Rd (BLOCKED - Severe Sludge Flow)',
        safeRoute: 'Recommended Evacuation Route: Kalpetta Bypass Corridor',
        nearestShelter: AREA_SHELTERS.MEPPADI.name,
        shelterDistanceKm: AREA_SHELTERS.MEPPADI.distanceKm,
        estimatedTimeMin: 45,
        citizenReportsCount: 5
      },
      {
        canonicalId: 'MUNNAR',
        areaName: 'Munnar, Idukki (Western Ghats)',
        severity: 'CRITICAL',
        score: 0.86,
        computedScore: 86,
        rain24h: 190.0,
        rain72h: 340.0,
        soilMoisture: 0.86,
        slope: 42.0,
        elev: 1450.0,
        roadStatus: 'BLOCKED',
        actionProtocol: 'Immediate Evacuation & Highway Closure. Extreme debris-flow threat near Gap Road.',
        evacuationStatus: 'REROUTED',
        primaryCorridor: 'Gap Road / NH-85 (BLOCKED - Landslide Debris)',
        safeRoute: 'Recommended Evacuation Route: Devikulam-Poopara Bypass (Subject to ground confirmation)',
        nearestShelter: AREA_SHELTERS.MUNNAR.name,
        shelterDistanceKm: AREA_SHELTERS.MUNNAR.distanceKm,
        estimatedTimeMin: 45,
        citizenReportsCount: 3
      },
      {
        canonicalId: 'SHILLONG_RIDGE',
        areaName: 'Shillong Ridge (NER)',
        severity: 'HIGH',
        score: 0.72,
        computedScore: 72,
        rain24h: 145.0,
        rain72h: 260.0,
        soilMoisture: 0.74,
        slope: 34.0,
        elev: 1428.3,
        roadStatus: 'AT_RISK',
        actionProtocol: 'High Landslide Risk. Monitor hillside retaining walls and restrict heavy traffic.',
        evacuationStatus: 'CAUTION',
        primaryCorridor: 'NH-6 (AT_RISK - Mudslides Reported)',
        safeRoute: 'Recommended Evacuation Route: Mawlai Link Road',
        nearestShelter: AREA_SHELTERS.SHILLONG_RIDGE.name,
        shelterDistanceKm: AREA_SHELTERS.SHILLONG_RIDGE.distanceKm,
        estimatedTimeMin: 32,
        citizenReportsCount: 2
      },
      {
        canonicalId: 'AIZAWL_SLOPES',
        areaName: 'Aizawl Slopes (NER)',
        severity: 'MODERATE',
        score: 0.45,
        computedScore: 45,
        rain24h: 70.0,
        rain72h: 140.0,
        soilMoisture: 0.52,
        slope: 45.0,
        elev: 1070.3,
        roadStatus: 'OPEN',
        actionProtocol: 'Issue Pre-warning. Continuous telemetry monitoring active.',
        evacuationStatus: 'CLEAR',
        primaryCorridor: 'NH-54 (OPEN)',
        safeRoute: 'Standard Transit Route: NH-54',
        nearestShelter: AREA_SHELTERS.AIZAWL_SLOPES.name,
        shelterDistanceKm: AREA_SHELTERS.AIZAWL_SLOPES.distanceKm,
        estimatedTimeMin: 20,
        citizenReportsCount: 0
      },
      {
        canonicalId: 'GUWAHATI_HILLS',
        areaName: 'Guwahati Hills (NER)',
        severity: 'LOW',
        score: 0.18,
        computedScore: 18,
        rain24h: 18.0,
        rain72h: 40.0,
        soilMoisture: 0.32,
        slope: 28.0,
        elev: 55.7,
        roadStatus: 'OPEN',
        actionProtocol: 'Normal Monitoring Active. Telemetry stable.',
        evacuationStatus: 'CLEAR',
        primaryCorridor: 'GS Road (OPEN)',
        safeRoute: 'Standard Transit Route: GS Road',
        nearestShelter: AREA_SHELTERS.GUWAHATI_HILLS.name,
        shelterDistanceKm: AREA_SHELTERS.GUWAHATI_HILLS.distanceKm,
        estimatedTimeMin: 20,
        citizenReportsCount: 0
      }
    ])
  },
  {
    id: 'scenario-c',
    label: 'Scenario C (Aizawl Critical)',
    description: 'Eastern ridge tectonic/rain trigger: Aizawl Slopes at CRITICAL risk, Shillong HIGH, Meppadi & Munnar MODERATE, Guwahati LOW',
    criticalCount: 1,
    highCount: 1,
    moderateCount: 2,
    lowCount: 1,
    areas: createScenarioAreas([
      {
        canonicalId: 'AIZAWL_SLOPES',
        areaName: 'Aizawl Slopes (NER)',
        severity: 'CRITICAL',
        score: 0.85,
        computedScore: 85,
        rain24h: 200.0,
        rain72h: 370.0,
        soilMoisture: 0.86,
        slope: 45.0,
        elev: 1070.3,
        roadStatus: 'BLOCKED',
        actionProtocol: 'Immediate Evacuation & Highway Closure. High shear-strain detection along Chaltlang ridge.',
        evacuationStatus: 'REROUTED',
        primaryCorridor: 'NH-54 / Sairang Arterial (BLOCKED - Severe Slump)',
        safeRoute: 'Recommended Evacuation Route: Lengpui-Sikulpuia Perimeter Bypass',
        nearestShelter: AREA_SHELTERS.AIZAWL_SLOPES.name,
        shelterDistanceKm: AREA_SHELTERS.AIZAWL_SLOPES.distanceKm,
        estimatedTimeMin: 45,
        citizenReportsCount: 4
      },
      {
        canonicalId: 'SHILLONG_RIDGE',
        areaName: 'Shillong Ridge (NER)',
        severity: 'HIGH',
        score: 0.65,
        computedScore: 65,
        rain24h: 130.0,
        rain72h: 240.0,
        soilMoisture: 0.68,
        slope: 34.0,
        elev: 1428.3,
        roadStatus: 'AT_RISK',
        actionProtocol: 'High Landslide Risk. Pre-position disaster rescue equipment and restrict heavy transit.',
        evacuationStatus: 'CAUTION',
        primaryCorridor: 'NH-6 (AT_RISK)',
        safeRoute: 'Recommended Evacuation Route: Mawlai Link Road',
        nearestShelter: AREA_SHELTERS.SHILLONG_RIDGE.name,
        shelterDistanceKm: AREA_SHELTERS.SHILLONG_RIDGE.distanceKm,
        estimatedTimeMin: 32,
        citizenReportsCount: 2
      },
      {
        canonicalId: 'MEPPADI',
        areaName: 'Meppadi, Wayanad (Testbed)',
        severity: 'MODERATE',
        score: 0.42,
        computedScore: 42,
        rain24h: 65.0,
        rain72h: 135.0,
        soilMoisture: 0.50,
        slope: 38.5,
        elev: 899.8,
        roadStatus: 'OPEN',
        actionProtocol: 'Issue Pre-warning. Soil saturation moderate, slope sensors nominal.',
        evacuationStatus: 'CLEAR',
        primaryCorridor: 'NH-766 (OPEN)',
        safeRoute: 'Standard Transit Route: NH-766',
        nearestShelter: AREA_SHELTERS.MEPPADI.name,
        shelterDistanceKm: AREA_SHELTERS.MEPPADI.distanceKm,
        estimatedTimeMin: 20,
        citizenReportsCount: 0
      },
      {
        canonicalId: 'MUNNAR',
        areaName: 'Munnar, Idukki (Western Ghats)',
        severity: 'MODERATE',
        score: 0.39,
        computedScore: 39,
        rain24h: 55.0,
        rain72h: 120.0,
        soilMoisture: 0.46,
        slope: 42.0,
        elev: 1450.0,
        roadStatus: 'OPEN',
        actionProtocol: 'Issue Pre-warning. Rain subsidence detected.',
        evacuationStatus: 'CLEAR',
        primaryCorridor: 'NH-85 (OPEN)',
        safeRoute: 'Standard Transit Route: NH-85',
        nearestShelter: AREA_SHELTERS.MUNNAR.name,
        shelterDistanceKm: AREA_SHELTERS.MUNNAR.distanceKm,
        estimatedTimeMin: 20,
        citizenReportsCount: 0
      },
      {
        canonicalId: 'GUWAHATI_HILLS',
        areaName: 'Guwahati Hills (NER)',
        severity: 'LOW',
        score: 0.15,
        computedScore: 15,
        rain24h: 15.0,
        rain72h: 35.0,
        soilMoisture: 0.28,
        slope: 28.0,
        elev: 55.7,
        roadStatus: 'OPEN',
        actionProtocol: 'Normal Monitoring Active. Cloud cover light, stability high.',
        evacuationStatus: 'CLEAR',
        primaryCorridor: 'GS Road (OPEN)',
        safeRoute: 'Standard Transit Route: GS Road',
        nearestShelter: AREA_SHELTERS.GUWAHATI_HILLS.name,
        shelterDistanceKm: AREA_SHELTERS.GUWAHATI_HILLS.distanceKm,
        estimatedTimeMin: 20,
        citizenReportsCount: 0
      }
    ])
  }
];

// 5-minute synchronization constants
export const SCENARIO_INTERVAL_MS = 5 * 60 * 1000; // 300,000 ms

// In-memory road status modifications during session
const sessionRoadOverrides: Record<string, RoadStatus> = {};

/** Resolves any area query (canonicalId, UUID, name or substring) to canonical area object */
export function resolveCanonicalArea(query?: string | null): CanonicalArea {
  if (!query) return CANONICAL_AREAS[0];
  const q = query.trim().toUpperCase();

  // Exact ID or canonical ID match
  const byId = CANONICAL_AREAS.find(a => a.canonicalId === q || a.id === query);
  if (byId) return byId;

  // Substring or partial name match
  const byName = CANONICAL_AREAS.find(a =>
    a.name.toUpperCase().includes(q) ||
    q.includes(a.name.toUpperCase()) ||
    a.canonicalId.includes(q) ||
    q.includes(a.canonicalId) ||
    a.district.toUpperCase().includes(q) ||
    q.includes(a.district.toUpperCase())
  );
  return byName || CANONICAL_AREAS[0];
}

/** Get current scenario index deterministically from clock epoch or manual override */
export function getSynchronizedScenarioIndex(): number {
  if (typeof window !== 'undefined') {
    const override = localStorage.getItem('satark_demo_scenario_override');
    if (override !== null && override !== '' && !isNaN(Number(override))) {
      return Math.abs(Number(override)) % DEMO_SCENARIOS.length;
    }
    if ((window as any).__SATARK_SCENARIO_OVERRIDE !== undefined) {
      return Math.abs(Number((window as any).__SATARK_SCENARIO_OVERRIDE)) % DEMO_SCENARIOS.length;
    }
  }
  return Math.floor(Date.now() / SCENARIO_INTERVAL_MS) % DEMO_SCENARIOS.length;
}

/** Check if a manual demo override is currently active */
export function isScenarioOverrideActive(): boolean {
  if (typeof window === 'undefined') return false;
  const override = localStorage.getItem('satark_demo_scenario_override');
  return override !== null && override !== '';
}

/** Set manual scenario override (e.g. for judge demo testing) */
export function setScenarioOverride(index: number | null): void {
  if (typeof window === 'undefined') return;
  if (index === null) {
    localStorage.removeItem('satark_demo_scenario_override');
    delete (window as any).__SATARK_SCENARIO_OVERRIDE;
  } else {
    const validIdx = Math.abs(index) % DEMO_SCENARIOS.length;
    localStorage.setItem('satark_demo_scenario_override', validIdx.toString());
    (window as any).__SATARK_SCENARIO_OVERRIDE = validIdx;
  }
  window.dispatchEvent(new CustomEvent('satark-scenario-changed', {
    detail: { scenarioIndex: getSynchronizedScenarioIndex(), isOverride: isScenarioOverrideActive() }
  }));
}

/** Advance to the next scenario */
export function advanceToNextScenario(): number {
  const current = getSynchronizedScenarioIndex();
  const next = (current + 1) % DEMO_SCENARIOS.length;
  setScenarioOverride(next);
  return next;
}

// Expose safe control on window for automated evaluation or console testing
if (typeof window !== 'undefined') {
  (window as any).__SATARK_SET_SCENARIO = setScenarioOverride;
  (window as any).__SATARK_NEXT_SCENARIO = advanceToNextScenario;
  (window as any).__SATARK_GET_SCENARIO = getSynchronizedScenarioIndex;
}

/** Get the currently active scenario */
export function getActiveScenario(): DemoScenario {
  const idx = getSynchronizedScenarioIndex();
  return DEMO_SCENARIOS[idx] || DEMO_SCENARIOS[0];
}

/**
 * Get unified RegionRisk[] representation of the 5 canonical monitored areas.
 * Directly consumed by:
 * - Officer OfficialDashboard (GIS map & stat counters)
 * - AIPriorityPanel (AI incident ranking)
 * - ResponderPortal
 * - SatarkOfficerApp (Android GIS map)
 */
export function getSharedRegionRisks(): RegionRisk[] {
  const scenario = getActiveScenario();

  return CANONICAL_AREAS.map(area => {
    const state: AreaRiskState = scenario.areas[area.canonicalId] || scenario.areas[area.name] || {
      canonicalId: area.canonicalId,
      areaName: area.name,
      severity: 'LOW',
      score: 0.20,
      computedScore: 20,
      rain24h: 15.0,
      rain72h: 30.0,
      soilMoisture: 0.30,
      slope: area.slope,
      elev: area.elev,
      roadStatus: 'OPEN',
      actionProtocol: 'Normal Monitoring Active.',
      evacuationStatus: 'CLEAR',
      primaryCorridor: 'Main Arterial Corridor',
      safeRoute: 'Standard Route',
      nearestShelter: AREA_SHELTERS[area.canonicalId]?.name || 'District Emergency Shelter',
      shelterDistanceKm: AREA_SHELTERS[area.canonicalId]?.distanceKm || 2.0,
      estimatedTimeMin: 20,
      citizenReportsCount: 0
    };

    const roadStatus = sessionRoadOverrides[area.canonicalId] ||
                       sessionRoadOverrides[area.id] ||
                       sessionRoadOverrides[area.name] ||
                       state.roadStatus;

    return {
      regionId: area.id,
      canonicalId: area.canonicalId,
      name: area.name,
      district: area.district,
      state: area.state,
      centroidLat: area.lat,
      centroidLng: area.lon,
      severity: state.severity,
      computedScore: state.computedScore,
      computedAt: new Date().toISOString(),
      roadStatus,
      primaryCorridor: state.primaryCorridor,
      safeRoute: state.safeRoute,
      rain24h: state.rain24h,
      rain72h: state.rain72h,
      soilMoisture: state.soilMoisture,
      slope: area.slope,
      elev: area.elev,
      nearestShelter: state.nearestShelter,
      shelterDistanceKm: state.shelterDistanceKm,
      estimatedTimeMin: state.estimatedTimeMin,
      actionProtocol: state.actionProtocol,
      citizenReportsCount: state.citizenReportsCount,
      contributingFactors: {
        rainfall: {
          score: Number((state.rain24h / 220.0).toFixed(2)),
          weight: 0.35,
          contribution: Number(((state.rain24h / 220.0) * 0.35).toFixed(3)),
          label: `${state.rain24h}mm/24h, ${state.rain72h}mm/72h`
        },
        soilMoisture: {
          score: state.soilMoisture,
          weight: 0.25,
          contribution: Number((state.soilMoisture * 0.25).toFixed(3)),
          label: `Soil ${(state.soilMoisture * 100).toFixed(0)}% saturated`
        },
        slope: {
          score: Number((area.slope / 50.0).toFixed(2)),
          weight: 0.20,
          contribution: Number(((area.slope / 50.0) * 0.20).toFixed(3)),
          label: `Slope angle ${area.slope}°`
        },
        history: {
          score: state.severity === 'CRITICAL' ? 0.85 : state.severity === 'HIGH' ? 0.60 : 0.20,
          weight: 0.12,
          contribution: Number(((state.severity === 'CRITICAL' ? 0.85 : 0.30) * 0.12).toFixed(3)),
          label: state.severity === 'CRITICAL' ? 'Historical recurring failure zone' : 'Low historical recurrence'
        },
        citizenReports: {
          score: state.severity === 'CRITICAL' ? 0.75 : state.severity === 'HIGH' ? 0.50 : 0.10,
          weight: 0.08,
          contribution: Number(((state.severity === 'CRITICAL' ? 0.75 : 0.10) * 0.08).toFixed(3)),
          label: state.severity === 'CRITICAL' ? 'Corroborated by field reports' : 'No unverified reports'
        }
      }
    };
  });
}

/**
 * Get unified RiskAssessmentResponse for a specific zone.
 * Consumed by:
 * - CitizenPortal
 * - SatarkCitizenApp (Android)
 * - api.ts fetchRiskAssessment fallback
 */
export function getSharedRiskForZone(zoneKey?: string | null): RiskAssessmentResponse {
  const scenario = getActiveScenario();
  const canonical = resolveCanonicalArea(zoneKey);
  const state: AreaRiskState = scenario.areas[canonical.canonicalId] ||
                              scenario.areas[canonical.name] ||
                              scenario.areas[CANONICAL_AREAS[0].name];

  const roadStatus = sessionRoadOverrides[canonical.canonicalId] ||
                     sessionRoadOverrides[canonical.id] ||
                     sessionRoadOverrides[canonical.name] ||
                     state.roadStatus;

  const isCrit = state.severity === 'CRITICAL';
  const isHigh = state.severity === 'HIGH';

  return {
    location: {
      lat: canonical.lat,
      lon: canonical.lon,
      slope_deg: canonical.slope,
      region_name: canonical.name
    },
    weather: {
      rain_24h_mm: state.rain24h,
      rain_72h_mm: state.rain72h,
      soil_moisture: state.soilMoisture,
      critical_rain_trigger: isCrit || state.rain24h >= 100.0,
      source: 'MCDA_ESTIMATED_TELEMETRY'
    },
    terrain_elevation: {
      available: true,
      latitude: canonical.lat,
      longitude: canonical.lon,
      elevationMeters: canonical.elev,
      source: 'OpenTopography',
      dataset: 'NASADEM_30M',
      resolutionMeters: 30
    },
    assessment: {
      score: state.score,
      level: ((isCrit || isHigh) ? 'RED' : (state.severity === 'MODERATE' ? 'AMBER' : 'GREEN')) as 'RED' | 'AMBER' | 'GREEN',
      severity: state.severity,
      action_protocol: state.actionProtocol,
      feature_breakdown: {
        norm_slope: Number((canonical.slope / 50.0).toFixed(2)),
        norm_r24: Number(Math.min(1.0, state.rain24h / 200.0).toFixed(2)),
        norm_r72: Number(Math.min(1.0, state.rain72h / 350.0).toFixed(2)),
        norm_moisture: Number(Math.min(1.0, state.soilMoisture / 0.60).toFixed(2))
      }
    },
    evacuation_plan: {
      region: canonical.name,
      risk_score: state.score,
      status: isCrit ? 'REROUTED' : 'CLEAR',
      primary_corridor: state.primaryCorridor,
      safe_evacuation_route: state.safeRoute,
      action: state.actionProtocol,
      rerouted: isCrit,
      corridor_source: 'SATARK Operational Corridor Model (SIH 2026)',
      nearest_verified_shelter: `${state.nearestShelter} (${state.shelterDistanceKm} km)`,
      blocked_segments: (isCrit || roadStatus === 'BLOCKED')
        ? [[canonical.lat - 0.003, canonical.lon - 0.012], [canonical.lat + 0.017, canonical.lon + 0.008]]
        : [],
      safe_route_geometry: [
        [canonical.lat - 0.003, canonical.lon - 0.012],
        [canonical.lat - 0.033, canonical.lon - 0.002],
        [canonical.lat - 0.013, canonical.lon + 0.038]
      ],
      estimated_evacuation_time_min: state.estimatedTimeMin
    }
  };
}

/**
 * Get unified RiskDetail for a specific region ID.
 * Consumed by Officer RegionDetailPanel.
 */
export function getSharedRiskDetail(regionId: string): RiskDetail | null {
  const regions = getSharedRegionRisks();
  const canonical = resolveCanonicalArea(regionId);
  const region = regions.find(r => r.regionId === canonical.id || r.canonicalId === canonical.canonicalId) || regions[0];
  if (!region) return null;

  const readings = [];
  const now = new Date();
  const baseRain = region.computedScore * 1.8;

  for (let i = 23; i >= 0; i--) {
    const t = new Date(now.getTime() - i * 3600000);
    const diurnal = Math.sin((t.getHours() - 6) * Math.PI / 12) * 0.3 + 0.7;
    readings.push({
      rainfallMm24h: parseFloat((baseRain * diurnal * 0.1).toFixed(1)),
      rainfallMm72h: parseFloat((baseRain * 2.2 * 0.1).toFixed(1)),
      soilMoisturePct: parseFloat((35 + region.computedScore * 0.55).toFixed(1)),
      recordedAt: t.toISOString(),
    });
  }

  return {
    ...region,
    recentReports: [],
    weatherTrend: readings
  };
}

/**
 * Get synchronized AlertItem[] for CRITICAL and HIGH areas in the active scenario.
 * Consumed by LiveAlertTicker and Officer alert lists.
 */
export function getSharedRecentAlerts(): AlertItem[] {
  const regions = getSharedRegionRisks();
  const elevated = regions.filter(r => r.severity === 'CRITICAL' || r.severity === 'HIGH');

  return elevated.map((r, idx) => ({
    id: `alert-sync-${r.regionId.substring(0, 8)}`,
    regionId: r.regionId,
    regionName: r.name,
    severity: r.severity,
    messageEn: `${r.severity} landslide hazard (${r.computedScore}/100) at ${r.name}. ${r.severity === 'CRITICAL' ? 'IMMEDIATE EVACUATION ADVISED. Highway closure in effect.' : 'Pre-warning active. Restrict transit.'}`,
    messageAs: null,
    contributingSummary: `Rain: ${r.contributingFactors?.rainfall?.label || ''} · Soil: ${r.contributingFactors?.soilMoisture?.label || ''}`,
    computedScore: r.computedScore,
    status: 'SENT',
    createdAt: new Date(Date.now() - (idx + 1) * 12 * 60000).toISOString()
  }));
}

/** Update road corridor status across both portals */
export function updateSharedRoadStatus(regionId: string, status: RoadStatus): void {
  sessionRoadOverrides[regionId] = status;
  const canonical = resolveCanonicalArea(regionId);
  if (canonical) {
    sessionRoadOverrides[canonical.id] = status;
    sessionRoadOverrides[canonical.canonicalId] = status;
    sessionRoadOverrides[canonical.name] = status;
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('satark-scenario-changed', {
      detail: { scenarioIndex: getSynchronizedScenarioIndex(), roadUpdate: { regionId, status } }
    }));
  }
}

/**
 * Subscribes component to synchronized scenario transitions.
 * Listens for:
 * 1. Periodic epoch timer check (detects 5-minute boundaries)
 * 2. CustomEvent 'satark-scenario-changed'
 * 3. Cross-tab localStorage updates
 */
export function subscribeToScenario(callback: (scenarioIndex: number) => void): () => void {
  if (typeof window === 'undefined') return () => {};

  let lastIndex = getSynchronizedScenarioIndex();

  const handleCustomEvent = (e: any) => {
    const idx = e.detail?.scenarioIndex ?? getSynchronizedScenarioIndex();
    lastIndex = idx;
    callback(idx);
  };

  const handleStorage = (e: StorageEvent) => {
    if (e.key === 'satark_demo_scenario_override') {
      const idx = getSynchronizedScenarioIndex();
      lastIndex = idx;
      callback(idx);
    }
  };

  // Check every 4 seconds if the 5-minute clock epoch rotated
  const interval = setInterval(() => {
    const currentIndex = getSynchronizedScenarioIndex();
    if (currentIndex !== lastIndex) {
      lastIndex = currentIndex;
      callback(currentIndex);
    }
  }, 4000);

  window.addEventListener('satark-scenario-changed', handleCustomEvent);
  window.addEventListener('storage', handleStorage);

  return () => {
    clearInterval(interval);
    window.removeEventListener('satark-scenario-changed', handleCustomEvent);
    window.removeEventListener('storage', handleStorage);
  };
}
