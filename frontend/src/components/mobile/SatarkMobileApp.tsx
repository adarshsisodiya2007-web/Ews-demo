/**
 * SatarkMobileApp.tsx
 * Dedicated Mobile Emergency & Safety Application Presentation
 * Exclusively active when running inside the native Android Capacitor shell (isCapacitorAndroid === true).
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchRiskAssessment, fetchRecentReports } from '../../services/api';
import { useAlertSound } from '../../hooks/useAlertSound';
import { usePermissions } from '../../hooks/usePermissions';
import { useVoiceAssistant } from '../../hooks/useVoiceAssistant';
import { getCachedHeatmapWithMeta, getCachedIncidents } from '../../services/offlineStore';
import { isCitizenAuthenticated, getCachedCitizenProfile } from '../../services/citizenAuthService';
import { RiskAssessmentResponse, CitizenReport } from '../../types';
import PublicRiskMap from '../../pages/PublicRiskMap';
import ReportFormPage from '../../pages/ReportFormPage';
import OfficialDashboard from '../../pages/OfficialDashboard';
import { ResponderPortal } from '../../pages/ResponderPortal';

export const SatarkMobileApp: React.FC = () => {
  const navigate = useNavigate();

  // Tab Navigation: 'home' | 'alerts' | 'map' | 'report' | 'profile'
  const [activeTab, setActiveTab] = useState<'home' | 'alerts' | 'map' | 'report' | 'profile'>('home');

  // Language state & compact dropdown
  const [lang, setLang] = useState<'en' | 'hi' | 'as'>('en');
  const [showLangSheet, setShowLangSheet] = useState<boolean>(false);

  // Modals & Bottom Sheets
  const [showZoneSheet, setShowZoneSheet] = useState<boolean>(false);
  const [showSosSheet, setShowSosSheet] = useState<boolean>(false);
  const [showContactsSheet, setShowContactsSheet] = useState<boolean>(false);
  const [showOfflineSheet, setShowOfflineSheet] = useState<boolean>(false);
  const [showStatusDetails, setShowStatusDetails] = useState<boolean>(false);
  const [showShelterSheet, setShowShelterSheet] = useState<boolean>(false);

  // Officer / Responder mode overlay toggle inside app
  const [activeOfficerMode, setActiveOfficerMode] = useState<boolean>(false);
  const [activeResponderMode, setActiveResponderMode] = useState<boolean>(false);

  // Audio & Hardware sensors
  const { playCriticalSiren, stopSiren, isPlaying } = useAlertSound();
  const { userLocation } = usePermissions();
  const { speakAlert, isSpeaking, stopSpeaking } = useVoiceAssistant(lang);

  // Online / Offline connectivity detection
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Citizen Authentication
  const [citizenProfile, setCitizenProfile] = useState(() => getCachedCitizenProfile());
  const [isAuth, setIsAuth] = useState<boolean>(() => isCitizenAuthenticated());

  useEffect(() => {
    const handleAuth = () => {
      setIsAuth(isCitizenAuthenticated());
      setCitizenProfile(getCachedCitizenProfile());
    };
    window.addEventListener('satark-auth-changed', handleAuth);
    window.addEventListener('satark-profile-updated', handleAuth);
    return () => {
      window.removeEventListener('satark-auth-changed', handleAuth);
      window.removeEventListener('satark-profile-updated', handleAuth);
    };
  }, []);

  // Locations / Zones
  const ZONES = [
    { name: 'Guwahati Hills (NER)', district: 'Kamrup', lat: 26.1445, lon: 91.7362, slope: 32.0, state: 'Assam' },
    { name: 'Shillong Ridge (NER)', district: 'East Khasi Hills', lat: 25.5788, lon: 91.8933, slope: 38.5, state: 'Meghalaya' },
    { name: 'Aizawl Slopes (NER)', district: 'Aizawl', lat: 23.7271, lon: 92.7176, slope: 45.0, state: 'Mizoram' },
    { name: 'Meppadi, Wayanad (Testbed)', district: 'Wayanad', lat: 11.5534, lon: 76.1320, slope: 38.5, state: 'Kerala' },
    { name: 'Gangtok Corridor (NER)', district: 'East Sikkim', lat: 27.3389, lon: 88.6065, slope: 41.0, state: 'Sikkim' },
    { name: 'Kohima Escarpment (NER)', district: 'Kohima', lat: 25.6751, lon: 94.1086, slope: 36.0, state: 'Nagaland' }
  ];

  const [selectedZone, setSelectedZone] = useState(ZONES[0]);

  // Auto-detect nearest zone from GPS
  useEffect(() => {
    if (userLocation) {
      const nearest = ZONES.reduce((prev, curr) => {
        const dPrev = Math.hypot(prev.lat - userLocation.lat, prev.lon - userLocation.lon);
        const dCurr = Math.hypot(curr.lat - userLocation.lat, curr.lon - userLocation.lon);
        return dCurr < dPrev ? curr : prev;
      });
      setSelectedZone(nearest);
    }
  }, [userLocation]);

  // Risk Data
  const [data, setData] = useState<RiskAssessmentResponse | null>(null);
  const [loadingRisk, setLoadingRisk] = useState<boolean>(true);
  const [recentReports, setRecentReports] = useState<CitizenReport[]>([]);

  useEffect(() => {
    let isMounted = true;
    setLoadingRisk(true);
    fetchRiskAssessment(selectedZone.lat, selectedZone.lon, selectedZone.slope, selectedZone.name)
      .then(res => {
        if (isMounted) setData(res);
      })
      .catch(async () => {
        const cached = await getCachedHeatmapWithMeta();
        if (isMounted && cached?.data && cached.data.length > 0) {
          const match = cached.data.find(r => r.name.toLowerCase().includes(selectedZone.district.toLowerCase()));
          if (match) {
            setData({
              location: {
                lat: match.centroidLat,
                lon: match.centroidLng,
                slope_deg: selectedZone.slope,
                region_name: match.name
              },
              weather: {
                rain_24h_mm: Math.round(match.contributingFactors.rainfall.score * 150),
                rain_72h_mm: Math.round(match.contributingFactors.rainfall.score * 300),
                soil_moisture: Math.round(match.contributingFactors.soilMoisture.score * 100),
                critical_rain_trigger: match.severity === 'CRITICAL' || match.severity === 'HIGH',
                source: 'Cached Fallback Data'
              },
              assessment: {
                score: match.computedScore,
                level: match.severity === 'CRITICAL' ? 'RED' : match.severity === 'HIGH' ? 'AMBER' : 'GREEN',
                action_protocol: match.severity === 'CRITICAL' ? 'Immediate Evacuation Required. Move to designated safe shelter.' : 'Heightened vigilance along hill slopes. Avoid unpaved corridors.',
                feature_breakdown: {
                  norm_slope: match.contributingFactors.slope.score,
                  norm_r24: match.contributingFactors.rainfall.score,
                  norm_r72: match.contributingFactors.rainfall.score * 0.9,
                  norm_moisture: match.contributingFactors.soilMoisture.score
                }
              },
              evacuation_plan: {
                region: match.name,
                risk_score: match.computedScore,
                status: match.severity === 'CRITICAL' ? 'REROUTED' : 'CLEAR',
                primary_corridor: 'Main Hill Access Road',
                safe_evacuation_route: 'Designated Valley Bypass Road',
                action: match.severity === 'CRITICAL' ? 'Evacuate to Red Cross Relief Camp' : 'Maintain standard advisory',
                rerouted: match.severity === 'CRITICAL',
                blocked_segments: [],
                safe_route_geometry: [[match.centroidLat, match.centroidLng]],
                estimated_evacuation_time_min: 15
              }
            });
          }
        }
      })
      .finally(() => {
        if (isMounted) setLoadingRisk(false);
      });

    fetchRecentReports()
      .then(reps => { if (isMounted) setRecentReports(reps); })
      .catch(async () => {
        const cachedR = await getCachedIncidents();
        if (isMounted && cachedR?.data) setRecentReports(cachedR.data);
      });

    return () => { isMounted = false; };
  }, [selectedZone]);

  // Translations
  const t = {
    en: {
      appName: 'SATARK',
      location: 'Location',
      status: 'Current Status',
      action: 'Required Action',
      details: 'Details',
      emergencyAlert: 'CRITICAL LANDSLIDE ALERT',
      emergencySub: 'Heavy rainfall threshold exceeded on hill slopes. Caution advised.',
      sos: 'SOS DISTRESS',
      sosSub: 'Emergency beacon',
      report: 'REPORT HAZARD',
      reportSub: 'Photo & GPS',
      safeRoute: 'SAFE ROUTE',
      safeRouteSub: 'Nearest shelter',
      contacts: 'EMERGENCY 112',
      contactsSub: 'NDRF / SDRF dial',
      offlineTitle: 'Offline Rescue Mode',
      offlineDesc: 'Zero-network peer-to-peer distress beacon & emergency guide.',
      howItWorks: 'How it Works ›',
      weatherTitle: 'Weather & Landslide Risk',
      temp: 'Temp',
      weather: 'Weather',
      humidity: 'Soil Moisture',
      viewMap: 'View Map ›',
      tabHome: 'Home',
      tabAlerts: 'Alerts',
      tabMap: 'Map',
      tabReport: 'Report',
      tabProfile: 'Profile'
    },
    hi: {
      appName: 'सतर्क (SATARK)',
      location: 'स्थान',
      status: 'वर्तमान स्थिति',
      action: 'आवश्यक कार्रवाई',
      details: 'विवरण',
      emergencyAlert: 'आपातकालीन भूस्खलन चेतावनी',
      emergencySub: 'पहाड़ी ढलानों पर भारी वर्षा सीमा पार। तत्काल सावधानी बरतें।',
      sos: 'आपातकालीन एसओएस',
      sosSub: 'संकट बीकन',
      report: 'घटना रिपोर्ट करें',
      reportSub: 'फोटो और जीपीएस',
      safeRoute: 'सुरक्षित मार्ग',
      safeRouteSub: 'निकटतम शिविर',
      contacts: 'आपातकालीन 112',
      contactsSub: 'एनडीआरएफ / एसडीआरएफ',
      offlineTitle: 'ऑफलाइन रेस्क्यू मोड',
      offlineDesc: 'बिना इंटरनेट पीयर-टू-पीयर संकट बीकन और आपातकालीन गाइड।',
      howItWorks: 'यह कैसे काम करता है ›',
      weatherTitle: 'मौसम एवं भूस्खलन जोखिम',
      temp: 'तापमान',
      weather: 'मौसम',
      humidity: 'मिट्टी की नमी',
      riskScore: 'भूस्खलन संवेदनशीलता',
      viewMap: 'मानचित्र देखें ›',
      tabHome: 'होम',
      tabAlerts: 'अलर्ट',
      tabMap: 'मैप',
      tabReport: 'रिपोर्ट',
      tabProfile: 'प्रोफाइल'
    },
    as: {
      appName: 'সতৰ্ক (SATARK)',
      location: 'স্থান',
      status: 'বৰ্তমান স্থিতি',
      action: 'প্ৰয়োজনীয় ব্যৱস্থা',
      details: 'বিৱৰণ',
      emergencyAlert: 'জৰুৰীকালীন ভূমিস্খলন সতৰ্কবাৰ্তা',
      emergencySub: 'পাহাৰীয়া ঢালত প্ৰচণ্ড বৰষুণৰ সীমা অতিক্ৰম। সাৱধান হওক।',
      sos: 'জৰুৰীকালীন এছঅ’এছ',
      sosSub: 'বিপদ সংকেত',
      report: 'ক্ষতি ৰিপোৰ্ট',
      reportSub: 'ফটো আৰু জিপিএছ',
      safeRoute: 'সুৰক্ষিত পথ',
      safeRouteSub: 'আশ্ৰয় শিবিৰ',
      contacts: 'জৰুৰীকালীন ১১২',
      contactsSub: 'এনডিআৰএফ / এছডিআৰএফ',
      offlineTitle: 'অফলাইন উদ্ধাৰ মোড',
      offlineDesc: 'ইণ্টাৰনেট অবিহনে বিপদ সংকেত আৰু জৰুৰীকালীন সহায়িকা।',
      howItWorks: 'ই কেনেদৰে কাম কৰে ›',
      weatherTitle: 'বতৰ আৰু ভূমিস্খলন আশংকা',
      temp: 'উত্তাপ',
      weather: 'বতৰ',
      humidity: 'মাটিৰ আৰ্দ্ৰতা',
      viewMap: 'মানচিত্ৰ চাওক ›',
      tabHome: 'মূলপৃষ্ঠা',
      tabAlerts: 'সতৰ্কবাৰ্তা',
      tabMap: 'মেপ',
      tabReport: 'ৰিপোৰ্ট',
      tabProfile: 'প্ৰফাইল'
    }
  }[lang];

  const isRed = data?.assessment?.level === 'RED';
  const isAmber = data?.assessment?.level === 'AMBER';
  const riskScorePct = data?.assessment?.score ? Math.round(data.assessment.score * 100) : 48;
  const tempVal = 24;
  const rain24Val = data?.weather?.rain_24h_mm ?? 48.5;
  const moistureVal = data?.weather?.soil_moisture ? Math.round(data.weather.soil_moisture * 100) : 84;

  if (activeOfficerMode) {
    return (
      <div style={{ minHeight: '100vh', background: '#161B22', color: '#f8fafc', display: 'flex', flexDirection: 'column' }}>
        <div style={{ background: '#0f172a', padding: '10px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #334155' }}>
          <button onClick={() => setActiveOfficerMode(false)} style={{ background: '#1e293b', color: '#38bdf8', border: '1px solid #334155', borderRadius: '6px', padding: '6px 12px', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer' }}>
            ← Back to Citizen App
          </button>
          <span style={{ fontSize: '0.82rem', color: '#f59e0b', fontWeight: 800 }}>🛡️ OFFICER COMMAND MODE</span>
        </div>
        <div style={{ flex: 1, overflowY: 'auto' }}>
          <OfficialDashboard />
        </div>
      </div>
    );
  }

  if (activeResponderMode) {
    return (
      <div style={{ minHeight: '100vh', background: '#0b1329', color: '#f8fafc', display: 'flex', flexDirection: 'column' }}>
        <div style={{ background: '#0f172a', padding: '10px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #ea580c' }}>
          <button onClick={() => setActiveResponderMode(false)} style={{ background: '#1e293b', color: '#fb923c', border: '1px solid #ea580c', borderRadius: '6px', padding: '6px 12px', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer' }}>
            ← Back to Citizen App
          </button>
          <span style={{ fontSize: '0.82rem', color: '#ea580c', fontWeight: 800 }}>🚑 TACTICAL RESPONDER MODE</span>
        </div>
        <div style={{ flex: 1, overflowY: 'auto' }}>
          <ResponderPortal />
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#070d1a',
      color: '#f8fafc',
      fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
      display: 'flex',
      flexDirection: 'column',
      paddingBottom: '70px',
      boxSizing: 'border-box'
    }}>

      {/* ── 1. COMPACT SATARK MOBILE HEADER ── */}
      <header style={{
        height: '56px',
        background: 'rgba(11, 19, 41, 0.96)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(56, 189, 248, 0.2)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 14px',
        position: 'sticky',
        top: 0,
        zIndex: 1000,
        boxSizing: 'border-box'
      }}>
        {/* Left: Emblem Logo (no text in logo) + Separate Title + Location */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
          <img
            src="/satark_emblem.png"
            alt="SATARK Emblem"
            style={{
              width: '34px',
              height: '34px',
              objectFit: 'contain',
              flexShrink: 0
            }}
          />
          <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
            <span style={{
              fontWeight: 900,
              fontSize: '1.08rem',
              letterSpacing: '0.04em',
              color: '#ffffff',
              lineHeight: 1.1
            }}>
              SATARK
            </span>
            <button
              onClick={() => setShowZoneSheet(true)}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#38bdf8',
                fontSize: '0.68rem',
                fontWeight: 600,
                textAlign: 'left',
                padding: 0,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '2px',
                marginTop: '1px',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                maxWidth: '150px'
              }}
            >
              <span>📍 {selectedZone.name.split(',')[0]}</span>
              <span style={{ fontSize: '0.6rem' }}>▾</span>
            </button>
          </div>
        </div>

        {/* Right: Compact Language Selector (EN ▾) + Siren Quick Toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
          <button
            onClick={() => setShowLangSheet(true)}
            style={{
              background: 'rgba(30, 41, 59, 0.8)',
              border: '1px solid rgba(56, 189, 248, 0.3)',
              borderRadius: '8px',
              padding: '5px 10px',
              fontSize: '0.74rem',
              fontWeight: 800,
              color: '#38bdf8',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            <span>{lang.toUpperCase()}</span>
            <span style={{ fontSize: '0.65rem' }}>▾</span>
          </button>

          <button
            onClick={() => isPlaying ? stopSiren() : playCriticalSiren()}
            aria-label="Siren test"
            style={{
              width: '34px',
              height: '34px',
              borderRadius: '8px',
              background: isPlaying ? '#dc2626' : 'rgba(239, 68, 68, 0.15)',
              border: '1px solid #ef4444',
              color: '#ffffff',
              fontSize: '1rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 0,
              animation: isPlaying ? 'pulse 1s infinite' : 'none'
            }}
          >
            {isPlaying ? '🔇' : '🚨'}
          </button>
        </div>
      </header>

      {/* ── MAIN TAB CONTENT ROUTING ── */}
      {activeTab === 'home' && (
        <main style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: '14px' }}>

          {/* ── 2. EMERGENCY ALERT (COMPACT & READABLE) ── */}
          <div style={{
            background: isRed
              ? 'linear-gradient(135deg, rgba(220, 38, 38, 0.3), rgba(153, 27, 27, 0.4))'
              : 'linear-gradient(135deg, rgba(234, 88, 12, 0.25), rgba(180, 83, 9, 0.35))',
            border: `1px solid ${isRed ? '#ef4444' : '#f59e0b'}`,
            borderRadius: '12px',
            padding: '10px 12px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            boxShadow: isRed ? '0 4px 16px rgba(239, 68, 68, 0.2)' : 'none'
          }}>
            <div style={{
              width: '32px', height: '32px', borderRadius: '8px',
              background: isRed ? '#dc2626' : '#ea580c',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '16px', flexShrink: 0
            }}>
              🚨
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '0.78rem', fontWeight: 800, color: isRed ? '#fca5a5' : '#fde68a', textTransform: 'uppercase', letterSpacing: '0.02em' }}>
                {t.emergencyAlert}
              </div>
              <div style={{ fontSize: '0.72rem', color: '#e2e8f0', marginTop: '1px', lineHeight: 1.25 }}>
                {isRed ? `Critical landslide threat detected in ${selectedZone.name.split(',')[0]}. Follow detour routes.` : t.emergencySub}
              </div>
            </div>
            <button
              onClick={() => isSpeaking ? stopSpeaking() : speakAlert(selectedZone.name, data?.assessment?.level || 'AMBER', data?.assessment?.action_protocol || '')}
              style={{
                background: isSpeaking ? '#2563eb' : 'rgba(255,255,255,0.1)',
                border: '1px solid rgba(255,255,255,0.2)',
                color: '#ffffff',
                borderRadius: '6px',
                padding: '5px 8px',
                fontSize: '0.7rem',
                fontWeight: 700,
                cursor: 'pointer',
                flexShrink: 0
              }}
            >
              {isSpeaking ? '⏹️ Voice' : '🗣️ Listen'}
            </button>
          </div>

          {/* ── 3. CURRENT EMERGENCY STATUS CARD ── */}
          <div style={{
            background: 'linear-gradient(145deg, #0d172e, #090e1d)',
            border: '1px solid rgba(56, 189, 248, 0.25)',
            borderRadius: '16px',
            padding: '16px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: '6px',
                background: isRed ? 'rgba(239, 68, 68, 0.2)' : isAmber ? 'rgba(245, 158, 11, 0.2)' : 'rgba(34, 197, 94, 0.15)',
                border: `1px solid ${isRed ? '#ef4444' : isAmber ? '#f59e0b' : '#22c55e'}`,
                borderRadius: '20px',
                padding: '4px 10px',
                fontSize: '0.74rem',
                fontWeight: 800,
                color: isRed ? '#fca5a5' : isAmber ? '#fde047' : '#86efac'
              }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: isRed ? '#ef4444' : isAmber ? '#f59e0b' : '#22c55e' }} />
                {isRed ? 'CRITICAL HAZARD' : isAmber ? 'ELEVATED RISK' : 'NORMAL / STABLE'}
              </div>

              <div style={{ fontSize: '0.74rem', color: '#94a3b8', fontWeight: 600 }}>
                MCDA Index: <strong style={{ color: '#38bdf8' }}>{riskScorePct}%</strong>
              </div>
            </div>

            <div style={{ fontSize: '1.02rem', fontWeight: 800, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>📍 {selectedZone.name}</span>
            </div>

            <div style={{
              background: 'rgba(15, 23, 42, 0.8)',
              border: '1px solid rgba(51, 65, 85, 0.6)',
              borderRadius: '10px',
              padding: '10px 12px',
              fontSize: '0.78rem',
              color: '#e2e8f0',
              lineHeight: 1.35
            }}>
              <strong style={{ color: '#fb923c' }}>{t.action}: </strong>
              {data?.assessment?.action_protocol || 'Maintain heightened situational awareness on steep hill roads. Avoid valley crossings during active rainfall.'}
            </div>

            <button
              onClick={() => setShowStatusDetails(!showStatusDetails)}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#38bdf8',
                fontSize: '0.76rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '6px 2px 0 2px'
              }}
            >
              <span>{showStatusDetails ? 'Hide Analytical Breakdown' : 'View Detailed Terrain Telemetry'}</span>
              <span>{showStatusDetails ? '▲' : '›'}</span>
            </button>

            {showStatusDetails && (
              <div style={{
                background: 'rgba(10, 16, 32, 0.95)',
                border: '1px solid rgba(56, 189, 248, 0.15)',
                borderRadius: '10px',
                padding: '12px',
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '8px',
                fontSize: '0.72rem',
                marginTop: '4px'
              }}>
                <div><span style={{ color: '#94a3b8' }}>🌧️ 24h Rain:</span> <strong>{rain24Val} mm</strong></div>
                <div><span style={{ color: '#94a3b8' }}>💧 Soil Moisture:</span> <strong>{moistureVal}%</strong></div>
                <div><span style={{ color: '#94a3b8' }}>⛰️ Slope Angle:</span> <strong>{selectedZone.slope}°</strong></div>
                <div><span style={{ color: '#94a3b8' }}>🛣️ NH Corridor:</span> <strong style={{ color: '#4ade80' }}>OPEN (Caution)</strong></div>
                <div style={{ gridColumn: '1 / -1', marginTop: '4px', paddingTop: '6px', borderTop: '1px solid rgba(51, 65, 85, 0.5)', color: '#cbd5e1' }}>
                  🏥 Nearest Safe Shelter: <strong>{selectedZone.name.split(',')[0]} Higher Secondary Hall (1.4 km)</strong>
                </div>
              </div>
            )}
          </div>

          {/* ── 4. TOUCH-FRIENDLY QUICK ACTIONS ── */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <button
              onClick={() => setShowSosSheet(true)}
              style={{
                background: 'linear-gradient(135deg, #ef4444, #b91c1c)',
                border: 'none',
                borderRadius: '14px',
                padding: '14px 12px',
                color: '#ffffff',
                textAlign: 'left',
                display: 'flex',
                flexDirection: 'column',
                gap: '3px',
                boxShadow: '0 4px 14px rgba(239, 68, 68, 0.35)',
                cursor: 'pointer'
              }}
            >
              <div style={{ fontSize: '1.25rem' }}>🚨</div>
              <div style={{ fontWeight: 900, fontSize: '0.84rem', letterSpacing: '0.02em' }}>{t.sos}</div>
              <div style={{ fontSize: '0.68rem', color: '#fee2e2', opacity: 0.9 }}>{t.sosSub}</div>
            </button>

            <button
              onClick={() => setActiveTab('report')}
              style={{
                background: 'linear-gradient(135deg, #16a34a, #15803d)',
                border: 'none',
                borderRadius: '14px',
                padding: '14px 12px',
                color: '#ffffff',
                textAlign: 'left',
                display: 'flex',
                flexDirection: 'column',
                gap: '3px',
                boxShadow: '0 4px 14px rgba(22, 163, 74, 0.35)',
                cursor: 'pointer'
              }}
            >
              <div style={{ fontSize: '1.25rem' }}>📸</div>
              <div style={{ fontWeight: 900, fontSize: '0.84rem', letterSpacing: '0.02em' }}>{t.report}</div>
              <div style={{ fontSize: '0.68rem', color: '#dcfce7', opacity: 0.9 }}>{t.reportSub}</div>
            </button>

            <button
              onClick={() => setShowShelterSheet(true)}
              style={{
                background: 'linear-gradient(135deg, #0284c7, #0369a1)',
                border: 'none',
                borderRadius: '14px',
                padding: '14px 12px',
                color: '#ffffff',
                textAlign: 'left',
                display: 'flex',
                flexDirection: 'column',
                gap: '3px',
                boxShadow: '0 4px 14px rgba(2, 132, 199, 0.35)',
                cursor: 'pointer'
              }}
            >
              <div style={{ fontSize: '1.25rem' }}>🗺️</div>
              <div style={{ fontWeight: 900, fontSize: '0.84rem', letterSpacing: '0.02em' }}>{t.safeRoute}</div>
              <div style={{ fontSize: '0.68rem', color: '#e0f2fe', opacity: 0.9 }}>{t.safeRouteSub}</div>
            </button>

            <button
              onClick={() => setShowContactsSheet(true)}
              style={{
                background: 'linear-gradient(135deg, #7c3aed, #6d28d9)',
                border: 'none',
                borderRadius: '14px',
                padding: '14px 12px',
                color: '#ffffff',
                textAlign: 'left',
                display: 'flex',
                flexDirection: 'column',
                gap: '3px',
                boxShadow: '0 4px 14px rgba(124, 58, 237, 0.35)',
                cursor: 'pointer'
              }}
            >
              <div style={{ fontSize: '1.25rem' }}>📞</div>
              <div style={{ fontWeight: 900, fontSize: '0.84rem', letterSpacing: '0.02em' }}>{t.contacts}</div>
              <div style={{ fontSize: '0.68rem', color: '#ede9fe', opacity: 0.9 }}>{t.contactsSub}</div>
            </button>
          </div>

          {/* ── 5. OFFLINE RESCUE MODE CARD ── */}
          <div style={{
            background: 'linear-gradient(145deg, #0b192e, #091324)',
            border: '1px solid rgba(14, 165, 233, 0.35)',
            borderRadius: '14px',
            padding: '14px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontWeight: 800, fontSize: '0.88rem', color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>📴</span> {t.offlineTitle}
              </div>
              <div style={{
                background: isOnline ? 'rgba(34, 197, 94, 0.15)' : 'rgba(234, 88, 12, 0.2)',
                border: `1px solid ${isOnline ? '#22c55e' : '#ea580c'}`,
                borderRadius: '12px',
                padding: '2px 8px',
                fontSize: '0.68rem',
                fontWeight: 800,
                color: isOnline ? '#86efac' : '#fdba74'
              }}>
                {isOnline ? '🟢 ONLINE' : '🟠 OFFLINE MESH READY'}
              </div>
            </div>

            <p style={{ fontSize: '0.74rem', color: '#cbd5e1', margin: 0, lineHeight: 1.35 }}>
              {t.offlineDesc}
            </p>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '2px' }}>
              <button
                onClick={() => setShowOfflineSheet(true)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#38bdf8',
                  fontSize: '0.76rem',
                  fontWeight: 700,
                  padding: 0,
                  cursor: 'pointer'
                }}
              >
                {t.howItWorks}
              </button>

              <button
                onClick={() => navigate('/offline-rescue')}
                style={{
                  background: 'rgba(56, 189, 248, 0.15)',
                  border: '1px solid #38bdf8',
                  color: '#38bdf8',
                  borderRadius: '6px',
                  padding: '4px 10px',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Open Rescue Tools ›
              </button>
            </div>
          </div>

          {/* ── 6. WEATHER & LANDSLIDE RISK CARD ── */}
          <div style={{
            background: 'linear-gradient(145deg, #0e172a, #0b1120)',
            border: '1px solid rgba(51, 65, 85, 0.6)',
            borderRadius: '14px',
            padding: '14px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontWeight: 800, fontSize: '0.88rem', color: '#f8fafc' }}>
                ⛅ {t.weatherTitle}
              </div>
              <button
                onClick={() => setActiveTab('map')}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#38bdf8',
                  fontSize: '0.76rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  padding: 0
                }}
              >
                {t.viewMap}
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px', textAlign: 'center' }}>
              <div style={{ background: '#1e293b', borderRadius: '10px', padding: '8px 4px' }}>
                <div style={{ fontSize: '0.65rem', color: '#94a3b8' }}>{t.temp}</div>
                <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#f8fafc', marginTop: '2px' }}>{tempVal}°C</div>
              </div>
              <div style={{ background: '#1e293b', borderRadius: '10px', padding: '8px 4px' }}>
                <div style={{ fontSize: '0.65rem', color: '#94a3b8' }}>{t.weather}</div>
                <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#60a5fa', marginTop: '2px' }}>🌧️ Rain</div>
              </div>
              <div style={{ background: '#1e293b', borderRadius: '10px', padding: '8px 4px' }}>
                <div style={{ fontSize: '0.65rem', color: '#94a3b8' }}>{t.humidity}</div>
                <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#38bdf8', marginTop: '2px' }}>{moistureVal}%</div>
              </div>
              <div style={{ background: '#1e293b', borderRadius: '10px', padding: '8px 4px' }}>
                <div style={{ fontSize: '0.65rem', color: '#94a3b8' }}>Slope Risk</div>
                <div style={{ fontSize: '0.9rem', fontWeight: 800, color: isRed ? '#f87171' : '#facc15', marginTop: '2px' }}>{riskScorePct}%</div>
              </div>
            </div>
          </div>

        </main>
      )}

      {/* ── ALERTS TAB ── */}
      {activeTab === 'alerts' && (
        <div style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 800, margin: '0 0 6px 0', color: '#f8fafc' }}>
            🔔 Live Disaster Alert Feed (CAP 1.2)
          </h2>
          <div style={{ background: '#0f172a', border: '1px solid #ef4444', borderRadius: '12px', padding: '12px' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#f87171' }}>🔴 RED SEVERE WARNING — MEGHALAYA & ASSAM</div>
            <div style={{ fontSize: '0.78rem', color: '#e2e8f0', marginTop: '4px' }}>
              Geological Survey of India (GSI) rainfall threshold exceeded (&gt;120mm/72h). Stay away from vulnerable slope cuts along NH-6.
            </div>
            <div style={{ fontSize: '0.68rem', color: '#64748b', marginTop: '6px' }}>SACHET / NDMA Broadcast Feed · Realtime</div>
          </div>

          <div style={{ background: '#0f172a', border: '1px solid #f59e0b', borderRadius: '12px', padding: '12px' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#fbbf24' }}>🟠 ORANGE ADVISORY — AIZAWL SLOPES</div>
            <div style={{ fontSize: '0.78rem', color: '#e2e8f0', marginTop: '4px' }}>
              Soil moisture saturation at 88%. Landslide probability elevated. Continuous monitoring in effect.
            </div>
            <div style={{ fontSize: '0.68rem', color: '#64748b', marginTop: '6px' }}>Mizoram State Disaster Management Authority</div>
          </div>

          <div style={{ marginTop: '10px' }}>
            <button
              onClick={() => isPlaying ? stopSiren() : playCriticalSiren()}
              style={{
                width: '100%',
                background: isPlaying ? '#dc2626' : '#1e293b',
                border: '1px solid #ef4444',
                color: '#ffffff',
                borderRadius: '10px',
                padding: '12px',
                fontWeight: 800,
                fontSize: '0.84rem',
                cursor: 'pointer'
              }}
            >
              {isPlaying ? '🔇 MUTE EMERGENCY SIREN' : '🔊 TEST LOUD EMERGENCY SIREN (105dB)'}
            </button>
          </div>
        </div>
      )}

      {/* ── MAP TAB ── */}
      {activeTab === 'map' && (
        <div style={{ height: 'calc(100vh - 126px)', position: 'relative' }}>
          <PublicRiskMap />
        </div>
      )}

      {/* ── REPORT TAB ── */}
      {activeTab === 'report' && (
        <div style={{ height: 'calc(100vh - 126px)', overflowY: 'auto', background: '#0a0f1d' }}>
          <ReportFormPage />
        </div>
      )}

      {/* ── PROFILE TAB ── */}
      {activeTab === 'profile' && (
        <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <h2 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0, color: '#f8fafc' }}>
            👤 Citizen Profile &amp; Responder Access
          </h2>

          <div style={{ background: '#0f172a', border: '1px solid #334155', borderRadius: '14px', padding: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>
                👤
              </div>
              <div>
                <div style={{ fontWeight: 800, fontSize: '0.95rem' }}>{citizenProfile?.fullName || 'Citizen User'}</div>
                <div style={{ fontSize: '0.74rem', color: '#94a3b8' }}>
                  {isAuth ? 'Verified Mobile Session' : 'Demo Mode Active'}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.8rem' }}>
              <div><span style={{ color: '#94a3b8' }}>Preferred Language:</span> <strong>{lang.toUpperCase()}</strong></div>
              <div><span style={{ color: '#94a3b8' }}>Emergency Helpline:</span> <strong>112 (Police) / 1078 (NDRF)</strong></div>
              <div><span style={{ color: '#94a3b8' }}>Offline Sync Queue:</span> <strong>Active (IndexedDB)</strong></div>
            </div>
          </div>

          <div style={{ background: '#0d172e', border: '1px solid #ea580c', borderRadius: '14px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ fontWeight: 800, fontSize: '0.88rem', color: '#fb923c' }}>
              🛡️ Disaster Official &amp; Tactical Mode
            </div>
            <p style={{ fontSize: '0.74rem', color: '#cbd5e1', margin: 0 }}>
              Authorized officers and ground responders can switch into Tactical Response Mode or GIS Command Dashboard.
            </p>
            <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
              <button
                onClick={() => setActiveOfficerMode(true)}
                style={{
                  flex: 1,
                  background: '#2563eb',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '10px',
                  fontSize: '0.78rem',
                  fontWeight: 800,
                  cursor: 'pointer'
                }}
              >
                Officer Mode
              </button>
              <button
                onClick={() => setActiveResponderMode(true)}
                style={{
                  flex: 1,
                  background: '#ea580c',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '10px',
                  fontSize: '0.78rem',
                  fontWeight: 800,
                  cursor: 'pointer'
                }}
              >
                Responder Mode
              </button>
            </div>
          </div>

          <button
            onClick={() => navigate('/login')}
            style={{
              background: 'transparent',
              border: '1px solid #64748b',
              color: '#94a3b8',
              borderRadius: '10px',
              padding: '12px',
              fontWeight: 700,
              fontSize: '0.82rem',
              cursor: 'pointer',
              marginTop: '8px'
            }}
          >
            Switch Account / Login Portal ›
          </button>
        </div>
      )}

      {/* ── 7. NATIVE ANDROID BOTTOM NAVIGATION BAR ── */}
      <nav style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        height: '60px',
        background: 'rgba(11, 19, 41, 0.98)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderTop: '1px solid rgba(56, 189, 248, 0.25)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-around',
        zIndex: 1000,
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        boxSizing: 'border-box'
      }}>
        {[
          { id: 'home', icon: '🏠', label: t.tabHome },
          { id: 'alerts', icon: '🔔', label: t.tabAlerts },
          { id: 'map', icon: '🗺️', label: t.tabMap },
          { id: 'report', icon: '📸', label: t.tabReport },
          { id: 'profile', icon: '👤', label: t.tabProfile },
        ].map(tab => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              style={{
                background: 'transparent',
                border: 'none',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '2px',
                color: isActive ? '#38bdf8' : '#94a3b8',
                cursor: 'pointer',
                flex: 1,
                height: '100%',
                padding: 0,
                position: 'relative'
              }}
            >
              {isActive && (
                <div style={{
                  position: 'absolute',
                  top: 0,
                  width: '32px',
                  height: '3px',
                  background: '#38bdf8',
                  borderRadius: '0 0 4px 4px'
                }} />
              )}
              <span style={{ fontSize: '1.15rem' }}>{tab.icon}</span>
              <span style={{ fontSize: '0.68rem', fontWeight: isActive ? 800 : 500 }}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </nav>

      {/* ── 8. LANGUAGE SELECTION BOTTOM SHEET / DROPDOWN ── */}
      {showLangSheet && (
        <div
          onClick={() => setShowLangSheet(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.7)',
            backdropFilter: 'blur(4px)',
            zIndex: 2000,
            display: 'flex',
            alignItems: 'flex-end'
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              background: '#0f172a',
              borderRadius: '20px 20px 0 0',
              borderTop: '2px solid #38bdf8',
              padding: '20px 16px 30px 16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontWeight: 800, fontSize: '0.98rem', color: '#f8fafc' }}>
                🌐 Select Language / भाषा चुनें
              </div>
              <button onClick={() => setShowLangSheet(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '1.2rem', cursor: 'pointer' }}>✕</button>
            </div>

            {[
              { code: 'en', label: 'English (Default)' },
              { code: 'hi', label: 'हिंदी (Hindi)' },
              { code: 'as', label: 'অসমীয়া (Assamese)' },
            ].map(item => (
              <button
                key={item.code}
                onClick={() => { setLang(item.code as any); setShowLangSheet(false); }}
                style={{
                  background: lang === item.code ? 'rgba(56, 189, 248, 0.15)' : '#1e293b',
                  border: lang === item.code ? '1px solid #38bdf8' : '1px solid #334155',
                  color: lang === item.code ? '#38bdf8' : '#f8fafc',
                  borderRadius: '10px',
                  padding: '12px 16px',
                  fontSize: '0.88rem',
                  fontWeight: 700,
                  textAlign: 'left',
                  cursor: 'pointer',
                  display: 'flex',
                  justifyContent: 'space-between'
                }}
              >
                <span>{item.label}</span>
                {lang === item.code && <span>✓</span>}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── 9. ZONE SELECTOR BOTTOM SHEET ── */}
      {showZoneSheet && (
        <div
          onClick={() => setShowZoneSheet(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.7)',
            backdropFilter: 'blur(4px)',
            zIndex: 2000,
            display: 'flex',
            alignItems: 'flex-end'
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              background: '#0f172a',
              borderRadius: '20px 20px 0 0',
              borderTop: '2px solid #38bdf8',
              padding: '20px 16px 30px 16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
              maxHeight: '75vh',
              overflowY: 'auto'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontWeight: 800, fontSize: '0.98rem', color: '#f8fafc' }}>
                📍 Select Monitoring Region
              </div>
              <button onClick={() => setShowZoneSheet(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '1.2rem', cursor: 'pointer' }}>✕</button>
            </div>

            {ZONES.map(z => (
              <button
                key={z.name}
                onClick={() => { setSelectedZone(z); setShowZoneSheet(false); }}
                style={{
                  background: selectedZone.name === z.name ? 'rgba(56, 189, 248, 0.15)' : '#1e293b',
                  border: selectedZone.name === z.name ? '1px solid #38bdf8' : '1px solid #334155',
                  color: selectedZone.name === z.name ? '#38bdf8' : '#f8fafc',
                  borderRadius: '10px',
                  padding: '12px 14px',
                  fontSize: '0.84rem',
                  fontWeight: 700,
                  textAlign: 'left',
                  cursor: 'pointer'
                }}
              >
                <div>{z.name}</div>
                <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '2px' }}>
                  {z.district} · {z.state} · Slope: {z.slope}°
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── 10. SOS DISTRESS BOTTOM SHEET ── */}
      {showSosSheet && (
        <div
          onClick={() => setShowSosSheet(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.85)',
            backdropFilter: 'blur(6px)',
            zIndex: 2000,
            display: 'flex',
            alignItems: 'flex-end'
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              background: '#180808',
              borderRadius: '20px 20px 0 0',
              borderTop: '3px solid #ef4444',
              padding: '24px 16px 36px 16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
              textAlign: 'center'
            }}
          >
            <div style={{ fontSize: '2.5rem' }}>🚨</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#f87171' }}>
              SOS DISTRESS BEACON ACTIVE
            </div>
            <p style={{ fontSize: '0.8rem', color: '#e2e8f0', margin: 0, lineHeight: 1.4 }}>
              Broadcasting your emergency coordinates to nearby rescue teams and local disaster officials.
            </p>

            <div style={{ background: '#260c0c', border: '1px solid #ef4444', borderRadius: '10px', padding: '10px', fontSize: '0.82rem', fontFamily: 'monospace' }}>
              📍 {selectedZone.lat.toFixed(4)}°N, {selectedZone.lon.toFixed(4)}°E ({selectedZone.name})
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
              <button
                onClick={() => isPlaying ? stopSiren() : playCriticalSiren()}
                style={{
                  flex: 1,
                  background: isPlaying ? '#450a0a' : '#ef4444',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '10px',
                  padding: '12px',
                  fontWeight: 900,
                  fontSize: '0.86rem',
                  cursor: 'pointer'
                }}
              >
                {isPlaying ? '🔇 Stop Siren' : '🔊 Sound 105dB Siren'}
              </button>

              <button
                onClick={() => {
                  if (navigator.clipboard) {
                    navigator.clipboard.writeText(`EMERGENCY SOS: Location ${selectedZone.name} (${selectedZone.lat}, ${selectedZone.lon})`);
                    alert('SOS Coordinates copied to clipboard!');
                  }
                }}
                style={{
                  flex: 1,
                  background: '#1e293b',
                  color: '#38bdf8',
                  border: '1px solid #334155',
                  borderRadius: '10px',
                  padding: '12px',
                  fontWeight: 800,
                  fontSize: '0.86rem',
                  cursor: 'pointer'
                }}
              >
                📋 Copy GPS
              </button>
            </div>

            <button
              onClick={() => setShowSosSheet(false)}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#94a3b8',
                fontSize: '0.82rem',
                cursor: 'pointer',
                marginTop: '6px'
              }}
            >
              Cancel / Close Beacon
            </button>
          </div>
        </div>
      )}

      {/* ── 11. EMERGENCY CONTACTS DIALER SHEET ── */}
      {showContactsSheet && (
        <div
          onClick={() => setShowContactsSheet(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.7)',
            backdropFilter: 'blur(4px)',
            zIndex: 2000,
            display: 'flex',
            alignItems: 'flex-end'
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              background: '#0f172a',
              borderRadius: '20px 20px 0 0',
              borderTop: '2px solid #7c3aed',
              padding: '20px 16px 30px 16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontWeight: 800, fontSize: '0.98rem', color: '#f8fafc' }}>
                📞 Emergency Response Contacts
              </div>
              <button onClick={() => setShowContactsSheet(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '1.2rem', cursor: 'pointer' }}>✕</button>
            </div>

            {[
              { title: 'National Emergency Helpline (All India)', num: '112', icon: '🚨' },
              { title: 'National Disaster Response Force (NDRF)', num: '1078', icon: '🛡️' },
              { title: 'State Disaster Management (SDMA)', num: '1070', icon: '⛰️' },
              { title: 'Emergency Ambulance Services', num: '108', icon: '🚑' },
            ].map(c => (
              <a
                key={c.num}
                href={`tel:${c.num}`}
                style={{
                  background: '#1e293b',
                  border: '1px solid #334155',
                  borderRadius: '10px',
                  padding: '12px 14px',
                  textDecoration: 'none',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}
              >
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.84rem' }}>{c.icon} {c.title}</div>
                  <div style={{ fontSize: '0.72rem', color: '#38bdf8', marginTop: '2px' }}>Dial: {c.num}</div>
                </div>
                <div style={{ background: '#16a34a', borderRadius: '8px', padding: '6px 12px', fontSize: '0.78rem', fontWeight: 800 }}>
                  CALL
                </div>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* ── 12. OFFLINE RESCUE 'HOW IT WORKS' SHEET ── */}
      {showOfflineSheet && (
        <div
          onClick={() => setShowOfflineSheet(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.7)',
            backdropFilter: 'blur(4px)',
            zIndex: 2000,
            display: 'flex',
            alignItems: 'flex-end'
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              background: '#0f172a',
              borderRadius: '20px 20px 0 0',
              borderTop: '2px solid #0284c7',
              padding: '20px 16px 30px 16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontWeight: 800, fontSize: '0.98rem', color: '#38bdf8' }}>
                📴 How Offline Rescue Mode Works
              </div>
              <button onClick={() => setShowOfflineSheet(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '1.2rem', cursor: 'pointer' }}>✕</button>
            </div>

            <div style={{ fontSize: '0.78rem', color: '#cbd5e1', lineHeight: 1.45, display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div><strong>1. Bluetooth Mesh Relay:</strong> Even with cellular network towers destroyed, nearby phones relay emergency beacons peer-to-peer.</div>
              <div><strong>2. IndexedDB Offline Storage:</strong> All hazard reports and safe routes are cached on your phone storage for zero-connectivity access.</div>
              <div><strong>3. Vector Compass:</strong> Shows direct line-of-sight distance and bearing to the nearest emergency relief camp.</div>
            </div>

            <button
              onClick={() => { setShowOfflineSheet(false); navigate('/offline-rescue'); }}
              style={{
                background: 'linear-gradient(135deg, #0284c7, #2563eb)',
                color: '#ffffff',
                border: 'none',
                borderRadius: '10px',
                padding: '12px',
                fontWeight: 800,
                fontSize: '0.84rem',
                cursor: 'pointer',
                marginTop: '6px'
              }}
            >
              Open Full Offline Rescue Interface ›
            </button>
          </div>
        </div>
      )}

      {/* ── 13. SAFE ROUTE & SHELTER SHEET ── */}
      {showShelterSheet && (
        <div
          onClick={() => setShowShelterSheet(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.7)',
            backdropFilter: 'blur(4px)',
            zIndex: 2000,
            display: 'flex',
            alignItems: 'flex-end'
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              background: '#0f172a',
              borderRadius: '20px 20px 0 0',
              borderTop: '2px solid #0284c7',
              padding: '20px 16px 30px 16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontWeight: 800, fontSize: '0.98rem', color: '#38bdf8' }}>
                🏥 Designated Safe Shelter &amp; Evacuation
              </div>
              <button onClick={() => setShowShelterSheet(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '1.2rem', cursor: 'pointer' }}>✕</button>
            </div>

            <div style={{ background: '#1e293b', borderRadius: '10px', padding: '12px', fontSize: '0.8rem' }}>
              <div style={{ fontWeight: 800, color: '#f8fafc', fontSize: '0.88rem' }}>
                {selectedZone.name.split(',')[0]} Government Relief Camp
              </div>
              <div style={{ color: '#38bdf8', marginTop: '2px' }}>
                Distance: ~1.4 km · Capacity: 450 persons · Medical Unit: Active
              </div>
              <div style={{ color: '#94a3b8', fontSize: '0.72rem', marginTop: '6px' }}>
                Detour Advisory: High ridge bypass road active; avoid valley highway due to waterlogging.
              </div>
            </div>

            <button
              onClick={() => { setShowShelterSheet(false); setActiveTab('map'); }}
              style={{
                background: '#0284c7',
                color: '#ffffff',
                border: 'none',
                borderRadius: '10px',
                padding: '12px',
                fontWeight: 800,
                fontSize: '0.84rem',
                cursor: 'pointer'
              }}
            >
              Show Evacuation Path on Map ›
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
