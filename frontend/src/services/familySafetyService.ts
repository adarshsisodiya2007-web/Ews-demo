/**
 * SATARK Family Safety Service
 * Manages family members, real live GPS location, risk assessment, demo scenarios, and persistence.
 * SIH 2026 EWS-NER
 */

import { CITY_AREA_OPTIONS } from './citizenLocationService';

export type RelationshipType =
  | 'Mother'
  | 'Father'
  | 'Brother'
  | 'Sister'
  | 'Grandparent'
  | 'Son'
  | 'Daughter'
  | 'Spouse'
  | 'Friend'
  | 'Other';

export type FamilyRiskLevel = 'SAFE' | 'MODERATE' | 'HIGH' | 'CRITICAL';

export interface FamilyMember {
  id: string;
  name: string;
  relationship: RelationshipType;
  city: string;
  area?: string;
  lat?: number;
  lng?: number;
  isLiveLocation?: boolean;
  locationUpdatedAt?: number;
  phone?: string;
  avatar?: string;
  createdAt: number;
}

export interface FamilyMemberSafetyStatus {
  member: FamilyMember;
  status: FamilyRiskLevel;
  score: number; // 0 - 100
  badgeText: string;
  alertNote?: string;
  affectedArea?: string;
  requiredAction?: string;
  locationAgeText: string;
}

export interface FamilySafetyOverview {
  overallScore: number; // 0 - 100
  statusLevel: 'Safe' | 'Mostly Safe' | 'At Risk' | 'Critical Alert';
  statusBadge: string;
  message: string;
  atRiskCount: number;
  criticalMember?: FamilyMemberSafetyStatus;
  memberStatuses: FamilyMemberSafetyStatus[];
}

export type FamilyDemoScenario = 'SCENARIO_A_ALL_SAFE' | 'SCENARIO_B_ONE_RISK' | 'SCENARIO_C_CRITICAL';

const STORAGE_KEY = 'satark_family_members_v1';
const DEMO_SCENARIO_KEY = 'satark_family_demo_scenario';

// Default initial family members matching Screenshot 2
const DEFAULT_MEMBERS: FamilyMember[] = [
  {
    id: 'fam_1',
    name: 'Mom',
    relationship: 'Mother',
    city: 'Jabalpur',
    lat: 23.1815,
    lng: 79.9864,
    isLiveLocation: false,
    locationUpdatedAt: Date.now() - 3600000,
    avatar: '👩',
    phone: '+91 98261 44521',
    createdAt: Date.now() - 300000
  },
  {
    id: 'fam_2',
    name: 'Dad',
    relationship: 'Father',
    city: 'Jabalpur',
    lat: 23.1815,
    lng: 79.9864,
    isLiveLocation: false,
    locationUpdatedAt: Date.now() - 7200000,
    avatar: '👨',
    phone: '+91 98261 44522',
    createdAt: Date.now() - 200000
  },
  {
    id: 'fam_3',
    name: 'Brother',
    relationship: 'Brother',
    city: 'Meppadi',
    lat: 11.5513,
    lng: 76.1264,
    isLiveLocation: false,
    locationUpdatedAt: Date.now() - 1800000,
    avatar: '👦',
    phone: '+91 98261 44523',
    createdAt: Date.now() - 100000
  }
];

// Helper to determine avatar from relationship
export function getAvatarForRelationship(rel: RelationshipType): string {
  switch (rel) {
    case 'Mother':
      return '👩';
    case 'Father':
      return '👨';
    case 'Brother':
      return '👦';
    case 'Sister':
      return '👧';
    case 'Grandparent':
      return '👵';
    case 'Son':
      return '👦';
    case 'Daughter':
      return '👧';
    case 'Spouse':
      return '💍';
    case 'Friend':
      return '🧑';
    default:
      return '👤';
  }
}

// ── Location Age & Status Formatting ─────────────────────────────────────────
export function formatLocationAge(timestamp?: number, isDemo?: boolean, isLive?: boolean): string {
  if (isDemo) return 'DEMO LOCATION';
  if (!timestamp) return 'Location unavailable';
  const diffSec = Math.floor((Date.now() - timestamp) / 1000);
  if (diffSec < 60) return isLive ? 'Live · just now' : 'Last updated: just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `Last updated: ${diffMin} min ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `Last updated: ${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `Last updated: ${diffDays}d ago`;
}

// ── Reverse Geocoding Helper ────────────────────────────────────────────────
export async function reverseGeocodeCoords(lat: number, lng: number): Promise<{ city: string; area?: string }> {
  try {
    // Fast regional distance match first against known cities
    const knownCities = [
      { name: 'Guwahati', state: 'Assam', lat: 26.1445, lng: 91.7362 },
      { name: 'Shillong', state: 'Meghalaya', lat: 25.5788, lng: 91.8933 },
      { name: 'Aizawl', state: 'Mizoram', lat: 23.7271, lng: 92.7176 },
      { name: 'Imphal', state: 'Manipur', lat: 24.8170, lng: 93.9368 },
      { name: 'Agartala', state: 'Tripura', lat: 23.8315, lng: 91.2868 },
      { name: 'Meppadi', state: 'Kerala', lat: 11.5513, lng: 76.1264 },
      { name: 'Jabalpur', state: 'Madhya Pradesh', lat: 23.1815, lng: 79.9864 },
      { name: 'Kamrup', state: 'Assam', lat: 26.2000, lng: 91.6000 },
      { name: 'Dibrugarh', state: 'Assam', lat: 27.4728, lng: 94.9120 }
    ];

    for (const kc of knownCities) {
      const dLat = Math.abs(lat - kc.lat);
      const dLng = Math.abs(lng - kc.lng);
      if (dLat < 0.25 && dLng < 0.25) {
        return { city: kc.name, area: kc.state };
      }
    }

    // Try online reverse geocoding with 2-second timeout
    if (typeof fetch !== 'undefined') {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);
      const resp = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=12`,
        { signal: controller.signal, headers: { 'Accept': 'application/json' } }
      );
      clearTimeout(timeoutId);

      if (resp.ok) {
        const data = await resp.json();
        const city = data.address?.city || data.address?.town || data.address?.county || data.address?.state_district;
        const area = data.address?.suburb || data.address?.neighbourhood || data.address?.state;
        if (city) {
          return { city, area };
        }
      }
    }
  } catch (e) {
    // Silently continue to fallback
  }

  return { city: `${lat.toFixed(4)}°N, ${lng.toFixed(4)}°E`, area: 'GPS Fix' };
}

// ── Persistence ─────────────────────────────────────────────────────────────
export function getFamilyMembers(): FamilyMember[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_MEMBERS));
      return DEFAULT_MEMBERS;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
    return DEFAULT_MEMBERS;
  } catch (e) {
    return DEFAULT_MEMBERS;
  }
}

export function saveFamilyMembers(members: FamilyMember[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(members));
    window.dispatchEvent(new CustomEvent('satark-family-updated', { detail: members }));
  } catch (e) {
    console.error('Failed to save family members', e);
  }
}

export function addFamilyMember(member: Omit<FamilyMember, 'id' | 'createdAt'>): FamilyMember {
  const members = getFamilyMembers();
  const newMember: FamilyMember = {
    ...member,
    id: `fam_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    avatar: member.avatar || getAvatarForRelationship(member.relationship),
    locationUpdatedAt: member.locationUpdatedAt || Date.now(),
    createdAt: Date.now()
  };
  members.push(newMember);
  saveFamilyMembers(members);
  return newMember;
}

export function updateFamilyMember(id: string, updates: Partial<FamilyMember>): FamilyMember | null {
  const members = getFamilyMembers();
  const idx = members.findIndex(m => m.id === id);
  if (idx === -1) return null;
  members[idx] = {
    ...members[idx],
    ...updates,
    locationUpdatedAt: updates.city !== undefined || updates.lat !== undefined ? Date.now() : members[idx].locationUpdatedAt
  };
  saveFamilyMembers(members);
  return members[idx];
}

export function deleteFamilyMember(id: string): boolean {
  const members = getFamilyMembers();
  const filtered = members.filter(m => m.id !== id);
  if (filtered.length !== members.length) {
    saveFamilyMembers(filtered);
    return true;
  }
  return false;
}

// ── Demo Scenario Controls ──────────────────────────────────────────────────
export function getFamilyDemoScenario(): FamilyDemoScenario {
  try {
    const saved = localStorage.getItem(DEMO_SCENARIO_KEY);
    if (saved === 'SCENARIO_A_ALL_SAFE' || saved === 'SCENARIO_B_ONE_RISK' || saved === 'SCENARIO_C_CRITICAL') {
      return saved as FamilyDemoScenario;
    }
  } catch (e) {
    // fallback
  }
  return 'SCENARIO_B_ONE_RISK'; // Default as shown in Screenshot 2
}

export function setFamilyDemoScenario(scenario: FamilyDemoScenario): void {
  try {
    localStorage.setItem(DEMO_SCENARIO_KEY, scenario);
    window.dispatchEvent(new CustomEvent('satark-family-scenario-change', { detail: scenario }));
  } catch (e) {
    console.error('Failed to save family demo scenario', e);
  }
}

// ── Location & Status Computation ───────────────────────────────────────────
export function computeMemberSafety(
  member: FamilyMember,
  activeScenario: FamilyDemoScenario
): FamilyMemberSafetyStatus {
  const cityLower = (member.city || '').toLowerCase().trim();
  const isDemo = !member.isLiveLocation;
  const ageText = formatLocationAge(member.locationUpdatedAt, isDemo, member.isLiveLocation);

  // Scenario C: Critical Member (e.g. Brother in Critical Area)
  if (activeScenario === 'SCENARIO_C_CRITICAL') {
    if (member.relationship === 'Brother' || cityLower.includes('shillong') || cityLower.includes('cherra') || cityLower.includes('dispur')) {
      return {
        member,
        status: 'CRITICAL',
        score: 22,
        badgeText: 'Critical',
        alertNote: `${member.name} is currently in a CRITICAL disaster warning area.`,
        affectedArea: member.area || 'Shillong Bypass, Meghalaya',
        requiredAction: 'Immediate evacuation / contact the person / follow local authority instructions.',
        locationAgeText: ageText
      };
    }
  }

  // Scenario B: One Member at Moderate Risk (Brother in Meppadi as in Screenshot 2)
  if (activeScenario === 'SCENARIO_B_ONE_RISK') {
    if (member.relationship === 'Brother' || cityLower.includes('meppadi') || cityLower.includes('wayanad')) {
      return {
        member,
        status: 'MODERATE',
        score: 48,
        badgeText: 'Moderate Risk',
        alertNote: `${member.name}'s location is currently under Moderate Flood Risk.`,
        affectedArea: 'Meppadi, Wayanad (Western Ghats)',
        requiredAction: 'Advise staying indoors and avoiding riverbank footpaths.',
        locationAgeText: ageText
      };
    }
  }

  // Scenario A: Everyone Safe
  if (activeScenario === 'SCENARIO_A_ALL_SAFE') {
    return {
      member,
      status: 'SAFE',
      score: member.relationship === 'Mother' ? 94 : member.relationship === 'Father' ? 91 : 95,
      badgeText: 'Safe',
      alertNote: undefined,
      locationAgeText: ageText
    };
  }

  // Dynamic evaluation based on SATARK predefined locations or custom coordinates
  const matchedCity = CITY_AREA_OPTIONS.find(c => 
    c.name.toLowerCase() === cityLower || 
    c.id.toLowerCase() === cityLower ||
    c.displayName.toLowerCase().includes(cityLower)
  );

  if (matchedCity) {
    const risk = matchedCity.demoRisk;
    if (risk.level === 'RED' || risk.severity === 'CRITICAL' || risk.severity === 'HIGH') {
      return {
        member,
        status: risk.severity === 'CRITICAL' ? 'CRITICAL' : 'HIGH',
        score: Math.round(risk.score * 100),
        badgeText: risk.severity === 'CRITICAL' ? 'Critical' : 'High Risk',
        alertNote: `${member.name}'s location is under ${risk.severity} Alert.`,
        affectedArea: `${matchedCity.displayName} Slopes`,
        requiredAction: risk.action_protocol,
        locationAgeText: ageText
      };
    } else if (risk.level === 'AMBER' || risk.severity === 'MODERATE') {
      return {
        member,
        status: 'MODERATE',
        score: Math.round(risk.score * 100),
        badgeText: 'Moderate Risk',
        alertNote: `${member.name}'s location is under Moderate Advisory.`,
        affectedArea: matchedCity.displayName,
        requiredAction: risk.action_protocol,
        locationAgeText: ageText
      };
    } else {
      return {
        member,
        status: 'SAFE',
        score: Math.round((1 - risk.score) * 100),
        badgeText: 'Safe',
        alertNote: undefined,
        locationAgeText: ageText
      };
    }
  }

  // Fallback heuristic for other areas
  if (cityLower.includes('shillong') || cityLower.includes('aizawl') || cityLower.includes('cherrapunjee')) {
    return {
      member,
      status: 'HIGH',
      score: 35,
      badgeText: 'High Risk',
      alertNote: `${member.name}'s location is under High Slope Saturation Advisory.`,
      affectedArea: `${member.city} Hillside Slopes`,
      requiredAction: 'Monitor emergency shelter broadcast.',
      locationAgeText: ageText
    };
  } else if (cityLower.includes('guwahati') || cityLower.includes('meppadi') || cityLower.includes('imphal')) {
    return {
      member,
      status: 'MODERATE',
      score: 48,
      badgeText: 'Moderate Risk',
      alertNote: `${member.name}'s location is currently under Moderate Flood Risk.`,
      affectedArea: member.city,
      locationAgeText: ageText
    };
  }

  // Default: Safe (e.g. Jabalpur, Kamrup, Agartala, Indore, etc.)
  const hash = member.name.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const score = 90 + (hash % 6); // 90 - 95
  return {
    member,
    status: 'SAFE',
    score,
    badgeText: 'Safe',
    alertNote: undefined,
    locationAgeText: ageText
  };
}

export function getFamilySafetyOverview(
  members: FamilyMember[],
  scenario?: FamilyDemoScenario
): FamilySafetyOverview {
  const currentScenario = scenario || getFamilyDemoScenario();
  const statuses = members.map(m => computeMemberSafety(m, currentScenario));

  if (statuses.length === 0) {
    return {
      overallScore: 100,
      statusLevel: 'Safe',
      statusBadge: 'All Safe',
      message: 'Add family members to start monitoring their safety status.',
      atRiskCount: 0,
      memberStatuses: []
    };
  }

  // Calculate average score
  const totalScore = statuses.reduce((acc, s) => acc + s.score, 0);
  const avgScore = Math.round(totalScore / statuses.length);

  // Find critical or at-risk members
  const critical = statuses.find(s => s.status === 'CRITICAL');
  const highRisk = statuses.find(s => s.status === 'HIGH');
  const moderate = statuses.find(s => s.status === 'MODERATE');

  const atRiskCount = statuses.filter(s => s.status !== 'SAFE').length;

  let statusLevel: 'Safe' | 'Mostly Safe' | 'At Risk' | 'Critical Alert' = 'Safe';
  let statusBadge = 'Safe';
  let message = 'Your loved ones are doing well overall. Keep staying alert!';

  if (critical) {
    statusLevel = 'Critical Alert';
    statusBadge = '🚨 Emergency';
    message = critical.alertNote || 'A family member is in a designated critical disaster zone.';
  } else if (highRisk) {
    statusLevel = 'At Risk';
    statusBadge = '⚠️ High Risk';
    message = highRisk.alertNote || 'A family member is in a high-risk landslide sector.';
  } else if (moderate) {
    statusLevel = 'Mostly Safe';
    statusBadge = 'Mostly Safe';
    message = moderate.alertNote || 'Your loved ones are doing well overall. Keep staying alert!';
  } else {
    statusLevel = 'Safe';
    statusBadge = 'All Safe';
    message = 'Everyone is currently safe. Stay prepared and stay connected.';
  }

  return {
    overallScore: avgScore,
    statusLevel,
    statusBadge,
    message,
    atRiskCount,
    criticalMember: critical || highRisk || moderate,
    memberStatuses: statuses
  };
}
