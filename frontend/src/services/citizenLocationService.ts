/**
 * SATARK Citizen Location Service
 * Manages city/area selection, location-specific demo data, and per-citizen persistence.
 * SIH 2026 EWS-NER
 */

import { Severity } from '../types';

export interface CityAreaConfig {
  id: string;
  name: string;
  state: string;
  displayName: string;
  lat: number;
  lon: number;
  slope: number;
  elev: number;
  district: string;
  demoWeather: {
    temp_c: number;
    rain_24h_mm: number;
    rain_72h_mm: number;
    soil_moisture: number; // 0-100%
    condition: string;
    critical_rain_trigger: boolean;
  };
  demoRisk: {
    score: number; // 0-1
    level: 'RED' | 'AMBER' | 'GREEN';
    severity: Severity;
    action_protocol: string;
    description: string;
  };
  demoAlerts: {
    id: string;
    severity: Severity;
    title: string;
    messageEn: string;
    summary: string;
    timeAgo: string;
  }[];
  demoIncidents: {
    id: string;
    category: string;
    description: string;
    status: string;
    timeAgo: string;
  }[];
  evacuationRoute: {
    corridor: string;
    safeRoute: string;
    status: 'OPEN' | 'BLOCKED' | 'AT_RISK';
    estTimeMin: number;
  };
  nearestShelters: {
    name: string;
    distanceKm: number;
    capacity: number;
    contact: string;
  }[];
}

export const CITY_AREA_OPTIONS: CityAreaConfig[] = [
  {
    id: 'guwahati',
    name: 'Guwahati',
    state: 'Assam',
    displayName: 'Guwahati, Assam',
    district: 'Kamrup Metropolitan',
    lat: 26.1445,
    lon: 91.7362,
    slope: 28.0,
    elev: 55.7,
    demoWeather: {
      temp_c: 28,
      rain_24h_mm: 42.5,
      rain_72h_mm: 86.0,
      soil_moisture: 54,
      condition: 'Moderate Rain',
      critical_rain_trigger: false
    },
    demoRisk: {
      score: 0.52,
      level: 'AMBER',
      severity: 'MODERATE',
      action_protocol: 'Advisory alert. Monitor drainage channels and hillside slope cuts.',
      description: 'Moderate susceptibility observed around Kamakhya and Naranarayan hillsides.'
    },
    demoAlerts: [
      {
        id: 'alert-demo-guwahati-1',
        severity: 'MODERATE',
        title: 'Moderate Hillside Watch',
        messageEn: 'Advisory watch along Kamakhya cut-slopes. Avoid hillside parking during active showers.',
        summary: 'Rain: 42.5mm · Soil: 54%',
        timeAgo: '15m ago'
      }
    ],
    demoIncidents: [
      {
        id: 'inc-gwt-1',
        category: 'DRAINAGE_BLOCK',
        description: 'Minor silt accumulation reported near Maligaon feeder corridor.',
        status: 'MONITORING',
        timeAgo: '45m ago'
      }
    ],
    evacuationRoute: {
      corridor: 'GS Road Bypass Corridor',
      safeRoute: 'Dispur – Khanapara Highway Bypass',
      status: 'OPEN',
      estTimeMin: 18
    },
    nearestShelters: [
      { name: 'Guwahati Town Relief Center', distanceKm: 1.8, capacity: 450, contact: '112 / 0361-2738222' },
      { name: 'Dispur Emergency Staging Camp', distanceKm: 3.2, capacity: 600, contact: '1077' }
    ]
  },
  {
    id: 'kamrup',
    name: 'Kamrup',
    state: 'Assam',
    displayName: 'Kamrup, Assam',
    district: 'Kamrup',
    lat: 26.2000,
    lon: 91.6000,
    slope: 18.0,
    elev: 48.0,
    demoWeather: {
      temp_c: 29,
      rain_24h_mm: 18.0,
      rain_72h_mm: 36.0,
      soil_moisture: 35,
      condition: 'Partly Cloudy',
      critical_rain_trigger: false
    },
    demoRisk: {
      score: 0.24,
      level: 'GREEN',
      severity: 'LOW',
      action_protocol: 'Normal conditions. Slopes stable and monitored via telemetry sensors.',
      description: 'Stable soil saturation with normal drainage throughput across Kamrup rural corridors.'
    },
    demoAlerts: [
      {
        id: 'alert-demo-kamrup-1',
        severity: 'LOW',
        title: 'Normal Monitoring Active',
        messageEn: 'Slope parameters stable. Routine regional sensor sweep active.',
        summary: 'Rain: 18mm · Soil: 35%',
        timeAgo: '1h ago'
      }
    ],
    demoIncidents: [
      {
        id: 'inc-kmr-1',
        category: 'ROAD_CLEAR',
        description: 'Brahmaputra bank corridor operating normally.',
        status: 'CLEAR',
        timeAgo: '2h ago'
      }
    ],
    evacuationRoute: {
      corridor: 'NH-27 North Bank Arterial',
      safeRoute: 'Amingaon – Hajo Link Road',
      status: 'OPEN',
      estTimeMin: 12
    },
    nearestShelters: [
      { name: 'Kamrup District Disaster Relief Camp', distanceKm: 2.5, capacity: 500, contact: '112 / 0361-2680234' }
    ]
  },
  {
    id: 'shillong',
    name: 'Shillong',
    state: 'Meghalaya',
    displayName: 'Shillong, Meghalaya',
    district: 'East Khasi Hills',
    lat: 25.5788,
    lon: 91.8933,
    slope: 34.0,
    elev: 1428.3,
    demoWeather: {
      temp_c: 19,
      rain_24h_mm: 165.0,
      rain_72h_mm: 310.0,
      soil_moisture: 82,
      condition: 'Heavy Rain & Mist',
      critical_rain_trigger: true
    },
    demoRisk: {
      score: 0.78,
      level: 'RED',
      severity: 'HIGH',
      action_protocol: 'Pre-warning active. Restrict non-essential transit along Shillong Ridge.',
      description: 'High precipitation triggering saturated upper soil horizons across Shillong Peak slopes.'
    },
    demoAlerts: [
      {
        id: 'alert-demo-shillong-1',
        severity: 'HIGH',
        title: 'High Slope Surcharge Alert',
        messageEn: 'High hazard pre-warning active for Shillong Ridge. Use designated bypass corridors.',
        summary: 'Rain: 165mm · Soil: 82%',
        timeAgo: '10m ago'
      }
    ],
    demoIncidents: [
      {
        id: 'inc-shl-1',
        category: 'SLOPE_MOVEMENT',
        description: 'Tension crack detected near upper ridge bend.',
        status: 'VERIFIED',
        timeAgo: '20m ago'
      }
    ],
    evacuationRoute: {
      corridor: 'Shillong Bypass Expressway',
      safeRoute: 'Umiam Link Bypass Corridor',
      status: 'AT_RISK',
      estTimeMin: 25
    },
    nearestShelters: [
      { name: 'East Khasi Hills District Community Hall', distanceKm: 1.4, capacity: 400, contact: '112 / 0364-2224422' },
      { name: 'Polo Ground Emergency Relief Staging', distanceKm: 2.8, capacity: 750, contact: '1077' }
    ]
  },
  {
    id: 'imphal',
    name: 'Imphal',
    state: 'Manipur',
    displayName: 'Imphal, Manipur',
    district: 'Imphal West',
    lat: 24.8170,
    lon: 93.9368,
    slope: 25.5,
    elev: 786.0,
    demoWeather: {
      temp_c: 24,
      rain_24h_mm: 88.0,
      rain_72h_mm: 162.0,
      soil_moisture: 68,
      condition: 'Thunderstorms',
      critical_rain_trigger: false
    },
    demoRisk: {
      score: 0.58,
      level: 'AMBER',
      severity: 'MODERATE',
      action_protocol: 'Precautionary advisory. Stay alert near river embankments and foothill cuts.',
      description: 'Moderate surface runoff with elevated river stage along Nambul basin cut-slopes.'
    },
    demoAlerts: [
      {
        id: 'alert-demo-imphal-1',
        severity: 'MODERATE',
        title: 'Runoff Advisory Notice',
        messageEn: 'Elevated debris runoff watch in effect across surrounding valley hillsides.',
        summary: 'Rain: 88mm · Soil: 68%',
        timeAgo: '30m ago'
      }
    ],
    demoIncidents: [
      {
        id: 'inc-imp-1',
        category: 'FLOODING',
        description: 'Water ponding on foothill approach road.',
        status: 'DISPATCHED',
        timeAgo: '50m ago'
      }
    ],
    evacuationRoute: {
      corridor: 'Imphal Ring Road Corridor',
      safeRoute: 'Airport Road Valley Bypass',
      status: 'OPEN',
      estTimeMin: 20
    },
    nearestShelters: [
      { name: 'Imphal West Multi-Purpose Shelter', distanceKm: 2.1, capacity: 550, contact: '112 / 0385-2450123' }
    ]
  },
  {
    id: 'aizawl',
    name: 'Aizawl',
    state: 'Mizoram',
    displayName: 'Aizawl, Mizoram',
    district: 'Aizawl',
    lat: 23.7271,
    lon: 92.7176,
    slope: 45.0,
    elev: 1070.3,
    demoWeather: {
      temp_c: 22,
      rain_24h_mm: 230.0,
      rain_72h_mm: 410.0,
      soil_moisture: 91,
      condition: 'Torrential Downpour',
      critical_rain_trigger: true
    },
    demoRisk: {
      score: 0.92,
      level: 'RED',
      severity: 'CRITICAL',
      action_protocol: 'Immediate Evacuation Required. Move to designated community shelters.',
      description: 'Severe slope saturation on steep sandstone ridges with active landslide triggers.'
    },
    demoAlerts: [
      {
        id: 'alert-demo-aizawl-1',
        severity: 'CRITICAL',
        title: 'CRITICAL LANDSLIDE ALARM',
        messageEn: 'IMMEDIATE EVACUATION ADVISED. NH-54 corridor blocked. Emergency shelters open.',
        summary: 'Rain: 230mm · Soil: 91%',
        timeAgo: '5m ago'
      }
    ],
    demoIncidents: [
      {
        id: 'inc-azl-1',
        category: 'BLOCKED_ROAD',
        description: 'Major rockfall on Bawngkawn-Durtlang pass. Highway impassable.',
        status: 'ACKNOWLEDGED',
        timeAgo: '15m ago'
      }
    ],
    evacuationRoute: {
      corridor: 'Khatla Bypass Corridor',
      safeRoute: 'Zemabawk Evacuation Bypass',
      status: 'BLOCKED',
      estTimeMin: 35
    },
    nearestShelters: [
      { name: 'Aizawl Central Community Shelter', distanceKm: 0.9, capacity: 600, contact: '112 / 0389-2322444' },
      { name: 'Dinthar Safety Shelter', distanceKm: 1.5, capacity: 350, contact: '1077' }
    ]
  },
  {
    id: 'agartala',
    name: 'Agartala',
    state: 'Tripura',
    displayName: 'Agartala, Tripura',
    district: 'West Tripura',
    lat: 23.8315,
    lon: 91.2868,
    slope: 14.0,
    elev: 22.0,
    demoWeather: {
      temp_c: 30,
      rain_24h_mm: 22.0,
      rain_72h_mm: 44.0,
      soil_moisture: 40,
      condition: 'Passing Showers',
      critical_rain_trigger: false
    },
    demoRisk: {
      score: 0.28,
      level: 'GREEN',
      severity: 'LOW',
      action_protocol: 'Normal surveillance. Slopes stable and all transit routes clear.',
      description: 'Low slope gradients and standard drainage capacity across Agartala urban belt.'
    },
    demoAlerts: [
      {
        id: 'alert-demo-agartala-1',
        severity: 'LOW',
        title: 'Standard Monitoring',
        messageEn: 'All monitoring stations reporting green. Normal civic transit.',
        summary: 'Rain: 22mm · Soil: 40%',
        timeAgo: '2h ago'
      }
    ],
    demoIncidents: [
      {
        id: 'inc-agt-1',
        category: 'OTHER',
        description: 'Routine municipal drain clearance completed.',
        status: 'RESOLVED',
        timeAgo: '3h ago'
      }
    ],
    evacuationRoute: {
      corridor: 'Airport Bypass Expressway',
      safeRoute: 'Amtali Highway Corridor',
      status: 'OPEN',
      estTimeMin: 10
    },
    nearestShelters: [
      { name: 'West Tripura Emergency Relief Hub', distanceKm: 3.0, capacity: 500, contact: '112 / 0381-2323322' }
    ]
  },
  {
    id: 'other',
    name: 'Other Area',
    state: 'Northeast Region',
    displayName: 'Other Area (Northeast)',
    district: 'NER General',
    lat: 26.1445,
    lon: 91.7362,
    slope: 24.0,
    elev: 120.0,
    demoWeather: {
      temp_c: 26,
      rain_24h_mm: 35.0,
      rain_72h_mm: 70.0,
      soil_moisture: 48,
      condition: 'Scattered Showers',
      critical_rain_trigger: false
    },
    demoRisk: {
      score: 0.35,
      level: 'GREEN',
      severity: 'LOW',
      action_protocol: 'General monitoring active. Maintain standard hillside vigilance.',
      description: 'Regional monitoring baseline for Northeast India terrain corridors.'
    },
    demoAlerts: [
      {
        id: 'alert-demo-other-1',
        severity: 'LOW',
        title: 'Regional Baseline Watch',
        messageEn: 'Standard regional monsoon watch in effect for monitored catchments.',
        summary: 'Rain: 35mm · Soil: 48%',
        timeAgo: '1h ago'
      }
    ],
    demoIncidents: [],
    evacuationRoute: {
      corridor: 'Designated State Highway Corridor',
      safeRoute: 'Primary Arterial Bypass',
      status: 'OPEN',
      estTimeMin: 15
    },
    nearestShelters: [
      { name: 'District Civil Defense Relief Shelter', distanceKm: 2.0, capacity: 400, contact: '112' }
    ]
  }
];

export function getCityConfig(cityId?: string | null): CityAreaConfig {
  if (!cityId) return CITY_AREA_OPTIONS[0];
  const found = CITY_AREA_OPTIONS.find(c => c.id.toLowerCase() === cityId.toLowerCase());
  return found || CITY_AREA_OPTIONS[0];
}

export function getCurrentCitizenIdentifier(): string {
  const user = localStorage.getItem('ews_user') || '';
  const phone = localStorage.getItem('satark_citizen_phone') || '';
  return user || phone || 'citizen';
}

export function getCitizenLocation(userIdOrPhone?: string): string | null {
  const id = userIdOrPhone || getCurrentCitizenIdentifier();
  const direct = localStorage.getItem(`citizenLocation_${id}`);
  if (direct) return direct;
  // Fallbacks
  const user = localStorage.getItem('ews_user');
  if (user && localStorage.getItem(`citizenLocation_${user}`)) {
    return localStorage.getItem(`citizenLocation_${user}`);
  }
  const phone = localStorage.getItem('satark_citizen_phone');
  if (phone && localStorage.getItem(`citizenLocation_${phone}`)) {
    return localStorage.getItem(`citizenLocation_${phone}`);
  }
  return null;
}

export function getCitizenCustomLocation(userIdOrPhone?: string): string | null {
  const id = userIdOrPhone || getCurrentCitizenIdentifier();
  return localStorage.getItem(`citizenCustomLocation_${id}`) || null;
}

export function setCitizenLocation(cityId: string, customName?: string, userIdOrPhone?: string): void {
  const id = userIdOrPhone || getCurrentCitizenIdentifier();
  localStorage.setItem(`citizenLocation_${id}`, cityId);
  const user = localStorage.getItem('ews_user');
  if (user) localStorage.setItem(`citizenLocation_${user}`, cityId);
  const phone = localStorage.getItem('satark_citizen_phone');
  if (phone) localStorage.setItem(`citizenLocation_${phone}`, cityId);

  if (customName && cityId === 'other') {
    localStorage.setItem(`citizenCustomLocation_${id}`, customName);
  }

  // Dispatch event for reactive updates across components
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('satark-location-change', {
      detail: { cityId, customName }
    }));
  }
}

export function hasCitizenCompletedLocation(userIdOrPhone?: string): boolean {
  return !!getCitizenLocation(userIdOrPhone);
}
