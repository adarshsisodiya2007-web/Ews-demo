import React, { useState, useEffect } from 'react';
import { useOfflineSync } from '../../hooks/useOfflineSync';

interface Props {
  cachedTimestamp?: number | null;
  compact?: boolean;
  theme?: 'light' | 'dark';
}

export const OfflineStatusHeader: React.FC<Props> = ({ cachedTimestamp, compact = false, theme = 'dark' }) => {
  const { isOnline, pendingCount, isSyncing, syncNow, syncError } = useOfflineSync();
  const [localCachedTime, setLocalCachedTime] = useState<number | null>(cachedTimestamp || null);

  useEffect(() => {
    if (cachedTimestamp) {
      setLocalCachedTime(cachedTimestamp);
    }
  }, [cachedTimestamp]);

  useEffect(() => {
    const handleCacheEvent = (e: any) => {
      if (e.detail?.timestamp) {
        setLocalCachedTime(e.detail.timestamp);
      }
    };
    window.addEventListener('ews-cache-status', handleCacheEvent);
    return () => window.removeEventListener('ews-cache-status', handleCacheEvent);
  }, []);

  const formatTimestamp = (ts: number) => {
    const d = new Date(ts);
    return `${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`;
  };

  if (compact) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.75rem', fontWeight: 700 }}>
        {isOnline ? (
          <span style={{ color: theme === 'light' ? '#15803d' : '#4ade80', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: theme === 'light' ? '#15803d' : '#22c55e', display: 'inline-block' }} />
            ONLINE
          </span>
        ) : (
          <span style={{ color: theme === 'light' ? '#b45309' : '#f59e0b', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: theme === 'light' ? '#b45309' : '#f59e0b', display: 'inline-block' }} />
            OFFLINE (CACHED)
          </span>
        )}
        {pendingCount > 0 && (
          <button
            onClick={() => syncNow()}
            disabled={!isOnline || isSyncing}
            style={{
              background: theme === 'light' ? '#fef3c7' : '#f59e0b20',
              border: `1px solid ${theme === 'light' ? '#fcd34d' : '#f59e0b80'}`,
              color: theme === 'light' ? '#b45309' : '#fcd34d',
              padding: '2px 6px', borderRadius: '4px', fontSize: '0.7rem', cursor: isOnline ? 'pointer' : 'default',
              fontWeight: 700
            }}
          >
            {isSyncing ? '⏳ Syncing...' : `📤 ${pendingCount} Queued`}
          </button>
        )}
      </div>
    );
  }

  return (
    <div style={{
      width: '100%',
      background: !isOnline
        ? 'linear-gradient(90deg, #78350f, #92400e, #78350f)'
        : pendingCount > 0
        ? 'linear-gradient(90deg, #1e293b, #0f172a)'
        : 'transparent',
      borderBottom: !isOnline ? '1px solid #f59e0b60' : 'none',
      padding: !isOnline || pendingCount > 0 ? '6px 16px' : '0',
      transition: 'all 0.3s ease',
      display: !isOnline || pendingCount > 0 ? 'block' : 'none',
    }}>
      <div style={{
        maxWidth: '1200px', margin: '0 auto', display: 'flex',
        alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px',
        fontSize: '0.8rem', color: '#f8fafc'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {!isOnline ? (
            <>
              <span style={{ background: '#b45309', padding: '2px 8px', borderRadius: '4px', fontWeight: 800, fontSize: '0.72rem' }}>
                📴 OFFLINE MODE ACTIVE
              </span>
              <span>
                Cellular connection interrupted. Showing <strong>cached disaster data</strong>
                {localCachedTime ? ` synchronized at ${formatTimestamp(localCachedTime)}.` : ' from local offline storage.'}
              </span>
            </>
          ) : (
            <>
              <span style={{ color: '#4ade80', fontWeight: 700 }}>
                🟢 Network Restored
              </span>
              <span>
                {pendingCount} item{pendingCount > 1 ? 's' : ''} in local queue ready for cloud sync.
              </span>
            </>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {pendingCount > 0 && (
            <span style={{ background: 'rgba(255,255,255,0.15)', padding: '2px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 700 }}>
              {pendingCount} Pending Sync
            </span>
          )}

          {isOnline && pendingCount > 0 && (
            <button
              onClick={() => syncNow()}
              disabled={isSyncing}
              style={{
                background: '#22c55e', color: '#0f172a', border: 'none', borderRadius: '6px',
                padding: '4px 12px', fontWeight: 800, fontSize: '0.75rem', cursor: isSyncing ? 'wait' : 'pointer'
              }}
            >
              {isSyncing ? '🔄 Syncing Now...' : '⚡ Sync Queue Now'}
            </button>
          )}

          {syncError && (
            <span style={{ color: '#fca5a5', fontSize: '0.72rem' }}>
              ⚠️ {syncError}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
