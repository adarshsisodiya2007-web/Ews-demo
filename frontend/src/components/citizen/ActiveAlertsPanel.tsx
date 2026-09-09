import React, { useState } from 'react';
import { ResponderAlert, SEVERITY_CONFIG } from '../../types/alertTypes';

interface Props {
  alerts: ResponderAlert[];
  loading: boolean;
  connected: boolean;
  theme?: 'dark' | 'light';
}

export const ActiveAlertsPanel: React.FC<Props> = ({ alerts, loading, connected, theme = 'dark' }) => {
  const [expanded, setExpanded] = useState<string | null>(null);
  const isDark = theme === 'dark';

  const fg = isDark ? '#f8fafc' : '#0f172a';
  const bg = isDark ? '#0f172a' : '#f8fafc';
  const brd = isDark ? '#1e293b' : '#e2e8f0';
  const cardBg = isDark ? '#0a1124' : '#fff';

  if (loading) {
    return (
      <div style={{ padding: '24px', textAlign: 'center', color: '#64748b' }}>
        <span style={{ fontSize: '1.5rem' }}>⏳</span>
        <p>Loading alerts...</p>
      </div>
    );
  }

  return (
    <div style={{
      background: cardBg,
      border: `1px solid ${brd}`,
      borderRadius: 16,
      overflow: 'hidden',
      marginBottom: 20,
    }}>
      {/* Header */}
      <div style={{
        background: isDark ? '#1e1a2e' : '#fef2f2',
        borderBottom: `1px solid ${brd}`,
        padding: '14px 18px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: '1.3rem' }}>🚨</span>
          <div>
            <div style={{ fontWeight: 800, color: fg, fontSize: '0.95rem' }}>
              Active Landslide Alerts
            </div>
            <div style={{ fontSize: '0.7rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{
                width: 6, height: 6, borderRadius: '50%',
                background: connected ? '#22c55e' : '#f59e0b',
                display: 'inline-block',
              }} />
              {connected ? 'Real-time connected' : 'Polling mode'}
            </div>
          </div>
        </div>
        <div style={{
          background: alerts.length > 0 ? 'rgba(239,68,68,0.15)' : 'rgba(34,197,94,0.1)',
          border: `1px solid ${alerts.length > 0 ? '#ef444450' : '#22c55e50'}`,
          color: alerts.length > 0 ? '#fca5a5' : '#4ade80',
          borderRadius: 20,
          padding: '4px 12px',
          fontSize: '0.78rem',
          fontWeight: 700,
        }}>
          {alerts.length === 0 ? '✅ No active alerts' : `${alerts.length} Active`}
        </div>
      </div>

      {/* Alert List */}
      {alerts.length === 0 ? (
        <div style={{
          padding: '32px',
          textAlign: 'center',
          color: '#64748b',
        }}>
          <div style={{ fontSize: '2.5rem', marginBottom: 8 }}>✅</div>
          <div style={{ fontWeight: 600, color: isDark ? '#94a3b8' : '#64748b' }}>
            No active landslide alerts for your area
          </div>
          <div style={{ fontSize: '0.82rem', color: '#64748b', marginTop: 4 }}>
            You will be notified immediately if a new alert is issued
          </div>
        </div>
      ) : (
        <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {alerts.map(alert => {
            const cfg = SEVERITY_CONFIG[alert.severity];
            const isExpanded = expanded === alert.id;
            return (
              <div
                key={alert.id}
                style={{
                  background: cfg.bg,
                  border: `1px solid ${cfg.border}`,
                  borderRadius: 12,
                  overflow: 'hidden',
                }}
              >
                {/* Alert Header */}
                <div
                  onClick={() => setExpanded(isExpanded ? null : alert.id)}
                  style={{
                    padding: '12px 14px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    cursor: 'pointer',
                  }}
                >
                  {/* Severity badge */}
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 2,
                    minWidth: 64,
                  }}>
                    <span style={{ fontSize: '1.4rem' }}>{cfg.icon}</span>
                    <span style={{
                      background: cfg.color,
                      color: '#fff',
                      borderRadius: 6,
                      padding: '1px 6px',
                      fontSize: '0.6rem',
                      fontWeight: 900,
                      letterSpacing: 0.5,
                    }}>{cfg.label}</span>
                  </div>

                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, color: cfg.textColor, fontSize: '0.9rem' }}>
                      {alert.title}
                    </div>
                    <div style={{ color: '#94a3b8', fontSize: '0.78rem', marginTop: 2 }}>
                      📍 {alert.locationName || alert.district || alert.state || 'Your area'}
                      {alert.alertType && alert.alertType !== 'LANDSLIDE' && ` · ${alert.alertType}`}
                    </div>
                  </div>

                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: '0.7rem', color: '#64748b' }}>
                      {new Date(alert.createdAt).toLocaleString('en-IN', {
                        dateStyle: 'short', timeStyle: 'short'
                      })}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: 2 }}>
                      {isExpanded ? '▲' : '▼'}
                    </div>
                  </div>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div style={{
                    borderTop: `1px solid ${cfg.border}`,
                    padding: '12px 14px',
                    fontSize: '0.82rem',
                    color: '#cbd5e1',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8,
                  }}>
                    {alert.description && (
                      <div>
                        <strong style={{ color: cfg.textColor }}>⚠️ Details:</strong> {alert.description}
                      </div>
                    )}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                      <div>
                        <span style={{ color: '#64748b' }}>Scope: </span>
                        <span style={{ color: '#e2e8f0' }}>
                          {alert.scope === 'EXACT_REGION' ? '📌 Exact Area'
                            : alert.scope === 'DISTRICT' ? '🏙️ District-wide'
                            : '🗺️ State-wide'}
                        </span>
                      </div>
                      <div>
                        <span style={{ color: '#64748b' }}>Type: </span>
                        <span style={{ color: '#e2e8f0' }}>{alert.alertType || 'LANDSLIDE'}</span>
                      </div>
                      {alert.district && (
                        <div>
                          <span style={{ color: '#64748b' }}>District: </span>
                          <span style={{ color: '#e2e8f0' }}>{alert.district}</span>
                        </div>
                      )}
                      {alert.state && (
                        <div>
                          <span style={{ color: '#64748b' }}>State: </span>
                          <span style={{ color: '#e2e8f0' }}>{alert.state}</span>
                        </div>
                      )}
                      {alert.expiryTime && (
                        <div>
                          <span style={{ color: '#64748b' }}>Expires: </span>
                          <span style={{ color: '#fde047' }}>
                            {new Date(alert.expiryTime).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}
                          </span>
                        </div>
                      )}
                    </div>
                    {/* Emergency guidance */}
                    {(alert.severity === 'CRITICAL' || alert.severity === 'HIGH') && (
                      <div style={{
                        background: 'rgba(239,68,68,0.1)',
                        border: '1px solid rgba(239,68,68,0.3)',
                        borderRadius: 8,
                        padding: '8px 12px',
                        marginTop: 4,
                        fontSize: '0.8rem',
                        color: '#fca5a5',
                      }}>
                        🆘 <strong>Emergency:</strong> National Disaster Helpline: <strong>1070</strong> | NDRF: <strong>9711077372</strong>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
