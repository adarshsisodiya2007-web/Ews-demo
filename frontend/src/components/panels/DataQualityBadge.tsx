import React from 'react';

interface Props {
  rainfallStatus?: 'FRESH' | 'STALE' | 'SIMULATED';
  terrainStatus?: 'AVAILABLE (NASADEM 30m)' | 'COARSE' | 'UNAVAILABLE';
  soilMoistureStatus?: 'FRESH' | 'SIMULATED' | 'ESTIMATED';
  historicalStatus?: 'AVAILABLE (GSI/NDMA)' | 'PARTIAL' | 'UNAVAILABLE';
  sensorStatus?: 'ACTIVE' | 'NO_RECENT_READING' | 'SIMULATED';
  overallQuality?: 'HIGH' | 'MEDIUM' | 'LOW';
}

export const DataQualityBadge: React.FC<Props> = ({
  rainfallStatus = 'FRESH',
  terrainStatus = 'AVAILABLE (NASADEM 30m)',
  soilMoistureStatus = 'FRESH',
  historicalStatus = 'AVAILABLE (GSI/NDMA)',
  sensorStatus = 'ACTIVE',
  overallQuality = 'HIGH'
}) => {
  const getQualityColor = () => {
    switch (overallQuality) {
      case 'HIGH': return { bg: 'rgba(34, 197, 94, 0.15)', text: '#4ade80', border: '#22c55e' };
      case 'MEDIUM': return { bg: 'rgba(234, 179, 8, 0.15)', text: '#facc15', border: '#eab308' };
      default: return { bg: 'rgba(239, 68, 68, 0.15)', text: '#f87171', border: '#ef4444' };
    }
  };

  const badge = getQualityColor();

  return (
    <div style={{
      background: 'rgba(15, 23, 42, 0.8)',
      borderRadius: '12px',
      border: '1px solid #1e293b',
      padding: '12px 14px',
      marginTop: '10px'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <span style={{ fontSize: '0.74rem', fontWeight: 800, color: '#f8fafc', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Data Integrity &amp; Quality Telemetry
        </span>
        <span style={{
          background: badge.bg,
          color: badge.text,
          border: `1px solid ${badge.border}`,
          padding: '2px 8px',
          borderRadius: '999px',
          fontSize: '0.68rem',
          fontWeight: 800
        }}>
          {overallQuality} INTEGRITY
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '6px', fontSize: '0.70rem' }}>
        <div style={{ background: 'rgba(30, 41, 59, 0.4)', padding: '6px 8px', borderRadius: '6px' }}>
          <span style={{ color: '#94a3b8' }}>Rainfall Telemetry:</span>{' '}
          <strong style={{ color: rainfallStatus === 'FRESH' ? '#4ade80' : '#facc15' }}>{rainfallStatus}</strong>
        </div>

        <div style={{ background: 'rgba(30, 41, 59, 0.4)', padding: '6px 8px', borderRadius: '6px' }}>
          <span style={{ color: '#94a3b8' }}>NASADEM Topography:</span>{' '}
          <strong style={{ color: terrainStatus.includes('AVAILABLE') ? '#4ade80' : '#f87171' }}>{terrainStatus}</strong>
        </div>

        <div style={{ background: 'rgba(30, 41, 59, 0.4)', padding: '6px 8px', borderRadius: '6px' }}>
          <span style={{ color: '#94a3b8' }}>Soil Moisture:</span>{' '}
          <strong style={{ color: soilMoistureStatus === 'FRESH' ? '#4ade80' : '#facc15' }}>{soilMoistureStatus}</strong>
        </div>

        <div style={{ background: 'rgba(30, 41, 59, 0.4)', padding: '6px 8px', borderRadius: '6px' }}>
          <span style={{ color: '#94a3b8' }}>Historical Records:</span>{' '}
          <strong style={{ color: '#4ade80' }}>{historicalStatus}</strong>
        </div>

        <div style={{ background: 'rgba(30, 41, 59, 0.4)', padding: '6px 8px', borderRadius: '6px' }}>
          <span style={{ color: '#94a3b8' }}>Sensor Feed:</span>{' '}
          <strong style={{ color: sensorStatus === 'ACTIVE' ? '#4ade80' : '#94a3b8' }}>{sensorStatus}</strong>
        </div>
      </div>
    </div>
  );
};
