import React, { useState, useEffect } from 'react';
import { TopBar } from '../components/layout/TopBar';
import { RiskHeatmap } from '../components/map/RiskHeatmap';
import { RegionDetailPanel } from '../components/panels/RegionDetailPanel';
import { LiveAlertTicker } from '../components/feed/LiveAlertTicker';
import { RegionRisk, Severity } from '../types';
import { fetchHeatmap } from '../services/api';
import { OfflineStatusHeader } from '../components/layout/OfflineStatusHeader';
import { AIPriorityPanel } from '../components/AIPriorityPanel';

/** Read role safely from localStorage (set during login) */
function getStoredRole(): string {
  return localStorage.getItem('ews_role') || 'GUEST';
}

const OfficialDashboard = () => {
  const [heatmapData, setHeatmapData]       = useState<RegionRisk[]>([]);
  const [selectedRegionId, setSelectedRegionId] = useState<string | null>(null);
  const [severityFilter, setSeverityFilter]  = useState<Severity | 'ALL'>('ALL');
  const [selectedDistrict, setSelectedDistrict] = useState('ALL');
  const [lang, setLang]                     = useState(localStorage.getItem('ews_lang') || 'en');
  const [alertCount]                        = useState(0);
  const [lastUpdated, setLastUpdated]        = useState<Date | null>(null);
  const [loading, setLoading]               = useState(true);
  const [viewMode, setViewMode]             = useState<'map' | 'ai_priority'>('map');

  const role = getStoredRole();

  useEffect(() => {
    const load = () =>
      fetchHeatmap()
        .then(data => { setHeatmapData(data); setLastUpdated(new Date()); setLoading(false); })
        .catch(() => setLoading(false));
    load();
    const iv = setInterval(load, 60000);
    return () => clearInterval(iv);
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
            onSelectRegion={(rId) => {
              setSelectedRegionId(rId);
              setViewMode('map');
            }}
          />
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
        <LiveAlertTicker />
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    </div>
  );
};

export default OfficialDashboard;
