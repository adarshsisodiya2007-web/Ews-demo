/**
 * notificationService — Browser Push Notification service
 * Sends critical disaster alerts as system notifications
 * SIH 2026 EWS-NER
 */

export interface EWSNotificationPayload {
  title: string;
  body: string;
  level: 'RED' | 'AMBER' | 'GREEN';
  zone?: string;
  action?: string;
}

const ICON_URL = '/manifest-icon-192.maskable.png';
const BADGE_URL = '/manifest-icon-192.maskable.png';

/** Send a browser push notification for critical alerts */
export async function sendCriticalNotification(payload: EWSNotificationPayload): Promise<boolean> {
  if (!('Notification' in window)) return false;

  // Request permission if not yet granted
  if (Notification.permission === 'default') {
    const perm = await Notification.requestPermission();
    if (perm !== 'granted') return false;
  }

  if (Notification.permission !== 'granted') return false;

  const levelEmoji = payload.level === 'RED' ? '🚨' : payload.level === 'AMBER' ? '⚠️' : '✅';

  const notification = new Notification(`${levelEmoji} ${payload.title}`, {
    body: payload.body,
    icon: ICON_URL,
    badge: BADGE_URL,
    tag: `ews-${payload.level}-${Date.now()}`,
    requireInteraction: payload.level === 'RED', // RED alerts require user interaction to dismiss
    silent: false,
    data: {
      level: payload.level,
      zone: payload.zone,
      timestamp: new Date().toISOString(),
    },
  });

  notification.onclick = () => {
    window.focus();
    notification.close();
  };

  // Auto-close AMBER/GREEN after 8s; RED stays until user dismisses
  if (payload.level !== 'RED') {
    setTimeout(() => notification.close(), 8000);
  }

  return true;
}

/** Send zone-specific alert based on risk assessment */
export async function sendRiskAlert(params: {
  zone: string;
  level: 'RED' | 'AMBER' | 'GREEN';
  score: number;
  action: string;
  rain24h: number;
}): Promise<void> {
  const { zone, level, score, action, rain24h } = params;

  if (level === 'RED') {
    await sendCriticalNotification({
      title: `CRITICAL LANDSLIDE ALERT — ${zone}`,
      body: `AI Risk Score: ${(score * 100).toFixed(0)}% | Rain: ${rain24h}mm/24h | ${action}`,
      level: 'RED',
      zone,
      action,
    });
  } else if (level === 'AMBER') {
    await sendCriticalNotification({
      title: `⚠️ Warning — ${zone}`,
      body: `Elevated Landslide Risk (${(score * 100).toFixed(0)}%). Monitor conditions closely.`,
      level: 'AMBER',
      zone,
    });
  }
}

/** Check if notification is supported and permitted */
export function getNotificationStatus(): 'supported_granted' | 'supported_prompt' | 'supported_denied' | 'unsupported' {
  if (!('Notification' in window)) return 'unsupported';
  if (Notification.permission === 'granted') return 'supported_granted';
  if (Notification.permission === 'denied') return 'supported_denied';
  return 'supported_prompt';
}
