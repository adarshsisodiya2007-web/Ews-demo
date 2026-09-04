import React, { useState, useEffect, useRef } from 'react';
import { useGeolocation } from '../../hooks/useGeolocation';
import { useAlertSound } from '../../hooks/useAlertSound';
import { submitReport } from '../../services/api';
import {
  queueReport,
  generateClientReportId,
  generateBeaconId,
  setEmergencyDistressState,
  getEmergencyDistressState,
  EmergencyDistressState,
  getCachedHeatmapWithMeta,
  getCachedShelters,
} from '../../services/offlineStore';
import { calculateHaversineDistanceKm, calculateCompassBearing } from '../../utils/geoUtils';
import { OfflineVectorMap } from '../map/OfflineVectorMap';
import { MOCK_SHELTERS, Shelter } from '../panels/ShelterResourcePanel';
import { CreateReportPayload, RegionRisk } from '../../types';
import { OfflineHowItWorksIllustration } from './OfflineHowItWorksIllustration';

export type RescueSubView =
  | 'main'
  | 'landslide'
  | 'injured_list'
  | 'injured_detail'
  | 'trapped'
  | 'signal_rescuers'
  | 'offline_map'
  | 'rescue_points';

export type InjuryType =
  | 'SERIOUS_BLEEDING'
  | 'SUSPECTED_FRACTURE'
  | 'HEAD_INJURY'
  | 'BREATHING_DIFFICULTY'
  | 'UNCONSCIOUS_CONFUSED';

interface Props {
  defaultLat?: number;
  defaultLng?: number;
  initialView?: RescueSubView;
  onNavigateTab?: (tabId: string) => void;
  theme?: 'light' | 'dark';
}

export const OfflineRescueMode: React.FC<Props> = ({
  defaultLat = 11.5534,
  defaultLng = 76.1320,
  initialView = 'main',
  onNavigateTab,
  theme = 'dark',
}) => {
  const { coords } = useGeolocation();
  const { playCriticalSiren, stopSiren } = useAlertSound();

  const [currentView, setCurrentView] = useState<RescueSubView>(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const v = params.get('view') as RescueSubView;
      if (v && ['main', 'landslide', 'injured_list', 'injured_detail', 'trapped', 'signal_rescuers', 'offline_map', 'rescue_points'].includes(v)) {
        return v;
      }
    } catch {}
    return initialView;
  });
  const [selectedInjury, setSelectedInjury] = useState<InjuryType>('SERIOUS_BLEEDING');
  const [beaconState, setBeaconState] = useState<EmergencyDistressState | null>(null);

  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [cachedTime, setCachedTime] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'alert'; text: string } | null>(null);

  // Proximity to high risk area
  const [nearbyRisk, setNearbyRisk] = useState<{
    name: string;
    level: string;
    distanceKm: number;
    bearing: string;
    isInsideOrNear: boolean;
  } | null>(null);

  // Shelters
  const [sheltersList, setSheltersList] = useState<Shelter[]>(MOCK_SHELTERS);

  // Strobe visual indicator for active beacon
  const strobeInterval = useRef<number | null>(null);
  const [strobeColor, setStrobeColor] = useState<string>('#ef4444');

  const citizenLat = coords?.lat !== undefined && coords?.lat !== null ? coords.lat : defaultLat;
  const citizenLng = coords?.lng !== undefined && coords?.lng !== null ? coords.lng : defaultLng;

  // Listen to network status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Load active beacon state if exists
    const active = getEmergencyDistressState();
    if (active && active.active) {
      setBeaconState(active);
      startStrobe();
      playCriticalSiren();
    }

    loadCachedData();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      stopStrobe();
      stopSiren();
    };
  }, []);

  // Listen to external distress state change
  useEffect(() => {
    const handleDistressChange = (e: any) => {
      setBeaconState(e.detail || null);
    };
    window.addEventListener('ews-distress-state-change', handleDistressChange);
    return () => window.removeEventListener('ews-distress-state-change', handleDistressChange);
  }, []);

  const loadCachedData = async () => {
    try {
      const [hMeta, sMeta] = await Promise.all([
        getCachedHeatmapWithMeta(),
        getCachedShelters(),
      ]);

      if (hMeta?.timestamp) {
        setCachedTime(hMeta.timestamp);
      }

      if (sMeta?.data && Array.isArray(sMeta.data) && sMeta.data.length > 0) {
        // Sanitize every shelter item to ensure valid coordinates and numeric fields
        const sanitized: Shelter[] = sMeta.data.map((item: any) => {
          const fallback = MOCK_SHELTERS.find(m => m.id === item.id || m.name === item.name);
          return {
            ...fallback,
            ...item,
            id: item.id || fallback?.id || `s_${Math.random()}`,
            name: item.name || fallback?.name || 'Emergency Relief Camp',
            zone: item.zone || fallback?.zone || 'Monitored Disaster Zone',
            lat: typeof item.lat === 'number' && !isNaN(item.lat) ? item.lat : (fallback?.lat ?? 11.5512),
            lng: typeof item.lng === 'number' && !isNaN(item.lng) ? item.lng : (fallback?.lng ?? 76.1280),
            totalBeds: typeof item.totalBeds === 'number' && !isNaN(item.totalBeds) ? item.totalBeds : (fallback?.totalBeds ?? 350),
            occupiedBeds: typeof item.occupiedBeds === 'number' && !isNaN(item.occupiedBeds) ? item.occupiedBeds : (fallback?.occupiedBeds ?? 180),
            foodStockDays: typeof item.foodStockDays === 'number' && !isNaN(item.foodStockDays) ? item.foodStockDays : (fallback?.foodStockDays ?? 7),
            waterSupplyLitres: typeof item.waterSupplyLitres === 'number' && !isNaN(item.waterSupplyLitres) ? item.waterSupplyLitres : (fallback?.waterSupplyLitres ?? 12000),
            medicalTeam: item.medicalTeam || fallback?.medicalTeam || 'District Medical Unit',
            status: item.status || fallback?.status || 'AVAILABLE',
          };
        });
        setSheltersList(sanitized);
      } else {
        setSheltersList(MOCK_SHELTERS);
      }

      // Compute nearest risk region
      const regions: RegionRisk[] = hMeta?.data || [];
      let closest: { name: string; level: string; distanceKm: number; bearing: string; isInsideOrNear: boolean } | null = null;

      for (const r of regions) {
        if (r && (r.severity === 'CRITICAL' || r.severity === 'HIGH' || (r.computedScore && r.computedScore >= 0.55))) {
          const dist = calculateHaversineDistanceKm(citizenLat, citizenLng, r.centroidLat, r.centroidLng);
          const brg = calculateCompassBearing(citizenLat, citizenLng, r.centroidLat, r.centroidLng);
          if (!closest || dist < closest.distanceKm) {
            closest = {
              name: r.name,
              level: r.severity,
              distanceKm: dist,
              bearing: brg,
              isInsideOrNear: dist <= 3.0,
            };
          }
        }
      }

      // Default fallback if no regions cached
      if (!closest) {
        closest = {
          name: 'Meppadi Slope Hazard Corridor',
          level: 'HIGH',
          distanceKm: calculateHaversineDistanceKm(citizenLat, citizenLng, 11.5534, 76.1320),
          bearing: calculateCompassBearing(citizenLat, citizenLng, 11.5534, 76.1320),
          isInsideOrNear: true,
        };
      }

      setNearbyRisk(closest);
    } catch {}
  };

  const startStrobe = () => {
    if (strobeInterval.current) clearInterval(strobeInterval.current);
    let tog = false;
    strobeInterval.current = window.setInterval(() => {
      tog = !tog;
      setStrobeColor(tog ? '#f59e0b' : '#ef4444');
    }, 450);
  };

  const stopStrobe = () => {
    if (strobeInterval.current) {
      clearInterval(strobeInterval.current);
      strobeInterval.current = null;
    }
  };

  // ── BEACON LIFECYCLE ──────────────────────────────────────────────────────────

  const handleStartBeacon = async (source = 'Signal Rescuers') => {
    const beaconId = generateBeaconId();
    const clientReportId = generateClientReportId();

    const newBeacon: EmergencyDistressState = {
      beaconId,
      status: 'ACTIVE',
      active: true,
      createdAt: Date.now(),
      activatedAt: Date.now(),
      lat: citizenLat,
      lng: citizenLng,
      medicalUrgent: true,
      emergencyType: source,
      clientReportId,
      syncStatus: isOnline ? 'SYNCHRONIZED' : 'PENDING_SYNC',
      notes: `Activated from ${source}`,
    };

    setBeaconState(newBeacon);
    setEmergencyDistressState(newBeacon);
    startStrobe();
    playCriticalSiren();

    // Queue or submit report
    const payload: CreateReportPayload = {
      geoLat: citizenLat,
      geoLng: citizenLng,
      category: 'TRAPPED_CITIZENS',
      description: `[DISTRESS BEACON ${beaconId} ACTIVE] Emergency signal from Lat ${citizenLat.toFixed(6)}, Lon ${citizenLng.toFixed(6)}. Source: ${source}.`,
      reporterType: 'CITIZEN',
      clientReportId,
      medicalUrgent: true,
      beaconId,
    };

    try {
      if (isOnline) {
        await submitReport(payload);
        setFeedbackMsg({
          type: 'success',
          text: `📡 BEACON ${beaconId} ACTIVE & Synchronized with emergency server (GPS: ${citizenLat.toFixed(6)}, ${citizenLng.toFixed(6)}).`,
        });
      } else {
        await queueReport(payload);
        setFeedbackMsg({
          type: 'alert',
          text: `📡 BEACON ${beaconId} ACTIVE. Stored locally in IndexedDB (PENDING_SYNC). Will automatically broadcast when connectivity returns.`,
        });
      }
    } catch {
      await queueReport(payload);
      setFeedbackMsg({
        type: 'alert',
        text: `📡 BEACON ${beaconId} ACTIVE. Preserved in offline queue for auto-sync.`,
      });
    }

    setCurrentView('signal_rescuers');
  };

  const handleStopBeacon = () => {
    setEmergencyDistressState(null);
    setBeaconState(null);
    stopStrobe();
    stopSiren();
    setFeedbackMsg({
      type: 'success',
      text: 'Distress Beacon stopped. Signal state updated to STOPPED in local ledger.',
    });
  };

  // ── INJURY REPORT SUBMIT ──────────────────────────────────────────────────────

  const handleRequestMedicalRescue = async (injury: InjuryType) => {
    setSubmitting(true);
    setFeedbackMsg(null);
    const clientReportId = generateClientReportId();

    const injuryNames: Record<InjuryType, string> = {
      SERIOUS_BLEEDING: 'Serious Bleeding',
      SUSPECTED_FRACTURE: 'Suspected Fracture',
      HEAD_INJURY: 'Head Injury',
      BREATHING_DIFFICULTY: 'Breathing Difficulty',
      UNCONSCIOUS_CONFUSED: 'Unconscious / Confused',
    };

    const payload: CreateReportPayload = {
      geoLat: citizenLat,
      geoLng: citizenLng,
      category: 'INJURED_PEOPLE',
      description: `[MEDICAL RESCUE REQUEST: ${injuryNames[injury]}] Citizen injured at Lat ${citizenLat.toFixed(6)}, Lon ${citizenLng.toFixed(6)}. Immediate medical response requested.`,
      reporterType: 'CITIZEN',
      medicalUrgent: true,
      clientReportId,
      photoUrl: null,
    };

    try {
      if (isOnline) {
        await submitReport(payload);
        setFeedbackMsg({
          type: 'success',
          text: `🚨 MEDICAL RESCUE REQUEST TRANSMITTED TO LIVE COMMAND. Dispatching emergency response for ${injuryNames[injury]}.`,
        });
      } else {
        await queueReport(payload);
        setFeedbackMsg({
          type: 'alert',
          text: `📴 OFFLINE: Medical rescue request for ${injuryNames[injury]} saved locally in IndexedDB (PENDING_SYNC). It will synchronize automatically upon reconnecting.`,
        });
      }
    } catch {
      await queueReport(payload);
      setFeedbackMsg({
        type: 'alert',
        text: `📴 OFFLINE: Medical rescue request saved locally in IndexedDB queue (Zero data loss).`,
      });
    } finally {
      setSubmitting(false);
    }
  };

  // ── TRAPPED RESCUE SUBMIT ────────────────────────────────────────────────────

  const handleRequestTrappedRescue = async () => {
    setSubmitting(true);
    setFeedbackMsg(null);
    const clientReportId = generateClientReportId();

    const payload: CreateReportPayload = {
      geoLat: citizenLat,
      geoLng: citizenLng,
      category: 'TRAPPED_CITIZENS',
      description: `[TRAPPED CITIZEN RESCUE REQUEST] Citizen trapped by debris / landslide collapse at Lat ${citizenLat.toFixed(6)}, Lon ${citizenLng.toFixed(6)}. Heavy extraction gear needed.`,
      reporterType: 'CITIZEN',
      clientReportId,
      medicalUrgent: true,
    };

    try {
      if (isOnline) {
        await submitReport(payload);
        setFeedbackMsg({
          type: 'success',
          text: `🚨 TRAPPED CITIZEN REQUEST TRANSMITTED TO CENTRAL RESCUE DISPATCH. Stay calm. Responders are notified.`,
        });
      } else {
        await queueReport(payload);
        setFeedbackMsg({
          type: 'alert',
          text: `📴 OFFLINE: Trapped rescue request stored locally in IndexedDB queue (PENDING_SYNC). Automatic cloud dispatch active.`,
        });
      }
    } catch {
      await queueReport(payload);
      setFeedbackMsg({
        type: 'alert',
        text: `📴 Trapped rescue request preserved in local offline queue.`,
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Check if GPS is available
  const hasGps = typeof citizenLat === 'number' && !isNaN(citizenLat) && typeof citizenLng === 'number' && !isNaN(citizenLng);

  // Compute shelters with GPS distances safely
  const rawList = Array.isArray(sheltersList) && sheltersList.length > 0 ? sheltersList : MOCK_SHELTERS;

  const computedShelters = rawList.map(s => {
    const lat = typeof s.lat === 'number' && !isNaN(s.lat) ? s.lat : 11.5512;
    const lng = typeof s.lng === 'number' && !isNaN(s.lng) ? s.lng : 76.1280;
    const dist = hasGps ? calculateHaversineDistanceKm(citizenLat, citizenLng, lat, lng) : null;
    const brg = hasGps ? calculateCompassBearing(citizenLat, citizenLng, lat, lng) : 'Nearby';

    return {
      ...s,
      lat,
      lng,
      distanceKm: dist,
      bearing: brg,
      totalBeds: typeof s.totalBeds === 'number' && !isNaN(s.totalBeds) ? s.totalBeds : 300,
      occupiedBeds: typeof s.occupiedBeds === 'number' && !isNaN(s.occupiedBeds) ? s.occupiedBeds : 150,
      foodStockDays: typeof s.foodStockDays === 'number' && !isNaN(s.foodStockDays) ? s.foodStockDays : 7,
      waterSupplyLitres: typeof s.waterSupplyLitres === 'number' && !isNaN(s.waterSupplyLitres) ? s.waterSupplyLitres : 10000,
      medicalTeam: s.medicalTeam || 'District Medical Unit',
      status: s.status || 'AVAILABLE',
    };
  }).sort((a, b) => (a.distanceKm ?? 99999) - (b.distanceKm ?? 99999));

  const nearestRescuePoint = (computedShelters.length > 0 && hasGps) ? computedShelters[0] : null;

  // Format timestamp
  const formatTime = (ts: number | null) => {
    if (!ts) return 'Local offline baseline';
    const d = new Date(ts);
    return `${d.toLocaleDateString()} at ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER SUB-VIEWS
  // ─────────────────────────────────────────────────────────────────────────────

  // Theme Tokens
  const isLight = theme === 'light';
  const cBg = isLight ? '#ffffff' : '#0b1329';
  const cBorder = isLight ? '#e2e8f0' : '#1e293b';
  const cFg = isLight ? '#0f172a' : '#f8fafc';
  const cMuted = isLight ? '#475569' : '#94a3b8';
  const cSub = isLight ? '#1e293b' : '#cbd5e1';
  const cCard = isLight ? '#f8fafc' : '#1e293b';
  const cCardInner = isLight ? '#ffffff' : '#0f172a';
  const cCardBorder = isLight ? '#e2e8f0' : '#334155';

  return (
    <div
      style={{
        background: cBg,
        color: cFg,
        borderRadius: '16px',
        border: `1px solid ${cBorder}`,
        padding: '20px',
        marginBottom: '24px',
        fontFamily: 'Inter, system-ui, sans-serif',
        boxShadow: isLight ? '0 4px 20px rgba(0,0,0,0.06)' : '0 8px 32px rgba(0,0,0,0.5)',
      }}
    >
      {/* ── Top Header & Status ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 900, color: cFg, letterSpacing: '-0.02em' }}>
              🚨 Offline Rescue Mode
            </h2>
            <span
              style={{
                background: isOnline ? (isLight ? 'rgba(22, 163, 74, 0.12)' : 'rgba(34, 197, 94, 0.2)') : (isLight ? 'rgba(217, 119, 6, 0.12)' : 'rgba(245, 158, 11, 0.2)'),
                color: isOnline ? (isLight ? '#15803d' : '#4ade80') : (isLight ? '#b45309' : '#fcd34d'),
                border: `1px solid ${isOnline ? (isLight ? '#16a34a' : '#22c55e') : (isLight ? '#d97706' : '#f59e0b')}`,
                borderRadius: '12px',
                padding: '2px 8px',
                fontSize: '0.72rem',
                fontWeight: 800,
              }}
            >
              {isOnline ? '🟢 ONLINE' : '📴 OFFLINE (CACHED)'}
            </span>
          </div>
          <p style={{ margin: '4px 0 0 0', fontSize: '0.84rem', color: cMuted }}>
            Emergency guidance for situations where internet connectivity may be unavailable.
          </p>
        </div>

        {currentView !== 'main' && (
          <button
            onClick={() => {
              setCurrentView('main');
              setFeedbackMsg(null);
            }}
            style={{
              background: isLight ? '#f1f5f9' : '#1e293b',
              color: isLight ? '#0284c7' : '#38bdf8',
              border: `1px solid ${isLight ? '#cbd5e1' : '#334155'}`,
              borderRadius: '8px',
              padding: '6px 14px',
              fontSize: '0.82rem',
              fontWeight: 800,
              cursor: 'pointer',
            }}
          >
            ← Back to Rescue Mode
          </button>
        )}
      </div>

      {/* ── Feedback Message ── */}
      {feedbackMsg && (
        <div
          style={{
            background: feedbackMsg.type === 'success' ? (isLight ? '#dcfce7' : 'rgba(34, 197, 94, 0.2)') : (isLight ? '#fef3c7' : 'rgba(245, 158, 11, 0.2)'),
            border: `1px solid ${feedbackMsg.type === 'success' ? (isLight ? '#86efac' : '#22c55e') : (isLight ? '#fcd34d' : '#f59e0b')}`,
            color: feedbackMsg.type === 'success' ? (isLight ? '#166534' : '#86efac') : (isLight ? '#92400e' : '#fde047'),
            padding: '10px 14px',
            borderRadius: '8px',
            marginBottom: '14px',
            fontSize: '0.82rem',
            fontWeight: 700,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span>{feedbackMsg.text}</span>
          <button
            onClick={() => setFeedbackMsg(null)}
            style={{ background: 'transparent', border: 'none', color: 'inherit', cursor: 'pointer', fontWeight: 900 }}
          >
            ✕
          </button>
        </div>
      )}

      {/* ── Active Rescue Beacon Card (Shown on any view if beacon active) ── */}
      {beaconState && beaconState.active && (
        <div
          style={{
            background: strobeColor,
            color: '#ffffff',
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '18px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '12px',
            boxShadow: '0 0 24px rgba(239, 68, 68, 0.6)',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '1.4rem' }}>📡</span>
              <span style={{ fontWeight: 900, fontSize: '1rem', letterSpacing: '0.02em' }}>
                RESCUE BEACON ACTIVE
              </span>
              <span style={{ background: '#000000', color: '#4ade80', padding: '2px 8px', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 800 }}>
                {beaconState.status}
              </span>
            </div>
            <div style={{ fontSize: '0.85rem', marginTop: '6px' }}>
              DISTRESS SIGNAL ID: <strong style={{ letterSpacing: '0.05em' }}>{beaconState.beaconId}</strong>
            </div>
            <div style={{ fontSize: '0.78rem', opacity: 0.95, marginTop: '2px' }}>
              📍 GPS: {citizenLat.toFixed(6)}, {citizenLng.toFixed(6)} · Audible siren active
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            {currentView !== 'signal_rescuers' && (
              <button
                onClick={() => setCurrentView('signal_rescuers')}
                style={{
                  background: '#0f172a',
                  color: '#38bdf8',
                  border: '1px solid #38bdf8',
                  borderRadius: '8px',
                  padding: '6px 12px',
                  fontSize: '0.8rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                }}
              >
                View Beacon Screen
              </button>
            )}
            <button
              onClick={handleStopBeacon}
              style={{
                background: '#000000',
                color: '#ffffff',
                border: '2px solid #ffffff',
                borderRadius: '8px',
                padding: '6px 14px',
                fontSize: '0.8rem',
                fontWeight: 900,
                cursor: 'pointer',
              }}
            >
              🛑 STOP BEACON
            </button>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────────────
          VIEW 1: MAIN MENU (6 ACTION BUTTONS)
         ───────────────────────────────────────────────────────────────────────── */}
      {currentView === 'main' && (
        <>
          {/* How Offline Emergency Mode Works Animation */}
          <OfflineHowItWorksIllustration maxWidth={420} />

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px', marginBottom: '14px' }}>
            {/* 1. Landslide Nearby */}
            <button
              onClick={() => setCurrentView('landslide')}
              style={{
                background: isLight ? 'linear-gradient(135deg, #f8fafc, #f1f5f9)' : 'linear-gradient(135deg, #1e293b, #0f172a)',
                border: `1px solid ${cCardBorder}`,
                borderRadius: '12px',
                padding: '16px',
                textAlign: 'left',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '14px',
                color: cFg,
                transition: 'transform 0.1s, border-color 0.1s',
              }}
            >
              <span style={{ fontSize: '2rem' }}>🏔️</span>
              <div>
                <div style={{ fontWeight: 800, fontSize: '1rem', color: cFg }}>
                  Landslide Nearby
                </div>
                <div style={{ fontSize: '0.75rem', color: cMuted, marginTop: '3px' }}>
                  Nearby hazard risk, proximity distance &amp; safe slope protocols
                </div>
              </div>
            </button>

            {/* 2. I Am Injured */}
            <button
              onClick={() => setCurrentView('injured_list')}
              style={{
                background: isLight ? 'linear-gradient(135deg, #fee2e2, #fef2f2)' : 'linear-gradient(135deg, rgba(220, 38, 38, 0.2), #0f172a)',
                border: `1px solid ${isLight ? '#fca5a5' : 'rgba(239, 68, 68, 0.5)'}`,
                borderRadius: '12px',
                padding: '16px',
                textAlign: 'left',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '14px',
                color: cFg,
              }}
            >
              <span style={{ fontSize: '2rem' }}>🩹</span>
              <div>
                <div style={{ fontWeight: 800, fontSize: '1rem', color: isLight ? '#991b1b' : '#fca5a5' }}>
                  I Am Injured
                </div>
                <div style={{ fontSize: '0.75rem', color: isLight ? '#475569' : '#cbd5e1', marginTop: '3px' }}>
                  Bleeding, fracture, head injury first-aid &amp; medical SOS
                </div>
              </div>
            </button>

            {/* 3. I Am Trapped */}
            <button
              onClick={() => setCurrentView('trapped')}
              style={{
                background: isLight ? 'linear-gradient(135deg, #ffedd5, #fff7ed)' : 'linear-gradient(135deg, rgba(234, 88, 12, 0.2), #0f172a)',
                border: `1px solid ${isLight ? '#fdba74' : 'rgba(249, 115, 22, 0.5)'}`,
                borderRadius: '12px',
                padding: '16px',
                textAlign: 'left',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '14px',
                color: cFg,
              }}
            >
              <span style={{ fontSize: '2rem' }}>🧍</span>
              <div>
                <div style={{ fontWeight: 800, fontSize: '1rem', color: isLight ? '#9a3412' : '#fdba74' }}>
                  I Am Trapped
                </div>
                <div style={{ fontSize: '0.75rem', color: isLight ? '#475569' : '#cbd5e1', marginTop: '3px' }}>
                  Debris collapse survival instructions &amp; emergency dispatch
                </div>
              </div>
            </button>

            {/* 4. Signal Rescuers */}
            <button
              onClick={() => setCurrentView('signal_rescuers')}
              style={{
                background: isLight ? 'linear-gradient(135deg, #fef3c7, #fffbeb)' : 'linear-gradient(135deg, rgba(217, 119, 6, 0.2), #0f172a)',
                border: `1px solid ${isLight ? '#fcd34d' : 'rgba(245, 158, 11, 0.5)'}`,
                borderRadius: '12px',
                padding: '16px',
                textAlign: 'left',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '14px',
                color: cFg,
              }}
            >
              <span style={{ fontSize: '2rem' }}>📢</span>
              <div>
                <div style={{ fontWeight: 800, fontSize: '1rem', color: isLight ? '#92400e' : '#fcd34d' }}>
                  Signal Rescuers
                </div>
                <div style={{ fontSize: '0.75rem', color: isLight ? '#475569' : '#cbd5e1', marginTop: '3px' }}>
                  Generate unique distress beacon code &amp; audible acoustic alarm
                </div>
              </div>
            </button>

            {/* 5. Open Offline Map */}
            <button
              onClick={() => setCurrentView('offline_map')}
              style={{
                background: isLight ? 'linear-gradient(135deg, #e0f2fe, #f0f9ff)' : 'linear-gradient(135deg, #1e293b, #0f172a)',
                border: `1px solid ${isLight ? '#bae6fd' : '#334155'}`,
                borderRadius: '12px',
                padding: '16px',
                textAlign: 'left',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '14px',
                color: cFg,
              }}
            >
              <span style={{ fontSize: '2rem' }}>🗺️</span>
              <div>
                <div style={{ fontWeight: 800, fontSize: '1rem', color: isLight ? '#0369a1' : '#38bdf8' }}>
                  Open Offline Map
                </div>
                <div style={{ fontSize: '0.75rem', color: cMuted, marginTop: '3px' }}>
                  Cached vector geometry, hazard polygons &amp; safe detour route
                </div>
              </div>
            </button>

            {/* 6. Find Nearby Rescue Point */}
            <button
              onClick={() => setCurrentView('rescue_points')}
              style={{
                background: isLight ? 'linear-gradient(135deg, #dcfce7, #f0fdf4)' : 'linear-gradient(135deg, #1e293b, #0f172a)',
                border: `1px solid ${isLight ? '#bbf7d0' : '#334155'}`,
                borderRadius: '12px',
                padding: '16px',
                textAlign: 'left',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '14px',
                color: cFg,
              }}
            >
              <span style={{ fontSize: '2rem' }}>📡</span>
              <div>
                <div style={{ fontWeight: 800, fontSize: '1rem', color: isLight ? '#15803d' : '#4ade80' }}>
                  Find Nearby Rescue Point
                </div>
                <div style={{ fontSize: '0.75rem', color: cMuted, marginTop: '3px' }}>
                  GPS-sorted relief camps with distance &amp; compass bearing
                </div>
              </div>
            </button>
          </div>

          <div style={{ fontSize: '0.72rem', color: cMuted, textAlign: 'center', marginTop: '6px' }}>
            Data source: {isOnline ? 'Live Network Telemetry' : `Cached Offline Storage (${formatTime(cachedTime)})`} · Zero internet required for local distress queueing.
          </div>
        </>
      )}

      {/* ─────────────────────────────────────────────────────────────────────────
          VIEW 2: LANDSLIDE NEARBY GUIDANCE
         ───────────────────────────────────────────────────────────────────────── */}
      {currentView === 'landslide' && nearbyRisk && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Card: Proximity Alert */}
          <div
            style={{
              background: isLight ? 'linear-gradient(135deg, #fee2e2, #fef2f2)' : 'linear-gradient(135deg, rgba(239, 68, 68, 0.2), #0f172a)',
              border: `2px solid ${isLight ? '#fca5a5' : '#ef4444'}`,
              borderRadius: '12px',
              padding: '18px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px' }}>
              <div>
                <div style={{ fontSize: '0.75rem', fontWeight: 800, color: isLight ? '#991b1b' : '#f87171', textTransform: 'uppercase' }}>
                  IDENTIFIED HAZARD ZONE
                </div>
                <h3 style={{ margin: '4px 0', fontSize: '1.25rem', fontWeight: 900, color: isLight ? '#991b1b' : '#ffffff' }}>
                  {nearbyRisk.name}
                </h3>
                <div style={{ fontSize: '0.85rem', color: isLight ? '#475569' : '#cbd5e1' }}>
                  Risk Level: <strong style={{ color: isLight ? '#b91c1c' : '#ef4444' }}>{nearbyRisk.level}</strong> · Distance: <strong style={{ color: isLight ? '#0369a1' : '#38bdf8' }}>{nearbyRisk.distanceKm} km</strong> ({nearbyRisk.bearing} bearing)
                </div>
              </div>
              <span style={{ background: '#ef4444', color: '#fff', padding: '4px 10px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 800 }}>
                {nearbyRisk.isInsideOrNear ? 'INSIDE / NEAR CACHED RISK ZONE' : 'ADJACENT MONITORED ZONE'}
              </span>
            </div>

            <div style={{ marginTop: '12px', padding: '8px 12px', background: isLight ? 'rgba(0,0,0,0.04)' : 'rgba(0,0,0,0.3)', borderRadius: '6px', fontSize: '0.78rem', color: cMuted }}>
              {!isOnline
                ? `ℹ️ Using cached risk information (Synchronized ${formatTime(cachedTime)}). Ground conditions may evolve rapidly.`
                : '🟢 Telemetry synchronized with live monitoring stations.'}
            </div>
          </div>

          {/* Emergency Safety Guidance */}
          <div style={{ background: cCard, border: `1px solid ${cCardBorder}`, borderRadius: '12px', padding: '20px' }}>
            <h4 style={{ margin: '0 0 12px 0', fontSize: '1rem', fontWeight: 800, color: cFg }}>
              🛡️ Emergency Safety Protocols
            </h4>
            <ol style={{ margin: 0, paddingLeft: '20px', lineHeight: '1.8', color: cSub, fontSize: '0.88rem' }}>
              <li>Move away from unstable slopes, falling rocks, debris and damaged structures if you can do so safely.</li>
              <li>Avoid entering an area where a landslide has already occurred.</li>
              <li>Follow official evacuation instructions when available.</li>
              <li>Avoid blocked roads, bridges and damaged infrastructure.</li>
              <li>If you cannot move safely, use Signal Rescuers.</li>
            </ol>

            <div style={{ marginTop: '14px', padding: '10px 14px', background: isLight ? '#fef2f2' : 'rgba(239, 68, 68, 0.15)', border: `1px solid ${isLight ? '#fca5a5' : '#ef444480'}`, borderRadius: '8px', color: isLight ? '#991b1b' : '#fca5a5', fontSize: '0.82rem', fontWeight: 700 }}>
              ⚠️ Do not assume a slope is safe simply because visible movement has stopped. Secondary slides are frequent during rainfall.
            </div>
          </div>

          {/* Animated Instructional Illustration: How Offline Emergency Mode Works */}
          <div style={{ marginTop: '14px', marginBottom: '4px' }}>
            <OfflineHowItWorksIllustration maxWidth={420} />
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button
              onClick={() => handleStartBeacon('Landslide Evacuation Alert')}
              style={{
                flex: 1,
                minWidth: '200px',
                background: 'linear-gradient(135deg, #d97706, #b45309)',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                padding: '12px',
                fontWeight: 800,
                fontSize: '0.9rem',
                cursor: 'pointer',
              }}
            >
              📢 Cannot Evacuate? Signal Rescuers
            </button>
            <button
              onClick={() => setCurrentView('offline_map')}
              style={{
                background: isLight ? '#f1f5f9' : '#1e293b',
                color: isLight ? '#0284c7' : '#38bdf8',
                border: `1px solid ${isLight ? '#cbd5e1' : '#334155'}`,
                borderRadius: '8px',
                padding: '12px 18px',
                fontWeight: 700,
                fontSize: '0.85rem',
                cursor: 'pointer',
              }}
            >
              🗺️ Open Offline Map
            </button>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────────────
          VIEW 3: INJURY SELECTION LIST
         ───────────────────────────────────────────────────────────────────────── */}
      {currentView === 'injured_list' && (
        <div>
          <h3 style={{ margin: '0 0 6px 0', fontSize: '1.2rem', fontWeight: 800, color: cFg }}>
            🩹 Select Injury Type
          </h3>
          <p style={{ margin: '0 0 16px 0', fontSize: '0.84rem', color: cMuted }}>
            Select the condition that best describes the injury to view tailored emergency guidance and alert responders.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {[
              { type: 'SERIOUS_BLEEDING' as InjuryType, icon: '🩸', label: 'Serious Bleeding', sub: 'Deep lacerations, arterial or heavy uncontrolled bleeding' },
              { type: 'SUSPECTED_FRACTURE' as InjuryType, icon: '🦴', label: 'Suspected Fracture', sub: 'Deformed bone, severe pain on movement, limb inability' },
              { type: 'HEAD_INJURY' as InjuryType, icon: '🧠', label: 'Head Injury', sub: 'Impact trauma, disorientation, dizziness or concussion' },
              { type: 'BREATHING_DIFFICULTY' as InjuryType, icon: '🫁', label: 'Breathing Difficulty', sub: 'Airway obstruction, dust inhalation, shortness of breath' },
              { type: 'UNCONSCIOUS_CONFUSED' as InjuryType, icon: '😵', label: 'Unconscious / Confused', sub: 'Unresponsive individual, altered mental status, collapse' },
            ].map(item => (
              <button
                key={item.type}
                onClick={() => {
                  setSelectedInjury(item.type);
                  setCurrentView('injured_detail');
                }}
                style={{
                  background: cCard,
                  border: `1px solid ${cCardBorder}`,
                  borderRadius: '10px',
                  padding: '14px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                  color: cFg,
                  textAlign: 'left',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontSize: '1.6rem' }}>{item.icon}</span>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '0.95rem', color: cFg }}>{item.label}</div>
                    <div style={{ fontSize: '0.75rem', color: cMuted }}>{item.sub}</div>
                  </div>
                </div>
                <span style={{ color: isLight ? '#0284c7' : '#38bdf8', fontWeight: 800, fontSize: '1.1rem' }}>→</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────────────
          VIEW 4: SPECIFIC INJURY GUIDANCE & RESCUE REQUEST
         ───────────────────────────────────────────────────────────────────────── */}
      {currentView === 'injured_detail' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* 4A. Serious Bleeding */}
          {selectedInjury === 'SERIOUS_BLEEDING' && (
            <div style={{ background: cCard, border: `1px solid ${isLight ? '#fca5a5' : '#ef444480'}`, borderRadius: '12px', padding: '20px' }}>
              <h3 style={{ margin: '0 0 12px 0', fontSize: '1.2rem', fontWeight: 800, color: isLight ? '#991b1b' : '#f87171', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>🩸</span> Serious Bleeding Emergency Protocol
              </h3>
              <ol style={{ margin: 0, paddingLeft: '20px', lineHeight: '1.8', color: cSub, fontSize: '0.88rem' }}>
                <li>Move away from immediate danger if you can do so safely.</li>
                <li>Use a clean cloth or dressing and apply firm, steady pressure directly over the wound.</li>
                <li>If the cloth becomes soaked, add another clean layer rather than repeatedly removing the first one.</li>
                <li>Get emergency medical assistance as soon as communication is available.</li>
              </ol>
            </div>
          )}

          {/* 4B. Suspected Fracture */}
          {selectedInjury === 'SUSPECTED_FRACTURE' && (
            <div style={{ background: cCard, border: `1px solid ${isLight ? '#bae6fd' : '#38bdf880'}`, borderRadius: '12px', padding: '20px' }}>
              <h3 style={{ margin: '0 0 12px 0', fontSize: '1.2rem', fontWeight: 800, color: isLight ? '#0369a1' : '#38bdf8', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>🦴</span> Suspected Fracture Protocol
              </h3>
              <ul style={{ margin: 0, paddingLeft: '20px', lineHeight: '1.8', color: cSub, fontSize: '0.88rem' }}>
                <li>Avoid unnecessary movement of the injured area.</li>
                <li>Keep the person as still and comfortable as possible.</li>
                <li>Do not try to straighten or force the injured body part back into position.</li>
                <li>Protect the area from further injury using clothing padding or soft supports.</li>
                <li>Seek professional medical assistance as soon as possible.</li>
              </ul>
            </div>
          )}

          {/* 4C. Head Injury */}
          {selectedInjury === 'HEAD_INJURY' && (
            <div style={{ background: cCard, border: `1px solid ${isLight ? '#e9d5ff' : '#a855f780'}`, borderRadius: '12px', padding: '20px' }}>
              <h3 style={{ margin: '0 0 12px 0', fontSize: '1.2rem', fontWeight: 800, color: isLight ? '#7e22ce' : '#c084fc', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>🧠</span> Head Injury Emergency Protocol
              </h3>
              <ul style={{ margin: 0, paddingLeft: '20px', lineHeight: '1.8', color: cSub, fontSize: '0.88rem' }}>
                <li>Keep the person in a safe, resting position.</li>
                <li>Avoid unnecessary movement, especially after a significant impact.</li>
                <li>Monitor responsiveness, pupil symmetry and normal breathing.</li>
                <li>Do not leave a severely confused or unconscious person alone if help is available.</li>
                <li>Seek emergency medical assistance immediately.</li>
              </ul>
            </div>
          )}

          {/* 4D. Breathing Difficulty */}
          {selectedInjury === 'BREATHING_DIFFICULTY' && (
            <div style={{ background: cCard, border: `1px solid ${isLight ? '#bbf7d0' : '#22c55e80'}`, borderRadius: '12px', padding: '20px' }}>
              <h3 style={{ margin: '0 0 12px 0', fontSize: '1.2rem', fontWeight: 800, color: isLight ? '#15803d' : '#4ade80', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>🫁</span> Breathing Difficulty Protocol
              </h3>
              <ul style={{ margin: 0, paddingLeft: '20px', lineHeight: '1.8', color: cSub, fontSize: '0.88rem' }}>
                <li>Move to a safe area with clean air if dust or smoke is present.</li>
                <li>Keep the person calm, seated upright, and avoid unnecessary exertion.</li>
                <li>Seek emergency medical assistance immediately when communication is available.</li>
                <li>If the person becomes unresponsive and trained help is available, follow emergency medical instructions.</li>
              </ul>
            </div>
          )}

          {/* 4E. Unconscious / Confused */}
          {selectedInjury === 'UNCONSCIOUS_CONFUSED' && (
            <div style={{ background: cCard, border: `1px solid ${isLight ? '#fde68a' : '#f59e0b80'}`, borderRadius: '12px', padding: '20px' }}>
              <h3 style={{ margin: '0 0 12px 0', fontSize: '1.2rem', fontWeight: 800, color: isLight ? '#92400e' : '#fcd34d', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>😵</span> Unconscious / Confused Person Protocol
              </h3>
              <ul style={{ margin: 0, paddingLeft: '20px', lineHeight: '1.8', color: cSub, fontSize: '0.88rem' }}>
                <li>Check that the surroundings are safe before approaching.</li>
                <li>Get emergency assistance immediately.</li>
                <li>Avoid unnecessary movement unless remaining where the person is creates immediate danger.</li>
                <li>Monitor responsiveness and ensure clear breathing passages.</li>
                <li>Seek professional emergency medical help.</li>
              </ul>
            </div>
          )}

          {/* Medical Disclaimer Alert */}
          <div style={{ background: isLight ? '#fee2e2' : 'rgba(239, 68, 68, 0.1)', border: `1px solid ${isLight ? '#fca5a5' : '#ef444450'}`, borderRadius: '8px', padding: '10px 14px', fontSize: '0.8rem', color: isLight ? '#991b1b' : '#fca5a5' }}>
            ⚠ General emergency guidance only. Seek professional medical help as soon as possible.
          </div>

          {/* Action Button: Request Medical Rescue */}
          <button
            onClick={() => handleRequestMedicalRescue(selectedInjury)}
            disabled={submitting}
            style={{
              background: 'linear-gradient(135deg, #dc2626, #991b1b)',
              color: '#ffffff',
              border: 'none',
              borderRadius: '10px',
              padding: '14px',
              fontWeight: 900,
              fontSize: '1rem',
              cursor: submitting ? 'wait' : 'pointer',
              boxShadow: '0 4px 20px rgba(220, 38, 38, 0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
            }}
          >
            <span>🚨</span>
            <span>{submitting ? 'Transmitting Request…' : 'REQUEST MEDICAL RESCUE'}</span>
          </button>

          <button
            onClick={() => setCurrentView('injured_list')}
            style={{ background: 'transparent', border: 'none', color: cMuted, fontSize: '0.82rem', cursor: 'pointer' }}
          >
            ← Choose Different Injury Type
          </button>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────────────
          VIEW 5: I AM TRAPPED WORKFLOW
         ───────────────────────────────────────────────────────────────────────── */}
      {currentView === 'trapped' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ background: cCard, border: `1px solid ${isLight ? '#fed7aa' : '#ea580c80'}`, borderRadius: '12px', padding: '20px' }}>
            <h3 style={{ margin: '0 0 12px 0', fontSize: '1.2rem', fontWeight: 800, color: isLight ? '#c2410c' : '#fb923c', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>🧍</span> I Am Trapped — Immediate Guidance
            </h3>
            <ol style={{ margin: 0, paddingLeft: '20px', lineHeight: '1.8', color: cSub, fontSize: '0.88rem' }}>
              <li>Stay as calm as possible and avoid unnecessary movement to conserve energy and oxygen.</li>
              <li>Check your immediate surroundings for continuing hazards such as unstable rocks or leaking pipes.</li>
              <li>Conserve your phone battery — lower screen brightness and avoid streaming video.</li>
              <li>If communication is available, send your location to rescuers.</li>
              <li>If there is no network, use Signal Rescuers.</li>
              <li>If responders are nearby, make a safe recognizable sound (tapping on pipes or metal).</li>
            </ol>

            <div style={{ marginTop: '16px', background: cCardInner, padding: '12px', borderRadius: '8px', border: `1px solid ${cCardBorder}` }}>
              <div style={{ fontSize: '0.75rem', color: cMuted, fontWeight: 700 }}>📍 YOUR GPS LOCATION:</div>
              <div style={{ fontSize: '1.05rem', fontWeight: 900, color: isLight ? '#0284c7' : '#38bdf8', marginTop: '2px' }}>
                {citizenLat.toFixed(6)}, {citizenLng.toFixed(6)}
              </div>
              <div style={{ fontSize: '0.72rem', color: cMuted, marginTop: '2px' }}>
                This exact coordinate will be embedded in your emergency distress beacon.
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
            <button
              onClick={() => handleStartBeacon('Trapped Citizen Emergency')}
              style={{
                background: 'linear-gradient(135deg, #d97706, #b45309)',
                color: '#fff',
                border: 'none',
                borderRadius: '10px',
                padding: '14px',
                fontWeight: 900,
                fontSize: '0.95rem',
                cursor: 'pointer',
                boxShadow: '0 4px 16px rgba(217, 119, 6, 0.4)',
              }}
            >
              📢 SIGNAL RESCUERS (BEACON)
            </button>

            <button
              onClick={handleRequestTrappedRescue}
              disabled={submitting}
              style={{
                background: 'linear-gradient(135deg, #ea580c, #c2410c)',
                color: '#fff',
                border: 'none',
                borderRadius: '10px',
                padding: '14px',
                fontWeight: 900,
                fontSize: '0.95rem',
                cursor: submitting ? 'wait' : 'pointer',
                boxShadow: '0 4px 16px rgba(234, 88, 12, 0.4)',
              }}
            >
              🚨 REQUEST RESCUE
            </button>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────────────
          VIEW 6: SIGNAL RESCUERS — FULL BEACON WORKFLOW
         ───────────────────────────────────────────────────────────────────────── */}
      {currentView === 'signal_rescuers' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {beaconState && beaconState.active ? (
            <div
              style={{
                background: cCard,
                border: `2px solid ${isLight ? '#dc2626' : '#ef4444'}`,
                borderRadius: '14px',
                padding: '24px',
                textAlign: 'center',
                boxShadow: isLight ? '0 4px 20px rgba(220, 38, 38, 0.15)' : '0 0 30px rgba(239, 68, 68, 0.3)',
              }}
            >
              <div style={{ fontSize: '3rem', marginBottom: '8px' }}>📡</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 900, color: isLight ? '#dc2626' : '#ef4444', letterSpacing: '0.05em' }}>
                BEACON ACTIVE
              </div>

              <div style={{ margin: '16px 0', background: cCardInner, border: `1px solid ${cCardBorder}`, borderRadius: '10px', padding: '16px' }}>
                <div style={{ fontSize: '0.75rem', color: cMuted, fontWeight: 800, textTransform: 'uppercase' }}>
                  DISTRESS SIGNAL ID
                </div>
                <div style={{ fontSize: '2.2rem', fontWeight: 900, color: cFg, letterSpacing: '0.08em', marginTop: '4px' }}>
                  {beaconState.beaconId}
                </div>
                <div style={{ display: 'inline-block', background: isLight ? 'rgba(22, 163, 74, 0.12)' : 'rgba(34, 197, 94, 0.2)', color: isLight ? '#15803d' : '#4ade80', border: `1px solid ${isLight ? '#86efac' : '#22c55e'}`, borderRadius: '4px', padding: '2px 10px', fontSize: '0.78rem', fontWeight: 800, marginTop: '8px' }}>
                  Status: ACTIVE
                </div>
              </div>

              <div style={{ background: cCardInner, borderRadius: '8px', padding: '12px', fontSize: '0.85rem', color: cSub, marginBottom: '18px', border: `1px solid ${cCardBorder}` }}>
                📍 GPS Location: <strong style={{ color: isLight ? '#0284c7' : '#38bdf8' }}>{citizenLat.toFixed(6)}, {citizenLng.toFixed(6)}</strong>
              </div>

              <p style={{ fontSize: '0.85rem', color: isLight ? '#b45309' : '#fcd34d', margin: '0 0 20px 0', fontWeight: 700 }}>
                Keep the device available for the responder-detection system.
              </p>

              <button
                onClick={handleStopBeacon}
                style={{
                  background: isLight ? '#b91c1c' : '#000000',
                  color: '#ffffff',
                  border: isLight ? 'none' : '2px solid #ef4444',
                  borderRadius: '10px',
                  padding: '14px 28px',
                  fontWeight: 900,
                  fontSize: '1rem',
                  cursor: 'pointer',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
                }}
              >
                🛑 STOP BEACON
              </button>
            </div>
          ) : (
            <div
              style={{
                background: cCard,
                border: `1px solid ${cCardBorder}`,
                borderRadius: '14px',
                padding: '24px',
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: '2.5rem', marginBottom: '10px' }}>📢</div>
              <h3 style={{ margin: '0 0 8px 0', fontSize: '1.2rem', fontWeight: 800, color: cFg }}>
                Activate Emergency Distress Beacon
              </h3>
              <p style={{ fontSize: '0.88rem', color: cSub, maxWidth: '500px', margin: '0 auto 20px auto', lineHeight: '1.5' }}>
                Generates an emergency distress identifier (e.g. EWS-XXXXXX), captures your exact GPS location, starts an audible acoustic alarm, and prepares the beacon for responder discovery.
              </p>

              <button
                onClick={() => handleStartBeacon('Citizen Manual Activation')}
                style={{
                  background: 'linear-gradient(135deg, #d97706, #b45309)',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '10px',
                  padding: '16px 32px',
                  fontWeight: 900,
                  fontSize: '1.05rem',
                  cursor: 'pointer',
                  boxShadow: '0 4px 20px rgba(217, 119, 6, 0.4)',
                }}
              >
                📡 ACTIVATE SIGNAL RESCUERS
              </button>
            </div>
          )}

          {/* Technical Capability & Honesty Notice */}
          <div
            style={{
              background: cCardInner,
              border: `1px solid ${cCardBorder}`,
              borderRadius: '8px',
              padding: '12px 16px',
              fontSize: '0.75rem',
              color: cMuted,
              lineHeight: '1.5',
            }}
          >
            <strong style={{ color: cFg }}>Prototype stage —</strong> Distress signal is stored locally. Native Bluetooth/BLE advertising and responder detection require the Android native BLE layer. Software acoustic alarm and IndexedDB queue are fully functional.
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────────────
          VIEW 7: OPEN OFFLINE MAP
         ───────────────────────────────────────────────────────────────────────── */}
      {currentView === 'offline_map' && (
        <div>
          <OfflineVectorMap
            userLat={citizenLat}
            userLon={citizenLng}
            zoneName="Monitored Region (Offline Cached)"
            cachedTimestamp={cachedTime}
            shelters={sheltersList}
          />
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────────────
          VIEW 8: FIND NEARBY RESCUE POINT (SORTED NEAREST FIRST)
         ───────────────────────────────────────────────────────────────────────── */}
      {currentView === 'rescue_points' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <h3 style={{ margin: '0 0 6px 0', fontSize: '1.2rem', fontWeight: 800, color: cFg, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>📡</span> Nearby Rescue &amp; Relief Points
            </h3>
            <p style={{ margin: 0, fontSize: '0.84rem', color: cMuted }}>
              {hasGps
                ? 'Calculated dynamically using your current GPS coordinates. Sorted nearest to farthest.'
                : 'GPS location unavailable. Distances cannot be calculated.'}
            </p>
          </div>

          {!hasGps && (
            <div style={{ background: isLight ? '#fef3c7' : 'rgba(245, 158, 11, 0.15)', border: `1px solid ${isLight ? '#fde68a' : '#f59e0b'}`, padding: '14px 16px', borderRadius: '10px', color: isLight ? '#92400e' : '#fcd34d', fontSize: '0.85rem', fontWeight: 700 }}>
              📍 GPS location unavailable. Distances cannot be calculated. Showing cached emergency shelter directory.
            </div>
          )}

          {/* Highlighted Nearest Rescue Point Card */}
          {nearestRescuePoint ? (
            <div
              style={{
                background: isLight ? 'linear-gradient(135deg, #f0fdf4, #ffffff)' : 'linear-gradient(135deg, rgba(34, 197, 94, 0.2), #0f172a)',
                border: `2px solid ${isLight ? '#22c55e' : '#22c55e'}`,
                borderRadius: '12px',
                padding: '18px',
                boxShadow: isLight ? '0 4px 14px rgba(34, 197, 94, 0.12)' : undefined,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px' }}>
                <div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 800, color: isLight ? '#15803d' : '#4ade80', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    📡 NEAREST RESCUE POINT
                  </div>
                  <h4 style={{ margin: '4px 0', fontSize: '1.15rem', fontWeight: 900, color: cFg }}>
                    {nearestRescuePoint.name || 'Emergency Relief Center'}
                  </h4>
                  <div style={{ fontSize: '0.9rem', color: isLight ? '#0284c7' : '#38bdf8', fontWeight: 700 }}>
                    Distance: {nearestRescuePoint.distanceKm != null ? `${nearestRescuePoint.distanceKm} km` : 'Calculating…'} · Direction: {nearestRescuePoint.bearing || 'Nearby'}
                  </div>
                </div>
                <span style={{ background: '#16a34a', color: '#fff', padding: '4px 10px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 800 }}>
                  {nearestRescuePoint.status || 'AVAILABLE'}
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px', marginTop: '14px', background: cCardInner, padding: '12px', borderRadius: '8px', border: `1px solid ${cCardBorder}` }}>
                <div>
                  <span style={{ fontSize: '0.72rem', color: cMuted }}>Coordinates:</span>
                  <div style={{ fontSize: '0.82rem', fontWeight: 700, color: cFg }}>
                    {typeof nearestRescuePoint.lat === 'number' ? nearestRescuePoint.lat.toFixed(4) : 'N/A'}, {typeof nearestRescuePoint.lng === 'number' ? nearestRescuePoint.lng.toFixed(4) : 'N/A'}
                  </div>
                </div>
                <div>
                  <span style={{ fontSize: '0.72rem', color: cMuted }}>Available Beds:</span>
                  <div style={{ fontSize: '0.82rem', fontWeight: 700, color: isLight ? '#15803d' : '#4ade80' }}>
                    {Math.max(0, (nearestRescuePoint.totalBeds || 0) - (nearestRescuePoint.occupiedBeds || 0))} of {nearestRescuePoint.totalBeds || 0}
                  </div>
                </div>
                <div>
                  <span style={{ fontSize: '0.72rem', color: cMuted }}>Food Reserves:</span>
                  <div style={{ fontSize: '0.82rem', fontWeight: 700, color: cFg }}>{nearestRescuePoint.foodStockDays || 0} Days</div>
                </div>
                <div>
                  <span style={{ fontSize: '0.72rem', color: cMuted }}>Water Supply:</span>
                  <div style={{ fontSize: '0.82rem', fontWeight: 700, color: cFg }}>{(nearestRescuePoint.waterSupplyLitres || 0).toLocaleString()} L</div>
                </div>
              </div>
            </div>
          ) : null}

          {/* Full List of Shelters */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ fontSize: '0.82rem', fontWeight: 700, color: cMuted }}>
              {hasGps ? 'All Cached Rescue Shelters (Nearest First):' : 'All Cached Rescue Shelters:'}
            </div>

            {computedShelters.length === 0 ? (
              <div style={{ background: cCard, border: `1px solid ${cCardBorder}`, padding: '18px', borderRadius: '10px', textAlign: 'center', color: cMuted, fontSize: '0.85rem' }}>
                No cached relief shelters currently available in local storage.
              </div>
            ) : (
              computedShelters.map((shelter, idx) => (
                <div
                  key={shelter.id || idx}
                  style={{
                    background: cCard,
                    border: `1px solid ${cCardBorder}`,
                    borderRadius: '10px',
                    padding: '14px 16px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '10px',
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '0.92rem', color: cFg }}>
                      {idx + 1}. {shelter.name}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: isLight ? '#0284c7' : '#38bdf8', marginTop: '2px' }}>
                      📍 {shelter.distanceKm != null ? `${shelter.distanceKm} km ${shelter.bearing || ''}` : 'Distance unavailable'} · Lat: {typeof shelter.lat === 'number' ? shelter.lat.toFixed(4) : 'N/A'}, Lon: {typeof shelter.lng === 'number' ? shelter.lng.toFixed(4) : 'N/A'}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: cMuted, marginTop: '2px' }}>
                      Medical: {shelter.medicalTeam || 'Available'}
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <span
                      style={{
                        background: shelter.status === 'AVAILABLE' ? (isLight ? 'rgba(22,163,74,0.12)' : 'rgba(34,197,94,0.2)') : (isLight ? 'rgba(220,38,38,0.12)' : 'rgba(239,68,68,0.2)'),
                        color: shelter.status === 'AVAILABLE' ? (isLight ? '#15803d' : '#4ade80') : (isLight ? '#b91c1c' : '#fca5a5'),
                        border: `1px solid ${shelter.status === 'AVAILABLE' ? (isLight ? '#86efac' : '#22c55e') : (isLight ? '#fca5a5' : '#ef4444')}`,
                        borderRadius: '6px',
                        padding: '2px 8px',
                        fontSize: '0.72rem',
                        fontWeight: 800,
                      }}
                    >
                      {shelter.status || 'AVAILABLE'}
                    </span>
                    <div style={{ fontSize: '0.72rem', color: cMuted, marginTop: '4px' }}>
                      {shelter.occupiedBeds || 0}/{shelter.totalBeds || 0} beds
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          <div style={{ fontSize: '0.72rem', color: cMuted, textAlign: 'center' }}>
            Demonstration locations / Cached test data · Verified safe corridors subject to local rainfall conditions.
          </div>
        </div>
      )}
    </div>
  );
};
