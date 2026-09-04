import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOfflineSync } from '../hooks/useOfflineSync';
import { useGeolocation } from '../hooks/useGeolocation';
import { OfflineStatusHeader } from '../components/layout/OfflineStatusHeader';
import { PhotoCapture } from '../components/report/PhotoCapture';
import { RegionRisk, RoadStatus, ReportCategory, CitizenReport } from '../types';
import {
  fetchHeatmap,
  fetchRecentReports,
  updateRoadStatus,
  submitReport,
  uploadPhoto,
  deleteCitizenReport,
  cleanupCitizenReports
} from '../services/api';
import {
  queueRoadStatus,
  queueReport,
  generateClientReportId,
  getCachedHeatmapWithMeta,
  getCachedIncidents
} from '../services/offlineStore';
import { BleRescueScanner } from '../components/responder/BleRescueScanner';
import { AIPriorityPanel } from '../components/AIPriorityPanel';

export const ResponderPortal: React.FC = () => {
  const navigate = useNavigate();
  const { isOnline, pendingReports, pendingRoads, pendingCount, isSyncing, syncNow, syncError } = useOfflineSync();
  const { coords } = useGeolocation();

  const [officerRole, setOfficerRole] = useState<string>('FIELD_OFFICER');
  const [officerUser, setOfficerUser] = useState<string>('field_officer');
  const [activeTab, setActiveTab] = useState<'ai_priority' | 'ble_scanner' | 'roads' | 'field_report' | 'incidents' | 'sync_queue'>('ai_priority');

  const [regions, setRegions] = useState<RegionRisk[]>([]);
  const [reports, setReports] = useState<CitizenReport[]>([]);
  const [cachedTime, setCachedTime] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  // Road status form state
  const [selectedRegionId, setSelectedRegionId] = useState<string>('');
  const [roadActionStatus, setRoadActionStatus] = useState<string>('');

  // Field report form state
  const [reportCategory, setReportCategory] = useState<ReportCategory>('BLOCKED_ROAD');
  const [reportDesc, setReportDesc] = useState<string>('');
  const [photoBlob, setPhotoBlob] = useState<File | Blob | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [submittingReport, setSubmittingReport] = useState(false);
  const [reportSuccessMsg, setReportSuccessMsg] = useState<string | null>(null);

  // Incident cleanup & deletion state
  const [reportToDelete, setReportToDelete] = useState<CitizenReport | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [showCleanupModal, setShowCleanupModal] = useState<boolean>(false);
  const [isCleaning, setIsCleaning] = useState<boolean>(false);
  const [cleanupSuccessNotice, setCleanupSuccessNotice] = useState<string | null>(null);

  const isReportActiveEmergency = (rep: CitizenReport) => {
    const desc = (rep.description || '').toUpperCase();
    const isSos = desc.includes('EMERGENCY SOS') || desc.includes('INJURED') || desc.includes('TRAPPED') || desc.includes('DISTRESS BEACON');
    return isSos && rep.status !== 'RESOLVED' && rep.status !== 'DISMISSED';
  };

  const oldResolvedReports = reports.filter(r => {
    if (r.status === 'RESOLVED' || r.status === 'DISMISSED') return true;
    const desc = (r.description || '').toUpperCase();
    const isSos = desc.includes('EMERGENCY SOS') || desc.includes('INJURED') || desc.includes('TRAPPED');
    if (!isSos && (desc.includes('TEST') || desc.includes('DEMO') || desc.includes('SAMPLE') || desc.includes('ANONYMOUS'))) {
      return true;
    }
    return false;
  });

  const handleConfirmDelete = async () => {
    if (!reportToDelete) return;
    setIsDeleting(true);
    try {
      await deleteCitizenReport(reportToDelete.id);
      setCleanupSuccessNotice(`✅ Incident #${reportToDelete.id.substring(0, 8)} removed from ledger.`);
      setReportToDelete(null);
      await loadData();
    } catch (err: any) {
      setCleanupSuccessNotice(`❌ Deletion failed: ${err.response?.data?.message || err.message || 'Server error'}`);
    } finally {
      setIsDeleting(false);
      setTimeout(() => setCleanupSuccessNotice(null), 4500);
    }
  };

  const handleConfirmCleanup = async () => {
    if (oldResolvedReports.length === 0) return;
    setIsCleaning(true);
    try {
      const ids = oldResolvedReports.map(r => r.id);
      const res = await cleanupCitizenReports({ reportIds: ids });
      setCleanupSuccessNotice(`✅ Cleanup complete: Removed ${res.deletedCount} old/resolved incident reports.`);
      setShowCleanupModal(false);
      await loadData();
    } catch (err: any) {
      setCleanupSuccessNotice(`❌ Cleanup failed: ${err.response?.data?.message || err.message || 'Server error'}`);
    } finally {
      setIsCleaning(false);
      setTimeout(() => setCleanupSuccessNotice(null), 4500);
    }
  };

  useEffect(() => {
    const role = localStorage.getItem('ews_role') || 'FIELD_OFFICER';
    const user = localStorage.getItem('ews_user') || 'field_officer';
    setOfficerRole(role);
    setOfficerUser(user);

    const handleSyncComplete = () => {
      loadData();
    };
    window.addEventListener('ews-sync-completed', handleSyncComplete);
    window.addEventListener('ews-reports-updated', handleSyncComplete);

    loadData();

    return () => {
      window.removeEventListener('ews-sync-completed', handleSyncComplete);
      window.removeEventListener('ews-reports-updated', handleSyncComplete);
    };
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [hData, rData] = await Promise.all([
        fetchHeatmap(),
        fetchRecentReports(),
      ]);
      setRegions(hData);
      setReports(rData);
      if (hData.length > 0 && !selectedRegionId) {
        setSelectedRegionId(hData[0].regionId);
      }
    } catch {
      // Offline fallback from IndexedDB
      try {
        const cachedH = await getCachedHeatmapWithMeta();
        const cachedR = await getCachedIncidents();
        if (cachedH?.data) {
          setRegions(cachedH.data);
          setCachedTime(cachedH.timestamp);
          if (cachedH.data.length > 0 && !selectedRegionId) {
            setSelectedRegionId(cachedH.data[0].regionId);
          }
        }
        if (cachedR?.data) {
          setReports(cachedR.data);
        }
      } catch {}
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateRoadStatus = async (newStatus: RoadStatus, targetRegionId?: string) => {
    const regId = targetRegionId || selectedRegionId;
    if (!regId) return;
    const region = regions.find(r => r.regionId === regId);
    const regName = region ? region.name : 'Monitored Corridor';

    // Optimistically update local state immediately
    setRegions(prev => prev.map(r => r.regionId === regId ? { ...r, roadStatus: newStatus } : r));

    try {
      if (isOnline) {
        await updateRoadStatus(regId, newStatus);
        setRoadActionStatus(`🟢 Road status for ${regName} updated to ${newStatus} on live system.`);
      } else {
        await queueRoadStatus(selectedRegionId, newStatus, regName);
        setRoadActionStatus(`🟠 Offline Mode: Road status for ${regName} set to ${newStatus} (Stored in local queue PENDING_SYNC).`);
      }
    } catch {
      await queueRoadStatus(selectedRegionId, newStatus, regName);
      setRoadActionStatus(`🟠 Network interrupted: Road update for ${regName} preserved in offline queue (PENDING_SYNC).`);
    }

    setTimeout(() => setRoadActionStatus(''), 6000);
  };

  const handlePhotoSelected = (file: File) => {
    setPhotoBlob(file);
    const url = URL.createObjectURL(file);
    setPhotoPreview(url);
  };

  const handleRemovePhoto = () => {
    setPhotoBlob(null);
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setPhotoPreview(null);
  };

  const handleFieldReportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingReport(true);
    setReportSuccessMsg(null);

    const clientReportId = generateClientReportId();
    const payload = {
      geoLat: coords?.lat || 26.1445,
      geoLng: coords?.lng || 91.7362,
      category: reportCategory,
      description: `[OFFICER VERIFIED: ${officerUser}]. ${reportDesc}`,
      reporterType: 'FIELD_OFFICER' as const,
      photoUrl: null as string | null,
      clientReportId,
    };

    try {
      if (isOnline) {
        let uploadedUrl: string | null = null;
        if (photoBlob) {
          try {
            uploadedUrl = await uploadPhoto(photoBlob, `officer_${clientReportId}.jpg`);
            payload.photoUrl = uploadedUrl;
          } catch (uploadErr) {
            console.warn('Photo upload failed online, queueing offline:', uploadErr);
            await queueReport(payload, photoBlob);
            setReportSuccessMsg('Photo upload delayed by cellular network. Incident preserved locally in offline sync queue.');
            resetForm();
            return;
          }
        }
        await submitReport(payload);
        setReportSuccessMsg('Official field report submitted and verified on Central EWS Command.');
      } else {
        await queueReport(payload, photoBlob || undefined);
        setReportSuccessMsg('Offline Mode Active: Official field report and photo evidence stored in IndexedDB (PENDING_SYNC). Will automatically transmit upon reconnection.');
      }
      resetForm();
    } catch {
      await queueReport(payload, photoBlob || undefined);
      setReportSuccessMsg('Saved in local offline sync queue with zero data loss (PENDING_SYNC).');
      resetForm();
    } finally {
      setSubmittingReport(false);
    }
  };

  const resetForm = () => {
    setReportDesc('');
    setPhotoBlob(null);
    setPhotoPreview(null);
  };

  const selectedRegion = regions.find(r => r.regionId === selectedRegionId);

  return (
    <div style={{ minHeight: '100vh', background: '#090d16', color: '#f8fafc', fontFamily: 'Inter, system-ui, sans-serif' }}>
      {/* Offline Status Header */}
      <OfflineStatusHeader cachedTimestamp={cachedTime} />

      {/* Top Bar */}
      <header style={{
        background: '#0f172a', borderBottom: '1px solid #1e293b',
        padding: '12px 20px', display: 'flex', justifyContent: 'space-between',
        alignItems: 'center', flexWrap: 'wrap', gap: '10px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            background: 'linear-gradient(135deg, #ea580c, #c2410c)',
            width: '36px', height: '36px', borderRadius: '8px',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px'
          }}>
            🛡️
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: '1.05rem', letterSpacing: '-0.02em', color: '#f8fafc' }}>
              Responder &amp; Field Officer Mode
            </div>
            <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
              Operational Disaster Deployment · Role: <strong style={{ color: '#fb923c' }}>{officerRole}</strong> ({officerUser})
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={() => navigate('/dashboard')}
            style={{ background: '#1e293b', border: '1px solid #334155', color: '#94a3b8', borderRadius: '6px', padding: '6px 12px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}
          >
            📊 HQ Dashboard
          </button>
          <button
            onClick={() => navigate('/citizen')}
            style={{ background: '#1e293b', border: '1px solid #334155', color: '#94a3b8', borderRadius: '6px', padding: '6px 12px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}
          >
            🌐 Citizen Portal
          </button>
          <button
            onClick={() => {
              localStorage.removeItem('ews_token');
              localStorage.removeItem('ews_role');
              navigate('/login');
            }}
            style={{ background: '#7f1d1d', border: 'none', color: '#fca5a5', borderRadius: '6px', padding: '6px 12px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}
          >
            Logout
          </button>
        </div>
      </header>

      {/* Main Tactical Container */}
      <main style={{ maxWidth: '1100px', margin: '0 auto', padding: '20px 16px' }}>

        {/* Tactical Nav Tabs */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', borderBottom: '1px solid #1e293b', overflowX: 'auto', paddingBottom: '4px' }}>
          {[
            { id: 'ai_priority', label: '🤖 AI Response Priority' },
            { id: 'ble_scanner', label: '🚑 BLE Rescue Scanner & Detections' },
            { id: 'roads', label: '🛣️ Road Corridor Status' },
            { id: 'field_report', label: '📸 Quick Field Incident Report' },
            { id: 'incidents', label: `📋 Monitored Reports (${reports.length})` },
            { id: 'sync_queue', label: `🔄 Offline Sync Queue (${pendingCount})` }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id as any);
                if (tab.id === 'incidents' || tab.id === 'ai_priority') {
                  loadData();
                }
              }}
              style={{
                padding: '10px 16px', border: 'none', cursor: 'pointer',
                background: activeTab === tab.id ? 'rgba(234, 88, 12, 0.15)' : 'transparent',
                color: activeTab === tab.id ? '#fb923c' : '#94a3b8',
                fontWeight: 700, fontSize: '0.88rem', borderRadius: '8px 8px 0 0',
                borderBottom: activeTab === tab.id ? '2px solid #ea580c' : '2px solid transparent',
                whiteSpace: 'nowrap'
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* TAB 0: AI INCIDENT RESPONSE PRIORITY */}
        {activeTab === 'ai_priority' && (
          <AIPriorityPanel
            regions={regions}
            reports={reports}
            onSelectRegion={(rId) => {
              setSelectedRegionId(rId);
              setActiveTab('roads');
            }}
            onUpdateRoadStatus={(regId, status) => handleUpdateRoadStatus(status, regId)}
          />
        )}

        {/* TAB 1: BLE RESCUE SCANNER & DETECTIONS */}
        {activeTab === 'ble_scanner' && (
          <BleRescueScanner
            officerLat={coords?.lat || 11.5534}
            officerLng={coords?.lng || 76.1320}
          />
        )}

        {/* TAB 1: ROAD CORRIDOR STATUS */}
        {activeTab === 'roads' && (
          <div>
            <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '16px', padding: '24px', marginBottom: '20px' }}>
              <h3 style={{ margin: '0 0 6px 0', fontSize: '1.2rem', fontWeight: 800, color: '#f8fafc' }}>
                🛣️ Road Corridor Hazard Controller
              </h3>
              <p style={{ margin: '0 0 20px 0', fontSize: '0.82rem', color: '#94a3b8' }}>
                FIELD_OFFICER Authorized. Changes update live routingDetours and sync automatically if offline.
              </p>

              {roadActionStatus && (
                <div style={{ background: 'rgba(234, 88, 12, 0.15)', border: '1px solid #ea580c', borderRadius: '8px', padding: '12px 16px', marginBottom: '18px', fontSize: '0.85rem', color: '#fdba74' }}>
                  {roadActionStatus}
                </div>
              )}

              {/* Region / Road Selector */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '0.78rem', color: '#cbd5e1', fontWeight: 700, marginBottom: '6px' }}>
                  Select Monitored Sector / Road Segment:
                </label>
                <select
                  value={selectedRegionId}
                  onChange={e => setSelectedRegionId(e.target.value)}
                  style={{
                    width: '100%', padding: '12px 14px', background: '#1e293b',
                    border: '1px solid #334155', borderRadius: '8px', color: '#f8fafc',
                    fontSize: '0.95rem', fontWeight: 700
                  }}
                >
                  {regions.map(r => (
                    <option key={r.regionId} value={r.regionId}>
                      {r.name} ({r.district}, {r.state}) — Current Status: {r.roadStatus || 'OPEN'}
                    </option>
                  ))}
                </select>
              </div>

              {selectedRegion && (
                <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '12px', padding: '18px', marginBottom: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
                    <div>
                      <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#f8fafc' }}>{selectedRegion.name}</div>
                      <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{selectedRegion.district} · {selectedRegion.state}</div>
                    </div>
                    <div style={{
                      padding: '4px 12px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 800,
                      background: selectedRegion.roadStatus === 'BLOCKED' ? '#ef444430' : selectedRegion.roadStatus === 'AT_RISK' ? '#f59e0b30' : '#22c55e30',
                      color: selectedRegion.roadStatus === 'BLOCKED' ? '#f87171' : selectedRegion.roadStatus === 'AT_RISK' ? '#fbbf24' : '#4ade80',
                      border: `1px solid ${selectedRegion.roadStatus === 'BLOCKED' ? '#ef4444' : selectedRegion.roadStatus === 'AT_RISK' ? '#f59e0b' : '#22c55e'}`
                    }}>
                      Current: {selectedRegion.roadStatus || 'OPEN'}
                    </div>
                  </div>

                  <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: '14px' }}>
                    One-Tap Action Trigger:
                  </div>

                  {/* Quick Action Buttons */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px' }}>
                    <button
                      onClick={() => handleUpdateRoadStatus('OPEN')}
                      style={{
                        padding: '14px', borderRadius: '10px', border: 'none',
                        background: 'linear-gradient(135deg, #16a34a, #15803d)',
                        color: '#fff', fontSize: '0.9rem', fontWeight: 800, cursor: 'pointer',
                        boxShadow: '0 4px 12px rgba(22, 163, 74, 0.3)'
                      }}
                    >
                      🟢 Mark OPEN
                      <div style={{ fontSize: '0.7rem', opacity: 0.8, marginTop: '2px' }}>All transit permitted</div>
                    </button>

                    <button
                      onClick={() => handleUpdateRoadStatus('AT_RISK')}
                      style={{
                        padding: '14px', borderRadius: '10px', border: 'none',
                        background: 'linear-gradient(135deg, #d97706, #b45309)',
                        color: '#fff', fontSize: '0.9rem', fontWeight: 800, cursor: 'pointer',
                        boxShadow: '0 4px 12px rgba(217, 119, 6, 0.3)'
                      }}
                    >
                      🟡 Mark AT RISK
                      <div style={{ fontSize: '0.7rem', opacity: 0.8, marginTop: '2px' }}>Heavy vehicles restricted</div>
                    </button>

                    <button
                      onClick={() => handleUpdateRoadStatus('BLOCKED')}
                      style={{
                        padding: '14px', borderRadius: '10px', border: 'none',
                        background: 'linear-gradient(135deg, #dc2626, #b91c1c)',
                        color: '#fff', fontSize: '0.9rem', fontWeight: 800, cursor: 'pointer',
                        boxShadow: '0 4px 12px rgba(220, 38, 38, 0.3)'
                      }}
                    >
                      🔴 Mark BLOCKED
                      <div style={{ fontSize: '0.7rem', opacity: 0.8, marginTop: '2px' }}>Trigger bypass detour</div>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: FIELD INCIDENT REPORT */}
        {activeTab === 'field_report' && (
          <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '16px', padding: '24px' }}>
            <h3 style={{ margin: '0 0 6px 0', fontSize: '1.2rem', fontWeight: 800, color: '#f8fafc' }}>
              📸 Officer Field Verification &amp; Photo Evidence
            </h3>
            <p style={{ margin: '0 0 20px 0', fontSize: '0.82rem', color: '#94a3b8' }}>
              Log ground observations directly with GPS &amp; camera. Guaranteed offline storage with zero data loss.
            </p>

            {reportSuccessMsg && (
              <div style={{ background: 'rgba(34, 197, 94, 0.15)', border: '1px solid #22c55e', borderRadius: '8px', padding: '12px 16px', marginBottom: '18px', fontSize: '0.85rem', color: '#86efac' }}>
                ✅ {reportSuccessMsg}
              </div>
            )}

            <form onSubmit={handleFieldReportSubmit}>
              {/* Category */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', color: '#cbd5e1', fontWeight: 700, marginBottom: '6px' }}>
                  Observed Hazard Category:
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '8px' }}>
                  {(['BLOCKED_ROAD', 'CRACK', 'SLOPE_MOVEMENT', 'FLOODING', 'OTHER'] as ReportCategory[]).map(cat => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setReportCategory(cat)}
                      style={{
                        padding: '10px 8px', borderRadius: '8px',
                        border: reportCategory === cat ? '2px solid #ea580c' : '1px solid #334155',
                        background: reportCategory === cat ? 'rgba(234, 88, 12, 0.2)' : '#1e293b',
                        color: reportCategory === cat ? '#fb923c' : '#94a3b8',
                        fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer'
                      }}
                    >
                      {cat.replace('_', ' ')}
                    </button>
                  ))}
                </div>
              </div>

              {/* Photo Evidence */}
              <div style={{ background: '#1e293b', padding: '16px', borderRadius: '10px', marginBottom: '16px', textAlign: 'center' }}>
                <div style={{ fontSize: '0.8rem', color: '#cbd5e1', fontWeight: 600, marginBottom: '8px' }}>
                  📸 Attach Field Evidence Photo (Stored in IndexedDB if offline):
                </div>
                <PhotoCapture
                  onPhotoSelected={handlePhotoSelected}
                  preview={photoPreview}
                  onRemovePhoto={handleRemovePhoto}
                />
              </div>

              {/* Description */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', color: '#cbd5e1', fontWeight: 700, marginBottom: '6px' }}>
                  Field Assessment Notes:
                </label>
                <textarea
                  rows={3}
                  value={reportDesc}
                  onChange={e => setReportDesc(e.target.value)}
                  placeholder="Note mudflow depth, blocked lanes, structural fissures, excavator equipment required..."
                  required
                  style={{
                    width: '100%', padding: '12px', background: '#1e293b', border: '1px solid #334155',
                    borderRadius: '8px', color: '#f8fafc', fontSize: '0.9rem', resize: 'vertical'
                  }}
                />
              </div>

              {/* GPS Status */}
              <div style={{ background: '#1e293b', padding: '10px 14px', borderRadius: '8px', marginBottom: '20px', fontSize: '0.78rem', color: '#94a3b8' }}>
                📍 Precise GPS Tag: <strong style={{ color: '#f8fafc' }}>{coords ? `${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}` : 'Auto-detecting GPS coordinate fix...'}</strong>
              </div>

              <button
                type="submit"
                disabled={submittingReport}
                style={{
                  width: '100%', padding: '14px',
                  background: 'linear-gradient(135deg, #ea580c, #c2410c)',
                  color: '#fff', border: 'none', borderRadius: '10px',
                  fontSize: '0.95rem', fontWeight: 800, cursor: submittingReport ? 'wait' : 'pointer',
                  boxShadow: '0 4px 16px rgba(234, 88, 12, 0.4)'
                }}
              >
                {submittingReport
                  ? 'Processing Report…'
                  : isOnline
                  ? '🚀 Transmit Field Report to HQ'
                  : '📦 Save Field Report Locally (Pending Sync)'}
              </button>
            </form>
          </div>
        )}

        {/* TAB 3: CACHED INCIDENTS & REPORTS */}
        {activeTab === 'incidents' && (
          <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '16px', padding: '24px' }}>
            {cleanupSuccessNotice && (
              <div style={{
                background: cleanupSuccessNotice.startsWith('✅') ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                border: `1px solid ${cleanupSuccessNotice.startsWith('✅') ? '#22c55e' : '#ef4444'}`,
                color: cleanupSuccessNotice.startsWith('✅') ? '#86efac' : '#fca5a5',
                padding: '10px 16px',
                borderRadius: '8px',
                marginBottom: '16px',
                fontSize: '0.84rem',
                fontWeight: 700,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <span>{cleanupSuccessNotice}</span>
                <button onClick={() => setCleanupSuccessNotice(null)} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', fontSize: '1rem' }}>✕</button>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#f8fafc' }}>
                  📋 Monitored Incident Ledger
                </h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: '#94a3b8' }}>
                  Crowdsourced &amp; officer reports. Available offline from local cache.
                </p>
              </div>

              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                <button
                  onClick={() => setShowCleanupModal(true)}
                  disabled={oldResolvedReports.length === 0}
                  style={{
                    background: oldResolvedReports.length > 0 ? 'rgba(239, 68, 68, 0.15)' : '#1e293b',
                    border: oldResolvedReports.length > 0 ? '1px solid rgba(239, 68, 68, 0.4)' : '1px solid #334155',
                    color: oldResolvedReports.length > 0 ? '#fca5a5' : '#64748b',
                    padding: '6px 12px',
                    borderRadius: '6px',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    cursor: oldResolvedReports.length > 0 ? 'pointer' : 'not-allowed',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                  title="Clear old resolved and test incident records"
                >
                  <span>🧹 Clear Old/Resolved Reports</span>
                  <span style={{
                    background: oldResolvedReports.length > 0 ? '#ef4444' : '#334155',
                    color: '#fff',
                    borderRadius: '10px',
                    padding: '1px 6px',
                    fontSize: '0.68rem',
                    fontWeight: 800
                  }}>
                    {oldResolvedReports.length}
                  </span>
                </button>

                <button
                  onClick={loadData}
                  style={{ background: '#1e293b', border: '1px solid #334155', color: '#38bdf8', padding: '6px 12px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}
                >
                  🔄 Refresh
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {reports.length === 0 ? (
                <div style={{ padding: '24px', textAlign: 'center', color: '#64748b' }}>
                  No incident reports recorded yet.
                </div>
              ) : (
                reports.map(rep => (
                  <div
                    key={rep.id}
                    style={{
                      background: '#1e293b', border: '1px solid #334155', borderRadius: '10px',
                      padding: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
                      flexWrap: 'wrap', gap: '10px'
                    }}
                  >
                    <div style={{ flex: 1, minWidth: '240px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                        <span style={{
                          background: rep.reporterType === 'FIELD_OFFICER' ? '#ea580c30' : '#3b82f630',
                          color: rep.reporterType === 'FIELD_OFFICER' ? '#fb923c' : '#60a5fa',
                          padding: '2px 8px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 700
                        }}>
                          {rep.reporterType}
                        </span>
                        <span style={{ fontWeight: 800, color: '#f8fafc', fontSize: '0.9rem' }}>
                          {rep.category.replace('_', ' ')}
                        </span>
                        <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
                          {new Date(rep.createdAt).toLocaleString()} · ID: #{rep.id.substring(0, 8)}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.85rem', color: '#cbd5e1', lineHeight: '1.4' }}>
                        {rep.description}
                      </div>
                      {rep.photoUrl && (
                        <div style={{ marginTop: '8px' }}>
                          <img src={rep.photoUrl} alt="Evidence" style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '6px' }} />
                        </div>
                      )}
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
                      <span style={{
                        background: rep.status === 'VERIFIED' ? '#22c55e25' : rep.status === 'RESOLVED' ? '#3b82f625' : '#f59e0b25',
                        color: rep.status === 'VERIFIED' ? '#4ade80' : rep.status === 'RESOLVED' ? '#60a5fa' : '#fcd34d',
                        border: `1px solid ${rep.status === 'VERIFIED' ? '#22c55e' : rep.status === 'RESOLVED' ? '#3b82f6' : '#f59e0b'}`,
                        padding: '3px 10px', borderRadius: '12px', fontSize: '0.72rem', fontWeight: 800
                      }}>
                        {rep.status}
                      </span>

                      <button
                        onClick={() => setReportToDelete(rep)}
                        style={{
                          background: 'rgba(239, 68, 68, 0.12)',
                          border: '1px solid rgba(239, 68, 68, 0.35)',
                          color: '#fca5a5',
                          padding: '4px 8px',
                          borderRadius: '6px',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          transition: 'all 0.15s'
                        }}
                        title="Delete this incident report from ledger"
                      >
                        🗑️ Delete
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Modal: Single Report Deletion Confirmation */}
            {reportToDelete && (
              <div style={{
                position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 1000,
                display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px'
              }}>
                <div style={{
                  background: '#0f172a', border: '1px solid #334155', borderRadius: '14px',
                  maxWidth: '460px', width: '100%', padding: '24px', boxShadow: '0 8px 32px rgba(0,0,0,0.7)'
                }}>
                  <h4 style={{ margin: '0 0 8px 0', fontSize: '1.1rem', fontWeight: 800, color: '#f8fafc' }}>
                    Delete this incident report?
                  </h4>
                  <p style={{ margin: '0 0 16px 0', fontSize: '0.85rem', color: '#94a3b8', lineHeight: '1.4' }}>
                    This removes it from the officer incident ledger. This action cannot be undone.
                  </p>

                  {isReportActiveEmergency(reportToDelete) && (
                    <div style={{
                      background: 'rgba(239, 68, 68, 0.18)', border: '1px solid #ef4444',
                      borderRadius: '8px', padding: '10px 12px', marginBottom: '16px',
                      color: '#fca5a5', fontSize: '0.8rem', fontWeight: 700, lineHeight: '1.4'
                    }}>
                      ⚠️ ACTIVE EMERGENCY REPORT: This report contains an active SOS distress signal. Ensure on-ground rescue has been verified or concluded before deleting.
                    </div>
                  )}

                  <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', padding: '12px', marginBottom: '18px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.74rem', color: '#64748b', marginBottom: '4px' }}>
                      <span>ID: #{reportToDelete.id.substring(0, 8)}</span>
                      <span>{new Date(reportToDelete.createdAt).toLocaleTimeString()}</span>
                    </div>
                    <div style={{ fontWeight: 700, color: '#f8fafc', fontSize: '0.85rem', marginBottom: '4px' }}>
                      {reportToDelete.category.replace('_', ' ')} · {reportToDelete.status}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#cbd5e1', lineHeight: '1.3' }}>
                      {reportToDelete.description || 'No description provided'}
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                    <button
                      onClick={() => setReportToDelete(null)}
                      disabled={isDeleting}
                      style={{
                        background: '#1e293b', color: '#94a3b8', border: '1px solid #334155',
                        borderRadius: '8px', padding: '8px 16px', fontSize: '0.84rem', fontWeight: 700, cursor: 'pointer'
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleConfirmDelete}
                      disabled={isDeleting}
                      style={{
                        background: '#ef4444', color: '#ffffff', border: 'none',
                        borderRadius: '8px', padding: '8px 18px', fontSize: '0.84rem', fontWeight: 800, cursor: isDeleting ? 'wait' : 'pointer'
                      }}
                    >
                      {isDeleting ? 'Deleting…' : 'Delete'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Modal: Bulk Cleanup Confirmation */}
            {showCleanupModal && (
              <div style={{
                position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 1000,
                display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px'
              }}>
                <div style={{
                  background: '#0f172a', border: '1px solid #334155', borderRadius: '14px',
                  maxWidth: '460px', width: '100%', padding: '24px', boxShadow: '0 8px 32px rgba(0,0,0,0.7)'
                }}>
                  <h4 style={{ margin: '0 0 8px 0', fontSize: '1.1rem', fontWeight: 800, color: '#f8fafc' }}>
                    Clear Old &amp; Resolved Reports?
                  </h4>
                  <p style={{ margin: '0 0 14px 0', fontSize: '0.85rem', color: '#94a3b8', lineHeight: '1.4' }}>
                    Are you sure you want to remove <strong style={{ color: '#f8fafc' }}>{oldResolvedReports.length}</strong> old, resolved, and test incident reports from the officer ledger?
                  </p>

                  <div style={{
                    background: 'rgba(56, 189, 248, 0.1)', border: '1px solid rgba(56, 189, 248, 0.3)',
                    borderRadius: '8px', padding: '10px 12px', marginBottom: '16px',
                    color: '#7dd3fc', fontSize: '0.78rem', lineHeight: '1.4'
                  }}>
                    🛡️ <strong>Safety Protection Active:</strong> Active emergency SOS distress reports and unsynced local offline records ({pendingCount} pending in queue) are protected and will NOT be removed.
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                    <button
                      onClick={() => setShowCleanupModal(false)}
                      disabled={isCleaning}
                      style={{
                        background: '#1e293b', color: '#94a3b8', border: '1px solid #334155',
                        borderRadius: '8px', padding: '8px 16px', fontSize: '0.84rem', fontWeight: 700, cursor: 'pointer'
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleConfirmCleanup}
                      disabled={isCleaning || oldResolvedReports.length === 0}
                      style={{
                        background: '#ea580c', color: '#ffffff', border: 'none',
                        borderRadius: '8px', padding: '8px 18px', fontSize: '0.84rem', fontWeight: 800, cursor: isCleaning ? 'wait' : 'pointer'
                      }}
                    >
                      {isCleaning ? 'Cleaning Up…' : `Delete (${oldResolvedReports.length} Reports)`}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 4: OFFLINE SYNC QUEUE */}
        {activeTab === 'sync_queue' && (
          <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '16px', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', flexWrap: 'wrap', gap: '8px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#f8fafc' }}>
                  🔄 Local Offline Action Ledger
                </h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: '#94a3b8' }}>
                  Actions queued while disconnected. Guaranteed zero data loss with client idempotency.
                </p>
              </div>

              <button
                onClick={() => syncNow()}
                disabled={!isOnline || isSyncing}
                style={{
                  background: isOnline ? '#22c55e' : '#334155', color: isOnline ? '#0f172a' : '#64748b',
                  border: 'none', padding: '8px 16px', borderRadius: '8px', fontWeight: 800,
                  fontSize: '0.85rem', cursor: isOnline ? 'pointer' : 'not-allowed'
                }}
              >
                {isSyncing ? '⏳ Syncing...' : isOnline ? '⚡ Transmit Queue Now' : '📴 Offline (Awaiting Signal)'}
              </button>
            </div>

            {syncError && (
              <div style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid #ef4444', borderRadius: '8px', padding: '10px 14px', marginBottom: '16px', color: '#fca5a5', fontSize: '0.8rem' }}>
                ⚠️ {syncError}
              </div>
            )}

            {/* Road Status Queue */}
            <div style={{ marginBottom: '24px' }}>
              <h4 style={{ margin: '0 0 10px 0', fontSize: '0.9rem', color: '#fb923c', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Queued Road Status Changes ({pendingRoads.length})
              </h4>
              {pendingRoads.length === 0 ? (
                <div style={{ padding: '14px', background: '#1e293b', borderRadius: '8px', fontSize: '0.8rem', color: '#64748b' }}>
                  No pending road status changes.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {pendingRoads.map(r => (
                    <div key={r.id} style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', padding: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontWeight: 800, color: '#f8fafc', fontSize: '0.85rem' }}>{r.regionName}</div>
                        <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Target Status: <strong style={{ color: '#fb923c' }}>{r.roadStatus}</strong> · {new Date(r.timestamp).toLocaleTimeString()}</div>
                      </div>
                      <span style={{
                        background: r.syncStatus === 'SYNC_FAILED' ? '#ef444430' : r.syncStatus === 'SYNCING' ? '#3b82f630' : '#f59e0b30',
                        color: r.syncStatus === 'SYNC_FAILED' ? '#f87171' : r.syncStatus === 'SYNCING' ? '#60a5fa' : '#fcd34d',
                        padding: '3px 8px', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 700
                      }}>
                        {r.syncStatus} {r.retryCount ? `(Retry #${r.retryCount})` : ''}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Incident Reports Queue */}
            <div>
              <h4 style={{ margin: '0 0 10px 0', fontSize: '0.9rem', color: '#38bdf8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Queued Field Incident Reports ({pendingReports.length})
              </h4>
              {pendingReports.length === 0 ? (
                <div style={{ padding: '14px', background: '#1e293b', borderRadius: '8px', fontSize: '0.8rem', color: '#64748b' }}>
                  No pending reports waiting to sync.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {pendingReports.map(rep => (
                    <div key={rep.id} style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', padding: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontWeight: 800, color: '#f8fafc', fontSize: '0.85rem' }}>
                          {rep.payload.category.replace('_', ' ')} · ID: <span style={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>{rep.clientReportId.slice(0, 8)}...</span>
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                          {rep.payload.description ? rep.payload.description.slice(0, 50) + '...' : 'No description'}
                          {rep.payload.photoBlobKey ? ' · 📷 Photo Attached' : ''}
                        </div>
                      </div>
                      <span style={{
                        background: rep.syncStatus === 'SYNC_FAILED' ? '#ef444430' : rep.syncStatus === 'SYNCING' ? '#3b82f630' : '#f59e0b30',
                        color: rep.syncStatus === 'SYNC_FAILED' ? '#f87171' : rep.syncStatus === 'SYNCING' ? '#60a5fa' : '#fcd34d',
                        padding: '3px 8px', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 700
                      }}>
                        {rep.syncStatus} {rep.retryCount ? `(Retry #${rep.retryCount})` : ''}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default ResponderPortal;
