/**
 * SATARK Critical Landslide Warning Modal
 * Android-Only Critical Area Emergency Popup Overlay
 * 
 * Strict specifications matching Screenshot 2:
 * - Rendered as a true MODAL OVERLAY using ReactDOM.createPortal directly to document.body
 * - Fixed position with high z-index (999999), dark semi-transparent backdrop
 * - Pure inline styles to guarantee 100% reliable rendering without relying on external Tailwind
 * - Centered on mobile phone screen, compact mobile-alert size (max-width: 340px)
 * - Rounded corners (24px)
 * - Emergency crimson red header with stylized mountain icon, bold "LANDSLIDE WARNING", and dynamic area name
 * - Clean official key-value information table: Severity (CRITICAL/HIGH), Issued, Valid Until, Source
 * - Left-aligned soft red advisory message container
 * - NO "View on Map"
 * - NO "Safety Guide"
 * - NO sound/mute control in top-right header
 * - Bottom row with 2 controls:
 *     1. Stop Siren / Mute button
 *     2. YouTube-style play icon ONLY (red rounded button, white play triangle, NO text label)
 * - Full-width "✓ Understand, Close" primary action button
 * - Mobile portrait video player overlay specifically sized for Android phones with local offline video
 * 
 * SIH 2026 EWS-NER
 */
import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';

export interface SatarkCriticalLandslideWarningProps {
  isOpen: boolean;
  areaName: string;
  district?: string;
  state?: string;
  severity?: 'CRITICAL' | 'HIGH';
  riskScore?: number;
  issuedAt?: string;
  validUntil?: string;
  message?: string;
  isSirenPlaying: boolean;
  onMuteSound: () => void;
  isVoiceSpeaking?: boolean;
  onToggleVoiceSpeaking?: () => void;
  onClose: () => void;
  videoSrc?: string;
}

export const SatarkCriticalLandslideWarning: React.FC<SatarkCriticalLandslideWarningProps> = ({
  isOpen,
  areaName,
  district,
  state,
  severity = 'CRITICAL',
  riskScore = 0.92,
  issuedAt,
  validUntil,
  message,
  isSirenPlaying,
  onMuteSound,
  isVoiceSpeaking = false,
  onToggleVoiceSpeaking,
  onClose,
  videoSrc = '/assets/video/whatsapp_landslide_safety.mp4',
}) => {
  const [isVideoOpen, setIsVideoOpen] = useState<boolean>(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Close video if parent warning closes
  useEffect(() => {
    if (!isOpen) {
      setIsVideoOpen(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;
  if (typeof document === 'undefined') return null;

  // Format times if not provided
  const now = new Date();
  const displayIssued = issuedAt || 'just now';
  const displayValidUntil = validUntil || new Date(now.getTime() + 4 * 60 * 60 * 1000).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });

  const displayMessage =
    message ||
    'Immediate Evacuation & Highway Closure. High debris-flow susceptibility on hillside slopes.';

  // Render via portal directly to document.body so no parent layout or overflow can affect it
  return ReactDOM.createPortal(
    <>
      {/* ── 1. Main Critical Emergency Modal Overlay (Screenshot 2) ── */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          width: '100vw',
          height: '100vh',
          backgroundColor: 'rgba(0, 0, 0, 0.72)',
          backdropFilter: 'blur(4px)',
          WebkitBackdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 999999,
          padding: '16px',
          boxSizing: 'border-box',
          touchAction: 'none'
        }}
      >
        <div
          style={{
            position: 'relative',
            width: '100%',
            maxWidth: '340px',
            backgroundColor: '#ffffff',
            borderRadius: '24px',
            overflow: 'hidden',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.75), 0 0 0 1px rgba(255, 255, 255, 0.1)',
            display: 'flex',
            flexDirection: 'column',
            boxSizing: 'border-box'
          }}
        >
          {/* Top Crimson Banner — NO sound/mute button in header */}
          <div
            style={{
              background: 'linear-gradient(180deg, #dc2626 0%, #b91c1c 100%)',
              padding: '20px 16px 14px 16px',
              textAlign: 'center',
              color: '#ffffff',
              boxSizing: 'border-box'
            }}
          >
            {/* Stylized Mountain 3D Vector Icon matching Screenshot 2 */}
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '6px' }}>
              <svg width="48" height="42" viewBox="0 0 64 54" fill="none" xmlns="http://www.w3.org/2000/svg">
                {/* Mountain Base */}
                <path d="M32 4L6 50H58L32 4Z" fill="#78350F" />
                {/* Left Green Flank */}
                <path d="M6 50L22 34L33 50H6Z" fill="#15803D" />
                {/* Right Green Flank */}
                <path d="M58 50L42 32L31 50H58Z" fill="#16A34A" />
                {/* Central Shaded Slope */}
                <path d="M32 4L19 34L32 28L45 34L32 4Z" fill="#92400E" />
                {/* Snow Cap Peak */}
                <path d="M32 4L22 19L27 17L32 22L37 17L42 19L32 4Z" fill="#FFFFFF" />
                <path d="M32 4L25 14L32 12L39 14L32 4Z" fill="#F1F5F9" />
              </svg>
            </div>

            {/* Title: LANDSLIDE WARNING */}
            <h2
              style={{
                fontSize: '17px',
                fontWeight: 900,
                letterSpacing: '1px',
                textTransform: 'uppercase',
                color: '#ffffff',
                margin: '0 0 2px 0',
                fontFamily: 'Inter, system-ui, -apple-system, sans-serif'
              }}
            >
              LANDSLIDE WARNING
            </h2>

            {/* Subtitle: Affected Area Name (dynamic) */}
            <p
              style={{
                fontSize: '13px',
                fontWeight: 500,
                color: 'rgba(255, 255, 255, 0.92)',
                margin: 0,
                fontFamily: 'Inter, system-ui, -apple-system, sans-serif'
              }}
            >
              {areaName}
            </p>
          </div>

          {/* Body Content Area */}
          <div
            style={{
              padding: '16px 18px 18px 18px',
              backgroundColor: '#ffffff',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              boxSizing: 'border-box'
            }}
          >
            {/* Metadata Table */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '12.5px', color: '#4b5563', fontWeight: 600 }}>Severity</span>
                <span style={{ fontSize: '13px', color: '#dc2626', fontWeight: 800, letterSpacing: '0.5px' }}>
                  {severity}
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '12.5px', color: '#4b5563', fontWeight: 600 }}>Issued</span>
                <span style={{ fontSize: '12.5px', color: '#1f2937', fontWeight: 500 }}>
                  {displayIssued}
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '12.5px', color: '#4b5563', fontWeight: 600 }}>Valid Until</span>
                <span style={{ fontSize: '12.5px', color: '#1f2937', fontWeight: 500 }}>
                  {displayValidUntil}
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '12.5px', color: '#4b5563', fontWeight: 600 }}>Source</span>
                <span style={{ fontSize: '11.5px', color: '#1f2937', fontWeight: 500, textAlign: 'right' }}>
                  Field Officer, NE Disaster Intelligence
                </span>
              </div>
            </div>

            {/* Advisory Message Container (matches Screenshot 2) */}
            <div
              style={{
                backgroundColor: '#fee2e2',
                borderRadius: '8px',
                padding: '10px 12px',
                color: '#991b1b',
                fontSize: '12px',
                lineHeight: '1.45',
                fontWeight: 500,
                boxSizing: 'border-box'
              }}
            >
              {displayMessage}
            </div>

            {/* Row with TWO Controls: [ Stop Siren ] and [ YouTube-style Play Button ] */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '10px',
                marginTop: '4px'
              }}
            >
              {/* BUTTON 1 — SIREN STOP / MUTE */}
              <button
                type="button"
                onClick={onMuteSound}
                style={{
                  height: '44px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  borderRadius: '12px',
                  border: isSirenPlaying ? '1.5px solid #f59e0b' : '1.5px solid #d1d5db',
                  backgroundColor: isSirenPlaying ? '#fef3c7' : '#f3f4f6',
                  color: isSirenPlaying ? '#92400e' : '#374151',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  outline: 'none',
                  transition: 'background 0.15s ease'
                }}
                aria-label="Stop or Mute Siren"
              >
                <span style={{ fontSize: '15px' }}>{isSirenPlaying ? '🔇' : '🔈'}</span>
                <span>{isSirenPlaying ? 'Stop Siren' : 'Siren Muted'}</span>
              </button>

              {/* BUTTON 2 — VIDEO (ONLY YouTube-style Play Icon, No Text Label) */}
              <button
                type="button"
                onClick={() => setIsVideoOpen(true)}
                style={{
                  height: '44px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '12px',
                  backgroundColor: '#ff0000',
                  border: 'none',
                  boxShadow: '0 3px 8px rgba(255, 0, 0, 0.35)',
                  cursor: 'pointer',
                  outline: 'none',
                  transition: 'transform 0.15s ease'
                }}
                title="Watch Landslide Safety Video"
                aria-label="Play Safety Video"
              >
                {/* White YouTube-style Play Triangle Icon */}
                <svg width="22" height="22" viewBox="0 0 24 24" fill="#ffffff">
                  <path d="M8 5v14l11-7z" />
                </svg>
              </button>
            </div>

            {/* Spoken Advisor Control (Starts OFF by default) */}
            {onToggleVoiceSpeaking && (
              <button
                type="button"
                onClick={onToggleVoiceSpeaking}
                style={{
                  width: '100%',
                  height: '38px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  borderRadius: '12px',
                  border: isVoiceSpeaking ? '1.5px solid #2563eb' : '1.5px solid #d1d5db',
                  backgroundColor: isVoiceSpeaking ? '#eff6ff' : '#f9fafb',
                  color: isVoiceSpeaking ? '#1d4ed8' : '#475569',
                  fontSize: '12.5px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  outline: 'none',
                  transition: 'background 0.15s ease'
                }}
              >
                <span>{isVoiceSpeaking ? '⏹️' : '🗣️'}</span>
                <span>{isVoiceSpeaking ? 'Stop Spoken Advisor' : 'Listen / Spoken Advisor'}</span>
              </button>
            )}

            {/* FINAL BUTTON — ✓ Understand, Close */}
            <button
              type="button"
              onClick={onClose}
              style={{
                width: '100%',
                height: '44px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                borderRadius: '12px',
                border: 'none',
                backgroundColor: '#0284c7',
                color: '#ffffff',
                fontSize: '14px',
                fontWeight: 800,
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(2, 132, 199, 0.35)',
                outline: 'none',
                transition: 'background 0.15s ease'
              }}
            >
              <span>✓</span>
              <span>Understand, Close</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── 2. Mobile Phone Portrait Video Player Overlay ──────────────── */}
      {isVideoOpen && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            width: '100vw',
            height: '100vh',
            backgroundColor: '#000000',
            zIndex: 1000000,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            padding: '16px',
            boxSizing: 'border-box'
          }}
        >
          {/* Phone Top Header Bar */}
          <div
            style={{
              width: '100%',
              maxWidth: '360px',
              margin: '0 auto',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingBottom: '12px',
              borderBottom: '1px solid #27272a'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div
                style={{
                  width: '24px',
                  height: '16px',
                  backgroundColor: '#ff0000',
                  borderRadius: '3px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <svg width="10" height="10" viewBox="0 0 24 24" fill="#ffffff">
                  <path d="M8 5v14l11-7z" />
                </svg>
              </div>
              <span style={{ color: '#ffffff', fontWeight: 700, fontSize: '13px' }}>
                Landslide Safety Protocol
              </span>
            </div>
            <button
              type="button"
              onClick={() => setIsVideoOpen(false)}
              style={{
                color: '#a1a1aa',
                background: 'none',
                border: 'none',
                fontSize: '18px',
                fontWeight: 700,
                cursor: 'pointer',
                padding: '4px 8px'
              }}
              aria-label="Close Video"
            >
              ✕
            </button>
          </div>

          {/* Phone Portrait Video Screen Area */}
          <div
            style={{
              flex: 1,
              width: '100%',
              maxWidth: '360px',
              margin: '0 auto',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '12px 0'
            }}
          >
            <video
              ref={videoRef}
              controls
              autoPlay
              playsInline
              style={{
                width: '100%',
                maxHeight: '68vh',
                objectFit: 'contain',
                borderRadius: '16px',
                backgroundColor: '#000000',
                boxShadow: '0 20px 40px rgba(0, 0, 0, 0.9)'
              }}
            >
              <source src={videoSrc} type="video/mp4" />
              <source src="./assets/video/whatsapp_landslide_safety.mp4" type="video/mp4" />
              <source src="./assets/video/WhatsApp Video 2026-09-08 at 1.01.46 PM.mp4" type="video/mp4" />
              Your device does not support video playback.
            </video>
          </div>

          {/* Phone Bottom Control Bar */}
          <div
            style={{
              width: '100%',
              maxWidth: '360px',
              margin: '0 auto',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '10px',
              paddingTop: '12px',
              borderTop: '1px solid #27272a'
            }}
          >
            <div style={{ fontSize: '11px', color: '#71717a', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>📁</span>
              <span>Local Offline Video · WhatsApp Safety Guide</span>
            </div>
            <button
              type="button"
              onClick={() => setIsVideoOpen(false)}
              style={{
                width: '100%',
                backgroundColor: '#27272a',
                color: '#ffffff',
                fontWeight: 700,
                fontSize: '13px',
                padding: '10px 16px',
                borderRadius: '12px',
                border: 'none',
                cursor: 'pointer'
              }}
            >
              ← Return to Emergency Warning
            </button>
          </div>
        </div>
      )}
    </>,
    document.body
  );
};
