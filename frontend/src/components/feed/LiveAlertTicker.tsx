import React, { useState, useEffect } from 'react';
import { Severity } from '../../types';
import { SeverityIcon } from '../shared/SeverityIcon';
import { fetchRecentAlerts } from '../../services/api';

interface TickerItem {
  id: string;
  severity: Severity;
  regionName: string;
  score: number;
  time: string;
  type: 'alert' | 'report';
}

export const LiveAlertTicker: React.FC = () => {
  const [items, setItems] = useState<TickerItem[]>([]);

  useEffect(() => {
    const loadAlerts = async () => {
      try {
        const data = await fetchRecentAlerts();
        setItems(data.map(d => ({
          id: d.id,
          severity: d.severity,
          regionName: d.regionName,
          score: Math.round(Number(d.computedScore ?? 0)),
          time: new Date(d.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
          type: 'alert' as const
        })));
      } catch (e) {
        console.error(e);
      }
    };
    loadAlerts();
    const interval = setInterval(loadAlerts, 30000);
    return () => clearInterval(interval);
  }, []);

  const renderChip = (item: TickerItem, suffix: string) => {
    let bg = 'transparent';
    let border = 'none';
    if (item.severity === 'CRITICAL') { bg = 'rgba(139,35,21,0.2)'; border = '1px solid #8B2315'; }
    else if (item.severity === 'HIGH') { bg = 'rgba(184,74,57,0.15)'; border = '1px solid #B84A39'; }
    else if (item.severity === 'MODERATE') { bg = 'rgba(196,135,58,0.15)'; border = '1px solid #C4873A'; }

    return (
      <div key={`${item.id}-${suffix}`} style={{
        display: 'inline-flex', alignItems: 'center', gap: '8px',
        background: bg, border, padding: '4px 12px', borderRadius: '16px',
        marginRight: '16px', whiteSpace: 'nowrap'
      }} className="mono">
        <SeverityIcon severity={item.severity} />
        <span style={{ color: 'var(--color-base-000)' }}>{item.regionName}</span>
        <span style={{ color: 'var(--color-base-200)' }}>· {item.score} · {item.time}</span>
      </div>
    );
  };

  return (
    <div style={{
      height: '44px', width: '100%', background: '#161B22', borderTop: '1px solid #2A3547',
      display: 'flex', alignItems: 'center', overflow: 'hidden'
    }}>
      <div style={{
        padding: '0 16px', background: '#1B222C', height: '100%', display: 'flex',
        alignItems: 'center', fontWeight: 600, color: 'var(--color-base-000)', zIndex: 10
      }}>
        LIVE FEED
      </div>
      <div style={{ flex: 1, overflow: 'hidden', whiteSpace: 'nowrap' }}>
        <div style={{
          display: 'inline-block',
          animation: items.length ? `tickerScroll ${items.length * 4}s linear infinite` : 'none'
        }}>
          {items.map(item => renderChip(item, 'a'))}
          {items.map(item => renderChip(item, 'b'))}
        </div>
      </div>
    </div>
  );
};
