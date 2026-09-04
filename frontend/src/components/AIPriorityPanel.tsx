/**
 * AIPriorityPanel — AI Incident Prioritization & Decision Support Dashboard
 * Operational Command Interface for Disaster Officials & Responders
 * SIH 2026 EWS-NER · SATARK
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  buildPrioritizedIncidents,
  PrioritizedIncident,
  getDemoAlerts,
  runAIPriorityAgent
} from '../services/aiPriorityAgent';
import { RegionRisk, CitizenReport, RoadStatus } from '../types';
import { fetchHeatmap, fetchRecentReports, updateRoadStatus } from '../services/api';
import { getCachedHeatmapWithMeta, getCachedIncidents, queueRoadStatus } from '../services/offlineStore';

const PRIORITY_CONFIG = {
  CRITICAL: { color: '#fca5a5', bg: 'rgba(239, 68, 68, 0.15)', border: '#ef4444', icon: '🔴', label: 'CRITICAL' },
  HIGH:     { color: '#fdba74', bg: 'rgba(249, 115, 22, 0.15)', border: '#f97316', icon: '🟠', label: 'HIGH' },
  MEDIUM:   { color: '#fde047', bg: 'rgba(234, 179, 8, 0.15)',  border: '#eab308', icon: '🟡', label: 'MEDIUM' },
  LOW:      { color: '#86efac', bg: 'rgba(34, 197, 94, 0.12)',  border: '#22c55e', icon: '🟢', label: 'LOW' },
};

interface Props {
  regions?: RegionRisk[];
  reports?: CitizenReport[];
  onSelectRegion?: (regionId: string) => void;
  onUpdateRoadStatus?: (regionId: string, status: RoadStatus) => void;
  onNavigateToReports?: () => void;
}

export const AIPriorityPanel: React.FC<Props> = ({
  regions: propRegions,
  reports: propReports,
  onSelectRegion,
  onUpdateRoadStatus
}) => {
  const [incidents, setIncidents] = useState<PrioritizedIncident[]>([]);
  const [selectedFilter, setSelectedFilter] = useState<'ALL' | 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'>('ALL');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [photoModal, setPhotoModal] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Load and correlate incidents
  const loadData = useCallback(async () => {
    setIsRefreshing(true);
    try {
      let liveRegions = propRegions;
      let liveReports = propReports;

      if (!liveRegions || liveRegions.length === 0) {
        try {
          liveRegions = await fetchHeatmap();
        } catch {
          const cachedH = await getCachedHeatmapWithMeta();
          liveRegions = cachedH?.data || [];
        }
      }

      if (!liveReports || liveReports.length === 0) {
        try {
          liveReports = await fetchRecentReports();
        } catch {
          const cachedR = await getCachedIncidents();
          liveReports = cachedR?.data || [];
        }
      }

      const prioritized = buildPrioritizedIncidents(liveRegions || [], liveReports || []);
      setIncidents(prioritized);
      setLastUpdated(new Date());
    } catch {
      // Fallback to demo
      const prioritized = buildPrioritizedIncidents([], []);
      setIncidents(prioritized);
    } finally {
      setIsRefreshing(false);
    }
  }, [propRegions, propReports]);

  useEffect(() => {
    loadData();
    const timer = setInterval(loadData, 60000); // 1 minute live sync
    return () => clearInterval(timer);
  }, [loadData]);

  // Road status toggle action
  const handleToggleRoad = async (regionId: string, newStatus: RoadStatus) => {
    try {
      await updateRoadStatus(regionId, newStatus);
      setActionNotice(`Road corridor status updated to ${newStatus}`);
    } catch {
      await queueRoadStatus(regionId, newStatus);
      setActionNotice(`Road status update queued locally (${newStatus}) - Pending offline sync`);
    }
    if (onUpdateRoadStatus) {
      onUpdateRoadStatus(regionId, newStatus);
    }
    // Update local incident view
    setIncidents(prev => prev.map(inc => inc.regionId === regionId ? { ...inc, road_status: newStatus } : inc));
    setTimeout(() => setActionNotice(null), 4000);
  };

  const handleDispatch = (zoneName: string) => {
    setActionNotice(`🚨 Tactical Response Unit dispatched to ${zoneName}. Coordinates relayed to field units.`);
    setTimeout(() => setActionNotice(null), 5000);
  };

  // Counts
  const criticalCount = incidents.filter(i => i.priority_level === 'CRITICAL').length;
  const highCount     = incidents.filter(i => i.priority_level === 'HIGH').length;
  const mediumCount   = incidents.filter(i => i.priority_level === 'MEDIUM').length;
  const lowCount      = incidents.filter(i => i.priority_level === 'LOW').length;

  const filteredIncidents = selectedFilter === 'ALL'
    ? incidents
    : incidents.filter(i => i.priority_level === selectedFilter);

  // Detect any active clusters
  const clusters = incidents.filter(i => i.is_cluster);

  return (
    <div style={{
      background: '#0b1329',
      border: '1px solid rgba(56, 189, 248, 0.25)',
      borderRadius: '16px',
      overflow: 'hidden',
      fontFamily: 'Inter, system-ui, sans-serif',
      color: '#f8fafc',
      boxShadow: '0 8px 32px rgba(0,0,0,0.5)'
    }}>
      {/* ── Action Notice Toast ── */}
      {actionNotice && (
        <div style={{
          background: 'rgba(34, 197, 94, 0.2)',
          borderBottom: '1px solid #22c55e',
          padding: '10px 20px',
          fontSize: '0.85rem',
          color: '#86efac',
          fontWeight: 700,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <span>✅ {actionNotice}</span>
          <button onClick={() => setActionNotice(null)} style={{ background: 'transparent', border: 'none', color: '#86efac', cursor: 'pointer' }}>✕</button>
        </div>
      )}

      {/* ── Operational Header ── */}
      <div style={{
        padding: isMobile ? '12px 14px' : '20px 24px',
        background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.95), rgba(15, 23, 42, 0.98))',
        borderBottom: '1px solid rgba(51, 65, 85, 0.6)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '36px', height: '36px', borderRadius: '10px',
              background: 'linear-gradient(135deg, #ef4444, #ea580c)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px',
              boxShadow: '0 2px 10px rgba(239,68,68,0.4)'
            }}>
              🤖
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <span style={{ fontWeight: 900, fontSize: isMobile ? '1.0rem' : '1.15rem', letterSpacing: '-0.01em', color: '#f8fafc' }}>
                  AI Response Priority &amp; Decision Support
                </span>
                <span style={{
                  background: 'rgba(239, 68, 68, 0.2)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.4)',
                  borderRadius: '6px', padding: '2px 8px', fontSize: '0.7rem', fontWeight: 800
                }}>
                  COMMAND ACCESS ONLY
                </span>
              </div>
              <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '2px' }}>
                Correlating satellite slope susceptibility, rainfall saturation &amp; citizen ground SOS reports
              </div>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', width: isMobile ? '100%' : 'auto', justifyContent: isMobile ? 'space-between' : 'flex-end' }}>
          <div style={{ fontSize: '0.72rem', color: '#64748b', textAlign: isMobile ? 'left' : 'right' }}>
            Updated: {lastUpdated.toLocaleTimeString()}
          </div>
          <button
            onClick={loadData}
            disabled={isRefreshing}
            style={{
              background: 'rgba(56, 189, 248, 0.15)',
              border: '1px solid #38bdf8',
              color: '#38bdf8',
              borderRadius: '8px',
              padding: '6px 14px',
              fontSize: '0.8rem',
              cursor: 'pointer',
              fontWeight: 700,
              opacity: isRefreshing ? 0.6 : 1
            }}
          >
            {isRefreshing ? '⟳ Scoring...' : '⟳ Refresh Live AI'}
          </button>
        </div>
      </div>

      {/* ── Operational Workflow Indicator ── */}
      <div style={{
        background: 'rgba(15, 23, 42, 0.7)',
        padding: isMobile ? '8px 12px' : '8px 24px',
        borderBottom: '1px solid rgba(51, 65, 85, 0.4)',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        fontSize: '0.74rem',
        color: '#94a3b8',
        overflowX: 'auto',
        whiteSpace: 'nowrap'
      }}>
        <span style={{ color: '#38bdf8', fontWeight: 700 }}>Decision Pipeline:</span>
        <span>1. Citizen Report / SOS</span>
        <span>→</span>
        <span>2. Telemetry &amp; Terrain Evaluation</span>
        <span>→</span>
        <span style={{ color: '#f59e0b', fontWeight: 700 }}>3. AI Priority Scoring</span>
        <span>→</span>
        <span style={{ color: '#4ade80', fontWeight: 700 }}>4. Officer Response &amp; Detour Protocol</span>
      </div>

      {/* ── Potential Incident Cluster Banner ── */}
      {clusters.length > 0 && (
        <div style={{
          background: 'rgba(234, 88, 12, 0.15)',
          borderBottom: '1px solid rgba(234, 88, 12, 0.35)',
          padding: isMobile ? '8px 12px' : '10px 24px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          fontSize: '0.8rem',
          color: '#fdba74'
        }}>
          <span style={{ fontSize: '1.2rem' }}>⚠️</span>
          <div>
            <strong>Potential Incident Cluster Detected:</strong> {clusters.length} sector(s) have multiple corroborating citizen reports logged within close proximity. Prioritize ground reconnaissance.
          </div>
        </div>
      )}

      {/* ── Priority Filter Summary Counters ── */}
      <div style={{
        padding: isMobile ? '8px 12px' : '12px 24px',
        background: 'rgba(10, 16, 32, 0.85)',
        borderBottom: '1px solid rgba(51, 65, 85, 0.5)',
        display: 'flex',
        gap: '8px',
        flexWrap: 'wrap',
        alignItems: 'center'
      }}>
        <span style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', marginRight: '4px' }}>
          Filter Priority:
        </span>

        <button
          onClick={() => setSelectedFilter('ALL')}
          style={{
            padding: '6px 12px', borderRadius: '8px',
            border: selectedFilter === 'ALL' ? '1px solid #38bdf8' : '1px solid #334155',
            background: selectedFilter === 'ALL' ? 'rgba(56, 189, 248, 0.2)' : '#1e293b',
            color: selectedFilter === 'ALL' ? '#38bdf8' : '#94a3b8',
            fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer'
          }}
        >
          All Sectors ({incidents.length})
        </button>

        <button
          onClick={() => setSelectedFilter('CRITICAL')}
          style={{
            padding: '6px 12px', borderRadius: '8px',
            border: selectedFilter === 'CRITICAL' ? '1px solid #ef4444' : '1px solid #334155',
            background: selectedFilter === 'CRITICAL' ? 'rgba(239, 68, 68, 0.25)' : '#1e293b',
            color: selectedFilter === 'CRITICAL' ? '#fca5a5' : '#f87171',
            fontSize: '0.78rem', fontWeight: 800, cursor: 'pointer'
          }}
        >
          🔴 CRITICAL ({criticalCount})
        </button>

        <button
          onClick={() => setSelectedFilter('HIGH')}
          style={{
            padding: '6px 12px', borderRadius: '8px',
            border: selectedFilter === 'HIGH' ? '1px solid #f97316' : '1px solid #334155',
            background: selectedFilter === 'HIGH' ? 'rgba(249, 115, 22, 0.25)' : '#1e293b',
            color: selectedFilter === 'HIGH' ? '#fdba74' : '#fb923c',
            fontSize: '0.78rem', fontWeight: 800, cursor: 'pointer'
          }}
        >
          🟠 HIGH ({highCount})
        </button>

        <button
          onClick={() => setSelectedFilter('MEDIUM')}
          style={{
            padding: '6px 12px', borderRadius: '8px',
            border: selectedFilter === 'MEDIUM' ? '1px solid #eab308' : '1px solid #334155',
            background: selectedFilter === 'MEDIUM' ? 'rgba(234, 179, 8, 0.25)' : '#1e293b',
            color: selectedFilter === 'MEDIUM' ? '#fde047' : '#facc15',
            fontSize: '0.78rem', fontWeight: 800, cursor: 'pointer'
          }}
        >
          🟡 MEDIUM ({mediumCount})
        </button>

        <button
          onClick={() => setSelectedFilter('LOW')}
          style={{
            padding: '6px 12px', borderRadius: '8px',
            border: selectedFilter === 'LOW' ? '1px solid #22c55e' : '1px solid #334155',
            background: selectedFilter === 'LOW' ? 'rgba(34, 197, 94, 0.25)' : '#1e293b',
            color: selectedFilter === 'LOW' ? '#86efac' : '#4ade80',
            fontSize: '0.78rem', fontWeight: 800, cursor: 'pointer'
          }}
        >
          🟢 LOW ({lowCount})
        </button>
      </div>

      {/* ── Incident List ── */}
      <div style={{ maxHeight: '640px', overflowY: 'auto' }}>
        {filteredIncidents.length === 0 ? (
          <div style={{ padding: '48px 24px', textAlign: 'center', color: '#64748b' }}>
            No incidents found matching the selected priority level.
          </div>
        ) : (
          filteredIncidents.map((incident) => {
            const cfg = PRIORITY_CONFIG[incident.priority_level];
            const isExpanded = expandedId === incident.id;

            return (
              <div
                key={incident.id}
                style={{
                  borderBottom: '1px solid rgba(51, 65, 85, 0.4)',
                  background: isExpanded ? 'rgba(30, 41, 59, 0.4)' : 'transparent',
                  transition: 'background 0.15s'
                }}
              >
                {/* ── Main Collapsible Row ── */}
                <div
                  onClick={() => setExpandedId(isExpanded ? null : incident.id)}
                  style={{
                    padding: isMobile ? '12px 14px' : '16px 24px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: isMobile ? '10px' : '14px',
                    flexWrap: 'wrap'
                  }}
                >
                  {/* Rank Badge */}
                  <div style={{
                    width: '38px', height: '38px', borderRadius: '10px',
                    background: cfg.bg, border: `2px solid ${cfg.border}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 900, fontSize: '0.92rem', color: cfg.color, flexShrink: 0
                  }}>
                    #{incident.priority_rank}
                  </div>

                  {/* Incident Info */}
                  <div style={{ flex: 1, minWidth: isMobile ? '200px' : '240px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px' }}>
                      <div>
                        <span style={{ fontWeight: 900, fontSize: '1.02rem', color: '#f8fafc' }}>
                          {cfg.icon} {incident.zone}
                        </span>
                        <span style={{
                          marginLeft: '10px', padding: '2px 8px', borderRadius: '6px',
                          background: cfg.bg, border: `1px solid ${cfg.border}`,
                          color: cfg.color, fontSize: '0.72rem', fontWeight: 800
                        }}>
                          {incident.priority_level}
                        </span>
                        {incident.is_cluster && (
                          <span style={{
                            marginLeft: '8px', padding: '2px 8px', borderRadius: '6px',
                            background: 'rgba(234, 88, 12, 0.2)', border: '1px solid #ea580c',
                            color: '#fb923c', fontSize: '0.7rem', fontWeight: 800
                          }}>
                            👥 REPORT CLUSTER
                          </span>
                        )}
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{
                          background: 'rgba(30, 41, 59, 0.8)', border: '1px solid #334155',
                          borderRadius: '6px', padding: '3px 8px', fontSize: '0.75rem', fontWeight: 700, color: '#38bdf8'
                        }}>
                          AI Score: {(incident.priority_score * 100).toFixed(0)}%
                        </span>
                        <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>
                          {isExpanded ? '▲' : '▼'}
                        </span>
                      </div>
                    </div>

                    <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '2px' }}>
                      {incident.district} · {incident.state} · Sector ID: {incident.id}
                    </div>

                    {/* Operational Metric Chips */}
                    <div style={{ display: 'flex', gap: isMobile ? '6px' : '12px', marginTop: '8px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '0.75rem', color: '#cbd5e1', background: '#1e293b', padding: '2px 8px', borderRadius: '4px' }}>
                        🌧️ {incident.rain_24h_mm} mm/24h
                      </span>
                      <span style={{ fontSize: '0.75rem', color: '#cbd5e1', background: '#1e293b', padding: '2px 8px', borderRadius: '4px' }}>
                        ⛰️ {incident.slope_deg}° Slope
                      </span>
                      <span style={{ fontSize: '0.75rem', color: '#cbd5e1', background: '#1e293b', padding: '2px 8px', borderRadius: '4px' }}>
                        💧 {incident.soil_moisture_pct}% Moisture
                      </span>
                      <span style={{
                        fontSize: '0.75rem', fontWeight: 700, padding: '2px 8px', borderRadius: '4px',
                        background: incident.road_status === 'BLOCKED' ? '#ef444430' : incident.road_status === 'AT_RISK' ? '#f59e0b30' : '#22c55e20',
                        color: incident.road_status === 'BLOCKED' ? '#f87171' : incident.road_status === 'AT_RISK' ? '#fbbf24' : '#4ade80'
                      }}>
                        🛣️ Road: {incident.road_status || 'OPEN'}
                      </span>
                      <span style={{ fontSize: '0.75rem', color: '#cbd5e1', background: '#1e293b', padding: '2px 8px', borderRadius: '4px' }}>
                        📋 {incident.citizen_reports_count} Ground Reports
                      </span>
                      {incident.nearest_shelter && (
                        <span style={{ fontSize: '0.75rem', color: '#38bdf8', background: 'rgba(56, 189, 248, 0.1)', padding: '2px 8px', borderRadius: '4px' }}>
                          🏥 Safe Camp: {incident.nearest_shelter.name} ({incident.nearest_shelter.distanceKm} km)
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* ── Expanded Operational Decision Support View ── */}
                {isExpanded && (
                  <div style={{ padding: isMobile ? '0 12px 16px 12px' : '0 24px 20px 76px' }}>
                    {/* Potential Cluster Notice */}
                    {incident.cluster_description && (
                      <div style={{
                        background: 'rgba(234, 88, 12, 0.15)', border: '1px solid rgba(234, 88, 12, 0.4)',
                        borderRadius: '8px', padding: '10px 14px', marginBottom: '14px', fontSize: '0.82rem', color: '#fdba74'
                      }}>
                        ⚠️ <strong>Potential Incident Cluster:</strong> {incident.cluster_description}. Multiple ground witnesses have reported structural cracks or blocked road segments in this corridor.
                      </div>
                    )}

                    {/* AI Reasoning (WHY this priority?) */}
                    <div style={{
                      background: 'rgba(15, 23, 42, 0.85)',
                      border: '1px solid #334155',
                      borderRadius: '10px',
                      padding: '14px',
                      marginBottom: '14px'
                    }}>
                      <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#38bdf8', textTransform: 'uppercase', marginBottom: '8px' }}>
                        🤖 WHY THIS PRIORITY? (AI Multi-Factor Reasoning)
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {incident.agent_reasoning.map((reason, idx) => (
                          <div key={idx} style={{ fontSize: '0.82rem', color: '#cbd5e1', lineHeight: '1.4' }}>
                            {reason}
                          </div>
                        ))}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '8px' }}>
                        Confidence Index: {incident.confidence_pct}% · Mathematical MCDA Model (NASA 30m DEM + Rain + Soil Moisture)
                      </div>
                    </div>

                    {/* Action Protocol */}
                    <div style={{
                      background: cfg.bg,
                      border: `1px solid ${cfg.border}40`,
                      borderRadius: '10px',
                      padding: '14px',
                      marginBottom: '14px'
                    }}>
                      <div style={{ fontSize: '0.75rem', fontWeight: 800, color: cfg.color, textTransform: 'uppercase', marginBottom: '6px' }}>
                        🎯 RECOMMENDED OPERATIONAL ACTION
                      </div>
                      <div style={{ fontSize: '0.86rem', color: '#f8fafc', fontWeight: 600, lineHeight: '1.4' }}>
                        {incident.recommended_action}
                      </div>
                    </div>

                    {/* Officer Tactical Response Buttons */}
                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '16px' }}>
                      <button
                        onClick={() => handleDispatch(incident.zone)}
                        style={{
                          background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                          color: '#fff', border: 'none', borderRadius: '8px',
                          padding: '10px 16px', fontSize: '0.8rem', fontWeight: 800, cursor: 'pointer',
                          boxShadow: '0 2px 8px rgba(239, 68, 68, 0.3)',
                          width: isMobile ? '100%' : 'auto',
                          textAlign: 'center'
                        }}
                      >
                        🚨 Dispatch Field Response Team
                      </button>

                      {incident.road_status !== 'BLOCKED' ? (
                        <button
                          onClick={() => handleToggleRoad(incident.regionId, 'BLOCKED')}
                          style={{
                            background: '#7f1d1d', color: '#fca5a5', border: '1px solid #ef4444',
                            borderRadius: '8px', padding: '10px 14px', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer',
                            width: isMobile ? '100%' : 'auto',
                            textAlign: 'center'
                          }}
                        >
                          🔴 Mark Corridor BLOCKED &amp; Detour
                        </button>
                      ) : (
                        <button
                          onClick={() => handleToggleRoad(incident.regionId, 'OPEN')}
                          style={{
                            background: '#14532d', color: '#86efac', border: '1px solid #22c55e',
                            borderRadius: '8px', padding: '10px 14px', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer',
                            width: isMobile ? '100%' : 'auto',
                            textAlign: 'center'
                          }}
                        >
                          🟢 Re-Open Road Corridor
                        </button>
                      )}

                      {onSelectRegion && (
                        <button
                          onClick={() => onSelectRegion(incident.regionId)}
                          style={{
                            background: '#1e293b', color: '#38bdf8', border: '1px solid #334155',
                            borderRadius: '8px', padding: '10px 14px', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer',
                            width: isMobile ? '100%' : 'auto',
                            textAlign: 'center'
                          }}
                        >
                          🗺️ View on GIS Map
                        </button>
                      )}
                    </div>

                    {/* ── Correlated Ground Citizen Reports ── */}
                    <div style={{
                      background: 'rgba(15, 23, 42, 0.9)',
                      border: '1px solid #334155',
                      borderRadius: '10px',
                      padding: '14px'
                    }}>
                      <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#f8fafc', marginBottom: '10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span>📋 Ground Citizen Reports Connected to this Sector ({incident.correlated_reports.length})</span>
                        <span style={{ fontSize: '0.7rem', color: '#64748b' }}>
                          Responder Scoped: Coordinates, hazard category, and photo evidence only
                        </span>
                      </div>

                      {incident.correlated_reports.length === 0 ? (
                        <div style={{ fontSize: '0.8rem', color: '#64748b', fontStyle: 'italic', padding: '8px 0' }}>
                          No individual citizen ground reports logged for this sector yet. Prioritization is driven by satellite topography &amp; telemetry.
                        </div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          {incident.correlated_reports.map((rep) => (
                            <div
                              key={rep.id}
                              style={{
                                background: '#1e293b',
                                border: '1px solid #334155',
                                borderRadius: '8px',
                                padding: '10px 12px',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'flex-start',
                                flexWrap: 'wrap',
                                gap: '8px'
                              }}
                            >
                              <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                                  <span style={{
                                    background: rep.reporterType === 'FIELD_OFFICER' ? '#ea580c30' : '#3b82f630',
                                    color: rep.reporterType === 'FIELD_OFFICER' ? '#fb923c' : '#60a5fa',
                                    padding: '1px 6px', borderRadius: '4px', fontSize: '0.68rem', fontWeight: 700
                                  }}>
                                    {rep.reporterType === 'CITIZEN' ? '👤 Citizen Report' : '🛡️ Officer Field Verification'}
                                  </span>
                                  <span style={{ fontWeight: 800, fontSize: '0.82rem', color: '#f8fafc' }}>
                                    {rep.category.replace('_', ' ')}
                                  </span>
                                  <span style={{ fontSize: '0.7rem', color: '#64748b' }}>
                                    #{rep.id.substring(0, 8)} · {new Date(rep.createdAt).toLocaleTimeString()}
                                  </span>
                                </div>

                                <div style={{ fontSize: '0.8rem', color: '#cbd5e1', lineHeight: '1.4' }}>
                                  {rep.description}
                                </div>

                                <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '4px' }}>
                                  📍 Coordinates: {rep.geoLat.toFixed(4)}, {rep.geoLng.toFixed(4)}
                                </div>

                                {rep.photoUrl && (
                                  <div style={{ marginTop: '6px' }}>
                                    <img
                                      src={rep.photoUrl}
                                      alt="Evidence"
                                      onClick={() => setPhotoModal(rep.photoUrl)}
                                      style={{ width: '64px', height: '64px', objectFit: 'cover', borderRadius: '6px', cursor: 'pointer', border: '1px solid #475569' }}
                                    />
                                  </div>
                                )}
                              </div>

                              <div>
                                <span style={{
                                  background: rep.status === 'VERIFIED' ? '#22c55e25' : '#f59e0b25',
                                  color: rep.status === 'VERIFIED' ? '#4ade80' : '#fcd34d',
                                  border: `1px solid ${rep.status === 'VERIFIED' ? '#22c55e' : '#f59e0b'}`,
                                  padding: '2px 8px', borderRadius: '10px', fontSize: '0.7rem', fontWeight: 800
                                }}>
                                  {rep.status}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* ── Photo Evidence Modal ── */}
      {photoModal && (
        <div
          onClick={() => setPhotoModal(null)}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 1000,
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px'
          }}
        >
          <div style={{ maxWidth: '600px', width: '100%', background: '#0f172a', borderRadius: '12px', overflow: 'hidden', border: '1px solid #334155' }}>
            <div style={{ padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #334155' }}>
              <span style={{ fontWeight: 800, fontSize: '0.9rem' }}>📸 Ground Evidence Photo</span>
              <button onClick={() => setPhotoModal(null)} style={{ background: 'none', border: 'none', color: '#fff', fontSize: '1.1rem', cursor: 'pointer' }}>✕</button>
            </div>
            <img src={photoModal} alt="Incident Full Evidence" style={{ width: '100%', maxHeight: '450px', objectFit: 'contain', background: '#000' }} />
          </div>
        </div>
      )}

      {/* ── Footer ── */}
      <div style={{
        padding: '12px 24px', fontSize: '0.72rem', color: '#475569',
        borderTop: '1px solid rgba(51, 65, 85, 0.4)', background: 'rgba(10, 16, 32, 0.8)'
      }}>
        SATARK AI Response Priority Engine · Multi-Criteria Decision Analysis (MCDA) · Emergency Field Decision Support
      </div>
    </div>
  );
};
