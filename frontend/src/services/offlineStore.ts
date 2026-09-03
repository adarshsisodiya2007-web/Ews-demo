import { openDB, IDBPDatabase } from 'idb';
import {
  CreateReportPayload,
  RegionRisk,
  CitizenReport,
  RoadStatus,
  PendingReportItem,
  PendingRoadStatusItem,
  CachedRecord,
  RiskAssessmentResponse,
  SyncStatus
} from '../types';

const DB_NAME = 'ews-offline-db';
const DB_VERSION = 2;

let dbPromise: Promise<IDBPDatabase> | null = null;

const getDB = (): Promise<IDBPDatabase> => {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion) {
        if (!db.objectStoreNames.contains('pending-reports')) {
          db.createObjectStore('pending-reports', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('cached-heatmap')) {
          db.createObjectStore('cached-heatmap', { keyPath: 'key' });
        }
        if (!db.objectStoreNames.contains('offline-photos')) {
          db.createObjectStore('offline-photos', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('pending-road-status')) {
          db.createObjectStore('pending-road-status', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('cached-telemetry')) {
          db.createObjectStore('cached-telemetry', { keyPath: 'key' });
        }
        if (!db.objectStoreNames.contains('cached-shelters')) {
          db.createObjectStore('cached-shelters', { keyPath: 'key' });
        }
        if (!db.objectStoreNames.contains('cached-incidents')) {
          db.createObjectStore('cached-incidents', { keyPath: 'key' });
        }
        if (!db.objectStoreNames.contains('cached-gis')) {
          db.createObjectStore('cached-gis', { keyPath: 'key' });
        }
      },
    });
  }
  return dbPromise;
};

// ── PHOTO STORAGE ────────────────────────────────────────────────────────────

export interface OfflinePhotoRecord {
  id: string;
  blob: Blob;
  filename: string;
  mimeType: string;
  timestamp: number;
}

export const saveOfflinePhoto = async (id: string, blob: Blob, filename = 'hazard.jpg'): Promise<string> => {
  const db = await getDB();
  const record: OfflinePhotoRecord = {
    id,
    blob,
    filename,
    mimeType: blob.type || 'image/jpeg',
    timestamp: Date.now(),
  };
  await db.put('offline-photos', record);
  return id;
};

export const getOfflinePhoto = async (id: string): Promise<Blob | null> => {
  const db = await getDB();
  const record = await db.get('offline-photos', id) as OfflinePhotoRecord | undefined;
  return record ? record.blob : null;
};

export const deleteOfflinePhoto = async (id: string): Promise<void> => {
  const db = await getDB();
  await db.delete('offline-photos', id);
};

// ── PENDING REPORT QUEUE (CITIZEN & OFFICER) ───────────────────────────────────

export const generateClientReportId = (): string => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `ews_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
};

export const queueReport = async (
  payload: CreateReportPayload,
  photoBlob?: Blob
): Promise<PendingReportItem> => {
  const db = await getDB();
  const clientReportId = payload.clientReportId || generateClientReportId();
  let photoBlobKey: string | null = payload.photoBlobKey || null;

  if (photoBlob) {
    photoBlobKey = `photo_${clientReportId}`;
    await saveOfflinePhoto(photoBlobKey, photoBlob, `hazard_${Date.now()}.jpg`);
  }

  const enrichedPayload: CreateReportPayload = {
    ...payload,
    clientReportId,
    photoBlobKey,
  };

  const item: PendingReportItem = {
    id: clientReportId,
    clientReportId,
    payload: enrichedPayload,
    timestamp: Date.now(),
    syncStatus: 'PENDING_SYNC',
    retryCount: 0,
  };

  await db.put('pending-reports', item);
  window.dispatchEvent(new CustomEvent('ews-queue-change', { detail: { type: 'report', item } }));
  return item;
};

export const getPendingReports = async (): Promise<PendingReportItem[]> => {
  const db = await getDB();
  return db.getAll('pending-reports');
};

export const updatePendingReport = async (item: PendingReportItem): Promise<void> => {
  const db = await getDB();
  await db.put('pending-reports', item);
  window.dispatchEvent(new CustomEvent('ews-queue-change', { detail: { type: 'report', item } }));
};

export const removePendingReport = async (id: string): Promise<void> => {
  const db = await getDB();
  const item = await db.get('pending-reports', id) as PendingReportItem | undefined;
  if (item?.payload.photoBlobKey) {
    await deleteOfflinePhoto(item.payload.photoBlobKey).catch(() => {});
  }
  await db.delete('pending-reports', id);
  window.dispatchEvent(new CustomEvent('ews-queue-change', { detail: { type: 'report_deleted', id } }));
};

// ── PENDING ROAD STATUS QUEUE (OFFICER / RESPONDER) ───────────────────────────

export const queueRoadStatus = async (
  regionId: string,
  roadStatus: RoadStatus,
  regionName?: string
): Promise<PendingRoadStatusItem> => {
  const db = await getDB();
  const id = `road_${regionId}_${Date.now()}`;
  const item: PendingRoadStatusItem = {
    id,
    regionId,
    roadStatus,
    regionName: regionName || 'Monitored Corridor',
    timestamp: Date.now(),
    syncStatus: 'PENDING_SYNC',
    retryCount: 0,
  };

  await db.put('pending-road-status', item);
  window.dispatchEvent(new CustomEvent('ews-queue-change', { detail: { type: 'road_status', item } }));
  return item;
};

export const getPendingRoadStatuses = async (): Promise<PendingRoadStatusItem[]> => {
  const db = await getDB();
  return db.getAll('pending-road-status');
};

export const updatePendingRoadStatus = async (item: PendingRoadStatusItem): Promise<void> => {
  const db = await getDB();
  await db.put('pending-road-status', item);
  window.dispatchEvent(new CustomEvent('ews-queue-change', { detail: { type: 'road_status', item } }));
};

export const removePendingRoadStatus = async (id: string): Promise<void> => {
  const db = await getDB();
  await db.delete('pending-road-status', id);
  window.dispatchEvent(new CustomEvent('ews-queue-change', { detail: { type: 'road_status_deleted', id } }));
};

// ── CACHED DATA STORES (WITH TIMESTAMPS) ──────────────────────────────────────

export const cacheHeatmap = async (data: RegionRisk[]): Promise<void> => {
  const db = await getDB();
  const record: CachedRecord<RegionRisk[]> = {
    key: 'main',
    data,
    timestamp: Date.now(),
  };
  await db.put('cached-heatmap', record);
};

export const getCachedHeatmap = async (): Promise<RegionRisk[] | null> => {
  const db = await getDB();
  const result = await db.get('cached-heatmap', 'main') as CachedRecord<RegionRisk[]> | undefined;
  return result ? result.data : null;
};

export const getCachedHeatmapWithMeta = async (): Promise<CachedRecord<RegionRisk[]> | null> => {
  const db = await getDB();
  return (await db.get('cached-heatmap', 'main')) || null;
};

export const cacheTelemetry = async (zoneKey: string, data: RiskAssessmentResponse): Promise<void> => {
  const db = await getDB();
  const record: CachedRecord<RiskAssessmentResponse> = {
    key: zoneKey,
    data,
    timestamp: Date.now(),
  };
  await db.put('cached-telemetry', record);
};

export const getCachedTelemetry = async (zoneKey: string): Promise<CachedRecord<RiskAssessmentResponse> | null> => {
  const db = await getDB();
  return (await db.get('cached-telemetry', zoneKey)) || null;
};

export const cacheShelters = async (data: any[]): Promise<void> => {
  const db = await getDB();
  const record: CachedRecord<any[]> = {
    key: 'all',
    data,
    timestamp: Date.now(),
  };
  await db.put('cached-shelters', record);
};

export const getCachedShelters = async (): Promise<CachedRecord<any[]> | null> => {
  const db = await getDB();
  return (await db.get('cached-shelters', 'all')) || null;
};

export const cacheIncidents = async (data: CitizenReport[]): Promise<void> => {
  const db = await getDB();
  const record: CachedRecord<CitizenReport[]> = {
    key: 'all',
    data,
    timestamp: Date.now(),
  };
  await db.put('cached-incidents', record);
};

export const getCachedIncidents = async (): Promise<CachedRecord<CitizenReport[]> | null> => {
  const db = await getDB();
  return (await db.get('cached-incidents', 'all')) || null;
};

export const cacheGisData = async (key: string, data: any): Promise<void> => {
  const db = await getDB();
  const record: CachedRecord<any> = {
    key,
    data,
    timestamp: Date.now(),
  };
  await db.put('cached-gis', record);
};

export const getCachedGisData = async (key: string): Promise<CachedRecord<any> | null> => {
  const db = await getDB();
  return (await db.get('cached-gis', key)) || null;
};

// ── EMERGENCY DISTRESS BEACON STATE (SIGNAL RESCUERS) ─────────────────────────

export interface EmergencyDistressState {
  beaconId: string;       // e.g. EWS-296SFS
  status: 'ACTIVE' | 'STOPPED';
  active: boolean;
  createdAt: number;
  activatedAt: number;
  stoppedAt?: number;
  lat: number;
  lng: number;
  medicalUrgent?: boolean;
  emergencyType?: string;
  clientReportId?: string;
  syncStatus?: 'ACTIVE' | 'STOPPED' | 'PENDING_SYNC' | 'SYNCHRONIZED';
  notes?: string;
}

export const generateBeaconId = (): string => {
  const chars = '0123456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let id = '';
  for (let i = 0; i < 6; i++) {
    id += chars[Math.floor(Math.random() * chars.length)];
  }
  return `EWS-${id}`;
};

export const saveBeaconHistory = (beacon: EmergencyDistressState): void => {
  try {
    const raw = localStorage.getItem('ews_beacon_history');
    const list: EmergencyDistressState[] = raw ? JSON.parse(raw) : [];
    const idx = list.findIndex(b => b.beaconId === beacon.beaconId);
    if (idx >= 0) {
      list[idx] = beacon;
    } else {
      list.unshift(beacon);
    }
    localStorage.setItem('ews_beacon_history', JSON.stringify(list.slice(0, 20)));
  } catch {}
};

export const getBeaconHistory = (): EmergencyDistressState[] => {
  try {
    const raw = localStorage.getItem('ews_beacon_history');
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

export const setEmergencyDistressState = (state: EmergencyDistressState | null): void => {
  if (state) {
    localStorage.setItem('ews_emergency_distress', JSON.stringify(state));
    saveBeaconHistory(state);
  } else {
    const existing = getEmergencyDistressState();
    if (existing && existing.active) {
      const stopped: EmergencyDistressState = {
        ...existing,
        active: false,
        status: 'STOPPED',
        stoppedAt: Date.now(),
      };
      localStorage.setItem('ews_emergency_distress', JSON.stringify(stopped));
      saveBeaconHistory(stopped);
    } else {
      localStorage.removeItem('ews_emergency_distress');
    }
  }
  window.dispatchEvent(new CustomEvent('ews-distress-state-change', { detail: state }));
};

export const getEmergencyDistressState = (): EmergencyDistressState | null => {
  try {
    const raw = localStorage.getItem('ews_emergency_distress');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};


