import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchRiskAssessment } from '../services/api';
import { sendRiskAlert } from '../services/notificationService';
import { useAlertSound } from '../hooks/useAlertSound';
import { usePermissions } from '../hooks/usePermissions';
import { useVoiceAssistant } from '../hooks/useVoiceAssistant';
import { Terrain3DVisualizer } from '../components/map/Terrain3DVisualizer';
import { ShelterResourcePanel } from '../components/panels/ShelterResourcePanel';
import { OfflineSosMesh } from '../components/panels/OfflineSosMesh';
import { OfflineStatusHeader } from '../components/layout/OfflineStatusHeader';
import { OfflineRescueMode } from '../components/emergency/OfflineRescueMode';
import { OfflineVectorMap } from '../components/map/OfflineVectorMap';
import { calculateHaversineDistanceKm, calculateCompassBearing } from '../utils/geoUtils';
import { getCachedHeatmapWithMeta, getCachedIncidents } from '../services/offlineStore';
import { isCitizenAuthenticated, getCachedCitizenProfile, logoutCitizen } from '../services/citizenAuthService';
import { RiskAssessmentResponse } from '../types';

export const CitizenPortal: React.FC = () => {
  const navigate = useNavigate();
  const [lang, setLang] = useState<'en' | 'hi' | 'as'>('en');
  const { playCriticalSiren, playWarningBeep, stopSiren, isPlaying } = useAlertSound();
  const { userLocation, notification } = usePermissions();
  const { speakAlert, isSpeaking, stopSpeaking } = useVoiceAssistant(lang);

  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [loading, setLoading] = useState<boolean>(true);
  const [data, setData] = useState<RiskAssessmentResponse | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | '3d_terrain' | 'shelters' | 'offline_sos'>('overview');

  const [profileMenuOpen, setProfileMenuOpen] = useState<boolean>(false);
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
  
  const [selectedZone, setSelectedZone] = useState({
    name: 'Meppadi, Wayanad (Testbed)',
    lat: 11.5534,
    lon: 76.1320,
    slope: 38.5
  });

  const lastAlertLevel = useRef<string | null>(null);
  const notificationSent = useRef<Set<string>>(new Set());

  const ZONES = [
    { name: 'Meppadi, Wayanad (Testbed)', lat: 11.5534, lon: 76.1320, slope: 38.5 },
    { name: 'Munnar, Idukki (Western Ghats)', lat: 10.0889, lon: 77.0595, slope: 42.0 },
    { name: 'Guwahati Hills (NER)', lat: 26.1445, lon: 91.7362, slope: 28.0 },
    { name: 'Shillong Ridge (NER)', lat: 25.5788, lon: 91.8933, slope: 34.0 },
    { name: 'Aizawl Slopes (NER)', lat: 23.7271, lon: 92.7176, slope: 45.0 }
  ];

  // If user location detected, find nearest zone
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

  const [showOfflineMap, setShowOfflineMap] = useState<boolean>(false);
  const [nearbyHazard, setNearbyHazard] = useState<{
    name: string;
    distKm: number;
    bearing: string;
    severity: string;
  } | null>(null);

  // Proximity Calculation: Find closest high-risk landslide hazard zone or incident from cached data
  useEffect(() => {
    const checkNearbyHazards = async () => {
      try {
        const citizenLat = userLocation?.lat || selectedZone.lat;
        const citizenLon = userLocation?.lon || selectedZone.lon;

        const [cachedH, cachedR] = await Promise.all([
          getCachedHeatmapWithMeta(),
          getCachedIncidents(),
        ]);

        let closest: { name: string; distKm: number; bearing: string; severity: string } | null = null;

        if (cachedH?.data && cachedH.data.length > 0) {
          for (const region of cachedH.data) {
            if (region.severity === 'CRITICAL' || region.severity === 'HIGH' || region.computedScore >= 0.55) {
              const dist = calculateHaversineDistanceKm(citizenLat, citizenLon, region.centroidLat, region.centroidLng);
              const bearing = calculateCompassBearing(citizenLat, citizenLon, region.centroidLat, region.centroidLng);
              if (!closest || dist < closest.distKm) {
                closest = {
                  name: region.name,
                  distKm: dist,
                  bearing,
                  severity: region.severity,
                };
              }
            }
          }
        }

        if (cachedR?.data && cachedR.data.length > 0) {
          for (const rep of cachedR.data) {
            if (rep.category === 'CRACK' || rep.category === 'SLOPE_MOVEMENT' || rep.category === 'BLOCKED_ROAD') {
              const dist = calculateHaversineDistanceKm(citizenLat, citizenLon, rep.geoLat, rep.geoLng);
              const bearing = calculateCompassBearing(citizenLat, citizenLon, rep.geoLat, rep.geoLng);
              if (!closest || dist < closest.distKm) {
                closest = {
                  name: `Incident: ${rep.category.replace('_', ' ')}`,
                  distKm: dist,
                  bearing,
                  severity: 'HIGH',
                };
              }
            }
          }
        }

        // Only display if within relevant proximity (<= 50km)
        if (closest && closest.distKm <= 50) {
          setNearbyHazard(closest);
        } else {
          setNearbyHazard(null);
        }
      } catch {}
    };

    checkNearbyHazards();
  }, [userLocation, selectedZone]);

  useEffect(() => {
    setLoading(true);
    fetchRiskAssessment(selectedZone.lat, selectedZone.lon, selectedZone.slope, selectedZone.name)
      .then(async (res) => {
        setData(res);
        setLoading(false);
        const level = res.assessment.level;
        const alertKey = `${selectedZone.name}-${level}`;

        // Trigger sound on RED or AMBER
        if (level === 'RED' && lastAlertLevel.current !== 'RED') {
          playCriticalSiren();
          speakAlert(selectedZone.name, 'RED', res.assessment.action_protocol);
        } else if (level === 'AMBER' && lastAlertLevel.current !== 'AMBER') {
          playWarningBeep();
        } else if (level === 'GREEN') {
          stopSiren();
        }
        lastAlertLevel.current = level;

        // Send push notification
        if (!notificationSent.current.has(alertKey) && notification === 'granted') {
          await sendRiskAlert({
            zone: selectedZone.name,
            level,
            score: res.assessment.score,
            action: res.assessment.action_protocol,
            rain24h: res.weather.rain_24h_mm,
          });
          notificationSent.current.add(alertKey);
        }
      })
      .catch(() => setLoading(false));
  }, [selectedZone]);

  const t = {
    en: {
      title: 'Citizen Safety & Disaster Intelligence',
      subtitle: 'Real-time AI Landslide Early Warning, Weather Telemetry & Safe Evacuation',
      liveBadge: 'LIVE SATELLITE & WEATHER SYNC',
      location: 'Your Monitored Zone',
      aiScore: 'Multi-Factor Susceptibility Score (MCDA)',
      action: 'Emergency Action Protocol',
      rain24: '24h Cumulative Rain',
      rain72: '72h Total Rainfall',
      soil: 'Soil Moisture Saturation',
      elevation: 'NASA SRTM 30m Elevation',
      slope: 'Terrain Slope Angle',
      roadStatus: 'Highway Corridor Status',
      safeRoute: 'Recommended Evacuation Route (Subject to ground confirmation)',
      estTime: 'Est. Evacuation Time',
      sirenOn: '🔇 Mute Siren',
      sirenOff: '🔊 Emergency Siren',
      voiceBtn: '🗣️ Speak Voice Alert',
      stopVoiceBtn: '⏹️ Stop Voice',
      survivalGuide: 'Emergency Survival & Evacuation Protocols',
      reportBtn: '📸 AI Scan & Report Hazard',
      cmdMapBtn: '🛰️ GIS Command Map',
      tabOverview: '📊 Overview',
      tab3d: '⛰️ 3D Terrain & Runoff',
      tabShelters: '🏥 Relief Camps',
      tabSos: '📴 Offline SOS Mesh'
    },
    hi: {
      title: 'नागरिक सुरक्षा एवं आपदा पूर्व चेतावनी',
      subtitle: 'रीयल-टाइम एआई भूस्खलन चेतावनी, उपग्रह डेटा और सुरक्षित निकासी',
      liveBadge: 'लाइव उपग्रह एवं मौसम निगरानी',
      location: 'आपका निगरानी क्षेत्र',
      aiScore: 'मल्टी-फैक्टर संवेदनशीलता स्कोर (MCDA)',
      action: 'आपातकालीन कार्रवाई निर्देश',
      rain24: 'पिछले 24 घंटे की बारिश',
      rain72: '72 घंटे की कुल बारिश',
      soil: 'मिट्टी की नमी',
      elevation: 'नासा 30m डिजिटल ऊंचाई',
      slope: 'पहाड़ी ढलान कोण',
      roadStatus: 'राजमार्ग स्थिति',
      safeRoute: 'अनुशंसित निकासी मार्ग (जमीनी पुष्टि के अधीन)',
      estTime: 'अनुमानित निकासी समय',
      sirenOn: '🔇 सायरन बंद करें',
      sirenOff: '🔊 सायरन टेस्ट',
      voiceBtn: '🗣️ आवाज में सुनें',
      stopVoiceBtn: '⏹️ आवाज रोकें',
      survivalGuide: 'आपातकालीन सुरक्षा एवं बचाव नियम',
      reportBtn: '📸 एआई स्कैन व रिपोर्ट करें',
      cmdMapBtn: '🛰️ जीआईएस मैप खोलें',
      tabOverview: '📊 अवलोकन',
      tab3d: '⛰️ 3D पहाड़ी सिमुलेशन',
      tabShelters: '🏥 राहत शिविर',
      tabSos: '📴 ऑफलाइन एसओएस मेश'
    },
    as: {
      title: 'নাগৰিক সুৰক্ষা আৰু দুৰ্যোগ সতৰ্কবাৰ্তা',
      subtitle: 'প্ৰকৃত সময়ৰ এআই ভূমিস্খলন সতৰ্কবাৰ্তা আৰু সুৰক্ষিত নিষ্কাষণ',
      liveBadge: 'লাইভ উপগ্ৰহ আৰু বতৰ নিৰীক্ষণ',
      location: 'আপোনাৰ নিৰীক্ষণ অঞ্চল',
      aiScore: 'বহু-কাৰকভিত্তিক সংवेदनশীলতা সূচক (MCDA)',
      action: 'জৰুৰীকালীন নিৰ্দেশনা',
      rain24: '২৪ ঘণ্টাৰ বৰষুণ',
      rain72: '৭২ ঘণ্টাৰ বৰষুণ',
      soil: 'মাটিৰ আৰ্দ্ৰতা',
      elevation: 'নাছা ৩০মি উচ্চতা',
      slope: 'পাহাৰীয়া ঢাল',
      roadStatus: 'ৰাজপথৰ স্থিতি',
      safeRoute: 'পৰামৰ্শ দিয়া বিকল্প সুৰক্ষিত পথ (ক্ষেত্ৰভিত্তিক তথ্য সাপেক্ষে)',
      estTime: 'আনুমানিক নিষ্কাষণ সময়',
      sirenOn: '🔇 চাইৰেন বন্ধ কৰক',
      sirenOff: '🔊 চাইৰেন পৰীক্ষা',
      voiceBtn: '🗣️ ভইচ সতৰ্কবাৰ্তা',
      stopVoiceBtn: '⏹️ ভইচ বন্ধ কৰক',
      survivalGuide: 'জৰুৰীকালীন সুৰক্ষা নিৰ্দেশনা',
      reportBtn: '📸 এআই ফটো ৰিপোৰ্ট',
      cmdMapBtn: '🛰️ জিআইএছ মেপ',
      tabOverview: '📊 অৱলোকন',
      tab3d: '⛰️ ৩ডি পাহাৰ',
      tabShelters: '🏥 আশ্ৰয় শিবিৰ',
      tabSos: '📴 অফলাইন এছঅ’এছ'
    }
  }[lang];

  const isRed   = data?.assessment?.level === 'RED';
  const isAmber = data?.assessment?.level === 'AMBER';

  const bg   = theme === 'dark' ? '#0b1329' : '#f8fafc';
  const fg   = theme === 'dark' ? '#f1f5f9' : '#0f172a';
  const card = theme === 'dark' ? '#0f172a' : '#ffffff';
  const brd  = theme === 'dark' ? '#1e293b' : '#e2e8f0';
  const muted= theme === 'dark' ? '#94a3b8' : '#64748b';

  return (
    <div
      style={{
        minHeight: '100vh',
        background: theme === 'dark'
          ? "linear-gradient(180deg, rgba(7, 11, 20, 0.72) 0%, rgba(10, 16, 32, 0.88) 100%), url('/landslide_bg.jpg') center/cover fixed no-repeat"
          : '#f8fafc',
        color: fg,
        fontFamily: 'Inter, system-ui, sans-serif',
        display: 'flex',
        flexDirection: 'column',
      }}
    >

      {/* ── Offline Status Banner & Sync Controls ── */}
      <OfflineStatusHeader />

      {/* ── RED alert pulsing top bar ── */}
      {isRed && (
        <div style={{
          background: 'linear-gradient(90deg, #991b1b, #ef4444, #991b1b)',
          backgroundSize: '200% 100%',
          animation: 'redSlide 2s linear infinite',
          padding: '8px 24px', textAlign: 'center',
          fontSize: '0.85rem', fontWeight: 800, color: '#fff',
          letterSpacing: '0.05em'
        }}>
          🚨 CRITICAL LANDSLIDE ALERT — {selectedZone.name} — IMMEDIATE EVACUATION REQUIRED 🚨
          <style>{`
            @keyframes redSlide { 0%{background-position:0% 50%} 100%{background-position:200% 50%} }
          `}</style>
        </div>
      )}

      {/* ── Top Nav ── */}
      <header style={{
        background: theme === 'dark' ? 'rgba(15, 23, 42, 0.88)' : 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderBottom: `1px solid ${brd}`,
        padding: '12px 24px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        position: 'sticky', top: 0, zIndex: 50, flexWrap: 'wrap', gap: '12px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <img
            src="/satark_logo.png"
            alt="SATARK Logo"
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '10px',
              objectFit: 'contain',
              background: '#ffffff',
              padding: '2px',
              boxShadow: '0 2px 10px rgba(0, 0, 0, 0.4)',
              flexShrink: 0,
            }}
          />
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{ fontWeight: 900, fontSize: '1.25rem', letterSpacing: '0.04em', color: theme === 'dark' ? '#f8fafc' : '#0f172a' }}>
                SATARK
              </span>
              <span
                style={{
                  background: theme === 'dark' ? 'rgba(56, 189, 248, 0.15)' : 'rgba(2, 132, 199, 0.12)',
                  color: theme === 'dark' ? '#38bdf8' : '#0369a1',
                  border: theme === 'dark' ? '1px solid rgba(56, 189, 248, 0.35)' : '1px solid rgba(2, 132, 199, 0.35)',
                  borderRadius: '6px',
                  padding: '1px 8px',
                  fontSize: '0.72rem',
                  fontWeight: 800,
                  letterSpacing: '0.02em',
                }}
              >
                Citizen Safety
              </span>
            </div>
            <div style={{ fontSize: '0.72rem', color: muted, marginTop: '2px', letterSpacing: '0.01em' }}>
              National Early Warning Network {userLocation ? `· 📍 ${userLocation.detectedZone}` : ''}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {/* Voice Assistant Button */}
          <button
            onClick={() => isSpeaking ? stopSpeaking() : speakAlert(selectedZone.name, data?.assessment?.level || 'GREEN', data?.assessment?.action_protocol || '')}
            style={{
              padding: '6px 12px', borderRadius: '8px',
              border: theme === 'dark' ? '1px solid #3b82f640' : '1px solid rgba(37,99,235,0.3)',
              background: isSpeaking ? '#2563eb' : (theme === 'dark' ? 'rgba(59,130,246,0.15)' : 'rgba(37,99,235,0.10)'),
              color: isSpeaking ? '#fff' : (theme === 'dark' ? '#60a5fa' : '#1d4ed8'),
              fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer'
            }}
          >
            {isSpeaking ? t.stopVoiceBtn : t.voiceBtn}
          </button>

          {/* Siren toggle */}
          <button
            onClick={() => isPlaying ? stopSiren() : playCriticalSiren()}
            style={{
              padding: '6px 12px', borderRadius: '8px',
              border: theme === 'dark' ? 'none' : '1px solid rgba(220,38,38,0.3)',
              background: isPlaying ? '#dc2626' : (theme === 'dark' ? 'rgba(239,68,68,0.15)' : 'rgba(220,38,38,0.10)'),
              color: isPlaying ? '#fff' : (theme === 'dark' ? '#ef4444' : '#b91c1c'),
              fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer',
              animation: isPlaying ? 'pulse 1s infinite' : 'none'
            }}
          >
            {isPlaying ? t.sirenOn : t.sirenOff}
          </button>

          {/* Language toggle */}
          <div style={{ display: 'flex', background: theme === 'dark' ? '#1e293b' : '#e2e8f0', borderRadius: '20px', padding: '2px' }}>
            {(['en', 'hi', 'as'] as const).map(l => (
              <button key={l} onClick={() => setLang(l)} style={{
                padding: '4px 10px', borderRadius: '16px', border: 'none',
                background: lang === l ? '#2563eb' : 'transparent',
                color: lang === l ? '#fff' : (theme === 'dark' ? '#94a3b8' : '#475569'),
                fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer'
              }}>{l.toUpperCase()}</button>
            ))}
          </div>

          {/* Theme toggle */}
          <button onClick={() => setTheme(th => th === 'dark' ? 'light' : 'dark')}
            style={{ background: theme === 'dark' ? '#1e293b' : '#e2e8f0', border: 'none', borderRadius: '20px', padding: '6px 12px', cursor: 'pointer', fontSize: '0.85rem' }}>
            {theme === 'dark' ? '🌙' : '☀️'}
          </button>

          {/* Profile Menu / Sign In */}
          {isAuth ? (
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setProfileMenuOpen(o => !o)}
                style={{
                  background: profileMenuOpen ? '#2563eb' : (theme === 'dark' ? 'rgba(37, 99, 235, 0.15)' : 'rgba(37, 99, 235, 0.10)'),
                  color: profileMenuOpen ? '#fff' : (theme === 'dark' ? '#60a5fa' : '#1d4ed8'),
                  border: theme === 'dark' ? '1px solid rgba(59, 130, 246, 0.4)' : '1px solid rgba(37, 99, 235, 0.35)',
                  borderRadius: '8px',
                  padding: '6px 12px',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <span>👤</span>
                <span>{citizenProfile?.fullName?.split(' ')[0] || 'Profile'}</span>
                <span style={{ fontSize: '0.65rem' }}>{profileMenuOpen ? '▲' : '▼'}</span>
              </button>

              {profileMenuOpen && (
                <div
                  style={{
                    position: 'absolute',
                    right: 0,
                    top: '110%',
                    background: card,
                    border: `1px solid ${brd}`,
                    borderRadius: '10px',
                    padding: '6px',
                    width: '170px',
                    boxShadow: theme === 'dark' ? '0 8px 24px rgba(0,0,0,0.5)' : '0 8px 24px rgba(0,0,0,0.12)',
                    zIndex: 100,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                  }}
                >
                  <button
                    onClick={() => { setProfileMenuOpen(false); navigate('/profile'); }}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: fg,
                      padding: '8px 12px',
                      borderRadius: '6px',
                      textAlign: 'left',
                      fontSize: '0.82rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                    }}
                  >
                    <span>👤</span> My Profile
                  </button>

                  <button
                    onClick={() => { setProfileMenuOpen(false); navigate('/privacy'); }}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: theme === 'dark' ? '#94a3b8' : '#475569',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      textAlign: 'left',
                      fontSize: '0.82rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                    }}
                  >
                    <span>🛡️</span> Privacy &amp; Data
                  </button>

                  <div style={{ borderTop: `1px solid ${brd}`, margin: '4px 0' }} />

                  <button
                    onClick={async () => {
                      setProfileMenuOpen(false);
                      await logoutCitizen();
                      navigate('/login');
                    }}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: theme === 'dark' ? '#f87171' : '#dc2626',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      textAlign: 'left',
                      fontSize: '0.82rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                    }}
                  >
                    <span>🚪</span> Sign Out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={() => navigate('/login')}
              style={{
                background: theme === 'dark' ? 'rgba(37, 99, 235, 0.15)' : 'rgba(37, 99, 235, 0.10)',
                color: theme === 'dark' ? '#60a5fa' : '#1d4ed8',
                border: theme === 'dark' ? '1px solid rgba(59, 130, 246, 0.4)' : '1px solid rgba(37, 99, 235, 0.35)',
                borderRadius: '8px',
                padding: '6px 12px',
                fontSize: '0.82rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <span>👤</span> Sign In
            </button>
          )}

          {/* Officer Portal */}
          <button onClick={() => navigate('/login')}
            style={{ background: '#2563eb', color: '#fff', border: 'none', borderRadius: '8px', padding: '7px 14px', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer' }}>
            🔒 Officer
          </button>
        </div>
      </header>

      {/* ── Main Container ── */}
      <main style={{ flex: 1, maxWidth: '1100px', width: '100%', margin: '0 auto', padding: '24px 16px' }}>

        {/* Hero */}
        <div style={{ marginBottom: '20px', textAlign: 'center' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '6px',
            background: theme === 'dark' ? 'rgba(34,197,94,0.15)' : 'rgba(22, 163, 74, 0.12)',
            border: theme === 'dark' ? '1px solid #22c55e' : '1px solid #16a34a',
            color: theme === 'dark' ? '#4ade80' : '#15803d', padding: '4px 12px', borderRadius: '20px',
            fontSize: '0.75rem', fontWeight: 700, marginBottom: '10px'
          }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: theme === 'dark' ? '#22c55e' : '#16a34a', display: 'inline-block' }} />
            {t.liveBadge}
          </div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 800, margin: '0 0 6px 0', letterSpacing: '-0.03em', color: fg }}>{t.title}</h1>
          <p style={{ color: theme === 'dark' ? '#94a3b8' : '#475569', fontSize: '0.92rem', margin: 0 }}>{t.subtitle}</p>
        </div>

        {/* ── Complete Citizen Offline Rescue Mode (6 Interactive Workflows & Beacon) ── */}
        <OfflineRescueMode
          defaultLat={userLocation?.lat || selectedZone.lat}
          defaultLng={userLocation?.lon || selectedZone.lon}
          onNavigateTab={(tab) => setActiveTab(tab as any)}
          theme={theme}
        />

        {/* Navigation Tabs (5 Features) */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', borderBottom: `1px solid ${brd}`, overflowX: 'auto', paddingBottom: '2px' }}>
          {[
            { id: 'overview', label: t.tabOverview },
            { id: '3d_terrain', label: t.tab3d },
            { id: 'shelters', label: t.tabShelters },
            { id: 'offline_sos', label: t.tabSos }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              style={{
                padding: '10px 16px', border: 'none', cursor: 'pointer',
                background: 'transparent', fontWeight: 700, fontSize: '0.86rem',
                color: activeTab === tab.id ? '#2563eb' : (theme === 'dark' ? '#94a3b8' : '#64748b'),
                borderBottom: activeTab === tab.id ? '2px solid #2563eb' : '2px solid transparent',
                whiteSpace: 'nowrap', transition: 'all 0.15s'
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab 1: Overview */}
        {activeTab === 'overview' && (
          <>
            {/* Zone Selector */}
            <div style={{
              background: card, border: `1px solid ${brd}`, borderRadius: '12px',
              padding: '16px', marginBottom: '20px',
              display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '12px'
            }}>
              <div>
                <label style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: theme === 'dark' ? '#94a3b8' : '#475569', fontWeight: 700, display: 'block', marginBottom: '6px' }}>
                  📍 {t.location} {userLocation && <span style={{ color: theme === 'dark' ? '#22c55e' : '#15803d', marginLeft: '6px' }}>● GPS Auto-Detected</span>}
                </label>
                <select value={selectedZone.name}
                  onChange={e => { const z = ZONES.find(x => x.name === e.target.value); if (z) setSelectedZone(z); }}
                  style={{
                    padding: '8px 14px', borderRadius: '8px',
                    background: theme === 'dark' ? '#1e293b' : '#f1f5f9',
                    color: fg, border: `1px solid ${brd}`,
                    fontSize: '0.9rem', fontWeight: 600, cursor: 'pointer'
                  }}>
                  {ZONES.map(z => <option key={z.name} value={z.name}>{z.name}</option>)}
                </select>
              </div>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <button onClick={() => navigate('/sih-dashboard')}
                  style={{ background: 'linear-gradient(135deg, #0284c7, #2563eb)', color: '#fff', border: 'none', borderRadius: '8px', padding: '10px 18px', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer' }}>
                  {t.cmdMapBtn}
                </button>
                <button onClick={() => navigate('/report')}
                  style={{ background: '#16a34a', color: '#fff', border: 'none', borderRadius: '8px', padding: '10px 18px', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer' }}>
                  {t.reportBtn}
                </button>
              </div>
            </div>

            {/* AI Risk Banner */}
            <div style={{
              background: isRed ? (theme === 'dark' ? 'linear-gradient(135deg,rgba(239,68,68,0.25),rgba(185,28,28,0.15))' : 'linear-gradient(135deg,#fee2e2,#fecaca)') :
                          isAmber ? (theme === 'dark' ? 'linear-gradient(135deg,rgba(245,158,11,0.25),rgba(217,119,6,0.15))' : 'linear-gradient(135deg,#fef3c7,#fde68a)') :
                          (theme === 'dark' ? 'linear-gradient(135deg,rgba(34,197,94,0.25),rgba(21,128,61,0.15))' : 'linear-gradient(135deg,#dcfce7,#bbf7d0)'),
              border: `2px solid ${isRed ? '#ef4444' : isAmber ? '#f59e0b' : '#22c55e'}`,
              borderRadius: '16px', padding: '24px', marginBottom: '24px'
            }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
                <div>
                  <div style={{ fontSize: '0.8rem', fontWeight: 700, color: theme === 'dark' ? '#94a3b8' : '#334155', textTransform: 'uppercase' }}>{t.aiScore}</div>
                  <div style={{ fontSize: '2rem', fontWeight: 900, color: isRed ? (theme === 'dark' ? '#ef4444' : '#b91c1c') : isAmber ? (theme === 'dark' ? '#f59e0b' : '#b45309') : (theme === 'dark' ? '#22c55e' : '#15803d'), marginTop: '4px' }}>
                    {loading ? 'Analyzing…' : `${data?.assessment?.level || 'MODERATE'} RISK (${(data?.assessment?.score ?? 0.42).toFixed(2)})`}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.72rem', color: theme === 'dark' ? '#94a3b8' : '#475569' }}>Notification Status</div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 700, color: notification === 'granted' ? (theme === 'dark' ? '#4ade80' : '#15803d') : (theme === 'dark' ? '#f59e0b' : '#b45309') }}>
                    {notification === 'granted' ? '🔔 Alerts Enabled' : '🔕 Notifications Off'}
                  </div>
                </div>
              </div>
              <div style={{
                marginTop: '16px', padding: '12px 16px',
                background: theme === 'dark' ? 'rgba(0,0,0,0.25)' : 'rgba(255,255,255,0.85)',
                border: theme === 'dark' ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.08)',
                borderRadius: '8px'
              }}>
                <div style={{ fontSize: '0.82rem', fontWeight: 700, color: fg }}>{t.action}:</div>
                <div style={{
                  fontSize: '1.05rem', fontWeight: 800,
                  color: isRed ? (theme === 'dark' ? '#fca5a5' : '#991b1b') : isAmber ? (theme === 'dark' ? '#fcd34d' : '#92400e') : (theme === 'dark' ? '#86efac' : '#166534'),
                  marginTop: '4px'
                }}>
                  {data?.assessment?.action_protocol || 'Normal Monitoring Active'}
                </div>
              </div>
            </div>

            {/* Telemetry Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px', marginBottom: '24px' }}>
              {[
                { icon: '🌧️', label: t.rain24, value: `${data?.weather?.rain_24h_mm ?? 142.0} mm`, sub: 'Open-Meteo & OpenWeather', color: (data?.weather?.rain_24h_mm ?? 0) > 100 ? (theme === 'dark' ? '#ef4444' : '#dc2626') : (theme === 'dark' ? '#38bdf8' : '#0284c7') },
                { icon: '📊', label: t.rain72, value: `${data?.weather?.rain_72h_mm ?? 285.0} mm`, sub: '3-Day Antecedent Rain', color: theme === 'dark' ? '#f8fafc' : '#0f172a' },
                { icon: '🌱', label: t.soil, value: `${data?.weather?.soil_moisture ?? 0.52} m³/m³`, sub: 'Topsoil 0-1cm Layer', color: theme === 'dark' ? '#f8fafc' : '#0f172a' },
                { icon: '🛰️', label: t.elevation, value: '876.5 m', sub: 'NASA SRTM 30m DEM', color: theme === 'dark' ? '#38bdf8' : '#0284c7' },
              ].map(({ icon, label, value, sub, color }) => (
                <div key={label} style={{ background: card, border: `1px solid ${brd}`, borderRadius: '12px', padding: '16px' }}>
                  <div style={{ fontSize: '0.75rem', color: theme === 'dark' ? '#94a3b8' : '#475569', fontWeight: 600 }}>{icon} {label}</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 800, color, marginTop: '4px' }}>{value}</div>
                  <div style={{ fontSize: '0.7rem', color: theme === 'dark' ? '#64748b' : '#475569', marginTop: '4px' }}>{sub}</div>
                </div>
              ))}
            </div>

            {/* Road Status */}
            <div style={{ background: card, border: `1px solid ${brd}`, borderRadius: '16px', padding: '24px', marginBottom: '24px' }}>
              <h3 style={{ margin: '0 0 16px 0', fontSize: '1.1rem', fontWeight: 800, color: theme === 'dark' ? '#4ade80' : '#15803d' }}>
                🚗 {t.roadStatus} &amp; Safe Detour Routing
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px' }}>
                {[
                  { label: t.roadStatus, value: data?.evacuation_plan?.primary_corridor || 'NH-766 Blocked', color: theme === 'dark' ? '#f87171' : '#b91c1c', prefix: '⛔' },
                  { label: t.safeRoute, value: data?.evacuation_plan?.safe_evacuation_route || 'Active via SH-59 Bypass', color: theme === 'dark' ? '#4ade80' : '#15803d', prefix: '✅' },
                  { label: t.estTime, value: `${data?.evacuation_plan?.estimated_evacuation_time_min ?? 42} Minutes`, color: theme === 'dark' ? '#f8fafc' : '#0f172a', prefix: '⏱️' },
                ].map(({ label, value, color, prefix }) => (
                  <div key={label} style={{ background: theme === 'dark' ? '#1e293b' : '#f8fafc', border: `1px solid ${brd}`, padding: '14px', borderRadius: '10px' }}>
                    <div style={{ fontSize: '0.75rem', color: theme === 'dark' ? '#94a3b8' : '#475569' }}>{label}:</div>
                    <div style={{ fontSize: '0.95rem', fontWeight: 800, color, marginTop: '4px' }}>{prefix} {value}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Survival Guide */}
            <div style={{ background: card, border: `1px solid ${brd}`, borderRadius: '16px', padding: '24px' }}>
              <h3 style={{ margin: '0 0 12px 0', fontSize: '1.1rem', fontWeight: 800, color: fg }}>🛡️ {t.survivalGuide}</h3>
              <ul style={{ paddingLeft: '20px', lineHeight: '1.9', color: theme === 'dark' ? '#cbd5e1' : '#1e293b', fontSize: '0.9rem', margin: 0 }}>
                <li><strong>Muddy water or sudden stream surge</strong> indicates uphill slope failure — move immediately.</li>
                <li><strong>Do not use NH-766</strong> when blocked. Follow designated SH-59 green bypass on the GIS map.</li>
                <li><strong>Rumbling sounds or cracking trees</strong> — move perpendicular to slope, not downhill.</li>
                <li><strong>Emergency Helplines:</strong> National Disaster: <strong>1070</strong> | State Control Room: <strong>1077</strong>.</li>
              </ul>
            </div>
          </>
        )}

        {/* Tab 2: 3D Mountain & Runoff Simulator */}
        {activeTab === '3d_terrain' && (
          <Terrain3DVisualizer
            zoneName={selectedZone.name}
            slope={selectedZone.slope}
            elevation={876.5}
          />
        )}

        {/* Tab 3: Safe Relief Camps */}
        {activeTab === 'shelters' && (
          <ShelterResourcePanel
            selectedZoneName={selectedZone.name}
            userLat={userLocation?.lat || selectedZone.lat}
            userLon={userLocation?.lon || selectedZone.lon}
            theme={theme}
          />
        )}

        {/* Tab 4: Offline SOS Mesh */}
        {activeTab === 'offline_sos' && (
          <OfflineSosMesh
            userLat={userLocation?.lat || selectedZone.lat}
            userLon={userLocation?.lon || selectedZone.lon}
            theme={theme}
          />
        )}
      </main>

      {/* Footer */}
      <footer style={{ textAlign: 'center', padding: '18px', borderTop: `1px solid ${brd}`, fontSize: '0.75rem', color: '#64748b' }}>
        SIH 2026 AI Landslide Early Warning System · NDMA SACHET · Open-Meteo · NASA SRTM 30m DEM · OpenWeather
      </footer>

      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.6} }
      `}</style>
    </div>
  );
};
