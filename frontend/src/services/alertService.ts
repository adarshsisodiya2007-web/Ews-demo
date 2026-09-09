import { ResponderAlert, CreateAlertPayload } from '../types/alertTypes';

const resolveBase = (): string => {
  const env = (import.meta as any).env || {};
  return (
    env.VITE_API_BASE_URL ||
    env.VITE_API_URL ||
    env.VITE_BACKEND_URL ||
    'https://ews-backend-gateway-vck8.onrender.com'
  );
};

const authHeaders = (): Record<string, string> => {
  const token = localStorage.getItem('ews_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

/** Fetch active alerts for a citizen's location */
export async function fetchActiveAlertsForLocation(
  regionId?: string,
  district?: string,
  state?: string
): Promise<ResponderAlert[]> {
  const params = new URLSearchParams();
  if (regionId) params.set('regionId', regionId);
  if (district) params.set('district', district);
  if (state) params.set('state', state);

  const url = `${resolveBase()}/api/citizen/alerts/active?${params}`;
  const res = await fetch(url);
  if (!res.ok) return [];
  return res.json();
}

/** Fetch all active responder alerts (for map or admin view) */
export async function fetchAllActiveAlerts(): Promise<ResponderAlert[]> {
  const res = await fetch(`${resolveBase()}/api/citizen/alerts/all`);
  if (!res.ok) return [];
  return res.json();
}

/** Responder: list all managed alerts */
export async function fetchResponderAlerts(): Promise<ResponderAlert[]> {
  const res = await fetch(`${resolveBase()}/api/responder/alerts`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error('Failed to fetch responder alerts');
  return res.json();
}

/** Responder: create a new alert */
export async function createResponderAlert(
  payload: CreateAlertPayload
): Promise<ResponderAlert> {
  const res = await fetch(`${resolveBase()}/api/responder/alerts`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(err || 'Failed to create alert');
  }
  return res.json();
}

/** Responder: update an alert */
export async function updateResponderAlert(
  id: string,
  payload: Partial<CreateAlertPayload>
): Promise<ResponderAlert> {
  const res = await fetch(`${resolveBase()}/api/responder/alerts/${id}`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('Failed to update alert');
  return res.json();
}

/** Responder: resolve an alert */
export async function resolveAlert(id: string): Promise<ResponderAlert> {
  const res = await fetch(`${resolveBase()}/api/responder/alerts/${id}/resolve`, {
    method: 'PATCH',
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error('Failed to resolve alert');
  return res.json();
}

/** Responder: cancel/deactivate an alert */
export async function cancelAlert(id: string): Promise<ResponderAlert> {
  const res = await fetch(`${resolveBase()}/api/responder/alerts/${id}/cancel`, {
    method: 'PATCH',
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error('Failed to cancel alert');
  return res.json();
}

/** Responder: delete an alert */
export async function deleteAlert(id: string): Promise<void> {
  const res = await fetch(`${resolveBase()}/api/responder/alerts/${id}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error('Failed to delete alert');
}

/** Normalize location string for comparison */
export function normalizeLocation(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, ' ');
}

/** Check if an alert matches the citizen's location */
export function alertMatchesLocation(
  alert: ResponderAlert,
  citizenRegionId?: string,
  citizenDistrict?: string,
  citizenState?: string
): boolean {
  // 1. Exact region UUID match
  if (alert.regionId && citizenRegionId && alert.regionId === citizenRegionId) {
    return true;
  }
  // 2. District scope match
  if (
    alert.scope === 'DISTRICT' &&
    alert.district &&
    citizenDistrict &&
    normalizeLocation(alert.district) === normalizeLocation(citizenDistrict)
  ) {
    return true;
  }
  // 3. State scope match
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
