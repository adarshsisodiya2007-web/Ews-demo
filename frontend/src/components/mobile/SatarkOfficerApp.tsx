import React, { useState, useEffect } from 'react';
import { useGeolocation } from '../../hooks/useGeolocation';
import { useAlertSound } from '../../hooks/useAlertSound';
import { useOfflineSync } from '../../hooks/useOfflineSync';
import {
  fetchHeatmap,
  fetchRecentAlerts,
  fetchRecentReports,
  updateRoadStatus,
  submitReport,
  uploadPhoto,
  deleteCitizenReport,
  cleanupCitizenReports
} from '../../services/api';
import {
  queueRoadStatus,
  queueReport,
  generateClientReportId,
  getCachedHeatmapWithMeta,
  getCachedIncidents,
  getCachedShelters
} from '../../services/offlineStore';
import {
  RegionRisk,
  RoadStatus,
  ReportCategory,
  CitizenReport,
  AlertItem,
  Severity,
  CreateReportPayload
} from '../../types';
import { BleRescueScanner } from '../responder/BleRescueScanner';
import { AIPriorityPanel } from '../AIPriorityPanel';
import { PhotoCapture } from '../report/PhotoCapture';
import { MapContainer, TileLayer, Circle, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

const defaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});

const officerIcon = L.divIcon({
  className: 'officer-live-gps-marker',
  html: `<div style="background: #0284c7; border: 2.5px solid #ffffff; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 0 16px rgba(2, 132, 199, 0.9); color: white; font-size: 12px; font-weight: 900;">📍</div>`,
  iconSize: [26, 26],
  iconAnchor: [13, 13]
});

// Official geographic centroids and optimal zoom levels for Assam and NER districts
const DISTRICT_COORDINATES: Record<string, { lat: number; lng: number; zoom: number }> = {
  'Kamrup Metropolitan': { lat: 26.1445, lng: 91.7362, zoom: 11 },
  'Kamrup': { lat: 26.3134, lng: 91.6022, zoom: 10 },
  'Darrang': { lat: 26.4525, lng: 92.0298, zoom: 10 },
  'Morigaon': { lat: 26.2588, lng: 92.3421, zoom: 10 },
  'Nagaon': { lat: 26.3452, lng: 92.6840, zoom: 10 },
  'Sonitpur': { lat: 26.6528, lng: 92.7926, zoom: 10 },
  'Lakhimpur': { lat: 27.2368, lng: 94.1037, zoom: 10 },
  'Dhemaji': { lat: 27.4812, lng: 94.5779, zoom: 10 },
  'Tinsukia': { lat: 27.4922, lng: 95.3468, zoom: 10 },
  'Dibrugarh': { lat: 27.4728, lng: 94.9120, zoom: 10 },
  'Sivasagar': { lat: 26.9826, lng: 94.6322, zoom: 10 },
  'Jorhat': { lat: 26.7509, lng: 94.2037, zoom: 10 },
  'Golaghat': { lat: 26.5168, lng: 93.9666, zoom: 10 },
  'Karbi Anglong': { lat: 25.8450, lng: 93.4379, zoom: 10 },
  'Dima Hasao': { lat: 25.1764, lng: 93.0245, zoom: 10 },
  'Cachar': { lat: 24.8333, lng: 92.7789, zoom: 10 },
  'Hailakandi': { lat: 24.6833, lng: 92.5667, zoom: 10 },
  'Karimganj': { lat: 24.8667, lng: 92.3500, zoom: 10 },
  'Kokrajhar': { lat: 26.4014, lng: 90.2714, zoom: 10 },
  'Chirang': { lat: 26.5414, lng: 90.4950, zoom: 10 },
  'Baksa': { lat: 26.6855, lng: 91.5984, zoom: 10 },
  'Udalguri': { lat: 26.7453, lng: 92.0962, zoom: 10 },
  'Barpeta': { lat: 26.3211, lng: 91.0065, zoom: 10 },
  'Bongaigaon': { lat: 26.4789, lng: 90.5583, zoom: 10 },
  'Goalpara': { lat: 26.1738, lng: 90.6222, zoom: 10 },
  'Dhubri': { lat: 26.0208, lng: 89.9740, zoom: 10 },
  'Nalbari': { lat: 26.4439, lng: 91.4402, zoom: 10 },
  'Bajali': { lat: 26.4891, lng: 91.2291, zoom: 10 },
  'Biswanath': { lat: 26.7329, lng: 93.1492, zoom: 10 },
  'Charaideo': { lat: 26.9388, lng: 94.9142, zoom: 10 },
  'Majuli': { lat: 26.9536, lng: 94.2185, zoom: 11 },
  'South Salmara-Mankachar': { lat: 25.6800, lng: 89.8600, zoom: 10 },
  'Hojai': { lat: 26.0022, lng: 92.8622, zoom: 10 },
  'East Khasi Hills': { lat: 25.5788, lng: 91.8933, zoom: 10 },
  'Aizawl': { lat: 23.7271, lng: 92.7176, zoom: 10 },
  'Kohima': { lat: 25.6751, lng: 94.1086, zoom: 10 },
  'East Sikkim': { lat: 27.3389, lng: 88.6065, zoom: 10 },
  'Papum Pare': { lat: 27.0900, lng: 93.6200, zoom: 10 }
};

// Leaflet Map Controller: handles invalidateSize on Android and smooth flyTo navigation
const MapController: React.FC<{
  center: [number, number];
  zoom: number;
  invalidateKey: number;
}> = ({ center, zoom, invalidateKey }) => {
  const map = useMap();
  useEffect(() => {
    map.invalidateSize();
    const t1 = setTimeout(() => map.invalidateSize(), 100);
    const t2 = setTimeout(() => map.invalidateSize(), 400);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [map, invalidateKey]);

  useEffect(() => {
    map.flyTo(center, zoom, { duration: 1.0 });
  }, [center, zoom, map]);

  return null;
};

interface Props {
  onSwitchToCitizen?: () => void;
}

export const SatarkOfficerApp: React.FC<Props> = ({ onSwitchToCitizen }) => {
  const { coords: officerLocation } = useGeolocation();
  const { isPlaying: isSirenPlaying, playCriticalSiren, stopSiren } = useAlertSound();
  const toggleSiren = () => { if (isSirenPlaying) stopSiren(); else playCriticalSiren(); };
  const { isOnline, pendingReports, pendingRoads, pendingCount, isSyncing, syncNow } = useOfflineSync();

  // Active Bottom Tab
  const [activeTab, setActiveTab] = useState<'dashboard' | 'ai_priority' | 'map' | 'operations' | 'profile'>('dashboard');

  // Operations Sub-view: 'scanner' | 'incidents' | 'field_report'
  const [opsSubView, setOpsSubView] = useState<'scanner' | 'incidents' | 'field_report'>('scanner');

  // Role & User
  const [officerRole, setOfficerRole] = useState<string>(() => localStorage.getItem('ews_role') || 'ADMIN');
  const [officerUser, setOfficerUser] = useState<string>(() => localStorage.getItem('ews_user') || 'admin');
  const [responderStatus, setResponderStatus] = useState<'READY' | 'DISPATCHED' | 'ON_SCENE' | 'RETURNING'>('READY');

  // Theme & Language
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    return (localStorage.getItem('satark_mobile_theme') as 'dark' | 'light') || 'dark';
  });
  const [lang, setLang] = useState<'en' | 'hi' | 'as'>(() => {
    return (localStorage.getItem('ews_lang') as 'en' | 'hi' | 'as') || 'en';
  });
  const [showLangSheet, setShowLangSheet] = useState<boolean>(false);

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    localStorage.setItem('satark_mobile_theme', next);
  };
  const isLight = theme === 'light';

  // Data state
  const [regions, setRegions] = useState<RegionRisk[]>([]);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [reports, setReports] = useState<CitizenReport[]>([]);
  const [shelters, setShelters] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState<boolean>(true);

  // Filters
  const [selectedDistrict, setSelectedDistrict] = useState<string>('ALL');
  const [severityFilter, setSeverityFilter] = useState<Severity | 'ALL'>('ALL');
  const [selectedRegion, setSelectedRegion] = useState<RegionRisk | null>(null);

  // Road Corridor Status Management
  const [roadCorridorId, setRoadCorridorId] = useState<string>('');
  const [roadCorridorStatus, setRoadCorridorStatus] = useState<RoadStatus>('AT_RISK');
  const [roadUpdateNotice, setRoadUpdateNotice] = useState<string | null>(null);

  // Field report state
  const [fieldCategory, setFieldCategory] = useState<ReportCategory>('BLOCKED_ROAD');
  const [fieldDesc, setFieldDesc] = useState<string>('');
  const [fieldPhoto, setFieldPhoto] = useState<File | Blob | null>(null);
  const [fieldPhotoPreview, setFieldPhotoPreview] = useState<string | null>(null);
  const [submittingField, setSubmittingField] = useState<boolean>(false);
  const [fieldSuccessMsg, setFieldSuccessMsg] = useState<string | null>(null);

  // Incident Cleanup state
  const [cleanupNotice, setCleanupNotice] = useState<string | null>(null);

  const loadAllOfficerData = async () => {
    setLoadingData(true);
    try {
      const [rData, aData, repData, sData] = await Promise.all([
        fetchHeatmap().catch(async () => {
          const c = await getCachedHeatmapWithMeta();
          return c?.data || [];
        }),
        fetchRecentAlerts().catch(() => []),
        fetchRecentReports().catch(async () => {
          const c = await getCachedIncidents();
          return c?.data || [];
        }),
        getCachedShelters().then(res => res?.data || []).catch(() => [])
      ]);

      setRegions(rData);
      setAlerts(aData);
      setReports(repData);
      setShelters(sData);

      if (rData.length > 0 && !roadCorridorId) {
        setRoadCorridorId(rData[0].regionId);
      }
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    loadAllOfficerData();
    const iv = setInterval(loadAllOfficerData, 45000);
    return () => clearInterval(iv);
  }, []);

  // Map Modes, Live GPS, and Navigation State
  const [mapMode, setMapMode] = useState<'live_gps' | 'area_map'>('area_map');
  const [mapCenter, setMapCenter] = useState<[number, number]>([26.1445, 91.7362]);
  const [mapZoom, setMapZoom] = useState<number>(10);
  const [liveCoords, setLiveCoords] = useState<{ lat: number; lng: number; accuracy?: number } | null>(null);
  const [gpsStatus, setGpsStatus] = useState<'IDLE' | 'SEARCHING' | 'LIVE' | 'LAST_KNOWN' | 'DENIED'>('IDLE');
  const [gpsNotice, setGpsNotice] = useState<string | null>(null);
  const [invalidateKey, setInvalidateKey] = useState<number>(0);

  // Invalidate map on tab switch and window resize/orientationchange
  useEffect(() => {
    if (activeTab === 'map') {
      setInvalidateKey(k => k + 1);
    }
  }, [activeTab]);

  useEffect(() => {
    const handleResize = () => setInvalidateKey(k => k + 1);
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, []);

  // Handlers for Live GPS, Area Map, District, and Severity
  const handleTriggerLiveGps = () => {
    setMapMode('live_gps');
    setGpsStatus('SEARCHING');
    setGpsNotice('Acquiring high-precision GPS lock…');

    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude, longitude, accuracy } = pos.coords;
          setLiveCoords({ lat: latitude, lng: longitude, accuracy });
          setGpsStatus('LIVE');
          setGpsNotice(`GPS Locked (±${Math.round(accuracy)}m accuracy)`);
          setMapCenter([latitude, longitude]);
          setMapZoom(14);
          setInvalidateKey(k => k + 1);
        },
        (err) => {
          console.warn('Geolocation error:', err);
          if (officerLocation) {
            setLiveCoords({ lat: officerLocation.lat, lng: officerLocation.lng });
            setGpsStatus('LAST_KNOWN');
            setGpsNotice('Showing last known location (Live GPS signal unavailable)');
            setMapCenter([officerLocation.lat, officerLocation.lng]);
            setMapZoom(13);
            setInvalidateKey(k => k + 1);
          } else {
            setGpsStatus('DENIED');
            setGpsNotice('GPS permission denied or unavailable on device.');
          }
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
      );
    } else if (officerLocation) {
      setLiveCoords({ lat: officerLocation.lat, lng: officerLocation.lng });
      setGpsStatus('LAST_KNOWN');
      setGpsNotice('Showing last known location');
      setMapCenter([officerLocation.lat, officerLocation.lng]);
      setMapZoom(13);
      setInvalidateKey(k => k + 1);
    } else {
      setGpsStatus('DENIED');
      setGpsNotice('Geolocation not supported on this device.');
    }
  };

  const handleTriggerAreaMap = () => {
    setMapMode('area_map');
    setGpsNotice(null);
    const target = DISTRICT_COORDINATES[selectedDistrict] || { lat: 26.1445, lng: 91.7362, zoom: 9 };
    setMapCenter([target.lat, target.lng]);
    setMapZoom(selectedDistrict === 'ALL' ? 8 : target.zoom);
    setInvalidateKey(k => k + 1);
  };

  const handleSelectDistrict = (d: string) => {
    setSelectedDistrict(d);
    setMapMode('area_map');
    const target = DISTRICT_COORDINATES[d] || { lat: 26.1445, lng: 91.7362, zoom: 9 };
    setMapCenter([target.lat, target.lng]);
    setMapZoom(d === 'ALL' ? 8 : target.zoom);
    setInvalidateKey(k => k + 1);
  };

  const handleSelectSeverity = (sev: Severity | 'ALL') => {
    setSeverityFilter(sev);
    setInvalidateKey(k => k + 1);
  };

  // Complete available districts merging official coordinates and backend regions
  const availableDistricts = Array.from(new Set([
    'ALL',
    ...Object.keys(DISTRICT_COORDINATES),
    ...regions.map(r => r.district).filter(Boolean)
  ]));

  // Jointly filtered regions (District AND Severity)
  const filteredRegions = regions.filter(r => {
    const matchD = selectedDistrict === 'ALL' || r.district === selectedDistrict;
    const matchS = severityFilter === 'ALL' || r.severity === severityFilter;
    return matchD && matchS;
  });

  // Critical alerts count
  const criticalCount = alerts.filter(a => a.severity === 'CRITICAL').length;

  // ── ANDROID HARDWARE BACK BUTTON INTERCEPTION ──
  useEffect(() => {
    const handleBack = (e: CustomEvent) => {
      if (selectedRegion) {
        setSelectedRegion(null);
        e.preventDefault();
        return;
      }
      if (showLangSheet) {
        setShowLangSheet(false);
        e.preventDefault();
        return;
      }
      if (opsSubView !== 'scanner' && activeTab === 'operations') {
        setOpsSubView('scanner');
        e.preventDefault();
        return;
      }
      if (activeTab !== 'dashboard') {
        setActiveTab('dashboard');
        e.preventDefault();
        return;
      }
    };
    window.addEventListener('satark-android-back' as any, handleBack);
    return () => window.removeEventListener('satark-android-back' as any, handleBack);
  }, [selectedRegion, showLangSheet, opsSubView, activeTab]);

  // ── UPDATE ROAD STATUS ──
  const handleUpdateRoad = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roadCorridorId) return;

    try {
      if (isOnline) {
        await updateRoadStatus(roadCorridorId, roadCorridorStatus);
        setRoadUpdateNotice(`✅ Corridor status updated to ${roadCorridorStatus} across central routing.`);
      } else {
        await queueRoadStatus(roadCorridorId, roadCorridorStatus);
        setRoadUpdateNotice(`📴 OFFLINE: Road update queued in IndexedDB. Will sync when reconnected.`);
      }
      // Update local state
      setRegions(prev => prev.map(r => r.regionId === roadCorridorId ? { ...r, roadStatus: roadCorridorStatus } : r));
    } catch {
      await queueRoadStatus(roadCorridorId, roadCorridorStatus);
      setRoadUpdateNotice(`📴 Saved to offline road queue.`);
    } finally {
      setTimeout(() => setRoadUpdateNotice(null), 4000);
    }
  };

  // ── SUBMIT FIELD OFFICER REPORT ──
  const handleSubmitFieldReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fieldDesc.trim()) return;

    setSubmittingField(true);
    setFieldSuccessMsg(null);

    const lat = officerLocation?.lat ?? 26.1445;
    const lng = officerLocation?.lng ?? 91.7362;
    const cId = generateClientReportId();

    let uploadedUrl: string | null = null;
    if (fieldPhoto && isOnline) {
      try {
        uploadedUrl = await uploadPhoto(fieldPhoto, `officer_${cId}.jpg`);
      } catch {}
    }

    const payload: CreateReportPayload = {
      geoLat: lat,
      geoLng: lng,
      category: fieldCategory,
      description: `[FIELD OFFICER DISPATCH REPORT] ${fieldDesc.trim()}`,
      reporterType: 'FIELD_OFFICER',
      photoUrl: uploadedUrl,
      medicalUrgent: fieldCategory === 'INJURED_PEOPLE' || fieldCategory === 'TRAPPED_CITIZENS',
      clientReportId: cId
    };

    try {
      if (isOnline) {
        await submitReport(payload);
        setFieldSuccessMsg('✅ Official field assessment registered on live network.');
      } else {
        await queueReport(payload);
        setFieldSuccessMsg('📴 OFFLINE: Field report preserved in local queue.');
      }
      setFieldDesc('');
      setFieldPhoto(null);
      loadAllOfficerData();
    } catch {
      await queueReport(payload);
      setFieldSuccessMsg('📴 Preserved locally in offline queue.');
    } finally {
      setSubmittingField(false);
      setTimeout(() => setFieldSuccessMsg(null), 4000);
    }
  };

  // ── INCIDENT DELETE & CLEANUP ──
  const handleDeleteReport = async (id: string) => {
    try {
      await deleteCitizenReport(id);
      setCleanupNotice(`✅ Removed report #${id.substring(0, 8)}`);
      setReports(prev => prev.filter(r => r.id !== id));
    } catch (err: any) {
      setCleanupNotice(`❌ Error: ${err.message || 'Delete failed'}`);
    } finally {
      setTimeout(() => setCleanupNotice(null), 3500);
    }
  };

  const handleCleanupResolved = async () => {
    const resolvedIds = reports
      .filter(r => r.status === 'RESOLVED' || r.status === 'DISMISSED')
      .map(r => r.id);

    if (resolvedIds.length === 0) {
      setCleanupNotice('ℹ️ No resolved reports to clean up.');
      setTimeout(() => setCleanupNotice(null), 3000);
      return;
    }

    try {
      const res = await cleanupCitizenReports({ reportIds: resolvedIds });
      setCleanupNotice(`✅ Cleaned up ${res.deletedCount} resolved reports.`);
      setReports(prev => prev.filter(r => !resolvedIds.includes(r.id)));
    } catch (err: any) {
      setCleanupNotice(`❌ Error: ${err.message || 'Cleanup failed'}`);
    } finally {
      setTimeout(() => setCleanupNotice(null), 3500);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('ews_token');
    localStorage.removeItem('ews_role');
    localStorage.removeItem('ews_user');
    window.location.reload();
  };

  // Theme Colors
  const bgMain = isLight ? '#f8fafc' : '#070c17';
  const bgHeader = isLight ? '#ffffff' : '#0b1329';
  const bgCard = isLight ? '#ffffff' : '#0e172a';
  const textPrimary = isLight ? '#0f172a' : '#f8fafc';
  const textMuted = isLight ? '#64748b' : '#94a3b8';
  const borderCol = isLight ? '#e2e8f0' : '#1e293b';

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
      {/* ── 1. COMPACT OFFICER HEADER ── */}
      <header style={{
        position: 'sticky',
        top: 0,
        zIndex: 50,
        background: isLight ? 'rgba(255,255,255,0.96)' : 'rgba(11, 19, 41, 0.96)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderBottom: `1px solid ${borderCol}`,
        padding: '10px 14px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '8px'
      }}>
        {/* Left: Emblem + Title + Role Badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <img
            src="/satark_emblem.png"
            alt="SATARK"
            style={{ width: '32px', height: '32px', objectFit: 'contain' }}
          />
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontWeight: 900, fontSize: '1.05rem', color: textPrimary, letterSpacing: '-0.02em' }}>
                SATARK COMMAND
              </span>
              <span style={{
                background: 'rgba(234, 88, 12, 0.2)',
                border: '1px solid #ea580c',
                color: '#fb923c',
                borderRadius: '4px',
                padding: '1px 6px',
                fontSize: '0.62rem',
                fontWeight: 900
              }}>
                {officerRole}
              </span>
            </div>
            <div style={{ fontSize: '0.66rem', color: textMuted }}>
              Disaster Management &amp; Tactical Operations
            </div>
          </div>
        </div>

        {/* Right Controls: Siren + Theme */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
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
            title="Toggle Theme"
          >
            {isLight ? '🌙' : '☀️'}
          </button>
        </div>
      </header>

      {/* ── TAB 1: DASHBOARD / OPERATIONS ── */}
      {activeTab === 'dashboard' && (
        <div style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* 4-Stat Operations Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div style={{ background: bgCard, border: `1px solid ${borderCol}`, borderRadius: '12px', padding: '12px' }}>
              <div style={{ fontSize: '0.7rem', color: textMuted, fontWeight: 700 }}>MONITORED REGIONS</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 900, color: textPrimary, marginTop: '2px' }}>
                {regions.length}
              </div>
              <div style={{ fontSize: '0.68rem', color: '#22c55e', marginTop: '2px' }}>🟢 Sensor Telemetry Active</div>
            </div>

            <div style={{
              background: criticalCount > 0 ? (isLight ? '#fef2f2' : 'rgba(239, 68, 68, 0.15)') : bgCard,
              border: `1px solid ${criticalCount > 0 ? '#ef4444' : borderCol}`,
              borderRadius: '12px',
              padding: '12px'
            }}>
              <div style={{ fontSize: '0.7rem', color: criticalCount > 0 ? '#ef4444' : textMuted, fontWeight: 700 }}>
                CRITICAL HAZARDS
              </div>
              <div style={{ fontSize: '1.4rem', fontWeight: 900, color: criticalCount > 0 ? '#ef4444' : textPrimary, marginTop: '2px' }}>
                {criticalCount}
              </div>
              <div style={{ fontSize: '0.68rem', color: criticalCount > 0 ? '#ef4444' : textMuted, marginTop: '2px' }}>
                {criticalCount > 0 ? '⚠️ High Slopes At Risk' : 'Normal Vigilance'}
              </div>
            </div>

            <div style={{ background: bgCard, border: `1px solid ${borderCol}`, borderRadius: '12px', padding: '12px' }}>
              <div style={{ fontSize: '0.7rem', color: textMuted, fontWeight: 700 }}>FIELD INCIDENTS</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 900, color: textPrimary, marginTop: '2px' }}>
                {reports.length}
              </div>
              <div style={{ fontSize: '0.68rem', color: '#38bdf8', marginTop: '2px' }}>Verified &amp; Pending Reports</div>
            </div>

            <div style={{ background: bgCard, border: `1px solid ${borderCol}`, borderRadius: '12px', padding: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: '0.7rem', color: textMuted, fontWeight: 700 }}>OFFLINE SYNC QUEUE</div>
                {pendingCount > 0 && (
                  <button
                    onClick={() => syncNow()}
                    disabled={isSyncing}
                    style={{
                      background: '#2563eb',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '4px',
                      padding: '2px 6px',
                      fontSize: '0.62rem',
                      fontWeight: 800,
                      cursor: 'pointer'
                    }}
                  >
                    {isSyncing ? '...' : 'Sync'}
                  </button>
                )}
              </div>
              <div style={{ fontSize: '1.4rem', fontWeight: 900, color: pendingCount > 0 ? '#ea580c' : textPrimary, marginTop: '2px' }}>
                {pendingCount}
              </div>
              <div style={{ fontSize: '0.68rem', color: isOnline ? '#22c55e' : '#ea580c', marginTop: '2px' }}>
                {isOnline ? '🟢 Connected to Render' : '🟠 Local IndexedDB'}
              </div>
            </div>
          </div>

          {/* Responder Status Quick Bar */}
          <div style={{
            background: bgCard,
            border: `1px solid ${borderCol}`,
            borderRadius: '12px',
            padding: '12px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '8px'
          }}>
            <div>
              <div style={{ fontSize: '0.72rem', color: textMuted, fontWeight: 700 }}>YOUR RESPONDER STATUS</div>
              <div style={{ fontWeight: 900, fontSize: '0.95rem', color: textPrimary }}>
                {responderStatus === 'READY' ? '🟢 READY FOR DEPLOYMENT' : responderStatus === 'DISPATCHED' ? '🚨 DISPATCHED TO INCIDENT' : '🚑 ACTIVE ON SCENE'}
              </div>
            </div>
            <div style={{ display: 'flex', gap: '4px' }}>
              {(['READY', 'DISPATCHED', 'ON_SCENE'] as const).map(st => (
                <button
                  key={st}
                  onClick={() => setResponderStatus(st)}
                  style={{
                    background: responderStatus === st ? '#2563eb' : (isLight ? '#f1f5f9' : '#1e293b'),
                    color: responderStatus === st ? '#ffffff' : textMuted,
                    border: `1px solid ${borderCol}`,
                    borderRadius: '6px',
                    padding: '4px 8px',
                    fontSize: '0.68rem',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          {/* Quick Jump to Rescue Operations */}
          <div style={{
            background: 'linear-gradient(135deg, #1e293b, #0f172a)',
            border: '1px solid rgba(56, 189, 248, 0.3)',
            borderRadius: '12px',
            padding: '14px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div>
              <div style={{ fontWeight: 800, fontSize: '0.92rem', color: '#38bdf8' }}>
                📡 Rescue Signal Scanner &amp; Beacons
              </div>
              <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '2px' }}>
                Detect nearby citizen distress signals, track beacon IDs, initiate response.
              </div>
            </div>
            <button
              onClick={() => {
                setActiveTab('operations');
                setOpsSubView('scanner');
              }}
              style={{
                background: '#0284c7',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                padding: '8px 12px',
                fontSize: '0.78rem',
                fontWeight: 800,
                cursor: 'pointer',
                whiteSpace: 'nowrap'
              }}
            >
              Open Scanner ›
            </button>
          </div>

          {/* Corridor & Road Status Controls */}
          <div style={{
            background: bgCard,
            border: `1px solid ${borderCol}`,
            borderRadius: '12px',
            padding: '14px'
          }}>
            <div style={{ fontWeight: 800, fontSize: '0.9rem', color: textPrimary, marginBottom: '6px' }}>
              🚧 Corridor Blocked &amp; Detour Control
            </div>
            <div style={{ fontSize: '0.74rem', color: textMuted, marginBottom: '10px' }}>
              Block unsafe landslide passes and trigger automatic evacuation rerouting for citizens.
            </div>

            {roadUpdateNotice && (
              <div style={{ background: '#dcfce7', color: '#166534', padding: '8px 10px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700, marginBottom: '10px' }}>
                {roadUpdateNotice}
              </div>
            )}

            <form onSubmit={handleUpdateRoad} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div>
                <label style={{ fontSize: '0.7rem', color: textMuted, display: 'block', marginBottom: '4px' }}>
                  TARGET CORRIDOR / REGION
                </label>
                <select
                  value={roadCorridorId}
                  onChange={e => setRoadCorridorId(e.target.value)}
                  style={{
                    width: '100%',
                    background: isLight ? '#ffffff' : '#0e172a',
                    color: textPrimary,
                    border: `1px solid ${borderCol}`,
                    borderRadius: '8px',
                    padding: '8px',
                    fontSize: '0.8rem'
                  }}
                >
                  {regions.map(r => (
                    <option key={r.regionId} value={r.regionId}>
                      {r.name} ({r.district}) — Status: {r.roadStatus || 'OPEN'}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.7rem', color: textMuted, display: 'block', marginBottom: '4px' }}>
                  NEW ROAD STATUS
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px' }}>
                  {(['OPEN', 'AT_RISK', 'BLOCKED'] as RoadStatus[]).map(st => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setRoadCorridorStatus(st)}
                      style={{
                        background: roadCorridorStatus === st ? (st === 'BLOCKED' ? '#ef4444' : st === 'AT_RISK' ? '#f59e0b' : '#22c55e') : (isLight ? '#f1f5f9' : '#1e293b'),
                        color: roadCorridorStatus === st ? '#ffffff' : textPrimary,
                        border: `1px solid ${borderCol}`,
                        borderRadius: '6px',
                        padding: '8px 4px',
                        fontSize: '0.74rem',
                        fontWeight: 800,
                        cursor: 'pointer'
                      }}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                style={{
                  background: '#ea580c',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '10px',
                  fontWeight: 900,
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                  marginTop: '4px'
                }}
              >
                Broadcast Corridor Status Update
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ── TAB 2: AI PRIORITY ── */}
      {activeTab === 'ai_priority' && (
        <div style={{ padding: '14px', flex: 1, overflowY: 'auto' }}>
          <div style={{ marginBottom: '12px' }}>
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 900, color: textPrimary }}>
              🤖 AI Hazard Priority Matrix
            </h3>
            <p style={{ margin: '2px 0 0 0', fontSize: '0.75rem', color: textMuted }}>
              MCDA risk scores computed across satellite slope, 72h precipitation, soil moisture, and citizen report density.
            </p>
          </div>

          <AIPriorityPanel
            regions={regions}
            onSelectRegion={(rId) => {
              const match = regions.find(r => r.regionId === rId);
              if (match) setSelectedRegion(match);
              setActiveTab('map');
            }}
          />
        </div>
      )}

      {/* ── TAB 3: DEDICATED GIS MAP (OFFICER MAP) ── */}
      {activeTab === 'map' && (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          width: '100%',
          padding: '10px 12px 20px',
          boxSizing: 'border-box',
          gap: '10px'
        }}>
          {/* 1. TOP CONTROLS: District & Severity Dropdowns */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '8px',
            background: bgCard,
            padding: '10px',
            borderRadius: '12px',
            border: `1px solid ${borderCol}`
          }}>
            <div>
              <label style={{ fontSize: '0.68rem', fontWeight: 800, color: textMuted, display: 'block', marginBottom: '4px' }}>
                DISTRICT SELECTOR
              </label>
              <select
                value={selectedDistrict}
                onChange={e => handleSelectDistrict(e.target.value)}
                style={{
                  width: '100%',
                  background: isLight ? '#f1f5f9' : '#1e293b',
                  color: textPrimary,
                  border: `1px solid ${borderCol}`,
                  borderRadius: '8px',
                  padding: '7px 8px',
                  fontSize: '0.74rem',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                {availableDistricts.map(d => (
                  <option key={d} value={d}>
                    {d === 'ALL' ? '🗺️ ALL Districts' : d}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ fontSize: '0.68rem', fontWeight: 800, color: textMuted, display: 'block', marginBottom: '4px' }}>
                SEVERITY FILTER
              </label>
              <select
                value={severityFilter}
                onChange={e => handleSelectSeverity(e.target.value as any)}
                style={{
                  width: '100%',
                  background: isLight ? '#f1f5f9' : '#1e293b',
                  color: textPrimary,
                  border: `1px solid ${borderCol}`,
                  borderRadius: '8px',
                  padding: '7px 8px',
                  fontSize: '0.74rem',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                <option value="ALL">ALL CONDITIONS</option>
                <option value="CRITICAL">🔴 CRITICAL</option>
                <option value="HIGH">🟠 HIGH</option>
                <option value="MODERATE">🟡 MODERATE</option>
                <option value="LOW">🟢 LOW</option>
              </select>
            </div>
          </div>

          {/* 2. MODE BUTTONS: [ 📍 MY LIVE GPS ] [ 🗺️ AREA MAP ] */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <button
              type="button"
              onClick={handleTriggerLiveGps}
              style={{
                background: mapMode === 'live_gps' ? '#0284c7' : (isLight ? '#ffffff' : '#0e172a'),
                color: mapMode === 'live_gps' ? '#ffffff' : textPrimary,
                border: `1.5px solid ${mapMode === 'live_gps' ? '#0284c7' : borderCol}`,
                borderRadius: '10px',
                padding: '10px 8px',
                fontSize: '0.78rem',
                fontWeight: 900,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                cursor: 'pointer',
                boxShadow: mapMode === 'live_gps' ? '0 4px 12px rgba(2, 132, 199, 0.35)' : 'none'
              }}
            >
              <span>📍</span>
              <span>MY LIVE GPS</span>
            </button>

            <button
              type="button"
              onClick={handleTriggerAreaMap}
              style={{
                background: mapMode === 'area_map' ? '#2563eb' : (isLight ? '#ffffff' : '#0e172a'),
                color: mapMode === 'area_map' ? '#ffffff' : textPrimary,
                border: `1.5px solid ${mapMode === 'area_map' ? '#2563eb' : borderCol}`,
                borderRadius: '10px',
                padding: '10px 8px',
                fontSize: '0.78rem',
                fontWeight: 900,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                cursor: 'pointer',
                boxShadow: mapMode === 'area_map' ? '0 4px 12px rgba(37, 99, 235, 0.35)' : 'none'
              }}
            >
              <span>🗺️</span>
              <span>AREA MAP</span>
            </button>
          </div>

          {/* 3. CONDITIONS QUICK FILTER BAR */}
          <div style={{
            background: bgCard,
            borderRadius: '10px',
            padding: '6px 8px',
            border: `1px solid ${borderCol}`,
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            overflowX: 'auto',
            whiteSpace: 'nowrap'
          }}>
            <span style={{ fontSize: '0.68rem', fontWeight: 900, color: textMuted, paddingRight: '4px' }}>
              ⚠️ CONDITIONS:
            </span>
            {[
              { id: 'ALL' as const, label: 'ALL', color: '#64748b' },
              { id: 'CRITICAL' as const, label: '🔴 CRITICAL', color: '#ef4444' },
              { id: 'HIGH' as const, label: '🟠 HIGH', color: '#ea580c' },
              { id: 'MODERATE' as const, label: '🟡 MODERATE', color: '#f59e0b' },
              { id: 'LOW' as const, label: '🟢 LOW', color: '#22c55e' }
            ].map(cond => (
              <button
                key={cond.id}
                type="button"
                onClick={() => handleSelectSeverity(cond.id)}
                style={{
                  background: severityFilter === cond.id ? cond.color : (isLight ? '#f1f5f9' : '#1e293b'),
                  color: severityFilter === cond.id ? '#ffffff' : textPrimary,
                  border: `1px solid ${severityFilter === cond.id ? cond.color : borderCol}`,
                  borderRadius: '6px',
                  padding: '4px 8px',
                  fontSize: '0.68rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  flexShrink: 0
                }}
              >
                {cond.label}
              </button>
            ))}
          </div>

          {/* GPS Notice / Status Banner */}
          {gpsNotice && (
            <div style={{
              background: gpsStatus === 'LIVE' ? 'rgba(34, 197, 94, 0.15)' : gpsStatus === 'LAST_KNOWN' ? 'rgba(245, 158, 11, 0.15)' : gpsStatus === 'DENIED' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(56, 189, 248, 0.15)',
              border: `1px solid ${gpsStatus === 'LIVE' ? '#22c55e' : gpsStatus === 'LAST_KNOWN' ? '#f59e0b' : gpsStatus === 'DENIED' ? '#ef4444' : '#38bdf8'}`,
              color: textPrimary,
              borderRadius: '8px',
              padding: '6px 10px',
              fontSize: '0.74rem',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <span>📍 {gpsNotice}</span>
              <button
                type="button"
                onClick={() => setGpsNotice(null)}
                style={{ background: 'transparent', border: 'none', color: textMuted, fontSize: '0.8rem', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>
          )}

          {/* 4. REAL INTERACTIVE LEAFLET MAP CONTAINER */}
          <div style={{
            width: '100%',
            height: 'calc(100vh - 365px)',
            minHeight: '380px',
            maxHeight: '520px',
            position: 'relative',
            borderRadius: '14px',
            overflow: 'hidden',
            border: `1px solid ${borderCol}`,
            boxShadow: isLight ? '0 4px 14px rgba(0,0,0,0.06)' : '0 6px 24px rgba(0,0,0,0.5)'
          }}>
            <MapContainer
              center={mapCenter}
              zoom={mapZoom}
              style={{ width: '100%', height: '100%' }}
              zoomControl={true}
            >
              <MapController center={mapCenter} zoom={mapZoom} invalidateKey={invalidateKey} />

              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution="&copy; OpenStreetMap | SATARK GIS"
                maxZoom={19}
              />

              {/* Hazard Risk Regions */}
              {filteredRegions.map(r => {
                const color = r.severity === 'CRITICAL' ? '#ef4444' : r.severity === 'HIGH' ? '#ea580c' : r.severity === 'MODERATE' ? '#f59e0b' : '#22c55e';
                const radius = r.severity === 'CRITICAL' ? 12000 : r.severity === 'HIGH' ? 8000 : r.severity === 'MODERATE' ? 5000 : 3500;

                return (
                  <Circle
                    key={r.regionId}
                    center={[r.centroidLat, r.centroidLng]}
                    radius={radius}
                    pathOptions={{ color, fillColor: color, fillOpacity: 0.45, weight: 2 }}
                    eventHandlers={{
                      click: () => setSelectedRegion(r)
                    }}
                  >
                    <Popup>
                      <div style={{ minWidth: '150px' }}>
                        <strong style={{ fontSize: '0.9rem' }}>{r.name}</strong><br />
                        <span style={{ fontSize: '0.74rem', color: '#64748b' }}>District: {r.district}</span><br />
                        <span style={{
                          display: 'inline-block',
                          marginTop: '4px',
                          background: color,
                          color: '#fff',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          fontSize: '0.7rem',
                          fontWeight: 800
                        }}>
                          {r.severity} ({(r.computedScore * 100).toFixed(1)}%)
                        </span><br />
                        <span style={{ fontSize: '0.74rem' }}>Road: <strong>{r.roadStatus || 'OPEN'}</strong></span>
                      </div>
                    </Popup>
                  </Circle>
                );
              })}

              {/* Relief Shelters */}
              {shelters.map((s: any, idx: number) => (
                <Marker key={s.id || idx} position={[s.lat, s.lng]} icon={defaultIcon}>
                  <Popup>
                    <div>
                      <strong>🏕️ {s.name}</strong><br />
                      Capacity: {s.totalBeds} beds<br />
                      Medical: {s.medicalTeam || 'Available'}
                    </div>
                  </Popup>
                </Marker>
              ))}

              {/* Live Officer Location Marker */}
              {liveCoords && (
                <Marker position={[liveCoords.lat, liveCoords.lng]} icon={officerIcon}>
                  <Popup>
                    <div>
                      <strong>📍 Officer Field Location</strong><br />
                      Lat: {liveCoords.lat.toFixed(5)}<br />
                      Lng: {liveCoords.lng.toFixed(5)}<br />
                      GPS: <strong>{gpsStatus === 'LIVE' ? '🟢 LIVE' : '🟡 LAST KNOWN'}</strong>
                    </div>
                  </Popup>
                </Marker>
              )}
            </MapContainer>

            {/* 5. COMPACT FLOATING MAP LEGEND */}
            <div style={{
              position: 'absolute',
              bottom: '12px',
              right: '12px',
              zIndex: 400,
              background: isLight ? 'rgba(255,255,255,0.92)' : 'rgba(11, 19, 41, 0.92)',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
              border: `1px solid ${borderCol}`,
              borderRadius: '8px',
              padding: '6px 10px',
              fontSize: '0.68rem',
              boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
              pointerEvents: 'auto'
            }}>
              <div style={{ fontWeight: 900, textTransform: 'uppercase', color: textMuted, marginBottom: '3px', fontSize: '0.62rem' }}>
                RISK CONDITIONS
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3px 8px', fontWeight: 700 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ef4444' }}></span>
                  <span>Critical</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ea580c' }}></span>
                  <span>High</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#f59e0b' }}></span>
                  <span>Moderate</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#22c55e' }}></span>
                  <span>Low</span>
                </div>
              </div>
            </div>
          </div>

          {/* 6. SELECTED AREA OR LIVE GPS INFO CARD */}
          <div style={{
            background: bgCard,
            border: `1px solid ${borderCol}`,
            borderRadius: '12px',
            padding: '12px 14px',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px'
          }}>
            {mapMode === 'live_gps' ? (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.68rem', fontWeight: 900, color: textMuted, textTransform: 'uppercase' }}>
                    📍 MY LOCATION
                  </span>
                  <span style={{
                    background: gpsStatus === 'LIVE' ? 'rgba(34, 197, 94, 0.2)' : 'rgba(245, 158, 11, 0.2)',
                    color: gpsStatus === 'LIVE' ? '#22c55e' : '#f59e0b',
                    padding: '1px 8px',
                    borderRadius: '6px',
                    fontSize: '0.68rem',
                    fontWeight: 900
                  }}>
                    GPS: {gpsStatus === 'LIVE' ? 'LIVE' : gpsStatus === 'SEARCHING' ? 'ACQUIRING…' : 'LAST KNOWN'}
                  </span>
                </div>
                <div style={{ fontSize: '0.84rem', fontWeight: 800, color: textPrimary, marginTop: '2px' }}>
                  {liveCoords ? `Latitude: ${liveCoords.lat.toFixed(6)} | Longitude: ${liveCoords.lng.toFixed(6)}` : 'Awaiting GPS acquisition…'}
                </div>
                <div style={{ fontSize: '0.72rem', color: textMuted }}>
                  {filteredRegions.length} hazard regions monitored · Nearest district: {selectedDistrict}
                </div>
              </>
            ) : (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.68rem', fontWeight: 900, color: textMuted, textTransform: 'uppercase' }}>
                    🗺️ SELECTED AREA
                  </span>
                  <span style={{
                    background: isLight ? '#f1f5f9' : '#1e293b',
                    color: '#38bdf8',
                    padding: '1px 8px',
                    borderRadius: '6px',
                    fontSize: '0.68rem',
                    fontWeight: 900
                  }}>
                    {filteredRegions.length} Monitored Region{filteredRegions.length === 1 ? '' : 's'}
                  </span>
                </div>
                <div style={{ fontSize: '0.95rem', fontWeight: 900, color: textPrimary, marginTop: '2px' }}>
                  {selectedDistrict === 'ALL' ? 'All Monitored NER Districts' : selectedDistrict}
                </div>
                <div style={{ fontSize: '0.72rem', color: textMuted }}>
                  Severity Filter: <strong style={{ color: severityFilter === 'CRITICAL' ? '#ef4444' : textPrimary }}>{severityFilter}</strong> · Target Centroid: {DISTRICT_COORDINATES[selectedDistrict]?.lat.toFixed(4) || '26.1445'}, {DISTRICT_COORDINATES[selectedDistrict]?.lng.toFixed(4) || '91.7362'}
                </div>
              </>
            )}
          </div>

          {/* Region Details Drawer if tapped */}
          {selectedRegion && (
            <div style={{
              background: bgCard,
              border: `1px solid ${selectedRegion.severity === 'CRITICAL' ? '#ef4444' : '#38bdf8'}`,
              borderRadius: '12px',
              padding: '12px 14px',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontWeight: 900, fontSize: '0.94rem', color: textPrimary }}>
                  {selectedRegion.name} ({selectedRegion.district})
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedRegion(null)}
                  style={{ background: 'transparent', border: 'none', color: textMuted, fontSize: '1rem', cursor: 'pointer' }}
                >
                  ✕
                </button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px', fontSize: '0.74rem' }}>
                <div>Severity: <strong style={{ color: selectedRegion.severity === 'CRITICAL' ? '#ef4444' : '#22c55e' }}>{selectedRegion.severity}</strong></div>
                <div>Score: <strong>{(selectedRegion.computedScore * 100).toFixed(1)}%</strong></div>
                <div>Road: <strong>{selectedRegion.roadStatus || 'OPEN'}</strong></div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── TAB 4: RESPONDER OPERATIONS & INCIDENTS (NO SEPARATE PORTAL) ── */}
      {activeTab === 'operations' && (
        <div style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {/* Sub-nav pills */}
          <div style={{ display: 'flex', gap: '6px', background: bgCard, padding: '4px', borderRadius: '10px', border: `1px solid ${borderCol}` }}>
            <button
              onClick={() => setOpsSubView('scanner')}
              style={{
                flex: 1,
                background: opsSubView === 'scanner' ? '#2563eb' : 'transparent',
                color: opsSubView === 'scanner' ? '#ffffff' : textMuted,
                border: 'none',
                borderRadius: '6px',
                padding: '8px 4px',
                fontSize: '0.74rem',
                fontWeight: 800,
                cursor: 'pointer'
              }}
            >
              📡 Rescue Scanner
            </button>
            <button
              onClick={() => setOpsSubView('incidents')}
              style={{
                flex: 1,
                background: opsSubView === 'incidents' ? '#2563eb' : 'transparent',
                color: opsSubView === 'incidents' ? '#ffffff' : textMuted,
                border: 'none',
                borderRadius: '6px',
                padding: '8px 4px',
                fontSize: '0.74rem',
                fontWeight: 800,
                cursor: 'pointer'
              }}
            >
              📋 Incidents ({reports.length})
            </button>
            <button
              onClick={() => setOpsSubView('field_report')}
              style={{
                flex: 1,
                background: opsSubView === 'field_report' ? '#2563eb' : 'transparent',
                color: opsSubView === 'field_report' ? '#ffffff' : textMuted,
                border: 'none',
                borderRadius: '6px',
                padding: '8px 4px',
                fontSize: '0.74rem',
                fontWeight: 800,
                cursor: 'pointer'
              }}
            >
              📸 Field Report
            </button>
          </div>

          {/* 4A. RESCUE SCANNER */}
          {opsSubView === 'scanner' && (
            <BleRescueScanner
              officerLat={officerLocation?.lat ?? 26.1445}
              officerLng={officerLocation?.lng ?? 91.7362}
            />
          )}

          {/* 4B. INCIDENT MANAGEMENT */}
          {opsSubView === 'incidents' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 800, color: textMuted }}>
                  INCOMING CITIZEN &amp; FIELD INCIDENTS
                </span>
                <button
                  onClick={handleCleanupResolved}
                  style={{
                    background: isLight ? '#fee2e2' : 'rgba(239, 68, 68, 0.2)',
                    border: '1px solid #ef4444',
                    color: isLight ? '#991b1b' : '#fca5a5',
                    borderRadius: '6px',
                    padding: '4px 8px',
                    fontSize: '0.7rem',
                    fontWeight: 800,
                    cursor: 'pointer'
                  }}
                >
                  🧹 Cleanup Resolved
                </button>
              </div>

              {cleanupNotice && (
                <div style={{ background: '#dcfce7', color: '#166534', padding: '8px', borderRadius: '6px', fontSize: '0.76rem', fontWeight: 700 }}>
                  {cleanupNotice}
                </div>
              )}

              {reports.map(rep => (
                <div
                  key={rep.id}
                  style={{
                    background: bgCard,
                    border: `1px solid ${borderCol}`,
                    borderRadius: '10px',
                    padding: '12px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{
                      background: rep.category === 'TRAPPED_CITIZENS' || rep.category === 'INJURED_PEOPLE' ? '#ef4444' : '#2563eb',
                      color: '#ffffff',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      fontSize: '0.68rem',
                      fontWeight: 800
                    }}>
                      {rep.category}
                    </span>
                    <span style={{ fontSize: '0.7rem', color: textMuted }}>
                      {new Date(rep.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  <div style={{ fontSize: '0.8rem', color: textPrimary }}>
                    {rep.description}
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                    <span style={{ fontSize: '0.7rem', color: textMuted }}>
                      📍 GPS: {rep.geoLat.toFixed(4)}, {rep.geoLng.toFixed(4)}
                    </span>
                    <button
                      onClick={() => handleDeleteReport(rep.id)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: '#ef4444',
                        fontSize: '0.74rem',
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 4C. FIELD REPORT */}
          {opsSubView === 'field_report' && (
            <form onSubmit={handleSubmitFieldReport} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: textPrimary }}>
                Submit Official Field Observation
              </h4>

              {fieldSuccessMsg && (
                <div style={{ background: '#dcfce7', color: '#166534', padding: '8px', borderRadius: '6px', fontSize: '0.76rem', fontWeight: 700 }}>
                  {fieldSuccessMsg}
                </div>
              )}

              <div>
                <label style={{ fontSize: '0.72rem', color: textMuted, display: 'block', marginBottom: '4px' }}>
                  CATEGORY
                </label>
                <select
                  value={fieldCategory}
                  onChange={e => setFieldCategory(e.target.value as ReportCategory)}
                  style={{
                    width: '100%',
                    background: isLight ? '#ffffff' : '#0e172a',
                    color: textPrimary,
                    border: `1px solid ${borderCol}`,
                    borderRadius: '8px',
                    padding: '8px',
                    fontSize: '0.8rem'
                  }}
                >
                  <option value="BLOCKED_ROAD">🚧 Blocked Road / Debris</option>
                  <option value="SLOPE_MOVEMENT">🏔️ Active Slope Movement</option>
                  <option value="CRACK">⚡ Structural Tension Crack</option>
                  <option value="FLOODING">🌊 Flash Flooding</option>
                  <option value="TRAPPED_CITIZENS">🧍 Trapped Citizens</option>
                  <option value="INJURED_PEOPLE">🩹 Medical Emergency</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.72rem', color: textMuted, display: 'block', marginBottom: '4px' }}>
                  FIELD PHOTO
                </label>
                <PhotoCapture
                  onPhotoSelected={(file: File) => {
                    setFieldPhoto(file);
                    setFieldPhotoPreview(URL.createObjectURL(file));
                  }}
                  preview={fieldPhotoPreview}
                  onRemovePhoto={() => {
                    setFieldPhoto(null);
                    setFieldPhotoPreview(null);
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.72rem', color: textMuted, display: 'block', marginBottom: '4px' }}>
                  TACTICAL LOG
                </label>
                <textarea
                  value={fieldDesc}
                  onChange={e => setFieldDesc(e.target.value)}
                  placeholder="Enter field officer observations, pass impassability, or required heavy equipment..."
                  rows={3}
                  style={{
                    width: '100%',
                    background: isLight ? '#ffffff' : '#0e172a',
                    color: textPrimary,
                    border: `1px solid ${borderCol}`,
                    borderRadius: '8px',
                    padding: '8px',
                    fontSize: '0.8rem',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <button
                type="submit"
                disabled={submittingField || !fieldDesc.trim()}
                style={{
                  background: '#2563eb',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '10px',
                  fontWeight: 800,
                  fontSize: '0.84rem',
                  cursor: submittingField ? 'not-allowed' : 'pointer'
                }}
              >
                {submittingField ? 'Submitting...' : 'Register Field Log'}
              </button>
            </form>
          )}
        </div>
      )}

      {/* ── TAB 5: PROFILE & QUEUE ── */}
      {activeTab === 'profile' && (
        <div style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 900, color: textPrimary }}>
              👤 Officer Command Profile
            </h3>
            <p style={{ margin: '2px 0 0 0', fontSize: '0.75rem', color: textMuted }}>
              Authenticated credentials &amp; offline synchronization manager.
            </p>
          </div>

          <div style={{ background: bgCard, border: `1px solid ${borderCol}`, borderRadius: '12px', padding: '14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div>Officer ID: <strong>{officerUser}</strong></div>
            <div>Jurisdiction: <strong>{selectedDistrict} District Command</strong></div>
            <div>Role Level: <strong style={{ color: '#ea580c' }}>{officerRole}</strong></div>
            <div>Backend Gateway: <strong style={{ color: '#22c55e' }}>Render Production Connected</strong></div>
          </div>

          {/* Sync Queue Manager */}
          <div style={{ background: bgCard, border: `1px solid ${borderCol}`, borderRadius: '12px', padding: '14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 800, fontSize: '0.88rem' }}>Offline Ledger Synchronization</span>
              <button
                onClick={() => syncNow()}
                disabled={isSyncing || pendingCount === 0}
                style={{
                  background: pendingCount > 0 ? '#2563eb' : '#64748b',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '6px 12px',
                  fontSize: '0.74rem',
                  fontWeight: 800,
                  cursor: pendingCount > 0 ? 'pointer' : 'not-allowed'
                }}
              >
                {isSyncing ? 'Syncing...' : 'Sync Now'}
              </button>
            </div>
            <div style={{ fontSize: '0.76rem', color: textMuted }}>
              Pending Reports: <strong>{pendingReports.length}</strong> · Pending Road Statuses: <strong>{pendingRoads.length}</strong>
            </div>
          </div>

          {/* Switch to Civilian Mode */}
          <div style={{
            borderTop: `1px solid ${borderCol}`,
            paddingTop: '12px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div>
              <div style={{ fontWeight: 800, fontSize: '0.84rem' }}>View Citizen App Experience</div>
              <div style={{ fontSize: '0.7rem', color: textMuted }}>Preview civilian alerts and safety tools</div>
            </div>
            <button
              onClick={() => {
                if (onSwitchToCitizen) onSwitchToCitizen();
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
              Citizen View ›
            </button>
          </div>

          <button
            onClick={handleLogout}
            style={{
              background: 'transparent',
              border: '1px solid #ef4444',
              color: '#ef4444',
              borderRadius: '8px',
              padding: '10px',
              fontWeight: 800,
              fontSize: '0.82rem',
              cursor: 'pointer',
              marginTop: '8px'
            }}
          >
            Log Out Officer Session
          </button>
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
          { id: 'dashboard' as const, label: 'Dashboard', icon: '📊' },
          { id: 'ai_priority' as const, label: 'AI Priority', icon: '🤖' },
          { id: 'map' as const, label: 'GIS Map', icon: '🗺️' },
          { id: 'operations' as const, label: 'Operations', icon: '🚨' },
          { id: 'profile' as const, label: 'Profile', icon: '👤' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              background: 'transparent',
              border: 'none',
              color: activeTab === tab.id ? '#ea580c' : textMuted,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '2px',
              padding: '6px 8px',
              cursor: 'pointer',
              fontSize: '0.66rem',
              fontWeight: activeTab === tab.id ? 900 : 500
            }}
          >
            <span style={{ fontSize: '1.2rem', lineHeight: 1 }}>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </nav>

      {/* ── LANGUAGE SHEET ── */}
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
                    background: lang === item.code ? '#ea580c' : (isLight ? '#f1f5f9' : '#1e293b'),
                    color: lang === item.code ? '#ffffff' : textPrimary,
                    border: `1px solid ${borderCol}`,
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
    </div>
  );
};
