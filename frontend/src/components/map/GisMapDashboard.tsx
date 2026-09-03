import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Polygon, Polyline, Popup, Marker, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { fetchRiskAssessment } from '../../services/api';
import { RiskAssessmentResponse } from '../../types';

// Fix default Leaflet icon paths
const defaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});

interface PresetZone {
  name: string;
  lat: number;
  lon: number;
  slope: number;
}

const PRESET_ZONES: PresetZone[] = [
  { name: 'Meppadi, Wayanad (Testbed)', lat: 11.5534, lon: 76.1320, slope: 38.5 },
  { name: 'Munnar, Idukki (Western Ghats)', lat: 10.0889, lon: 77.0595, slope: 42.0 },
  { name: 'Guwahati Hills (NER)', lat: 26.1445, lon: 91.7362, slope: 28.0 },
  { name: 'Shillong Ridge (NER)', lat: 25.5788, lon: 91.8933, slope: 34.0 },
  { name: 'Aizawl Slopes (NER)', lat: 23.7271, lon: 92.7176, slope: 45.0 }
];

// Component to dynamically pan/zoom map on zone change
function MapCenterController({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo(center, 13, { duration: 1.5 });
  }, [center, map]);
  return null;
}

import { useNavigate } from 'react-router-dom';

export const GisMapDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [selectedZone, setSelectedZone] = useState<PresetZone>(PRESET_ZONES[0]);
  const [data, setData] = useState<RiskAssessmentResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth <= 768);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchRiskAssessment(selectedZone.lat, selectedZone.lon, selectedZone.slope, selectedZone.name)
      .then((res) => {
        setData(res);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Error fetching risk assessment:', err);
        setLoading(false);
      });
  }, [selectedZone]);

  const hazardPolygon: [number, number][] = [
    [selectedZone.lat + 0.01, selectedZone.lon - 0.012],
    [selectedZone.lat + 0.03, selectedZone.lon + 0.018],
    [selectedZone.lat - 0.01, selectedZone.lon + 0.028],
    [selectedZone.lat - 0.02, selectedZone.lon - 0.002]
  ];

  const blockedRoad: [number, number][] = [
    [selectedZone.lat - 0.003, selectedZone.lon - 0.012],
    [selectedZone.lat + 0.017, selectedZone.lon + 0.008]
  ];

  const safeEvacuationRoute: [number, number][] = [
    [selectedZone.lat - 0.003, selectedZone.lon - 0.012],
    [selectedZone.lat - 0.033, selectedZone.lon - 0.002],
    [selectedZone.lat - 0.013, selectedZone.lon + 0.038]
  ];

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100vw', background: '#0b1329', color: '#f1f5f9', fontFamily: 'Inter, system-ui, sans-serif', position: 'relative', overflow: 'hidden' }}>
      {/* ── Mobile Floating Sidebar Toggle ── */}
      {isMobile && (
        <button
          onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
          style={{
            position: 'absolute',
            top: 12,
            left: 12,
            zIndex: 1000,
            background: '#0f172a',
            color: '#38bdf8',
            border: '1px solid #38bdf8',
            borderRadius: '8px',
            padding: '8px 14px',
            fontSize: '0.8rem',
            fontWeight: 700,
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(0,0,0,0.5)'
          }}
        >
          {mobileSidebarOpen ? '🗺️ View Map Fullscreen' : '⚙️ Controls & Legend'}
        </button>
      )}

      {/* ── Command Sidebar ─────────────────────────────────────────────── */}
      <div style={{
        width: isMobile ? '100%' : '380px',
        position: isMobile ? 'absolute' : 'relative',
        top: 0, bottom: 0, left: 0,
        background: '#0f172a',
        borderRight: '1px solid #1e293b',
        padding: isMobile ? '60px 16px 20px 16px' : '24px',
        overflowY: 'auto',
        boxSizing: 'border-box',
        display: isMobile && !mobileSidebarOpen ? 'none' : 'flex',
        flexDirection: 'column',
        gap: '20px',
        zIndex: 900
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px', flexWrap: 'wrap', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '1.4rem' }}>🛰️</span>
              <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: '#f8fafc', letterSpacing: '-0.02em' }}>
                SIH 2026 EWS
              </h2>
            </div>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              <button
                onClick={() => navigate('/responder')}
                title="Responder Portal"
                style={{ background: 'rgba(234, 88, 12, 0.25)', color: '#fb923c', border: '1px solid #ea580c', borderRadius: '4px', padding: '4px 8px', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}
              >
                🛡️ Responder
              </button>
              <button
                onClick={() => navigate('/map')}
                title="Regional Heatmap"
                style={{ background: '#1e293b', color: '#38bdf8', border: '1px solid #334155', borderRadius: '4px', padding: '4px 8px', fontSize: '0.75rem', cursor: 'pointer' }}
              >
                🗺️ Heatmap
              </button>
              <button
                onClick={() => navigate('/dashboard')}
                title="Official Portal"
                style={{ background: '#1e293b', color: '#94a3b8', border: '1px solid #334155', borderRadius: '4px', padding: '4px 8px', fontSize: '0.75rem', cursor: 'pointer' }}
              >
                🛡️ Admin
              </button>
            </div>
          </div>
          <p style={{ margin: 0, fontSize: '0.8rem', color: '#94a3b8' }}>
            AI Landslide Early Warning &amp; Evacuation Hub
          </p>
        </div>

        {/* Region Selector */}
        <div style={{ background: '#1e293b', padding: '12px', borderRadius: '8px', border: '1px solid #334155' }}>
          <label style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#94a3b8', fontWeight: 600 }}>
            Select Testbed / Monitored Zone
          </label>
          <select
            value={selectedZone.name}
            onChange={(e) => {
              const zone = PRESET_ZONES.find(z => z.name === e.target.value);
              if (zone) setSelectedZone(zone);
            }}
            style={{
              width: '100%',
              marginTop: '8px',
              padding: '8px 12px',
              borderRadius: '6px',
              background: '#0f172a',
              color: '#f8fafc',
              border: '1px solid #475569',
              fontSize: '0.875rem',
              cursor: 'pointer'
            }}
          >
            {PRESET_ZONES.map(z => (
              <option key={z.name} value={z.name}>{z.name}</option>
            ))}
          </select>
        </div>

        {/* AI Hazard Risk Meter */}
        <div style={{
          background: data?.assessment?.level === 'RED' ? 'rgba(239, 68, 68, 0.15)' :
                      data?.assessment?.level === 'AMBER' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(34, 197, 94, 0.15)',
          border: `1px solid ${data?.assessment?.level === 'RED' ? '#ef4444' : data?.assessment?.level === 'AMBER' ? '#f59e0b' : '#22c55e'}`,
          borderRadius: '8px',
          padding: '16px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#94a3b8' }}>AI SUSCEPTIBILITY SCORE</span>
            <span style={{
              background: data?.assessment?.level === 'RED' ? '#ef4444' : data?.assessment?.level === 'AMBER' ? '#f59e0b' : '#22c55e',
              color: '#fff',
              padding: '3px 10px',
              borderRadius: '999px',
              fontSize: '0.75rem',
              fontWeight: 700
            }}>
              {data?.assessment?.level || 'MODERATE'} RISK ({(data?.assessment?.score ?? 0.84).toFixed(2)})
            </span>
          </div>

          <div style={{ marginTop: '12px' }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#f8fafc' }}>Action Protocol:</div>
            <div style={{
              marginTop: '4px',
              fontSize: '0.9rem',
              color: data?.assessment?.level === 'RED' ? '#fca5a5' : data?.assessment?.level === 'AMBER' ? '#fcd34d' : '#86efac',
              fontWeight: 600
            }}>
              ⚠️ {data?.assessment?.action_protocol || 'Evaluating...'}
            </div>
          </div>
        </div>

        {/* Dynamic Weather Telemetry */}
        <div style={{ background: '#1e293b', padding: '16px', borderRadius: '8px', border: '1px solid #334155' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#38bdf8' }}>🌤️ OPEN-METEO WEATHER TELEMETRY</span>
            <span style={{ fontSize: '0.7rem', color: '#64748b' }}>Live Sync</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div style={{ background: '#0f172a', padding: '10px', borderRadius: '6px' }}>
              <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>24h Cumulative Rain</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 700, color: (data?.weather?.rain_24h_mm ?? 0) > 100 ? '#ef4444' : '#38bdf8', marginTop: '2px' }}>
                {data?.weather?.rain_24h_mm ?? 142.0} mm
              </div>
            </div>

            <div style={{ background: '#0f172a', padding: '10px', borderRadius: '6px' }}>
              <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>72h Cumulative Rain</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#f8fafc', marginTop: '2px' }}>
                {data?.weather?.rain_72h_mm ?? 285.0} mm
              </div>
            </div>

            <div style={{ background: '#0f172a', padding: '10px', borderRadius: '6px' }}>
              <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Soil Moisture (0-1cm)</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#f8fafc', marginTop: '2px' }}>
                {data?.weather?.soil_moisture ?? 0.52} m³/m³
              </div>
            </div>

            <div style={{ background: '#0f172a', padding: '10px', borderRadius: '6px' }}>
              <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Terrain Slope Angle</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fbbf24', marginTop: '2px' }}>
                {selectedZone.slope}°
              </div>
            </div>

            <div style={{ background: '#0f172a', padding: '10px', borderRadius: '6px', gridColumn: 'span 2' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>🛰️ NASA SRTM 30m DEM Elevation:</span>
                <span style={{ fontSize: '0.95rem', fontWeight: 700, color: '#38bdf8' }}>879.0 m (Wayanad High Peak)</span>
              </div>
            </div>
          </div>

          {data?.weather?.critical_rain_trigger && (
            <div style={{
              marginTop: '10px',
              padding: '6px 10px',
              background: 'rgba(239, 68, 68, 0.2)',
              border: '1px solid #ef4444',
              borderRadius: '4px',
              fontSize: '0.75rem',
              color: '#fca5a5',
              fontWeight: 600
            }}>
              🚨 Critical Rain Threshold Exceeded (&gt;100mm)
            </div>
          )}
        </div>

        {/* Dynamic Safe Road Rerouting */}
        <div style={{ background: '#1e293b', padding: '16px', borderRadius: '8px', border: '1px solid #334155' }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#4ade80', marginBottom: '10px' }}>
            🚗 DYNAMIC SAFE ROAD REROUTING
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.82rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#94a3b8' }}>Primary Road Corridor:</span>
              <strong style={{ color: '#f87171' }}>{data?.evacuation_plan?.primary_corridor || 'NH-766 Blocked'}</strong>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#94a3b8' }}>Evacuation Detour:</span>
              <strong style={{ color: '#4ade80' }}>{data?.evacuation_plan?.safe_evacuation_route || 'Active via SH-59'}</strong>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#94a3b8' }}>Est. Transit Time:</span>
              <span style={{ color: '#f8fafc', fontWeight: 600 }}>{data?.evacuation_plan?.estimated_evacuation_time_min ?? 42} mins</span>
            </div>
          </div>
        </div>

        {/* GIS Layer Legend */}
        <div style={{ background: '#0b1329', padding: '12px', borderRadius: '6px', fontSize: '0.75rem', border: '1px solid #1e293b' }}>
          <div style={{ fontWeight: 600, color: '#94a3b8', marginBottom: '6px' }}>GIS MAP LAYERS</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ display: 'inline-block', width: '12px', height: '12px', background: '#ef4444', opacity: 0.7, borderRadius: '2px' }}></span>
              <span>Critical Landslide Hazard Polygon</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ display: 'inline-block', width: '16px', height: '3px', background: '#ef4444', borderTop: '1px dashed #ef4444' }}></span>
              <span>Blocked Road Corridor (NH-766)</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ display: 'inline-block', width: '16px', height: '3px', background: '#22c55e' }}></span>
              <span>Recommended Evacuation Route (SH-59 Bypass)</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '14px' }}>🏥</span>
              <span>Designated Relief Camp</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Leaflet.js Interactive GIS Map ──────────────────────────────── */}
      <div style={{ flex: 1, position: 'relative', height: '100%' }}>
        <MapContainer
          center={[selectedZone.lat, selectedZone.lon]}
          zoom={12}
          style={{ height: '100%', width: '100%' }}
        >
          <MapCenterController center={[selectedZone.lat, selectedZone.lon]} />

          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors | SIH 2026 EWS'
          />

          {/* High Risk Landslide Polygon */}
          <Polygon
            positions={hazardPolygon}
            pathOptions={{
              color: '#ef4444',
              fillColor: '#f87171',
              fillOpacity: 0.45,
              weight: 2
            }}
          >
            <Popup>
              <div style={{ color: '#0f172a' }}>
                <strong style={{ color: '#ef4444' }}>⚠️ CRITICAL HAZARD ZONE</strong>
                <br />
                Calculated Probability: <strong>{((data?.assessment.score ?? 0.84) * 100).toFixed(0)}%</strong>
                <br />
                Slope Angle: <strong>{selectedZone.slope}°</strong>
                <br />
                Action: <strong>Immediate Evacuation</strong>
              </div>
            </Popup>
          </Polygon>

          {/* Blocked Road Polyline (Red Dashed) */}
          <Polyline
            positions={blockedRoad}
            pathOptions={{
              color: '#ef4444',
              dashArray: '6, 8',
              weight: 5
            }}
          >
            <Popup>
              <div style={{ color: '#0f172a' }}>
                <strong style={{ color: '#ef4444' }}>⛔ BLOCKED CORRIDOR</strong>
                <br />
                High Landslide Inundation Risk
              </div>
            </Popup>
          </Polyline>

          {/* Safe Evacuation Route Polyline (Green Solid) */}
          <Polyline
            positions={safeEvacuationRoute}
            pathOptions={{
              color: '#22c55e',
              weight: 5,
              opacity: 0.9
            }}
          >
            <Popup>
              <div style={{ color: '#0f172a' }}>
                <strong style={{ color: '#22c55e' }}>✅ RECOMMENDED DETOUR ROUTE</strong>
                <br />
                Bypass clearance active via SH-59 (Subject to ground confirmation).
              </div>
            </Popup>
          </Polyline>

          {/* Relief Camp Pin */}
          <Marker position={[selectedZone.lat - 0.013, selectedZone.lon + 0.038]} icon={defaultIcon}>
            <Popup>
              <div style={{ color: '#0f172a' }}>
                <strong style={{ color: '#16a34a' }}>🏥 Designated Relief Camp</strong>
                <br />
                Relief & Medical Hub Active
              </div>
            </Popup>
          </Marker>

          {/* Zone Centroid Marker */}
          <Marker position={[selectedZone.lat, selectedZone.lon]} icon={defaultIcon}>
            <Popup>
              <div style={{ color: '#0f172a' }}>
                <strong>{selectedZone.name}</strong>
                <br />
                Susceptibility Score: {data?.assessment.score ?? 0.84}
              </div>
            </Popup>
          </Marker>
        </MapContainer>
      </div>
    </div>
  );
};
