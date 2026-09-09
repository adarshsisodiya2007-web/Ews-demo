import React, { useState } from 'react';
import { CreateAlertPayload, AlertSeverity, AlertType } from '../../types/alertTypes';
import { createResponderAlert } from '../../services/alertService';
import { CITY_AREA_OPTIONS, CityAreaConfig } from '../../services/citizenLocationService';

interface Props {
  onAlertCreated: () => void;
}

export const CreateAlertPanel: React.FC<Props> = ({ onAlertCreated }) => {
  const [selectedCityId, setSelectedCityId] = useState<string>('');
  const [form, setForm] = useState<Partial<CreateAlertPayload & { regionName: string }>>({
    severity: 'HIGH',
    scope: 'EXACT_REGION',
    alertType: 'LANDSLIDE',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [preview, setPreview] = useState(false);

  const set = (key: string, value: any) => setForm(p => ({ ...p, [key]: value }));

  const handleRegionSelect = (cityId: string) => {
    setSelectedCityId(cityId);
    const r = CITY_AREA_OPTIONS.find(c => c.id === cityId);
    if (r) {
      setForm(p => ({
        ...p,
        targetRegion: r.id,
        locationName: r.name,
        district: r.district,
        state: r.state,
        lat: r.lat,
        lng: r.lon,
        scope: 'EXACT_REGION'
      }));
    } else {
      setForm(p => ({
        ...p,
        targetRegion: undefined,
        locationName: undefined,
        district: undefined,
        state: undefined,
        lat: undefined,
        lng: undefined,
      }));
    }
  };

  const validate = (): string | null => {
    if (!form.title?.trim()) return 'Alert title is required';
    if (!form.severity) return 'Severity is required';
    if (!selectedCityId) return 'Please select a SATARK Region';
    if (!form.description?.trim()) return 'Alert description is required';
    return null;
  };

  const handleSubmit = async () => {
    const err = validate();
    if (err) { setError(err); return; }
    setError(null);
    setSubmitting(true);
    try {
      await createResponderAlert(form as CreateAlertPayload);
      const targetName = form.locationName || selectedCityId;
      setSuccess(`✅ Alert published to ${targetName} and broadcast to citizens in real time!`);
      setForm({ severity: 'HIGH', scope: 'EXACT_REGION', alertType: 'LANDSLIDE' });
      setSelectedCityId('');
      setPreview(false);
      onAlertCreated();
      setTimeout(() => setSuccess(null), 5000);
    } catch (e: any) {
      setError(e.message || 'Failed to publish alert');
    } finally {
      setSubmitting(false);
    }
  };

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

  const selectedRegionConfig = CITY_AREA_OPTIONS.find(c => c.id === selectedCityId);

  return (
    <div style={{
      background: '#0f172a',
      border: '1px solid #1e293b',
      borderRadius: 16,
      padding: 24,
      fontFamily: 'Inter, system-ui, sans-serif',
    }}>
      <div style={{ marginBottom: 20 }}>
        <h3 style={{ color: '#f8fafc', fontWeight: 800, fontSize: '1.05rem', margin: 0 }}>
          🚨 Create Landslide Alert
        </h3>
        <p style={{ color: '#64748b', fontSize: '0.82rem', margin: '4px 0 0' }}>
          Alert will be targeted to the selected SATARK region and broadcast in real-time.
        </p>
      </div>

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

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {/* Title */}
        <div style={{ gridColumn: '1 / -1' }}>
          <label style={labelStyle}>Alert Title *</label>
          <input
            style={inputStyle}
            placeholder="e.g. Critical Landslide Warning"
            value={form.title || ''}
            onChange={e => set('title', e.target.value)}
          />
        </div>

        {/* Severity */}
        <div>
          <label style={labelStyle}>Severity *</label>
          <div style={{ display: 'flex', gap: 8 }}>
            {SEVERITIES.map(sev => (
              <button
                key={sev}
                type="button"
                onClick={() => set('severity', sev)}
                style={{
                  flex: 1, padding: '8px 4px',
                  background: form.severity === sev ? SEV_COLORS[sev] + '30' : 'rgba(30,41,59,.5)',
                  border: `2px solid ${form.severity === sev ? SEV_COLORS[sev] : '#1e293b'}`,
                  borderRadius: 8, color: form.severity === sev ? SEV_COLORS[sev] : '#64748b',
                  fontSize: '0.68rem', fontWeight: 700, cursor: 'pointer', letterSpacing: 0.5,
                }}
              >{sev}</button>
            ))}
          </div>
        </div>

        {/* Alert Type */}
        <div>
          <label style={labelStyle}>Alert Type</label>
          <select
            style={{ ...inputStyle }}
            value={form.alertType || 'LANDSLIDE'}
            onChange={e => set('alertType', e.target.value as AlertType)}
          >
            {['LANDSLIDE', 'FLOOD', 'EARTHQUAKE', 'OTHER'].map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>

        {/* SATARK Region Dropdown */}
        <div style={{ gridColumn: '1 / -1' }}>
          <label style={labelStyle}>SATARK Region *</label>
          <select
            style={{
              ...inputStyle,
              border: selectedCityId ? '1px solid #3b82f6' : '1px solid #334155'
            }}
            value={selectedCityId}
            onChange={e => handleRegionSelect(e.target.value)}
          >
            <option value="">— Select SATARK Region —</option>
            {CITY_AREA_OPTIONS.map(c => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          {selectedRegionConfig && (
            <div style={{ fontSize: '0.74rem', color: '#38bdf8', marginTop: 4, display: 'flex', gap: 12 }}>
              <span>📍 Targeted: <strong>{selectedRegionConfig.name}</strong></span>
              <span>🏙️ District: <strong>{selectedRegionConfig.district}</strong></span>
              <span>🗺️ State: <strong>{selectedRegionConfig.state}</strong></span>
            </div>
          )}
        </div>

        {/* Description */}
        <div style={{ gridColumn: '1 / -1' }}>
          <label style={labelStyle}>Alert Description / Message *</label>
          <textarea
            style={{ ...inputStyle, minHeight: 80, resize: 'vertical' }}
            placeholder="Critical landslide risk detected in the selected SATARK region. Citizens should move to a safe location and follow official evacuation instructions."
            value={form.description || ''}
            onChange={e => set('description', e.target.value)}
          />
        </div>

        {/* Expiry */}
        <div style={{ gridColumn: '1 / -1' }}>
          <label style={labelStyle}>Optional: Alert Expiry Time</label>
          <input
            type="datetime-local"
            style={inputStyle}
            value={form.expiryTime ? form.expiryTime.slice(0, 16) : ''}
            onChange={e => set('expiryTime', e.target.value ? new Date(e.target.value).toISOString() : undefined)}
          />
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
        <button
          type="button"
          onClick={() => { const e = validate(); setError(e); if (!e) setPreview(!preview); }}
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
            📋 ALERT PREVIEW
          </div>
          <div style={{ color: '#f8fafc', fontWeight: 800, fontSize: '0.95rem' }}>
            {form.severity && `[${form.severity}] `}{form.title}
          </div>
          <div style={{ color: '#94a3b8', fontSize: '0.82rem', marginTop: 4 }}>
            📍 SATARK Region: <strong>{form.locationName || selectedCityId}</strong>
            {form.district && form.state && ` (${form.district}, ${form.state})`}
          </div>
          <div style={{ color: '#cbd5e1', fontSize: '0.85rem', marginTop: 8 }}>
            {form.description}
          </div>
          <div style={{ color: '#64748b', fontSize: '0.75rem', marginTop: 8 }}>
            Type: {form.alertType} | Scope: EXACT_REGION
            {form.expiryTime && ` | Expires: ${new Date(form.expiryTime).toLocaleString()}`}
          </div>
        </div>
      )}
    </div>
  );
};
