import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true
      },
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
      manifest: {
        name: 'EWS-NER — Landslide Early Warning',
        short_name: 'EWS-NER',
        description: 'AI-Based Landslide Early Warning System for North Eastern India',
        start_url: '/report',
        display: 'standalone',
        background_color: '#1B222C',
        theme_color: '#1B222C',
        icons: []
      }
    })
  ],
});
