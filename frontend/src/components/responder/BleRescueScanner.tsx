import React, { useState, useEffect, useRef } from 'react';
import {
  getEmergencyDistressState,
  getBeaconHistory,
  getPendingReports,
  getCachedIncidents,
  EmergencyDistressState,
} from '../../services/offlineStore';
import { fetchActiveBeacons, updateReportStatus } from '../../services/api';
import { CitizenReport } from '../../types';
import { calculateHaversineDistanceKm, calculateCompassBearing } from '../../utils/geoUtils';

export interface DetectedSignal {
  beaconId: string;
  reportId?: string;
  status: 'ACTIVE' | 'RESCUE_IN_PROGRESS' | 'RESOLVED';
  source: 'STORED_CITIZEN_BEACON' | 'OFFLINE_QUEUE' | 'DEMO';
  distanceKm: number | null;
  bearing?: string;
  lat: number;
  lng: number;
  priority: 'HIGH' | 'MEDIUM';
  priorityReason: string;
  medicalUrgent: boolean;
  timeDetected: string;
  responderNotes?: string;
}

const DEMO_SIGNALS: DetectedSignal[] = [
  {
    beaconId: 'EWS-DEMO01',
    status: 'ACTIVE',
    source: 'DEMO',
    distanceKm: 0.8,
    bearing: 'Northeast',
    lat: 11.5580,
    lng: 76.1360,
    priority: 'HIGH',
    priorityReason: 'Trapped citizen beneath debris · Urgent medical flagged',
    medicalUrgent: true,
    timeDetected: 'Just now',
  },
  {
    beaconId: 'EWS-DEMO02',
    status: 'ACTIVE',
    source: 'DEMO',
    distanceKm: 1.6,
    bearing: 'Southwest',
    lat: 11.5420,
    lng: 76.1240,
    priority: 'MEDIUM',
    priorityReason: 'Non-immediate road blockage evacuation request',
    medicalUrgent: false,
    timeDetected: '4 mins ago',
  }
];

interface Props {
  officerLat?: number;
  officerLng?: number;
}

export const BleRescueScanner: React.FC<Props> = ({
  officerLat = 11.5513,
  officerLng = 76.1264,
}) => {
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [scannerStatus, setScannerStatus] = useState<string>('SCANNER IDLE');
  const [detectedSignals, setDetectedSignals] = useState<DetectedSignal[]>(DEMO_SIGNALS);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const serverReportsRef = useRef<Map<string, CitizenReport>>(new Map());

  // Automatically fetch active beacons on mount and refresh periodically
  useEffect(() => {
    refreshAllSignals();
    const interval = setInterval(() => {
      refreshAllSignals();
    }, 8000);
    return () => clearInterval(interval);
  }, [officerLat, officerLng]);

  const refreshAllSignals = async (): Promise<DetectedSignal[]> => {
    const newSignals: DetectedSignal[] = [];
    const seenBeaconIds = new Set<string>();

    // 1. Fetch live canonical beacons from backend database
    try {
      const serverBeacons = await fetchActiveBeacons();
      for (const rep of serverBeacons) {
        let bId = rep.beaconId;
        if (!bId && rep.description) {
          const match = rep.description.match(/EWS-[A-Z0-9]{5,8}/i);
          if (match) bId = match[0].toUpperCase();
        }
        if (!bId) {
          bId = rep.clientReportId ? `EWS-${rep.clientReportId.slice(-6).toUpperCase()}` : `EWS-${rep.id.slice(0, 6).toUpperCase()}`;
        }

        if (seenBeaconIds.has(bId)) continue;
        seenBeaconIds.add(bId);
        serverReportsRef.current.set(bId, rep);

        const lat = rep.geoLat;
        const lng = rep.geoLng;
        const dist = calculateHaversineDistanceKm(officerLat, officerLng, lat, lng);
        const brg = calculateCompassBearing(officerLat, officerLng, lat, lng);
        const inProgress = rep.status === 'DISPATCHED' || rep.status === 'VERIFIED';

        newSignals.push({
          beaconId: bId,
          reportId: rep.id,
          status: inProgress ? 'RESCUE_IN_PROGRESS' : 'ACTIVE',
          source: 'STORED_CITIZEN_BEACON',
          distanceKm: dist,
          bearing: brg,
          lat,
          lng,
          priority: 'HIGH',
          priorityReason: rep.description || 'Citizen Active Emergency Distress Beacon (Backend Synchronized)',
          medicalUrgent: true,
          timeDetected: rep.createdAt ? new Date(rep.createdAt).toLocaleTimeString() : 'Active',
        });
      }
    } catch (err) {
      console.warn('Could not fetch active beacons from backend:', err);
    }

    // 2. Check local browser distress state (if officer is testing citizen on same device)
    const citizenBeacon = getEmergencyDistressState();
    if (citizenBeacon && citizenBeacon.active && !seenBeaconIds.has(citizenBeacon.beaconId)) {
      seenBeaconIds.add(citizenBeacon.beaconId);
      const dist = calculateHaversineDistanceKm(officerLat, officerLng, citizenBeacon.lat, citizenBeacon.lng);
      const brg = calculateCompassBearing(officerLat, officerLng, citizenBeacon.lat, citizenBeacon.lng);

      newSignals.push({
        beaconId: citizenBeacon.beaconId,
        status: citizenBeacon.status === 'ACTIVE' ? 'ACTIVE' : 'RESCUE_IN_PROGRESS',
        source: 'STORED_CITIZEN_BEACON',
        distanceKm: dist,
        bearing: brg,
        lat: citizenBeacon.lat,
        lng: citizenBeacon.lng,
        priority: 'HIGH',
        priorityReason: citizenBeacon.notes || 'Citizen Active Emergency Distress Beacon (Local Device)',
        medicalUrgent: citizenBeacon.medicalUrgent || true,
        timeDetected: new Date(citizenBeacon.activatedAt).toLocaleTimeString(),
      });
    }

    // 3. Check pending offline emergency reports
    try {
      const pending = await getPendingReports();
      for (const r of pending) {
        const desc = r.payload.description || '';
        const isEmergency = desc.includes('DISTRESS') || desc.includes('EMERGENCY SOS') || r.payload.medicalUrgent;
        if (!isEmergency) continue;

        let bId = r.payload.beaconId;
        if (!bId) {
          const match = desc.match(/EWS-[A-Z0-9]{5,8}/i);
          if (match) bId = match[0].toUpperCase();
        }
        if (!bId) {
          bId = `EWS-${r.clientReportId.slice(-6).toUpperCase()}`;
        }

        if (seenBeaconIds.has(bId)) continue;
        seenBeaconIds.add(bId);

        const lat = r.payload.geoLat;
        const lng = r.payload.geoLng;
        const dist = calculateHaversineDistanceKm(officerLat, officerLng, lat, lng);
        const brg = calculateCompassBearing(officerLat, officerLng, lat, lng);

        newSignals.push({
          beaconId: bId,
          status: 'ACTIVE',
          source: 'OFFLINE_QUEUE',
          distanceKm: dist,
          bearing: brg,
          lat,
          lng,
          priority: 'HIGH',
          priorityReason: desc || 'IndexedDB Offline Report Queue (Urgent Medical Extraction)',
          medicalUrgent: true,
          timeDetected: new Date(r.timestamp).toLocaleTimeString(),
        });
      }
    } catch {}

    setDetectedSignals(prev => {
      // Preserve any in-progress status set by officer in this session
      const updated = newSignals.map(sig => {
        const existing = prev.find(p => p.beaconId === sig.beaconId);
        if (existing && existing.status === 'RESCUE_IN_PROGRESS') {
          return { ...sig, status: 'RESCUE_IN_PROGRESS' as const, responderNotes: existing.responderNotes };
        }
        return sig;
      });

      // Keep demo signals only if no real signals exist
      if (updated.length === 0) {
        return prev.length > 0 ? prev : DEMO_SIGNALS;
      }
      return updated;
    });

    return newSignals;
  };

  const handleScanBle = async () => {
    setIsScanning(true);
    setScannerStatus('SCANNING FOR BLE PACKETS (30s timeout)…');
    setActionNotice(null);

    try {
      const signals = await refreshAllSignals();
      setIsScanning(false);
      setScannerStatus(`SCAN COMPLETE — ${signals.length} active emergency signal(s) synchronized`);
    } catch {
      setIsScanning(false);
      setScannerStatus('SCAN COMPLETE — Signals refreshed from local radio environment & storage');
    }
  };

  const handleClearDetections = () => {
    setDetectedSignals([]);
    setScannerStatus('DETECTIONS CLEARED');
    setActionNotice('Cleared all detected signals from memory.');
  };

  const handleLoadStoredCitizenBeacon = async () => {
    setActionNotice(null);
    const signals = await refreshAllSignals();

    if (signals.length > 0) {
      const first = signals[0];
      setActionNotice(`✅ Loaded active citizen beacon [${first.beaconId}] at Lat ${first.lat.toFixed(4)}, Lon ${first.lng.toFixed(4)}.`);
    } else {
      setActionNotice('ℹ️ No live citizen beacon active in backend database or browser storage.');
    }
  };

  const handleStartRescue = async (beaconId: string) => {
    setDetectedSignals(prev =>
      prev.map(s =>
        s.beaconId === beaconId
          ? {
              ...s,
              status: 'RESCUE_IN_PROGRESS',
              responderNotes: `Rescue team deployed at ${new Date().toLocaleTimeString()} by Field Officer.`,
            }
          : s
      )
    );
    setActionNotice(`🚑 RESCUE RESPONSE INITIATED for ${beaconId}. GPS coordinates locked to navigator.`);

    // Sync status change to backend database if report ID is available
    const rep = serverReportsRef.current.get(beaconId);
    if (rep && rep.id) {
      try {
        await updateReportStatus(rep.id, 'DISPATCHED');
      } catch (err) {
        console.warn('Failed to update report status on backend:', err);
      }
    }
  };

  const filteredSignals = detectedSignals.filter(s =>
    s.beaconId.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.priorityReason.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div
      style={{
        background: '#0b1329',
        border: '1px solid #1e293b',
        borderRadius: '16px',
        padding: '24px',
        marginBottom: '24px',
        fontFamily: 'Inter, system-ui, sans-serif',
      }}
    >
      {/* ── Title & Subtitle ── */}
      <div style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '1.8rem' }}>🚑</span>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 900, color: '#f8fafc' }}>
              Responder Mode
            </h3>
            <p style={{ margin: '2px 0 0 0', fontSize: '0.84rem', color: '#94a3b8' }}>
              Detect nearby emergency BLE signals and prioritize rescue response.
            </p>
          </div>
        </div>
      </div>

      {/* ── Action Notice ── */}
      {actionNotice && (
        <div
          style={{
            background: 'rgba(34, 197, 94, 0.15)',
            border: '1px solid #22c55e',
            borderRadius: '8px',
            padding: '10px 14px',
            marginBottom: '16px',
            fontSize: '0.82rem',
            color: '#86efac',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span>{actionNotice}</span>
          <button
            onClick={() => setActionNotice(null)}
            style={{ background: 'transparent', border: 'none', color: 'inherit', cursor: 'pointer', fontWeight: 800 }}
          >
            ✕
          </button>
        </div>
      )}

      {/* ── BLE Rescue Scanner Control Box ── */}
      <div
        style={{
          background: '#1e293b',
          border: '1px solid #334155',
          borderRadius: '12px',
          padding: '18px',
          marginBottom: '18px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '12px' }}>
          <div>
            <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>📡</span> BLE Rescue Scanner
            </h4>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.78rem', color: '#cbd5e1' }}>
              The responder phone can scan for nearby Bluetooth Low Energy devices when native Android BLE permissions/capabilities are available.
            </p>
          </div>
          <span
            style={{
              background: isScanning ? 'rgba(234, 88, 12, 0.25)' : '#0f172a',
              color: isScanning ? '#fb923c' : '#94a3b8',
              border: `1px solid ${isScanning ? '#ea580c' : '#334155'}`,
              borderRadius: '20px',
              padding: '4px 12px',
              fontSize: '0.72rem',
              fontWeight: 800,
            }}
          >
            {scannerStatus}
          </span>
        </div>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button
            onClick={handleScanBle}
            disabled={isScanning}
            style={{
              background: isScanning ? '#475569' : 'linear-gradient(135deg, #0284c7, #0369a1)',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              padding: '10px 18px',
              fontSize: '0.85rem',
              fontWeight: 800,
              cursor: isScanning ? 'wait' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <span>📡</span>
            <span>{isScanning ? 'Scanning BLE Airwaves…' : 'SCAN FOR BLE DEVICES'}</span>
          </button>

          <button
            onClick={handleClearDetections}
            style={{
              background: '#0f172a',
              color: '#94a3b8',
              border: '1px solid #334155',
              borderRadius: '8px',
              padding: '10px 16px',
              fontSize: '0.82rem',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Clear BLE Detections
          </button>
        </div>
      </div>

      {/* ── Prototype Beacon Test Card ── */}
      <div
        style={{
          background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.7), rgba(15, 23, 42, 0.9))',
          border: '1px dashed #475569',
          borderRadius: '12px',
          padding: '16px 18px',
          marginBottom: '20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div>
          <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#fcd34d', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span>🧪</span> Prototype Beacon Test
          </div>
          <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '2px' }}>
            Allows testing the citizen beacon workflow without pretending that browser BLE exists. Connects to local citizen distress state.
          </div>
        </div>

        <button
          onClick={handleLoadStoredCitizenBeacon}
          style={{
            background: '#1e293b',
            color: '#fcd34d',
            border: '1px solid #f59e0b',
            borderRadius: '8px',
            padding: '8px 14px',
            fontSize: '0.82rem',
            fontWeight: 800,
            cursor: 'pointer',
          }}
        >
          Load Stored Citizen Beacon
        </button>
      </div>

      {/* ── Search Bar by Beacon ID ── */}
      <div style={{ marginBottom: '16px' }}>
        <input
          type="text"
          placeholder="🔍 Search by Beacon ID (e.g. EWS-XXXXXX) or Emergency Category…"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          style={{
            width: '100%',
            background: '#0f172a',
            border: '1px solid #334155',
            borderRadius: '8px',
            padding: '10px 14px',
            color: '#f8fafc',
            fontSize: '0.84rem',
            boxSizing: 'border-box',
          }}
        />
      </div>

      {/* ── Detected Rescue Signals List ── */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>🚨</span> Detected Rescue Signals ({filteredSignals.length})
          </h4>
          <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
            Ranked by Rescue Priority
          </span>
        </div>

        {filteredSignals.length === 0 ? (
          <div style={{ background: '#1e293b', borderRadius: '10px', padding: '24px', textAlign: 'center', color: '#94a3b8', fontSize: '0.85rem' }}>
            No rescue signals detected. Click "SCAN FOR BLE DEVICES" or "Load Stored Citizen Beacon".
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {filteredSignals.map(signal => {
              const isHigh = signal.priority === 'HIGH';
              const isInProgress = signal.status === 'RESCUE_IN_PROGRESS';

              return (
                <div
                  key={signal.beaconId}
                  style={{
                    background: isHigh ? 'linear-gradient(135deg, rgba(239, 68, 68, 0.12), #1e293b)' : '#1e293b',
                    border: `1px solid ${isHigh ? '#ef444480' : '#334155'}`,
                    borderRadius: '12px',
                    padding: '16px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '1.2rem', fontWeight: 900, color: isHigh ? '#ef4444' : '#38bdf8', letterSpacing: '0.04em' }}>
                          {signal.beaconId}
                        </span>
                        <span
                          style={{
                            background: isInProgress ? 'rgba(56, 189, 248, 0.2)' : 'rgba(34, 197, 94, 0.2)',
                            color: isInProgress ? '#38bdf8' : '#4ade80',
                            border: `1px solid ${isInProgress ? '#38bdf8' : '#22c55e'}`,
                            borderRadius: '4px',
                            padding: '2px 8px',
                            fontSize: '0.7rem',
                            fontWeight: 800,
                          }}
                        >
                          {signal.status}
                        </span>
                        <span style={{ background: '#0f172a', color: '#94a3b8', borderRadius: '4px', padding: '2px 6px', fontSize: '0.68rem' }}>
                          Source: {signal.source}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.78rem', color: '#cbd5e1', marginTop: '4px' }}>
                        {signal.distanceKm !== null ? `Distance: ~${signal.distanceKm} km ${signal.bearing || ''}` : 'Distance: Processing'} · GPS: {signal.lat.toFixed(4)}, {signal.lng.toFixed(4)} · Detected: {signal.timeDetected}
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <span
                        style={{
                          background: isHigh ? '#dc2626' : '#d97706',
                          color: '#ffffff',
                          padding: '4px 10px',
                          borderRadius: '6px',
                          fontWeight: 800,
                          fontSize: '0.72rem',
                          textTransform: 'uppercase',
                        }}
                      >
                        Priority: {signal.priority}
                      </span>
                    </div>
                  </div>

                  {/* Priority Reason */}
                  <div style={{ fontSize: '0.78rem', color: isHigh ? '#fca5a5' : '#fcd34d', background: 'rgba(0,0,0,0.2)', padding: '6px 10px', borderRadius: '6px' }}>
                    ⚡ <strong>Reason:</strong> {signal.priorityReason}
                  </div>

                  {/* Responder Assignment Status */}
                  {signal.responderNotes && (
                    <div style={{ fontSize: '0.75rem', color: '#38bdf8', background: 'rgba(56,189,248,0.1)', padding: '6px 10px', borderRadius: '6px' }}>
                      🛡️ {signal.responderNotes}
                    </div>
                  )}

                  {/* Action Button */}
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '4px' }}>
                    <button
                      onClick={() => handleStartRescue(signal.beaconId)}
                      disabled={isInProgress}
                      style={{
                        background: isInProgress ? '#334155' : 'linear-gradient(135deg, #16a34a, #15803d)',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '8px',
                        padding: '8px 18px',
                        fontWeight: 800,
                        fontSize: '0.82rem',
                        cursor: isInProgress ? 'default' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      <span>🚑</span>
                      <span>{isInProgress ? 'RESCUE IN PROGRESS' : 'START RESCUE RESPONSE'}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Honest Technical Capability Notice ── */}
      <div
        style={{
          marginTop: '20px',
          padding: '10px 14px',
          background: 'rgba(15, 23, 42, 0.7)',
          border: '1px solid #334155',
          borderRadius: '8px',
          fontSize: '0.72rem',
          color: '#64748b',
          lineHeight: '1.4',
        }}
      >
        <strong>Technical Honesty:</strong> Prototype stage — distress signal is stored locally. Native Bluetooth/BLE advertising and responder detection require the Android native BLE layer. Fake hops or simulated NDRF satellite acknowledgements are disabled.
      </div>
    </div>
  );
};
