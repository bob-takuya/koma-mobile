import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    vueDevTools(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/.*\.execute-api\..*\.amazonaws\.com\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 5, // 5分
              },
            },
          },
        ],
      },
      manifest: {
        name: 'StopMotion Collaborator',
        short_name: 'StopMotion',
        description: '協働ストップモーションアニメーション制作アプリ',
        theme_color: '#667eea',
        background_color: '#667eea',
        display: 'standalone',
        orientation: 'landscape',
        icons: [
          {
            src: 'favicon.ico',
            sizes: '64x64 32x32 24x24 16x16',
            type: 'image/x-icon',
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 5173,
  },
  // GitHub Pages用の設定
  base: process.env.NODE_ENV === 'production' ? '/koma-mobile/' : '/',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
  },
})
