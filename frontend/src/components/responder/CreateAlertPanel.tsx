import React, { useState, useEffect } from 'react';
import { CreateAlertPayload, AlertSeverity, AlertScope, AlertType } from '../../types/alertTypes';
import { createResponderAlert } from '../../services/alertService';

interface RegionOption {
  id: string;
  name: string;
  district: string;
  state: string;
}

interface Props {
  onAlertCreated: () => void;
}

const resolveBase = (): string => {
  const env = (import.meta as any).env || {};
  return env.VITE_API_BASE_URL || env.VITE_API_URL || 'https://ews-backend-gateway-vck8.onrender.com';
};

export const CreateAlertPanel: React.FC<Props> = ({ onAlertCreated }) => {
  const [regions, setRegions] = useState<RegionOption[]>([]);
  const [form, setForm] = useState<Partial<CreateAlertPayload & { regionName: string }>>({
    severity: 'HIGH',
    scope: 'EXACT_REGION',
    alertType: 'LANDSLIDE',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [preview, setPreview] = useState(false);

  useEffect(() => {
    fetch(`${resolveBase()}/api/regions`)
      .then(r => r.json())
      .then((data: any[]) => {
        setRegions(data.map(r => ({
          id: r.id || r.regionId,
          name: r.name,
          district: r.district || '',
          state: r.state || '',
        })));
      })
      .catch(() => setRegions([]));
  }, []);

  const set = (key: string, value: any) => setForm(p => ({ ...p, [key]: value }));

  const handleRegionSelect = (regionId: string) => {
    const r = regions.find(x => x.id === regionId);
    if (r) {
      set('regionId', regionId);
      set('regionName', r.name);
      set('locationName', r.name);
      set('district', r.district);
      set('state', r.state);
    }
  };

  const validate = (): string | null => {
    if (!form.title?.trim()) return 'Alert title is required';
    if (!form.severity) return 'Severity is required';
    if (!form.description?.trim()) return 'Alert description is required';
    if (!form.regionId && !form.district?.trim() && !form.state?.trim()) {
      return 'Select a region OR enter district/state';
    }
    return null;
  };

  const handleSubmit = async () => {
    const err = validate();
    if (err) { setError(err); return; }
    setError(null);
    setSubmitting(true);
    try {
      await createResponderAlert(form as CreateAlertPayload);
      setSuccess('✅ Alert published and broadcast to matching citizens!');
      setForm({ severity: 'HIGH', scope: 'EXACT_REGION', alertType: 'LANDSLIDE' });
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
          Alert will be broadcast in real-time to matching citizens.
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
            placeholder="e.g. High landslide risk detected in Mawsynram area"
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

        {/* Region Select */}
        <div style={{ gridColumn: '1 / -1' }}>
          <label style={labelStyle}>Select Region (or enter manually below)</label>
          <select
            style={{ ...inputStyle }}
            value={form.regionId || ''}
            onChange={e => handleRegionSelect(e.target.value)}
          >
            <option value="">— Choose from existing regions —</option>
            {regions.map(r => (
              <option key={r.id} value={r.id}>
                {r.name} — {r.district}, {r.state}
              </option>
            ))}
          </select>
        </div>

        {/* Alert Scope */}
        <div>
          <label style={labelStyle}>Alert Scope</label>
          <select
            style={{ ...inputStyle }}
            value={form.scope || 'EXACT_REGION'}
            onChange={e => set('scope', e.target.value as AlertScope)}
          >
            <option value="EXACT_REGION">📌 Exact Region only</option>
            <option value="DISTRICT">🏙️ Entire District</option>
            <option value="STATE">🗺️ Entire State</option>
          </select>
        </div>

        {/* Location Name */}
        <div>
          <label style={labelStyle}>Location Name</label>
          <input
            style={inputStyle}
            placeholder="e.g. Mawsynram, Wayanad..."
            value={form.locationName || ''}
            onChange={e => set('locationName', e.target.value)}
          />
        </div>

        {/* District */}
        <div>
          <label style={labelStyle}>District</label>
          <input
            style={inputStyle}
            placeholder="e.g. East Khasi Hills"
            value={form.district || ''}
            onChange={e => set('district', e.target.value)}
          />
        </div>

        {/* State */}
        <div>
          <label style={labelStyle}>State</label>
          <input
            style={inputStyle}
            placeholder="e.g. Meghalaya"
            value={form.state || ''}
            onChange={e => set('state', e.target.value)}
          />
        </div>

        {/* Description */}
        <div style={{ gridColumn: '1 / -1' }}>
          <label style={labelStyle}>Alert Description / Message *</label>
          <textarea
            style={{ ...inputStyle, minHeight: 80, resize: 'vertical' }}
            placeholder="Describe the landslide risk, evacuation instructions, emergency contacts..."
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
            📍 {form.locationName || form.district || form.state || 'Location not set'}
            {form.district && form.state && ` — ${form.district}, ${form.state}`}
          </div>
          <div style={{ color: '#cbd5e1', fontSize: '0.85rem', marginTop: 8 }}>
            {form.description}
          </div>
          <div style={{ color: '#64748b', fontSize: '0.75rem', marginTop: 8 }}>
            Scope: {form.scope} | Type: {form.alertType}
            {form.expiryTime && ` | Expires: ${new Date(form.expiryTime).toLocaleString()}`}
          </div>
        </div>
      )}
    </div>
  );
};
