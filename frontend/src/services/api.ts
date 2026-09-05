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
  getSharedRegionRisks,
  getSharedRiskForZone,
  getSharedRiskDetail,
  getSharedRecentAlerts,
  updateSharedRoadStatus,
  CANONICAL_AREAS
} from './sharedRiskState';
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
  timeout: 3500,
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
    // If backend returns regions, check if they map to the 5 canonical monitored areas
    if (res.data && res.data.length > 0) {
      const canonicalNames = CANONICAL_AREAS.map(a => a.name.toLowerCase());
      const filtered = res.data.filter(r =>
        canonicalNames.some(cn => r.name.toLowerCase().includes(cn) || cn.includes(r.name.toLowerCase()))
      );
      if (filtered.length === 5) {
        setDemoMode(false);
        notifyCacheUsed(null);
        await cacheHeatmap(filtered).catch(() => {});
        return filtered;
      }
    }
  } catch {}

  setDemoMode(true);
  notifyCacheUsed(null);
  const shared = getSharedRegionRisks();
  await cacheHeatmap(shared).catch(() => {});
  return shared;
};

export const fetchRiskDetail = async (regionId: string): Promise<RiskDetail> => {
  try {
    const res = await api.get<RiskDetail>(`/api/risk/regions/${regionId}`);
    if (res.data && res.data.name) return res.data;
  } catch {}

  setDemoMode(true);
  const detail = getSharedRiskDetail(regionId) || getMockRiskDetail(regionId);
  if (!detail) throw new Error('Region not found in risk state');
  return detail;
};

export const fetchRecentAlerts = async (): Promise<AlertItem[]> => {
  try {
    const res = await api.get<AlertItem[]>('/api/alerts/recent');
    if (res.data && res.data.length > 0) return res.data;
  } catch {}

  setDemoMode(true);
  return getSharedRecentAlerts();
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
  updateSharedRoadStatus(regionId, status);
  try {
    await api.patch(`/api/regions/${regionId}/road-status`, { status }, { params: { status } });
  } catch {}
};

// ── SIH 2026 Dynamic Zone Risk Assessment (Single Source of Truth) ──────────

export const fetchRiskAssessment = async (
  lat: number = 11.5534,
  lon: number = 76.1320,
  slope: number = 38.5,
  regionName: string = 'Meppadi, Wayanad (Testbed)'
): Promise<RiskAssessmentResponse> => {
  setDemoMode(true);
  notifyCacheUsed(null);

  // Return the canonical shared risk state for the 5 monitored zones
  const shared = getSharedRiskForZone(regionName);
  await cacheTelemetry(regionName, shared).catch(() => {});
  return shared;
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
