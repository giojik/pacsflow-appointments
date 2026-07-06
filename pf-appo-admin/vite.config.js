import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    allowedHosts: ["booking.innovamedical.ge", "booking.innovainvitro.ge"],
    proxy: {
      '/api': {
        target: 'http://localhost:8001',
        changeOrigin: false,
      },
      '/static': {
        target: 'http://localhost:8001',
        changeOrigin: false,
      }
    }
  }
})