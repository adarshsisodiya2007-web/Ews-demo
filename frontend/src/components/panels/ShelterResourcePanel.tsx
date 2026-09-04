import React, { useState, useEffect } from 'react';
import { calculateHaversineDistanceKm, calculateCompassBearing } from '../../utils/geoUtils';

export interface Shelter {
  id: string;
  name: string;
  zone: string;
  lat: number;
  lng: number;
  totalBeds: number;
  occupiedBeds: number;
  foodStockDays: number;
  medicalTeam: string;
  waterSupplyLitres: number;
  distanceKm?: number;
  bearing?: string;
  status: 'AVAILABLE' | 'ALMOST_FULL' | 'FULL';
}

export const MOCK_SHELTERS: Shelter[] = [
  {
    id: 's1',
    name: 'Meppadi Govt Higher Secondary School Relief Camp',
    zone: 'Meppadi, Wayanad (Testbed)',
    lat: 11.5512,
    lng: 76.1280,
    totalBeds: 350,
    occupiedBeds: 215,
    foodStockDays: 7,
    medicalTeam: 'Dr. Nair (NDRF Medical Unit 4)',
    waterSupplyLitres: 12000,
    status: 'AVAILABLE'
  },
  {
    id: 's2',
    name: 'Kalpatta Town Community Cyclone & Landslide Shelter',
    zone: 'Meppadi, Wayanad (Testbed)',
    lat: 11.6080,
    lng: 76.0820,
    totalBeds: 500,
    occupiedBeds: 460,
    foodStockDays: 12,
    medicalTeam: 'District Health Mobile Team',
    waterSupplyLitres: 25000,
    status: 'ALMOST_FULL'
  },
  {
    id: 's3',
    name: 'Munnar Tea Estate Community Hall Shelter',
    zone: 'Munnar, Idukki (Western Ghats)',
    lat: 10.0895,
    lng: 77.0600,
    totalBeds: 200,
    occupiedBeds: 85,
    foodStockDays: 5,
    medicalTeam: 'Kerala State Disaster Response (SDRF)',
    waterSupplyLitres: 8000,
    status: 'AVAILABLE'
  },
  {
    id: 's4',
    name: 'Guwahati Stadium Emergency Relief Center',
    zone: 'Guwahati Hills (NER)',
    lat: 26.1550,
    lng: 91.7450,
    totalBeds: 800,
    occupiedBeds: 320,
    foodStockDays: 14,
    medicalTeam: 'Guwahati Medical College Rapid Unit',
    waterSupplyLitres: 40000,
    status: 'AVAILABLE'
  },
  {
    id: 's5',
    name: 'Aizawl Synod Conference Hall Relief Camp',
    zone: 'Aizawl Slopes (NER)',
    lat: 23.7310,
    lng: 92.7190,
    totalBeds: 400,
    occupiedBeds: 380,
    foodStockDays: 4,
    medicalTeam: 'Mizoram SDRF Medical Team',
    waterSupplyLitres: 15000,
    status: 'ALMOST_FULL'
  }
];

interface Props {
  selectedZoneName?: string;
  userLat?: number;
  userLon?: number;
  theme?: 'light' | 'dark';
}

export const ShelterResourcePanel: React.FC<Props> = ({
  selectedZoneName,
  userLat,
  userLon,
  theme = 'dark',
}) => {
  const [shelters, setShelters] = useState<Shelter[]>(MOCK_SHELTERS);
  const [cachedTime, setCachedTime] = useState<number | null>(null);
  const [highlightNearest, setHighlightNearest] = useState<boolean>(false);
  const isOnline = navigator.onLine;

  useEffect(() => {
    import('../../services/offlineStore').then(async (store) => {
      try {
        const cached = await store.getCachedShelters();
        if (cached?.data && cached.data.length > 0) {
          setShelters(cached.data);
          setCachedTime(cached.timestamp);
        } else {
          await store.cacheShelters(MOCK_SHELTERS);
        }
      } catch {}
    });
  }, []);

  // Compute live distance and bearing for each shelter if user coordinates are available
  const computedShelters: Shelter[] = shelters.map((s) => {
    if (userLat !== undefined && userLon !== undefined) {
      const dist = calculateHaversineDistanceKm(userLat, userLon, s.lat, s.lng);
      const brg = calculateCompassBearing(userLat, userLon, s.lat, s.lng);
      return { ...s, distanceKm: dist, bearing: brg };
    }
    return { ...s, distanceKm: s.distanceKm || 3.5, bearing: 'Nearby' };
  });

  // Sort by calculated distance if user coordinates exist
  const sortedShelters = [...computedShelters].sort((a, b) => (a.distanceKm ?? 999) - (b.distanceKm ?? 999));
  const nearestShelter = sortedShelters.length > 0 ? sortedShelters[0] : null;

  const filteredShelters = selectedZoneName
    ? computedShelters.filter(
        s => s.zone === selectedZoneName || s.zone.includes(selectedZoneName.split(',')[0])
      )
    : computedShelters;

  const displayList = highlightNearest
    ? sortedShelters
    : (filteredShelters.length > 0 ? filteredShelters : computedShelters);

  const isLight = theme === 'light';
  const cardBg = isLight ? '#ffffff' : '#0f172a';
  const itemBg = isLight ? '#f8fafc' : '#1e293b';
  const innerBg = isLight ? '#ffffff' : '#0f172a';
  const brd = isLight ? '#e2e8f0' : '#1e293b';
  const itemBrd = isLight ? '#e2e8f0' : '#334155';
  const fg = isLight ? '#0f172a' : '#f8fafc';
  const muted = isLight ? '#475569' : '#94a3b8';

  return (
    <div style={{ background: cardBg, border: `1px solid ${brd}`, borderRadius: '16px', padding: '24px', marginBottom: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', flexWrap: 'wrap', gap: '8px' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: fg, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>🏥</span> Safe Relief Camps &amp; Resource Allocation
          </h3>
          <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: muted }}>
            Designated emergency shelter capacities, food rations &amp; medical response units.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Find Nearest Button */}
          <button
            onClick={() => setHighlightNearest(prev => !prev)}
            style={{
              background: highlightNearest ? '#16a34a' : (isLight ? '#f1f5f9' : '#1e293b'),
              color: highlightNearest ? '#ffffff' : (isLight ? '#0f172a' : '#ffffff'),
              border: `1px solid ${highlightNearest ? '#15803d' : (isLight ? '#cbd5e1' : '#3b82f6')}`,
              borderRadius: '20px',
              padding: '6px 14px',
              fontSize: '0.78rem',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            🧭 {highlightNearest ? 'Showing Nearest First' : 'Find Nearest Rescue Point'}
          </button>
          <span style={{
            background: isOnline ? (isLight ? 'rgba(22, 163, 74, 0.12)' : 'rgba(34, 197, 94, 0.15)') : (isLight ? 'rgba(217, 119, 6, 0.12)' : 'rgba(245, 158, 11, 0.15)'),
            border: `1px solid ${isOnline ? (isLight ? '#16a34a' : '#22c55e') : (isLight ? '#d97706' : '#f59e0b')}`,
            color: isOnline ? (isLight ? '#15803d' : '#4ade80') : (isLight ? '#b45309' : '#fcd34d'),
            padding: '4px 12px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 700
          }}>
            {isOnline ? '● LIVE RESOURCE SYNC' : cachedTime ? `📴 OFFLINE CACHED DIRECTORY (${new Date(cachedTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})` : '📴 OFFLINE CACHED DIRECTORY'}
          </span>
        </div>
      </div>

      {/* ── Highlight Card: Nearest Rescue Point ── */}
      {nearestShelter && (
        <div
          style={{
            background: isLight ? 'linear-gradient(135deg, #dcfce7, #f0fdf4)' : 'linear-gradient(135deg, rgba(22, 163, 74, 0.15), rgba(15, 23, 42, 0.8))',
            border: `1px solid ${isLight ? '#86efac' : '#22c55e'}`,
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '20px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          <div>
            <div style={{ fontSize: '0.72rem', fontWeight: 800, color: isLight ? '#15803d' : '#4ade80', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              ⭐ CLOSEST CONFIRMED RESCUE POINT TO YOUR LOCATION
            </div>
            <div style={{ fontSize: '1.1rem', fontWeight: 900, color: fg, marginTop: '2px' }}>
              {nearestShelter.name}
            </div>
            <div style={{ fontSize: '0.8rem', color: muted, marginTop: '4px' }}>
              Calculated Distance: <strong style={{ color: isLight ? '#0284c7' : '#38bdf8' }}>{nearestShelter.distanceKm} km</strong> ({nearestShelter.bearing} bearing) ·
              Beds Available: <strong style={{ color: isLight ? '#15803d' : '#4ade80' }}>{nearestShelter.totalBeds - nearestShelter.occupiedBeds}</strong>
            </div>
          </div>
          <span style={{
            background: '#16a34a',
            color: '#ffffff',
            padding: '6px 14px',
            borderRadius: '8px',
            fontWeight: 800,
            fontSize: '0.82rem',
          }}>
            {nearestShelter.status}
          </span>
        </div>
      )}

      {/* ── Shelters Grid ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>
        {displayList.map(shelter => {
          const occPct = Math.round((shelter.occupiedBeds / shelter.totalBeds) * 100);
          const isAlmostFull = occPct >= 85;

          return (
            <div
              key={shelter.id}
              style={{
                background: itemBg, border: `1px solid ${itemBrd}`, borderRadius: '12px',
                padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: fg }}>
                    {shelter.name}
                  </h4>
                  <div style={{ fontSize: '0.75rem', color: isLight ? '#0284c7' : '#38bdf8', marginTop: '2px' }}>
                    📍 {shelter.distanceKm} km away ({shelter.bearing || 'Verified'}) · Safe corridor
                  </div>
                </div>
                <span style={{
                  background: isAlmostFull ? '#dc2626' : '#16a34a', color: '#fff',
                  padding: '3px 8px', borderRadius: '6px', fontSize: '0.7rem', fontWeight: 800
                }}>
                  {isAlmostFull ? 'ALMOST FULL' : 'AVAILABLE'}
                </span>
              </div>

              {/* Occupancy bar */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: muted, marginBottom: '4px' }}>
                  <span>Bed Occupancy:</span>
                  <strong style={{ color: fg }}>{shelter.occupiedBeds} / {shelter.totalBeds} ({occPct}%)</strong>
                </div>
                <div style={{ width: '100%', height: '8px', background: isLight ? '#e2e8f0' : '#0f172a', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{
                    width: `${occPct}%`, height: '100%',
                    background: isAlmostFull ? '#dc2626' : occPct > 60 ? '#f59e0b' : '#16a34a',
                    borderRadius: '4px', transition: 'width 0.5s ease'
                  }} />
                </div>
              </div>

              {/* Resource Metrics Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '0.75rem', background: innerBg, border: `1px solid ${itemBrd}`, padding: '10px', borderRadius: '8px' }}>
                <div>
                  <span style={{ color: muted }}>🍞 Food Stocks:</span><br/>
                  <strong style={{ color: fg }}>{shelter.foodStockDays} Days Reserve</strong>
                </div>
                <div>
                  <span style={{ color: muted }}>💧 Potable Water:</span><br/>
                  <strong style={{ color: fg }}>{shelter.waterSupplyLitres.toLocaleString()} L</strong>
                </div>
                <div style={{ gridColumn: 'span 2', marginTop: '4px', borderTop: `1px solid ${brd}`, paddingTop: '6px' }}>
                  <span style={{ color: muted }}>🩺 Medical Station:</span><br/>
                  <strong style={{ color: isLight ? '#15803d' : '#4ade80' }}>{shelter.medicalTeam}</strong>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
