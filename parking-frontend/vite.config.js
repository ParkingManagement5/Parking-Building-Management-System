import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath } from 'node:url'

const projectRoot = fileURLToPath(new URL('./', import.meta.url))

export default defineConfig({
  root: projectRoot,
  plugins: [
    react(),
    tailwindcss(),
  ],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  server: {
    host: '0.0.0.0',
    allowedHosts: true,
    proxy: {
      '/api': {
        target: 'http://localhost:8081',
        changeOrigin: true,
      }
    }
  }
})
