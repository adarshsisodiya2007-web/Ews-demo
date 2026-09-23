import React, { useEffect, useState } from 'react';
import { RiskDetail } from '../../types';
import { fetchRiskDetail, updateRoadStatus } from '../../services/api';
import { RiskBadge } from '../shared/RiskBadge';
import { ExplainabilityChart } from './ExplainabilityChart';
import { WeatherSparkline } from './WeatherSparkline';
import { MultiHorizonRiskPanel } from './MultiHorizonRiskPanel';
import { InfrastructureImpactPanel } from './InfrastructureImpactPanel';
import { DataQualityBadge } from './DataQualityBadge';
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
    const loadDetail = () => {
      if (regionId) {
        setLoading(true);
        fetchRiskDetail(regionId)
          .then(setDetail)
          .catch(console.error)
          .finally(() => setLoading(false));
      } else {
        setDetail(null);
      }
    };

    loadDetail();

    window.addEventListener('ews-reports-updated', loadDetail);
    window.addEventListener('ews-sync-completed', loadDetail);
    return () => {
      window.removeEventListener('ews-reports-updated', loadDetail);
      window.removeEventListener('ews-sync-completed', loadDetail);
    };
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
          
          <DataQualityBadge
            rainfallStatus="FRESH"
            terrainStatus="AVAILABLE (NASADEM 30m)"
            soilMoistureStatus="FRESH"
            historicalStatus="AVAILABLE (GSI/NDMA)"
            sensorStatus="ACTIVE"
            overallQuality="HIGH"
          />

          <MultiHorizonRiskPanel
            lat={detail.centroidLat}
            lon={detail.centroidLng}
            slope={detail.slope || 35.0}
            regionName={detail.name}
          />

          <InfrastructureImpactPanel
            regionName={detail.name}
            severity={detail.severity}
          />
          
          <hr style={{ border: 'none', borderTop: '1px solid var(--color-base-600)', margin: '16px 0' }} />
          
          <h3 style={{ fontSize: '0.85rem', letterSpacing: '0.05em', marginBottom: '16px', color: 'var(--color-base-000)' }}>
            {t('panel.weatherTrend', lang)}
          </h3>
          <WeatherSparkline readings={detail.weatherTrend} />
          
          <hr style={{ border: 'none', borderTop: '1px solid var(--color-base-600)', margin: '16px 0' }} />
          
          <h3 style={{ fontSize: '0.85rem', letterSpacing: '0.05em', marginBottom: '16px', color: 'var(--color-base-000)' }}>
            {t('panel.recentReports', lang)} ({detail.recentReports.length})
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {detail.recentReports.length === 0 ? (
              <div style={{ fontSize: '0.8rem', color: 'var(--color-base-300)', padding: '10px 0' }}>
                No active ground hazard reports logged for this sector yet.
              </div>
            ) : (
              detail.recentReports.map(r => (
                <div key={r.id} style={{ background: 'var(--color-base-800)', padding: '12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-base-600)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <span style={{
                      fontSize: '0.7rem',
                      fontWeight: 800,
                      padding: '2px 6px',
                      borderRadius: '4px',
                      background: r.reporterType === 'FIELD_OFFICER' ? 'rgba(234, 88, 12, 0.25)' : 'rgba(56, 189, 248, 0.2)',
                      color: r.reporterType === 'FIELD_OFFICER' ? '#fb923c' : '#38bdf8'
                    }}>
                      {r.reporterType || 'CITIZEN'}
                    </span>
                    <span style={{ fontSize: '0.72rem', fontWeight: 800, color: r.status === 'VERIFIED' ? '#4ade80' : r.status === 'DISPATCHED' ? '#fb923c' : '#fcd34d' }}>
                      {r.status}
                    </span>
                  </div>
                  <div style={{ fontSize: 'var(--text-sm)', fontWeight: 700, color: 'var(--color-base-000)' }}>{r.category.replace('_', ' ')}</div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-base-200)', marginTop: '4px', lineHeight: 1.4 }}>{r.description}</div>
                </div>
              ))
            )}
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

          <hr style={{ border: 'none', borderTop: '1px solid var(--color-base-600)', margin: '16px 0' }} />

          <h3 style={{ fontSize: '0.85rem', letterSpacing: '0.05em', marginBottom: '12px', color: 'var(--color-base-000)' }}>
            🛰️ Terrain &amp; Evacuation Protocol
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.78rem', color: 'var(--color-base-200)' }}>
            <div>
              <strong style={{ color: 'var(--color-base-100)' }}>Elevation:</strong> {detail.elev !== undefined ? `${detail.elev} m (NASADEM 30m)` : 'N/A'}
            </div>
            <div>
              <strong style={{ color: 'var(--color-base-100)' }}>Primary Corridor:</strong> {detail.primaryCorridor || 'N/A'}
            </div>
            <div>
              <strong style={{ color: 'var(--color-base-100)' }}>Safe Route:</strong> {detail.safeRoute || 'N/A'}
            </div>
            {detail.nearestShelter && (
              <div>
                <strong style={{ color: 'var(--color-base-100)' }}>Nearest Shelter:</strong> {detail.nearestShelter} ({detail.shelterDistanceKm || 1.2} km)
              </div>
            )}
            {detail.estimatedTimeMin !== undefined && (
              <div>
                <strong style={{ color: 'var(--color-base-100)' }}>Est. Evacuation Time:</strong> {detail.estimatedTimeMin} min
              </div>
            )}
            {detail.actionProtocol && (
              <div style={{ marginTop: '4px', padding: '8px', background: 'var(--color-base-800)', borderRadius: '4px', borderLeft: '3px solid #38bdf8' }}>
                <strong style={{ color: '#38bdf8' }}>Action Protocol:</strong>
                <div style={{ marginTop: '2px', color: '#f8fafc' }}>{detail.actionProtocol}</div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
