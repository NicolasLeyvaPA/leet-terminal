# Leet Terminal CORS Proxy

Cloudflare Worker that proxies API requests to avoid CORS issues.

## Quick Deploy

### Option 1: Wrangler CLI
```bash
npm install -g wrangler
wrangler login
wrangler deploy
```

### Option 2: Dashboard
1. Go to https://dash.cloudflare.com
2. Workers & Pages → Create Application → Create Worker
3. Paste contents of `worker.js`
4. Deploy

## Usage

After deploy, you'll get a URL like:
`https://leet-terminal-proxy.your-subdomain.workers.dev`

Set this in your `.env`:
```
VITE_CORS_PROXY_URL=https://leet-terminal-proxy.your-subdomain.workers.dev
```

## Features

- ✅ Rate limiting (100 req/min per IP)
- ✅ Host allowlist (only approved APIs)
- ✅ Origin allowlist (only your domains)
- ✅ Free tier: 100k requests/day

## Allowed APIs

- Polymarket (gamma-api, clob)
- Kalshi (elections, trading)
- Manifold Markets
- NewsAPI
- GNews
