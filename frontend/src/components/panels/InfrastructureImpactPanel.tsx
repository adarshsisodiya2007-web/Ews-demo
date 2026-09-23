import React from 'react';
import { Severity, InfrastructureImpact } from '../../types';
import { calculateInfrastructureImpact } from '../../services/api';

interface Props {
  regionName: string;
  severity: Severity;
}

export const InfrastructureImpactPanel: React.FC<Props> = ({ regionName, severity }) => {
  const impact: InfrastructureImpact = calculateInfrastructureImpact(regionName, severity);
  const isHighOrCritical = severity === 'HIGH' || severity === 'CRITICAL';

  return (
    <div style={{
      background: 'rgba(15, 23, 42, 0.85)',
      borderRadius: '14px',
      border: isHighOrCritical ? '1px solid rgba(239, 68, 68, 0.6)' : '1px solid #1e293b',
      padding: '16px',
      marginTop: '12px'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
        <div>
          <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>🏢</span> Critical Infrastructure &amp; Population Impact Analysis
          </h4>
          <span style={{ fontSize: '0.70rem', color: '#94a3b8' }}>
            Modelled GIS exposure buffer for {regionName}
          </span>
        </div>
        <span style={{
          background: 'rgba(245, 158, 11, 0.15)',
          color: '#fbbf24',
          border: '1px solid rgba(245, 158, 11, 0.3)',
          fontSize: '0.68rem',
          padding: '2px 8px',
          borderRadius: '999px',
          fontWeight: 800
        }}>
          MODELLED GEOSPATIAL ESTIMATE
        </span>
      </div>

      {/* Metrics Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: '8px', marginBottom: '12px' }}>
        <div style={{ background: 'rgba(30, 41, 59, 0.5)', padding: '10px', borderRadius: '8px', border: '1px solid rgba(51, 65, 85, 0.4)', textAlign: 'center' }}>
          <div style={{ fontSize: '0.68rem', color: '#94a3b8' }}>Population Exposed</div>
          <div style={{ fontSize: '1.15rem', fontWeight: 900, color: isHighOrCritical ? '#f87171' : '#38bdf8', marginTop: '2px' }}>
            {impact.estimatedPopulationExposed.toLocaleString()}
          </div>
        </div>

        <div style={{ background: 'rgba(30, 41, 59, 0.5)', padding: '10px', borderRadius: '8px', border: '1px solid rgba(51, 65, 85, 0.4)', textAlign: 'center' }}>
          <div style={{ fontSize: '0.68rem', color: '#94a3b8' }}>Road At Risk</div>
          <div style={{ fontSize: '1.15rem', fontWeight: 900, color: '#f59e0b', marginTop: '2px' }}>
            {impact.affectedRoadSegmentsKm} km
          </div>
        </div>

        <div style={{ background: 'rgba(30, 41, 59, 0.5)', padding: '10px', borderRadius: '8px', border: '1px solid rgba(51, 65, 85, 0.4)', textAlign: 'center' }}>
          <div style={{ fontSize: '0.68rem', color: '#94a3b8' }}>Bridges in Buffer</div>
          <div style={{ fontSize: '1.15rem', fontWeight: 900, color: '#f8fafc', marginTop: '2px' }}>
            {impact.criticalBridgesCount}
          </div>
        </div>

        <div style={{ background: 'rgba(30, 41, 59, 0.5)', padding: '10px', borderRadius: '8px', border: '1px solid rgba(51, 65, 85, 0.4)', textAlign: 'center' }}>
          <div style={{ fontSize: '0.68rem', color: '#94a3b8' }}>Relief Shelters</div>
          <div style={{ fontSize: '1.15rem', fontWeight: 900, color: '#4ade80', marginTop: '2px' }}>
            {impact.safeSheltersCount} ({impact.totalShelterCapacity} cap)
          </div>
        </div>
      </div>

      {/* Facilities Lists */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '0.74rem' }}>
        <div style={{ background: 'rgba(2, 6, 23, 0.5)', padding: '8px 10px', borderRadius: '8px', border: '1px solid rgba(51, 65, 85, 0.3)' }}>
          <div style={{ fontWeight: 700, color: '#38bdf8', marginBottom: '4px' }}>🏥 Nearby Health Facilities:</div>
          {impact.nearbyHospitals.map((h, i) => (
            <div key={i} style={{ color: '#cbd5e1' }}>• {h}</div>
          ))}
        </div>

        <div style={{ background: 'rgba(2, 6, 23, 0.5)', padding: '8px 10px', borderRadius: '8px', border: '1px solid rgba(51, 65, 85, 0.3)' }}>
          <div style={{ fontWeight: 700, color: '#eab308', marginBottom: '4px' }}>🏫 Nearby Schools (Potential Relief):</div>
          {impact.nearbySchools.map((s, i) => (
            <div key={i} style={{ color: '#cbd5e1' }}>• {s}</div>
          ))}
        </div>
      </div>
    </div>
  );
};
