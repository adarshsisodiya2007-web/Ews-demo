import { useState, useEffect } from 'react';
import { Client } from '@stomp/stompjs';
import { AlertItem, CitizenReport } from '../types';

export function useLiveFeed(
  onAlert: (alert: AlertItem) => void,
  onReport: (report: CitizenReport) => void
) {
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const client = new Client({
      brokerURL: 'ws://localhost:8080/ws',
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
