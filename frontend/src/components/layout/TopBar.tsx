import React, { useState, useEffect } from 'react';
import { Severity } from '../../types';

interface Props {
  districts: string[];
  selectedDistrict: string;
  onDistrictChange: (d: string) => void;
  severityFilter: Severity | 'ALL';
  onSeverityChange: (s: Severity | 'ALL') => void;
  alertCount: number;
  lang: string;
  onLangToggle: () => void;
}

export const TopBar: React.FC<Props> = ({
  districts, selectedDistrict, onDistrictChange,
  severityFilter, onSeverityChange,
  alertCount, lang, onLangToggle
}) => {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '52px', padding: '0 16px', background: 'var(--color-base-900)', borderBottom: '1px solid var(--color-base-600)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <h1 style={{ fontSize: '1.2rem', margin: 0 }}>EWS · NER</h1>
        <span style={{ color: 'var(--color-base-200)', fontSize: '0.9rem' }}>Landslide Risk Monitor</span>
      </div>
      
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <select value={selectedDistrict} onChange={e => onDistrictChange(e.target.value)} style={{ padding: '4px', background: 'var(--color-base-800)', color: 'var(--color-base-100)', border: '1px solid var(--color-base-600)' }}>
          <option value="ALL">All Districts</option>
          {districts.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
        
        <div style={{ display: 'flex', gap: '8px' }}>
          {(['ALL', 'MODERATE', 'HIGH', 'CRITICAL'] as const).map(s => (
            <button key={s} onClick={() => onSeverityChange(s)} style={{
              padding: '4px 8px', borderRadius: '4px', cursor: 'pointer',
              background: severityFilter === s ? (s === 'ALL' ? 'var(--color-base-600)' : `var(--color-risk-${s.toLowerCase()})`) : 'transparent',
              border: severityFilter === s ? 'none' : '1px solid var(--color-base-400)',
              color: severityFilter === s ? '#fff' : 'var(--color-base-200)',
              fontSize: '0.8rem'
            }}>
              {s}
            </button>
          ))}
        </div>
      </div>
      
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <a href="/responder" style={{ textDecoration: 'none', background: 'rgba(234, 88, 12, 0.2)', border: '1px solid #ea580c', color: '#fb923c', padding: '4px 10px', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 700 }}>
          🛡️ Responder Mode
        </a>
        <a href="/citizen" style={{ textDecoration: 'none', background: 'rgba(56, 189, 248, 0.15)', border: '1px solid #38bdf8', color: '#38bdf8', padding: '4px 10px', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 700 }}>
          👤 Citizen
        </a>
        <button onClick={onLangToggle} style={{ background: 'none', border: 'none', color: 'var(--color-base-100)', cursor: 'pointer' }}>🌐 {lang.toUpperCase()}</button>
        <div style={{ position: 'relative' }}>
          🔔
          {alertCount > 0 && <span style={{ position: 'absolute', top: -5, right: -5, background: 'var(--color-risk-critical)', color: '#fff', fontSize: '10px', padding: '2px 4px', borderRadius: '8px' }}>{alertCount}</span>}
        </div>
        <span className="mono">{time.toLocaleTimeString()}</span>
      </div>
    </div>
  );
};
