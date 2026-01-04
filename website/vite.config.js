import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: process.env.NODE_ENV === 'production' ? '/leet-terminal/' : '/',
  server: {
    host: true, // Listen on all addresses
    allowedHosts: [
      '602bbd8f7052.ngrok-free.app',
      '.ngrok-free.app', // Allow all ngrok subdomains
      '.ngrok.io', // Allow legacy ngrok domains
    ],
    proxy: {
      '/api/polymarket': {
        target: 'https://gamma-api.polymarket.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/polymarket/, ''),
        secure: true,
      },
    },
  },
})

