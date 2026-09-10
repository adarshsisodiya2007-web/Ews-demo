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
  LiveWeatherMetrics,
  TerrainElevation,
  ReportStatus
} from '../types';
import {
  MOCK_HEATMAP,
  MOCK_ALERTS,
  MOCK_USERS,
  MOCK_REPORTS,
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
  getCachedIncidents,
  removeCachedIncident,
  clearCachedIncidents,
  getDeletedIncidentIds,
  addDeletedIncidentId,
  saveClearedIncidentsTimestamp,
  getClearedIncidentsTimestamp
} from './offlineStore';

import { isCapacitorAndroid } from '../utils/platform';
import { Capacitor } from '@capacitor/core';

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
    // Check if running inside native Capacitor / Android shell
    const isCapacitor = Capacitor.isNativePlatform() ||
      isCapacitorAndroid() ||
      window.location.protocol === 'capacitor:' ||
      (window.location.hostname === 'localhost' && window.location.port === '') ||
      (navigator.userAgent && /android/i.test(navigator.userAgent) && window.location.hostname === 'localhost');

    if (isCapacitor) {
      return 'https://ews-backend-gateway-vck8.onrender.com';
    }

    const host = window.location.hostname;
    if (host === 'localhost' || host === '127.0.0.1') {
      return 'http://localhost:8080';
    }
  }
  // In production (Vercel), default to cloud gateway if no relative backend is co-hosted
  return 'https://ews-backend-gateway-vck8.onrender.com';
};

export const isBackendAvailableOrConfigured = (): boolean => {
  return resolveApiBaseUrl().length > 0;
};

export const api = axios.create({
  baseURL: resolveApiBaseUrl(),
  // Render Free can take 50+ seconds to wake. A short timeout leaves a real
  // incident stuck in the local queue before the canonical server is ready.
  timeout: 75000,
});

// Fire-and-forget backend wake-up ping — call on app mount to pre-warm Render free tier
export const warmupBackend = (): void => {
  const base = resolveApiBaseUrl();
  if (!base || base.includes('localhost')) return;
  // Use fetch with a short no-store request so it doesn't block any UI flow
  fetch(`${base}/actuator/health`, { method: 'GET', cache: 'no-store' })
    .then(() => { /* backend is awake */ })
    .catch(() => { /* still waking up, next real call will retry */ });
};

/** Tell open dashboards to reload the canonical incident ledger. */
export const notifyReportsChanged = (): void => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('ews-reports-updated'));
  }
};

api.interceptors.request.use((config) => {
  const currentBase = resolveApiBaseUrl();
  if (currentBase && (!config.baseURL || config.baseURL === '')) {
    config.baseURL = currentBase;
  }
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
  const deletedIds = getDeletedIncidentIds();
  const clearedAt = getClearedIncidentsTimestamp();

  try {
    const res = await api.get<CitizenReport[]>('/api/reports/recent');
    let reports = res.data || [];
    if (clearedAt) {
      reports = reports.filter(r => new Date(r.createdAt).getTime() > clearedAt);
    }
    reports = reports.filter(r => !deletedIds.has(r.id));
    await cacheIncidents(reports).catch(() => {});
    return reports;
  } catch {
    setDemoMode(true);
    try {
      const cached = await getCachedIncidents();
      if (cached && cached.data && cached.data.length > 0) {
        let reports = cached.data;
        if (clearedAt) {
          reports = reports.filter(r => new Date(r.createdAt).getTime() > clearedAt);
        }
        return reports.filter(r => !deletedIds.has(r.id));
      }
    } catch {}
    // Demo/offline mode: provide four clearly synthetic sample incidents.
    // Real server reports replace these automatically after the backend wakes.
    return MOCK_REPORTS.slice(0, 4);
  }
};

export const submitReport = async (payload: CreateReportPayload): Promise<CitizenReport> => {
  // Map extended emergency categories or non-enum categories to backend enum 'OTHER'
  const validBackendCategories = ['CRACK', 'SLOPE_MOVEMENT', 'BLOCKED_ROAD', 'FLOODING', 'OTHER'];
  const backendCategory = validBackendCategories.includes(payload.category as string) ? payload.category : 'OTHER';

  const emergencyHeader = payload.category === 'INJURED_PEOPLE'
    ? `[EMERGENCY SOS: INJURED CITIZEN${payload.medicalUrgent ? ' - URGENT MEDICAL REQUIRED' : ''}] `
    : payload.category === 'TRAPPED_CITIZENS'
    ? '[EMERGENCY SOS: CITIZEN TRAPPED - IMMEDIATE EXTRACTION REQUIRED] '
    : '';

  // Avoid duplicate prefixes if already present in description
  const desc = payload.description || '';
  const titlePrefix = (payload as any).title && !desc.includes((payload as any).title) ? `[${(payload as any).title}] ` : '';
  const finalDesc = titlePrefix + ((emergencyHeader && !desc.includes(emergencyHeader.trim()))
    ? emergencyHeader + desc
    : desc);

  // Ensure valid numerical lat & lng, supporting canonical defaults
  const rawLat = (payload as any).geoLat ?? (payload as any).latitude ?? (payload as any).lat ?? 11.5513;
  const rawLng = (payload as any).geoLng ?? (payload as any).longitude ?? (payload as any).lng ?? 76.1264;
  const geoLat = typeof rawLat === 'number' ? rawLat : parseFloat(rawLat) || 11.5513;
  const geoLng = typeof rawLng === 'number' ? rawLng : parseFloat(rawLng) || 76.1264;

  const backendPayload = {
    ...payload,
    geoLat,
    geoLng,
    category: backendCategory,
    description: finalDesc,
  };

  const res = await api.post<CitizenReport>('/api/reports', backendPayload);
  // Online submissions must refresh open officer ledgers too.
  notifyReportsChanged();
  return res.data;
};

export const updateReportStatus = async (reportId: string, status: ReportStatus): Promise<CitizenReport> => {
  const res = await api.patch<CitizenReport>(`/api/reports/${reportId}/status?status=${status}`);
  return res.data;
};

export const deleteCitizenReport = async (reportId: string): Promise<void> => {
  try {
    await api.delete(`/api/reports/${reportId}`);
  } catch (err: any) {
    console.warn('[API] deleteCitizenReport remote call error, continuing with local cleanup:', err.message);
  }
  await removeCachedIncident(reportId).catch(() => {});
  addDeletedIncidentId(reportId);
  notifyReportsChanged();
};

export const clearAllCitizenReports = async (): Promise<{ deletedCount: number; message: string }> => {
  let count = 0;
  try {
    const res = await api.delete<{ success: boolean; deletedCount: number; message: string }>('/api/reports/all');
    count = res.data?.deletedCount || 0;
  } catch (err: any) {
    console.warn('[API] clearAllCitizenReports remote call error, continuing with local cleanup:', err.message);
  }
  await clearCachedIncidents().catch(() => {});
  saveClearedIncidentsTimestamp();
  notifyReportsChanged();
  return { deletedCount: count, message: 'All incident records cleared' };
};

export const resolvePhotoUrl = (url?: string | null): string | null => {
  if (!url || typeof url !== 'string' || !url.trim()) return null;
  const clean = url.trim();

  // If already a full URL or data/blob URI
  if (clean.startsWith('http://') || clean.startsWith('https://') || clean.startsWith('data:') || clean.startsWith('blob:')) {
    // If it points to localhost/127.0.0.1 on a mobile device or production where backend is remote, rewrite origin
    if (clean.includes('localhost:8080') || clean.includes('127.0.0.1:8080') || clean.includes('localhost/uploads')) {
      const base = resolveApiBaseUrl();
      if (base && !base.includes('localhost')) {
        return clean.replace(/https?:\/\/(localhost|127\.0\.0\.1)(:8080)?/, base);
      }
    }
    return clean;
  }

  const base = resolveApiBaseUrl();
  if (clean.startsWith('/')) {
    return base ? `${base}${clean}` : clean;
  }
  return base ? `${base}/${clean}` : `/${clean}`;
};

export const cleanupCitizenReports = async (options?: {
  reportIds?: string[];
  includeResolved?: boolean;
  includeDismissed?: boolean;
}): Promise<{ deletedCount: number; message: string }> => {
  const res = await api.post<{ success: boolean; deletedCount: number; message: string }>('/api/reports/cleanup', options || {});
  notifyReportsChanged();
  return res.data;
};

export const fetchActiveBeacons = async (): Promise<CitizenReport[]> => {
  try {
    const res = await api.get<CitizenReport[]>('/api/reports/beacons/active');
    if (res.data && Array.isArray(res.data)) {
      return res.data;
    }
  } catch (err) {
    console.warn('[API] fetchActiveBeacons failed, attempting fallback to recent reports', err);
  }

  try {
    const reports = await fetchRecentReports();
    return reports.filter(r =>
      (r.beaconId || (r.description && r.description.toUpperCase().includes('DISTRESS'))) &&
      r.status !== 'RESOLVED' && r.status !== 'DISMISSED'
    );
  } catch {
    return [];
  }
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

// Coordinate-keyed cache: elevation:NASADEM:lat:lon (stores only real HTTP responses)
const elevationCache = new Map<string, TerrainElevation>();

export const fetchTerrainElevation = async (
  lat: number,
  lon: number,
  signal?: AbortSignal
): Promise<TerrainElevation> => {
  const cacheKey = `elevation:NASADEM:${lat.toFixed(4)}:${lon.toFixed(4)}`;
  if (elevationCache.has(cacheKey)) {
    return elevationCache.get(cacheKey)!;
  }

  // Query backend server-side proxy (OpenTopography NASADEM 30m)
  try {
    const res = await api.get<TerrainElevation>('/api/v1/terrain/elevation', {
      params: { lat, lon },
      signal,
      timeout: 6000
    });
    const rawElev = res.data?.elevationMeters ?? (res.data as any)?.elevation_meters;
    if (res.data && ((res.data.available === true) || (res.data as any).status === 'SUCCESS') && typeof rawElev === 'number') {
      const normalized: TerrainElevation = {
        ...res.data,
        available: true,
        elevationMeters: rawElev
      };
      elevationCache.set(cacheKey, normalized);
      return normalized;
    }
    if (res.data && res.data.available === false) {
      return res.data;
    }
  } catch (err: any) {
    if (err.name === 'CanceledError' || err.code === 'ERR_CANCELED') throw err;
  }

  // Truthful unavailable state — DO NOT fabricate or return hardcoded 876.5 or 879m
  return {
    available: false,
    latitude: lat,
    longitude: lon,
    source: 'OpenTopography',
    dataset: 'NASADEM',
    resolutionMeters: 30,
    error: 'NASADEM elevation unavailable',
    status: 'UNAVAILABLE'
  };
};

export const fetchRiskAssessment = async (
  lat: number = 11.5513,
  lon: number = 76.1264,
  slope: number = 38.5,
  regionName: string = 'Meppadi, Wayanad (Testbed)',
  signal?: AbortSignal
): Promise<RiskAssessmentResponse> => {
  setDemoMode(true);
  notifyCacheUsed(null);

  // Return the canonical shared risk state for the 5 monitored zones
  const shared = { ...getSharedRiskForZone(regionName) };

  // Fetch live NASADEM elevation from OpenTopography API
  try {
    const elev = await fetchTerrainElevation(lat, lon, signal);
    if (elev) {
      shared.terrain_elevation = elev;
    }
  } catch (err: any) {
    if (err.name === 'CanceledError' || err.code === 'ERR_CANCELED') throw err;
  }

  await cacheTelemetry(regionName, shared).catch(() => {});
  return shared;
};

export const fetchLiveWeather = async (
  lat: number = 11.5513,
  lon: number = 76.1264
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
