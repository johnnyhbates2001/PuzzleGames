import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  server: {
    // Pre-transforms the app shell + every game's entry page on dev-server startup
    // instead of on the first request that needs them — without this, the very first
    // navigation into a route pays for esbuild dep pre-bundling AND on-demand
    // transformation of that whole import chain at once, which is what made the very
    // first Queens level load feel slow (dev-only; `vite build` is unaffected).
    warmup: {
      clientFiles: [
        './src/main.tsx',
        './src/App.tsx',
        './src/pages/HomePage.tsx',
        './src/pages/DifficultyPage.tsx',
        './src/pages/GamePage.tsx',
        './src/pages/SudokuDifficultyPage.tsx',
        './src/pages/SudokuGamePage.tsx',
      ],
    },
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'prompt',
      // We register the service worker ourselves via virtual:pwa-register/react
      // (see src/components/UpdateToast.tsx) so the plugin shouldn't also inject
      // its own auto-registration script.
      injectRegister: false,
      devOptions: { enabled: true },
      workbox: {
        skipWaiting: false,
        clientsClaim: false,
        // Level banks are imported as JS modules (see src/games/queensLevels.ts), so
        // Vite emits them as ordinary code-split .js chunks already covered here —
        // no separate precache entry is needed for them.
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
      },
      manifest: {
        name: 'Queens Puzzle',
        short_name: 'Queens',
        description: 'An offline-first colored-region Queens puzzle.',
        display: 'standalone',
        start_url: '/',
        theme_color: '#8E57D8',
        background_color: '#8E57D8',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
})
