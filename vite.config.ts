import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'The Press',
        short_name: 'The Press',
        description: 'A daily letterpress word puzzle. Find every word hidden in today\'s seven letters.',
        theme_color: '#8B2500',
        background_color: '#F5F0E8',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        scope: '/',
        icons: [
          { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg}'],
        runtimeCaching: [
          {
            // Puzzle schedule: check network first so today's puzzle is always fresh
            urlPattern: /\/schedule\.json$/,
            handler: 'NetworkFirst',
            options: { cacheName: 'puzzle-data', networkTimeoutSeconds: 5 },
          },
          {
            // Dictionary: use NetworkFirst so word list updates are picked up on next load
            urlPattern: /\/dictionary\.json$/,
            handler: 'NetworkFirst',
            options: { cacheName: 'dictionary', networkTimeoutSeconds: 5 },
          },
          {
            // Google Fonts
            urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\//,
            handler: 'CacheFirst',
            options: { cacheName: 'google-fonts', expiration: { maxAgeSeconds: 60 * 60 * 24 * 365 } },
          },
        ],
      },
    }),
  ],
  // VITE_BASE is set to / for custom domain (thepress.app).
  base: process.env.VITE_BASE ?? '/',
});
