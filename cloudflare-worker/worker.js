/**
 * Cloudflare Worker - CORS Proxy for Leet Terminal
 * 
 * Deploy: npx wrangler deploy
 * Or paste into Cloudflare Dashboard > Workers > Create Worker
 * 
 * Usage: https://your-worker.your-subdomain.workers.dev/?url=https://api.example.com/endpoint
 */

// Default origins - can be extended via ALLOWED_ORIGINS env var in wrangler.toml
const DEFAULT_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:3000',
];

function getAllowedOrigins(env) {
  const origins = [...DEFAULT_ORIGINS];
  // Add production origins from environment variable (comma-separated)
  if (env?.ALLOWED_ORIGINS) {
    const customOrigins = env.ALLOWED_ORIGINS.split(',').map(o => o.trim()).filter(Boolean);
    origins.push(...customOrigins);
  }
  return origins;
}

const ALLOWED_API_HOSTS = [
  'gamma-api.polymarket.com',
  'clob.polymarket.com',
  'api.elections.kalshi.com',
  'trading-api.kalshi.com',
  'newsapi.org',
  'gnews.io',
  'api.parallel.ai',
];

// Rate limiting (per IP, per minute)
const RATE_LIMIT = 100;
const rateLimitMap = new Map();

function isRateLimited(ip) {
  const now = Date.now();
  const windowStart = now - 60000; // 1 minute window
  
  let requests = rateLimitMap.get(ip) || [];
  requests = requests.filter(t => t > windowStart);
  
  if (requests.length >= RATE_LIMIT) {
    return true;
  }
  
  requests.push(now);
  rateLimitMap.set(ip, requests);
  
  // Cleanup old entries periodically
  if (Math.random() < 0.01) {
    for (const [key, times] of rateLimitMap.entries()) {
      if (times.every(t => t < windowStart)) {
        rateLimitMap.delete(key);
      }
    }
  }
  
  return false;
}

function getCorsHeaders(origin, env) {
  const allowedOrigins = getAllowedOrigins(env);
  const allowedOrigin = allowedOrigins.includes(origin) ? origin : allowedOrigins[0];
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
    'Access-Control-Max-Age': '86400',
  };
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const origin = request.headers.get('Origin') || '';
    const corsHeaders = getCorsHeaders(origin, env);
    
    // Handle preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders });
    }
    
    // Get target URL
    const targetUrl = url.searchParams.get('url');
    if (!targetUrl) {
      return new Response(JSON.stringify({ error: 'Missing url parameter' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    // Validate target host
    let targetHost;
    try {
      targetHost = new URL(targetUrl).hostname;
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid url parameter' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    if (!ALLOWED_API_HOSTS.some(h => targetHost.endsWith(h))) {
      return new Response(JSON.stringify({ error: 'Host not allowed' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    // Rate limiting
    const clientIP = request.headers.get('CF-Connecting-IP') || 'unknown';
    if (isRateLimited(clientIP)) {
      return new Response(JSON.stringify({ error: 'Rate limited' }), {
        status: 429,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    // Forward request
    try {
      const fetchOptions = {
        method: request.method,
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'LeetTerminal/1.0',
        },
      };
      
      // Forward body for POST/PUT
      if (['POST', 'PUT', 'PATCH'].includes(request.method)) {
        fetchOptions.body = await request.text();
        fetchOptions.headers['Content-Type'] = request.headers.get('Content-Type') || 'application/json';
      }
      
      const response = await fetch(targetUrl, fetchOptions);
      const body = await response.text();
      
      return new Response(body, {
        status: response.status,
        headers: {
          ...corsHeaders,
          'Content-Type': response.headers.get('Content-Type') || 'application/json',
          'X-Proxy-Status': 'success',
        },
      });
    } catch (error) {
      return new Response(JSON.stringify({ error: 'Proxy fetch failed', message: error.message }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  },
};
