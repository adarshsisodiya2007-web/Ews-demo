/**
 * usePermissions — Manages Browser Notification + Geolocation permissions
 * SIH 2026 EWS-NER Early Warning System
 */
import { useState, useEffect, useCallback } from 'react';

export type PermissionStatus = 'unknown' | 'granted' | 'denied' | 'prompt';

export interface UserLocation {
  lat: number;
  lon: number;
  accuracy: number;
  detectedZone: string;
}

export interface PermissionsState {
  notification: PermissionStatus;
  location: PermissionStatus;
  userLocation: UserLocation | null;
  locationError: string | null;
  requestNotification: () => Promise<void>;
  requestLocation: () => Promise<void>;
  requestAll: () => Promise<void>;
}

/** Detect nearest EWS zone from GPS coordinates */
function detectNearestZone(lat: number, lon: number): string {
  const zones = [
    { name: 'Meppadi, Wayanad', lat: 11.5534, lon: 76.1320, radius: 0.5 },
    { name: 'Munnar, Idukki', lat: 10.0889, lon: 77.0595, radius: 0.5 },
    { name: 'Guwahati Hills, Assam', lat: 26.1445, lon: 91.7362, radius: 0.8 },
    { name: 'Shillong Ridge, Meghalaya', lat: 25.5788, lon: 91.8933, radius: 0.6 },
    { name: 'Aizawl Slopes, Mizoram', lat: 23.7271, lon: 92.7176, radius: 0.6 },
    { name: 'Kohima, Nagaland', lat: 25.6751, lon: 94.1086, radius: 0.5 },
    { name: 'Itanagar, Arunachal Pradesh', lat: 27.0844, lon: 93.6053, radius: 0.8 },
  ];

  let nearest = 'Unknown Region (Monitoring Active)';
  let minDist = Infinity;

  for (const z of zones) {
    const dist = Math.sqrt(Math.pow(lat - z.lat, 2) + Math.pow(lon - z.lon, 2));
    if (dist < minDist) {
      minDist = dist;
      nearest = dist < 2.0 ? z.name : `Coordinates (${lat.toFixed(3)}, ${lon.toFixed(3)})`;
    }
  }

  return nearest;
}

export function usePermissions(): PermissionsState {
  const [notification, setNotification] = useState<PermissionStatus>('unknown');
  const [location, setLocation] = useState<PermissionStatus>('unknown');
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);

  // Check existing permission states on mount
  useEffect(() => {
    // Check notification permission
    if ('Notification' in window) {
      setNotification(Notification.permission as PermissionStatus);
    }

    // Check geolocation permission via Permissions API (if supported)
    if (navigator.permissions) {
      navigator.permissions.query({ name: 'geolocation' }).then((result) => {
        setLocation(result.state as PermissionStatus);
        result.onchange = () => setLocation(result.state as PermissionStatus);
      });
    }

    // Try to restore saved location from sessionStorage
    const saved = sessionStorage.getItem('ews_user_location');
    if (saved) {
      try { setUserLocation(JSON.parse(saved)); } catch {}
    }
  }, []);

  const requestNotification = useCallback(async () => {
    if (!('Notification' in window)) {
      setNotification('denied');
      return;
    }
    const result = await Notification.requestPermission();
    setNotification(result as PermissionStatus);
  }, []);

  const requestLocation = useCallback(async () => {
    if (!navigator.geolocation) {
      setLocation('denied');
      setLocationError('Geolocation not supported by your browser.');
      return;
    }

    setLocation('prompt');
    return new Promise<void>((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const loc: UserLocation = {
            lat: pos.coords.latitude,
            lon: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
            detectedZone: detectNearestZone(pos.coords.latitude, pos.coords.longitude),
          };
          setUserLocation(loc);
          setLocation('granted');
          setLocationError(null);
          sessionStorage.setItem('ews_user_location', JSON.stringify(loc));
          resolve();
        },
        (err) => {
          setLocation('denied');
          setLocationError(err.message || 'Location access denied.');
          resolve();
        },
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 }
      );
    });
  }, []);

  const requestAll = useCallback(async () => {
    await requestNotification();
    await requestLocation();
  }, [requestNotification, requestLocation]);

  return { notification, location, userLocation, locationError, requestNotification, requestLocation, requestAll };
}
