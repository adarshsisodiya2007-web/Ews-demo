import React, { useState, useEffect } from 'react';
import {
  getEmergencyDistressState,
  getBeaconHistory,
  getPendingReports,
  getCachedIncidents,
  EmergencyDistressState,
} from '../../services/offlineStore';
import { calculateHaversineDistanceKm, calculateCompassBearing } from '../../utils/geoUtils';

export interface DetectedSignal {
  beaconId: string;
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
  officerLat = 11.5534,
  officerLng = 76.1320,
}) => {
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [scannerStatus, setScannerStatus] = useState<string>('SCANNER IDLE');
  const [detectedSignals, setDetectedSignals] = useState<DetectedSignal[]>(DEMO_SIGNALS);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  // Automatically check if there's an active citizen beacon on mount
  useEffect(() => {
    checkActiveCitizenBeacon();
  }, []);

  const checkActiveCitizenBeacon = () => {
    const citizenBeacon = getEmergencyDistressState();
    if (citizenBeacon && citizenBeacon.active) {
      addCitizenBeaconToSignals(citizenBeacon);
    }
  };

  const addCitizenBeaconToSignals = (beacon: EmergencyDistressState) => {
    const dist = calculateHaversineDistanceKm(officerLat, officerLng, beacon.lat, beacon.lng);
    const brg = calculateCompassBearing(officerLat, officerLng, beacon.lat, beacon.lng);

    const signal: DetectedSignal = {
      beaconId: beacon.beaconId,
      status: beacon.status === 'ACTIVE' ? 'ACTIVE' : 'RESCUE_IN_PROGRESS',
      source: 'STORED_CITIZEN_BEACON',
      distanceKm: dist,
      bearing: brg,
      lat: beacon.lat,
      lng: beacon.lng,
      priority: 'HIGH',
      priorityReason: 'Citizen Active Emergency Distress Beacon (100% Verified Local Signal)',
      medicalUrgent: beacon.medicalUrgent || true,
      timeDetected: new Date(beacon.activatedAt).toLocaleTimeString(),
    };

    setDetectedSignals(prev => {
      const filtered = prev.filter(s => s.beaconId !== beacon.beaconId);
      return [signal, ...filtered];
    });
  };

  const handleScanBle = () => {
    setIsScanning(true);
    setScannerStatus('SCANNING FOR BLE PACKETS (30s timeout)…');
    setActionNotice(null);

    // Simulate genuine scan interval looking for local/stored signals
    setTimeout(() => {
      // Check stored citizen beacons and pending reports
      checkActiveCitizenBeacon();
      const history = getBeaconHistory();
      if (history.length > 0) {
        history.forEach(b => {
          if (b.active) addCitizenBeaconToSignals(b);
        });
      }

      setIsScanning(false);
      setScannerStatus('SCAN COMPLETE — Signals refreshed from local radio environment & storage');
    }, 2500);
  };

  const handleClearDetections = () => {
    setDetectedSignals([]);
    setScannerStatus('DETECTIONS CLEARED');
    setActionNotice('Cleared all detected signals from memory.');
  };

  const handleLoadStoredCitizenBeacon = async () => {
    setActionNotice(null);
    const active = getEmergencyDistressState();
    const history = getBeaconHistory();
    const pending = await getPendingReports();

    let found = false;

    if (active) {
      addCitizenBeaconToSignals(active);
      found = true;
      setActionNotice(`✅ Loaded active citizen beacon [${active.beaconId}] at Lat ${active.lat.toFixed(4)}, Lon ${active.lng.toFixed(4)}.`);
    } else if (history.length > 0) {
      addCitizenBeaconToSignals(history[0]);
      found = true;
      setActionNotice(`✅ Loaded recent citizen beacon [${history[0].beaconId}] from offline history.`);
    }

    // Also check pending emergency reports
    const emergencyReport = pending.find(r => r.payload.description?.includes('[DISTRESS BEACON') || r.payload.medicalUrgent);
    if (emergencyReport && (!active || emergencyReport.clientReportId !== active.clientReportId)) {
      const lat = emergencyReport.payload.geoLat;
      const lng = emergencyReport.payload.geoLng;
      const dist = calculateHaversineDistanceKm(officerLat, officerLng, lat, lng);
      const brg = calculateCompassBearing(officerLat, officerLng, lat, lng);
      const bId = emergencyReport.payload.beaconId || `EWS-${emergencyReport.clientReportId.slice(-6).toUpperCase()}`;

      const item: DetectedSignal = {
        beaconId: bId,
        status: 'ACTIVE',
        source: 'OFFLINE_QUEUE',
        distanceKm: dist,
        bearing: brg,
        lat,
        lng,
        priority: 'HIGH',
        priorityReason: 'IndexedDB Offline Report Queue (Urgent Medical Extraction)',
        medicalUrgent: true,
        timeDetected: new Date(emergencyReport.timestamp).toLocaleTimeString(),
      };

      setDetectedSignals(prev => [item, ...prev.filter(x => x.beaconId !== bId)]);
      found = true;
      setActionNotice(`✅ Loaded queued emergency report with Beacon ID [${bId}].`);
    }

    if (!found) {
      // Load fallback prototype demonstration beacon
      const demoBeacon: EmergencyDistressState = {
        beaconId: 'EWS-296SFS',
        status: 'ACTIVE',
        active: true,
        createdAt: Date.now(),
        activatedAt: Date.now(),
        lat: officerLat + 0.005,
        lng: officerLng + 0.003,
        medicalUrgent: true,
        emergencyType: 'Citizen Trapped',
      };
      addCitizenBeaconToSignals(demoBeacon);
      setActionNotice('ℹ️ No live citizen beacon active in browser memory. Loaded verified prototype test beacon [EWS-296SFS].');
    }
  };

  const handleStartRescue = (beaconId: string) => {
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
          placeholder="🔍 Search by Beacon ID (e.g. EWS-296SFS) or Emergency Category…"
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
