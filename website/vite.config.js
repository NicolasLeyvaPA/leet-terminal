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
      // Crypto exchange proxies for arbitrage bot
      '/api/binance': {
        target: 'https://api.binance.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/binance/, ''),
        secure: true,
      },
      '/api/kraken': {
        target: 'https://api.kraken.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/kraken/, ''),
        secure: true,
      },
      '/api/kucoin': {
        target: 'https://api.kucoin.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/kucoin/, ''),
        secure: true,
      },
      '/api/bybit': {
        target: 'https://api.bybit.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/bybit/, ''),
        secure: true,
      },
      '/api/coinbase': {
        target: 'https://api.coinbase.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/coinbase/, ''),
        secure: true,
      },
    },
  },
})
