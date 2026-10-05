import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

/**
 * App version: major.minor come from package.json (bump them by hand for big changes),
 * the last number is the git commit count, so each commit gets a new version on its own.
 */
function getAppVersion(): string {
  const { version } = JSON.parse(readFileSync('./package.json', 'utf-8')) as { version: string };
  const [major, minor] = version.split('.');
  let commitCount = '0';
  try {
    commitCount = execSync('git rev-list --count HEAD').toString().trim();
  } catch {
    // Not built from a git checkout: keep 0
  }
  return `${major}.${minor}.${commitCount}`;
}

export default defineConfig({
  base: '/FFAM_Competitions/',
  define: {
    __APP_VERSION__: JSON.stringify(getAppVersion()),
  },
  plugins: [
    VitePWA({
      // A new version waits until the user applies it from the update banner
      registerType: 'prompt',
      injectRegister: false, // Registered by the app (UpdateBanner.ts)
      manifest: {
        name: 'FFAM Competitions',
        short_name: 'FFAM',
        description: 'Scoring app for aeromodelling competitions',
        theme_color: '#1a73e8',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/FFAM_Competitions/',
        scope: '/FFAM_Competitions/',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            // Same scene with extra margin, so round launcher masks keep both aircraft whole
            src: 'maskable-icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          }
        ]
      }
    })
  ],
  build: {
    outDir: 'dist',
    sourcemap: true
  },
  test: {
    globals: true,
    environment: 'node'
  }
});
