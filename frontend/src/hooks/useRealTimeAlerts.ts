import { useEffect, useRef, useState, useCallback } from 'react';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { ResponderAlert } from '../types/alertTypes';
import { fetchActiveAlertsForLocation, alertMatchesLocation } from '../services/alertService';

const resolveWsBase = (): string => {
  const env = (import.meta as any).env || {};
  const apiBase =
    env.VITE_API_BASE_URL ||
    env.VITE_API_URL ||
    env.VITE_BACKEND_URL ||
    'https://ews-backend-gateway-vck8.onrender.com';
  // Convert https:// to wss:// for WebSocket
  return apiBase.replace(/^http/, 'ws');
};

interface UseRealTimeAlertsOptions {
  regionId?: string;
  district?: string;
  state?: string;
  targetRegion?: string;
  enabled?: boolean;
}

export function useRealTimeAlerts({
  regionId,
  district,
  state,
  targetRegion,
  enabled = true,
}: UseRealTimeAlertsOptions) {
  const [alerts, setAlerts] = useState<ResponderAlert[]>([]);
  const [newAlert, setNewAlert] = useState<ResponderAlert | null>(null);
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const stompRef = useRef<Client | null>(null);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Load initial alerts from REST API / Local Storage
  const loadAlerts = useCallback(async () => {
    try {
      const data = await fetchActiveAlertsForLocation(regionId, district, state, targetRegion);
      setAlerts(data);
    } catch (e) {
      console.warn('Failed to load alerts:', e);
    } finally {
      setLoading(false);
    }
  }, [regionId, district, state, targetRegion]);

  // Setup WebSocket/STOMP connection
  useEffect(() => {
    if (!enabled) return;
    loadAlerts();

    let stomp: Client | null = null;

    const startPolling = () => {
      if (pollIntervalRef.current) return;
      pollIntervalRef.current = setInterval(loadAlerts, 15000);
    };

    const connectWebSocket = () => {
      try {
        const apiBase = ((import.meta as any).env?.VITE_API_BASE_URL ||
          (import.meta as any).env?.VITE_API_URL ||
          'https://ews-backend-gateway-vck8.onrender.com');

        const client = new Client({
          webSocketFactory: () => new SockJS(`${apiBase}/ws`),
          reconnectDelay: 5000,
          onConnect: () => {
            setConnected(true);
            client.subscribe('/topic/responder-alerts', (message: any) => {
              try {
                const alert: ResponderAlert = JSON.parse(message.body);
                const matches = alertMatchesLocation(alert, regionId, district, state);

                if (alert.status === 'ACTIVE' && matches) {
                  setAlerts(prev => {
                    const exists = prev.find(a => a.id === alert.id);
                    if (exists) return prev.map(a => a.id === alert.id ? alert : a);
                    return [alert, ...prev];
                  });
                  setNewAlert(alert);  // Trigger notification
                } else if (alert.status === 'RESOLVED' || alert.status === 'EXPIRED') {
                  setAlerts(prev => prev.filter(a => a.id !== alert.id));
                }
              } catch (e) {
                console.error('Failed to parse alert message:', e);
              }
            });
          },
          onDisconnect: () => {
            setConnected(false);
            startPolling();
          },
          onStompError: () => {
            setConnected(false);
            startPolling();
          },
        });

        stompRef.current = client;
        client.activate();
      } catch (err) {
        console.warn('WebSocket setup failed — using polling:', err);
        startPolling();
      }
    };

    const handleIncomingAlert = (alert: ResponderAlert) => {
      const matches = alertMatchesLocation(alert, regionId, district, state, targetRegion);
      if (alert.status === 'ACTIVE' && matches) {
        setAlerts(prev => {
          const exists = prev.find(a => a.id === alert.id);
          if (exists) return prev.map(a => a.id === alert.id ? alert : a);
          return [alert, ...prev];
        });
        setNewAlert(alert); // Trigger notification & audio siren
      } else if (alert.status === 'RESOLVED' || alert.status === 'EXPIRED') {
        setAlerts(prev => prev.filter(a => a.id !== alert.id));
        setNewAlert(prev => (prev?.id === alert.id ? null : prev));
      }
    };

    // 1. Cross-tab BroadcastChannel for instant (<10ms) delivery between Officer and Citizen tabs
    let bc: BroadcastChannel | null = null;
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      bc = new BroadcastChannel('satark-alerts-channel');
      bc.onmessage = (msg) => {
        if (msg.data?.type === 'PUBLISHED' || msg.data?.type === 'UPDATED') {
          handleIncomingAlert(msg.data.data);
        } else if (msg.data?.type === 'DELETED') {
          const delId = msg.data.data?.id;
          setAlerts(p => p.filter(a => a.id !== delId));
          setNewAlert(p => p?.id === delId ? null : p);
        }
      };
    }

    // 2. In-window custom event listeners
    const onPublished = (e: any) => { if (e.detail) handleIncomingAlert(e.detail); };
    const onUpdated = (e: any) => { if (e.detail) handleIncomingAlert(e.detail); };
    const onDeleted = (e: any) => {
      if (e.detail?.id) {
        setAlerts(p => p.filter(a => a.id !== e.detail.id));
        setNewAlert(p => p?.id === e.detail.id ? null : p);
      }
    };
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'satark_published_responder_alerts' || e.key === 'satark_alert_broadcast_tick') {
        loadAlerts();
      }
    };

    window.addEventListener('satark-responder-alert-published', onPublished);
    window.addEventListener('satark-responder-alert-updated', onUpdated);
    window.addEventListener('satark-responder-alert-deleted', onDeleted);
    window.addEventListener('storage', onStorage);

    connectWebSocket();

    return () => {
      if (stompRef.current) {
        stompRef.current.deactivate();
        stompRef.current = null;
      }
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
      if (bc) {
        bc.close();
      }
      window.removeEventListener('satark-responder-alert-published', onPublished);
      window.removeEventListener('satark-responder-alert-updated', onUpdated);
      window.removeEventListener('satark-responder-alert-deleted', onDeleted);
      window.removeEventListener('storage', onStorage);
    };
  }, [enabled, regionId, district, state, targetRegion, loadAlerts]);

  const dismissNewAlert = useCallback(() => setNewAlert(null), []);

  return { alerts, newAlert, dismissNewAlert, connected, loading, reload: loadAlerts };
}
