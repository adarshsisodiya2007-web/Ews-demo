import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Severity } from '../../types';

interface Props {
  districts: string[];
  selectedDistrict: string;
  onDistrictChange: (d: string) => void;
  severityFilter: Severity | 'ALL';
  onSeverityChange: (s: Severity | 'ALL') => void;
  alertCount: number;
  lang: string;
  onLangToggle: () => void;
}

export const TopBar: React.FC<Props> = ({
  districts, selectedDistrict, onDistrictChange,
  severityFilter, onSeverityChange,
  alertCount, lang, onLangToggle
}) => {
  const navigate = useNavigate();
  const [time, setTime] = useState(new Date());
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('ews_token');
    localStorage.removeItem('ews_role');
    localStorage.removeItem('ews_user');
    navigate('/login');
  };

  return (
    <>
      <div className="topbar-container" style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: '52px',
        padding: '0 12px',
        background: 'var(--color-base-900, #0f172a)',
        borderBottom: '1px solid var(--color-base-600, #1e293b)',
        position: 'relative',
        zIndex: 100,
        boxSizing: 'border-box'
      }}>
        {/* Brand / Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flexShrink: 0 }}>
          <h1 style={{ fontSize: '1.15rem', margin: 0, fontWeight: 800, letterSpacing: '-0.02em', color: '#f8fafc' }}>
            EWS · NER
          </h1>
          <span className="topbar-desktop-only" style={{ color: 'var(--color-base-200, #94a3b8)', fontSize: '0.85rem' }}>
            Landslide Risk Monitor
          </span>
        </div>

        {/* Desktop Filter Controls (hidden on mobile) */}
        <div className="topbar-desktop-only" style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <select
            value={selectedDistrict}
            onChange={e => onDistrictChange(e.target.value)}
            style={{
              padding: '4px 8px',
              background: 'var(--color-base-800, #1e293b)',
              color: 'var(--color-base-100, #f8fafc)',
              border: '1px solid var(--color-base-600, #334155)',
              borderRadius: '4px',
              fontSize: '0.82rem'
            }}
          >
            <option value="ALL">All Districts</option>
            {districts.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
          
          <div style={{ display: 'flex', gap: '6px' }}>
            {(['ALL', 'MODERATE', 'HIGH', 'CRITICAL'] as const).map(s => (
              <button key={s} onClick={() => onSeverityChange(s)} style={{
                padding: '4px 8px', borderRadius: '4px', cursor: 'pointer',
                background: severityFilter === s ? (s === 'ALL' ? '#334155' : `var(--color-risk-${s.toLowerCase()})`) : 'transparent',
                border: severityFilter === s ? 'none' : '1px solid #334155',
                color: severityFilter === s ? '#fff' : '#94a3b8',
                fontSize: '0.75rem',
                fontWeight: 600
              }}>
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Desktop Actions (hidden on mobile) */}
        <div className="topbar-desktop-only" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <a
            href="/responder"
            style={{
              textDecoration: 'none',
              background: 'rgba(234, 88, 12, 0.2)',
              border: '1px solid #ea580c',
              color: '#fb923c',
              padding: '5px 12px',
              borderRadius: '6px',
              fontSize: '0.8rem',
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            🛡️ Responder Mode
          </a>
          <a
            href="/citizen"
            style={{
              textDecoration: 'none',
              background: 'rgba(56, 189, 248, 0.15)',
              border: '1px solid #38bdf8',
              color: '#38bdf8',
              padding: '5px 12px',
              borderRadius: '6px',
              fontSize: '0.8rem',
              fontWeight: 700
            }}
          >
            👤 Citizen
          </a>
          <button onClick={onLangToggle} style={{ background: 'none', border: 'none', color: '#cbd5e1', cursor: 'pointer', fontSize: '0.8rem' }}>
            🌐 {lang.toUpperCase()}
          </button>
          <div style={{ position: 'relative', cursor: 'pointer' }}>
            🔔
            {alertCount > 0 && (
              <span style={{ position: 'absolute', top: -5, right: -5, background: '#ef4444', color: '#fff', fontSize: '10px', padding: '2px 4px', borderRadius: '8px' }}>
                {alertCount}
              </span>
            )}
          </div>
          <span className="mono" style={{ fontSize: '0.78rem', color: '#64748b' }}>{time.toLocaleTimeString()}</span>
          <button
            onClick={handleLogout}
            style={{
              background: '#7f1d1d30',
              border: '1px solid #991b1b',
              color: '#fca5a5',
              padding: '4px 8px',
              borderRadius: '4px',
              fontSize: '0.75rem',
              cursor: 'pointer'
            }}
          >
            Logout
          </button>
        </div>

        {/* Mobile Header Actions (visible only on mobile) */}
        <div className="topbar-mobile-only" style={{ display: 'none', alignItems: 'center', gap: '8px' }}>
          {/* Direct Always-Visible Mobile Responder Button */}
          <a
            href="/responder"
            style={{
              textDecoration: 'none',
              background: '#ea580c',
              border: 'none',
              color: '#ffffff',
              padding: '6px 10px',
              borderRadius: '6px',
              fontSize: '0.76rem',
              fontWeight: 800,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              boxShadow: '0 2px 8px rgba(234, 88, 12, 0.4)'
            }}
          >
            🛡️ Responder
          </a>

          {/* Hamburger Menu Toggle Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle Navigation Menu"
            style={{
              background: mobileMenuOpen ? '#334155' : 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.15)',
              color: '#f8fafc',
              borderRadius: '6px',
              padding: '6px 10px',
              fontSize: '1rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            {mobileMenuOpen ? '✕' : '☰'}
          </button>
        </div>
      </div>

      {/* Mobile Slide-down Navigation Drawer */}
      {mobileMenuOpen && (
        <div
          style={{
            position: 'fixed',
            top: '52px',
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(7, 11, 20, 0.96)',
            backdropFilter: 'blur(10px)',
            zIndex: 9999,
            overflowY: 'auto',
            padding: '16px',
            boxSizing: 'border-box',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}
        >
          {/* Quick Navigation Cards */}
          <div>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '0.05em' }}>
              Select Operational Mode
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <a
                href="/responder"
                onClick={() => setMobileMenuOpen(false)}
                style={{
                  textDecoration: 'none',
                  background: 'linear-gradient(135deg, #c2410c, #ea580c)',
                  border: '1px solid #ea580c',
                  color: '#ffffff',
                  borderRadius: '10px',
                  padding: '14px 12px',
                  textAlign: 'center',
                  fontWeight: 800,
                  fontSize: '0.88rem',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: '0 4px 12px rgba(234, 88, 12, 0.35)'
                }}
              >
                <span style={{ fontSize: '1.5rem' }}>🛡️</span>
                <span>Responder Mode</span>
              </a>

              <a
                href="/citizen"
                onClick={() => setMobileMenuOpen(false)}
                style={{
                  textDecoration: 'none',
                  background: 'rgba(56, 189, 248, 0.12)',
                  border: '1px solid rgba(56, 189, 248, 0.4)',
                  color: '#38bdf8',
                  borderRadius: '10px',
                  padding: '14px 12px',
                  textAlign: 'center',
                  fontWeight: 800,
                  fontSize: '0.88rem',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <span style={{ fontSize: '1.5rem' }}>👤</span>
                <span>Citizen Portal</span>
              </a>
            </div>
          </div>

          {/* Secondary Links */}
          <div style={{ display: 'flex', gap: '8px' }}>
            <a
              href="/sih-dashboard"
              onClick={() => setMobileMenuOpen(false)}
              style={{
                flex: 1,
                textDecoration: 'none',
                background: '#1e293b',
                border: '1px solid #334155',
                color: '#cbd5e1',
                padding: '10px',
                borderRadius: '8px',
                textAlign: 'center',
                fontSize: '0.8rem',
                fontWeight: 700
              }}
            >
              🗺️ 3D GIS Command Map
            </a>
            <a
              href="/dashboard"
              onClick={() => setMobileMenuOpen(false)}
              style={{
                flex: 1,
                textDecoration: 'none',
                background: '#1e293b',
                border: '1px solid #334155',
                color: '#cbd5e1',
                padding: '10px',
                borderRadius: '8px',
                textAlign: 'center',
                fontSize: '0.8rem',
                fontWeight: 700
              }}
            >
              📊 HQ Overview
            </a>
          </div>

          {/* District Filter Selector */}
          <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '10px', padding: '12px' }}>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', marginBottom: '6px' }}>
              Filter By District
            </label>
            <select
              value={selectedDistrict}
              onChange={e => {
                onDistrictChange(e.target.value);
                setMobileMenuOpen(false);
              }}
              style={{
                width: '100%',
                padding: '10px',
                background: '#1e293b',
                color: '#f8fafc',
                border: '1px solid #334155',
                borderRadius: '6px',
                fontSize: '0.88rem'
              }}
            >
              <option value="ALL">All Districts ({districts.length - 1} monitored)</option>
              {districts.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>

          {/* Severity Filters */}
          <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '10px', padding: '12px' }}>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', marginBottom: '8px' }}>
              Filter By Risk Level
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
              {(['ALL', 'MODERATE', 'HIGH', 'CRITICAL'] as const).map(s => (
                <button
                  key={s}
                  onClick={() => {
                    onSeverityChange(s);
                    setMobileMenuOpen(false);
                  }}
                  style={{
                    padding: '8px 4px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    background: severityFilter === s ? (s === 'ALL' ? '#334155' : `var(--color-risk-${s.toLowerCase()})`) : '#1e293b',
                    border: severityFilter === s ? 'none' : '1px solid #334155',
                    color: severityFilter === s ? '#fff' : '#94a3b8',
                    fontSize: '0.72rem',
                    fontWeight: 700
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Settings & Logout */}
          <div style={{ display: 'flex', gap: '10px', marginTop: 'auto' }}>
            <button
              onClick={onLangToggle}
              style={{
                flex: 1,
                padding: '10px',
                background: '#1e293b',
                border: '1px solid #334155',
                color: '#f8fafc',
                borderRadius: '8px',
                fontSize: '0.82rem',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              🌐 Language: {lang.toUpperCase()}
            </button>
            <button
              onClick={handleLogout}
              style={{
                flex: 1,
                padding: '10px',
                background: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid rgba(239, 68, 68, 0.4)',
                color: '#fca5a5',
                borderRadius: '8px',
                fontSize: '0.82rem',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              🚪 Sign Out
            </button>
          </div>
        </div>
      )}

      {/* Embedded CSS for clean breakpoint handling */}
      <style>{`
        @media (max-width: 880px) {
          .topbar-desktop-only {
            display: none !important;
          }
          .topbar-mobile-only {
            display: flex !important;
          }
        }
        @media (min-width: 881px) {
          .topbar-desktop-only {
            display: flex !important;
          }
          .topbar-mobile-only {
            display: none !important;
          }
        }
      `}</style>
    </>
  );
};
