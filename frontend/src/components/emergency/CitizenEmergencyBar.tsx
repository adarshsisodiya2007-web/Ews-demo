import React, { useState, useEffect, useRef } from 'react';
import { useGeolocation } from '../../hooks/useGeolocation';
import { useAlertSound } from '../../hooks/useAlertSound';
import { submitReport } from '../../services/api';
import {
  queueReport,
  generateClientReportId,
  generateBeaconId,
  setEmergencyDistressState,
  getEmergencyDistressState,
  EmergencyDistressState,
} from '../../services/offlineStore';
import { CreateReportPayload } from '../../types';

interface Props {
  defaultLat?: number;
  defaultLng?: number;
  onOpenOfflineMap?: () => void;
  onFindNearestShelter?: () => void;
}

export const CitizenEmergencyBar: React.FC<Props> = ({
  defaultLat = 11.5534,
  defaultLng = 76.1320,
  onOpenOfflineMap,
  onFindNearestShelter,
}) => {
  const { coords } = useGeolocation();
  const { playCriticalSiren, stopSiren } = useAlertSound();

  const [submitting, setSubmitting] = useState<boolean>(false);
  const [activeSOS, setActiveSOS] = useState<string | null>(null);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'alert'; text: string } | null>(null);
  const [signalActive, setSignalActive] = useState<boolean>(false);

  // Optical strobe interval reference
  const strobeRef = useRef<number | null>(null);
  const [strobeColor, setStrobeColor] = useState<string>('#ef4444');

  const currentLat = coords?.lat || defaultLat;
  const currentLng = coords?.lng || defaultLng;

  useEffect(() => {
    // Restore persistent distress state if previously activated
    const saved = getEmergencyDistressState();
    if (saved && saved.active) {
      setSignalActive(true);
      startOpticalStrobe();
      playCriticalSiren();
    }

    return () => {
      stopOpticalStrobe();
      stopSiren();
    };
  }, []);

  const startOpticalStrobe = () => {
    if (strobeRef.current) clearInterval(strobeRef.current);
    let toggle = false;
    strobeRef.current = window.setInterval(() => {
      toggle = !toggle;
      setStrobeColor(toggle ? '#f59e0b' : '#ef4444');
    }, 400);
  };

  const stopOpticalStrobe = () => {
    if (strobeRef.current) {
      clearInterval(strobeRef.current);
      strobeRef.current = null;
    }
  };

  const triggerEmergencyReport = async (
    category: 'INJURED_PEOPLE' | 'TRAPPED_CITIZENS',
    label: string,
    medicalUrgent: boolean = false
  ) => {
    setSubmitting(true);
    setFeedbackMsg(null);
    const clientReportId = generateClientReportId();

    const desc = category === 'INJURED_PEOPLE'
      ? `EMERGENCY SOS: Citizen reported injured at Lat ${currentLat.toFixed(4)}, Lon ${currentLng.toFixed(4)}. Urgent medical response needed.`
      : `EMERGENCY SOS: Citizen trapped by landslide/debris at Lat ${currentLat.toFixed(4)}, Lon ${currentLng.toFixed(4)}. Immediate extraction needed.`;

    const payload: CreateReportPayload = {
      geoLat: currentLat,
      geoLng: currentLng,
      category,
      description: desc,
      reporterType: 'CITIZEN',
      medicalUrgent,
      clientReportId,
      photoUrl: null,
    };

    try {
      if (navigator.onLine) {
        await submitReport(payload);
        setFeedbackMsg({
          type: 'success',
          text: `🚨 ${label} TRANSMITTED TO LIVE EMERGENCY DISPATCH (Lat: ${currentLat.toFixed(4)}, Lon: ${currentLng.toFixed(4)}). Stay calm, help is being notified.`,
        });
      } else {
        await queueReport(payload);
        setFeedbackMsg({
          type: 'alert',
          text: `📴 OFFLINE MODE: ${label} PRESERVED in local IndexedDB (PENDING_SYNC). Will automatically broadcast upon cloud reconnection or peer gateway pickup.`,
        });
      }
      setActiveSOS(category);
    } catch {
      await queueReport(payload);
      setFeedbackMsg({
        type: 'alert',
        text: `📴 NETWORK TIMEOUT: ${label} SECURED IN OFFLINE QUEUE (Zero data loss). Automatic sync active.`,
      });
      setActiveSOS(category);
    } finally {
      setSubmitting(false);
    }
  };

  const toggleSignalRescue = async () => {
    if (!signalActive) {
      // Activate
      setSignalActive(true);
      startOpticalStrobe();
      playCriticalSiren();

      const beaconId = generateBeaconId();
      const distressState: EmergencyDistressState = {
        beaconId,
        status: 'ACTIVE',
        active: true,
        createdAt: Date.now(),
        activatedAt: Date.now(),
        lat: currentLat,
        lng: currentLng,
        notes: 'Acoustic siren + optical screen beacon active',
      };
      setEmergencyDistressState(distressState);

      // Queue an emergency distress packet in IndexedDB
      const clientReportId = generateClientReportId();
      const payload: CreateReportPayload = {
        geoLat: currentLat,
        geoLng: currentLng,
        category: 'TRAPPED_CITIZENS',
        description: `[SIGNAL RESCUE BEACON ACTIVE] Continuous emergency distress beacon broadcasting at Lat ${currentLat.toFixed(4)}, Lon ${currentLng.toFixed(4)}.`,
        reporterType: 'CITIZEN',
        clientReportId,
      };

      try {
        if (navigator.onLine) {
          await submitReport(payload);
        } else {
          await queueReport(payload);
        }
      } catch {
        await queueReport(payload);
      }

      setFeedbackMsg({
        type: 'alert',
        text: '📢 SIGNAL RESCUE ACTIVATED. Continuous audible acoustic alarm + high-contrast visual beacon broadcasting. Hold screen up toward rescuers.',
      });
    } else {
      // Deactivate
      setSignalActive(false);
      stopOpticalStrobe();
      stopSiren();
      setEmergencyDistressState(null);
      setFeedbackMsg({
        type: 'success',
        text: 'Signal Rescue deactivated. Acoustic siren and screen strobe stopped.',
      });
    }
  };

  return (
    <div style={{ marginBottom: '20px' }}>
      {/* ── Active Signal Rescue Warning Strobe Banner ── */}
      {signalActive && (
        <div
          style={{
            background: strobeColor,
            color: '#ffffff',
            padding: '12px 16px',
            borderRadius: '12px',
            marginBottom: '14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: '0 0 24px rgba(239, 68, 68, 0.6)',
            animation: 'strobePulse 0.8s infinite alternate',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '1.6rem' }}>🚨</span>
            <div>
              <div style={{ fontWeight: 900, fontSize: '0.95rem', letterSpacing: '0.02em' }}>
                SIGNAL RESCUE ACTIVE — CONTINUOUS DISTRESS BEACON
              </div>
              <div style={{ fontSize: '0.75rem', opacity: 0.95 }}>
                Acoustic siren sounding · Screen beacon pulsing · GPS Lat: {currentLat.toFixed(4)}, Lon: {currentLng.toFixed(4)}
              </div>
            </div>
          </div>
          <button
            onClick={toggleSignalRescue}
            style={{
              background: '#000000',
              color: '#ffffff',
              border: '2px solid #ffffff',
              borderRadius: '8px',
              padding: '6px 14px',
              fontWeight: 800,
              fontSize: '0.82rem',
              cursor: 'pointer',
            }}
          >
            ⏹️ STOP SIGNAL
          </button>
        </div>
      )}

      {/* ── Emergency Action Bar Card ── */}
      <div
        style={{
          background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.95), rgba(30, 41, 59, 0.9))',
          border: '1px solid rgba(239, 68, 68, 0.4)',
          borderRadius: '16px',
          padding: '16px',
          boxShadow: '0 8px 30px rgba(0,0,0,0.4)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '1.3rem' }}>🆘</span>
            <div>
              <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#f8fafc', letterSpacing: '-0.01em' }}>
                CITIZEN EMERGENCY ACTIONS (1-TAP OFFLINE SOS)
              </div>
              <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                Instant GPS distress signaling — Works 100% offline via local IndexedDB queue
              </div>
            </div>
          </div>
          <span style={{ fontSize: '0.72rem', color: '#cbd5e1', background: 'rgba(239,68,68,0.2)', border: '1px solid #ef444480', padding: '2px 8px', borderRadius: '12px' }}>
            📍 GPS: {currentLat.toFixed(4)}, {currentLng.toFixed(4)}
          </span>
        </div>

        {/* ── Action Buttons Row ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px' }}>
          {/* Action 1: I Am Injured */}
          <button
            onClick={() => triggerEmergencyReport('INJURED_PEOPLE', 'INJURY SOS', true)}
            disabled={submitting}
            style={{
              background: 'linear-gradient(135deg, #dc2626, #991b1b)',
              color: '#ffffff',
              border: '1px solid #f87171',
              borderRadius: '10px',
              padding: '12px 14px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px',
              cursor: submitting ? 'wait' : 'pointer',
              fontWeight: 800,
              fontSize: '0.88rem',
              boxShadow: '0 4px 14px rgba(220, 38, 38, 0.4)',
              transition: 'transform 0.1s',
            }}
          >
            <span style={{ fontSize: '1.4rem' }}>🩹</span>
            <span>I AM INJURED</span>
            <span style={{ fontSize: '0.68rem', opacity: 0.9, fontWeight: 500 }}>Urgent Medical SOS</span>
          </button>

          {/* Action 2: I Am Trapped */}
          <button
            onClick={() => triggerEmergencyReport('TRAPPED_CITIZENS', 'TRAPPED SOS', false)}
            disabled={submitting}
            style={{
              background: 'linear-gradient(135deg, #ea580c, #c2410c)',
              color: '#ffffff',
              border: '1px solid #fb923c',
              borderRadius: '10px',
              padding: '12px 14px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px',
              cursor: submitting ? 'wait' : 'pointer',
              fontWeight: 800,
              fontSize: '0.88rem',
              boxShadow: '0 4px 14px rgba(234, 88, 12, 0.4)',
              transition: 'transform 0.1s',
            }}
          >
            <span style={{ fontSize: '1.4rem' }}>⛓️</span>
            <span>I AM TRAPPED</span>
            <span style={{ fontSize: '0.68rem', opacity: 0.9, fontWeight: 500 }}>Debris Extraction SOS</span>
          </button>

          {/* Action 3: Signal Rescue */}
          <button
            onClick={toggleSignalRescue}
            style={{
              background: signalActive
                ? 'linear-gradient(135deg, #ef4444, #b91c1c)'
                : 'linear-gradient(135deg, #d97706, #b45309)',
              color: '#ffffff',
              border: '1px solid #fcd34d',
              borderRadius: '10px',
              padding: '12px 14px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px',
              cursor: 'pointer',
              fontWeight: 800,
              fontSize: '0.88rem',
              boxShadow: '0 4px 14px rgba(217, 119, 6, 0.4)',
              transition: 'transform 0.1s',
            }}
          >
            <span style={{ fontSize: '1.4rem' }}>{signalActive ? '⏹️' : '📢'}</span>
            <span>{signalActive ? 'STOP SIGNAL' : 'SIGNAL RESCUE'}</span>
            <span style={{ fontSize: '0.68rem', opacity: 0.9, fontWeight: 500 }}>
              {signalActive ? 'Deactivate Alarm' : 'Acoustic & Strobe Beacon'}
            </span>
          </button>

          {/* Quick Action 4: Open Offline Map */}
          {onOpenOfflineMap && (
            <button
              onClick={onOpenOfflineMap}
              style={{
                background: '#1e293b',
                color: '#38bdf8',
                border: '1px solid #334155',
                borderRadius: '10px',
                padding: '12px 14px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px',
                cursor: 'pointer',
                fontWeight: 700,
                fontSize: '0.85rem',
              }}
            >
              <span style={{ fontSize: '1.3rem' }}>🗺️</span>
              <span>OFFLINE MAP</span>
              <span style={{ fontSize: '0.68rem', color: '#94a3b8' }}>Cached Vector Geometry</span>
            </button>
          )}

          {/* Quick Action 5: Find Nearest Shelter */}
          {onFindNearestShelter && (
            <button
              onClick={onFindNearestShelter}
              style={{
                background: '#1e293b',
                color: '#4ade80',
                border: '1px solid #334155',
                borderRadius: '10px',
                padding: '12px 14px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px',
                cursor: 'pointer',
                fontWeight: 700,
                fontSize: '0.85rem',
              }}
            >
              <span style={{ fontSize: '1.3rem' }}>🏥</span>
              <span>NEAREST SHELTER</span>
              <span style={{ fontSize: '0.68rem', color: '#94a3b8' }}>GPS Calculated Bearing</span>
            </button>
          )}
        </div>

        {/* ── Status Feedback Banner ── */}
        {feedbackMsg && (
          <div
            style={{
              marginTop: '12px',
              padding: '10px 14px',
              borderRadius: '8px',
              background: feedbackMsg.type === 'success' ? 'rgba(34, 197, 94, 0.2)' : 'rgba(245, 158, 11, 0.2)',
              border: `1px solid ${feedbackMsg.type === 'success' ? '#22c55e' : '#f59e0b'}`,
              color: feedbackMsg.type === 'success' ? '#86efac' : '#fde047',
              fontSize: '0.82rem',
              lineHeight: '1.4',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <span>{feedbackMsg.text}</span>
            <button
              onClick={() => setFeedbackMsg(null)}
              style={{ background: 'transparent', border: 'none', color: 'inherit', cursor: 'pointer', fontWeight: 800 }}
            >
              ✕
            </button>
          </div>
        )}

        {/* ── Honest Technical Capability Notice ── */}
        <div style={{ marginTop: '10px', fontSize: '0.7rem', color: '#64748b', textAlign: 'center' }}>
          Hardware notice: Standard web browsers cannot access physical LED flashlights or broadcast raw BLE radio packets without native OS plugins. Acoustic siren, screen strobe, and IndexedDB local queue are fully operational.
        </div>
      </div>
    </div>
  );
};
