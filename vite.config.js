import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    proxy: {
      '/api/mask-detect': {
        target: 'http://127.0.0.1:8001',
        changeOrigin: true,
      },
      '/tasks': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
    },
  },
})
