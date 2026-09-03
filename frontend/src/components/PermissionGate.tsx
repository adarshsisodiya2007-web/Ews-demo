/**
 * PermissionGate — First-visit modal requesting Notification + Location permissions
 * Explains clearly WHY permissions are needed for disaster safety
 * SIH 2026 EWS-NER
 */
import React, { useState } from 'react';

interface Props {
  onComplete: () => void;
}

export const PermissionGate: React.FC<Props> = ({ onComplete }) => {
  const [step, setStep] = useState<'intro' | 'requesting' | 'done'>('intro');
  const [results, setResults] = useState<{ notification: boolean; location: boolean } | null>(null);

  const handleAllow = async () => {
    setStep('requesting');

    let notifGranted = false;
    let locGranted = false;

    // 1. Request Notification
    try {
      if ('Notification' in window) {
        if (Notification.permission === 'granted') {
          notifGranted = true;
        } else {
          const res = await Promise.race([
            Notification.requestPermission(),
            new Promise<string>((r) => setTimeout(() => r('timeout'), 4000))
          ]);
          notifGranted = res === 'granted';
        }
      }
    } catch {
      notifGranted = false;
    }

    // 2. Request Geolocation
    try {
      if ('geolocation' in navigator) {
        locGranted = await new Promise<boolean>((resolve) => {
          const timer = setTimeout(() => resolve(false), 4000);
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              clearTimeout(timer);
              try {
                sessionStorage.setItem('ews_user_location', JSON.stringify({
                  lat: pos.coords.latitude,
                  lon: pos.coords.longitude,
                  accuracy: pos.coords.accuracy,
                  detectedZone: `GPS (${pos.coords.latitude.toFixed(2)}, ${pos.coords.longitude.toFixed(2)})`
                }));
              } catch {}
              resolve(true);
            },
            () => {
              clearTimeout(timer);
              resolve(false);
            },
            { timeout: 3500, enableHighAccuracy: false }
          );
        });
      }
    } catch {
      locGranted = false;
    }

    setResults({ notification: notifGranted, location: locGranted });
    setStep('done');
  };

  const handleSkip = () => {
    onComplete();
  };

  if (step === 'done' && results) {
    return (
      <div style={overlayStyle}>
        <div style={cardStyle}>
          <div style={{ fontSize: '2.5rem', textAlign: 'center', marginBottom: '12px' }}>
            {results.notification || results.location ? '✅' : '⚠️'}
          </div>
          <h2 style={headingStyle}>
            {results.notification || results.location ? "You're Protected" : "Setup Complete"}
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', margin: '18px 0' }}>
            <PermResult
              label="Emergency Notifications"
              granted={results.notification}
              description={results.notification ? 'Instant RED landslide alerts enabled' : 'Can be enabled anytime in browser settings'}
            />
            <PermResult
              label="Live GPS Location"
              granted={results.location}
              description={results.location ? 'Hyper-local hazard zone auto-detected' : 'Select your zone manually from the dropdown'}
            />
          </div>
          <button onClick={onComplete} style={primaryBtnStyle}>
            Continue to Safety Dashboard →
          </button>
        </div>
      </div>
    );
  }

  if (step === 'requesting') {
    return (
      <div style={overlayStyle}>
        <div style={cardStyle}>
          <div style={{ textAlign: 'center', marginBottom: '16px' }}>
            <div style={{ fontSize: '2.2rem', marginBottom: '8px' }}>🔔</div>
            <h2 style={{ ...headingStyle, fontSize: '1.2rem', marginBottom: '6px' }}>
              Browser Permission Popup
            </h2>
            <p style={{ color: '#94a3b8', fontSize: '0.85rem', lineHeight: '1.5', margin: 0 }}>
              Look at the <strong style={{ color: '#f8fafc' }}>top of your browser window</strong> — please click <strong style={{ color: '#4ade80' }}>"Allow"</strong> on the popups.
            </p>
          </div>

          <div style={{
            background: 'rgba(37,99,235,0.12)', border: '1px solid rgba(37,99,235,0.3)',
            borderRadius: '10px', padding: '12px 16px', marginBottom: '18px'
          }}>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', padding: '4px 0', fontSize: '0.82rem', color: '#93c5fd' }}>
              <span>🔔</span><span>Click <strong>Allow</strong> for Notifications</span>
            </div>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', padding: '4px 0', fontSize: '0.82rem', color: '#93c5fd' }}>
              <span>📍</span><span>Click <strong>Allow</strong> for Location</span>
            </div>
          </div>

          <div style={{ fontSize: '0.78rem', color: '#64748b', textAlign: 'center', marginBottom: '14px' }}>
            ⏳ Processing permissions…
          </div>

          <button onClick={onComplete} style={skipBtnStyle}>
            Skip → Continue to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // Intro step
  return (
    <div style={overlayStyle}>
      <div style={cardStyle}>
        <div style={{ textAlign: 'center', marginBottom: '18px' }}>
          <div style={{
            width: '56px', height: '56px', borderRadius: '50%',
            background: 'linear-gradient(135deg, #ef4444, #f97316)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '26px', margin: '0 auto 10px auto',
            boxShadow: '0 0 24px rgba(239,68,68,0.4)'
          }}>
            🛡️
          </div>
          <h2 style={headingStyle}>Enable Early Warning Alerts</h2>
          <p style={{ color: '#94a3b8', fontSize: '0.85rem', lineHeight: '1.5', margin: 0 }}>
            EWS-NER uses location &amp; alerts to protect you during landslide emergencies.
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
          <PermCard
            icon="🔔"
            title="Instant Push Notifications"
            why="Receive urgent RED warnings with evacuation action protocols."
            color="#ef4444"
          />
          <PermCard
            icon="📍"
            title="Hazard Zone Detection"
            why="Auto-detects closest monitored hills (Wayanad, Munnar, NER)."
            color="#3b82f6"
          />
        </div>

        <button onClick={handleAllow} style={primaryBtnStyle}>
          🔒 Allow Both — Keep Me Safe
        </button>
        <button onClick={handleSkip} style={skipBtnStyle}>
          Skip for now (manual selection)
        </button>

        <p style={{ fontSize: '0.68rem', color: '#475569', textAlign: 'center', marginTop: '10px', margin: '10px 0 0 0' }}>
          Emergency disaster safety system · NDMA CAP compliant
        </p>
      </div>
    </div>
  );
};

const PermCard: React.FC<{ icon: string; title: string; why: string; color: string }> = ({ icon, title, why, color }) => (
  <div style={{
    display: 'flex', gap: '12px', padding: '12px 14px',
    background: 'rgba(255,255,255,0.04)', border: `1px solid ${color}30`,
    borderRadius: '10px', borderLeft: `3px solid ${color}`
  }}>
    <div style={{ fontSize: '1.4rem', flexShrink: 0 }}>{icon}</div>
    <div>
      <div style={{ fontWeight: 700, color: '#f8fafc', fontSize: '0.85rem', marginBottom: '2px' }}>{title}</div>
      <div style={{ color: '#94a3b8', fontSize: '0.78rem', lineHeight: '1.4' }}>{why}</div>
    </div>
  </div>
);

const PermResult: React.FC<{ label: string; granted: boolean; description: string }> = ({ label, granted, description }) => (
  <div style={{
    display: 'flex', gap: '10px', padding: '10px 12px',
    background: granted ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
    border: `1px solid ${granted ? '#22c55e40' : '#ef444440'}`,
    borderRadius: '8px'
  }}>
    <div style={{ fontSize: '1.2rem' }}>{granted ? '✅' : '❌'}</div>
    <div>
      <div style={{ fontWeight: 700, color: '#f8fafc', fontSize: '0.82rem' }}>{label}</div>
      <div style={{ color: '#94a3b8', fontSize: '0.75rem' }}>{description}</div>
    </div>
  </div>
);

const overlayStyle: React.CSSProperties = {
  position: 'fixed', inset: 0, zIndex: 9999,
  background: 'rgba(0,0,0,0.85)',
  backdropFilter: 'blur(8px)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  padding: '16px',
};

const cardStyle: React.CSSProperties = {
  background: 'linear-gradient(145deg, #0f172a, #1e293b)',
  border: '1px solid rgba(255,255,255,0.12)',
  borderRadius: '18px',
  padding: '26px',
  maxWidth: '420px',
  width: '100%',
  boxShadow: '0 24px 64px rgba(0,0,0,0.6)',
};

const headingStyle: React.CSSProperties = {
  fontSize: '1.3rem', fontWeight: 900,
  color: '#f8fafc', margin: '0 0 6px 0',
  textAlign: 'center', letterSpacing: '-0.02em',
};

const primaryBtnStyle: React.CSSProperties = {
  width: '100%', padding: '13px',
  background: 'linear-gradient(135deg, #ef4444, #dc2626)',
  color: '#fff', border: 'none', borderRadius: '10px',
  fontSize: '0.95rem', fontWeight: 800, cursor: 'pointer',
  marginBottom: '8px',
  boxShadow: '0 4px 16px rgba(239,68,68,0.4)',
};

const skipBtnStyle: React.CSSProperties = {
  width: '100%', padding: '9px',
  background: 'transparent', color: '#64748b',
  border: '1px solid #1e293b', borderRadius: '8px',
  fontSize: '0.8rem', cursor: 'pointer',
};
