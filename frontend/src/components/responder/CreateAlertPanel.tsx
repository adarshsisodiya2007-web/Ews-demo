import React, { useState } from 'react';
import { CreateAlertPayload, AlertSeverity, AlertType } from '../../types/alertTypes';
import { createResponderAlert } from '../../services/alertService';
import { CITY_AREA_OPTIONS } from '../../services/citizenLocationService';

// Canonical SATARK region labels — exactly as required
// id → display label shown to officer
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
  const [title, setTitle] = useState('');
  const [severity, setSeverity] = useState<AlertSeverity>('HIGH');
  const [alertType, setAlertType] = useState<AlertType>('LANDSLIDE');
  const [description, setDescription] = useState('');
  const [expiryTime, setExpiryTime] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [preview, setPreview] = useState(false);

  const selectedConfig = SATARK_REGIONS.find(c => c.id === selectedRegionId) ?? null;

  const validate = (): string | null => {
    if (!title.trim()) return 'Alert title is required';
    if (!selectedRegionId) return 'Please select a SATARK Region';
    if (!description.trim()) return 'Alert description is required';
    return null;
  };

  const buildPayload = (): CreateAlertPayload => ({
    title: title.trim(),
    severity,
    alertType,
    scope: 'EXACT_REGION',
    targetRegion: selectedRegionId,
    locationName: selectedConfig?.name ?? selectedRegionId,
    district: selectedConfig?.district,
    state: selectedConfig?.state,
    lat: selectedConfig?.lat,
    lng: selectedConfig?.lon,
    description: description.trim(),
    expiryTime: expiryTime ? new Date(expiryTime).toISOString() : undefined,
  });

  const handleSubmit = async () => {
    const err = validate();
    if (err) { setError(err); return; }
    setError(null);
    setSubmitting(true);
    try {
      const payload = buildPayload();
      await createResponderAlert(payload);
      const displayLabel = REGION_DISPLAY_LABELS[selectedRegionId] ?? selectedRegionId;
      setSuccess(`✅ Alert published to "${displayLabel}" and broadcast to matching citizens in real time!`);
      // Reset form
      setTitle('');
      setSeverity('HIGH');
      setAlertType('LANDSLIDE');
      setSelectedRegionId('');
      setDescription('');
      setExpiryTime('');
      setPreview(false);
      onAlertCreated();
      setTimeout(() => setSuccess(null), 6000);
    } catch (e: any) {
      setError(e.message || 'Failed to publish alert');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePreview = () => {
    const err = validate();
    if (err) { setError(err); return; }
    setError(null);
    setPreview(p => !p);
  };

  // ─── Styles ────────────────────────────────────────────────────────────
  const inputStyle: React.CSSProperties = {
    width: '100%',
    background: 'rgba(30,41,59,.8)',
    border: '1px solid #1e293b',
    borderRadius: 8,
    padding: '10px 14px',
    color: '#f8fafc',
    fontSize: '0.88rem',
    outline: 'none',
    boxSizing: 'border-box',
  };

  const labelStyle: React.CSSProperties = {
    fontSize: '0.78rem',
    fontWeight: 700,
    color: '#94a3b8',
    marginBottom: 6,
    display: 'block',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  };

  const SEVERITIES: AlertSeverity[] = ['LOW', 'MODERATE', 'HIGH', 'CRITICAL'];
  const SEV_COLORS: Record<AlertSeverity, string> = {
    LOW: '#3b82f6', MODERATE: '#eab308', HIGH: '#f97316', CRITICAL: '#ef4444',
  };

  return (
    <div style={{
      background: '#0f172a',
      border: '1px solid #1e293b',
      borderRadius: 16,
      padding: 24,
      fontFamily: 'Inter, system-ui, sans-serif',
    }}>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <h3 style={{ color: '#f8fafc', fontWeight: 800, fontSize: '1.05rem', margin: 0 }}>
          🚨 Create Landslide Alert
        </h3>
        <p style={{ color: '#64748b', fontSize: '0.82rem', margin: '4px 0 0' }}>
          Alert will be broadcast in real-time to matching citizens.
        </p>
      </div>

      {/* Error / Success banners */}
      {error && (
        <div style={{
          background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.4)',
          borderRadius: 8, padding: '10px 14px', color: '#fca5a5',
          fontSize: '0.85rem', marginBottom: 16,
        }}>⚠️ {error}</div>
      )}
      {success && (
        <div style={{
          background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.4)',
          borderRadius: 8, padding: '10px 14px', color: '#4ade80',
          fontSize: '0.85rem', marginBottom: 16,
        }}>{success}</div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* 1 — Alert Title */}
        <div>
          <label style={labelStyle}>Alert Title *</label>
          <input
            style={inputStyle}
            placeholder="e.g. High landslide risk detected in Mawsynram area"
            value={title}
            onChange={e => setTitle(e.target.value)}
          />
        </div>

        {/* 2 — Severity + Alert Type (2 columns) */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div>
            <label style={labelStyle}>Severity *</label>
            <div style={{ display: 'flex', gap: 6 }}>
              {SEVERITIES.map(sev => (
                <button
                  key={sev}
                  type="button"
                  onClick={() => setSeverity(sev)}
                  style={{
                    flex: 1, padding: '8px 2px',
                    background: severity === sev ? SEV_COLORS[sev] + '30' : 'rgba(30,41,59,.5)',
                    border: `2px solid ${severity === sev ? SEV_COLORS[sev] : '#1e293b'}`,
                    borderRadius: 8, color: severity === sev ? SEV_COLORS[sev] : '#64748b',
                    fontSize: '0.65rem', fontWeight: 700, cursor: 'pointer', letterSpacing: 0.3,
                  }}
                >{sev}</button>
              ))}
            </div>
          </div>

          <div>
            <label style={labelStyle}>Alert Type</label>
            <select
              style={inputStyle}
              value={alertType}
              onChange={e => setAlertType(e.target.value as AlertType)}
            >
              {['LANDSLIDE', 'FLOOD', 'EARTHQUAKE', 'OTHER'].map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
        </div>

        {/* 3 — SELECT REGION */}
        <div>
          <label style={labelStyle}>Select Region *</label>
          <select
            style={{
              ...inputStyle,
              border: selectedRegionId ? '1px solid #3b82f6' : '1px solid #334155',
            }}
            value={selectedRegionId}
            onChange={e => { setSelectedRegionId(e.target.value); setPreview(false); }}
          >
            <option value="">— Choose Region —</option>
            {SATARK_REGIONS.map(c => (
              <option key={c.id} value={c.id}>
                {REGION_DISPLAY_LABELS[c.id] ?? c.name}
              </option>
            ))}
          </select>
          {/* Auto-derived metadata shown below dropdown (read-only info) */}
          {selectedConfig && (
            <div style={{
              fontSize: '0.74rem', color: '#38bdf8', marginTop: 6,
              display: 'flex', gap: 16, flexWrap: 'wrap',
            }}>
              <span>📍 Target Region: <strong>{REGION_DISPLAY_LABELS[selectedConfig.id]}</strong></span>
              <span>🏙️ {selectedConfig.district}</span>
              <span>🗺️ {selectedConfig.state}</span>
              <span style={{ color: '#64748b' }}>
                ID sent to backend: <code style={{ color: '#a78bfa' }}>{selectedConfig.id}</code>
              </span>
            </div>
          )}
        </div>

        {/* 4 — Alert Description */}
        <div>
          <label style={labelStyle}>Alert Description / Message *</label>
          <textarea
            style={{ ...inputStyle, minHeight: 88, resize: 'vertical' }}
            placeholder="Describe the landslide risk, evacuation instructions, emergency contacts..."
            value={description}
            onChange={e => setDescription(e.target.value)}
          />
        </div>

        {/* 5 — Optional Expiry */}
        <div>
          <label style={labelStyle}>Optional: Alert Expiry Time</label>
          <input
            type="datetime-local"
            style={inputStyle}
            value={expiryTime}
            onChange={e => setExpiryTime(e.target.value)}
          />
        </div>
      </div>

      {/* Action Buttons */}
      <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
        <button
          type="button"
          onClick={handlePreview}
          style={{
            flex: 1, padding: '10px 16px',
            background: 'rgba(234,88,12,0.12)',
            border: '1px solid rgba(234,88,12,0.4)',
            borderRadius: 8, color: '#fb923c',
            fontWeight: 700, cursor: 'pointer', fontSize: '0.88rem',
          }}
        >{preview ? 'Hide Preview' : '👁️ Preview Alert'}</button>

        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitting}
          style={{
            flex: 2, padding: '10px 16px',
            background: submitting ? '#1e293b' : 'linear-gradient(135deg,#ea580c,#c2410c)',
            border: 'none', borderRadius: 8, color: '#fff',
            fontWeight: 800, cursor: submitting ? 'not-allowed' : 'pointer',
            fontSize: '0.88rem',
          }}
        >{submitting ? '⏳ Publishing...' : '🚨 Publish Alert'}</button>
      </div>

      {/* Preview Panel */}
      {preview && !error && (
        <div style={{
          marginTop: 20,
          background: 'rgba(239,68,68,0.05)',
          border: '1px solid rgba(239,68,68,0.2)',
          borderRadius: 12, padding: 16,
        }}>
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: 8, fontWeight: 700 }}>
            📋 ALERT PREVIEW — PAYLOAD THAT WILL BE SENT
          </div>
          <div style={{ color: '#f8fafc', fontWeight: 800, fontSize: '0.95rem' }}>
            [{severity}] {title}
          </div>
          <div style={{ color: '#94a3b8', fontSize: '0.82rem', marginTop: 4 }}>
            📍 Target Region: <strong>{REGION_DISPLAY_LABELS[selectedRegionId] ?? selectedRegionId}</strong>
            {selectedConfig && ` — ${selectedConfig.district}, ${selectedConfig.state}`}
          </div>
          <div style={{ color: '#a78bfa', fontSize: '0.78rem', marginTop: 4 }}>
            Backend key: <code>targetRegion = "{selectedRegionId}"</code>
          </div>
          <div style={{ color: '#cbd5e1', fontSize: '0.85rem', marginTop: 8 }}>
            {description}
          </div>
          <div style={{ color: '#64748b', fontSize: '0.75rem', marginTop: 8 }}>
            Type: {alertType} | Scope: EXACT_REGION
            {expiryTime && ` | Expires: ${new Date(expiryTime).toLocaleString()}`}
          </div>
        </div>
      )}
    </div>
  );
};
