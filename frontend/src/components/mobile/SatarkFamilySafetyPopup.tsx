/**
 * SATARK Family Safety Status Popup
 * Inspired by Screenshot 2 & 3:
 * - Rendered as a true MODAL OVERLAY using ReactDOM.createPortal directly to document.body
 * - Clean, friendly, safety-focused mobile-first design with pure inline styles
 * - Hello ☀️ header with cursive lettering, decorative heart ♡, and small clean top-right ✕ button
 * - Circular progress gauge for Family Safety Score (87/100, Mostly Safe / Safe)
 * - Dynamic list of all saved family members with avatars, locations, status badges, and circular score rings
 * - Advisory / Critical banner when a member is at risk
 * - Interactive Demo scenario toggles (All Safe | Moderate Risk | Critical) for SIH judging
 * 
 * SIH 2026 EWS-NER
 */
import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import {
  FamilyMember,
  FamilyDemoScenario,
  getFamilyMembers,
  getFamilyDemoScenario,
  setFamilyDemoScenario,
  getFamilySafetyOverview
} from '../../services/familySafetyService';

export interface SatarkFamilySafetyPopupProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenProfileFamily?: () => void;
}

export const SatarkFamilySafetyPopup: React.FC<SatarkFamilySafetyPopupProps> = ({
  isOpen,
  onClose,
  onOpenProfileFamily
}) => {
  const [members, setMembers] = useState<FamilyMember[]>(() => getFamilyMembers());
  const [scenario, setScenario] = useState<FamilyDemoScenario>(() => getFamilyDemoScenario());

  // Listen for family updates
  useEffect(() => {
    const handleUpdate = () => {
      setMembers(getFamilyMembers());
      setScenario(getFamilyDemoScenario());
    };
    window.addEventListener('satark-family-updated', handleUpdate);
    window.addEventListener('satark-family-scenario-change', handleUpdate);
    return () => {
      window.removeEventListener('satark-family-updated', handleUpdate);
      window.removeEventListener('satark-family-scenario-change', handleUpdate);
    };
  }, []);

  if (!isOpen) return null;
  if (typeof document === 'undefined') return null;

  const overview = getFamilySafetyOverview(members, scenario);

  const handleScenarioChange = (newScen: FamilyDemoScenario) => {
    setScenario(newScen);
    setFamilyDemoScenario(newScen);
  };

  // SVG Gauge calculations
  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  const progressOffset = circumference - (overview.overallScore / 100) * circumference;

  const getScoreColor = (score: number) => {
    if (score >= 80) return '#10b981'; // Green
    if (score >= 50) return '#f59e0b'; // Amber
    return '#ef4444'; // Red
  };

  const getScoreBg = (score: number) => {
    if (score >= 80) return '#d1fae5';
    if (score >= 50) return '#fef3c7';
    return '#fee2e2';
  };

  return ReactDOM.createPortal(
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100vw',
        height: '100vh',
        backgroundColor: 'rgba(0, 0, 0, 0.68)',
        backdropFilter: 'blur(5px)',
        WebkitBackdropFilter: 'blur(5px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 999980,
        padding: '16px',
        boxSizing: 'border-box',
        touchAction: 'none'
      }}
    >
      <div
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: '360px',
          maxHeight: '90vh',
          backgroundColor: '#ffffff',
          borderRadius: '28px',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.1)',
          boxSizing: 'border-box',
          fontFamily: 'Inter, system-ui, -apple-system, sans-serif'
        }}
      >
        {/* ── 1. Illustrated Header with Sun, Cursive Hello & Close X ── */}
        <div
          style={{
            position: 'relative',
            background: 'linear-gradient(180deg, #ecfdf5 0%, #e0f2fe 100%)',
            padding: '20px 20px 14px 20px',
            borderBottom: '1px solid rgba(226, 232, 240, 0.7)',
            overflow: 'hidden'
          }}
        >
          {/* Decorative Vector Hills & Cottage Backdrop matching Screenshot 2 */}
          <svg
            style={{
              position: 'absolute',
              right: '-10px',
              bottom: 0,
              width: '190px',
              height: '65px',
              opacity: 0.55,
              pointerEvents: 'none'
            }}
            viewBox="0 0 200 70"
            fill="none"
          >
            <path d="M0 70C30 50 60 45 100 55C140 65 170 50 200 70Z" fill="#86efac" />
            <path d="M40 70C70 40 110 35 150 48C175 56 190 62 200 70Z" fill="#93c5fd" />
            <path d="M120 70C140 30 170 25 200 45V70Z" fill="#6ee7b7" />
            {/* Small Cottage */}
            <rect x="155" y="44" width="16" height="12" fill="#ffffff" rx="1" />
            <polygon points="153,44 163,35 173,44" fill="#3b82f6" />
            <rect x="160" y="49" width="5" height="7" fill="#1e293b" />
          </svg>

          {/* Top Bar: Hello & Close Button */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              position: 'relative',
              zIndex: 2
            }}
          >
            {/* Sun Icon + Cursive Hello + Outline Heart */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '26px', lineHeight: 1 }}>☀️</span>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                <span
                  style={{
                    fontSize: '25px',
                    fontWeight: 800,
                    fontStyle: 'italic',
                    fontFamily: 'Georgia, serif, cursive',
                    color: '#0f172a',
                    letterSpacing: '-0.5px'
                  }}
                >
                  Hello
                </span>
                <span style={{ fontSize: '18px', color: '#0f172a', fontWeight: 300 }}>♡</span>
              </div>
            </div>

            {/* Small Clean X Close Button */}
            <button
              type="button"
              onClick={onClose}
              style={{
                width: '30px',
                height: '30px',
                borderRadius: '50%',
                backgroundColor: 'rgba(255, 255, 255, 0.92)',
                border: '1px solid rgba(203, 213, 225, 0.8)',
                color: '#475569',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '14px',
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: '0 2px 5px rgba(0,0,0,0.08)',
                outline: 'none',
                transition: 'transform 0.15s ease'
              }}
              title="Close Family Status"
              aria-label="Close"
            >
              ✕
            </button>
          </div>
        </div>

        {/* ── 2. Scrollable Body Content ── */}
        <div
          style={{
            padding: '16px 18px',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
            boxSizing: 'border-box'
          }}
        >
          {/* Family Safety Score Card (Matches Screenshot 2) */}
          <div
            style={{
              backgroundColor: '#f0fdf9',
              border: '1px solid #d1fae5',
              borderRadius: '20px',
              padding: '14px 16px',
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              boxShadow: '0 4px 12px rgba(16, 185, 129, 0.08)'
            }}
          >
            {/* Circular Gauge Ring */}
            <div style={{ position: 'relative', width: '84px', height: '84px', flexShrink: 0 }}>
              <svg width="84" height="84" viewBox="0 0 90 90" style={{ transform: 'rotate(-90deg)' }}>
                {/* Track */}
                <circle
                  cx="45"
                  cy="45"
                  r={radius}
                  stroke="#e2e8f0"
                  strokeWidth="7"
                  fill="transparent"
                />
                {/* Progress */}
                <circle
                  cx="45"
                  cy="45"
                  r={radius}
                  stroke={getScoreColor(overview.overallScore)}
                  strokeWidth="7"
                  strokeDasharray={circumference}
                  strokeDashoffset={progressOffset}
                  strokeLinecap="round"
                  fill="transparent"
                  style={{ transition: 'stroke-dashoffset 0.6s ease, stroke 0.3s ease' }}
                />
              </svg>
              {/* Score text in center */}
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  lineHeight: 1
                }}
              >
                <span
                  style={{
                    fontSize: '22px',
                    fontWeight: 900,
                    color: '#0f172a',
                    letterSpacing: '-0.5px'
                  }}
                >
                  {overview.overallScore}
                </span>
                <span style={{ fontSize: '10px', color: '#64748b', marginTop: '2px', fontWeight: 600 }}>
                  /100
                </span>
                <span style={{ fontSize: '11px', marginTop: '1px' }}>💚</span>
              </div>
            </div>

            {/* Score Meta */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
              <div style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a' }}>
                Family Safety Score
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    backgroundColor: getScoreBg(overview.overallScore),
                    color: getScoreColor(overview.overallScore),
                    fontSize: '11px',
                    fontWeight: 800,
                    padding: '2px 8px',
                    borderRadius: '10px'
                  }}
                >
                  {overview.overallScore >= 80 ? '✓' : '⚠️'} {overview.statusBadge}
                </span>
              </div>
              <p style={{ margin: '2px 0 0 0', fontSize: '11px', color: '#475569', lineHeight: 1.35 }}>
                {overview.message}
              </p>
            </div>
          </div>

          {/* Interactive SIH Demo Scenario Switcher Bar */}
          <div
            style={{
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              padding: '6px 10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '6px'
            }}
          >
            <span style={{ fontSize: '10.5px', fontWeight: 700, color: '#64748b' }}>
              DEMO:
            </span>
            <div style={{ display: 'flex', gap: '4px', flex: 1, justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => handleScenarioChange('SCENARIO_A_ALL_SAFE')}
                style={{
                  fontSize: '10px',
                  fontWeight: 700,
                  padding: '3px 7px',
                  borderRadius: '6px',
                  border: 'none',
                  cursor: 'pointer',
                  backgroundColor: scenario === 'SCENARIO_A_ALL_SAFE' ? '#10b981' : '#e2e8f0',
                  color: scenario === 'SCENARIO_A_ALL_SAFE' ? '#ffffff' : '#475569'
                }}
              >
                Safe (All)
              </button>
              <button
                type="button"
                onClick={() => handleScenarioChange('SCENARIO_B_ONE_RISK')}
                style={{
                  fontSize: '10px',
                  fontWeight: 700,
                  padding: '3px 7px',
                  borderRadius: '6px',
                  border: 'none',
                  cursor: 'pointer',
                  backgroundColor: scenario === 'SCENARIO_B_ONE_RISK' ? '#f59e0b' : '#e2e8f0',
                  color: scenario === 'SCENARIO_B_ONE_RISK' ? '#ffffff' : '#475569'
                }}
              >
                1 Moderate
              </button>
              <button
                type="button"
                onClick={() => handleScenarioChange('SCENARIO_C_CRITICAL')}
                style={{
                  fontSize: '10px',
                  fontWeight: 700,
                  padding: '3px 7px',
                  borderRadius: '6px',
                  border: 'none',
                  cursor: 'pointer',
                  backgroundColor: scenario === 'SCENARIO_C_CRITICAL' ? '#ef4444' : '#e2e8f0',
                  color: scenario === 'SCENARIO_C_CRITICAL' ? '#ffffff' : '#475569'
                }}
              >
                Critical
              </button>
            </div>
          </div>

          {/* ── 3. Your Loved Ones Section ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '14.5px', fontWeight: 800, color: '#0f172a' }}>
                Your Loved Ones ({members.length})
              </span>
              {onOpenProfileFamily && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenProfileFamily();
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#0284c7',
                    fontSize: '11.5px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    padding: '2px 4px'
                  }}
                >
                  Manage Profile →
                </button>
              )}
            </div>

            {/* List of Loved Ones Cards */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '200px', overflowY: 'auto' }}>
              {overview.memberStatuses.map(statusItem => {
                const { member, status, score, badgeText } = statusItem;
                const isSafe = status === 'SAFE';
                const isModerate = status === 'MODERATE';
                const isCrit = status === 'CRITICAL' || status === 'HIGH';

                const cardBg = isCrit ? '#fef2f2' : isModerate ? '#fffbeb' : '#f8fafc';
                const cardBorder = isCrit ? '#fecaca' : isModerate ? '#fef08a' : '#e2e8f0';

                return (
                  <div
                    key={member.id}
                    style={{
                      backgroundColor: cardBg,
                      border: `1px solid ${cardBorder}`,
                      borderRadius: '16px',
                      padding: '10px 12px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '10px',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
                    }}
                  >
                    {/* Left: Avatar + Name + City */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                      <div
                        style={{
                          width: '38px',
                          height: '38px',
                          borderRadius: '50%',
                          backgroundColor: isCrit ? '#fee2e2' : isModerate ? '#fef3c7' : '#e0f2fe',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '20px',
                          flexShrink: 0
                        }}
                      >
                        {member.avatar || '👤'}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                        <span
                          style={{
                            fontSize: '13.5px',
                            fontWeight: 800,
                            color: '#0f172a',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
                          }}
                        >
                          {member.name}
                        </span>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', marginTop: '1px' }}>
                          <span style={{ fontSize: '10.5px', color: '#64748b', fontWeight: 600 }}>
                            📍 {member.city}{member.area ? ` (${member.area})` : ''}
                          </span>
                          <span style={{ fontSize: '9px', color: member.isLiveLocation ? '#16a34a' : '#94a3b8', fontWeight: 500 }}>
                            {statusItem.locationAgeText}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Right: Status Pill & Circular Score Ring */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                      <span
                        style={{
                          fontSize: '10.5px',
                          fontWeight: 700,
                          padding: '3px 8px',
                          borderRadius: '10px',
                          backgroundColor: isCrit ? '#fee2e2' : isModerate ? '#fef3c7' : '#dcfce7',
                          color: isCrit ? '#b91c1c' : isModerate ? '#b45309' : '#15803d',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '3px'
                        }}
                      >
                        {isCrit ? '🚨' : isModerate ? '⚠️' : '✓'} {badgeText}
                      </span>

                      {/* Small circular score badge */}
                      <div
                        style={{
                          width: '28px',
                          height: '28px',
                          borderRadius: '50%',
                          border: `2px solid ${getScoreColor(score)}`,
                          backgroundColor: '#ffffff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '11px',
                          fontWeight: 900,
                          color: getScoreColor(score)
                        }}
                      >
                        {score}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── 4. Advisory / Warning Banner if a loved one is at risk ── */}
          {overview.criticalMember && overview.criticalMember.status !== 'SAFE' && (
            <div
              style={{
                backgroundColor: overview.criticalMember.status === 'CRITICAL' ? '#fee2e2' : '#fef3c7',
                border: `1.5px solid ${overview.criticalMember.status === 'CRITICAL' ? '#f87171' : '#fbbf24'}`,
                borderRadius: '14px',
                padding: '10px 12px',
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
                animation: 'fadeIn 0.3s ease'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                <span style={{ fontSize: '14px' }}>
                  {overview.criticalMember.status === 'CRITICAL' ? '🚨' : '⚠️'}
                </span>
                <span
                  style={{
                    fontSize: '12px',
                    fontWeight: 800,
                    color: overview.criticalMember.status === 'CRITICAL' ? '#991b1b' : '#92400e'
                  }}
                >
                  {overview.criticalMember.alertNote}
                </span>
              </div>
              {overview.criticalMember.affectedArea && (
                <div style={{ fontSize: '11px', color: '#4b5563', fontWeight: 600 }}>
                  Affected Area: <strong>{overview.criticalMember.affectedArea}</strong>
                </div>
              )}
              {overview.criticalMember.requiredAction && (
                <div style={{ fontSize: '10.5px', color: '#1f2937', fontWeight: 500 }}>
                  Action: {overview.criticalMember.requiredAction}
                </div>
              )}
            </div>
          )}

          {/* Subtle Bottom Message */}
          <div
            style={{
              textAlign: 'center',
              fontSize: '11.5px',
              color: '#15803d',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              fontStyle: 'italic',
              paddingTop: '2px'
            }}
          >
            <span>🌱</span>
            <span>All clear? Great. Stay prepared.</span>
          </div>
        </div>

        {/* ── 5. Bottom Action Button ── */}
        <div style={{ padding: '0 18px 18px 18px' }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              width: '100%',
              height: '44px',
              backgroundColor: '#0284c7',
              color: '#ffffff',
              fontSize: '14px',
              fontWeight: 800,
              borderRadius: '14px',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              boxShadow: '0 4px 12px rgba(2, 132, 199, 0.35)',
              outline: 'none'
            }}
          >
            <span>✓</span>
            <span>Understood, Keep Monitoring</span>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
