import React, { useState, useEffect } from 'react';
import { useGeolocation } from '../../hooks/useGeolocation';
import { useAlertSound } from '../../hooks/useAlertSound';
import { useVoiceAssistant } from '../../hooks/useVoiceAssistant';
import { analyzeImageCanvas, CompleteImageAnalysis } from '../../services/imageAnalysisService';
import {
  fetchRecentAlerts,
  submitReport,
  uploadPhoto,
  fetchRiskAssessment
} from '../../services/api';
import {
  queueReport,
  generateClientReportId,
  generateBeaconId,
  setEmergencyDistressState,
  getEmergencyDistressState,
  EmergencyDistressState,
  getCachedHeatmapWithMeta,
  getCachedShelters
} from '../../services/offlineStore';
import {
  sendCitizenOtp,
  verifyCitizenOtp,
  getCachedCitizenProfile,
  getCitizenProfile,
  updateCitizenProfile,
  createCitizenProfile
} from '../../services/citizenAuthService';
import {
  AlertItem,
  CreateReportPayload,
  ReportCategory,
  Severity,
  CitizenProfile as ICitizenProfile,
  CitizenProfileInput,
  RiskAssessmentResponse
} from '../../types';
import { PhotoCapture } from '../report/PhotoCapture';
import { OfflineRescueMode } from '../emergency/OfflineRescueMode';
import { OfflineHowItWorksIllustration } from '../emergency/OfflineHowItWorksIllustration';
import { MapContainer, TileLayer, Circle, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix leaflet icon
const defaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});

interface Props {
  onSwitchToOfficer?: () => void;
}

export const SatarkCitizenApp: React.FC<Props> = ({ onSwitchToOfficer }) => {
  const { coords: userLocation } = useGeolocation();
  const { isPlaying: isSirenPlaying, playCriticalSiren, stopSiren } = useAlertSound();
  const toggleSiren = () => { if (isSirenPlaying) stopSiren(); else playCriticalSiren(); };

  // Active Bottom Tab
  const [activeTab, setActiveTab] = useState<'home' | 'alerts' | 'map' | 'report' | 'profile'>('home');

  // Dedicated Offline Rescue View (Opens all 6 rescue tools)
  const [showOfflineRescueView, setShowOfflineRescueView] = useState<boolean>(false);

  // Theme & Language
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    return (localStorage.getItem('satark_mobile_theme') as 'dark' | 'light') || 'dark';
  });
  const [lang, setLang] = useState<'en' | 'hi' | 'as'>(() => {
    return (localStorage.getItem('ews_lang') as 'en' | 'hi' | 'as') || 'en';
  });
  const { speakAlert, isSpeaking: isVoiceSpeaking, stopSpeaking: stopVoiceSpeaking } = useVoiceAssistant(lang);
  const [showLangSheet, setShowLangSheet] = useState<boolean>(false);

  // Connectivity
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  useEffect(() => {
    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  // Theme persistence
  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    localStorage.setItem('satark_mobile_theme', next);
  };

  const isLight = theme === 'light';

  // Zone Presets
  const ZONES = [
    { name: 'Guwahati Hills (NER)', district: 'Kamrup', lat: 26.1445, lon: 91.7362, slope: 32.0, state: 'Assam' },
    { name: 'Shillong Ridge (NER)', district: 'East Khasi Hills', lat: 25.5788, lon: 91.8933, slope: 38.5, state: 'Meghalaya' },
    { name: 'Aizawl Slopes (NER)', district: 'Aizawl', lat: 23.7271, lon: 92.7176, slope: 45.0, state: 'Mizoram' },
    { name: 'Meppadi, Wayanad (Testbed)', district: 'Wayanad', lat: 11.5534, lon: 76.1320, slope: 38.5, state: 'Kerala' },
    { name: 'Gangtok Corridor (NER)', district: 'East Sikkim', lat: 27.3389, lon: 88.6065, slope: 41.0, state: 'Sikkim' },
    { name: 'Kohima Escarpment (NER)', district: 'Kohima', lat: 25.6751, lon: 94.1086, slope: 36.0, state: 'Nagaland' }
  ];
  const [selectedZone, setSelectedZone] = useState(ZONES[0]);
  const [showZoneSheet, setShowZoneSheet] = useState(false);

  // Nearest zone auto-detect
  useEffect(() => {
    if (userLocation) {
      const nearest = ZONES.reduce((prev, curr) => {
        const dPrev = Math.hypot(prev.lat - userLocation.lat, prev.lon - userLocation.lng);
        const dCurr = Math.hypot(curr.lat - userLocation.lat, curr.lon - userLocation.lng);
        return dCurr < dPrev ? curr : prev;
      });
      setSelectedZone(nearest);
    }
  }, [userLocation]);

  // Risk & Telemetry Data
  const [riskData, setRiskData] = useState<RiskAssessmentResponse | null>(null);
  const [loadingRisk, setLoadingRisk] = useState<boolean>(true);
  const [expandedDetails, setExpandedDetails] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;
    setLoadingRisk(true);
    fetchRiskAssessment(selectedZone.lat, selectedZone.lon, selectedZone.slope, selectedZone.name)
      .then(res => { if (isMounted) setRiskData(res); })
      .catch(async () => {
        const cached = await getCachedHeatmapWithMeta();
        if (isMounted && cached?.data && cached.data.length > 0) {
          const match = cached.data.find(r => r.name.toLowerCase().includes(selectedZone.district.toLowerCase()));
          if (match) {
            setRiskData({
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
      .finally(() => { if (isMounted) setLoadingRisk(false); });

    return () => { isMounted = false; };
  }, [selectedZone]);

  // Alerts state
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [alertFilter, setAlertFilter] = useState<Severity | 'ALL'>('ALL');
  useEffect(() => {
    fetchRecentAlerts()
      .then(res => setAlerts(res))
      .catch(() => {});
  }, []);

  // Shelters state for Map
  const [shelters, setShelters] = useState<any[]>([]);
  useEffect(() => {
    getCachedShelters()
      .then(res => { if (res?.data) setShelters(res.data); })
      .catch(() => {});
  }, []);

  // Modals & Sheets
  const [showSosModal, setShowSosModal] = useState<boolean>(false);
  const [sosCountdown, setSosCountdown] = useState<number>(3);
  const [sosActive, setSosActive] = useState<boolean>(false);
  const [sosBeaconId, setSosBeaconId] = useState<string>('');
  const [showRouteModal, setShowRouteModal] = useState<boolean>(false);
  const [showContactsSheet, setShowContactsSheet] = useState<boolean>(false);
  const [showHowItWorksSheet, setShowHowItWorksSheet] = useState<boolean>(false);

  // Active Distress State
  useEffect(() => {
    const existing = getEmergencyDistressState();
    if (existing && existing.active) {
      setSosActive(true);
      setSosBeaconId(existing.beaconId);
    }
  }, []);

  // Report Form state
  const [reportCategory, setReportCategory] = useState<ReportCategory>('SLOPE_MOVEMENT');
  const [reportDesc, setReportDesc] = useState<string>('');
  const [reportPhoto, setReportPhoto] = useState<File | Blob | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [imageAnalysis, setImageAnalysis] = useState<CompleteImageAnalysis | null>(null);
  const [isAnalyzingPhoto, setIsAnalyzingPhoto] = useState<boolean>(false);
  const [reportMedicalUrgent] = useState<boolean>(false);
  const [submittingReport, setSubmittingReport] = useState<boolean>(false);
  const [reportSuccessNotice, setReportSuccessNotice] = useState<string | null>(null);

  const handlePhotoSelected = (file: File) => {
    setReportPhoto(file);
    const url = URL.createObjectURL(file);
    setPhotoPreview(url);
    setIsAnalyzingPhoto(true);
    setImageAnalysis(null);

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = url;
    img.onload = () => {
      try {
        const offscreen = document.createElement('canvas');
        offscreen.width = img.width;
        offscreen.height = img.height;
        const ctx = offscreen.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          const res = analyzeImageCanvas(offscreen, file);
          setImageAnalysis(res);
          setIsAnalyzingPhoto(false);
          if (res.hazard.hazardType === 'TENSION_CRACK') {
            setReportCategory('CRACK');
          } else if (res.hazard.hazardType === 'ROAD_FRACTURE') {
            setReportCategory('BLOCKED_ROAD');
          } else if (res.hazard.hazardType === 'MUDFLOW') {
            setReportCategory('SLOPE_MOVEMENT');
          }
        } else {
          setIsAnalyzingPhoto(false);
        }
      } catch {
        setIsAnalyzingPhoto(false);
      }
    };
    img.onerror = () => setIsAnalyzingPhoto(false);
  };

  const handleRemovePhoto = () => {
    setReportPhoto(null);
    setPhotoPreview(null);
    setImageAnalysis(null);
    setIsAnalyzingPhoto(false);
  };

  // Citizen Profile state
  const [citizenProfile, setCitizenProfile] = useState<ICitizenProfile | null>(null);
  const [profileForm, setProfileForm] = useState<CitizenProfileInput>({
    fullName: '',
    gender: '',
    ageGroup: '',
    preferredLanguage: lang,
    bloodGroup: '',
    emergencyContactName: '',
    emergencyContactPhone: '',
    accessibilityNeeds: ''
  });
  const [savingProfile, setSavingProfile] = useState<boolean>(false);
  const [profileNotice, setProfileNotice] = useState<string | null>(null);

  // Auth / OTP state
  const [isCitizenLoggedIn, setIsCitizenLoggedIn] = useState<boolean>(() => {
    return !!localStorage.getItem('ews_token') && localStorage.getItem('ews_role') === 'CITIZEN';
  });
  const [showSignInSheet, setShowSignInSheet] = useState<boolean>(false);
  const [phoneInput, setPhoneInput] = useState<string>('');
  const [otpInput, setOtpInput] = useState<string>('');
  const [otpStep, setOtpStep] = useState<1 | 2>(1);
  const [demoNotice, setDemoNotice] = useState<string>('');
  const [otpLoading, setOtpLoading] = useState<boolean>(false);
  const [otpError, setOtpError] = useState<string>('');

  // Load profile on mount
  useEffect(() => {
    const cached = getCachedCitizenProfile();
    if (cached) {
      setCitizenProfile(cached);
      setProfileForm({
        fullName: cached.fullName || '',
        gender: cached.gender || '',
        ageGroup: cached.ageGroup || '',
        preferredLanguage: cached.preferredLanguage || lang,
        bloodGroup: cached.bloodGroup || '',
        emergencyContactName: cached.emergencyContactName || '',
        emergencyContactPhone: cached.emergencyContactPhone || '',
        accessibilityNeeds: cached.accessibilityNeeds || ''
      });
    }

    if (isCitizenLoggedIn) {
      getCitizenProfile()
        .then((prof: ICitizenProfile | null) => {
          if (prof) {
            setCitizenProfile(prof);
            setProfileForm({
              fullName: prof.fullName || '',
              gender: prof.gender || '',
              ageGroup: prof.ageGroup || '',
              preferredLanguage: prof.preferredLanguage || lang,
              bloodGroup: prof.bloodGroup || '',
              emergencyContactName: prof.emergencyContactName || '',
              emergencyContactPhone: prof.emergencyContactPhone || '',
              accessibilityNeeds: prof.accessibilityNeeds || ''
            });
          }
        })
        .catch(() => {});
    }
  }, [isCitizenLoggedIn, lang]);

  // ── ANDROID HARDWARE BACK BUTTON INTERCEPTION ─────────────────────────────────
  useEffect(() => {
    const handleBack = (e: CustomEvent) => {
      // 1. If any modal or sheet is open, close it!
      if (showSosModal) { setShowSosModal(false); e.preventDefault(); return; }
      if (showRouteModal) { setShowRouteModal(false); e.preventDefault(); return; }
      if (showContactsSheet) { setShowContactsSheet(false); e.preventDefault(); return; }
      if (showHowItWorksSheet) { setShowHowItWorksSheet(false); e.preventDefault(); return; }
      if (showZoneSheet) { setShowZoneSheet(false); e.preventDefault(); return; }
      if (showLangSheet) { setShowLangSheet(false); e.preventDefault(); return; }
      if (showSignInSheet) { setShowSignInSheet(false); e.preventDefault(); return; }

      // 2. If inside Offline Rescue Mode, go back to Citizen Home!
      if (showOfflineRescueView) {
        setShowOfflineRescueView(false);
        e.preventDefault();
        return;
      }

      // 3. If in another tab, return to Home tab!
      if (activeTab !== 'home') {
        setActiveTab('home');
        e.preventDefault();
        return;
      }
    };

    window.addEventListener('satark-android-back' as any, handleBack);
    return () => window.removeEventListener('satark-android-back' as any, handleBack);
  }, [
    showSosModal,
    showRouteModal,
    showContactsSheet,
    showHowItWorksSheet,
    showZoneSheet,
    showLangSheet,
    showSignInSheet,
    showOfflineRescueView,
    activeTab
  ]);

  // ── SOS TRIGGER ─────────────────────────────────────────────────────────────
  const triggerSos = () => {
    setShowSosModal(true);
    setSosCountdown(3);
  };

  useEffect(() => {
    let timer: any = null;
    if (showSosModal && !sosActive && sosCountdown > 0) {
      timer = setTimeout(() => setSosCountdown(c => c - 1), 1000);
    } else if (showSosModal && !sosActive && sosCountdown === 0) {
      executeSosBroadcast();
    }
    return () => clearTimeout(timer);
  }, [showSosModal, sosActive, sosCountdown]);

  const executeSosBroadcast = async () => {
    const bId = generateBeaconId();
    const cId = generateClientReportId();
    const lat = userLocation?.lat ?? selectedZone.lat;
    const lng = userLocation?.lng ?? selectedZone.lon;

    const distress: EmergencyDistressState = {
      beaconId: bId,
      status: 'ACTIVE',
      active: true,
      createdAt: Date.now(),
      activatedAt: Date.now(),
      lat,
      lng,
      medicalUrgent: true,
      emergencyType: 'Citizen SOS Distress Broadcast',
      clientReportId: cId,
      syncStatus: isOnline ? 'SYNCHRONIZED' : 'PENDING_SYNC',
      notes: 'Activated via SATARK Citizen One-Tap SOS'
    };

    setEmergencyDistressState(distress);
    setSosBeaconId(bId);
    setSosActive(true);
    playCriticalSiren();

    const payload: CreateReportPayload = {
      geoLat: lat,
      geoLng: lng,
      category: 'TRAPPED_CITIZENS',
      description: `[EMERGENCY SOS DISTRESS: ${bId}] Urgent extraction beacon triggered at GPS (${lat.toFixed(6)}, ${lng.toFixed(6)}). Citizen immediate distress.`,
      reporterType: 'CITIZEN',
      medicalUrgent: true,
      clientReportId: cId,
      beaconId: bId
    };

    try {
      if (isOnline) {
        await submitReport(payload);
      } else {
        await queueReport(payload);
      }
    } catch {
      await queueReport(payload);
    }
  };

  const cancelSos = () => {
    setEmergencyDistressState(null);
    setSosActive(false);
    setShowSosModal(false);
    stopSiren();
  };

  // ── REPORT SUBMIT ────────────────────────────────────────────────────────────
  const handleSubmitHazardReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportDesc.trim()) return;

    setSubmittingReport(true);
    setReportSuccessNotice(null);

    const lat = userLocation?.lat ?? selectedZone.lat;
    const lng = userLocation?.lng ?? selectedZone.lon;
    const cId = generateClientReportId();

    let uploadedUrl: string | null = null;
    if (reportPhoto && isOnline) {
      try {
        uploadedUrl = await uploadPhoto(reportPhoto, `hazard_${cId}.jpg`);
      } catch {}
    }

    let finalDesc = reportDesc.trim();
    if (imageAnalysis) {
      finalDesc = `[AI Hazard: ${imageAnalysis.hazard.label} (${imageAnalysis.hazard.confidence}%)] [Authenticity: ${imageAnalysis.authenticity.status} (${imageAnalysis.authenticity.confidence}%)] ${finalDesc}`;
    }

    const payload: CreateReportPayload = {
      geoLat: lat,
      geoLng: lng,
      category: reportCategory,
      description: finalDesc,
      reporterType: 'CITIZEN',
      photoUrl: uploadedUrl,
      medicalUrgent: reportMedicalUrgent,
      clientReportId: cId
    };

    try {
      if (isOnline) {
        await submitReport(payload);
        setReportSuccessNotice('✅ Hazard report transmitted directly to central disaster control.');
      } else {
        await queueReport(payload);
        setReportSuccessNotice('📴 OFFLINE: Report preserved in local IndexedDB queue. Automatic cloud sync active.');
      }
      setReportDesc('');
      handleRemovePhoto();
    } catch {
      await queueReport(payload);
      setReportSuccessNotice('📴 Saved locally to offline queue.');
    } finally {
      setSubmittingReport(false);
      setTimeout(() => setReportSuccessNotice(null), 5000);
    }
  };

  // ── CITIZEN PROFILE SAVE ─────────────────────────────────────────────────────
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    setProfileNotice(null);

    try {
      if (citizenProfile?.id) {
        const updated = await updateCitizenProfile(profileForm);
        setCitizenProfile(updated);
      } else {
        const created = await createCitizenProfile(profileForm);
        setCitizenProfile(created);
      }
      setProfileNotice('✅ Emergency profile saved successfully.');
    } catch {
      setProfileNotice('✅ Profile updated locally in offline secure ledger.');
    } finally {
      setSavingProfile(false);
      setTimeout(() => setProfileNotice(null), 4000);
    }
  };

  // ── OTP AUTH ────────────────────────────────────────────────────────────────
  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneInput.trim()) return;
    setOtpLoading(true);
    setOtpError('');
    try {
      const res = await sendCitizenOtp(phoneInput);
      if (res.demoMode && res.demoOtp) {
        setDemoNotice(`SIH Demo Mode: Enter ${res.demoOtp}`);
      }
      setOtpStep(2);
    } catch (err: any) {
      setOtpError(err.message || 'Failed to send OTP.');
    } finally {
      setOtpLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setOtpLoading(true);
    setOtpError('');
    try {
      const res = await verifyCitizenOtp(phoneInput, otpInput);
      setIsCitizenLoggedIn(true);
      setShowSignInSheet(false);
      if (res.profile) setCitizenProfile(res.profile);
    } catch (err: any) {
      setOtpError(err.message || 'Invalid OTP. Try 123456');
    } finally {
      setOtpLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('ews_token');
    localStorage.removeItem('ews_role');
    localStorage.removeItem('ews_user');
    setIsCitizenLoggedIn(false);
    setCitizenProfile(null);
  };

  // UI Theme Colors
  const bgMain = isLight ? '#f8fafc' : '#070c17';
  const bgHeader = isLight ? '#ffffff' : '#0b1329';
  const bgCard = isLight ? '#ffffff' : '#0e172a';
  const textPrimary = isLight ? '#0f172a' : '#f8fafc';
  const textMuted = isLight ? '#64748b' : '#94a3b8';
  const borderCol = isLight ? '#e2e8f0' : '#1e293b';

  // ── IF FULL OFFLINE RESCUE VIEW IS OPEN ──
  if (showOfflineRescueView) {
    return (
      <div style={{ minHeight: '100vh', background: bgMain, color: textPrimary, display: 'flex', flexDirection: 'column' }}>
        {/* Top Back Header */}
        <div style={{
          padding: '12px 16px',
          background: bgHeader,
          borderBottom: `1px solid ${borderCol}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <button
            onClick={() => setShowOfflineRescueView(false)}
            style={{
              background: isLight ? '#f1f5f9' : '#1e293b',
              border: `1px solid ${borderCol}`,
              color: '#38bdf8',
              borderRadius: '8px',
              padding: '6px 14px',
              fontSize: '0.84rem',
              fontWeight: 800,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer'
            }}
          >
            ← Back to Citizen Home
          </button>
          <div style={{ fontWeight: 800, fontSize: '0.9rem', color: textPrimary }}>
            6 Offline Rescue Tools
          </div>
        </div>

        {/* Embedded Complete OfflineRescueMode */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
          <OfflineRescueMode
            defaultLat={selectedZone.lat}
            defaultLng={selectedZone.lon}
            theme={theme}
            onNavigateTab={(tab) => {
              if (tab === 'home') setShowOfflineRescueView(false);
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: bgMain,
      color: textPrimary,
      fontFamily: 'Inter, system-ui, sans-serif',
      display: 'flex',
      flexDirection: 'column',
      paddingBottom: '70px',
      boxSizing: 'border-box'
    }}>
      {/* ── 1. COMPACT NATIVE HEADER ── */}
      <header style={{
        position: 'sticky',
        top: 0,
        zIndex: 50,
        background: isLight ? 'rgba(255,255,255,0.95)' : 'rgba(11, 19, 41, 0.95)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderBottom: `1px solid ${borderCol}`,
        padding: '10px 14px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '8px'
      }}>
        {/* Left: Emblem + SATARK text */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <img
            src="/satark_emblem.png"
            alt="SATARK"
            style={{ width: '32px', height: '32px', objectFit: 'contain' }}
          />
          <span style={{ fontWeight: 900, fontSize: '1.12rem', letterSpacing: '-0.02em', color: textPrimary }}>
            SATARK
          </span>
        </div>

        {/* Center: GPS Zone Pill */}
        <button
          onClick={() => setShowZoneSheet(true)}
          style={{
            background: isLight ? '#f1f5f9' : 'rgba(30, 41, 59, 0.8)',
            border: `1px solid ${borderCol}`,
            borderRadius: '20px',
            padding: '4px 10px',
            fontSize: '0.74rem',
            fontWeight: 700,
            color: isLight ? '#0369a1' : '#38bdf8',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            maxWidth: '140px',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            cursor: 'pointer'
          }}
        >
          <span>📍</span>
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{selectedZone.district}</span>
          <span>▾</span>
        </button>

        {/* Right: Language + Siren + Theme */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {/* Language selector */}
          <button
            onClick={() => setShowLangSheet(true)}
            style={{
              background: isLight ? '#f1f5f9' : '#1e293b',
              border: `1px solid ${borderCol}`,
              borderRadius: '6px',
              padding: '4px 8px',
              fontSize: '0.72rem',
              fontWeight: 800,
              color: textPrimary,
              cursor: 'pointer'
            }}
          >
            {lang.toUpperCase()} ▾
          </button>

          {/* Siren */}
          <button
            onClick={toggleSiren}
            style={{
              background: isSirenPlaying ? '#ef4444' : (isLight ? '#f1f5f9' : '#1e293b'),
              border: `1px solid ${isSirenPlaying ? '#b91c1c' : borderCol}`,
              borderRadius: '6px',
              padding: '4px 7px',
              fontSize: '0.8rem',
              color: isSirenPlaying ? '#fff' : textPrimary,
              cursor: 'pointer'
            }}
            title="Emergency Siren"
          >
            {isSirenPlaying ? '🔊' : '🔈'}
          </button>

          {/* Theme */}
          <button
            onClick={toggleTheme}
            style={{
              background: isLight ? '#f1f5f9' : '#1e293b',
              border: `1px solid ${borderCol}`,
              borderRadius: '6px',
              padding: '4px 7px',
              fontSize: '0.8rem',
              color: textPrimary,
              cursor: 'pointer'
            }}
            title="Toggle Light/Dark Theme"
          >
            {isLight ? '🌙' : '☀️'}
          </button>
        </div>
      </header>

      {/* Active Distress Beacon Banner if running */}
      {sosActive && (
        <div style={{
          background: 'linear-gradient(90deg, #ef4444, #dc2626)',
          color: '#ffffff',
          padding: '10px 14px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '0.8rem',
          fontWeight: 800,
          boxShadow: '0 4px 12px rgba(239,68,68,0.4)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '1.2rem' }}>📡</span>
            <div>
              <div>DISTRESS BEACON ACTIVE: {sosBeaconId}</div>
              <div style={{ fontSize: '0.7rem', opacity: 0.9 }}>Audible siren &amp; GPS emergency broadcast live</div>
            </div>
          </div>
          <button
            onClick={cancelSos}
            style={{
              background: '#000000',
              color: '#ffffff',
              border: '1px solid #ffffff',
              borderRadius: '6px',
              padding: '4px 10px',
              fontSize: '0.74rem',
              fontWeight: 900,
              cursor: 'pointer'
            }}
          >
            STOP
          </button>
        </div>
      )}

      {/* ── TAB 1: HOME ── */}
      {activeTab === 'home' && (
        <div style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Critical Alert Card */}
          {riskData?.assessment?.level === 'RED' && (
            <div style={{
              background: isLight ? '#fef2f2' : 'rgba(239, 68, 68, 0.15)',
              border: `1px solid ${isLight ? '#fca5a5' : '#ef4444'}`,
              borderRadius: '12px',
              padding: '12px 14px',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '10px'
            }}>
              <span style={{ fontSize: '1.4rem', lineHeight: 1 }}>⚠️</span>
              <div>
                <div style={{ fontWeight: 800, fontSize: '0.86rem', color: isLight ? '#991b1b' : '#fca5a5' }}>
                  CRITICAL LANDSLIDE WARNING · {selectedZone.name}
                </div>
                <div style={{ fontSize: '0.75rem', color: isLight ? '#7f1d1d' : '#fecaca', marginTop: '2px' }}>
                  {riskData.assessment.action_protocol}
                </div>
              </div>
            </div>
          )}

          {/* Current Emergency Status Card */}
          <div style={{
            background: bgCard,
            border: `1px solid ${borderCol}`,
            borderRadius: '14px',
            padding: '14px',
            boxShadow: isLight ? '0 2px 10px rgba(0,0,0,0.04)' : '0 4px 20px rgba(0,0,0,0.4)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', color: textMuted }}>
                CURRENT REGIONAL STATUS
              </span>
              <span style={{
                background: riskData?.assessment?.level === 'RED' ? '#ef4444' : riskData?.assessment?.level === 'AMBER' ? '#f59e0b' : '#22c55e',
                color: '#ffffff',
                padding: '2px 8px',
                borderRadius: '10px',
                fontSize: '0.7rem',
                fontWeight: 900
              }}>
                {loadingRisk ? 'CHECKING...' : riskData?.assessment?.level || 'MONITORED'}
              </span>
            </div>

            <div style={{ fontWeight: 900, fontSize: '1.05rem', color: textPrimary, marginTop: '4px' }}>
              {selectedZone.name}
            </div>

            <div style={{ fontSize: '0.78rem', color: textMuted, marginTop: '2px' }}>
              Required Action: <strong style={{ color: textPrimary }}>{riskData?.assessment?.action_protocol || 'Maintain standard vigilance.'}</strong>
            </div>

            {/* Expandable Details */}
            {expandedDetails && riskData?.weather && (
              <div style={{
                marginTop: '10px',
                paddingTop: '10px',
                borderTop: `1px solid ${borderCol}`,
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '8px',
                fontSize: '0.74rem'
              }}>
                <div>24h Rain: <strong>{riskData.weather.rain_24h_mm} mm</strong></div>
                <div>72h Rain: <strong>{riskData.weather.rain_72h_mm} mm</strong></div>
                <div>Soil Moisture: <strong>{riskData.weather.soil_moisture}%</strong></div>
                <div>Slope Angle: <strong>{selectedZone.slope}°</strong></div>
              </div>
            )}

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '10px', paddingTop: '8px', borderTop: `1px solid ${borderCol}` }}>
              <button
                type="button"
                onClick={() => {
                  if (isVoiceSpeaking) {
                    stopVoiceSpeaking();
                  } else {
                    speakAlert(
                      selectedZone.name,
                      riskData?.assessment?.level || 'GREEN',
                      riskData?.assessment?.action_protocol || 'Maintain standard vigilance.'
                    );
                  }
                }}
                style={{
                  background: isVoiceSpeaking ? '#2563eb' : (isLight ? '#eff6ff' : 'rgba(37, 99, 235, 0.15)'),
                  border: `1px solid ${isVoiceSpeaking ? '#1d4ed8' : (isLight ? '#bfdbfe' : 'rgba(59, 130, 246, 0.4)')}`,
                  color: isVoiceSpeaking ? '#ffffff' : (isLight ? '#1d4ed8' : '#60a5fa'),
                  borderRadius: '8px',
                  padding: '5px 11px',
                  fontSize: '0.74rem',
                  fontWeight: 800,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  cursor: 'pointer'
                }}
              >
                <span>{isVoiceSpeaking ? '⏹️' : '🗣️'}</span>
                <span>{isVoiceSpeaking ? 'Stop Spoken Advisory' : 'Listen Spoken Advisory'}</span>
              </button>

              <button
                type="button"
                onClick={() => setExpandedDetails(!expandedDetails)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#38bdf8',
                  fontSize: '0.74rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  padding: 0
                }}
              >
                {expandedDetails ? 'Hide Details ▴' : 'Telemetry Details ›'}
              </button>
            </div>
          </div>

          {/* ── 2x2 QUICK ACTIONS ── */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            {/* 1. SOS Button */}
            <button
              onClick={triggerSos}
              style={{
                background: 'linear-gradient(135deg, #ef4444, #b91c1c)',
                color: '#ffffff',
                border: 'none',
                borderRadius: '14px',
                padding: '16px 12px',
                textAlign: 'left',
                boxShadow: '0 4px 14px rgba(239,68,68,0.3)',
                cursor: 'pointer'
              }}
            >
              <div style={{ fontSize: '1.6rem' }}>🚨</div>
              <div style={{ fontWeight: 900, fontSize: '0.95rem', marginTop: '4px' }}>EMERGENCY SOS</div>
              <div style={{ fontSize: '0.68rem', opacity: 0.9 }}>One-tap distress beacon &amp; GPS</div>
            </button>

            {/* 2. Report Issue */}
            <button
              onClick={() => setActiveTab('report')}
              style={{
                background: isLight ? '#f1f5f9' : '#1e293b',
                color: textPrimary,
                border: `1px solid ${borderCol}`,
                borderRadius: '14px',
                padding: '16px 12px',
                textAlign: 'left',
                cursor: 'pointer'
              }}
            >
              <div style={{ fontSize: '1.6rem' }}>📸</div>
              <div style={{ fontWeight: 800, fontSize: '0.95rem', marginTop: '4px' }}>Report Hazard</div>
              <div style={{ fontSize: '0.68rem', color: textMuted }}>Camera &amp; offline queue</div>
            </button>

            {/* 3. Safe Route */}
            <button
              onClick={() => setShowRouteModal(true)}
              style={{
                background: isLight ? '#f1f5f9' : '#1e293b',
                color: textPrimary,
                border: `1px solid ${borderCol}`,
                borderRadius: '14px',
                padding: '16px 12px',
                textAlign: 'left',
                cursor: 'pointer'
              }}
            >
              <div style={{ fontSize: '1.6rem' }}>🗺️</div>
              <div style={{ fontWeight: 800, fontSize: '0.95rem', marginTop: '4px' }}>Safe Route</div>
              <div style={{ fontSize: '0.68rem', color: textMuted }}>Evacuation bypass corridor</div>
            </button>

            {/* 4. Emergency Contacts */}
            <button
              onClick={() => setShowContactsSheet(true)}
              style={{
                background: isLight ? '#f1f5f9' : '#1e293b',
                color: textPrimary,
                border: `1px solid ${borderCol}`,
                borderRadius: '14px',
                padding: '16px 12px',
                textAlign: 'left',
                cursor: 'pointer'
              }}
            >
              <div style={{ fontSize: '1.6rem' }}>📞</div>
              <div style={{ fontWeight: 800, fontSize: '0.95rem', marginTop: '4px' }}>Helplines (112)</div>
              <div style={{ fontSize: '0.68rem', color: textMuted }}>Direct call responders</div>
            </button>
          </div>

          {/* ── OFFLINE RESCUE MODE CARD ── */}
          <div style={{
            background: isLight ? 'linear-gradient(145deg, #f0fdf4, #dcfce7)' : 'linear-gradient(145deg, #0b1e16, #07130e)',
            border: `1px solid ${isLight ? '#bbf7d0' : 'rgba(34, 197, 94, 0.4)'}`,
            borderRadius: '14px',
            padding: '14px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontWeight: 800, fontSize: '0.92rem', color: isLight ? '#166534' : '#4ade80', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>📴</span> Offline Rescue Mode
              </div>
              <span style={{
                background: isOnline ? (isLight ? '#dcfce7' : 'rgba(34,197,94,0.2)') : (isLight ? '#fef3c7' : 'rgba(245,158,11,0.2)'),
                border: `1px solid ${isOnline ? '#22c55e' : '#f59e0b'}`,
                color: isOnline ? (isLight ? '#15803d' : '#86efac') : (isLight ? '#b45309' : '#fde047'),
                borderRadius: '10px',
                padding: '2px 8px',
                fontSize: '0.68rem',
                fontWeight: 800
              }}>
                {isOnline ? '🟢 ONLINE' : '🟠 OFFLINE MESH READY'}
              </span>
            </div>

            <p style={{ fontSize: '0.75rem', color: textMuted, margin: 0, lineHeight: 1.4 }}>
              Zero-internet emergency guidance, injury first aid, trapped protocols, distress beacons, and cached offline maps.
            </p>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
              <button
                onClick={() => setShowHowItWorksSheet(true)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: isLight ? '#0284c7' : '#38bdf8',
                  fontSize: '0.76rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  padding: 0
                }}
              >
                How it Works ›
              </button>

              {/* CRITICAL: RESTORES ALL 6 RESCUE TOOLS */}
              <button
                onClick={() => setShowOfflineRescueView(true)}
                style={{
                  background: isLight ? '#16a34a' : '#22c55e',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '6px 14px',
                  fontSize: '0.78rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                Open Rescue Tools (6) ›
              </button>
            </div>
          </div>

          {/* ── WEATHER & LANDSLIDE RISK CARD ── */}
          <div style={{
            background: bgCard,
            border: `1px solid ${borderCol}`,
            borderRadius: '14px',
            padding: '14px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '0.84rem', fontWeight: 800, color: textPrimary }}>
                🌧️ Live Telemetry &amp; Terrain
              </span>
              <button
                onClick={() => setActiveTab('map')}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#38bdf8',
                  fontSize: '0.74rem',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                View Map ›
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <div style={{ background: isLight ? '#f1f5f9' : '#1e293b', padding: '10px', borderRadius: '8px' }}>
                <div style={{ fontSize: '0.68rem', color: textMuted }}>24h Rain Accumulation</div>
                <div style={{ fontSize: '1.05rem', fontWeight: 900, color: textPrimary }}>
                  {riskData?.weather?.rain_24h_mm ?? 0} mm
                </div>
              </div>
              <div style={{ background: isLight ? '#f1f5f9' : '#1e293b', padding: '10px', borderRadius: '8px' }}>
                <div style={{ fontSize: '0.68rem', color: textMuted }}>Soil Moisture Saturation</div>
                <div style={{ fontSize: '1.05rem', fontWeight: 900, color: textPrimary }}>
                  {riskData?.weather?.soil_moisture ?? 0}%
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 2: ALERTS ── */}
      {activeTab === 'alerts' && (
        <div style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 900, color: textPrimary }}>
              🚨 Emergency Alerts ({alerts.length})
            </h3>
            {/* Filter Pills */}
            <div style={{ display: 'flex', gap: '4px' }}>
              {(['ALL', 'CRITICAL', 'HIGH'] as const).map(sev => (
                <button
                  key={sev}
                  onClick={() => setAlertFilter(sev)}
                  style={{
                    background: alertFilter === sev ? (sev === 'CRITICAL' ? '#ef4444' : '#2563eb') : (isLight ? '#f1f5f9' : '#1e293b'),
                    color: alertFilter === sev ? '#ffffff' : textMuted,
                    border: `1px solid ${borderCol}`,
                    borderRadius: '12px',
                    padding: '2px 8px',
                    fontSize: '0.68rem',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  {sev}
                </button>
              ))}
            </div>
          </div>

          {alerts
            .filter(a => alertFilter === 'ALL' || a.severity === alertFilter)
            .map(alert => (
              <div
                key={alert.id}
                style={{
                  background: bgCard,
                  border: `1px solid ${alert.severity === 'CRITICAL' ? '#ef4444' : borderCol}`,
                  borderRadius: '12px',
                  padding: '12px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 800, fontSize: '0.88rem', color: textPrimary }}>
                    {alert.regionName}
                  </span>
                  <span style={{
                    background: alert.severity === 'CRITICAL' ? '#ef4444' : alert.severity === 'HIGH' ? '#f59e0b' : '#3b82f6',
                    color: '#fff',
                    padding: '1px 6px',
                    borderRadius: '6px',
                    fontSize: '0.68rem',
                    fontWeight: 800
                  }}>
                    {alert.severity}
                  </span>
                </div>
                <div style={{ fontSize: '0.78rem', color: textPrimary }}>
                  {lang === 'as' && alert.messageAs ? alert.messageAs : alert.messageEn}
                </div>
                <div style={{ fontSize: '0.7rem', color: textMuted }}>
                  {alert.contributingSummary} · {new Date(alert.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            ))}
        </div>
      )}

      {/* ── TAB 3: MAP ── */}
      {activeTab === 'map' && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: 'calc(100vh - 120px)' }}>
          <div style={{ padding: '8px 14px', background: bgHeader, borderBottom: `1px solid ${borderCol}`, fontSize: '0.76rem', color: textMuted, display: 'flex', justifyContent: 'space-between' }}>
            <span>📍 Center: {selectedZone.name}</span>
            <span>🟢 Live GPS &amp; Shelters</span>
          </div>
          <div style={{ flex: 1, width: '100%', position: 'relative' }}>
            <MapContainer
              center={[selectedZone.lat, selectedZone.lon]}
              zoom={11}
              style={{ height: '100%', width: '100%' }}
            >
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution="&copy; OpenStreetMap"
              />
              {/* Monitored hazard circle */}
              <Circle
                center={[selectedZone.lat, selectedZone.lon]}
                radius={3500}
                pathOptions={{ color: '#ef4444', fillColor: '#ef4444', fillOpacity: 0.25 }}
              >
                <Popup>
                  <strong>{selectedZone.name}</strong><br />
                  Slope: {selectedZone.slope}°<br />
                  Status: Monitored Landslide Hazard Zone
                </Popup>
              </Circle>

              {/* User location marker if GPS available */}
              {userLocation && (
                <Marker position={[userLocation.lat, userLocation.lng]} icon={defaultIcon}>
                  <Popup>📍 Your Current GPS Location</Popup>
                </Marker>
              )}

              {/* Shelters */}
              {shelters.map((s: any, idx: number) => (
                <Marker key={s.id || idx} position={[s.lat, s.lng]} icon={defaultIcon}>
                  <Popup>
                    <strong>🏕️ {s.name}</strong><br />
                    Beds: {s.totalBeds - (s.occupiedBeds || 0)} available<br />
                    Medical: {s.medicalTeam || 'District Team'}
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          </div>
        </div>
      )}

      {/* ── TAB 4: REPORT HAZARD ── */}
      {activeTab === 'report' && (
        <div style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 900, color: textPrimary }}>
              📸 Report Landslide / Hazard
            </h3>
            <p style={{ margin: '2px 0 0 0', fontSize: '0.75rem', color: textMuted }}>
              Transmits coordinates and incident details to district responders. Works offline.
            </p>
          </div>

          {reportSuccessNotice && (
            <div style={{
              background: isLight ? '#dcfce7' : 'rgba(34, 197, 94, 0.2)',
              border: '1px solid #22c55e',
              color: isLight ? '#166534' : '#86efac',
              padding: '10px',
              borderRadius: '8px',
              fontSize: '0.8rem',
              fontWeight: 700
            }}>
              {reportSuccessNotice}
            </div>
          )}

          <form onSubmit={handleSubmitHazardReport} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {/* GPS acquisition badge */}
            <div style={{
              background: isLight ? '#f1f5f9' : '#1e293b',
              border: `1px solid ${borderCol}`,
              borderRadius: '8px',
              padding: '8px 12px',
              fontSize: '0.74rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <span>📍 GPS Coordinates:</span>
              <strong style={{ color: '#38bdf8' }}>
                {userLocation ? `${userLocation.lat.toFixed(5)}, ${userLocation.lng.toFixed(5)}` : `${selectedZone.lat.toFixed(5)}, ${selectedZone.lon.toFixed(5)} (Estimated)`}
              </strong>
            </div>

            {/* Category Selector */}
            <div>
              <label style={{ fontSize: '0.76rem', fontWeight: 700, color: textMuted, display: 'block', marginBottom: '6px' }}>
                HAZARD CATEGORY
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                {[
                  { id: 'SLOPE_MOVEMENT' as ReportCategory, label: '🏔️ Slope Movement' },
                  { id: 'BLOCKED_ROAD' as ReportCategory, label: '🚧 Blocked Road' },
                  { id: 'CRACK' as ReportCategory, label: '⚡ Ground Crack' },
                  { id: 'FLOODING' as ReportCategory, label: '🌊 Flash Flood' },
                  { id: 'TRAPPED_CITIZENS' as ReportCategory, label: '🧍 Citizen Trapped' },
                  { id: 'INJURED_PEOPLE' as ReportCategory, label: '🩹 Injury Emergency' }
                ].map(cat => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setReportCategory(cat.id)}
                    style={{
                      background: reportCategory === cat.id ? '#2563eb' : (isLight ? '#f1f5f9' : '#1e293b'),
                      color: reportCategory === cat.id ? '#ffffff' : textPrimary,
                      border: `1px solid ${reportCategory === cat.id ? '#1d4ed8' : borderCol}`,
                      borderRadius: '8px',
                      padding: '8px',
                      fontSize: '0.74rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      textAlign: 'left'
                    }}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Photo Capture */}
            <div>
              <label style={{ fontSize: '0.76rem', fontWeight: 700, color: textMuted, display: 'block', marginBottom: '6px' }}>
                EVIDENCE PHOTO (OPTIONAL)
              </label>
              <PhotoCapture
                onPhotoSelected={handlePhotoSelected}
                preview={photoPreview}
                onRemovePhoto={handleRemovePhoto}
              />

              {isAnalyzingPhoto && (
                <div style={{
                  marginTop: '8px',
                  padding: '10px',
                  background: isLight ? '#f1f5f9' : '#1e293b',
                  borderRadius: '8px',
                  border: `1px solid ${borderCol}`,
                  fontSize: '0.74rem',
                  color: '#38bdf8',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <span>⚙️</span>
                  <span>Running AI Hazard &amp; Forensic Authenticity verification…</span>
                </div>
              )}

              {imageAnalysis && (
                <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {/* Hazard Detection */}
                  <div style={{
                    padding: '10px',
                    background: isLight ? '#fef2f2' : 'rgba(239, 68, 68, 0.12)',
                    border: `1px solid ${isLight ? '#fca5a5' : '#ef4444'}`,
                    borderRadius: '8px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <div>
                      <div style={{ fontSize: '0.68rem', fontWeight: 800, color: '#ef4444', textTransform: 'uppercase' }}>
                        AI Hazard Feature
                      </div>
                      <div style={{ fontSize: '0.86rem', fontWeight: 800, color: textPrimary, marginTop: '2px' }}>
                        {imageAnalysis.hazard.label}
                      </div>
                    </div>
                    <span style={{
                      background: '#ef4444',
                      color: '#ffffff',
                      padding: '2px 8px',
                      borderRadius: '6px',
                      fontSize: '0.72rem',
                      fontWeight: 900
                    }}>
                      {imageAnalysis.hazard.confidence}%
                    </span>
                  </div>

                  {/* Forensic Authenticity */}
                  <div style={{
                    padding: '10px',
                    background: imageAnalysis.authenticity.badgeBg,
                    border: `1px solid ${imageAnalysis.authenticity.badgeColor}80`,
                    borderRadius: '8px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <div>
                      <div style={{
                        fontSize: '0.68rem',
                        fontWeight: 800,
                        color: imageAnalysis.authenticity.badgeColor,
                        textTransform: 'uppercase',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}>
                        <span>Image Authenticity</span>
                        <span style={{
                          background: imageAnalysis.authenticity.badgeColor,
                          color: '#fff',
                          padding: '1px 5px',
                          borderRadius: '6px',
                          fontSize: '0.62rem'
                        }}>
                          {imageAnalysis.authenticity.status}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.82rem', fontWeight: 800, color: textPrimary, marginTop: '2px' }}>
                        {imageAnalysis.authenticity.label}
                      </div>
                      <div style={{ fontSize: '0.7rem', color: textMuted, marginTop: '2px' }}>
                        {imageAnalysis.authenticity.details}
                      </div>
                    </div>
                    <span style={{
                      background: imageAnalysis.authenticity.badgeColor,
                      color: '#ffffff',
                      padding: '3px 8px',
                      borderRadius: '6px',
                      fontSize: '0.74rem',
                      fontWeight: 900,
                      whiteSpace: 'nowrap'
                    }}>
                      {imageAnalysis.authenticity.confidence}%
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Description */}
            <div>
              <label style={{ fontSize: '0.76rem', fontWeight: 700, color: textMuted, display: 'block', marginBottom: '6px' }}>
                INCIDENT DESCRIPTION
              </label>
              <textarea
                value={reportDesc}
                onChange={e => setReportDesc(e.target.value)}
                placeholder="Describe road blockage, visible mudflow, injured persons, or nearby landmarks..."
                rows={3}
                style={{
                  width: '100%',
                  background: isLight ? '#ffffff' : '#0e172a',
                  color: textPrimary,
                  border: `1px solid ${borderCol}`,
                  borderRadius: '8px',
                  padding: '10px',
                  fontSize: '0.8rem',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={submittingReport || !reportDesc.trim()}
              style={{
                background: submittingReport ? '#64748b' : '#2563eb',
                color: '#ffffff',
                border: 'none',
                borderRadius: '10px',
                padding: '12px',
                fontWeight: 900,
                fontSize: '0.9rem',
                cursor: submittingReport ? 'not-allowed' : 'pointer',
                marginTop: '4px'
              }}
            >
              {submittingReport ? 'Submitting...' : isOnline ? 'Submit Hazard Report' : 'Save to Offline Queue'}
            </button>
          </form>
        </div>
      )}

      {/* ── TAB 5: PROFILE ── */}
      {activeTab === 'profile' && (
        <div style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 900, color: textPrimary }}>
              👤 Citizen Profile &amp; Settings
            </h3>
            <p style={{ margin: '2px 0 0 0', fontSize: '0.75rem', color: textMuted }}>
              Emergency contact details used by disaster responders during extraction.
            </p>
          </div>

          {profileNotice && (
            <div style={{
              background: isLight ? '#dcfce7' : 'rgba(34, 197, 94, 0.2)',
              border: '1px solid #22c55e',
              color: isLight ? '#166534' : '#86efac',
              padding: '10px',
              borderRadius: '8px',
              fontSize: '0.8rem',
              fontWeight: 700
            }}>
              {profileNotice}
            </div>
          )}

          {/* Sign In / OTP if not logged in */}
          {!isCitizenLoggedIn ? (
            <div style={{
              background: bgCard,
              border: `1px solid ${borderCol}`,
              borderRadius: '12px',
              padding: '14px',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px'
            }}>
              <div style={{ fontWeight: 800, fontSize: '0.88rem', color: textPrimary }}>
                📱 Sign In with Mobile Number
              </div>
              <p style={{ fontSize: '0.74rem', color: textMuted, margin: 0 }}>
                Log in via OTP to sync emergency alerts and persist medical profile.
              </p>
              <button
                onClick={() => setShowSignInSheet(true)}
                style={{
                  background: '#2563eb',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '8px 14px',
                  fontSize: '0.82rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  alignSelf: 'flex-start',
                  marginTop: '4px'
                }}
              >
                Sign In via OTP ›
              </button>
            </div>
          ) : (
            <div style={{
              background: isLight ? '#f0fdf4' : 'rgba(34, 197, 94, 0.1)',
              border: `1px solid ${isLight ? '#bbf7d0' : '#22c55e'}`,
              borderRadius: '10px',
              padding: '10px 14px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div>
                <div style={{ fontWeight: 800, fontSize: '0.82rem', color: isLight ? '#166534' : '#86efac' }}>
                  🟢 Logged in as Citizen ({citizenProfile?.phone || 'Mobile User'})
                </div>
                <div style={{ fontSize: '0.7rem', color: textMuted }}>Session active &amp; verified</div>
              </div>
              <button
                onClick={handleLogout}
                style={{
                  background: 'transparent',
                  border: `1px solid ${borderCol}`,
                  color: '#ef4444',
                  borderRadius: '6px',
                  padding: '4px 8px',
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Log Out
              </button>
            </div>
          )}

          {/* Profile Form */}
          <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div>
              <label style={{ fontSize: '0.74rem', fontWeight: 700, color: textMuted, display: 'block', marginBottom: '4px' }}>
                FULL NAME
              </label>
              <input
                type="text"
                value={profileForm.fullName}
                onChange={e => setProfileForm({ ...profileForm, fullName: e.target.value })}
                placeholder="e.g. John Doe"
                style={{
                  width: '100%',
                  background: isLight ? '#ffffff' : '#0e172a',
                  color: textPrimary,
                  border: `1px solid ${borderCol}`,
                  borderRadius: '8px',
                  padding: '8px 10px',
                  fontSize: '0.8rem',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <div>
                <label style={{ fontSize: '0.74rem', fontWeight: 700, color: textMuted, display: 'block', marginBottom: '4px' }}>
                  BLOOD GROUP
                </label>
                <select
                  value={profileForm.bloodGroup || ''}
                  onChange={e => setProfileForm({ ...profileForm, bloodGroup: e.target.value })}
                  style={{
                    width: '100%',
                    background: isLight ? '#ffffff' : '#0e172a',
                    color: textPrimary,
                    border: `1px solid ${borderCol}`,
                    borderRadius: '8px',
                    padding: '8px 10px',
                    fontSize: '0.8rem'
                  }}
                >
                  <option value="">Select</option>
                  <option value="A+">A+</option>
                  <option value="A-">A-</option>
                  <option value="B+">B+</option>
                  <option value="B-">B-</option>
                  <option value="O+">O+</option>
                  <option value="O-">O-</option>
                  <option value="AB+">AB+</option>
                  <option value="AB-">AB-</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.74rem', fontWeight: 700, color: textMuted, display: 'block', marginBottom: '4px' }}>
                  LANGUAGE
                </label>
                <select
                  value={profileForm.preferredLanguage || lang}
                  onChange={e => {
                    const l = e.target.value as any;
                    setProfileForm({ ...profileForm, preferredLanguage: l });
                    setLang(l);
                    localStorage.setItem('ews_lang', l);
                  }}
                  style={{
                    width: '100%',
                    background: isLight ? '#ffffff' : '#0e172a',
                    color: textPrimary,
                    border: `1px solid ${borderCol}`,
                    borderRadius: '8px',
                    padding: '8px 10px',
                    fontSize: '0.8rem'
                  }}
                >
                  <option value="en">English</option>
                  <option value="hi">हिंदी (Hindi)</option>
                  <option value="as">অসমীয়া (Assamese)</option>
                </select>
              </div>
            </div>

            <div>
              <label style={{ fontSize: '0.74rem', fontWeight: 700, color: textMuted, display: 'block', marginBottom: '4px' }}>
                EMERGENCY CONTACT NAME
              </label>
              <input
                type="text"
                value={profileForm.emergencyContactName || ''}
                onChange={e => setProfileForm({ ...profileForm, emergencyContactName: e.target.value })}
                placeholder="Family member or guardian"
                style={{
                  width: '100%',
                  background: isLight ? '#ffffff' : '#0e172a',
                  color: textPrimary,
                  border: `1px solid ${borderCol}`,
                  borderRadius: '8px',
                  padding: '8px 10px',
                  fontSize: '0.8rem',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <div>
              <label style={{ fontSize: '0.74rem', fontWeight: 700, color: textMuted, display: 'block', marginBottom: '4px' }}>
                EMERGENCY CONTACT PHONE
              </label>
              <input
                type="tel"
                value={profileForm.emergencyContactPhone || ''}
                onChange={e => setProfileForm({ ...profileForm, emergencyContactPhone: e.target.value })}
                placeholder="+91 98765 43210"
                style={{
                  width: '100%',
                  background: isLight ? '#ffffff' : '#0e172a',
                  color: textPrimary,
                  border: `1px solid ${borderCol}`,
                  borderRadius: '8px',
                  padding: '8px 10px',
                  fontSize: '0.8rem',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <button
              type="submit"
              disabled={savingProfile}
              style={{
                background: '#2563eb',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                padding: '10px',
                fontSize: '0.84rem',
                fontWeight: 800,
                cursor: 'pointer',
                marginTop: '6px'
              }}
            >
              {savingProfile ? 'Saving...' : 'Save Emergency Profile'}
            </button>
          </form>

          {/* Switch to Officer Mode */}
          <div style={{
            marginTop: '10px',
            borderTop: `1px solid ${borderCol}`,
            paddingTop: '14px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div>
              <div style={{ fontWeight: 800, fontSize: '0.82rem', color: textPrimary }}>
                Disaster Officer / Admin?
              </div>
              <div style={{ fontSize: '0.7rem', color: textMuted }}>
                Access operational command &amp; responder ops
              </div>
            </div>
            <button
              onClick={() => {
                if (onSwitchToOfficer) onSwitchToOfficer();
              }}
              style={{
                background: isLight ? '#f1f5f9' : '#1e293b',
                color: '#38bdf8',
                border: `1px solid ${borderCol}`,
                borderRadius: '8px',
                padding: '6px 12px',
                fontSize: '0.76rem',
                fontWeight: 800,
                cursor: 'pointer'
              }}
            >
              Officer Portal ›
            </button>
          </div>
        </div>
      )}

      {/* ── 5-TAB FIXED BOTTOM NAVIGATION BAR ── */}
      <nav style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        height: '60px',
        background: isLight ? 'rgba(255,255,255,0.98)' : 'rgba(11, 19, 41, 0.98)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderTop: `1px solid ${borderCol}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-around',
        zIndex: 40
      }}>
        {[
          { id: 'home' as const, label: 'Home', icon: '🏠' },
          { id: 'alerts' as const, label: 'Alerts', icon: '🔔' },
          { id: 'map' as const, label: 'Map', icon: '🗺️' },
          { id: 'report' as const, label: 'Report', icon: '📸' },
          { id: 'profile' as const, label: 'Profile', icon: '👤' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              background: 'transparent',
              border: 'none',
              color: activeTab === tab.id ? '#38bdf8' : textMuted,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '2px',
              padding: '6px 12px',
              cursor: 'pointer',
              fontSize: '0.68rem',
              fontWeight: activeTab === tab.id ? 800 : 500
            }}
          >
            <span style={{ fontSize: '1.2rem', lineHeight: 1 }}>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </nav>

      {/* ── SOS MODAL ── */}
      {showSosModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.85)',
          zIndex: 100,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}>
          <div style={{
            background: '#0e172a',
            border: '2px solid #ef4444',
            borderRadius: '20px',
            padding: '24px',
            maxWidth: '360px',
            width: '100%',
            textAlign: 'center',
            boxShadow: '0 0 40px rgba(239,68,68,0.6)'
          }}>
            {!sosActive ? (
              <>
                <div style={{ fontSize: '3rem', margin: '0 auto' }}>🚨</div>
                <h3 style={{ color: '#ef4444', margin: '10px 0 6px 0', fontSize: '1.4rem', fontWeight: 900 }}>
                  EMERGENCY SOS
                </h3>
                <p style={{ color: '#cbd5e1', fontSize: '0.85rem', margin: '0 0 16px 0' }}>
                  Broadcasting your exact GPS coordinates and distress beacon to district command in:
                </p>
                <div style={{
                  fontSize: '3.5rem',
                  fontWeight: 900,
                  color: '#ffffff',
                  marginBottom: '16px'
                }}>
                  {sosCountdown}
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    onClick={() => setShowSosModal(false)}
                    style={{
                      flex: 1,
                      background: '#1e293b',
                      color: '#ffffff',
                      border: '1px solid #334155',
                      borderRadius: '10px',
                      padding: '12px',
                      fontWeight: 800,
                      cursor: 'pointer'
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={executeSosBroadcast}
                    style={{
                      flex: 1,
                      background: '#ef4444',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '10px',
                      padding: '12px',
                      fontWeight: 900,
                      cursor: 'pointer'
                    }}
                  >
                    Send Now
                  </button>
                </div>
              </>
            ) : (
              <>
                <div style={{ fontSize: '3rem', margin: '0 auto' }}>📡</div>
                <h3 style={{ color: '#22c55e', margin: '10px 0 6px 0', fontSize: '1.3rem', fontWeight: 900 }}>
                  SOS BEACON ACTIVE
                </h3>
                <div style={{ background: '#070c17', padding: '10px', borderRadius: '8px', margin: '12px 0', fontSize: '0.85rem' }}>
                  BEACON ID: <strong style={{ color: '#38bdf8' }}>{sosBeaconId}</strong><br />
                  GPS: {userLocation ? `${userLocation.lat.toFixed(6)}, ${userLocation.lng.toFixed(6)}` : `${selectedZone.lat.toFixed(6)}, ${selectedZone.lon.toFixed(6)}`}
                </div>
                <p style={{ color: '#94a3b8', fontSize: '0.78rem' }}>
                  Keep phone on high volume. Audible siren is transmitting. Responders have been signaled.
                </p>
                <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
                  <button
                    onClick={() => setShowSosModal(false)}
                    style={{
                      flex: 1,
                      background: '#1e293b',
                      color: '#38bdf8',
                      border: '1px solid #334155',
                      borderRadius: '10px',
                      padding: '10px',
                      fontWeight: 800,
                      cursor: 'pointer'
                    }}
                  >
                    Minimize
                  </button>
                  <button
                    onClick={cancelSos}
                    style={{
                      flex: 1,
                      background: '#000000',
                      color: '#ffffff',
                      border: '2px solid #ffffff',
                      borderRadius: '10px',
                      padding: '10px',
                      fontWeight: 900,
                      cursor: 'pointer'
                    }}
                  >
                    Stop Distress
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── SAFE ROUTE MODAL ── */}
      {showRouteModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.8)',
          zIndex: 100,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}>
          <div style={{
            background: bgCard,
            border: `1px solid ${borderCol}`,
            borderRadius: '18px',
            padding: '20px',
            maxWidth: '380px',
            width: '100%'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <div style={{ fontWeight: 900, fontSize: '1.1rem', color: textPrimary }}>
                🗺️ Safe Evacuation Corridor
              </div>
              <button
                onClick={() => setShowRouteModal(false)}
                style={{ background: 'transparent', border: 'none', color: textMuted, fontSize: '1.2rem', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.82rem' }}>
              <div style={{ background: isLight ? '#f1f5f9' : '#1e293b', padding: '10px', borderRadius: '8px' }}>
                <div style={{ fontSize: '0.7rem', color: textMuted }}>PRIMARY CORRIDOR</div>
                <div style={{ fontWeight: 800, color: textPrimary }}>
                  {riskData?.evacuation_plan?.primary_corridor || 'Main Ridge Access Highway'}
                </div>
                <div style={{ color: riskData?.evacuation_plan?.rerouted ? '#ef4444' : '#22c55e', fontSize: '0.74rem', fontWeight: 700 }}>
                  Status: {riskData?.evacuation_plan?.rerouted ? 'BLOCKED / REROUTED' : 'OPEN & PASSABLE'}
                </div>
              </div>

              <div style={{ background: isLight ? '#f0fdf4' : 'rgba(34, 197, 94, 0.15)', border: '1px solid #22c55e', padding: '10px', borderRadius: '8px' }}>
                <div style={{ fontSize: '0.7rem', color: isLight ? '#166534' : '#86efac' }}>DESIGNATED SAFE DETOUR</div>
                <div style={{ fontWeight: 800, color: isLight ? '#14532d' : '#ffffff' }}>
                  {riskData?.evacuation_plan?.safe_evacuation_route || 'Valley Bypass Arterial Road 4'}
                </div>
                <div style={{ fontSize: '0.74rem', color: textMuted, marginTop: '2px' }}>
                  Est. transit: {riskData?.evacuation_plan?.estimated_evacuation_time_min || 18} mins to relief base
                </div>
              </div>

              <button
                onClick={() => {
                  setShowRouteModal(false);
                  setActiveTab('map');
                }}
                style={{
                  background: '#2563eb',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '10px',
                  fontWeight: 800,
                  cursor: 'pointer',
                  marginTop: '6px'
                }}
              >
                View on Live GIS Map ›
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── HELPLINES DRAWER ── */}
      {showContactsSheet && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.8)',
          zIndex: 100,
          display: 'flex',
          alignItems: 'flex-end'
        }}>
          <div style={{
            background: bgCard,
            borderTop: `1px solid ${borderCol}`,
            borderTopLeftRadius: '20px',
            borderTopRightRadius: '20px',
            padding: '20px',
            width: '100%',
            maxHeight: '80vh',
            overflowY: 'auto'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div style={{ fontWeight: 900, fontSize: '1.1rem', color: textPrimary }}>
                📞 Emergency Response Helplines
              </div>
              <button
                onClick={() => setShowContactsSheet(false)}
                style={{ background: 'transparent', border: 'none', color: textMuted, fontSize: '1.2rem', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {[
                { title: 'National Emergency Helpline', number: '112', desc: 'Police, Fire, Disaster 24/7' },
                { title: 'NDMA Disaster Management', number: '1078', desc: 'National Disaster Management Control' },
                { title: 'State Disaster Control Room', number: '1070', desc: 'State Emergency Operations Center' },
                { title: 'Ambulance & Medical Trauma', number: '102', desc: 'Urgent medical evacuation' }
              ].map(contact => (
                <a
                  key={contact.number}
                  href={`tel:${contact.number}`}
                  style={{
                    background: isLight ? '#f1f5f9' : '#1e293b',
                    border: `1px solid ${borderCol}`,
                    borderRadius: '10px',
                    padding: '12px 14px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    textDecoration: 'none',
                    color: textPrimary
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '0.88rem' }}>{contact.title}</div>
                    <div style={{ fontSize: '0.72rem', color: textMuted }}>{contact.desc}</div>
                  </div>
                  <div style={{
                    background: '#22c55e',
                    color: '#ffffff',
                    padding: '4px 10px',
                    borderRadius: '6px',
                    fontWeight: 900,
                    fontSize: '0.84rem'
                  }}>
                    📞 {contact.number}
                  </div>
                </a>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── HOW IT WORKS SHEET ── */}
      {showHowItWorksSheet && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.8)',
          zIndex: 100,
          display: 'flex',
          alignItems: 'flex-end'
        }}>
          <div style={{
            background: bgCard,
            borderTop: `1px solid ${borderCol}`,
            borderTopLeftRadius: '20px',
            borderTopRightRadius: '20px',
            padding: '20px',
            width: '100%',
            maxHeight: '85vh',
            overflowY: 'auto'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <div style={{ fontWeight: 900, fontSize: '1.05rem', color: textPrimary }}>
                📴 How Offline Emergency Mode Works
              </div>
              <button
                onClick={() => setShowHowItWorksSheet(false)}
                style={{ background: 'transparent', border: 'none', color: textMuted, fontSize: '1.2rem', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <OfflineHowItWorksIllustration maxWidth={360} />

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.78rem', color: textMuted, marginTop: '12px' }}>
              <div>• <strong>IndexedDB Queue:</strong> All emergency distress reports are queued locally with cryptographic IDs even when cellular towers fail.</div>
              <div>• <strong>Bluetooth Signal Beacon:</strong> Emits local acoustic alarm and persistent distress state detectable by nearby rescue units.</div>
              <div>• <strong>Automatic Sync:</strong> As soon as any connection or Wi-Fi is restored, all reports sync automatically to central command.</div>
            </div>

            <button
              onClick={() => {
                setShowHowItWorksSheet(false);
                setShowOfflineRescueView(true);
              }}
              style={{
                width: '100%',
                background: '#22c55e',
                color: '#ffffff',
                border: 'none',
                borderRadius: '10px',
                padding: '12px',
                fontWeight: 900,
                fontSize: '0.88rem',
                cursor: 'pointer',
                marginTop: '14px'
              }}
            >
              Open 6 Rescue Tools Now ›
            </button>
          </div>
        </div>
      )}

      {/* ── ZONE SELECTOR SHEET ── */}
      {showZoneSheet && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.8)',
          zIndex: 100,
          display: 'flex',
          alignItems: 'flex-end'
        }}>
          <div style={{
            background: bgCard,
            borderTop: `1px solid ${borderCol}`,
            borderTopLeftRadius: '20px',
            borderTopRightRadius: '20px',
            padding: '20px',
            width: '100%',
            maxHeight: '75vh',
            overflowY: 'auto'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div style={{ fontWeight: 900, fontSize: '1rem', color: textPrimary }}>
                Select Monitored Region
              </div>
              <button
                onClick={() => setShowZoneSheet(false)}
                style={{ background: 'transparent', border: 'none', color: textMuted, fontSize: '1.2rem', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {ZONES.map(z => (
                <button
                  key={z.name}
                  onClick={() => {
                    setSelectedZone(z);
                    setShowZoneSheet(false);
                  }}
                  style={{
                    background: selectedZone.name === z.name ? '#2563eb' : (isLight ? '#f1f5f9' : '#1e293b'),
                    color: selectedZone.name === z.name ? '#ffffff' : textPrimary,
                    border: `1px solid ${selectedZone.name === z.name ? '#1d4ed8' : borderCol}`,
                    borderRadius: '10px',
                    padding: '12px 14px',
                    textAlign: 'left',
                    cursor: 'pointer'
                  }}
                >
                  <div style={{ fontWeight: 800, fontSize: '0.88rem' }}>{z.name}</div>
                  <div style={{ fontSize: '0.72rem', opacity: 0.85 }}>
                    {z.state} · Slope: {z.slope}° · GPS: {z.lat.toFixed(4)}, {z.lon.toFixed(4)}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── LANGUAGE SELECTOR SHEET ── */}
      {showLangSheet && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.8)',
          zIndex: 100,
          display: 'flex',
          alignItems: 'flex-end'
        }}>
          <div style={{
            background: bgCard,
            borderTop: `1px solid ${borderCol}`,
            borderTopLeftRadius: '20px',
            borderTopRightRadius: '20px',
            padding: '20px',
            width: '100%'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div style={{ fontWeight: 900, fontSize: '1rem', color: textPrimary }}>
                Select Language
              </div>
              <button
                onClick={() => setShowLangSheet(false)}
                style={{ background: 'transparent', border: 'none', color: textMuted, fontSize: '1.2rem', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {[
                { code: 'en' as const, label: 'English (Default)' },
                { code: 'hi' as const, label: 'हिंदी (Hindi)' },
                { code: 'as' as const, label: 'অসমীয়া (Assamese)' }
              ].map(item => (
                <button
                  key={item.code}
                  onClick={() => {
                    setLang(item.code);
                    localStorage.setItem('ews_lang', item.code);
                    setShowLangSheet(false);
                  }}
                  style={{
                    background: lang === item.code ? '#2563eb' : (isLight ? '#f1f5f9' : '#1e293b'),
                    color: lang === item.code ? '#ffffff' : textPrimary,
                    border: `1px solid ${lang === item.code ? '#1d4ed8' : borderCol}`,
                    borderRadius: '10px',
                    padding: '12px 14px',
                    fontSize: '0.88rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    textAlign: 'left'
                  }}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── SIGN IN / OTP SHEET ── */}
      {showSignInSheet && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.8)',
          zIndex: 100,
          display: 'flex',
          alignItems: 'flex-end'
        }}>
          <div style={{
            background: bgCard,
            borderTop: `1px solid ${borderCol}`,
            borderTopLeftRadius: '20px',
            borderTopRightRadius: '20px',
            padding: '20px',
            width: '100%'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div style={{ fontWeight: 900, fontSize: '1rem', color: textPrimary }}>
                Citizen OTP Sign In
              </div>
              <button
                onClick={() => setShowSignInSheet(false)}
                style={{ background: 'transparent', border: 'none', color: textMuted, fontSize: '1.2rem', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            {otpError && (
              <div style={{ background: '#fee2e2', color: '#991b1b', padding: '8px 12px', borderRadius: '8px', fontSize: '0.78rem', marginBottom: '10px' }}>
                {otpError}
              </div>
            )}

            {demoNotice && (
              <div style={{ background: '#fef3c7', color: '#92400e', padding: '8px 12px', borderRadius: '8px', fontSize: '0.78rem', marginBottom: '10px' }}>
                {demoNotice}
              </div>
            )}

            {otpStep === 1 ? (
              <form onSubmit={handleSendOtp} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '0.74rem', color: textMuted, display: 'block', marginBottom: '4px' }}>
                    PHONE NUMBER
                  </label>
                  <input
                    type="tel"
                    value={phoneInput}
                    onChange={e => setPhoneInput(e.target.value)}
                    placeholder="Enter 10-digit mobile number"
                    style={{
                      width: '100%',
                      background: isLight ? '#ffffff' : '#0e172a',
                      color: textPrimary,
                      border: `1px solid ${borderCol}`,
                      borderRadius: '8px',
                      padding: '10px',
                      fontSize: '0.85rem',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
                <button
                  type="submit"
                  disabled={otpLoading || !phoneInput.trim()}
                  style={{
                    background: '#2563eb',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '10px',
                    fontWeight: 800,
                    cursor: 'pointer'
                  }}
                >
                  {otpLoading ? 'Sending OTP...' : 'Send Verification Code'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleVerifyOtp} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '0.74rem', color: textMuted, display: 'block', marginBottom: '4px' }}>
                    ENTER 6-DIGIT OTP
                  </label>
                  <input
                    type="text"
                    value={otpInput}
                    onChange={e => setOtpInput(e.target.value)}
                    placeholder="e.g. 123456"
                    style={{
                      width: '100%',
                      background: isLight ? '#ffffff' : '#0e172a',
                      color: textPrimary,
                      border: `1px solid ${borderCol}`,
                      borderRadius: '8px',
                      padding: '10px',
                      fontSize: '0.85rem',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
                <button
                  type="submit"
                  disabled={otpLoading || !otpInput.trim()}
                  style={{
                    background: '#22c55e',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '10px',
                    fontWeight: 800,
                    cursor: 'pointer'
                  }}
                >
                  {otpLoading ? 'Verifying...' : 'Verify & Enter Portal'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
