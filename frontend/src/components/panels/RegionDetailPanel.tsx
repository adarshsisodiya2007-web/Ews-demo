import React, { useEffect, useState } from 'react';
import { RiskDetail } from '../../types';
import { fetchRiskDetail, updateRoadStatus } from '../../services/api';
import { RiskBadge } from '../shared/RiskBadge';
import { ExplainabilityChart } from './ExplainabilityChart';
import { WeatherSparkline } from './WeatherSparkline';
import { t } from '../../i18n';

interface Props {
  regionId: string | null;
  onClose: () => void;
  userRole: string;
  lang: string;
}

export const RegionDetailPanel: React.FC<Props> = ({ regionId, onClose, userRole, lang }) => {
  const [detail, setDetail] = useState<RiskDetail | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (regionId) {
      setLoading(true);
      fetchRiskDetail(regionId)
        .then(setDetail)
        .catch(console.error)
        .finally(() => setLoading(false));
    } else {
      setDetail(null);
    }
  }, [regionId]);

  if (!regionId) return null;

  return (
    <div style={{
      width: regionId ? '340px' : '0',
      opacity: regionId ? 1 : 0,
      transition: 'width 300ms ease-out, opacity 200ms ease-out',
      overflow: 'hidden',
      background: 'var(--color-base-700)',
      height: '100%',
      display: 'flex',
      flexDirection: 'column'
    }}>
      {loading || !detail ? (
        <div style={{ padding: '24px', color: 'var(--color-base-200)' }}>Loading...</div>
      ) : (
        <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <h2 style={{ fontSize: '1.25rem', margin: 0 }}>{detail.name}</h2>
              <div style={{ fontSize: '0.8rem', color: 'var(--color-base-200)' }}>
                {detail.district} · {detail.state}
              </div>
            </div>
            <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--color-base-100)', cursor: 'pointer', fontSize: '1.2rem' }}>×</button>
          </div>
          
          <hr style={{ border: 'none', borderTop: '1px solid var(--color-base-600)', margin: '16px 0' }} />
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <span className="mono" style={{ fontSize: '2.5rem', lineHeight: 1, color: `var(--color-risk-${detail.severity.toLowerCase()})` }}>
              {detail.computedScore}
            </span>
            <RiskBadge severity={detail.severity} lang={lang} />
          </div>
          
          <hr style={{ border: 'none', borderTop: '1px solid var(--color-base-600)', margin: '16px 0' }} />
          
          <h3 style={{ fontSize: '0.85rem', letterSpacing: '0.05em', marginBottom: '16px', color: 'var(--color-base-000)' }}>
            {t('panel.whyAlert', lang)}
          </h3>
          <ExplainabilityChart factors={detail.contributingFactors} severity={detail.severity} lang={lang} />
          
          <hr style={{ border: 'none', borderTop: '1px solid var(--color-base-600)', margin: '16px 0' }} />
          
          <h3 style={{ fontSize: '0.85rem', letterSpacing: '0.05em', marginBottom: '16px', color: 'var(--color-base-000)' }}>
            {t('panel.weatherTrend', lang)}
          </h3>
          <WeatherSparkline readings={detail.weatherTrend} />
          
          <hr style={{ border: 'none', borderTop: '1px solid var(--color-base-600)', margin: '16px 0' }} />
          
          <h3 style={{ fontSize: '0.85rem', letterSpacing: '0.05em', marginBottom: '16px', color: 'var(--color-base-000)' }}>
            {t('panel.recentReports', lang)} ({detail.recentReports.length})
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {detail.recentReports.map(r => (
              <div key={r.id} style={{ background: 'var(--color-base-800)', padding: '12px', borderRadius: 'var(--radius-sm)' }}>
                <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-base-000)' }}>{r.category}</div>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-base-200)', marginTop: '4px' }}>{r.description}</div>
              </div>
            ))}
          </div>

          {(userRole === 'ADMIN' || userRole === 'DISTRICT_OFFICIAL' || userRole === 'FIELD_OFFICER') && (
            <div style={{ marginTop: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <h3 style={{ fontSize: '0.85rem', margin: 0, color: 'var(--color-base-000)' }}>Road Corridor Status</h3>
                {!navigator.onLine && (
                  <span style={{ fontSize: '0.7rem', color: '#f59e0b', fontWeight: 700 }}>📴 Offline (Queued)</span>
                )}
              </div>
              <select 
                value={detail.roadStatus || 'OPEN'} 
                onChange={async (e) => {
                  const newStatus = e.target.value as any;
                  setDetail(prev => prev ? { ...prev, roadStatus: newStatus } : null);
                  try {
                    if (navigator.onLine) {
                      await updateRoadStatus(detail.regionId, newStatus);
                    } else {
                      const { queueRoadStatus } = await import('../../services/offlineStore');
                      await queueRoadStatus(detail.regionId, newStatus, detail.name);
                    }
                  } catch {
                    const { queueRoadStatus } = await import('../../services/offlineStore');
                    await queueRoadStatus(detail.regionId, newStatus, detail.name);
                  }
                }}
                style={{ width: '100%', padding: '8px', background: 'var(--color-base-800)', color: 'var(--color-base-100)', border: '1px solid var(--color-base-600)', borderRadius: '4px' }}
              >
                <option value="OPEN">🟢 OPEN (Standard Transit)</option>
                <option value="AT_RISK">🟡 AT RISK (Heavy Vehicles Restricted)</option>
                <option value="BLOCKED">🔴 BLOCKED (Hazard Closure / Detour Active)</option>
              </select>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
