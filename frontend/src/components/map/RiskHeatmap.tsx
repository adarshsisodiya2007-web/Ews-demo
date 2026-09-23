import React, { useState } from 'react';
import { MapContainer, TileLayer, Circle, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { RegionRisk, Severity, HistoricalLandslide } from '../../types';
import { RiskMarker } from './RiskMarker';

// Custom icons using inline SVG data URIs
const createDivIcon = (emoji: string, bg: string, border: string) => {
  return L.divIcon({
    className: 'custom-leaflet-icon',
    html: `<div style="
      background: ${bg};
      border: 2px solid ${border};
      border-radius: 50%;
      width: 28px;
      height: 28px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 14px;
      box-shadow: 0 3px 10px rgba(0,0,0,0.5);
    ">${emoji}</div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14]
  });
};

const hospitalIcon = createDivIcon('🏥', '#0f172a', '#38bdf8');
const shelterIcon = createDivIcon('🏕️', '#0f172a', '#22c55e');
const historicalIcon = createDivIcon('⚠️', '#450a0a', '#ef4444');

export const HISTORICAL_LANDSLIDES: HistoricalLandslide[] = [
  // Kamrup Metropolitan, Assam
  { id: 'h1', regionName: 'Basistha, Guwahati', year: 2022, date: '2022-06-17', lat: 26.087, lng: 91.792, severity: 'MODERATE', casualties: 2, source: 'NEWS/GSI', notes: 'Retaining wall collapse after continuous rain' },
  { id: 'h2', regionName: 'NH-27 Km 12, Assam', year: 2021, date: '2021-07-04', lat: 26.060, lng: 91.830, severity: 'MODERATE', casualties: 0, source: 'NDMA', notes: 'NH-27 embankment slip, road closed 6h' },
  { id: 'h3', regionName: 'NH-27 Jorabat Ghat', year: 2023, date: '2023-08-12', lat: 26.050, lng: 91.880, severity: 'MAJOR', casualties: 4, source: 'GSI', notes: 'Jorabat ghat debris slide, vehicles trapped' },
  { id: 'h4', regionName: 'Nongpoh Road, Assam', year: 2020, date: '2020-06-28', lat: 26.065, lng: 91.840, severity: 'MODERATE', casualties: 1, source: 'NEWS', notes: 'Approach road slip' },
  { id: 'h5', regionName: 'Khanapara Hillside', year: 2024, date: '2024-07-22', lat: 26.105, lng: 91.780, severity: 'MODERATE', casualties: 0, source: 'NEWS', notes: 'Compound wall collapse after 160mm rain' },
  // East Khasi Hills, Meghalaya
  { id: 'h6', regionName: 'Mawsynram Corridor', year: 2022, date: '2022-06-15', lat: 25.297, lng: 91.582, severity: 'CATASTROPHIC', casualties: 7, source: 'GSI', notes: 'Massive debris avalanche, road cut 18 days' },
  { id: 'h7', regionName: 'NH-106, Meghalaya', year: 2021, date: '2021-06-03', lat: 25.350, lng: 91.650, severity: 'MAJOR', casualties: 3, source: 'NDMA', notes: 'NH-106 landslip, 3 casualties, 2km road damaged' },
  { id: 'h8', regionName: 'Cherrapunji Sohra', year: 2023, date: '2023-07-09', lat: 25.270, lng: 91.730, severity: 'MAJOR', casualties: 2, source: 'NEWS', notes: 'Sohra slope failure — extreme 380mm/72h rainfall event' },
  { id: 'h9', regionName: 'Laitumkhrah, Shillong', year: 2024, date: '2024-08-05', lat: 25.572, lng: 91.898, severity: 'MODERATE', casualties: 1, source: 'NEWS', notes: 'Laitumkhrah retaining wall failure' },
  { id: 'h10', regionName: 'Nongthymmai Ridge', year: 2023, date: '2023-06-22', lat: 25.561, lng: 91.905, severity: 'MODERATE', casualties: 2, source: 'NEWS', notes: 'Nongthymmai ridge slope failure' },
  { id: 'h11', regionName: 'NH-6 Shillong-Silchar', year: 2021, date: '2021-08-14', lat: 25.640, lng: 91.930, severity: 'MAJOR', casualties: 1, source: 'NDMA', notes: 'NH-6 cut-slope failure, 18h closure' },
  { id: 'h12', regionName: 'Mawlai Hillside', year: 2024, date: '2024-07-30', lat: 25.602, lng: 91.875, severity: 'MODERATE', casualties: 0, source: 'NEWS', notes: '15 households evacuated' },
  // Aizawl, Mizoram
  { id: 'h13', regionName: 'Chaltlang Ridge, Aizawl', year: 2023, date: '2023-06-30', lat: 23.745, lng: 92.730, severity: 'CATASTROPHIC', casualties: 11, source: 'GSI', notes: 'Chaltlang catastrophic slide — 11 fatalities, 20 houses destroyed' },
  { id: 'h14', regionName: 'Chaltlang Slope Collapse', year: 2021, date: '2021-07-18', lat: 23.740, lng: 92.728, severity: 'MAJOR', casualties: 4, source: 'NDMA', notes: 'Chaltlang slope collapse — 4 dead, 150 displaced' },
  { id: 'h15', regionName: 'NH-306 Road Cut', year: 2024, date: '2024-05-28', lat: 23.770, lng: 92.710, severity: 'MAJOR', casualties: 0, source: 'GSI', notes: 'NH-306 massive road cut failure — classified BLOCKED' },
  { id: 'h16', regionName: 'NH-306 Km 8', year: 2022, date: '2022-07-02', lat: 23.765, lng: 92.715, severity: 'MODERATE', casualties: 0, source: 'NDMA', notes: 'NH-306 Km 8 slip, emergency repairs 4 days' },
  { id: 'h17', regionName: 'Bawngkawn Slope, Aizawl', year: 2024, date: '2024-07-14', lat: 23.755, lng: 92.740, severity: 'MAJOR', casualties: 2, source: 'NEWS', notes: 'Apartment block evacuated' },
  { id: 'h18', regionName: 'Khatla Hillside, Aizawl', year: 2022, date: '2022-06-19', lat: 23.718, lng: 92.712, severity: 'MODERATE', casualties: 1, source: 'NEWS', notes: 'Government quarters slope failure' },
  // Wayanad & Munnar
  { id: 'h19', regionName: 'Chooralmala-Meppadi, Wayanad', year: 2024, date: '2024-07-30', lat: 11.551, lng: 76.126, severity: 'CATASTROPHIC', casualties: 350, source: 'GSI/NDMA', notes: 'Major debris flow triggered by 572mm/48h rainfall' },
  { id: 'h20', regionName: 'Munnar Gap Road, Idukki', year: 2020, date: '2020-08-06', lat: 10.088, lng: 77.059, severity: 'CATASTROPHIC', casualties: 66, source: 'NDMA', notes: 'Pettimudi landslide in tea plantation settlement' },
  { id: 'h21', regionName: 'Guwahati Hills Creep', year: 2025, date: '2025-07-11', lat: 26.144, lng: 91.736, severity: 'MODERATE', casualties: 0, source: 'ASDMA', notes: 'Monitored slope movement after cloudburst' },
  { id: 'h22', regionName: 'Shillong Bypass Embankment', year: 2026, date: '2026-06-19', lat: 25.580, lng: 91.890, severity: 'MAJOR', casualties: 1, source: 'SDMA', notes: 'Embankment wash-out, detour protocol active' }
];

export const CRITICAL_INFRASTRUCTURE = [
  { id: 'inf1', name: 'Guwahati Medical College & Hospital', type: 'HOSPITAL', lat: 26.155, lng: 91.775, capacity: '800 Beds' },
  { id: 'inf2', name: 'Shillong Civil Hospital', type: 'HOSPITAL', lat: 25.570, lng: 91.880, capacity: '400 Beds' },
  { id: 'inf3', name: 'Aizawl Civil Hospital', type: 'HOSPITAL', lat: 23.725, lng: 92.715, capacity: '350 Beds' },
  { id: 'inf4', name: 'Wayanad Mananthavady Hospital', type: 'HOSPITAL', lat: 11.802, lng: 76.003, capacity: '300 Beds' },
  { id: 'inf5', name: 'Meppadi Govt Higher Sec School Shelter', type: 'SHELTER', lat: 11.5512, lng: 76.1280, capacity: '350 Persons' },
  { id: 'inf6', name: 'Shillong Multi-Purpose Emergency Hall', type: 'SHELTER', lat: 25.5790, lng: 91.8940, capacity: '600 Persons' },
  { id: 'inf7', name: 'Aizawl Synod Conference Hall Shelter', type: 'SHELTER', lat: 23.7310, lng: 92.7190, capacity: '450 Persons' },
  { id: 'inf8', name: 'Guwahati Stadium Emergency Relief Complex', type: 'SHELTER', lat: 26.1550, lng: 91.7450, capacity: '1200 Persons' }
];

interface Props {
  regions: RegionRisk[];
  selectedRegionId: string | null;
  onRegionSelect: (regionId: string) => void;
  severityFilter: Severity | 'ALL';
}

const FlyToMap = ({ selectedRegionId, regions }: { selectedRegionId: string | null, regions: RegionRisk[] }) => {
  const map = useMap();
  React.useEffect(() => {
    if (selectedRegionId) {
      const region = regions.find(r => r.regionId === selectedRegionId);
      if (region) {
        map.flyTo([region.centroidLat, region.centroidLng], 11, { duration: 1.2 });
      }
    }
  }, [selectedRegionId, regions, map]);
  return null;
};

export const RiskHeatmap: React.FC<Props> = ({ regions, selectedRegionId, onRegionSelect, severityFilter }) => {
  // Layer toggles
  const [showRiskZones, setShowRiskZones] = useState<boolean>(true);
  const [showHistorical, setShowHistorical] = useState<boolean>(true);
  const [showInfrastructure, setShowInfrastructure] = useState<boolean>(true);
  const [historicalYear, setHistoricalYear] = useState<string>('ALL');

  const getRadius = (sev: Severity) => {
    switch (sev) {
      case 'LOW': return 3500;
      case 'MODERATE': return 6000;
      case 'HIGH': return 9000;
      case 'CRITICAL': return 13000;
      default: return 3500;
    }
  };

  const getColor = (sev: Severity) => {
    switch (sev) {
      case 'LOW': return '#22c55e';
      case 'MODERATE': return '#eab308';
      case 'HIGH': return '#f97316';
      case 'CRITICAL': return '#ef4444';
      default: return '#22c55e';
    }
  };

  const filteredHistorical = HISTORICAL_LANDSLIDES.filter(h => {
    if (historicalYear === 'ALL') return true;
    return h.year.toString() === historicalYear;
  });

  return (
    <div style={{ position: 'relative', height: '100%', width: '100%' }}>
      {/* ── Floating GIS Multi-Layer Control ── */}
      <div style={{
        position: 'absolute',
        top: 14,
        right: 14,
        zIndex: 1000,
        background: 'rgba(15, 23, 42, 0.92)',
        borderRadius: '12px',
        padding: '12px 14px',
        border: '1px solid #334155',
        boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
        backdropFilter: 'blur(8px)',
        color: '#f8fafc',
        fontSize: '0.74rem',
        maxWidth: '260px'
      }}>
        <div style={{ fontWeight: 800, marginBottom: '8px', color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span>🗺️</span> GIS LAYER CONTROLS
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
            <input type="checkbox" checked={showRiskZones} onChange={e => setShowRiskZones(e.target.checked)} />
            <span>Hazard Risk Zones</span>
          </label>

          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
            <input type="checkbox" checked={showHistorical} onChange={e => setShowHistorical(e.target.checked)} />
            <span>Historical Landslides (GSI)</span>
          </label>

          {showHistorical && (
            <div style={{ marginLeft: '20px', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '0.68rem', color: '#94a3b8' }}>Year:</span>
              <select
                value={historicalYear}
                onChange={e => setHistoricalYear(e.target.value)}
                style={{
                  background: '#1e293b',
                  color: '#fff',
                  border: '1px solid #475569',
                  borderRadius: '4px',
                  padding: '2px 6px',
                  fontSize: '0.7rem'
                }}
              >
                <option value="ALL">All (2019-2026)</option>
                <option value="2019">2019</option>
                <option value="2020">2020</option>
                <option value="2021">2021</option>
                <option value="2022">2022</option>
                <option value="2023">2023</option>
                <option value="2024">2024</option>
                <option value="2025">2025</option>
                <option value="2026">2026</option>
              </select>
            </div>
          )}

          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
            <input type="checkbox" checked={showInfrastructure} onChange={e => setShowInfrastructure(e.target.checked)} />
            <span>Critical Facilities &amp; Shelters</span>
          </label>
        </div>
      </div>

      <MapContainer center={[25.5, 92.0]} zoom={7} style={{ height: '100%', width: '100%' }}>
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors | SATARK EWS-NER'
          maxZoom={19}
        />
        <FlyToMap selectedRegionId={selectedRegionId} regions={regions} />

        {/* ── Layer 1: Monitored Regions Risk Circles ── */}
        {showRiskZones && regions.map(r => {
          const showPolygon = severityFilter === 'ALL' || r.severity === severityFilter;
          return (
            <React.Fragment key={r.regionId}>
              {showPolygon && (
                <Circle
                  center={[r.centroidLat, r.centroidLng]}
                  radius={getRadius(r.severity)}
                  pathOptions={{
                    fillColor: getColor(r.severity),
                    fillOpacity: 0.35,
                    color: selectedRegionId === r.regionId ? '#ffffff' : getColor(r.severity),
                    weight: selectedRegionId === r.regionId ? 3 : 1
                  }}
                  eventHandlers={{ click: () => onRegionSelect(r.regionId) }}
                />
              )}
              <RiskMarker region={r} onClick={onRegionSelect} />
            </React.Fragment>
          );
        })}

        {/* ── Layer 2: Historical Landslides (GSI / NDMA) ── */}
        {showHistorical && filteredHistorical.map(h => (
          <Marker
            key={h.id}
            position={[h.lat, h.lng]}
            icon={historicalIcon}
          >
            <Popup>
              <div style={{ padding: '4px', fontSize: '0.78rem', color: '#0f172a' }}>
                <strong style={{ color: '#b91c1c' }}>⚠️ Historical Landslide Event</strong>
                <div style={{ fontWeight: 700, marginTop: '2px' }}>{h.regionName}</div>
                <div>Date: <strong>{h.date}</strong> (Year {h.year})</div>
                <div>Severity: <strong>{h.severity}</strong></div>
                {h.casualties > 0 && <div style={{ color: '#b91c1c' }}>Casualties: <strong>{h.casualties}</strong></div>}
                <div>Source: <em>{h.source}</em></div>
                <div style={{ marginTop: '4px', fontStyle: 'italic', fontSize: '0.72rem' }}>"{h.notes}"</div>
              </div>
            </Popup>
          </Marker>
        ))}

        {/* ── Layer 3: Critical Infrastructure & Shelters ── */}
        {showInfrastructure && CRITICAL_INFRASTRUCTURE.map(inf => (
          <Marker
            key={inf.id}
            position={[inf.lat, inf.lng]}
            icon={inf.type === 'HOSPITAL' ? hospitalIcon : shelterIcon}
          >
            <Popup>
              <div style={{ padding: '4px', fontSize: '0.78rem', color: '#0f172a' }}>
                <strong>{inf.type === 'HOSPITAL' ? '🏥 Hospital' : '🏕️ Designated Relief Shelter'}</strong>
                <div style={{ fontWeight: 700, marginTop: '2px' }}>{inf.name}</div>
                <div>Capacity: <strong>{inf.capacity}</strong></div>
                <div style={{ color: '#16a34a', fontWeight: 600 }}>Emergency Status: OPERATIONAL</div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
};
