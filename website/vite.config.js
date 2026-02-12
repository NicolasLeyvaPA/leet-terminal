import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: process.env.NODE_ENV === 'production' ? '/leet-terminal/' : '/',
  server: {
    host: true, // Listen on all addresses
    allowedHosts: [
      '.ngrok-free.app', // Allow all ngrok subdomains
      '.ngrok.io', // Allow legacy ngrok domains
      'localhost',
    ],
    proxy: {
      '/api/polymarket': {
        target: 'https://gamma-api.polymarket.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/polymarket/, ''),
        secure: true,
        configure: (proxy, options) => {
          proxy.on('error', (err, req, res) => {
            console.warn('Polymarket proxy error:', err.message);
          });
          proxy.on('proxyReq', (proxyReq, req, res) => {
            proxyReq.setHeader('Accept', 'application/json');
          });
        },
      },
      '/api/clob': {
        target: 'https://clob.polymarket.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/clob/, ''),
        secure: true,
        configure: (proxy, options) => {
          proxy.on('error', (err, req, res) => {
            console.warn('CLOB proxy error:', err.message);
          });
          proxy.on('proxyReq', (proxyReq, req, res) => {
            proxyReq.setHeader('Accept', 'application/json');
          });
        },
      },
      '/api/kalshi': {
        target: 'https://api.elections.kalshi.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/kalshi/, ''),
        secure: true,
        configure: (proxy, options) => {
          proxy.on('error', (err, req, res) => {
            console.warn('Kalshi proxy error:', err.message);
          });
          proxy.on('proxyReq', (proxyReq, req, res) => {
            proxyReq.setHeader('Accept', 'application/json');
          });
        },
      },
    },
  },
})
