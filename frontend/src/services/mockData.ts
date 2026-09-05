/**
 * MOCK DATA — SIH 26001 EWS-NER Demo Mode
 * Used when backend API is unreachable.
 * Real NER districts, realistic risk scores, synthetic sensor data.
 */

import { RegionRisk, RiskDetail, AlertItem, CitizenReport, SensorReading } from '../types';

// ── Canonical 5 Monitored Areas (Single Source of Truth) ─────────────────────
export const MOCK_HEATMAP: RegionRisk[] = [
  {
    regionId: '11111111-0001-0001-0001-000000000001',
    name: 'Meppadi, Wayanad (Testbed)',
    district: 'Wayanad',
    state: 'Kerala',
    centroidLat: 11.5534,
    centroidLng: 76.1320,
    severity: 'CRITICAL',
    computedScore: 84,
    computedAt: new Date().toISOString(),
    roadStatus: 'BLOCKED',
    contributingFactors: {
      rainfall: { score: 0.89, weight: 0.35, contribution: 0.3115, label: '195mm/24h, 360mm/72h' },
      soilMoisture: { score: 0.84, weight: 0.25, contribution: 0.21, label: 'Soil 84% saturated' },
      slope: { score: 0.77, weight: 0.20, contribution: 0.154, label: 'Slope angle 38.5°' },
      history: { score: 0.85, weight: 0.12, contribution: 0.102, label: 'Historical recurring failure zone' },
      citizenReports: { score: 0.75, weight: 0.08, contribution: 0.06, label: 'Corroborated by field reports' }
    }
  },
  {
    regionId: '22222222-0002-0002-0002-000000000002',
    name: 'Munnar, Idukki (Western Ghats)',
    district: 'Idukki',
    state: 'Kerala',
    centroidLat: 10.0889,
    centroidLng: 77.0595,
    severity: 'MODERATE',
    computedScore: 48,
    computedAt: new Date().toISOString(),
    roadStatus: 'OPEN',
    contributingFactors: {
      rainfall: { score: 0.34, weight: 0.35, contribution: 0.119, label: '75mm/24h, 150mm/72h' },
      soilMoisture: { score: 0.55, weight: 0.25, contribution: 0.1375, label: 'Soil 55% saturated' },
      slope: { score: 0.84, weight: 0.20, contribution: 0.168, label: 'Slope angle 42.0°' },
      history: { score: 0.20, weight: 0.12, contribution: 0.024, label: 'Low historical recurrence' },
      citizenReports: { score: 0.10, weight: 0.08, contribution: 0.008, label: 'No unverified reports' }
    }
  },
  {
    regionId: '33333333-0003-0003-0003-000000000003',
    name: 'Guwahati Hills (NER)',
    district: 'Kamrup Metropolitan',
    state: 'Assam',
    centroidLat: 26.1445,
    centroidLng: 91.7362,
    severity: 'LOW',
    computedScore: 22,
    computedAt: new Date().toISOString(),
    roadStatus: 'OPEN',
    contributingFactors: {
      rainfall: { score: 0.09, weight: 0.35, contribution: 0.0315, label: '20mm/24h, 45mm/72h' },
      soilMoisture: { score: 0.35, weight: 0.25, contribution: 0.0875, label: 'Soil 35% saturated' },
      slope: { score: 0.56, weight: 0.20, contribution: 0.112, label: 'Slope angle 28.0°' },
      history: { score: 0.20, weight: 0.12, contribution: 0.024, label: 'Low historical recurrence' },
      citizenReports: { score: 0.10, weight: 0.08, contribution: 0.008, label: 'No unverified reports' }
    }
  },
  {
    regionId: '44444444-0004-0004-0004-000000000004',
    name: 'Shillong Ridge (NER)',
    district: 'East Khasi Hills',
    state: 'Meghalaya',
    centroidLat: 25.5788,
    centroidLng: 91.8933,
    severity: 'CRITICAL',
    computedScore: 88,
    computedAt: new Date().toISOString(),
    roadStatus: 'BLOCKED',
    contributingFactors: {
      rainfall: { score: 0.95, weight: 0.35, contribution: 0.3325, label: '210mm/24h, 385mm/72h' },
      soilMoisture: { score: 0.88, weight: 0.25, contribution: 0.22, label: 'Soil 88% saturated' },
      slope: { score: 0.68, weight: 0.20, contribution: 0.136, label: 'Slope angle 34.0°' },
      history: { score: 0.85, weight: 0.12, contribution: 0.102, label: 'Historical recurring failure zone' },
      citizenReports: { score: 0.75, weight: 0.08, contribution: 0.06, label: 'Corroborated by field reports' }
    }
  },
  {
    regionId: '55555555-0005-0005-0005-000000000005',
    name: 'Aizawl Slopes (NER)',
    district: 'Aizawl',
    state: 'Mizoram',
    centroidLat: 23.7271,
    centroidLng: 92.7176,
    severity: 'HIGH',
    computedScore: 68,
    computedAt: new Date().toISOString(),
    roadStatus: 'AT_RISK',
    contributingFactors: {
      rainfall: { score: 0.61, weight: 0.35, contribution: 0.2135, label: '135mm/24h, 250mm/72h' },
      soilMoisture: { score: 0.72, weight: 0.25, contribution: 0.18, label: 'Soil 72% saturated' },
      slope: { score: 0.90, weight: 0.20, contribution: 0.18, label: 'Slope angle 45.0°' },
      history: { score: 0.60, weight: 0.12, contribution: 0.072, label: 'Active shear-strain history' },
      citizenReports: { score: 0.50, weight: 0.08, contribution: 0.04, label: 'Corroborated by field reports' }
    }
  }
];

// ── Sensor readings (last 24h, simulated monsoon pattern) ───────────────────
const makeSensorReadings = (baseRain: number): SensorReading[] => {
  const readings: SensorReading[] = [];
  const now = new Date();
  for (let i = 23; i >= 0; i--) {
    const t = new Date(now.getTime() - i * 3600000);
    const diurnal = Math.sin((t.getHours() - 6) * Math.PI / 12) * 0.4 + 0.6;
    readings.push({
      rainfallMm24h: parseFloat((baseRain * diurnal * (0.8 + Math.random() * 0.4)).toFixed(1)),
      rainfallMm72h: parseFloat((baseRain * 2.8 * (0.9 + Math.random() * 0.2)).toFixed(1)),
      soilMoisturePct: parseFloat((45 + baseRain * 0.3 + Math.random() * 10).toFixed(1)),
      recordedAt: t.toISOString(),
    });
  }
  return readings;
};

// ── Mock citizen reports ─────────────────────────────────────────────────────
const MOCK_REPORTS: CitizenReport[] = [
  { id: 'r1', reporterType: 'FIELD_OFFICER', category: 'CRACK', description: 'Large crack visible on NH-6 embankment near km marker 42', photoUrl: null, status: 'VERIFIED', createdAt: new Date(Date.now() - 7200000).toISOString(), syncedAt: null, geoLat: 23.74, geoLng: 92.72 },
  { id: 'r2', reporterType: 'CITIZEN', category: 'SLOPE_MOVEMENT', description: 'Small stones falling on road continuously', photoUrl: null, status: 'PENDING', createdAt: new Date(Date.now() - 14400000).toISOString(), syncedAt: null, geoLat: 25.27, geoLng: 91.73 },
  { id: 'r3', reporterType: 'FIELD_OFFICER', category: 'BLOCKED_ROAD', description: 'NH-44 completely blocked at Chaltlang — debris across full width', photoUrl: null, status: 'PENDING', createdAt: new Date(Date.now() - 3600000).toISOString(), syncedAt: null, geoLat: 23.74, geoLng: 92.70 },
  { id: 'r4', reporterType: 'CITIZEN', category: 'FLOODING', description: 'Water logging on slope, soil becoming very loose', photoUrl: null, status: 'PENDING', createdAt: new Date(Date.now() - 1800000).toISOString(), syncedAt: null, geoLat: 25.23, geoLng: 91.70 },
  { id: 'r5', reporterType: 'FIELD_OFFICER', category: 'CRACK', description: 'Progressive crack 2m wide discovered after last night rain', photoUrl: null, status: 'VERIFIED', createdAt: new Date(Date.now() - 28800000).toISOString(), syncedAt: null, geoLat: 23.77, geoLng: 92.69 },
];

// ── Mock alerts ──────────────────────────────────────────────────────────────
export const MOCK_ALERTS: AlertItem[] = [
  { id: 'a1', regionId: '33333333-0003-0003-0003-000000000001', regionName: 'Chaltlang Range', severity: 'CRITICAL', messageEn: 'CRITICAL landslide risk (82/100) at Chaltlang Range, Aizawl. IMMEDIATE EVACUATION ADVISED. Rain:88% Soil:87% Slope:82%. Emergency services alerted. Call 1070 NOW.', messageAs: 'গুৰুতৰ ভূস্খলনৰ বিপদ — চালতলাং।', contributingSummary: 'Rain:88% Soil:87% Slope:82% Reports:60%', computedScore: 82, status: 'SENT', createdAt: new Date(Date.now() - 3600000).toISOString() },
  { id: 'a2', regionId: '22222222-0002-0002-0002-000000000001', regionName: 'Cherapunjee Escarpment', severity: 'CRITICAL', messageEn: 'CRITICAL landslide risk (91/100) at Cherapunjee Escarpment. IMMEDIATE EVACUATION ADVISED. Call 1070 NOW.', messageAs: null, contributingSummary: 'Rain:98% Soil:94% Slope:89% Reports:80%', computedScore: 91, status: 'SENT', createdAt: new Date(Date.now() - 5400000).toISOString() },
  { id: 'a3', regionId: '44444444-0004-0004-0004-000000000001', regionName: 'Imphal West Hills', severity: 'HIGH', messageEn: 'HIGH landslide risk (64/100) at Imphal West Hills. Avoid slopes. Emergency:1070.', messageAs: null, contributingSummary: 'Rain:70% Soil:72% Slope:68%', computedScore: 64, status: 'SENT', createdAt: new Date(Date.now() - 9000000).toISOString() },
  { id: 'a4', regionId: '11111111-0001-0001-0001-000000000001', regionName: 'Guwahati Hills', severity: 'HIGH', messageEn: 'HIGH landslide risk (67/100) at Guwahati Hills, Kamrup Metropolitan. Avoid steep slopes. Emergency:1070.', messageAs: null, contributingSummary: 'Rain:72% Soil:75% Slope:71%', computedScore: 67, status: 'SENT', createdAt: new Date(Date.now() - 12600000).toISOString() },
  { id: 'a5', regionId: '88888888-0008-0008-0008-000000000001', regionName: 'Gangtok Slope', severity: 'HIGH', messageEn: 'HIGH landslide risk (69/100) at Gangtok Slope, East Sikkim. Avoid AT_RISK roads.', messageAs: null, contributingSummary: 'Rain:75% Soil:77% Slope:80%', computedScore: 69, status: 'SENT', createdAt: new Date(Date.now() - 18000000).toISOString() },
  { id: 'a6', regionId: '22222222-0002-0002-0002-000000000003', regionName: 'Mawsynram Ridge', severity: 'HIGH', messageEn: 'HIGH landslide risk (73/100) at Mawsynram Ridge, East Khasi Hills.', messageAs: null, contributingSummary: 'Rain:82% Soil:80% Slope:76%', computedScore: 73, status: 'SENT', createdAt: new Date(Date.now() - 21600000).toISOString() },
];

// ── Mock risk detail (for selected region panel) ─────────────────────────────
export function getMockRiskDetail(regionId: string): RiskDetail | null {
  const region = MOCK_HEATMAP.find(r => r.regionId === regionId);
  if (!region) return null;

  const baseRain = region.computedScore * 1.1;

  return {
    ...region,
    recentReports: MOCK_REPORTS.filter((_, i) => i < 3).map(r => ({ ...r, geoLat: region.centroidLat, geoLng: region.centroidLng })),
    weatherTrend: makeSensorReadings(baseRain),
  };
}

// ── Mock login response ───────────────────────────────────────────────────────
export const MOCK_USERS: Record<string, { token: string; role: string; district: string | null; languagePref: string; username: string }> = {
  'admin': { token: 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJhZG1pbiIsInJvbGUiOiJBRE1JTiIsImlhdCI6MTcyNTAyMDAwMCwiZXhwIjo5OTk5OTk5OTk5fQ.demo_token', role: 'ADMIN', district: null, languagePref: 'en', username: 'admin' },
  'kamrup_official': { token: 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJrYW1ydXBfb2ZmaWNpYWwiLCJyb2xlIjoiRElTVFJJQ1RfT0ZGSUNJQUwiLCJpYXQiOjE3MjUwMjAwMDAsImV4cCI6OTk5OTk5OTk5OX0.demo_token', role: 'DISTRICT_OFFICIAL', district: 'Kamrup Metropolitan', languagePref: 'en', username: 'kamrup_official' },
  'ekh_official': { token: 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJla2hfb2ZmaWNpYWwiLCJyb2xlIjoiRElTVFJJQ1RfT0ZGSUNJQUwiLCJpYXQiOjE3MjUwMjAwMDAsImV4cCI6OTk5OTk5OTk5OX0.demo_token', role: 'DISTRICT_OFFICIAL', district: 'East Khasi Hills', languagePref: 'en', username: 'ekh_official' },
  'aizawl_officer': { token: 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJhaXphd2xfb2ZmaWNlciIsInJvbGUiOiJGSUVMRF9PRkZJQ0VSIiwiaWF0IjoxNzI1MDIwMDAwLCJleHAiOjk5OTk5OTk5OTl9.demo_token', role: 'FIELD_OFFICER', district: 'Aizawl', languagePref: 'en', username: 'aizawl_officer' },
  'district_kam': { token: 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJkaXN0cmljdF9rYW0iLCJyb2xlIjoiRElTVFJJQ1RfT0ZGSUNJQUwiLCJpYXQiOjE3MjUwMjAwMDAsImV4cCI6OTk5OTk5OTk5OX0.demo_token', role: 'DISTRICT_OFFICIAL', district: 'Kamrup Metropolitan', languagePref: 'en', username: 'district_kam' },
  'field_aiz': { token: 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJmaWVsZF9haXoiLCJyb2xlIjoiRklFTERfT0ZGSUNFUiIsImlhdCI6MTcyNTAyMDAwMCwiZXhwIjo5OTk5OTk5OTk5fQ.demo_token', role: 'FIELD_OFFICER', district: 'Aizawl', languagePref: 'en', username: 'field_aiz' },
};
