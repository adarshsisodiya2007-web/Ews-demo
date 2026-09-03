import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { ErrorBoundary } from './components/shared/ErrorBoundary'
import './tokens/design-tokens.css'
import './index.css'

// Purge any stale service worker caches to permanently fix the 5000ms old bundle in normal browsers
if (typeof window !== 'undefined') {
  const BUILD_VERSION = 'satark-v3-2026-prod';
  try {
    if (localStorage.getItem('satark_cache_ver') !== BUILD_VERSION) {
      if ('caches' in window) {
        caches.keys().then((keys) => {
          keys.forEach((key) => caches.delete(key));
        });
      }
      localStorage.setItem('satark_cache_ver', BUILD_VERSION);
    }
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then((regs) => {
        for (const reg of regs) {
          reg.update();
        }
      });
    }
  } catch {}
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
)
