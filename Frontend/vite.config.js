import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  preview: {
    host: '0.0.0.0',
    port: 4173,
  },
  build: {
    target: 'es2020',
    minify: 'esbuild',          // fast + tree-shakes; default but explicit
    cssMinify: 'lightningcss',
    sourcemap: false,
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        // Split heavy vendors into long-cacheable chunks so users only
        // re-download what actually changed between deploys.
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'motion-vendor': ['framer-motion'],
          'icons-vendor': ['lucide-react'],
          'charts-vendor': ['recharts'],
          'form-vendor': ['react-hook-form'],
          'http-vendor': ['axios'],
          'helmet-vendor': ['react-helmet-async'],
        },
      },
    },
  },
})
