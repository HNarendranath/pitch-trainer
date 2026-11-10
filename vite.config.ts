/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import basicSsl from '@vitejs/plugin-basic-ssl';
import { VitePWA } from 'vite-plugin-pwa';

const APP_NAME = 'Pitch Trainer';
const THEME = '#1d1412';

export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    // `npm run dev:phone` serves over self-signed HTTPS on the LAN: mic access
    // and service workers both require a secure context on a real phone.
    mode === 'https' && basicSsl(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: false, // registered from src/pwa.ts
      includeAssets: ['icons/*.png', 'icons/*.svg', 'favicon.ico'],
      manifest: {
        id: '/',
        name: APP_NAME,
        short_name: 'Pitch',
        description: 'Ear training: intervals, chords, perfect pitch, scale degrees, progressions and singing.',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait',
        background_color: THEME,
        theme_color: THEME,
        categories: ['music', 'education'],
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // App shell + the piano are precached so the app works offline from first load.
        // Other instruments are cached the first time they are used.
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}', 'samples/piano/*.mp3'],
        navigateFallback: 'index.html',
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.startsWith('/samples/'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'instrument-samples',
              expiration: { maxEntries: 400 },
              cacheableResponse: { statuses: [0, 200] },
              rangeRequests: true,
            },
          },
        ],
      },
    }),
  ],
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
}));
