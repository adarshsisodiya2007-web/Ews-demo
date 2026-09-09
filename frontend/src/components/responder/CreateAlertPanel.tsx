import React, { useState } from 'react';
import { CreateAlertPayload } from '../../types/alertTypes';
import { createResponderAlert } from '../../services/alertService';
import { CITY_AREA_OPTIONS } from '../../services/citizenLocationService';

// Canonical SATARK region labels — exactly as required
const REGION_DISPLAY_LABELS: Record<string, string> = {
  guwahati: 'Guwahati',
  kamrup:   'Kamrup Rural',
  shillong: 'Shillong',
  imphal:   'Imphal',
  aizawl:   'Aizawl',
  agartala: 'Agartala',
  other:    'Other Area',
};

// Only canonical SATARK regions, in order
const SATARK_REGIONS = CITY_AREA_OPTIONS.filter(c => c.id in REGION_DISPLAY_LABELS);

interface Props {
  onAlertCreated: () => void;
}

export const CreateAlertPanel: React.FC<Props> = ({ onAlertCreated }) => {
  const [selectedRegionId, setSelectedRegionId] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const selectedConfig = SATARK_REGIONS.find(c => c.id === selectedRegionId) ?? null;
  const selectedDisplayName = selectedRegionId ? (REGION_DISPLAY_LABELS[selectedRegionId] ?? selectedConfig?.name ?? selectedRegionId) : '';

  const handleBroadcastAlert = async () => {
    if (!selectedRegionId || !selectedConfig) {
      setError('Please select a target location name to broadcast the alert.');
      return;
    }

    setError(null);
    setSubmitting(true);

    try {
      const now = new Date();
      const expiry = new Date(now.getTime() + 6 * 60 * 60 * 1000); // 6 hours validity

      const payload: CreateAlertPayload = {
        title: `🚨 CRITICAL LANDSLIDE EMERGENCY: ${selectedDisplayName}`,
        severity: 'CRITICAL',
        alertType: 'LANDSLIDE',
        scope: 'EXACT_REGION',
        targetRegion: selectedRegionId,
        locationName: selectedDisplayName,
        district: selectedConfig.district,
        state: selectedConfig.state,
        lat: selectedConfig.lat,
        lng: selectedConfig.lon,
        description: `IMMEDIATE EVACUATION & LIFE SAFETY ALERT: Severe landslide danger and critical slope saturation detected across ${selectedDisplayName}. Evacuate hazardous slope corridors and proceed to designated emergency shelters immediately.`,
        startTime: now.toISOString(),
        expiryTime: expiry.toISOString(),
      };

      await createResponderAlert(payload);
      setSuccess(`🚨 CRITICAL EMERGENCY ALERT BROADCAST: Siren & warning popup triggered for all citizens in "${selectedDisplayName}"!`);
      setSelectedRegionId('');
      onAlertCreated();
      setTimeout(() => setSuccess(null), 8000);
    } catch (e: any) {
      setError(e.message || 'Failed to broadcast alert. Check network/authorization.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{
      background: '#0f172a',
      border: '2px solid #ef4444',
      borderRadius: 16,
      padding: '24px',
      fontFamily: 'Inter, system-ui, sans-serif',
      boxShadow: '0 8px 32px rgba(239, 68, 68, 0.15)'
    }}>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: '1.5rem' }}>🚨</span>
          <div>
            <h3 style={{ color: '#f8fafc', fontWeight: 900, fontSize: '1.15rem', margin: 0 }}>
              Broadcast Emergency Landslide Alert
            </h3>
            <p style={{ color: '#94a3b8', fontSize: '0.84rem', margin: '4px 0 0' }}>
              Select a location name and click Broadcast. All citizens who selected that location will receive an immediate critical warning popup with an audible emergency siren on their app simultaneously.
            </p>
          </div>
        </div>
      </div>

      {/* Error & Success Messages */}
      {error && (
        <div style={{
          background: 'rgba(239,68,68,0.15)', border: '1px solid #ef4444',
          borderRadius: 10, padding: '12px 16px', color: '#fca5a5',
          fontSize: '0.88rem', fontWeight: 600, marginBottom: 18,
        }}>
          ⚠️ {error}
        </div>
      )}

      {success && (
        <div style={{
          background: 'rgba(34,197,94,0.15)', border: '1px solid #22c55e',
          borderRadius: 10, padding: '14px 18px', color: '#4ade80',
          fontSize: '0.92rem', fontWeight: 800, marginBottom: 18,
        }}>
          {success}
        </div>
      )}

      {/* Form: ONLY SELECT LOCATION NAME */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div>
          <label style={{
            fontSize: '0.82rem',
            fontWeight: 800,
            color: '#f8fafc',
            marginBottom: 8,
            display: 'block',
            letterSpacing: 0.5,
            textTransform: 'uppercase',
          }}>
            Select Location Name *
          </label>
          <select
            style={{
              width: '100%',
              background: '#1e293b',
              border: selectedRegionId ? '2px solid #ef4444' : '2px solid #334155',
              borderRadius: 10,
              padding: '14px 16px',
              color: '#f8fafc',
              fontSize: '1rem',
              fontWeight: 700,
              outline: 'none',
              cursor: 'pointer',
              boxSizing: 'border-box',
            }}
            value={selectedRegionId}
            onChange={e => {
              setSelectedRegionId(e.target.value);
              setError(null);
            }}
          >
            <option value="">— Choose Monitored Location —</option>
            {SATARK_REGIONS.map(c => (
              <option key={c.id} value={c.id}>
                {REGION_DISPLAY_LABELS[c.id] ?? c.name}
              </option>
            ))}
          </select>
        </div>

        {/* Selected Area Info Badge */}
        {selectedConfig && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.08)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: 12,
            padding: '14px 18px',
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
              <span style={{ color: '#f8fafc', fontWeight: 800, fontSize: '0.95rem' }}>
                📍 Target Area: <strong style={{ color: '#ef4444' }}>{selectedDisplayName}</strong>
              </span>
              <span style={{
                background: '#ef4444', color: '#ffffff',
                padding: '3px 10px', borderRadius: 6, fontSize: '0.75rem', fontWeight: 900
              }}>
                LEVEL: CRITICAL
              </span>
            </div>
            <div style={{ color: '#94a3b8', fontSize: '0.82rem' }}>
              District: <strong style={{ color: '#e2e8f0' }}>{selectedConfig.district}</strong> · State: <strong style={{ color: '#e2e8f0' }}>{selectedConfig.state}</strong>
            </div>
            <div style={{ color: '#fdba74', fontSize: '0.78rem', marginTop: 4 }}>
              🔊 <strong>Action:</strong> Instant full-screen emergency alert with siren alarm will trigger on every citizen phone/device in {selectedDisplayName}.
            </div>
          </div>
        )}

        {/* Broadcast Button */}
        <button
          type="button"
          onClick={handleBroadcastAlert}
          disabled={submitting || !selectedRegionId}
          style={{
            width: '100%',
            padding: '16px 20px',
            background: !selectedRegionId
              ? '#334155'
              : submitting
              ? '#7f1d1d'
              : 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)',
            border: 'none',
            borderRadius: 12,
            color: '#ffffff',
            fontWeight: 900,
            fontSize: '1.05rem',
            letterSpacing: '0.04em',
            cursor: (!selectedRegionId || submitting) ? 'not-allowed' : 'pointer',
            boxShadow: selectedRegionId ? '0 4px 20px rgba(239, 68, 68, 0.4)' : 'none',
            transition: 'all 0.2s ease',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10
          }}
        >
          {submitting ? (
            <span>⏳ Broadcasting Alert & Siren...</span>
          ) : selectedRegionId ? (
            <span>🚨 BROADCAST CRITICAL ALERT & SIREN TO {selectedDisplayName.toUpperCase()}</span>
          ) : (
            <span>👉 Please Select a Location Name First</span>
          )}
        </button>
      </div>
    </div>
  );
};
