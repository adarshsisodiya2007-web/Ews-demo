import React, { useEffect } from 'react';
import { ResponderAlert, SEVERITY_CONFIG } from '../../types/alertTypes';

interface Props {
  alert: ResponderAlert;
  onDismiss: () => void;
}

export const AlertNotificationBanner: React.FC<Props> = ({ alert, onDismiss }) => {
  const cfg = SEVERITY_CONFIG[alert.severity];

  useEffect(() => {
    // Browser notification if permitted
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(`${cfg.icon} NEW LANDSLIDE ALERT — ${cfg.label}`, {
        body: `${alert.locationName || alert.district || alert.state}: ${alert.title}`,
        icon: '/favicon.ico',
        tag: alert.id,
      });
    }
    // Auto-dismiss after 10 seconds
    const t = setTimeout(onDismiss, 10_000);
    return () => clearTimeout(t);
  }, [alert.id, alert.locationName, alert.district, alert.state, alert.title, cfg.icon, cfg.label, onDismiss]);

  return (
    <div style={{
      position: 'fixed',
      top: 16,
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 10000,
      maxWidth: '480px',
      width: 'calc(100vw - 32px)',
      background: cfg.bg,
      border: `2px solid ${cfg.color}`,
      borderRadius: 16,
      padding: '16px 20px',
      boxShadow: `0 8px 32px ${cfg.color}60`,
      fontFamily: 'Inter, system-ui, sans-serif',
      animation: 'slideDown 0.4s ease-out',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <span style={{ fontSize: '1.8rem', flexShrink: 0 }}>{cfg.icon}</span>
        <div style={{ flex: 1 }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4,
          }}>
            <span style={{
              background: cfg.color,
              color: '#fff',
              borderRadius: 6,
              padding: '2px 8px',
              fontSize: '0.7rem',
              fontWeight: 900,
              letterSpacing: 1,
            }}>{cfg.label}</span>
            <span style={{ color: '#f8fafc', fontWeight: 700, fontSize: '0.9rem' }}>
              NEW LANDSLIDE ALERT
            </span>
          </div>
          <div style={{ color: '#e2e8f0', fontSize: '0.85rem', marginBottom: 4 }}>
            <strong>📍 {alert.locationName || alert.district || alert.state || 'Your area'}</strong>
          </div>
          <div style={{ color: '#cbd5e1', fontSize: '0.82rem' }}>
            {alert.title}
          </div>
          {alert.description && alert.description !== alert.title && (
            <div style={{ color: '#94a3b8', fontSize: '0.78rem', marginTop: 4 }}>
              {alert.description}
            </div>
          )}
        </div>
        <button
          onClick={onDismiss}
          style={{
            background: 'none', border: 'none', color: '#94a3b8',
            cursor: 'pointer', fontSize: '1.2rem', padding: 0, flexShrink: 0,
          }}
        >✕</button>
      </div>
      <style>{`
        @keyframes slideDown {
          from { transform: translateX(-50%) translateY(-20px); opacity: 0; }
          to   { transform: translateX(-50%) translateY(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
};
