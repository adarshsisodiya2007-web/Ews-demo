import React from 'react';
import { useNavigate } from 'react-router-dom';
import { OfflineRescueMode } from '../components/emergency/OfflineRescueMode';
import { OfflineStatusHeader } from '../components/layout/OfflineStatusHeader';

export const OfflineRescuePage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div
      style={{
        minHeight: '100vh',
        background: "linear-gradient(180deg, rgba(7, 11, 20, 0.75) 0%, rgba(10, 16, 32, 0.90) 100%), url('/landslide_bg.jpg') center/cover fixed no-repeat",
        color: '#f8fafc',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <OfflineStatusHeader />

      {/* Top Header */}
      <header
        style={{
          background: 'rgba(15, 23, 42, 0.88)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          borderBottom: '1px solid #1e293b',
          padding: '12px 20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <img
            src="/satark_logo.png"
            alt="SATARK Logo"
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              objectFit: 'contain',
              background: '#ffffff',
              padding: '2px',
              boxShadow: '0 2px 10px rgba(0, 0, 0, 0.4)',
            }}
          />
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontWeight: 900, fontSize: '1.2rem', letterSpacing: '0.04em', color: '#f8fafc' }}>
                SATARK
              </span>
              <span
                style={{
                  background: 'rgba(239, 68, 68, 0.15)',
                  color: '#f87171',
                  border: '1px solid rgba(239, 68, 68, 0.35)',
                  borderRadius: '6px',
                  padding: '1px 8px',
                  fontSize: '0.72rem',
                  fontWeight: 800,
                }}
              >
                Offline Rescue System
              </span>
            </div>
            <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '2px' }}>
              Zero-Internet Emergency Protocols, Safety Guidance &amp; Distress Beacons
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={() => navigate('/citizen')}
            style={{
              background: '#1e293b',
              color: '#38bdf8',
              border: '1px solid #334155',
              borderRadius: '8px',
              padding: '8px 14px',
              fontSize: '0.82rem',
              fontWeight: 800,
              cursor: 'pointer',
            }}
          >
            ← Citizen Portal
          </button>
          <button
            onClick={() => navigate('/responder')}
            style={{
              background: '#2563eb',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              padding: '8px 14px',
              fontSize: '0.82rem',
              fontWeight: 800,
              cursor: 'pointer',
            }}
          >
            🚑 Responder Mode
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main style={{ flex: 1, maxWidth: '1050px', width: '100%', margin: '0 auto', padding: '24px 16px' }}>
        <OfflineRescueMode />
      </main>

      {/* Footer */}
      <footer style={{ textAlign: 'center', padding: '16px', borderTop: '1px solid #1e293b', fontSize: '0.72rem', color: '#64748b' }}>
        SIH 2026 AI Early Warning System · NDMA SACHET · Offline Resilient PWA Architecture
      </footer>
    </div>
  );
};
