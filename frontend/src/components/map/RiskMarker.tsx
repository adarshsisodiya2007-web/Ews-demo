import React from 'react';
import { Marker, Tooltip } from 'react-leaflet';
import L from 'leaflet';
import { RegionRisk } from '../../types';

interface Props {
  region: RegionRisk;
  onClick: (regionId: string) => void;
}

export const RiskMarker: React.FC<Props> = ({ region, onClick }) => {
  const getIconHtml = () => {
    switch (region.severity) {
      case 'LOW': return '<span style="color: #4A7C59; font-size: 14px;">●</span>';
      case 'MODERATE': return '<span style="color: #C4873A; font-size: 16px;">◆</span>';
      case 'HIGH': return '<span style="color: #B84A39; font-size: 18px;">▲</span>';
      case 'CRITICAL': return '<span style="color: #8B2315; font-size: 20px;" class="critical-pulse">✦</span>';
      default: return '●';
    }
  };

  const icon = L.divIcon({
    html: getIconHtml(),
    className: 'custom-div-icon',
    iconSize: [20, 20],
    iconAnchor: [10, 10]
  });

  return (
    <Marker 
      position={[region.centroidLat, region.centroidLng]} 
      icon={icon}
      eventHandlers={{ click: () => onClick(region.regionId) }}
    >
      <Tooltip direction="top" offset={[0, -10]} opacity={1}>
        <div style={{ textAlign: 'center' }}>
          <strong>{region.name}</strong><br/>
          Score: {region.computedScore}
        </div>
      </Tooltip>
    </Marker>
  );
};
