import React, { useState, useEffect, useCallback } from 'react';
import { ResponderAlert, SEVERITY_CONFIG } from '../../types/alertTypes';
import { fetchResponderAlerts, resolveAlert, cancelAlert, deleteAlert } from '../../services/alertService';

interface Props {
  refreshTrigger: number;
}

export const ResponderAlertList: React.FC<Props> = ({ refreshTrigger }) => {
  const [alerts, setAlerts] = useState<ResponderAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<{ type: 'resolve' | 'cancel' | 'delete'; id: string; title: string } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchResponderAlerts();
      setAlerts(data);
      setError(null);
    } catch (e: any) {
      setError(e.message || 'Failed to load alerts');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [refreshTrigger, load]);

  const handleConfirm = async () => {
    if (!confirmAction) return;
    setActionLoading(true);
    try {
      if (confirmAction.type === 'resolve') await resolveAlert(confirmAction.id);
      else if (confirmAction.type === 'cancel') await cancelAlert(confirmAction.id);
      else if (confirmAction.type === 'delete') await deleteAlert(confirmAction.id);
      await load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setActionLoading(false);
      setConfirmAction(null);
    }
  };

  const STATUS_BADGE: Record<string, { bg: string; color: string; label: string }> = {
    ACTIVE: { bg: 'rgba(34,197,94,0.15)', color: '#4ade80', label: '● ACTIVE' },
    RESOLVED: { bg: 'rgba(100,116,139,0.15)', color: '#94a3b8', label: '✓ RESOLVED' },
    EXPIRED: { bg: 'rgba(100,116,139,0.1)', color: '#64748b', label: '⏱ EXPIRED' },
    PENDING: { bg: 'rgba(234,179,8,0.15)', color: '#fde047', label: '⏳ PENDING' },
    SENT: { bg: 'rgba(59,130,246,0.15)', color: '#60a5fa', label: '✉ SENT' },
    FAILED: { bg: 'rgba(239,68,68,0.15)', color: '#fca5a5', label: '✗ FAILED' },
  };

  if (loading) return <div style={{ padding: 32, textAlign: 'center', color: '#64748b' }}>⏳ Loading alerts...</div>;
  if (error) return <div style={{ padding: 16, color: '#fca5a5' }}>⚠️ {error}</div>;

  return (
    <div style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
      {/* Confirm Modal */}
      {confirmAction && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
          zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{
            background: '#0f172a', border: '1px solid #1e293b',
            borderRadius: 16, padding: 28, maxWidth: 380, width: '90vw',
          }}>
            <h4 style={{ color: '#f8fafc', margin: '0 0 8px' }}>
              {confirmAction.type === 'resolve' ? '✅ Resolve Alert' :
               confirmAction.type === 'cancel' ? '🚫 Cancel Alert' : '🗑️ Delete Alert'}
            </h4>
            <p style={{ color: '#94a3b8', fontSize: '0.88rem' }}>
              Are you sure you want to {confirmAction.type} alert:
              <br /><strong style={{ color: '#f8fafc' }}>"{ confirmAction.title}"</strong>?
              {confirmAction.type === 'delete' && ' This action cannot be undone.'}
            </p>
            <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
              <button
                onClick={() => setConfirmAction(null)}
                style={{
                  flex: 1, padding: '9px 0',
                  background: 'rgba(100,116,139,0.2)', border: '1px solid #334155',
                  borderRadius: 8, color: '#94a3b8', cursor: 'pointer', fontWeight: 600,
                }}
              >Cancel</button>
              <button
                onClick={handleConfirm}
                disabled={actionLoading}
                style={{
                  flex: 1, padding: '9px 0',
                  background: confirmAction.type === 'delete' ? '#ef4444' : '#ea580c',
                  border: 'none', borderRadius: 8, color: '#fff',
                  cursor: actionLoading ? 'not-allowed' : 'pointer',
                  fontWeight: 700,
                }}
              >{actionLoading ? '...' : 'Confirm'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: 16,
      }}>
        <h3 style={{ color: '#f8fafc', fontWeight: 800, margin: 0, fontSize: '1rem' }}>
          📋 Alert History ({alerts.length})
        </h3>
        <button
          onClick={load}
          style={{
            background: 'rgba(30,41,59,.8)', border: '1px solid #334155',
            borderRadius: 8, color: '#94a3b8', padding: '6px 12px',
            cursor: 'pointer', fontSize: '0.8rem',
          }}
        >🔄 Refresh</button>
      </div>

      {alerts.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 32, color: '#64748b' }}>
          No alerts created yet. Create your first alert above.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {alerts.map(alert => {
            const cfg = SEVERITY_CONFIG[alert.severity];
            const status = STATUS_BADGE[alert.status] || STATUS_BADGE.PENDING;
            const isActive = alert.status === 'ACTIVE';
            return (
              <div
                key={alert.id}
                style={{
                  background: '#0a1124',
                  border: `1px solid ${isActive ? cfg.border : '#1e293b'}`,
                  borderRadius: 12, padding: '12px 14px',
                  display: 'flex', alignItems: 'center', gap: 12,
                  flexWrap: 'wrap',
                }}
              >
                {/* Severity */}
                <div style={{ textAlign: 'center', minWidth: 52 }}>
                  <div style={{ fontSize: '1.3rem' }}>{cfg.icon}</div>
                  <div style={{
                    background: cfg.color, color: '#fff',
                    borderRadius: 4, padding: '1px 5px',
                    fontSize: '0.58rem', fontWeight: 900,
                  }}>{cfg.label}</div>
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 180 }}>
                  <div style={{ color: '#f8fafc', fontWeight: 700, fontSize: '0.88rem' }}>
                    {alert.title}
                  </div>
                  <div style={{ color: '#64748b', fontSize: '0.75rem', marginTop: 2 }}>
                    📍 {alert.locationName || alert.district || alert.state || '—'} &nbsp;·&nbsp;
                    {new Date(alert.createdAt).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}
                    {alert.expiryTime && ` · Exp: ${new Date(alert.expiryTime).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}`}
                  </div>
                </div>

                {/* Status */}
                <div style={{
                  background: status.bg,
                  border: `1px solid ${status.color}40`,
                  color: status.color,
                  borderRadius: 20, padding: '3px 10px',
                  fontSize: '0.7rem', fontWeight: 700,
                }}>{status.label}</div>

                {/* Actions */}
                {isActive && (
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button
                      onClick={() => setConfirmAction({ type: 'resolve', id: alert.id, title: alert.title })}
                      style={{
                        background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.3)',
                        color: '#4ade80', borderRadius: 6, padding: '5px 10px',
                        fontSize: '0.75rem', cursor: 'pointer', fontWeight: 600,
                      }}
                    >✅ Resolve</button>
                    <button
                      onClick={() => setConfirmAction({ type: 'cancel', id: alert.id, title: alert.title })}
                      style={{
                        background: 'rgba(100,116,139,0.12)', border: '1px solid #334155',
                        color: '#94a3b8', borderRadius: 6, padding: '5px 10px',
                        fontSize: '0.75rem', cursor: 'pointer', fontWeight: 600,
                      }}
                    >🚫 Cancel</button>
                  </div>
                )}
                {!isActive && (
                  <button
                    onClick={() => setConfirmAction({ type: 'delete', id: alert.id, title: alert.title })}
                    style={{
                      background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
                      color: '#fca5a5', borderRadius: 6, padding: '5px 10px',
                      fontSize: '0.75rem', cursor: 'pointer', fontWeight: 600,
                    }}
                  >🗑️ Delete</button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
