import React from 'react';
import { useNavigate } from 'react-router-dom';
import { logoutCitizen, isCitizenAuthenticated } from '../services/citizenAuthService';

export const PrivacyDataPage: React.FC = () => {
  const navigate = useNavigate();
  const isAuthenticated = isCitizenAuthenticated();

  const handleLogout = async () => {
    await logoutCitizen();
    navigate('/login');
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: "linear-gradient(180deg, rgba(7, 11, 20, 0.85) 0%, rgba(10, 16, 32, 0.94) 100%), url('/landslide_bg.jpg') center/cover fixed no-repeat",
        color: '#f8fafc',
        fontFamily: 'Inter, system-ui, sans-serif',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* ── Top Header ── */}
      <header
        style={{
          background: 'rgba(15, 23, 42, 0.88)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid rgba(51, 65, 85, 0.5)',
          padding: '12px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'sticky',
          top: 0,
          zIndex: 50,
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
              background: '#ffffff',
              padding: '2px',
              boxShadow: '0 2px 10px rgba(0,0,0,0.4)',
            }}
          />
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontWeight: 900, fontSize: '1.2rem', letterSpacing: '0.04em', color: '#f8fafc' }}>
                SATARK
              </span>
              <span
                style={{
                  background: 'rgba(56, 189, 248, 0.15)',
                  color: '#38bdf8',
                  border: '1px solid rgba(56, 189, 248, 0.35)',
                  borderRadius: '6px',
                  padding: '1px 8px',
                  fontSize: '0.72rem',
                  fontWeight: 800,
                }}
              >
                Privacy &amp; Data Protection
              </span>
            </div>
            <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '2px' }}>
              National Early Warning Network · Citizen Data Safeguards
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
              padding: '7px 14px',
              fontSize: '0.82rem',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            ← Back to Safety Portal
          </button>
          {isAuthenticated && (
            <button
              onClick={handleLogout}
              style={{
                background: 'rgba(239, 68, 68, 0.2)',
                color: '#f87171',
                border: '1px solid rgba(239, 68, 68, 0.4)',
                borderRadius: '8px',
                padding: '7px 14px',
                fontSize: '0.82rem',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Sign Out
            </button>
          )}
        </div>
      </header>

      {/* ── Content Container ── */}
      <main style={{ flex: 1, maxWidth: '850px', width: '100%', margin: '0 auto', padding: '32px 16px' }}>
        <div
          style={{
            background: 'rgba(15, 23, 42, 0.85)',
            backdropFilter: 'blur(16px)',
            borderRadius: '16px',
            border: '1px solid rgba(51, 65, 85, 0.5)',
            padding: '28px',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
            <span style={{ fontSize: '2rem' }}>🛡️</span>
            <div>
              <h1 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 900, color: '#f8fafc' }}>
                Citizen Safety &amp; Data Privacy Guarantee
              </h1>
              <p style={{ margin: '4px 0 0', fontSize: '0.82rem', color: '#94a3b8' }}>
                Built in alignment with NDMA disaster rescue principles and zero-knowledge privacy standards.
              </p>
            </div>
          </div>

          <hr style={{ borderColor: 'rgba(51, 65, 85, 0.4)', margin: '20px 0' }} />

          {/* Section 1 */}
          <div style={{ marginBottom: '24px' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#38bdf8', marginBottom: '8px' }}>
              1. What Information We Store &amp; Why
            </h3>
            <p style={{ fontSize: '0.88rem', lineHeight: '1.6', color: '#cbd5e1' }}>
              SATARK collects only the minimum information strictly necessary to ensure your safety during landslide emergencies and disaster evacuations:
            </p>
            <ul style={{ paddingLeft: '22px', fontSize: '0.85rem', lineHeight: '1.8', color: '#94a3b8' }}>
              <li>
                <strong style={{ color: '#f8fafc' }}>Full Name:</strong> Enables first responders and evacuation camp coordinators to identify and account for you during search-and-rescue operations.
              </li>
              <li>
                <strong style={{ color: '#f8fafc' }}>Phone Number:</strong> Used solely for secure OTP authentication and vital emergency alert delivery. Never used for marketing or commercial purposes.
              </li>
              <li>
                <strong style={{ color: '#f8fafc' }}>Preferred Language:</strong> Ensures life-critical early warning sirens and audio messages are spoken in your language (English, Hindi, Assamese).
              </li>
              <li>
                <strong style={{ color: '#f8fafc' }}>Optional Medical Info (Blood Group &amp; Accessibility Needs):</strong> Crucial for emergency paramedics if you trigger an "I Am Injured" or "I Am Trapped" beacon.
              </li>
              <li>
                <strong style={{ color: '#f8fafc' }}>Emergency Contact:</strong> Contacted by disaster response officers if you are reported trapped in a hazard corridor.
              </li>
              <li>
                <strong style={{ color: '#f8fafc' }}>Geo-Tagged Incident Reports:</strong> Links hazard reports (cracks, debris, road blockages) to your verified citizen account while always allowing anonymous reporting if preferred.
              </li>
            </ul>
          </div>

          {/* Section 2 */}
          <div
            style={{
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '12px',
              padding: '16px 20px',
              marginBottom: '24px',
            }}
          >
            <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#f87171', margin: '0 0 8px 0' }}>
              🚫 What We Strictly DO NOT Collect
            </h3>
            <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '0.85rem', lineHeight: '1.7', color: '#fca5a5' }}>
              <li>No Aadhaar numbers or government identification cards.</li>
              <li>No PAN cards or tax identifiers.</li>
              <li>No bank accounts, credit cards, or financial details.</li>
              <li>No passwords — Citizen authentication uses secure time-limited phone OTPs.</li>
              <li>No background tracking — GPS location is only queried when you explicitly view maps or trigger emergency reports.</li>
            </ul>
          </div>

          {/* Section 3 */}
          <div style={{ marginBottom: '24px' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#38bdf8', marginBottom: '8px' }}>
              2. Responder Privacy &amp; Access Controls
            </h3>
            <p style={{ fontSize: '0.88rem', lineHeight: '1.6', color: '#cbd5e1' }}>
              Disaster responders (NDRF, SDRF, Quick Response Teams) only have access to <em>active rescue beacons</em>. They can only view:
            </p>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '10px',
                marginTop: '10px',
              }}
            >
              <div style={{ background: 'rgba(30, 41, 59, 0.7)', padding: '10px 14px', borderRadius: '8px', fontSize: '0.8rem', color: '#e2e8f0' }}>
                ✅ Victim Name &amp; Beacon ID
              </div>
              <div style={{ background: 'rgba(30, 41, 59, 0.7)', padding: '10px 14px', borderRadius: '8px', fontSize: '0.8rem', color: '#e2e8f0' }}>
                ✅ GPS Coordinates &amp; Bearing
              </div>
              <div style={{ background: 'rgba(30, 41, 59, 0.7)', padding: '10px 14px', borderRadius: '8px', fontSize: '0.8rem', color: '#e2e8f0' }}>
                ✅ Critical Medical Urgency / Blood Group
              </div>
              <div style={{ background: 'rgba(30, 41, 59, 0.7)', padding: '10px 14px', borderRadius: '8px', fontSize: '0.8rem', color: '#e2e8f0' }}>
                ✅ Accessibility / Mobility Needs
              </div>
            </div>
            <p style={{ fontSize: '0.82rem', color: '#94a3b8', marginTop: '10px' }}>
              Responders cannot view your personal account history, authentication tokens, or any unrelated personal details.
            </p>
          </div>

          {/* Section 4 */}
          <div style={{ marginBottom: '28px' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#38bdf8', marginBottom: '8px' }}>
              3. Offline Data &amp; Your Right to Manage Your Profile
            </h3>
            <p style={{ fontSize: '0.88rem', lineHeight: '1.6', color: '#cbd5e1' }}>
              When operating without internet, SATARK caches your rescue profile inside your device's secure browser database (IndexedDB) so you can broadcast distress signals offline. When you sign out, this cached profile is cleared.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <button
              onClick={() => navigate('/profile')}
              style={{
                background: 'linear-gradient(135deg, #2563eb, #0284c7)',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                padding: '10px 20px',
                fontSize: '0.88rem',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              👤 Go to My Profile
            </button>
            <button
              onClick={() => navigate('/citizen')}
              style={{
                background: '#1e293b',
                color: '#94a3b8',
                border: '1px solid #334155',
                borderRadius: '8px',
                padding: '10px 20px',
                fontSize: '0.88rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Return to Citizen Portal
            </button>
          </div>
        </div>
      </main>

      <footer
        style={{
          textAlign: 'center',
          padding: '18px',
          borderTop: '1px solid rgba(51, 65, 85, 0.4)',
          fontSize: '0.75rem',
          color: '#64748b',
        }}
      >
        SATARK — National Early Warning Network · Data Privacy &amp; Security Compliance · 2026
      </footer>
    </div>
  );
};