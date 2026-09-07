import React, { useState, useEffect } from 'react';

interface Props {
  onComplete: () => void;
}

export const SatarkSplashScreen: React.FC<Props> = ({ onComplete }) => {
  const [phase, setPhase] = useState<'intro' | 'glow' | 'brand' | 'exit'>('intro');

  useEffect(() => {
    // 0.0 - 0.7s: intro (scaling/fading in)
    // 0.7 - 1.8s: glow & subtle pulse
    const tGlow = setTimeout(() => {
      setPhase('glow');
    }, 700);

    // 1.8 - 2.5s: brand reveal
    const tBrand = setTimeout(() => {
      setPhase('brand');
    }, 1800);

    // 2.5 - 3.0s: hold briefly and smooth fade exit
    const tExit = setTimeout(() => {
      setPhase('exit');
    }, 2500);

    // 3.0s: complete and unmount
    const tDone = setTimeout(() => {
      onComplete();
    }, 3000);

    return () => {
      clearTimeout(tGlow);
      clearTimeout(tBrand);
      clearTimeout(tExit);
      clearTimeout(tDone);
    };
  }, [onComplete]);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 999999,
        background: 'radial-gradient(circle at 50% 42%, #0d1a33 0%, #070d1a 65%, #03060c 100%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        overflow: 'hidden',
        userSelect: 'none',
        opacity: phase === 'exit' ? 0 : 1,
        transform: phase === 'exit' ? 'scale(1.03)' : 'scale(1)',
        transition: 'opacity 0.5s ease-out, transform 0.5s ease-out',
        pointerEvents: phase === 'exit' ? 'none' : 'auto',
      }}
    >
      <style>{`
        @keyframes satarkPulseGlow {
          0%, 100% {
            transform: scale(1);
            filter: drop-shadow(0 0 16px rgba(14, 165, 233, 0.45));
          }
          50% {
            transform: scale(1.025);
            filter: drop-shadow(0 0 28px rgba(249, 115, 22, 0.55));
          }
        }
        @keyframes satarkProgressFill {
          0% { width: 0%; }
          100% { width: 100%; }
        }
        @keyframes satarkShimmer {
          0% { opacity: 0.6; }
          50% { opacity: 1; }
          100% { opacity: 0.6; }
        }
      `}</style>

      {/* Ambient Radial Background Glow */}
      <div
        style={{
          position: 'absolute',
          width: '320px',
          height: '320px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(14, 165, 233, 0.18) 0%, rgba(249, 115, 22, 0.08) 50%, transparent 70%)',
          filter: 'blur(32px)',
          pointerEvents: 'none',
        }}
      />

      {/* Emblem Container */}
      <div
        style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '20px',
          transform: phase === 'intro' ? 'scale(0.82)' : 'scale(1)',
          opacity: phase === 'intro' ? 0.7 : 1,
          transition: 'transform 0.7s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.7s ease-out',
        }}
      >
        <img
          src="/satark_emblem.png"
          alt="SATARK"
          style={{
            width: '136px',
            height: '136px',
            objectFit: 'contain',
            animation: phase === 'glow' || phase === 'brand' ? 'satarkPulseGlow 2s ease-in-out infinite' : undefined,
            filter: 'drop-shadow(0 8px 24px rgba(0, 0, 0, 0.6))',
          }}
        />
      </div>

      {/* Brand Title: SATARK */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '6px',
          opacity: phase === 'intro' ? 0 : 1,
          transform: phase === 'intro' ? 'translateY(12px)' : 'translateY(0)',
          transition: 'opacity 0.6s ease-out, transform 0.6s ease-out',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span
            style={{
              fontSize: '2.1rem',
              fontWeight: 900,
              letterSpacing: '0.14em',
              color: '#f8fafc',
              textShadow: '0 2px 16px rgba(14, 165, 233, 0.35)',
              fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
            }}
          >
            SATARK
          </span>
        </div>

        {/* Tricolor Government Emergency Accent Bar */}
        <div
          style={{
            width: '64px',
            height: '3px',
            borderRadius: '2px',
            background: 'linear-gradient(90deg, #ff9933 0%, #ffffff 50%, #138808 100%)',
            boxShadow: '0 0 8px rgba(255, 255, 255, 0.4)',
            marginTop: '2px',
            marginBottom: '4px',
          }}
        />

        {/* Subtitle / Department Identifier */}
        <div
          style={{
            fontSize: '0.74rem',
            fontWeight: 700,
            letterSpacing: '0.08em',
            color: '#94a3b8',
            textAlign: 'center',
            textTransform: 'uppercase',
            maxWidth: '280px',
            lineHeight: 1.4,
            opacity: phase === 'brand' || phase === 'exit' ? 1 : 0.6,
            transition: 'opacity 0.5s ease-out',
          }}
        >
          AI Landslide Early Warning
          <div style={{ fontSize: '0.66rem', color: '#64748b', fontWeight: 600, marginTop: '2px' }}>
            Disaster Risk Management System
          </div>
        </div>
      </div>

      {/* Bottom Telemetry Status / Loading Track */}
      <div
        style={{
          position: 'absolute',
          bottom: '36px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '8px',
        }}
      >
        <div
          style={{
            fontSize: '0.62rem',
            fontWeight: 800,
            letterSpacing: '0.12em',
            color: '#38bdf8',
            textTransform: 'uppercase',
            animation: 'satarkShimmer 1.5s infinite',
          }}
        >
          INITIALIZING SECURE FIELD MESH…
        </div>

        {/* Micro Progress Track */}
        <div
          style={{
            width: '140px',
            height: '2px',
            background: 'rgba(51, 65, 85, 0.4)',
            borderRadius: '1px',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              height: '100%',
              background: 'linear-gradient(90deg, #0284c7, #38bdf8)',
              animation: 'satarkProgressFill 3s linear forwards',
            }}
          />
        </div>
      </div>
    </div>
  );
};
