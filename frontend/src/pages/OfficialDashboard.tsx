import React, { useState, useEffect } from 'react';
import { TopBar } from '../components/layout/TopBar';
import { RiskHeatmap } from '../components/map/RiskHeatmap';
import { RegionDetailPanel } from '../components/panels/RegionDetailPanel';
import { LiveAlertTicker } from '../components/feed/LiveAlertTicker';
import { RegionRisk, Severity, CitizenReport, ReportStatus } from '../types';
import {
  fetchHeatmap,
  fetchRecentReports,
  updateReportStatus,
  deleteCitizenReport,
  resolvePhotoUrl
} from '../services/api';
import { getCategoryReferenceVisual } from '../services/photoStorage';
import { OfflineStatusHeader } from '../components/layout/OfflineStatusHeader';
import { AIPriorityPanel } from '../components/AIPriorityPanel';
import { SimulationWorkbench } from '../components/panels/SimulationWorkbench';
import { ModelMonitoringPanel } from '../components/panels/ModelMonitoringPanel';
import {
  subscribeToScenario,
  getActiveScenario,
  advanceToNextScenario
} from '../services/sharedRiskState';

/** Read role safely from localStorage (set during login) */
function getStoredRole(): string {
  return localStorage.getItem('ews_role') || 'GUEST';
}

const OfficialDashboard = () => {
  const [heatmapData, setHeatmapData]       = useState<RegionRisk[]>([]);
  const [reports, setReports]               = useState<CitizenReport[]>([]);
  const [noticeMsg, setNoticeMsg]           = useState<string | null>(null);
  const [selectedRegionId, setSelectedRegionId] = useState<string | null>(null);
  const [severityFilter, setSeverityFilter]  = useState<Severity | 'ALL'>('ALL');
  const [selectedDistrict, setSelectedDistrict] = useState('ALL');
  const [lang, setLang]                     = useState(localStorage.getItem('ews_lang') || 'en');
  const [alertCount]                        = useState(0);
  const [lastUpdated, setLastUpdated]        = useState<Date | null>(null);
  const [loading, setLoading]               = useState(true);
  const [viewMode, setViewMode]             = useState<'map' | 'ai_priority' | 'incidents' | 'simulation' | 'model_info'>('map');
  const [reportFilter, setReportFilter]     = useState<string>('ALL');
  const [photoModal, setPhotoModal]         = useState<string | null>(null);

  const role = getStoredRole();
  const [currentScenario, setCurrentScenario] = useState(() => getActiveScenario());

  const load = async () => {
    try {
      const [hData, rData] = await Promise.all([
        fetchHeatmap(),
        fetchRecentReports(),
      ]);
      setHeatmapData(hData);
      setReports(rData);
      setLastUpdated(new Date());
    } catch {
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (reportId: string, newStatus: ReportStatus) => {
    setReports(prev => prev.map(r => r.id === reportId ? { ...r, status: newStatus } : r));
    try {
      await updateReportStatus(reportId, newStatus);
      setNoticeMsg(`✅ Incident status updated to ${newStatus === 'DISMISSED' ? 'REJECTED' : newStatus}`);
      await load();
    } catch (err: any) {
      setNoticeMsg(`❌ Update failed: ${err.message || 'Error'}`);
      await load();
    } finally {
      setTimeout(() => setNoticeMsg(null), 3500);
    }
  };

  const handleDeleteReport = async (reportId: string) => {
    setReports(prev => prev.filter(r => r.id !== reportId));
    try {
      await deleteCitizenReport(reportId);
      setNoticeMsg(`✅ Incident report #${reportId.substring(0, 8)} removed.`);
      await load();
    } catch (err: any) {
      setNoticeMsg(`❌ Deletion failed: ${err.message || 'Error'}`);
      await load();
    } finally {
      setTimeout(() => setNoticeMsg(null), 3500);
    }
  };

  useEffect(() => {
    load();

    const unsub = subscribeToScenario(() => {
      setCurrentScenario(getActiveScenario());
      load();
    });

    const handleSync = () => load();
    window.addEventListener('ews-reports-updated', handleSync);
    window.addEventListener('ews-sync-completed', handleSync);

    // Cross-tab BroadcastChannel for instant sync from citizen reports
    let bc: BroadcastChannel | null = null;
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      bc = new BroadcastChannel('satark-reports-channel');
      bc.onmessage = () => {
        load();
      };
    }

    const onStorage = (e: StorageEvent) => {
      if (e.key === 'satark_reports_tick') {
        load();
      }
    };
    window.addEventListener('storage', onStorage);

    const iv = setInterval(load, 15000);
    return () => {
      unsub();
      window.removeEventListener('ews-reports-updated', handleSync);
      window.removeEventListener('ews-sync-completed', handleSync);
      window.removeEventListener('storage', onStorage);
      if (bc) bc.close();
      clearInterval(iv);
    };
  }, []);

  const handleLangToggle = () => {
    const next = lang === 'en' ? 'as' : 'en';
    setLang(next);
    localStorage.setItem('ews_lang', next);
  };

  const districts = ['ALL', ...Array.from(new Set(heatmapData.map(d => d.district)))];

  // Live "X min ago" counter
  const [, forceUpdate] = useState(0);
  useEffect(() => {
    const iv = setInterval(() => forceUpdate(n => n + 1), 30000);
    return () => clearInterval(iv);
  }, []);
  const minAgo = lastUpdated
    ? Math.floor((Date.now() - lastUpdated.getTime()) / 60000)
    : null;

  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth <= 768);
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const gridCols = isMobile ? '1fr' : (selectedRegionId ? '1fr 340px' : '1fr 0px');

  const filteredRegions = heatmapData.filter(r =>
    selectedDistrict === 'ALL' || r.district === selectedDistrict
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      <OfflineStatusHeader />
      <div style={{
        display: 'grid',
        gridTemplateRows: isMobile ? 'auto auto 1fr auto' : '52px auto 1fr 44px',
        gridTemplateColumns: gridCols,
        flex: 1,
        overflow: 'hidden',
        background: '#161B22',
        transition: 'grid-template-columns 300ms ease-out',
      }}>

        {/* ── TopBar ── */}
        <div style={{ gridColumn: '1 / -1' }}>
        <TopBar
          districts={districts}
          selectedDistrict={selectedDistrict}
          onDistrictChange={setSelectedDistrict}
          severityFilter={severityFilter}
          onSeverityChange={setSeverityFilter}
          alertCount={alertCount}
          lang={lang}
          onLangToggle={handleLangToggle}
        />
      </div>

      {/* ── Stat bar ── */}
      <div style={{
        gridColumn: '1 / -1',
        background: '#1B222C',
        borderBottom: '1px solid #2A3547',
        display: 'flex', alignItems: 'center',
        justifyContent: 'space-between',
        padding: '6px 12px',
        fontFamily: 'var(--font-mono)', fontSize: '0.68rem', color: '#4A5A70',
        minHeight: '36px',
        boxSizing: 'border-box',
        gap: '8px',
        flexWrap: isMobile ? 'wrap' : 'nowrap',
      }}>
        {/* Monitoring metrics on left / top */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          overflowX: 'auto',
          whiteSpace: 'nowrap',
          flex: isMobile ? '1 1 100%' : '1 1 auto',
          scrollbarWidth: 'none'
        }}>
          <span><span className="status-dot green" style={{ marginRight: 5 }} />
            {heatmapData.length} monitored
          </span>
          <span>|</span>
          <span><span className="status-dot amber" style={{ marginRight: 5 }} />
            Risk engine active
          </span>
          <span>|</span>
          <span><span className="status-dot blue" style={{ marginRight: 5 }} />
            {heatmapData.filter(r => r.severity === 'CRITICAL').length} CRIT &nbsp;
            {heatmapData.filter(r => r.severity === 'HIGH').length} HIGH
          </span>
          <span>|</span>
          <span>🔄 {minAgo === null ? 'Loading...' : minAgo === 0 ? 'Just updated' : `${minAgo}m ago`}</span>
        </div>

        {/* View mode & responder action controls on right */}
        <div style={{
          display: 'flex',
          gap: '6px',
          flexShrink: 0,
          alignItems: 'center',
          width: isMobile ? '100%' : 'auto',
          justifyContent: isMobile ? 'space-between' : 'flex-end',
          overflowX: 'auto',
          paddingTop: isMobile ? '4px' : '0'
        }}>
          <button
            onClick={() => advanceToNextScenario()}
            title="Synchronized Demonstration Scenario (Rotates every 5m · Click to switch for SIH evaluation)"
            style={{
              padding: '4px 10px',
              borderRadius: '6px',
              border: '1px solid #0284c7',
              background: 'rgba(2, 132, 199, 0.25)',
              color: '#38bdf8',
              fontSize: '0.74rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              whiteSpace: 'nowrap',
              flexShrink: 0
            }}
          >
            <span>🧪 DEMO: {currentScenario.label.split(' ')[1] || 'A'}</span>
            <span style={{ opacity: 0.75, fontSize: '0.62rem' }}>⟳ Switch</span>
          </button>
          <a
            href="/responder"
            style={{
              padding: '4px 10px',
              borderRadius: '6px',
              border: '1px solid #ea580c',
              background: 'rgba(234, 88, 12, 0.25)',
              color: '#fb923c',
              fontSize: '0.74rem',
              fontWeight: 700,
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              whiteSpace: 'nowrap',
              flexShrink: 0
            }}
          >
            🛡️ Responder Mode
          </a>
          <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
            <button
              onClick={() => setViewMode('map')}
              style={{
                padding: '4px 10px', borderRadius: '6px', border: 'none',
                background: viewMode === 'map' ? '#2563eb' : '#2A3547',
                color: viewMode === 'map' ? '#fff' : '#94a3b8',
                fontSize: '0.74rem', fontWeight: 700, cursor: 'pointer',
                whiteSpace: 'nowrap'
              }}
            >
              🗺️ GIS Map
            </button>
            <button
              onClick={() => setViewMode('ai_priority')}
              style={{
                padding: '4px 10px', borderRadius: '6px', border: 'none',
                background: viewMode === 'ai_priority' ? '#ea580c' : '#2A3547',
                color: viewMode === 'ai_priority' ? '#fff' : '#94a3b8',
                fontSize: '0.74rem', fontWeight: 700, cursor: 'pointer',
                whiteSpace: 'nowrap'
              }}
            >
              🤖 AI Priority
            </button>
            <button
              onClick={() => { setViewMode('incidents'); load(); }}
              style={{
                padding: '4px 10px', borderRadius: '6px', border: 'none',
                background: viewMode === 'incidents' ? '#0284c7' : '#2A3547',
                color: viewMode === 'incidents' ? '#fff' : '#94a3b8',
                fontSize: '0.74rem', fontWeight: 700, cursor: 'pointer',
                whiteSpace: 'nowrap'
              }}
            >
              📋 Reports ({reports.length})
            </button>
            <button
              onClick={() => setViewMode('simulation')}
              style={{
                padding: '4px 10px', borderRadius: '6px', border: 'none',
                background: viewMode === 'simulation' ? '#6366f1' : '#2A3547',
                color: viewMode === 'simulation' ? '#fff' : '#94a3b8',
                fontSize: '0.74rem', fontWeight: 700, cursor: 'pointer',
                whiteSpace: 'nowrap'
              }}
            >
              🧪 Simulation Mode
            </button>
            <button
              onClick={() => setViewMode('model_info')}
              style={{
                padding: '4px 10px', borderRadius: '6px', border: 'none',
                background: viewMode === 'model_info' ? '#059669' : '#2A3547',
                color: viewMode === 'model_info' ? '#fff' : '#94a3b8',
                fontSize: '0.74rem', fontWeight: 700, cursor: 'pointer',
                whiteSpace: 'nowrap'
              }}
            >
              🧠 ML Registry
            </button>
          </div>
        </div>
      </div>

      {viewMode === 'ai_priority' ? (
        <div style={{
          gridRow: 3, gridColumn: '1 / -1',
          overflowY: 'auto',
          padding: isMobile ? '10px 8px' : '16px 20px',
          background: '#0a0f1e',
          WebkitOverflowScrolling: 'touch'
        }}>
          <AIPriorityPanel
            regions={heatmapData}
            reports={reports}
            onSelectRegion={(rId) => {
              setSelectedRegionId(rId);
              setViewMode('map');
            }}
            onNavigateToReports={() => {
              setViewMode('incidents');
              load();
            }}
          />
        </div>
      ) : viewMode === 'incidents' ? (
        <div style={{
          gridRow: 3, gridColumn: '1 / -1',
          overflowY: 'auto',
          padding: isMobile ? '12px 10px' : '20px 28px',
          background: '#0a0f1e',
          WebkitOverflowScrolling: 'touch'
        }}>
          <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
            {noticeMsg && (
              <div style={{
                background: noticeMsg.startsWith('✅') ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                border: `1px solid ${noticeMsg.startsWith('✅') ? '#22c55e' : '#ef4444'}`,
                color: noticeMsg.startsWith('✅') ? '#86efac' : '#fca5a5',
                padding: '10px 16px', borderRadius: '8px', marginBottom: '16px',
                fontSize: '0.85rem', fontWeight: 700, display: 'flex', justifyContent: 'space-between', alignItems: 'center'
              }}>
                <span>{noticeMsg}</span>
                <button onClick={() => setNoticeMsg(null)} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer' }}>✕</button>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  📋 Monitored Incident Ledger &amp; Citizen Reports
                  <span style={{ fontSize: '0.75rem', background: '#0284c725', color: '#38bdf8', padding: '2px 8px', borderRadius: '12px', border: '1px solid #0284c7' }}>
                    {reports.length} Total
                  </span>
                </h2>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.82rem', color: '#94a3b8' }}>
                  Real-time crowdsourced reports and field observations synchronized across portals.
                </p>
              </div>

              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', background: '#1e293b', padding: '3px', borderRadius: '8px', gap: '4px', border: '1px solid #334155' }}>
                  {(['ALL', 'PENDING', 'DISPATCHED', 'VERIFIED', 'RESOLVED', 'DISMISSED'] as const).map(flt => (
                    <button
                      key={flt}
                      onClick={() => setReportFilter(flt)}
                      style={{
                        padding: '4px 10px', borderRadius: '6px', border: 'none',
                        background: reportFilter === flt ? '#0284c7' : 'transparent',
                        color: reportFilter === flt ? '#fff' : '#94a3b8',
                        fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer'
                      }}
                    >
                      {flt === 'DISMISSED' ? 'REJECTED' : flt}
                    </button>
                  ))}
                </div>
                <button
                  onClick={load}
                  style={{
                    background: '#1e293b', border: '1px solid #334155', color: '#38bdf8',
                    padding: '6px 12px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer'
                  }}
                >
                  🔄 Refresh
                </button>
              </div>
            </div>

            {/* List of reports */}
            {reports.filter(r => reportFilter === 'ALL' || (reportFilter === 'DISMISSED' ? (r.status === 'DISMISSED' || (r.status as string) === 'REJECTED') : r.status === reportFilter)).length === 0 ? (
              <div style={{ padding: '40px 20px', textAlign: 'center', background: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px', color: '#64748b' }}>
                No reports matching filter <strong style={{ color: '#94a3b8' }}>{reportFilter === 'DISMISSED' ? 'REJECTED' : reportFilter}</strong>.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {reports
                  .filter(r => reportFilter === 'ALL' || (reportFilter === 'DISMISSED' ? (r.status === 'DISMISSED' || (r.status as string) === 'REJECTED') : r.status === reportFilter))
                  .map(rep => (
                    <div
                      key={rep.id}
                      style={{
                        background: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px',
                        padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
                        flexWrap: 'wrap', gap: '14px',
                        borderLeft: rep.status === 'RESOLVED' ? '4px solid #3b82f6' : rep.status === 'DISMISSED' ? '4px solid #ef4444' : rep.status === 'DISPATCHED' ? '4px solid #ea580c' : rep.status === 'VERIFIED' ? '4px solid #22c55e' : '4px solid #f59e0b'
                      }}
                    >
                      <div style={{ flex: 1, minWidth: '260px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', flexWrap: 'wrap' }}>
                          <span style={{
                            background: rep.reporterType === 'FIELD_OFFICER' ? '#ea580c25' : '#3b82f625',
                            color: rep.reporterType === 'FIELD_OFFICER' ? '#fb923c' : '#60a5fa',
                            padding: '2px 8px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 800,
                            border: `1px solid ${rep.reporterType === 'FIELD_OFFICER' ? '#ea580c40' : '#3b82f640'}`
                          }}>
                            {rep.reporterType === 'FIELD_OFFICER' ? '👮 FIELD OFFICER' : '👤 CITIZEN REPORT'}
                          </span>
                          <span style={{ fontWeight: 800, color: '#f8fafc', fontSize: '0.95rem' }}>
                            {rep.category.replace(/_/g, ' ')}
                          </span>
                          <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
                            {new Date(rep.createdAt).toLocaleString()} · ID: #{rep.id.substring(0, 8)}
                          </span>
                        </div>

                        <div style={{ fontSize: '0.88rem', color: '#e2e8f0', lineHeight: '1.5', marginBottom: '8px' }}>
                          {rep.description}
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', fontSize: '0.75rem', color: '#94a3b8', flexWrap: 'wrap' }}>
                          {rep.reporterName && (
                            <span>👤 {rep.reporterName} {rep.reporterPhone ? `(${rep.reporterPhone})` : ''}</span>
                          )}
                          <span>📍 {rep.district || 'Meppadi / Wayanad'} ({(rep.latitude ?? rep.geoLat)?.toFixed(4) || '11.55'}, {(rep.longitude ?? rep.geoLng)?.toFixed(4) || '76.12'})</span>
                        </div>

                        {rep.photoUrl && (
                          <div style={{ marginTop: '10px' }}>
                            <img
                              src={resolvePhotoUrl(rep.photoUrl) ?? rep.photoUrl}
                              alt="Incident Evidence"
                              onClick={() => setPhotoModal(resolvePhotoUrl(rep.photoUrl) ?? rep.photoUrl)}
                              onError={(e) => {
                                e.currentTarget.src = getCategoryReferenceVisual(rep.category);
                              }}
                              style={{ width: '90px', height: '90px', objectFit: 'cover', borderRadius: '8px', background: '#090d16', border: '1px solid #334155', cursor: 'pointer' }}
                              title="Click to view full photo"
                            />
                          </div>
                        )}
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '10px' }}>
                        <span style={{
                          background: rep.status === 'VERIFIED' ? '#22c55e25' : rep.status === 'RESOLVED' ? '#3b82f625' : rep.status === 'DISPATCHED' ? '#ea580c25' : rep.status === 'DISMISSED' ? '#ef444425' : '#f59e0b25',
                          color: rep.status === 'VERIFIED' ? '#4ade80' : rep.status === 'RESOLVED' ? '#60a5fa' : rep.status === 'DISPATCHED' ? '#fb923c' : rep.status === 'DISMISSED' ? '#f87171' : '#fcd34d',
                          border: `1px solid ${rep.status === 'VERIFIED' ? '#22c55e' : rep.status === 'RESOLVED' ? '#3b82f6' : rep.status === 'DISPATCHED' ? '#ea580c' : rep.status === 'DISMISSED' ? '#ef4444' : '#f59e0b'}`,
                          padding: '4px 12px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 800
                        }}>
                          {rep.status === 'DISMISSED' ? 'REJECTED' : rep.status}
                        </span>

                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                          {(['DISPATCHED', 'VERIFIED', 'RESOLVED', 'DISMISSED'] as const).map(st => (
                            <button
                              key={st}
                              onClick={() => handleUpdateStatus(rep.id, st)}
                              style={{
                                background: rep.status === st
                                  ? (st === 'RESOLVED' ? '#2563eb' : st === 'DISPATCHED' ? '#ea580c' : st === 'VERIFIED' ? '#16a34a' : '#dc2626')
                                  : '#1e293b',
                                color: rep.status === st ? '#ffffff' : '#94a3b8',
                                border: `1px solid ${rep.status === st ? 'transparent' : '#334155'}`,
                                borderRadius: '6px',
                                padding: '4px 8px',
                                fontSize: '0.7rem',
                                fontWeight: rep.status === st ? 800 : 600,
                                cursor: 'pointer'
                              }}
                            >
                              {rep.status === st ? (st === 'DISMISSED' ? '✓ REJECTED' : `✓ ${st}`) : st === 'DISMISSED' ? 'Reject' : `Mark ${st}`}
                            </button>
                          ))}

                          <button
                            onClick={() => handleDeleteReport(rep.id)}
                            style={{
                              background: '#334155',
                              color: '#94a3b8',
                              border: 'none',
                              borderRadius: '6px',
                              padding: '4px 8px',
                              fontSize: '0.7rem',
                              cursor: 'pointer'
                            }}
                            title="Delete this incident record"
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>
      ) : viewMode === 'simulation' ? (
        <div style={{
          gridRow: 3, gridColumn: '1 / -1',
          overflowY: 'auto',
          padding: isMobile ? '10px 8px' : '20px 32px',
          background: '#0a0f1e',
          WebkitOverflowScrolling: 'touch'
        }}>
          <SimulationWorkbench />
        </div>
      ) : viewMode === 'model_info' ? (
        <div style={{
          gridRow: 3, gridColumn: '1 / -1',
          overflowY: 'auto',
          padding: isMobile ? '10px 8px' : '20px 32px',
          background: '#0a0f1e',
          WebkitOverflowScrolling: 'touch'
        }}>
          <ModelMonitoringPanel />
        </div>
      ) : (
        <>
          {/* ── Map ── */}
          <div style={{ gridRow: 3, gridColumn: 1, position: 'relative', overflow: 'hidden' }}>
            {loading ? (
              <div style={{
                position: 'absolute', inset: 0, display: 'flex',
                alignItems: 'center', justifyContent: 'center',
                background: '#161B22', flexDirection: 'column', gap: '12px',
              }}>
                <div style={{ width: 32, height: 32, border: '3px solid #2A3547',
                  borderTopColor: '#5B8DB8', borderRadius: '50%',
                  animation: 'spin 0.8s linear infinite' }} />
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: '#4A5A70' }}>
                  Loading risk data…
                </div>
              </div>
            ) : (
              <RiskHeatmap
                regions={filteredRegions}
                selectedRegionId={selectedRegionId}
                onRegionSelect={setSelectedRegionId}
                severityFilter={severityFilter}
              />
            )}
          </div>

          {/* ── Detail panel (Desktop sidebar or Mobile bottom drawer) ── */}
          {!isMobile && (
            <div style={{
              gridRow: 3, gridColumn: 2,
              borderLeft: selectedRegionId ? '1px solid #2A3547' : 'none',
              overflow: 'hidden', overflowY: 'auto',
              transition: 'opacity 300ms ease',
              opacity: selectedRegionId ? 1 : 0,
            }}>
              <RegionDetailPanel
                regionId={selectedRegionId}
                onClose={() => setSelectedRegionId(null)}
                userRole={role}
                lang={lang}
              />
            </div>
          )}

          {isMobile && selectedRegionId && (
            <div
              onClick={() => setSelectedRegionId(null)}
              style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(0,0,0,0.75)',
                backdropFilter: 'blur(4px)',
                zIndex: 1000,
                display: 'flex',
                justifyContent: 'flex-end',
                flexDirection: 'column'
              }}
            >
              <div
                onClick={(e) => e.stopPropagation()}
                style={{
                  background: '#0f172a',
                  borderTop: '2px solid #38bdf8',
                  borderRadius: '16px 16px 0 0',
                  maxHeight: '80vh',
                  overflowY: 'auto',
                  padding: '16px'
                }}
              >
                <RegionDetailPanel
                  regionId={selectedRegionId}
                  onClose={() => setSelectedRegionId(null)}
                  userRole={role}
                  lang={lang}
                />
              </div>
            </div>
          )}
        </>
      )}

      {/* ── Live ticker ── */}
      <div style={{ gridRow: 4, gridColumn: '1 / -1' }}>
        <LiveAlertTicker onSelectRegion={(id) => { setSelectedRegionId(id); setViewMode('map'); }} />
      </div>

      {/* ── Photo Preview Modal ── */}
      {photoModal && (
        <div
          onClick={() => setPhotoModal(null)}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)',
            zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '20px'
          }}
        >
          <div style={{ position: 'relative', maxWidth: '90vw', maxHeight: '90vh' }}>
            <img
              src={photoModal}
              alt="Full evidence"
              style={{ maxWidth: '100%', maxHeight: '85vh', borderRadius: '8px', objectFit: 'contain' }}
            />
            <button
              onClick={() => setPhotoModal(null)}
              style={{
                position: 'absolute', top: '-14px', right: '-14px',
                background: '#ef4444', color: '#fff', border: 'none',
                borderRadius: '50%', width: '32px', height: '32px',
                cursor: 'pointer', fontWeight: 800, fontSize: '1rem'
              }}
            >
              ✕
            </button>
          </div>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    </div>
  );
};

export default OfficialDashboard;
