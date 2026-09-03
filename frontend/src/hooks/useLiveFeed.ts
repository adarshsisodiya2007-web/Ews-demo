import { useState, useEffect } from 'react';
import { Client } from '@stomp/stompjs';
import { AlertItem, CitizenReport } from '../types';

const resolveBrokerUrl = (): string | null => {
  const env = (import.meta as any).env || {};
  const customWs = env.VITE_WS_URL;
  if (customWs && typeof customWs === 'string' && customWs.trim()) {
    return customWs.trim();
  }

  const customHttp = env.VITE_API_BASE_URL || env.VITE_API_URL || env.VITE_BACKEND_URL;
  if (customHttp && typeof customHttp === 'string' && customHttp.trim()) {
    const url = customHttp.trim();
    if (url.startsWith('https://')) return url.replace('https://', 'wss://') + '/ws';
    if (url.startsWith('http://')) return url.replace('http://', 'ws://') + '/ws';
  }

  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    if (host === 'localhost' || host === '127.0.0.1') {
      return 'ws://localhost:8080/ws';
    }
  }
  return null;
};

export function useLiveFeed(
  onAlert: (alert: AlertItem) => void,
  onReport: (report: CitizenReport) => void
) {
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const brokerURL = resolveBrokerUrl();
    if (!brokerURL) {
      return;
    }

    const client = new Client({
      brokerURL,
      reconnectDelay: 5000,
      onConnect: () => {
        setConnected(true);
        client.subscribe('/topic/alerts', (message) => {
          onAlert(JSON.parse(message.body));
        });
        client.subscribe('/topic/reports', (message) => {
          onReport(JSON.parse(message.body));
        });
      },
      onDisconnect: () => setConnected(false),
      onWebSocketError: () => setConnected(false)
    });

    client.activate();
    return () => {
      client.deactivate();
    };
  }, [onAlert, onReport]);

  return { connected };
}
