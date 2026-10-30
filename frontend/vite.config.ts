import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    // En desarrollo, /api se redirige al backend de Spring Boot
    proxy: {
      '/api': 'http://localhost:8001',
    },
  },
})
