import { ResponderAlert, CreateAlertPayload } from '../types/alertTypes';
// Use the shared axios instance from api.ts — it handles:
//   • Correct base URL for localhost / Android Capacitor / production
//   • Auto-attach JWT Bearer token via request interceptor
//   • Consistent timeout, CORS credentials
import { api, aiClient } from './api';

const LOCAL_ALERTS_KEY = 'satark_published_responder_alerts';

const ALERT_CHANNEL_NAME = 'satark-alerts-channel';
let alertBroadcastChannel: BroadcastChannel | null = null;
function getAlertChannel(): BroadcastChannel | null {
  if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
    if (!alertBroadcastChannel) {
      alertBroadcastChannel = new BroadcastChannel(ALERT_CHANNEL_NAME);
    }
    return alertBroadcastChannel;
  }
  return null;
}

export function broadcastAlertEvent(type: 'PUBLISHED' | 'UPDATED' | 'DELETED', alertOrId: ResponderAlert | { id: string }): void {
  try {
    getAlertChannel()?.postMessage({ type, data: alertOrId });
  } catch {}
  try {
    localStorage.setItem('satark_alert_broadcast_tick', Date.now().toString());
  } catch {}
}

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

    let backendList: ResponderAlert[] = [];
    try {
      const res = await api.get<ResponderAlert[]>('/api/citizen/alerts/active', { params, timeout: 3000 });
      backendList = Array.isArray(res.data) ? res.data : [];
    } catch {
      try {
        const res = await aiClient.get<ResponderAlert[]>('/api/citizen/alerts/active', { params, timeout: 3000 });
        backendList = Array.isArray(res.data) ? res.data : [];
      } catch {
        backendList = [];
      }
    }

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
    let backendList: ResponderAlert[] = [];
    try {
      const res = await api.get<ResponderAlert[]>('/api/citizen/alerts/all', { timeout: 3000 });
      backendList = Array.isArray(res.data) ? res.data : [];
    } catch {
      try {
        const res = await aiClient.get<ResponderAlert[]>('/api/citizen/alerts/all', { timeout: 3000 });
        backendList = Array.isArray(res.data) ? res.data : [];
      } catch {
        backendList = [];
      }
    }
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
    let backendList: ResponderAlert[] = [];
    try {
      const res = await api.get<ResponderAlert[]>('/api/responder/alerts', { timeout: 3000 });
      backendList = Array.isArray(res.data) ? res.data : [];
    } catch {
      try {
        const res = await aiClient.get<ResponderAlert[]>('/api/responder/alerts', { timeout: 3000 });
        backendList = Array.isArray(res.data) ? res.data : [];
      } catch {
        backendList = [];
      }
    }
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
    const res = await api.post<ResponderAlert>('/api/responder/alerts', payload, { timeout: 3000 });
    createdAlert = res.data;
  } catch (e) {
    try {
      const res = await aiClient.post<ResponderAlert>('/api/responder/alerts', payload, { timeout: 3000 });
      createdAlert = res.data;
    } catch {
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
  }

  // Persist locally for instant multi-window / offline reactivity
  const existing = getLocalResponderAlerts().filter(a => a.id !== createdAlert.id);
  saveLocalResponderAlerts([createdAlert, ...existing]);

  // Dispatch global and cross-tab events
  broadcastAlertEvent('PUBLISHED', createdAlert);
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
  let updated: ResponderAlert;
  try {
    const res = await api.put<ResponderAlert>(`/api/responder/alerts/${id}`, payload, { timeout: 3000 });
    updated = res.data;
    const existing = getLocalResponderAlerts().map(a => a.id === id ? { ...a, ...updated } : a);
    saveLocalResponderAlerts(existing);
  } catch {
    const existing = getLocalResponderAlerts();
    const target = existing.find(a => a.id === id);
    if (target) {
      updated = { ...target, ...payload, updatedAt: new Date().toISOString() } as ResponderAlert;
      saveLocalResponderAlerts(existing.map(a => a.id === id ? updated : a));
    } else {
      throw new Error('Alert not found');
    }
  }

  broadcastAlertEvent('UPDATED', updated);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('satark-responder-alert-updated', { detail: updated }));
  }
  return updated;
}

/** Responder: resolve an alert */
export async function resolveAlert(id: string): Promise<ResponderAlert> {
  let updatedAlert: ResponderAlert | undefined;
  try {
    const res = await api.patch<ResponderAlert>(`/api/responder/alerts/${id}/resolve`, {}, { timeout: 3000 });
    updatedAlert = res.data;
  } catch {
    try {
      const res = await aiClient.patch<ResponderAlert>(`/api/responder/alerts/${id}/resolve`, {}, { timeout: 3000 });
      updatedAlert = res.data;
    } catch {
      // local fallback
    }
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

  if (updatedAlert) {
    broadcastAlertEvent('UPDATED', updatedAlert);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('satark-responder-alert-updated', { detail: updatedAlert }));
    }
  }
  return updatedAlert || ({} as ResponderAlert);
}

/** Responder: cancel/deactivate an alert */
export async function cancelAlert(id: string): Promise<ResponderAlert> {
  let updatedAlert: ResponderAlert | undefined;
  try {
    const res = await api.patch<ResponderAlert>(`/api/responder/alerts/${id}/cancel`, {}, { timeout: 3000 });
    updatedAlert = res.data;
  } catch {
    try {
      const res = await aiClient.patch<ResponderAlert>(`/api/responder/alerts/${id}/cancel`, {}, { timeout: 3000 });
      updatedAlert = res.data;
    } catch {
      // local fallback
    }
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

  if (updatedAlert) {
    broadcastAlertEvent('UPDATED', updatedAlert);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('satark-responder-alert-updated', { detail: updatedAlert }));
    }
  }
  return updatedAlert || ({} as ResponderAlert);
}

/** Responder: delete an alert */
export async function deleteAlert(id: string): Promise<void> {
  try {
    await api.delete(`/api/responder/alerts/${id}`, { timeout: 3000 });
  } catch {
    try {
      await aiClient.delete(`/api/responder/alerts/${id}`, { timeout: 3000 });
    } catch {
      // local delete fallback
    }
  }
  const existing = getLocalResponderAlerts().filter(a => a.id !== id);
  saveLocalResponderAlerts(existing);

  broadcastAlertEvent('DELETED', { id });
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('satark-responder-alert-deleted', { detail: { id } }));
  }
}

/** Normalize location string for comparison */
export function normalizeLocation(s: string): string {
  return (s || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

/**
 * Check if an alert matches the citizen's location.
 * Accurately correlates locationName, targetRegion, district, and regionId.
 */
export function alertMatchesLocation(
  alert: ResponderAlert,
  citizenRegionId?: string,
  citizenDistrict?: string,
  citizenState?: string,
  citizenTargetRegion?: string
): boolean {
  // 1. Universal emergency broadcasts match all citizens
  const normScope = (alert.scope || '').toUpperCase();
  if (normScope === 'ALL' || normScope === 'BROADCAST' || normScope === 'NATIONAL') {
    return true;
  }

  // 2. Direct regionId match
  if (alert.regionId && citizenRegionId && alert.regionId === citizenRegionId) {
    return true;
  }

  // If no citizen location specified, receive active alerts by default
  if (!citizenRegionId && !citizenDistrict && !citizenState && !citizenTargetRegion) {
    return true;
  }

  const alertTarget = normalizeLocation(alert.targetRegion || alert.locationName || '');
  if (alertTarget === 'all' || alertTarget === 'all area' || alertTarget === 'other' || alertTarget === 'other area' || alertTarget.includes('universal')) {
    return true;
  }

  const citizenCombined = normalizeLocation(`${citizenTargetRegion || ''} ${citizenDistrict || ''} ${citizenState || ''} ${citizenRegionId || ''}`);

  // 3. District matching (e.g. Kamrup Metropolitan, Kamrup, East Khasi Hills, Aizawl, Wayanad, Idukki)
  if (alert.district && citizenDistrict) {
    const aDist = normalizeLocation(alert.district);
    const cDist = normalizeLocation(citizenDistrict);
    if (aDist === cDist || aDist.includes(cDist) || cDist.includes(aDist)) {
      return true;
    }
  }

  // 4. Target region or location name keyword matching
  if (alertTarget) {
    if (citizenTargetRegion) {
      const cTarget = normalizeLocation(citizenTargetRegion);
      if (cTarget.includes(alertTarget) || alertTarget.includes(cTarget)) {
        return true;
      }
    }

    if (citizenDistrict) {
      const cDist = normalizeLocation(citizenDistrict);
      if (cDist.includes(alertTarget) || alertTarget.includes(cDist)) {
        return true;
      }
    }

    // Tokenized keyword match (e.g. "guwahati", "shillong", "aizawl", "meppadi", "munnar")
    const tokens = alertTarget.split(/[\s,_\-]+/).filter(t => t.length >= 3);
    for (const t of tokens) {
      if (citizenCombined.includes(t)) {
        return true;
      }
    }
  }

  // 5. State scope match (if scope is STATE)
  if (
    normScope === 'STATE' &&
    alert.state &&
    citizenState &&
    normalizeLocation(alert.state) === normalizeLocation(citizenState)
  ) {
    return true;
  }

  return false;
}
