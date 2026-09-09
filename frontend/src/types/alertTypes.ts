export type AlertSeverity = 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
export type AlertStatus = 'PENDING' | 'SENT' | 'FAILED' | 'ACTIVE' | 'RESOLVED' | 'EXPIRED';
export type AlertScope = 'EXACT_REGION' | 'DISTRICT' | 'STATE';
export type AlertType = 'LANDSLIDE' | 'FLOOD' | 'EARTHQUAKE' | 'OTHER';

export interface ResponderAlert {
  id: string;
  title: string;
  description: string;
  severity: AlertSeverity;
  status: AlertStatus;
  scope: AlertScope;
  alertType: AlertType;
  regionId?: string;
  locationName?: string;
  district?: string;
  state?: string;
  lat?: number;
  lng?: number;
  createdBy?: string;
  createdAt: string;
  updatedAt?: string;
  startTime?: string;
  expiryTime?: string;
}

export interface CreateAlertPayload {
  title: string;
  description: string;
  severity: AlertSeverity;
  scope: AlertScope;
  alertType: AlertType;
  regionId?: string;
  locationName?: string;
  district?: string;
  state?: string;
  lat?: number;
  lng?: number;
  startTime?: string;
  expiryTime?: string;
}

export const SEVERITY_CONFIG: Record<AlertSeverity, {
  color: string;
  bg: string;
  border: string;
  icon: string;
  label: string;
  textColor: string;
}> = {
  CRITICAL: {
    color: '#ef4444',
    bg: 'rgba(239,68,68,0.15)',
    border: 'rgba(239,68,68,0.5)',
    icon: '🚨',
    label: 'CRITICAL',
    textColor: '#fca5a5',
  },
  HIGH: {
    color: '#f97316',
    bg: 'rgba(249,115,22,0.15)',
    border: 'rgba(249,115,22,0.5)',
    icon: '⚠️',
    label: 'HIGH',
    textColor: '#fdba74',
  },
  MODERATE: {
    color: '#eab308',
    bg: 'rgba(234,179,8,0.15)',
    border: 'rgba(234,179,8,0.5)',
    icon: '⚡',
    label: 'MODERATE',
    textColor: '#fde047',
  },
  LOW: {
    color: '#3b82f6',
    bg: 'rgba(59,130,246,0.15)',
    border: 'rgba(59,130,246,0.5)',
    icon: 'ℹ️',
    label: 'LOW',
    textColor: '#93c5fd',
  },
};
