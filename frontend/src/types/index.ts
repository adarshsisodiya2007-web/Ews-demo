export type Severity = 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
export type RoadStatus = 'OPEN' | 'BLOCKED' | 'AT_RISK';
export type ReportCategory = 'CRACK' | 'SLOPE_MOVEMENT' | 'BLOCKED_ROAD' | 'FLOODING' | 'OTHER' | 'INJURED_PEOPLE' | 'TRAPPED_CITIZENS';
export type ReportStatus = 'PENDING' | 'VERIFIED' | 'RESOLVED' | 'DISMISSED';

export interface FactorScore {
  score: number;       // 0–1
  weight: number;
  contribution: number;
  label: string;
}

export interface ContributingFactors {
  rainfall: FactorScore;
  soilMoisture: FactorScore;
  slope: FactorScore;
  history: FactorScore;
  citizenReports: FactorScore;
}

export interface RegionRisk {
  regionId: string;
  name: string;
  district: string;
  state: string;
  centroidLat: number;
  centroidLng: number;
  severity: Severity;
  computedScore: number;
  computedAt: string;
  contributingFactors: ContributingFactors;
  roadStatus: RoadStatus | null;
}

export interface RiskDetail extends RegionRisk {
  recentReports: CitizenReport[];
  weatherTrend: SensorReading[];
}

export interface SensorReading {
  rainfallMm24h: number;
  rainfallMm72h: number;
  soilMoisturePct: number;
  recordedAt: string;
}

export interface CitizenReport {
  id: string;
  reporterType: 'CITIZEN' | 'FIELD_OFFICER';
  category: ReportCategory;
  description: string;
  photoUrl: string | null;
  status: ReportStatus;
  createdAt: string;
  syncedAt: string | null;
  geoLat: number;
  geoLng: number;
}

export interface AlertItem {
  id: string;
  regionId: string;
  regionName: string;
  severity: Severity;
  messageEn: string;
  messageAs: string | null;
  contributingSummary: string;
  computedScore?: number;  // risk score that triggered this alert
  status: string;
  createdAt: string;
}

export interface User {
  username: string;
  role: 'ADMIN' | 'DISTRICT_OFFICIAL' | 'FIELD_OFFICER' | 'CITIZEN';
  district: string | null;
  languagePref: string;
}

export interface CreateReportPayload {
  geoLat: number;
  geoLng: number;
  category: ReportCategory;
  description?: string;
  reporterType: 'CITIZEN' | 'FIELD_OFFICER';
  photoUrl?: string | null;
  clientReportId?: string;
  photoBlobKey?: string | null;
  medicalUrgent?: boolean;
  beaconId?: string;
}

export type SyncStatus = 'PENDING_SYNC' | 'SYNCING' | 'SYNC_FAILED' | 'SYNCED';

export interface PendingReportItem {
  id: string;
  clientReportId: string;
  payload: CreateReportPayload;
  timestamp: number;
  syncStatus: SyncStatus;
  retryCount: number;
  lastError?: string;
}

export interface PendingRoadStatusItem {
  id: string;
  regionId: string;
  roadStatus: RoadStatus;
  regionName?: string;
  timestamp: number;
  syncStatus: SyncStatus;
  retryCount: number;
  lastError?: string;
}

export interface CachedRecord<T> {
  key: string;
  data: T;
  timestamp: number;
}

// ── SIH 2026 Prototype Specification Types ─────────────────────────────────────

export interface LiveWeatherMetrics {
  rain_24h_mm: number;
  rain_72h_mm: number;
  soil_moisture: number;
  critical_rain_trigger: boolean;
  source: string;
}

export interface LandslideAssessment {
  score: number;
  level: 'RED' | 'AMBER' | 'GREEN';
  action_protocol: string;
  feature_breakdown?: {
    norm_slope: number;
    norm_r24: number;
    norm_r72: number;
    norm_moisture: number;
  };
}

export interface EvacuationPlan {
  region: string;
  risk_score: number;
  status: 'REROUTED' | 'WARNING' | 'CLEAR';
  primary_corridor: string;
  safe_evacuation_route: string;
  action: string;
  rerouted: boolean;
  blocked_segments: [number, number][];
  safe_route_geometry: [number, number][];
  estimated_evacuation_time_min: number;
}

export interface RiskAssessmentResponse {
  location: {
    lat: number;
    lon: number;
    slope_deg: number;
    region_name: string;
  };
  weather: LiveWeatherMetrics;
  assessment: LandslideAssessment;
  evacuation_plan: EvacuationPlan;
}

// ── Citizen Profile & Auth Types ───────────────────────────────────────────────

export interface CitizenProfile {
  id: string;
  userId: string;
  fullName: string;
  phone: string;
  gender?: string;
  ageGroup?: string;
  preferredLanguage: string;
  bloodGroup?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  accessibilityNeeds?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CitizenProfileInput {
  fullName: string;
  gender?: string;
  ageGroup?: string;
  preferredLanguage?: string;
  bloodGroup?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  accessibilityNeeds?: string;
}

export interface SendOtpResponse {
  success: boolean;
  message: string;
  demoMode: boolean;
  demoOtp?: string | null;
  cooldownSeconds: number;
}

export interface CitizenAuthResponse {
  token: string;
  user: {
    id: string;
    username: string;
    phone: string;
    role: string;
  };
  profileExists: boolean;
  profile?: CitizenProfile | null;
}
