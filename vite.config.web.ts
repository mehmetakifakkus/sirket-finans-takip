import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

/**
 * Vite configuration for Web (browser) build
 * Excludes Electron plugins, outputs to dist-web
 */
export default defineConfig({
  plugins: [react()],
  define: {
    'import.meta.env.VITE_PLATFORM': JSON.stringify('web'),
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    outDir: 'dist-web',
    emptyOutDir: true,
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8888',
        changeOrigin: true,
        rewrite: (path) => `/ci4-api/public/index.php${path}`,
      },
    },
  },
})
