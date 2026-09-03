import React from 'react';
import { MapContainer, TileLayer, Circle, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { RegionRisk, Severity } from '../../types';
import { RiskMarker } from './RiskMarker';

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
        map.flyTo([region.centroidLat, region.centroidLng], 11);
      }
    }
  }, [selectedRegionId, regions, map]);
  return null;
};

export const RiskHeatmap: React.FC<Props> = ({ regions, selectedRegionId, onRegionSelect, severityFilter }) => {
  const getRadius = (sev: Severity) => {
    switch (sev) {
      case 'LOW': return 3000;
      case 'MODERATE': return 5000;
      case 'HIGH': return 8000;
      case 'CRITICAL': return 12000;
      default: return 3000;
    }
  };

  const getColor = (sev: Severity) => {
    switch (sev) {
      case 'LOW': return '#4A7C59';
      case 'MODERATE': return '#C4873A';
      case 'HIGH': return '#B84A39';
      case 'CRITICAL': return '#8B2315';
      default: return '#4A7C59';
    }
  };

  return (
    <MapContainer center={[25.5, 92.0]} zoom={7} style={{ height: '100%', width: '100%' }}>
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors | SIH 2026 EWS'
        maxZoom={19}
      />
      <FlyToMap selectedRegionId={selectedRegionId} regions={regions} />
      {regions.map(r => {
        const showPolygon = severityFilter === 'ALL' || r.severity === severityFilter;
        return (
          <React.Fragment key={r.regionId}>
            {showPolygon && (
              <Circle
                center={[r.centroidLat, r.centroidLng]}
                radius={getRadius(r.severity)}
                pathOptions={{
                  fillColor: getColor(r.severity),
                  fillOpacity: 0.5,
                  color: selectedRegionId === r.regionId ? '#fff' : 'transparent',
                  weight: selectedRegionId === r.regionId ? 2 : 0
                }}
                eventHandlers={{ click: () => onRegionSelect(r.regionId) }}
              />
            )}
            <RiskMarker region={r} onClick={onRegionSelect} />
          </React.Fragment>
        );
      })}
    </MapContainer>
  );
};
