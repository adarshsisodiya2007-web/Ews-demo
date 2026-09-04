/**
 * API Service — SIH 26001 EWS-NER
 * Transparently integrates IndexedDB caching, offline fallback, and truthful disaster status.
 */
import axios from 'axios';
import {
  RegionRisk,
  RiskDetail,
  AlertItem,
  CitizenReport,
  CreateReportPayload,
  RoadStatus,
  RiskAssessmentResponse,
  LiveWeatherMetrics
} from '../types';
import {
  MOCK_HEATMAP,
  MOCK_ALERTS,
  MOCK_USERS,
  getMockRiskDetail,
} from './mockData';
import {
  cacheHeatmap,
  getCachedHeatmapWithMeta,
  cacheTelemetry,
  getCachedTelemetry,
  cacheIncidents,
  getCachedIncidents
} from './offlineStore';

export let DEMO_MODE = false;
export let IS_USING_CACHED_DATA = false;
export let LAST_CACHE_TIMESTAMP: number | null = null;

const setDemoMode = (val: boolean) => {
  DEMO_MODE = val;
  window.dispatchEvent(new CustomEvent('ews-demo-mode', { detail: val }));
};

const notifyCacheUsed = (timestamp: number | null) => {
  IS_USING_CACHED_DATA = timestamp !== null;
  LAST_CACHE_TIMESTAMP = timestamp;
  window.dispatchEvent(new CustomEvent('ews-cache-status', {
    detail: { usingCache: IS_USING_CACHED_DATA, timestamp }
  }));
};

export const resolveApiBaseUrl = (): string => {
  const env = (import.meta as any).env || {};
  const customUrl = env.VITE_API_BASE_URL || env.VITE_API_URL || env.VITE_BACKEND_URL;
  if (customUrl && typeof customUrl === 'string' && customUrl.trim().length > 0) {
    let clean = customUrl.trim();
    if (clean.endsWith('/')) clean = clean.slice(0, -1);
    return clean;
  }
  if (typeof window !== 'undefined') {
    // Check if running inside native Capacitor
    const isCapacitor = !!(window as any).Capacitor?.isNativePlatform?.() || 
      window.location.protocol === 'capacitor:' || 
      window.location.hostname === 'localhost' && navigator.userAgent.includes('wv');
    if (isCapacitor) {
      return 'https://ews-backend-gateway-vck8.onrender.com';
    }

    const host = window.location.hostname;
    if (host === 'localhost' || host === '127.0.0.1') {
      return 'http://localhost:8080';
    }
  }
  // In production (Vercel), default to relative API root unless an external backend is specified
  return '';
};

export const isBackendAvailableOrConfigured = (): boolean => {
  return resolveApiBaseUrl().length > 0;
};

export const api = axios.create({
  baseURL: resolveApiBaseUrl(),
  timeout: 15000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('ews_token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => {
    // Detect Vercel HTML rewrite on API routes (prevent treating 404-as-index.html as success)
    if (
      typeof response.data === 'string' &&
      (response.data.includes('<!DOCTYPE') || response.data.includes('<html'))
    ) {
      const err: any = new Error('Endpoint not found (Vercel SPA fallback)');
      err.code = 'ERR_SPA_FALLBACK';
      err.response = response;
      return Promise.reject(err);
    }
    setDemoMode(false);
    notifyCacheUsed(null);
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('ews_token');
      if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// ── API Functions with offline IndexedDB fallback ─────────────────────────────

export const fetchHeatmap = async (): Promise<RegionRisk[]> => {
  try {
    const res = await api.get<RegionRisk[]>('/api/risk/heatmap');
    setDemoMode(false);
    notifyCacheUsed(null);
    // Cache to IndexedDB for offline resilience
    await cacheHeatmap(res.data).catch(() => {});
    return res.data;
  } catch {
    setDemoMode(true);
    // Check IndexedDB cache first
    try {
      const cached = await getCachedHeatmapWithMeta();
      if (cached && cached.data && cached.data.length > 0) {
        notifyCacheUsed(cached.timestamp);
        return cached.data;
      }
    } catch {}

    notifyCacheUsed(null);
    return MOCK_HEATMAP;
  }
};

export const fetchRiskDetail = async (regionId: string): Promise<RiskDetail> => {
  try {
    const res = await api.get<RiskDetail>(`/api/risk/regions/${regionId}`);
    return res.data;
  } catch {
    setDemoMode(true);
    const detail = getMockRiskDetail(regionId);
    if (!detail) throw new Error('Region not found in mock data');
    return detail;
  }
};

export const fetchRecentAlerts = async (): Promise<AlertItem[]> => {
  try {
    const res = await api.get<AlertItem[]>('/api/alerts/recent');
    return res.data;
  } catch {
    setDemoMode(true);
    return MOCK_ALERTS;
  }
};

export const fetchRecentReports = async (): Promise<CitizenReport[]> => {
  try {
    const res = await api.get<CitizenReport[]>('/api/reports/recent');
    await cacheIncidents(res.data).catch(() => {});
    return res.data;
  } catch {
    setDemoMode(true);
    try {
      const cached = await getCachedIncidents();
      if (cached && cached.data) {
        return cached.data;
      }
    } catch {}
    return [];
  }
};

export const submitReport = async (payload: CreateReportPayload): Promise<CitizenReport> => {
  // Map extended emergency categories to backend enum 'OTHER' with high-priority markers
  const isEmergencyCategory = payload.category === 'INJURED_PEOPLE' || payload.category === 'TRAPPED_CITIZENS';
  const backendCategory = isEmergencyCategory ? 'OTHER' : (payload.category || 'OTHER');

  const emergencyHeader = payload.category === 'INJURED_PEOPLE'
    ? `[EMERGENCY SOS: INJURED CITIZEN${payload.medicalUrgent ? ' - URGENT MEDICAL REQUIRED' : ''}] `
    : payload.category === 'TRAPPED_CITIZENS'
    ? '[EMERGENCY SOS: CITIZEN TRAPPED - IMMEDIATE EXTRACTION REQUIRED] '
    : '';

  // Avoid duplicate prefixes if already present in description
  const desc = payload.description || '';
  const finalDesc = (emergencyHeader && !desc.includes(emergencyHeader.trim()))
    ? emergencyHeader + desc
    : desc;

  // Ensure valid numerical lat & lng, supporting legacy field names
  const rawLat = (payload as any).geoLat ?? (payload as any).latitude ?? (payload as any).lat ?? 26.1445;
  const rawLng = (payload as any).geoLng ?? (payload as any).longitude ?? (payload as any).lng ?? 91.7362;
  const geoLat = typeof rawLat === 'number' ? rawLat : parseFloat(rawLat) || 26.1445;
  const geoLng = typeof rawLng === 'number' ? rawLng : parseFloat(rawLng) || 91.7362;

  const backendPayload = {
    ...payload,
    geoLat,
    geoLng,
    category: backendCategory,
    description: finalDesc,
  };

  const res = await api.post<CitizenReport>('/api/reports', backendPayload);
  return res.data;
};

export const deleteCitizenReport = async (reportId: string): Promise<void> => {
  await api.delete(`/api/reports/${reportId}`);
};

export const cleanupCitizenReports = async (options?: {
  reportIds?: string[];
  includeResolved?: boolean;
  includeDismissed?: boolean;
}): Promise<{ deletedCount: number; message: string }> => {
  const res = await api.post<{ success: boolean; deletedCount: number; message: string }>('/api/reports/cleanup', options || {});
  return res.data;
};

export const uploadPhoto = async (file: File | Blob, filename = 'hazard.jpg'): Promise<string> => {
  const formData = new FormData();
  formData.append('file', file, filename);
  const res = await api.post<string>('/api/reports/upload', formData);
  return res.data;
};

export const login = async (username: string, password: string): Promise<{
  token: string; role: string; district: string | null; languagePref: string; username: string;
}> => {
  if (!isBackendAvailableOrConfigured()) {
    const user = MOCK_USERS[username];
    if (user && password === 'demo1234') {
      setDemoMode(true);
      return user;
    }
    throw new Error('Invalid credentials');
  }

  try {
    const res = await api.post('/api/auth/login', { username, password });
    setDemoMode(false);
    return res.data;
  } catch (err: any) {
    if (!err.response || err.code === 'ECONNABORTED' || err.code === 'ERR_NETWORK') {
      const user = MOCK_USERS[username];
      if (user && password === 'demo1234') {
        setDemoMode(true);
        return user;
      }
    }
    throw new Error('Invalid credentials');
  }
};

export const updateRoadStatus = async (regionId: string, status: RoadStatus): Promise<void> => {
  // Send both param and body for robust backend compatibility
  await api.patch(`/api/regions/${regionId}/road-status`, { status }, { params: { status } });
};

// ── SIH 2026 Dynamic Zone Risk Profiles ─────────────────────────────────────

const ZONE_PROFILES: Record<string, { r24: number; r72: number; soil: number; elev: number }> = {
  'Meppadi, Wayanad (Testbed)': { r24: 142.0, r72: 285.0, soil: 0.52, elev: 879.0 },
  'Munnar, Idukki (Western Ghats)': { r24: 88.0, r72: 176.0, soil: 0.43, elev: 1532.0 },
  'Guwahati Hills (NER)': { r24: 72.0, r72: 145.0, soil: 0.38, elev: 120.0 },
  'Shillong Ridge (NER)': { r24: 32.0, r72: 68.0, soil: 0.22, elev: 1496.0 },
  'Aizawl Slopes (NER)': { r24: 118.0, r72: 230.0, soil: 0.61, elev: 1132.0 }
};

export const fetchRiskAssessment = async (
  lat: number = 11.5534,
  lon: number = 76.1320,
  slope: number = 38.5,
  regionName: string = 'Meppadi, Wayanad (Testbed)'
): Promise<RiskAssessmentResponse> => {
  if (isBackendAvailableOrConfigured()) {
    try {
      const res = await api.get<RiskAssessmentResponse>('/api/v1/risk-assessment', {
        params: { lat, lon, slope, regionName }
      });
      if (res.data && typeof res.data === 'object' && res.data.assessment) {
        setDemoMode(false);
        notifyCacheUsed(null);
        await cacheTelemetry(regionName, res.data).catch(() => {});
        return res.data;
      }
    } catch {
      // Fall through to offline cache or honest MCDA calculation
    }
  }

  setDemoMode(true);

  // Try reading cached telemetry from IndexedDB
  try {
    const cached = await getCachedTelemetry(regionName);
    if (cached && cached.data && cached.data.assessment) {
      notifyCacheUsed(cached.timestamp);
      return cached.data;
    }
  } catch {}

  notifyCacheUsed(null);

  // Honest MCDA multi-factor mathematical calculation based on slope, rainfall, and topsoil saturation
  const profile = ZONE_PROFILES[regionName] || {
    r24: Math.min(180, Math.max(20, slope * 2.8)),
    r72: Math.min(320, Math.max(50, slope * 5.5)),
    soil: Math.min(0.65, Math.max(0.20, slope / 70.0)),
    elev: 800.0
  };

    const norm_slope = Math.min(1.0, slope / 50.0);
    const norm_r24 = Math.min(1.0, profile.r24 / 200.0);
    const norm_r72 = Math.min(1.0, profile.r72 / 350.0);
    const norm_moisture = Math.min(1.0, profile.soil / 0.60);

    const score = Number((0.35 * norm_slope + 0.30 * norm_r24 + 0.20 * norm_moisture + 0.15 * norm_r72).toFixed(2));
    const isRed = score >= 0.70 || profile.r24 >= 110.0;
    const isAmber = !isRed && (score >= 0.40 || profile.r24 >= 60.0);
    const level = isRed ? 'RED' : isAmber ? 'AMBER' : 'GREEN';

    const action = isRed
      ? 'Immediate Evacuation & Highway Closure. High debris-flow susceptibility.'
      : isAmber
      ? 'Issue Pre-warning. Prepare emergency shelters and restrict heavy transit.'
      : 'Normal Monitoring Active. Conditions stable.';

    const status = isRed ? 'REROUTED' : 'CLEAR';
    const primary_corridor = isRed ? 'NH-766 (BLOCKED - Landslide Hazard Zone)' : 'NH-766 (OPEN)';
    // Truthful wording complying with Section H
    const safe_route = isRed
      ? 'Recommended Evacuation Route: SH-59 Bypass (Subject to real-time ground confirmation)'
      : 'Standard Transit Route: NH-766';

    return {
      location: { lat, lon, slope_deg: slope, region_name: regionName },
      weather: {
        rain_24h_mm: profile.r24,
        rain_72h_mm: profile.r72,
        soil_moisture: profile.soil,
        critical_rain_trigger: profile.r24 >= 100.0,
        source: 'MCDA_ESTIMATED_TELEMETRY'
      },
      assessment: {
        score,
        level,
        action_protocol: action,
        feature_breakdown: {
          norm_slope: Number(norm_slope.toFixed(2)),
          norm_r24: Number(norm_r24.toFixed(2)),
          norm_r72: Number(norm_r72.toFixed(2)),
          norm_moisture: Number(norm_moisture.toFixed(2))
        }
      },
      evacuation_plan: {
        region: regionName,
        risk_score: score,
        status,
        primary_corridor,
        safe_evacuation_route: safe_route,
        action,
        rerouted: isRed,
        blocked_segments: isRed ? [[lat - 0.003, lon - 0.012], [lat + 0.017, lon + 0.008]] : [],
        safe_route_geometry: [
          [lat - 0.003, lon - 0.012],
          [lat - 0.033, lon - 0.002],
          [lat - 0.013, lon + 0.038]
        ],
        estimated_evacuation_time_min: isRed ? 42 : 25
      }
    };
  };

export const fetchLiveWeather = async (
  lat: number = 11.5534,
  lon: number = 76.1320
): Promise<LiveWeatherMetrics> => {
  try {
    const res = await api.get<LiveWeatherMetrics>('/api/v1/weather/live', {
      params: { lat, lon }
    });
    return res.data;
  } catch {
    return {
      rain_24h_mm: 142.0,
      rain_72h_mm: 285.0,
      soil_moisture: 0.52,
      critical_rain_trigger: true,
      source: 'MCDA_SIMULATED'
    };
  }
};
