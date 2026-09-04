import React, { useState, useEffect } from 'react';
import {
  queueReport,
  generateClientReportId,
  getPendingReports,
} from '../../services/offlineStore';
import { submitReport } from '../../services/api';
import { CreateReportPayload, PendingReportItem } from '../../types';

interface Props {
  userLat?: number;
  userLon?: number;
  theme?: 'light' | 'dark';
}

export const OfflineSosMesh: React.FC<Props> = ({
  userLat = 11.5534,
  userLon = 76.1320,
  theme = 'dark',
}) => {
  const [broadcasting, setBroadcasting] = useState<boolean>(false);
  const [peopleCount, setPeopleCount] = useState<number>(1);
  const [medicalUrgent, setMedicalUrgent] = useState<boolean>(false);
  const [sosLedger, setSosLedger] = useState<Array<{
    id: string;
    clientReportId: string;
    time: string;
    status: string;
    people: number;
    urgent: boolean;
    lat: number;
    lon: number;
  }>>([]);

  const isOnline = navigator.onLine;

  useEffect(() => {
    loadExistingSosReports();
  }, []);

  const loadExistingSosReports = async () => {
    try {
      const reports = await getPendingReports();
      const sosItems = reports
        .filter(r => r.payload.description?.includes('[OFFLINE SOS BEACON]'))
        .map(r => ({
          id: `SOS-${r.clientReportId.slice(-4).toUpperCase()}`,
          clientReportId: r.clientReportId,
          time: new Date(r.timestamp).toLocaleTimeString(),
          status: r.syncStatus === 'SYNCED' ? 'SYNCHRONIZED_TO_COMMAND_CENTER' : 'STORED_LOCALLY_PENDING_GATEWAY',
          people: 1,
          urgent: r.payload.medicalUrgent || false,
          lat: r.payload.geoLat,
          lon: r.payload.geoLng,
        }));
      if (sosItems.length > 0) {
        setSosLedger(sosItems);
      }
    } catch {}
  };

  const triggerMeshSos = async () => {
    setBroadcasting(true);
    const clientReportId = generateClientReportId();
    const sosId = `SOS-${clientReportId.slice(-4).toUpperCase()}`;

    const desc = `[OFFLINE SOS BEACON] Persons requiring evacuation: ${peopleCount}. Urgent medical assistance: ${medicalUrgent ? 'YES' : 'NO'}. Dispatched from Lat ${userLat.toFixed(4)}, Lon ${userLon.toFixed(4)}.`;

    const payload: CreateReportPayload = {
      geoLat: userLat,
      geoLng: userLon,
      category: medicalUrgent ? 'INJURED_PEOPLE' : 'TRAPPED_CITIZENS',
      description: desc,
      reporterType: 'CITIZEN',
      medicalUrgent,
      clientReportId,
      photoUrl: null,
    };

    let finalStatus = 'STORED_LOCALLY_PENDING_GATEWAY';

    try {
      if (navigator.onLine) {
        await submitReport(payload);
        finalStatus = 'SYNCHRONIZED_TO_COMMAND_CENTER';
      } else {
        await queueReport(payload);
        finalStatus = 'STORED_LOCALLY_PENDING_GATEWAY';
      }
    } catch {
      await queueReport(payload);
      finalStatus = 'STORED_LOCALLY_PENDING_GATEWAY';
    }

    const newRecord = {
      id: sosId,
      clientReportId,
      time: new Date().toLocaleTimeString(),
      status: finalStatus,
      people: peopleCount,
      urgent: medicalUrgent,
      lat: userLat,
      lon: userLon,
    };

    setSosLedger(prev => [newRecord, ...prev]);
    setBroadcasting(false);
  };

  const isLight = theme === 'light';
  const cardBg = isLight ? '#ffffff' : '#0f172a';
  const brd = isLight ? '#e2e8f0' : '#1e293b';
  const itemBrd = isLight ? '#e2e8f0' : '#334155';
  const itemBg = isLight ? '#f8fafc' : '#1e293b';
  const fg = isLight ? '#0f172a' : '#f8fafc';
  const muted = isLight ? '#475569' : '#94a3b8';

  return (
    <div style={{ background: cardBg, border: `1px solid ${brd}`, borderRadius: '16px', padding: '24px', marginBottom: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: fg, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>📴</span> Offline SOS Emergency Beacon &amp; Local Queue
          </h3>
          <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: muted }}>
            Zero-Internet emergency distress beacon with persistent IndexedDB queue &amp; auto-gateway synchronization.
          </p>
        </div>
        <span style={{
          background: isLight ? 'rgba(37, 99, 235, 0.12)' : 'rgba(59, 130, 246, 0.15)',
          border: `1px solid ${isLight ? '#2563eb' : '#3b82f6'}`,
          color: isLight ? '#1d4ed8' : '#60a5fa',
          padding: '4px 12px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 700
        }}>
          {isOnline ? '🟢 CLOUD SYNC READY' : '📶 OFFLINE STORE ACTIVE'}
        </span>
      </div>

      {/* Honest Capability & Architecture Disclosure */}
      <div
        style={{
          background: isLight ? '#f1f5f9' : 'rgba(15, 23, 42, 0.6)',
          border: `1px solid ${isLight ? '#cbd5e1' : '#334155'}`,
          borderRadius: '8px',
          padding: '10px 14px',
          marginBottom: '16px',
          fontSize: '0.75rem',
          color: isLight ? '#334155' : '#cbd5e1',
          lineHeight: '1.5',
        }}
      >
        <strong style={{ color: isLight ? '#0369a1' : '#38bdf8' }}>ℹ️ Offline Protocol Architecture:</strong> Web browsers operate in an OS sandbox without raw Bluetooth LE radio broadcasting privileges. Clicking broadcast creates a cryptographically unique distress record in local IndexedDB, prepares it for relay, and automatically transmits it via the <code>useOfflineSync</code> pipeline as soon as cellular, Wi-Fi, or peer mesh gateway connectivity is detected.
      </div>

      {/* SOS Trigger Panel */}
      <div style={{
        background: isLight ? 'linear-gradient(135deg, #fee2e2, #fecaca)' : 'linear-gradient(135deg, rgba(239, 68, 68, 0.15), rgba(153, 27, 27, 0.25))',
        border: `1px solid ${isLight ? '#fca5a5' : '#ef444450'}`, borderRadius: '12px', padding: '18px', marginBottom: '18px',
        display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '16px'
      }}>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div>
            <label style={{ fontSize: '0.75rem', color: isLight ? '#7f1d1d' : '#cbd5e1', fontWeight: 700, display: 'block', marginBottom: '4px' }}>
              People Needing Rescue:
            </label>
            <input
              type="number"
              min="1"
              max="50"
              value={peopleCount}
              onChange={e => setPeopleCount(parseInt(e.target.value) || 1)}
              style={{
                width: '70px', padding: '6px 10px', background: isLight ? '#ffffff' : '#0f172a',
                border: `1px solid ${isLight ? '#cbd5e1' : '#475569'}`,
                borderRadius: '6px', color: fg, fontWeight: 700
              }}
            />
          </div>

          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.82rem', color: isLight ? '#991b1b' : '#fca5a5', fontWeight: 700 }}>
            <input
              type="checkbox"
              checked={medicalUrgent}
              onChange={e => setMedicalUrgent(e.target.checked)}
              style={{ width: '18px', height: '18px', accentColor: '#ef4444' }}
            />
            🚨 Urgent Medical Attention Required
          </label>
        </div>

        <button
          onClick={triggerMeshSos}
          disabled={broadcasting}
          style={{
            background: broadcasting ? '#64748b' : 'linear-gradient(135deg, #ef4444, #dc2626)',
            color: '#fff', border: 'none', borderRadius: '10px', padding: '12px 24px',
            fontSize: '0.95rem', fontWeight: 800, cursor: broadcasting ? 'not-allowed' : 'pointer',
            boxShadow: '0 4px 20px rgba(239, 68, 68, 0.4)',
          }}
        >
          {broadcasting ? '💾 Writing to Offline Queue…' : '🆘 Broadcast Emergency SOS Beacon'}
        </button>
      </div>

      {/* Emergency Signal Hop Ledger */}
      {sosLedger.length > 0 && (
        <div>
          <h4 style={{ margin: '0 0 10px 0', fontSize: '0.85rem', color: muted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Persistent Emergency Signal Ledger (IndexedDB)
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {sosLedger.map(sos => (
              <div
                key={sos.clientReportId}
                style={{
                  background: itemBg, border: `1px solid ${itemBrd}`, borderRadius: '8px',
                  padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  fontSize: '0.8rem', flexWrap: 'wrap', gap: '8px'
                }}
              >
                <div>
                  <strong style={{ color: isLight ? '#b91c1c' : '#ef4444' }}>{sos.id}</strong> · {sos.people} Person{sos.people > 1 ? 's' : ''} {sos.urgent ? '(MEDICAL URGENT)' : ''} · Lat: {sos.lat.toFixed(4)}, Lon: {sos.lon.toFixed(4)}
                  <span style={{ color: muted, marginLeft: '8px' }}>({sos.time})</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{
                    background: sos.status === 'SYNCHRONIZED_TO_COMMAND_CENTER' ? (isLight ? 'rgba(22, 163, 74, 0.15)' : 'rgba(34,197,94,0.2)') : (isLight ? 'rgba(217, 119, 6, 0.15)' : 'rgba(245,158,11,0.2)'),
                    color: sos.status === 'SYNCHRONIZED_TO_COMMAND_CENTER' ? (isLight ? '#15803d' : '#4ade80') : (isLight ? '#b45309' : '#fcd34d'),
                    padding: '2px 8px', borderRadius: '4px', fontWeight: 700, fontSize: '0.72rem'
                  }}>
                    {sos.status === 'SYNCHRONIZED_TO_COMMAND_CENTER' ? '✅ ACKNOWLEDGED BY CENTRAL COMMAND' : '⏳ SAVED IN LOCAL QUEUE (PENDING SYNC)'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
