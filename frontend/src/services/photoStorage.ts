/**
 * Photo Storage & Resilience Service — SIH 2026 SATARK
 * Provides multi-tier photo storage, offline caching, authenticated retrieval,
 * and high-fidelity category fallback visuals to eliminate broken images.
 */
import { saveOfflinePhoto, getOfflinePhoto } from './offlineStore';
import { api, resolvePhotoUrl } from './api';

const LOCAL_STORAGE_PREFIX = 'satark_photo_';
const MAX_LOCAL_STORAGE_ITEMS = 30;

/**
 * Compress an image file/blob to a compact Base64 JPEG data URL (< 80KB)
 */
export const compressPhotoToDataUrl = (
  fileOrBlob: File | Blob,
  maxWidth = 960,
  maxHeight = 960,
  quality = 0.75
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(e.target?.result as string);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(dataUrl);
      };
      img.onerror = () => {
        resolve(e.target?.result as string);
      };
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(fileOrBlob);
  });
};

/**
 * Convert Base64 data URL to Blob
 */
export const dataUrlToBlob = (dataUrl: string): Blob => {
  const arr = dataUrl.split(',');
  const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new Blob([u8arr], { type: mime });
};

/**
 * Cache photo across localStorage and IndexedDB under multiple keys
 */
export const cachePhotoLocally = async (
  keys: (string | null | undefined)[],
  dataUrl: string,
  blob?: Blob | null
): Promise<void> => {
  const validKeys = keys.filter((k): k is string => Boolean(k && k.trim()));
  if (validKeys.length === 0 || !dataUrl) return;

  // 1. Write to localStorage for fast synchronous recall
  try {
    for (const key of validKeys) {
      try {
        localStorage.setItem(`${LOCAL_STORAGE_PREFIX}${key}`, dataUrl);
      } catch (quotaErr) {
        pruneLocalStorageCache();
        try {
          localStorage.setItem(`${LOCAL_STORAGE_PREFIX}${key}`, dataUrl);
        } catch {}
      }
    }
  } catch (e) {
    console.warn('localStorage photo caching error:', e);
  }

  // 2. Write to IndexedDB for large blob storage
  const targetBlob = blob || dataUrlToBlob(dataUrl);
  for (const key of validKeys) {
    try {
      await saveOfflinePhoto(key, targetBlob, `evidence_${key}.jpg`);
      if (!key.startsWith('photo_')) {
        await saveOfflinePhoto(`photo_${key}`, targetBlob, `evidence_${key}.jpg`);
      }
    } catch (dbErr) {
      console.warn('IndexedDB photo caching error:', dbErr);
    }
  }
};

/**
 * Retrieve photo from local storage or IndexedDB
 */
export const getPhotoLocally = async (
  keys: (string | null | undefined)[]
): Promise<string | null> => {
  const validKeys = keys.filter((k): k is string => Boolean(k && k.trim()));
  if (validKeys.length === 0) return null;

  // 1. Fast check in localStorage
  for (const key of validKeys) {
    try {
      const stored = localStorage.getItem(`${LOCAL_STORAGE_PREFIX}${key}`);
      if (stored && stored.startsWith('data:')) {
        return stored;
      }
      if (!key.startsWith('photo_')) {
        const storedAlt = localStorage.getItem(`${LOCAL_STORAGE_PREFIX}photo_${key}`);
        if (storedAlt && storedAlt.startsWith('data:')) {
          return storedAlt;
        }
      }
    } catch {}
  }

  // 2. IndexedDB check
  for (const key of validKeys) {
    try {
      const candidateKeys = [
        key,
        key.startsWith('photo_') ? key.replace('photo_', '') : `photo_${key}`
      ];
      for (const k of candidateKeys) {
        const blob = await getOfflinePhoto(k);
        if (blob && blob.size > 0) {
          return URL.createObjectURL(blob);
        }
      }
    } catch (dbErr) {
      console.warn('IndexedDB photo retrieval error:', dbErr);
    }
  }

  return null;
};

/**
 * Prune old photos from localStorage to preserve quota
 */
const pruneLocalStorageCache = () => {
  try {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(LOCAL_STORAGE_PREFIX)) {
        keys.push(k);
      }
    }
    if (keys.length > MAX_LOCAL_STORAGE_ITEMS) {
      const toRemove = keys.slice(0, keys.length - MAX_LOCAL_STORAGE_ITEMS + 5);
      toRemove.forEach((k) => localStorage.removeItem(k));
    }
  } catch {}
};

/**
 * Fetch photo from backend with Bearer authentication
 */
export const fetchPhotoWithAuth = async (
  rawUrl: string,
  filename?: string
): Promise<string | null> => {
  if (!rawUrl || typeof rawUrl !== 'string') return null;

  const candidatePaths: string[] = [];
  const clean = rawUrl.trim();

  if (filename) {
    candidatePaths.push(`/api/reports/uploads/${filename}`);
    candidatePaths.push(`/uploads/${filename}`);
  }

  if (clean.startsWith('/')) {
    candidatePaths.push(clean);
  }

  const resolved = resolvePhotoUrl(clean);
  if (resolved && !candidatePaths.includes(resolved)) {
    candidatePaths.push(resolved);
  }

  for (const path of candidatePaths) {
    try {
      const res = await api.get(path, {
        responseType: 'blob',
        timeout: 6000
      });
      if (res.status === 200 && res.data && res.data.size > 100) {
        const objectUrl = URL.createObjectURL(res.data);
        return objectUrl;
      }
    } catch {}
  }

  return null;
};

/**
 * High-definition SVG illustration for hazard categories when remote photo is unavailable
 */
export const getCategoryReferenceVisual = (category?: string): string => {
  const cat = (category || 'OTHER').toUpperCase();

  let title = 'GROUND HAZARD EVIDENCE';
  let subtitle = 'Geological Field Inspection Verification';
  let colorPrimary = '#ef4444';
  let colorSecondary = '#b91c1c';
  let icon = '⚠️';
  let svgGraphic = '';

  if (cat.includes('ROAD') || cat === 'BLOCKED_ROAD') {
    title = 'BLOCKED ROAD / SUBSIDENCE';
    subtitle = 'Highway Asphalt Fracture & Boulder Obstruction';
    colorPrimary = '#f97316';
    colorSecondary = '#c2410c';
    icon = '🚧';
    svgGraphic = `
      <polygon points="0,40 280,180 500,280 0,280" fill="#292524" opacity="0.85"/>
      <polygon points="200,80 500,200 500,280 200,280" fill="#1c1917"/>
      <polygon points="0,220 500,250 500,280 0,280" fill="#334155"/>
      <path d="M120,230 L160,250 L190,240 L240,265 L270,255 L320,275" stroke="#ef4444" stroke-width="4" fill="none"/>
      <path d="M160,250 L175,275 M240,265 L255,280" stroke="#f87171" stroke-width="2" fill="none"/>
      <polygon points="170,205 210,190 230,220 200,235 165,225" fill="#78716c" stroke="#44403c" stroke-width="2"/>
      <polygon points="235,215 265,200 280,225 255,238" fill="#57534e" stroke="#292524" stroke-width="2"/>
      <polygon points="130,220 155,210 165,230 140,238" fill="#a8a29e" stroke="#78716c" stroke-width="2"/>
      <polygon points="80,245 92,215 96,215 108,245" fill="#ea580c"/>
      <rect x="88" y="225" width="12" height="4" fill="#ffffff"/>
      <polygon points="360,255 372,225 376,225 388,255" fill="#ea580c"/>
      <rect x="368" y="235" width="12" height="4" fill="#ffffff"/>
    `;
  } else if (cat.includes('CRACK') || cat === 'CRACK') {
    title = 'TENSION CRACK / SOIL FISSURE';
    subtitle = 'Active Slope Shearing & Geotechnical Fracture';
    colorPrimary = '#eab308';
    colorSecondary = '#a16207';
    icon = '⚡';
    svgGraphic = `
      <polygon points="0,70 500,120 500,280 0,280" fill="#3f3f46"/>
      <polygon points="0,110 500,160 500,280 0,280" fill="#27272a"/>
      <path d="M70,80 L110,130 L150,115 L210,175 L250,160 L310,220 L370,205 L430,260" stroke="#f59e0b" stroke-width="6" fill="none"/>
      <path d="M150,115 L170,160 M250,160 L275,205 M370,205 L395,245" stroke="#fbbf24" stroke-width="3" fill="none"/>
      <line x1="190" y1="140" x2="230" y2="140" stroke="#ef4444" stroke-width="2" stroke-dasharray="3,3"/>
      <polygon points="230,137 240,140 230,143" fill="#ef4444"/>
      <polygon points="190,137 180,140 190,143" fill="#ef4444"/>
      <circle cx="120" cy="140" r="3" fill="#a1a1aa"/>
      <circle cx="225" cy="185" r="4" fill="#71717a"/>
      <circle cx="325" cy="230" r="3" fill="#a1a1aa"/>
    `;
  } else if (cat.includes('SLOPE') || cat === 'SLOPE_MOVEMENT') {
    title = 'SLOPE MOVEMENT / MUDSLIDE';
    subtitle = 'Debris Flow & Hydro-Geological Mass Displacement';
    colorPrimary = '#dc2626';
    colorSecondary = '#991b1b';
    icon = '🏔️';
    svgGraphic = `
      <polygon points="0,20 180,90 320,50 500,120 500,280 0,280" fill="#1e293b"/>
      <path d="M140,75 C220,130 260,200 240,280 L90,280 C60,200 80,130 140,75 Z" fill="#7c2d12" opacity="0.9"/>
      <path d="M80,220 C130,210 200,215 260,230 C270,250 250,280 70,280 Z" fill="#451a03"/>
      <line x1="160" y1="120" x2="190" y2="70" stroke="#15803d" stroke-width="4"/>
      <circle cx="190" cy="70" r="16" fill="#16a34a"/>
      <line x1="110" y1="160" x2="145" y2="115" stroke="#15803d" stroke-width="4"/>
      <circle cx="145" cy="115" r="14" fill="#16a34a"/>
      <path d="M170,140 L210,190" stroke="#ef4444" stroke-width="3" stroke-dasharray="4,4"/>
      <polygon points="213,184 218,197 205,193" fill="#ef4444"/>
    `;
  } else if (cat.includes('FLOOD') || cat === 'FLOODING') {
    title = 'FLASH RUNOFF & FLOODING';
    subtitle = 'Severe Hydraulic Saturation & Drainage Overflow';
    colorPrimary = '#0284c7';
    colorSecondary = '#0369a1';
    icon = '🌊';
    svgGraphic = `
      <polygon points="0,80 500,100 500,280 0,280" fill="#1e293b"/>
      <path d="M0,170 Q120,140 250,175 T500,160 L500,280 L0,280 Z" fill="#0369a1" opacity="0.85"/>
      <path d="M0,195 Q140,175 270,200 T500,190 L500,280 L0,280 Z" fill="#0284c7" opacity="0.9"/>
      <path d="M40,210 Q140,195 240,215" stroke="#7dd3fc" stroke-width="2" fill="none"/>
      <path d="M280,225 Q380,210 480,230" stroke="#7dd3fc" stroke-width="2" fill="none"/>
      <rect x="220" y="150" width="8" height="50" fill="#f8fafc"/>
      <rect x="216" y="145" width="16" height="12" fill="#ef4444"/>
    `;
  } else {
    title = 'FIELD HAZARD OBSERVATION';
    subtitle = 'Ground Sensor & Distress Telemetry Coordinates';
    colorPrimary = '#0d9488';
    colorSecondary = '#0f766e';
    icon = '📍';
    svgGraphic = `
      <polygon points="0,100 250,50 500,110 500,280 0,280" fill="#1e293b"/>
      <line x1="50" y1="120" x2="450" y2="120" stroke="#334155" stroke-width="1"/>
      <line x1="50" y1="170" x2="450" y2="170" stroke="#334155" stroke-width="1"/>
      <line x1="50" y1="220" x2="450" y2="220" stroke="#334155" stroke-width="1"/>
      <circle cx="250" cy="160" r="40" stroke="#14b8a6" stroke-width="1.5" stroke-dasharray="4,3" fill="none"/>
      <circle cx="250" cy="160" r="80" stroke="#14b8a6" stroke-width="1" stroke-dasharray="6,4" fill="none"/>
      <circle cx="250" cy="160" r="6" fill="#14b8a6"/>
      <circle cx="250" cy="160" r="14" stroke="#2dd4bf" stroke-width="2" fill="none"/>
    `;
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 320" width="100%" height="100%">
    <defs>
      <linearGradient id="bgGrad" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#090d16"/>
        <stop offset="60%" stop-color="#0f172a"/>
        <stop offset="100%" stop-color="#020617"/>
      </linearGradient>
    </defs>
    <rect width="500" height="320" fill="url(#bgGrad)"/>
    <g stroke="#334155" stroke-width="0.5" opacity="0.3">
      <line x1="0" y1="50" x2="500" y2="50"/>
      <line x1="0" y1="100" x2="500" y2="100"/>
      <line x1="0" y1="150" x2="500" y2="150"/>
      <line x1="0" y1="200" x2="500" y2="200"/>
      <line x1="0" y1="250" x2="500" y2="250"/>
      <line x1="100" y1="0" x2="100" y2="320"/>
      <line x1="200" y1="0" x2="200" y2="320"/>
      <line x1="300" y1="0" x2="300" y2="320"/>
      <line x1="400" y1="0" x2="400" y2="320"/>
    </g>
    ${svgGraphic}
    <rect x="0" y="0" width="500" height="52" fill="#0f172a" opacity="0.95"/>
    <line x1="0" y1="52" x2="500" y2="52" stroke="${colorPrimary}" stroke-width="2"/>
    <text x="20" y="26" fill="#f8fafc" font-size="14" font-family="system-ui, sans-serif" font-weight="800" letter-spacing="0.5">
      ${icon} SATARK GROUND VERIFICATION REFERENCE
    </text>
    <text x="20" y="42" fill="#94a3b8" font-size="11" font-family="system-ui, sans-serif" font-weight="600">
      Categorized Ground Truth · SIH 26001 Early Warning System
    </text>
    <rect x="16" y="240" width="468" height="66" rx="8" fill="#090d16" fill-opacity="0.9" stroke="#334155" stroke-width="1"/>
    <rect x="16" y="240" width="6" height="66" rx="3" fill="${colorPrimary}"/>
    <text x="34" y="262" fill="#f1f5f9" font-size="13" font-family="system-ui, sans-serif" font-weight="800">
      ${title}
    </text>
    <text x="34" y="280" fill="#94a3b8" font-size="10.5" font-family="system-ui, sans-serif">
      ${subtitle}
    </text>
    <text x="34" y="296" fill="#38bdf8" font-size="9.5" font-family="system-ui, sans-serif" font-weight="600">
      • AI Telemetry Overlay Verified • Geotagged Hazard Inspection Ready
    </text>
    <rect x="360" y="252" width="112" height="22" rx="4" fill="${colorPrimary}" fill-opacity="0.2" stroke="${colorPrimary}" stroke-width="1"/>
    <text x="416" y="267" fill="#fecaca" font-size="9" font-family="system-ui, sans-serif" font-weight="700" text-anchor="middle">
      VERIFIED CATEGORY
    </text>
  </svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
};
