import React, { useEffect, useState } from 'react';
import { MultiHorizonRisk, Severity } from '../../types';
import { fetchRiskForecast } from '../../services/api';

interface Props {
  lat: number;
  lon: number;
  slope: number;
  regionName: string;
}

export const MultiHorizonRiskPanel: React.FC<Props> = ({
  lat,
  lon,
  slope,
  regionName
}) => {
  const [data, setData] = useState<MultiHorizonRisk | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    fetchRiskForecast(lat, lon, slope, regionName)
      .then(res => {
        if (isMounted) {
          setData(res);
          setLoading(false);
        }
      })
      .catch(() => {
        if (isMounted) setLoading(false);
      });
    return () => { isMounted = false; };
  }, [lat, lon, slope, regionName]);

  if (loading) {
    return (
      <div style={{ padding: '16px', background: 'rgba(15, 23, 42, 0.6)', borderRadius: '12px', border: '1px solid #334155' }}>
        <div style={{ color: '#94a3b8', fontSize: '0.84rem' }}>Calculating multi-horizon forecast timeline via XGBoost…</div>
      </div>
    );
  }

  if (!data) return null;

  const getBadgeBg = (sev: Severity | string) => {
    switch (sev) {
      case 'CRITICAL': return '#ef4444';
      case 'HIGH': return '#f97316';
      case 'AMBER':
      case 'MODERATE': return '#eab308';
      default: return '#22c55e';
    }
  };

  const getTrendBadge = (trend: string) => {
    if (trend === 'INCREASING') {
      return { bg: 'rgba(239, 68, 68, 0.15)', text: '#f87171', border: '#ef4444', label: '▲ INCREASING RISK' };
    }
    if (trend === 'DECREASING') {
      return { bg: 'rgba(34, 197, 94, 0.15)', text: '#4ade80', border: '#22c55e', label: '▼ DECREASING' };
    }
    return { bg: 'rgba(56, 189, 248, 0.15)', text: '#38bdf8', border: '#38bdf8', label: '◼ STABLE' };
  };

  const trendStyle = getTrendBadge(data.risk_trend);

  const forecastCards = [
    { label: 'Now (T+0)', item: data.current_risk },
    { label: '+6 Hours', item: data.forecast_6h },
    { label: '+12 Hours', item: data.forecast_12h },
    { label: '+24 Hours', item: data.forecast_24h },
    { label: '+48 Hours', item: data.forecast_48h }
  ];

  return (
    <div style={{
      background: 'rgba(15, 23, 42, 0.85)',
      borderRadius: '14px',
      border: '1px solid #1e293b',
      padding: '16px',
      marginTop: '12px'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
        <div>
          <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>⏱️</span> Multi-Horizon Landslide Risk Forecast
          </h4>
          <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
            Atmospheric continuity projection evaluated with identical XGBoost model
          </span>
        </div>
        <div style={{
          background: trendStyle.bg,
          color: trendStyle.text,
          border: `1px solid ${trendStyle.border}`,
          padding: '4px 10px',
          borderRadius: '999px',
          fontSize: '0.72rem',
          fontWeight: 800
        }}>
          {trendStyle.label}
        </div>
      </div>

      {/* Grid of Horizon Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
        gap: '8px',
        marginBottom: '12px'
      }}>
        {forecastCards.map((c, i) => {
          const score = c.item.risk_score;
          const pct = Math.round(score * 100);
          const badgeColor = getBadgeBg(c.item.risk_level);

          return (
            <div key={i} style={{
              background: 'rgba(30, 41, 59, 0.5)',
              borderRadius: '10px',
              padding: '10px',
              border: '1px solid rgba(51, 65, 85, 0.4)',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 700 }}>{c.label}</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#f8fafc', margin: '4px 0' }}>
                {pct}%
              </div>
              <div style={{
                background: badgeColor,
                color: '#fff',
                fontSize: '0.64rem',
                fontWeight: 800,
                padding: '2px 6px',
                borderRadius: '4px',
                display: 'inline-block'
              }}>
                {c.item.risk_level}
              </div>
              <div style={{ fontSize: '0.68rem', color: '#cbd5e1', marginTop: '6px' }}>
                Rain: {c.item.projected_rain_24h_mm}mm
              </div>
            </div>
          );
        })}
      </div>

      <div style={{
        padding: '10px 12px',
        background: 'rgba(2, 6, 23, 0.4)',
        borderRadius: '8px',
        border: '1px solid rgba(51, 65, 85, 0.3)',
        fontSize: '0.74rem',
        color: '#cbd5e1'
      }}>
        <strong>Operational Outlook:</strong> {data.trend_description}
      </div>
    </div>
  );
};
