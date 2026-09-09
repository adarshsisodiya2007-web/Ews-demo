import { ResponderAlert, CreateAlertPayload } from '../types/alertTypes';
// Use the shared axios instance from api.ts — it handles:
//   • Correct base URL for localhost / Android Capacitor / production
//   • Auto-attach JWT Bearer token via request interceptor
//   • Consistent timeout, CORS credentials
import { api } from './api';

const LOCAL_ALERTS_KEY = 'satark_published_responder_alerts';

/** Get locally stored responder alerts */
export function getLocalResponderAlerts(): ResponderAlert[] {
  try {
    const raw = localStorage.getItem(LOCAL_ALERTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/** Save locally stored responder alerts */
export function saveLocalResponderAlerts(alerts: ResponderAlert[]): void {
  try {
    localStorage.setItem(LOCAL_ALERTS_KEY, JSON.stringify(alerts));
  } catch (e) {
    console.warn('Failed to persist local alerts:', e);
  }
}

/** Fetch active alerts for a citizen's location */
export async function fetchActiveAlertsForLocation(
  regionId?: string,
  district?: string,
  state?: string,
  targetRegion?: string
): Promise<ResponderAlert[]> {
  const localList = getLocalResponderAlerts().filter(a =>
    a.status === 'ACTIVE' && alertMatchesLocation(a, regionId, district, state, targetRegion)
  );

  try {
    const params: Record<string, string> = {};
    if (regionId) params.regionId = regionId;
    if (district) params.district = district;
    if (state) params.state = state;
    if (targetRegion) params.targetRegion = targetRegion;
    const res = await api.get<ResponderAlert[]>('/api/citizen/alerts/active', { params });
    const backendList = Array.isArray(res.data) ? res.data : [];

    // Merge backend and local list, deduplicating by ID
    const map = new Map<string, ResponderAlert>();
    for (const a of backendList) {
      if (alertMatchesLocation(a, regionId, district, state, targetRegion)) {
        map.set(a.id, a);
      }
    }
    for (const a of localList) {
      if (!map.has(a.id)) {
        map.set(a.id, a);
      }
    }
    return Array.from(map.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  } catch {
    return localList;
  }
}

/** Fetch all active responder alerts (for map or admin view) */
export async function fetchAllActiveAlerts(): Promise<ResponderAlert[]> {
  const localList = getLocalResponderAlerts().filter(a => a.status === 'ACTIVE');
  try {
    const res = await api.get<ResponderAlert[]>('/api/citizen/alerts/all');
    const backendList = Array.isArray(res.data) ? res.data : [];
    const map = new Map<string, ResponderAlert>();
    for (const a of backendList) map.set(a.id, a);
    for (const a of localList) if (!map.has(a.id)) map.set(a.id, a);
    return Array.from(map.values());
  } catch {
    return localList;
  }
}

/** Responder: list all managed alerts */
export async function fetchResponderAlerts(): Promise<ResponderAlert[]> {
  const localList = getLocalResponderAlerts();
  try {
    const res = await api.get<ResponderAlert[]>('/api/responder/alerts');
    const backendList = Array.isArray(res.data) ? res.data : [];
    const map = new Map<string, ResponderAlert>();
    for (const a of backendList) map.set(a.id, a);
    for (const a of localList) if (!map.has(a.id)) map.set(a.id, a);
    return Array.from(map.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  } catch {
    return localList;
  }
}

/** Responder: create a new alert */
export async function createResponderAlert(
  payload: CreateAlertPayload
): Promise<ResponderAlert> {
  const now = new Date().toISOString();
  let createdAlert: ResponderAlert;

  try {
    const res = await api.post<ResponderAlert>('/api/responder/alerts', payload);
    createdAlert = res.data;
  } catch (e) {
    // Graceful local creation for testing / offline resilience
    createdAlert = {
      id: `alert-resp-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      title: payload.title,
      description: payload.description,
      severity: payload.severity,
      status: 'ACTIVE',
      scope: payload.scope || 'EXACT_REGION',
      alertType: payload.alertType || 'LANDSLIDE',
      regionId: payload.regionId,
      locationName: payload.locationName || payload.targetRegion,
      targetRegion: payload.targetRegion || payload.locationName,
      district: payload.district,
      state: payload.state,
      lat: payload.lat,
      lng: payload.lng,
      createdAt: now,
      updatedAt: now,
      startTime: payload.startTime || now,
      expiryTime: payload.expiryTime
    };
  }

  // Persist locally for instant multi-window / offline reactivity
  const existing = getLocalResponderAlerts().filter(a => a.id !== createdAlert.id);
  saveLocalResponderAlerts([createdAlert, ...existing]);

  // Dispatch global event
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('satark-responder-alert-published', {
      detail: createdAlert
    }));
  }

  return createdAlert;
}

/** Responder: update an alert */
export async function updateResponderAlert(
  id: string,
  payload: Partial<CreateAlertPayload>
): Promise<ResponderAlert> {
  try {
    const res = await api.put<ResponderAlert>(`/api/responder/alerts/${id}`, payload);
    const updated = res.data;
    const existing = getLocalResponderAlerts().map(a => a.id === id ? { ...a, ...updated } : a);
    saveLocalResponderAlerts(existing);
    return updated;
  } catch {
    const existing = getLocalResponderAlerts();
    const target = existing.find(a => a.id === id);
    if (target) {
      const updated = { ...target, ...payload, updatedAt: new Date().toISOString() } as ResponderAlert;
      saveLocalResponderAlerts(existing.map(a => a.id === id ? updated : a));
      return updated;
    }
    throw new Error('Alert not found');
  }
}

/** Responder: resolve an alert */
export async function resolveAlert(id: string): Promise<ResponderAlert> {
  let updatedAlert: ResponderAlert | undefined;
  try {
    const res = await api.patch<ResponderAlert>(`/api/responder/alerts/${id}/resolve`);
    updatedAlert = res.data;
  } catch {
    // local fallback
  }

  const existing = getLocalResponderAlerts();
  const next = existing.map(a => {
    if (a.id === id) {
      const resolved: ResponderAlert = { ...a, status: 'RESOLVED' as const, updatedAt: new Date().toISOString() };
      if (!updatedAlert) updatedAlert = resolved;
      return resolved;
    }
    return a;
  });
  saveLocalResponderAlerts(next);

  if (typeof window !== 'undefined' && updatedAlert) {
    window.dispatchEvent(new CustomEvent('satark-responder-alert-updated', { detail: updatedAlert }));
  }
  return updatedAlert || ({} as ResponderAlert);
}

/** Responder: cancel/deactivate an alert */
export async function cancelAlert(id: string): Promise<ResponderAlert> {
  let updatedAlert: ResponderAlert | undefined;
  try {
    const res = await api.patch<ResponderAlert>(`/api/responder/alerts/${id}/cancel`);
    updatedAlert = res.data;
  } catch {
    // local fallback
  }

  const existing = getLocalResponderAlerts();
  const next = existing.map(a => {
    if (a.id === id) {
      const cancelled: ResponderAlert = { ...a, status: 'EXPIRED' as const, updatedAt: new Date().toISOString() };
      if (!updatedAlert) updatedAlert = cancelled;
      return cancelled;
    }
    return a;
  });
  saveLocalResponderAlerts(next);

  if (typeof window !== 'undefined' && updatedAlert) {
    window.dispatchEvent(new CustomEvent('satark-responder-alert-updated', { detail: updatedAlert }));
  }
  return updatedAlert || ({} as ResponderAlert);
}

/** Responder: delete an alert */
export async function deleteAlert(id: string): Promise<void> {
  try {
    await api.delete(`/api/responder/alerts/${id}`);
  } catch {
    // local delete fallback
  }
  const existing = getLocalResponderAlerts().filter(a => a.id !== id);
  saveLocalResponderAlerts(existing);

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('satark-responder-alert-deleted', { detail: { id } }));
  }
}

/** Normalize location string for comparison */
export function normalizeLocation(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, ' ');
}

/**
 * Check if an alert matches the citizen's location.
 * Enforces strict EXACT_REGION isolation: if targeted to a specific region,
 * citizens of other regions NEVER receive it.
 */
export function alertMatchesLocation(
  alert: ResponderAlert,
  citizenRegionId?: string,
  citizenDistrict?: string,
  citizenState?: string,
  citizenTargetRegion?: string
): boolean {
  // 1. Exact canonical SATARK region matching (PRIMARY TARGETING)
  if (citizenTargetRegion) {
    const alertTargetKey = normalizeLocation(alert.targetRegion || alert.locationName || '');
    const citizenKey = normalizeLocation(citizenTargetRegion);

    // Exact match on region ID (e.g. 'shillong', 'guwahati')
    if (alertTargetKey === citizenKey) {
      return true;
    }
    // Substring match e.g. "shillong" in "shillong, meghalaya"
    if (alertTargetKey && citizenKey) {
      if (alertTargetKey.includes(citizenKey) || citizenKey.includes(alertTargetKey)) {
        return true;
      }
    }
    // If the alert is targeted to a specific region (EXACT_REGION or targetRegion/locationName set)
    // and it did not match this citizen's region, it MUST NOT match this citizen!
    if (alert.scope === 'EXACT_REGION' || alert.targetRegion || alert.locationName) {
      return false;
    }
  }

  // 2. Exact region UUID match
  if (alert.regionId && citizenRegionId && alert.regionId === citizenRegionId) {
    return true;
  }

  // 3. District scope match (only if scope is DISTRICT)
  if (
    alert.scope === 'DISTRICT' &&
    alert.district &&
    citizenDistrict &&
    normalizeLocation(alert.district) === normalizeLocation(citizenDistrict)
  ) {
    return true;
  }

  // 4. State scope match (only if scope is STATE)
  if (
    alert.scope === 'STATE' &&
    alert.state &&
    citizenState &&
    normalizeLocation(alert.state) === normalizeLocation(citizenState)
  ) {
    return true;
  }

  return false;
}
