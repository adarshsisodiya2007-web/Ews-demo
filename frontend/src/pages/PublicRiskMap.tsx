import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Circle } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { RegionRisk } from '../types';
import { fetchHeatmap } from '../services/api';
import { RiskMarker } from '../components/map/RiskMarker';
import { useNavigate } from 'react-router-dom';

const PublicRiskMap = () => {
  const [regions, setRegions] = useState<RegionRisk[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    fetchHeatmap().then(setRegions).catch(console.error);
  }, []);

  return (
    <div style={{ height: '100vh', position: 'relative' }}>
      <div style={{ position: 'absolute', top: 16, left: 16, zIndex: 1000, background: 'var(--color-base-800)', padding: '16px', borderRadius: '8px', border: '1px solid var(--color-base-600)' }}>
        <h2 style={{ margin: '0 0 12px 0', fontSize: '1rem' }}>Public Risk Map</h2>
        <div style={{ display: 'flex', gap: '8px' }}>
          <span style={{ color: 'var(--color-risk-low)' }}>● Low</span>
          <span style={{ color: 'var(--color-risk-moderate)' }}>◆ Mod</span>
          <span style={{ color: 'var(--color-risk-high)' }}>▲ High</span>
          <span style={{ color: 'var(--color-risk-critical)' }}>✦ Crit</span>
        </div>
      </div>

      <MapContainer center={[25.5, 92.0]} zoom={7} style={{ height: '100%', width: '100%' }}>
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors | SIH 2026 EWS' maxZoom={19} />
        {regions.map(r => (
          <React.Fragment key={r.regionId}>
            <Circle center={[r.centroidLat, r.centroidLng]} radius={5000} pathOptions={{ fillColor: 'var(--color-risk-' + r.severity.toLowerCase() + ')', fillOpacity: 0.3, color: 'transparent' }} />
            <RiskMarker region={r} onClick={() => {}} />
          </React.Fragment>
        ))}
      </MapContainer>

      <div style={{
        position: 'absolute', bottom: 32, left: '50%', transform: 'translateX(-50%)', zIndex: 1000,
        display: 'flex', gap: '12px'
      }}>
        <button onClick={() => navigate('/sih-dashboard')} style={{
          padding: '14px 24px', background: '#0f172a', color: '#38bdf8', border: '1px solid #38bdf8', borderRadius: '32px',
          fontSize: '0.95rem', fontWeight: 600, cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,0,0,0.5)'
        }}>
          🛰️ SIH 2026 AI Command Map
        </button>
        <button onClick={() => navigate('/report')} style={{
          padding: '14px 24px', background: 'var(--color-citizen-confirm)', color: '#fff', border: 'none', borderRadius: '32px',
          fontSize: '0.95rem', fontWeight: 600, cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,0,0,0.5)'
        }}>
          📋 Report an Incident
        </button>
      </div>
    </div>
  );
};

export default PublicRiskMap;
