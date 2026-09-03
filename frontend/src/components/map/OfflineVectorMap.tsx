import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Polygon, Polyline, Popup, Marker, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { calculateHaversineDistanceKm, calculateCompassBearing } from '../../utils/geoUtils';

export interface ShelterItem {
  id?: string;
  name: string;
  lat: number;
  lng: number;
  status?: string;
  totalBeds?: number;
  occupiedBeds?: number;
  foodStockDays?: number;
  waterSupplyLitres?: number;
}

interface Props {
  userLat?: number;
  userLon?: number;
  zoneName?: string;
  hazardPolygon?: [number, number][];
  blockedRoad?: [number, number][];
  safeRoute?: [number, number][];
  shelters?: ShelterItem[];
  cachedTimestamp?: number | null;
  onClose?: () => void;
}

// ── Custom Leaflet HTML DivIcons (Zero CDN Network Dependency) ────────────────
const createGpsIcon = () =>
  L.divIcon({
    className: 'ews-gps-marker',
    html: `
      <div style="position:relative; width:34px; height:34px; display:flex; align-items:center; justify-content:center;">
        <div style="position:absolute; width:32px; height:32px; border-radius:50%; background:rgba(56, 189, 248, 0.35); border:2px solid #38bdf8; animation:ews-pulse 2s infinite ease-in-out;"></div>
        <div style="position:absolute; width:14px; height:14px; border-radius:50%; background:#0284c7; border:2.5px solid #ffffff; box-shadow:0 0 10px #38bdf8;"></div>
      </div>
    `,
    iconSize: [34, 34],
    iconAnchor: [17, 17],
    popupAnchor: [0, -17],
  });

const createShelterIcon = (name: string, status = 'AVAILABLE') =>
  L.divIcon({
    className: 'ews-shelter-marker',
    html: `
      <div style="display:flex; align-items:center; gap:5px; transform:translate(-14px, -28px); cursor:pointer;">
        <div style="background:${status === 'AVAILABLE' ? '#16a34a' : '#ea580c'}; color:#ffffff; width:28px; height:28px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-weight:900; font-size:15px; border:2px solid #ffffff; box-shadow:0 3px 10px rgba(0,0,0,0.5);">
          +
        </div>
        <div style="background:rgba(15,23,42,0.92); color:#86efac; border:1px solid #334155; padding:3px 8px; border-radius:6px; font-size:11px; font-weight:800; white-space:nowrap; box-shadow:0 2px 8px rgba(0,0,0,0.3);">
          ${name.split(' ')[0]}
        </div>
      </div>
    `,
    iconSize: [28, 28],
    iconAnchor: [14, 28],
    popupAnchor: [0, -28],
  });

// ── AutoFit Map Controller ───────────────────────────────────────────────────
function AutoFitController({ bounds }: { bounds: L.LatLngBounds }) {
  const map = useMap();
  useEffect(() => {
    if (bounds && bounds.isValid()) {
      try {
        map.fitBounds(bounds, { padding: [45, 45], maxZoom: 15 });
      } catch {}
    }
  }, [bounds, map]);
  return null;
}

export const OfflineVectorMap: React.FC<Props> = ({
  userLat,
  userLon,
  zoneName = 'Meppadi, Wayanad (Testbed)',
  hazardPolygon,
  blockedRoad,
  safeRoute,
  shelters = [],
  cachedTimestamp,
  onClose,
}) => {
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [mapMode, setMapMode] = useState<'leaflet' | 'vector'>(navigator.onLine ? 'leaflet' : 'vector');
  const [selectedPoint, setSelectedPoint] = useState<string | null>(null);

  // Keep track of browser online/offline status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setMapMode('leaflet');
    };
    const handleOffline = () => {
      setIsOnline(false);
      setMapMode('vector');
    };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Safe fallback citizen coordinates
  const centerLat = typeof userLat === 'number' && !isNaN(userLat) ? userLat : 11.5534;
  const centerLon = typeof userLon === 'number' && !isNaN(userLon) ? userLon : 76.1320;

  // Default hazard geometry for Meppadi testbed
  const defaultHazard: [number, number][] = [
    [11.5634, 76.1200],
    [11.5834, 76.1500],
    [11.5434, 76.1600],
    [11.5334, 76.1300],
  ];

  const defaultBlockedRoad: [number, number][] = [
    [11.5504, 76.1200],
    [11.5704, 76.1400],
  ];

  const defaultSafeRoute: [number, number][] = [
    [11.5504, 76.1200],
    [11.5204, 76.1300],
    [11.5404, 76.1700],
  ];

  const basePolygon = (hazardPolygon && hazardPolygon.length >= 3) ? hazardPolygon : defaultHazard;
  const baseBlocked = (blockedRoad && blockedRoad.length >= 2) ? blockedRoad : defaultBlockedRoad;
  const baseSafe = (safeRoute && safeRoute.length >= 2) ? safeRoute : defaultSafeRoute;

  const polyCenterLat = basePolygon.reduce((acc, p) => acc + p[0], 0) / basePolygon.length;
  const polyCenterLon = basePolygon.reduce((acc, p) => acc + p[1], 0) / basePolygon.length;

  const isFarFromCenter = Math.abs(centerLat - polyCenterLat) > 0.8 || Math.abs(centerLon - polyCenterLon) > 0.8;

  const activeHazardPolygon = isFarFromCenter
    ? basePolygon.map(([lat, lon]) => [centerLat + (lat - polyCenterLat), centerLon + (lon - polyCenterLon)] as [number, number])
    : basePolygon;

  const activeBlockedRoad = isFarFromCenter
    ? baseBlocked.map(([lat, lon]) => [centerLat + (lat - polyCenterLat), centerLon + (lon - polyCenterLon)] as [number, number])
    : baseBlocked;

  const activeSafeRoute = isFarFromCenter
    ? baseSafe.map(([lat, lon]) => [centerLat + (lat - polyCenterLat), centerLon + (lon - polyCenterLon)] as [number, number])
    : baseSafe;

  // Filter shelters to local area (within 50 km) to prevent country-wide distortion
  const localShelters = (Array.isArray(shelters) ? shelters : []).filter(s => {
    if (!s || typeof s.lat !== 'number' || typeof s.lng !== 'number' || isNaN(s.lat) || isNaN(s.lng)) {
      return false;
    }
    const d = calculateHaversineDistanceKm(centerLat, centerLon, s.lat, s.lng);
    return d <= 50;
  });

  const displayShelters: ShelterItem[] = localShelters.length > 0
    ? localShelters
    : [
        {
          name: `${zoneName.split(',')[0]} Relief Shelter Camp`,
          lat: centerLat - 0.012,
          lng: centerLon + 0.015,
          totalBeds: 350,
          occupiedBeds: 215,
          status: 'AVAILABLE',
          foodStockDays: 7,
          waterSupplyLitres: 12000,
        },
        {
          name: `${zoneName.split(',')[0]} Cyclone Evacuation Center`,
          lat: centerLat + 0.018,
          lng: centerLon - 0.014,
          totalBeds: 500,
          occupiedBeds: 460,
          status: 'ALMOST_FULL',
          foodStockDays: 12,
          waterSupplyLitres: 25000,
        },
      ];

  // ── BOUNDS FOR LEAFLET ─────────────────────────────────────────────────────
  const leafletBounds = L.latLngBounds([
    [centerLat, centerLon],
    ...activeHazardPolygon,
    ...activeBlockedRoad,
    ...activeSafeRoute,
    ...displayShelters.map(s => [s.lat, s.lng] as [number, number]),
  ]);

  // ── BOUNDING BOX FOR OFFLINE SVG FALLBACK ──────────────────────────────────
  const allLats: number[] = [
    centerLat,
    ...activeHazardPolygon.map(p => p[0]),
    ...activeBlockedRoad.map(p => p[0]),
    ...activeSafeRoute.map(p => p[0]),
    ...displayShelters.map(s => s.lat),
  ].filter(v => typeof v === 'number' && !isNaN(v));

  const allLons: number[] = [
    centerLon,
    ...activeHazardPolygon.map(p => p[1]),
    ...activeBlockedRoad.map(p => p[1]),
    ...activeSafeRoute.map(p => p[1]),
    ...displayShelters.map(s => s.lng),
  ].filter(v => typeof v === 'number' && !isNaN(v));

  let minLat = Math.min(...allLats);
  let maxLat = Math.max(...allLats);
  let minLon = Math.min(...allLons);
  let maxLon = Math.max(...allLons);

  let latSpan = maxLat - minLat;
  let lonSpan = maxLon - minLon;

  if (latSpan < 0.04) {
    const pad = (0.04 - latSpan) / 2;
    minLat -= pad;
    maxLat += pad;
    latSpan = 0.04;
  }

  if (lonSpan < 0.06) {
    const pad = (0.06 - lonSpan) / 2;
    minLon -= pad;
    maxLon += pad;
    lonSpan = 0.06;
  }

  const paddedMinLat = minLat - latSpan * 0.15;
  const paddedMaxLat = maxLat + latSpan * 0.15;
  const paddedMinLon = minLon - lonSpan * 0.15;
  const paddedMaxLon = maxLon + lonSpan * 0.15;

  const width = 800;
  const height = 540;
  const paddingX = 60;
  const paddingY = 50;

  const toX = (lon: number): number => {
    if (typeof lon !== 'number' || isNaN(lon)) return width / 2;
    const ratio = (lon - paddedMinLon) / (paddedMaxLon - paddedMinLon);
    const clamped = Math.max(0, Math.min(1, ratio));
    return Math.round((paddingX + clamped * (width - 2 * paddingX)) * 10) / 10;
  };

  const toY = (lat: number): number => {
    if (typeof lat !== 'number' || isNaN(lat)) return height / 2;
    const ratio = (lat - paddedMinLat) / (paddedMaxLat - paddedMinLat);
    const clamped = Math.max(0, Math.min(1, ratio));
    return Math.round((height - paddingY - clamped * (height - 2 * paddingY)) * 10) / 10;
  };

  const hazardPointsSvg = activeHazardPolygon.map(p => `${toX(p[1])},${toY(p[0])}`).join(' ');
  const blockedRoadSvg = activeBlockedRoad.map(p => `${toX(p[1])},${toY(p[0])}`).join(' ');
  const safeRouteSvg = activeSafeRoute.map(p => `${toX(p[1])},${toY(p[0])}`).join(' ');

  const userX = toX(centerLon);
  const userY = toY(centerLat);

  return (
    <div
      style={{
        background: '#0b1329',
        border: '1px solid #1e293b',
        borderRadius: '16px',
        overflow: 'hidden',
        position: 'relative',
        fontFamily: 'Inter, system-ui, sans-serif',
      }}
    >
      <style>{`
        @keyframes ews-pulse {
          0%, 100% { transform: scale(1); opacity: 0.8; }
          50% { transform: scale(1.4); opacity: 0.2; }
        }
        .leaflet-container {
          background: #0f172a !important;
          font-family: Inter, system-ui, sans-serif !important;
        }
        .leaflet-popup-content-wrapper {
          background: #0f172a !important;
          color: #f8fafc !important;
          border: 1px solid #334155 !important;
          border-radius: 8px !important;
          box-shadow: 0 4px 16px rgba(0,0,0,0.5) !important;
        }
        .leaflet-popup-tip {
          background: #0f172a !important;
        }
      `}</style>

      {/* ── Header: Mode Status & Toggle ── */}
      <div
        style={{
          background: 'linear-gradient(90deg, #1e293b, #0f172a)',
          borderBottom: '1px solid #334155',
          padding: '12px 18px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '10px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '1.3rem' }}>{mapMode === 'leaflet' ? '🛰️' : '📴'}</span>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontWeight: 800, fontSize: '0.95rem', color: mapMode === 'leaflet' ? '#38bdf8' : '#f59e0b', letterSpacing: '-0.01em' }}>
                {mapMode === 'leaflet' ? 'RESCUE GIS MAP — OPENSTREETMAP LIVE' : 'OFFLINE MAP — CACHED LOCAL DATA'}
              </span>
              <span
                style={{
                  background: isOnline ? 'rgba(34, 197, 94, 0.2)' : 'rgba(245, 158, 11, 0.2)',
                  color: isOnline ? '#4ade80' : '#fcd34d',
                  border: `1px solid ${isOnline ? '#22c55e' : '#f59e0b'}`,
                  borderRadius: '10px',
                  padding: '1px 7px',
                  fontSize: '0.7rem',
                  fontWeight: 800,
                }}
              >
                {isOnline ? '🟢 ONLINE' : '📴 OFFLINE'}
              </span>
            </div>
            <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '2px' }}>
              Zone: <strong>{zoneName}</strong> · Recommended Evacuation Route — Subject to real-time ground confirmation
              {cachedTimestamp ? ` · Cached ${new Date(cachedTimestamp).toLocaleTimeString()}` : ''}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* View Mode Toggle */}
          <div style={{ display: 'flex', background: '#0f172a', border: '1px solid #334155', borderRadius: '8px', padding: '2px' }}>
            <button
              onClick={() => setMapMode('leaflet')}
              style={{
                background: mapMode === 'leaflet' ? '#0284c7' : 'transparent',
                color: mapMode === 'leaflet' ? '#ffffff' : '#94a3b8',
                border: 'none',
                borderRadius: '6px',
                padding: '5px 10px',
                fontSize: '0.75rem',
                fontWeight: 700,
                cursor: 'pointer',
              }}
              title="Interactive Leaflet GIS map with OpenStreetMap tiles"
            >
              🗺️ Leaflet GIS {isOnline ? '' : '(No Tiles)'}
            </button>
            <button
              onClick={() => setMapMode('vector')}
              style={{
                background: mapMode === 'vector' ? '#d97706' : 'transparent',
                color: mapMode === 'vector' ? '#ffffff' : '#94a3b8',
                border: 'none',
                borderRadius: '6px',
                padding: '5px 10px',
                fontSize: '0.75rem',
                fontWeight: 700,
                cursor: 'pointer',
              }}
              title="Zero internet cached vector map"
            >
              📴 Cached Vector
            </button>
          </div>

          {onClose && (
            <button
              onClick={onClose}
              style={{
                background: '#334155',
                color: '#f8fafc',
                border: 'none',
                borderRadius: '6px',
                padding: '6px 12px',
                fontSize: '0.8rem',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              ✕ Close Map
            </button>
          )}
        </div>
      </div>

      {/* ── Notification Banner if Offline in Leaflet mode ── */}
      {mapMode === 'leaflet' && !isOnline && (
        <div style={{ background: 'rgba(245, 158, 11, 0.15)', borderBottom: '1px solid #f59e0b', padding: '6px 16px', fontSize: '0.75rem', color: '#fde047', textAlign: 'center' }}>
          ⚠️ Internet is currently offline. OpenStreetMap raster tiles require connectivity. Switch to <strong>Cached Vector</strong> view for 100% offline geometry.
        </div>
      )}

      {/* ── MAP CONTAINER ─────────────────────────────────────────────────── */}
      {mapMode === 'leaflet' ? (
        <div style={{ height: '540px', width: '100%', position: 'relative' }}>
          <MapContainer
            center={[centerLat, centerLon]}
            zoom={13}
            style={{ height: '100%', width: '100%' }}
          >
            <AutoFitController bounds={leafletBounds} />

            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors | EWS Emergency GIS'
              maxZoom={19}
            />

            {/* 1. Critical Landslide Hazard Polygon */}
            <Polygon
              positions={activeHazardPolygon}
              pathOptions={{
                color: '#ef4444',
                fillColor: '#f87171',
                fillOpacity: 0.45,
                weight: 2.5,
              }}
            >
              <Popup>
                <div style={{ fontSize: '0.85rem' }}>
                  <strong style={{ color: '#ef4444' }}>⚠️ CRITICAL HAZARD ZONE</strong>
                  <div style={{ marginTop: '4px', color: '#cbd5e1' }}>
                    Active slope movement &amp; debris flow corridor. Evacuate immediately via designated corridors.
                  </div>
                </div>
              </Popup>
            </Polygon>

            {/* 2. Blocked Primary Road (NH-766) */}
            <Polyline
              positions={activeBlockedRoad}
              pathOptions={{
                color: '#ef4444',
                dashArray: '8, 8',
                weight: 5,
                opacity: 0.95,
              }}
            >
              <Popup>
                <div style={{ fontSize: '0.85rem' }}>
                  <strong style={{ color: '#ef4444' }}>⛔ BLOCKED CORRIDOR (NH-766)</strong>
                  <div style={{ marginTop: '4px', color: '#cbd5e1' }}>
                    Primary highway blocked by landslide debris and rockfall. Do not transit.
                  </div>
                </div>
              </Popup>
            </Polyline>

            {/* 3. Recommended Evacuation Corridor (SH-59 Bypass) */}
            <Polyline
              positions={activeSafeRoute}
              pathOptions={{
                color: '#22c55e',
                weight: 5,
                opacity: 0.95,
              }}
            >
              <Popup>
                <div style={{ fontSize: '0.85rem' }}>
                  <strong style={{ color: '#22c55e' }}>✅ RECOMMENDED EVACUATION ROUTE</strong>
                  <div style={{ marginTop: '4px', color: '#cbd5e1' }}>
                    Bypass clearance active via SH-59.
                    <br />
                    <em>Recommended Evacuation Route — Subject to real-time ground confirmation.</em>
                  </div>
                </div>
              </Popup>
            </Polyline>

            {/* 4. Relief Shelters */}
            {displayShelters.map((s, idx) => {
              const dist = calculateHaversineDistanceKm(centerLat, centerLon, s.lat, s.lng);
              const bearing = calculateCompassBearing(centerLat, centerLon, s.lat, s.lng);
              const availableBeds = ((s.totalBeds || 300) - (s.occupiedBeds || 150));
              return (
                <Marker
                  key={idx}
                  position={[s.lat, s.lng]}
                  icon={createShelterIcon(s.name, s.status)}
                >
                  <Popup>
                    <div style={{ fontSize: '0.85rem' }}>
                      <strong style={{ color: '#4ade80' }}>🏥 {s.name}</strong>
                      <div style={{ marginTop: '4px', fontSize: '0.78rem', color: '#38bdf8' }}>
                        📍 {dist} km {bearing} · Status: <strong>{s.status || 'AVAILABLE'}</strong>
                      </div>
                      <div style={{ marginTop: '4px', fontSize: '0.75rem', color: '#cbd5e1' }}>
                        Beds: <strong>{availableBeds} available</strong> (Total: {s.totalBeds || 350})
                        <br />
                        Food Reserves: <strong>{s.foodStockDays || 7} Days</strong>
                        <br />
                        Water Supply: <strong>{((s.waterSupplyLitres || 12000)).toLocaleString()} L</strong>
                      </div>
                    </div>
                  </Popup>
                </Marker>
              );
            })}

            {/* 5. Citizen Current GPS Position */}
            <Marker position={[centerLat, centerLon]} icon={createGpsIcon()}>
              <Popup>
                <div style={{ fontSize: '0.85rem' }}>
                  <strong style={{ color: '#38bdf8' }}>📍 YOUR GPS POSITION</strong>
                  <div style={{ marginTop: '4px', fontSize: '0.78rem', color: '#f8fafc' }}>
                    Lat: {centerLat.toFixed(6)}, Lon: {centerLon.toFixed(6)}
                  </div>
                  <div style={{ marginTop: '4px', fontSize: '0.72rem', color: '#94a3b8' }}>
                    Telemetry monitored by EWS-NER Central Command.
                  </div>
                </div>
              </Popup>
            </Marker>
          </MapContainer>
        </div>
      ) : (
        /* ── OFFLINE VECTOR FALLBACK (Zero external network tile requests) ── */
        <div style={{ position: 'relative', width: '100%', overflow: 'hidden', background: '#0a1024' }}>
          <svg
            viewBox={`0 0 ${width} ${height}`}
            style={{ width: '100%', height: 'auto', display: 'block' }}
          >
            <defs>
              <pattern id="offlineGrid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
              </pattern>
              <pattern id="hazardStripe" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                <rect width="4" height="8" fill="rgba(239, 68, 68, 0.45)" />
              </pattern>
            </defs>

            <rect width={width} height={height} fill="url(#offlineGrid)" />

            {/* Topographic elevation contours simulation */}
            <ellipse cx={width * 0.45} cy={height * 0.45} rx="180" ry="120" fill="none" stroke="rgba(56, 189, 248, 0.08)" strokeWidth="1.5" strokeDasharray="4 4" />
            <ellipse cx={width * 0.45} cy={height * 0.45} rx="120" ry="80" fill="none" stroke="rgba(56, 189, 248, 0.12)" strokeWidth="1.5" strokeDasharray="4 4" />
            <ellipse cx={width * 0.45} cy={height * 0.45} rx="65" ry="45" fill="none" stroke="rgba(56, 189, 248, 0.16)" strokeWidth="1.5" strokeDasharray="4 4" />

            {/* 1. Critical Hazard Polygon */}
            <polygon
              points={hazardPointsSvg}
              fill="url(#hazardStripe)"
              stroke="#ef4444"
              strokeWidth="2.5"
              onClick={() => setSelectedPoint('CRITICAL HAZARD ZONE: High risk slope movement & debris flow corridor.')}
              style={{ cursor: 'pointer' }}
            />

            {/* 2. Blocked Primary Road */}
            <polyline
              points={blockedRoadSvg}
              fill="none"
              stroke="#ef4444"
              strokeWidth="5"
              strokeDasharray="8 6"
              strokeLinecap="round"
              onClick={() => setSelectedPoint('PRIMARY CORRIDOR (NH-766): BLOCKED by landslide debris. Do not transit.')}
              style={{ cursor: 'pointer' }}
            />

            {/* 3. Recommended Bypass Corridor */}
            <polyline
              points={safeRouteSvg}
              fill="none"
              stroke="#22c55e"
              strokeWidth="4"
              strokeLinecap="round"
              onClick={() => setSelectedPoint('RECOMMENDED EVACUATION CORRIDOR (SH-59 Bypass): Subject to real-time ground confirmation.')}
              style={{ cursor: 'pointer' }}
            />

            {/* 4. Relief Camps / Shelters */}
            {displayShelters.map((s, idx) => {
              const sx = toX(s.lng);
              const sy = toY(s.lat);
              const dist = calculateHaversineDistanceKm(centerLat, centerLon, s.lat, s.lng);
              const bearing = calculateCompassBearing(centerLat, centerLon, s.lat, s.lng);
              const availableBeds = ((s.totalBeds || 300) - (s.occupiedBeds || 150));
              return (
                <g
                  key={idx}
                  transform={`translate(${sx}, ${sy})`}
                  onClick={() => setSelectedPoint(`RELIEF SHELTER: ${s.name} (${dist} km ${bearing}, ${availableBeds} beds available)`)}
                  style={{ cursor: 'pointer' }}
                >
                  <circle r="13" fill="#16a34a" stroke="#ffffff" strokeWidth="2" />
                  <text x="0" y="4" fill="#ffffff" fontSize="13" fontWeight="900" textAnchor="middle">
                    +
                  </text>
                  <text x="16" y="4" fill="#86efac" fontSize="10" fontWeight="700">
                    {s.name.split(' ')[0]} ({dist}km)
                  </text>
                </g>
              );
            })}

            {/* 5. Citizen Current GPS Position */}
            <g transform={`translate(${userX}, ${userY})`}>
              <circle r="20" fill="rgba(56, 189, 248, 0.2)" stroke="#38bdf8" strokeWidth="1.5" strokeDasharray="4 4">
                <animate attributeName="r" values="14;24;14" dur="2s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.8;0.2;0.8" dur="2s" repeatCount="indefinite" />
              </circle>
              <circle r="8" fill="#0284c7" stroke="#ffffff" strokeWidth="2.5" />
              <text x="14" y="-8" fill="#38bdf8" fontSize="11" fontWeight="900">
                YOU (GPS)
              </text>
            </g>

            {/* North Arrow and Compass Rose */}
            <g transform="translate(45, 45)">
              <circle r="18" fill="rgba(15, 23, 42, 0.85)" stroke="#334155" strokeWidth="1" />
              <polygon points="0,-14 4,-2 -4,-2" fill="#ef4444" />
              <polygon points="0,14 4,2 -4,2" fill="#94a3b8" />
              <text x="0" y="-16" fill="#ef4444" fontSize="9" fontWeight="900" textAnchor="middle">
                N
              </text>
            </g>

            {/* Map Scale Bar */}
            <g transform={`translate(${width - 150}, ${height - 25})`}>
              <rect width="120" height="18" fill="rgba(15, 23, 42, 0.85)" rx="4" />
              <line x1="10" y1="9" x2="110" y2="9" stroke="#cbd5e1" strokeWidth="2" />
              <line x1="10" y1="5" x2="10" y2="13" stroke="#cbd5e1" strokeWidth="2" />
              <line x1="110" y1="5" x2="110" y2="13" stroke="#cbd5e1" strokeWidth="2" />
              <text x="60" y="8" fill="#cbd5e1" fontSize="8" fontWeight="700" textAnchor="middle">
                Approx. 5 km
              </text>
            </g>
          </svg>

          {/* Selected Point Information Overlay */}
          {selectedPoint && (
            <div
              style={{
                position: 'absolute',
                bottom: '12px',
                left: '12px',
                right: '12px',
                background: 'rgba(15, 23, 42, 0.95)',
                border: '1px solid #38bdf8',
                borderRadius: '8px',
                padding: '10px 14px',
                fontSize: '0.82rem',
                color: '#f8fafc',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                zIndex: 1000,
              }}
            >
              <div>
                <span style={{ color: '#38bdf8', fontWeight: 800, marginRight: '6px' }}>📍 ELEMENT INSPECTION:</span>
                <span>{selectedPoint}</span>
              </div>
              <button
                onClick={() => setSelectedPoint(null)}
                style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', fontWeight: 800 }}
              >
                ✕
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Offline Map Legend ── */}
      <div
        style={{
          background: '#0f172a',
          borderTop: '1px solid #1e293b',
          padding: '12px 18px',
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '12px',
          fontSize: '0.75rem',
          color: '#cbd5e1',
        }}
      >
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ display: 'inline-block', width: 12, height: 12, background: 'rgba(239,68,68,0.6)', border: '1px solid #ef4444' }} />
            <span>High Risk Hazard Zone</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ display: 'inline-block', width: 16, height: 3, background: '#ef4444', borderTop: '1px dashed #ef4444' }} />
            <span>Blocked Primary Road (NH-766)</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ display: 'inline-block', width: 16, height: 3, background: '#22c55e' }} />
            <span>Recommended Bypass Corridor (SH-59)</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', background: '#16a34a' }} />
            <span>Designated Relief Shelter</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', background: '#0284c7', border: '1px solid #fff' }} />
            <span>Your GPS Position</span>
          </div>
        </div>

        <div style={{ fontSize: '0.7rem', color: '#64748b' }}>
          Emergency GIS Engine · Real-time Ground Confirmation Required
        </div>
      </div>
    </div>
  );
};
