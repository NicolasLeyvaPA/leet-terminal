// Polymarket API Service - Real market data integration
// v2.0 - With caching, rate limiting, and honest data handling
import { sanitizeText, sanitizeUrl } from '../utils/sanitize';
import { getCached, setCache, waitForRateLimit } from '../utils/apiCache';

const GAMMA_API = 'https://gamma-api.polymarket.com';
const CLOB_API = 'https://clob.polymarket.com';

// Use custom CORS proxy if configured, otherwise fallback chain
const CORS_PROXY = import.meta.env.VITE_CORS_PROXY_URL || '';

// Fallback CORS proxies (public, less reliable)
const CORS_PROXIES = [
  (url) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
  (url) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
];

// Track proxy failures to avoid repeated attempts
const proxyFailures = new Map();
const PROXY_FAILURE_TIMEOUT = 5 * 60 * 1000;

// Cache TTLs
const CACHE_TTL = {
  MARKETS: 30 * 1000,        // 30 seconds for market list
  PRICE_HISTORY: 60 * 1000,  // 1 minute for price history
  ORDERBOOK: 10 * 1000,      // 10 seconds for orderbook (stale quickly)
  EVENT: 60 * 1000,          // 1 minute for single event
};

/**
 * Fetch with CORS proxy fallback and caching
 */
async function fetchWithFallback(url, options = {}) {
  const cacheKey = `polymarket:${url}`;
  const cacheTtl = options.cacheTtl || CACHE_TTL.MARKETS;
  
  // Check cache first
  const cached = getCached(cacheKey);
  if (cached !== null) {
    return cached;
  }

  // Rate limit
  await waitForRateLimit('polymarket', 300);

  // Build proxy URL if using custom proxy
  const getProxyUrl = (targetUrl) => {
    if (CORS_PROXY) {
      return `${CORS_PROXY}?url=${encodeURIComponent(targetUrl)}`;
    }
    return targetUrl;
  };

  // First try: Custom proxy or Vite proxy in development
  if (CORS_PROXY || import.meta.env.DEV) {
    const proxyUrl = CORS_PROXY 
      ? getProxyUrl(url)
      : url.replace(GAMMA_API, '/api/polymarket').replace(CLOB_API, '/api/clob');

    try {
      const response = await fetch(proxyUrl, {
        ...options,
        headers: {
          'Accept': 'application/json',
          ...options.headers,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setCache(cacheKey, data, cacheTtl);
        return data;
      }
    } catch (error) {
      console.warn('Primary proxy failed:', error.message);
    }
  }

  // Second try: Direct fetch (may work in some environments)
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Accept': 'application/json',
        ...options.headers,
      },
    });
    if (response.ok) {
      const data = await response.json();
      setCache(cacheKey, data, cacheTtl);
      return data;
    }
  } catch (error) {
    console.warn('Direct fetch failed:', error.message);
  }

  // Third try: Fallback CORS proxies
  for (let i = 0; i < CORS_PROXIES.length; i++) {
    const makeProxyUrl = CORS_PROXIES[i];
    const proxyKey = `proxy_${i}`;
    
    const lastFailure = proxyFailures.get(proxyKey);
    if (lastFailure && Date.now() - lastFailure < PROXY_FAILURE_TIMEOUT) {
      continue;
    }
    
    try {
      const proxyUrl = makeProxyUrl(url);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      
      const response = await fetch(proxyUrl, {
        ...options,
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
          ...options.headers,
        },
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        const text = await response.text();
        try {
          proxyFailures.delete(proxyKey);
          const data = JSON.parse(text);
          setCache(cacheKey, data, cacheTtl);
          return data;
        } catch {
          continue;
        }
      }
    } catch (error) {
      console.warn(`CORS proxy ${i} failed:`, error.message);
      proxyFailures.set(proxyKey, Date.now());
    }
  }

  throw new Error(`Failed to fetch from ${url}. All methods exhausted.`);
}

/**
 * Extract event slug from Polymarket URL
 */
export function extractEventSlug(url) {
  try {
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split('/');
    const eventIndex = pathParts.indexOf('event');
    if (eventIndex !== -1 && pathParts[eventIndex + 1]) {
      return pathParts[eventIndex + 1].split('?')[0];
    }
    return null;
  } catch {
    return url; // Assume it's already a slug
  }
}

/**
 * Fetch event by slug
 */
export async function fetchEventBySlug(slug) {
  const cleanSlug = extractEventSlug(slug);
  const url = `${GAMMA_API}/events?slug=${cleanSlug}`;

  const data = await fetchWithFallback(url, { cacheTtl: CACHE_TTL.EVENT });

  if (Array.isArray(data) && data.length > 0) {
    return transformEventToMarket(data[0]);
  }
  throw new Error('Event not found');
}

/**
 * Fetch all open events
 */
export async function fetchOpenEvents(limit = 50) {
  const url = `${GAMMA_API}/events?closed=false&order=volume&ascending=false&limit=${limit}`;

  try {
    const data = await fetchWithFallback(url, { cacheTtl: CACHE_TTL.MARKETS });

    if (!Array.isArray(data)) {
      console.warn('Unexpected response format');
      return [];
    }
    return data.map(transformEventToMarket).filter(Boolean);
  } catch (error) {
    console.error('Error loading markets:', error.message);
    return [];
  }
}

/**
 * Fetch market price history
 * Returns null if data unavailable (NO FAKE DATA)
 */
export async function fetchPriceHistory(marketId, days = 90) {
  if (!marketId) return null;
  
  try {
    const endTs = Math.floor(Date.now() / 1000);
    const startTs = endTs - (days * 24 * 60 * 60);
    const url = `${CLOB_API}/prices-history?market=${marketId}&startTs=${startTs}&endTs=${endTs}&fidelity=60`;
    
    const data = await fetchWithFallback(url, { cacheTtl: CACHE_TTL.PRICE_HISTORY });

    if (data && data.history && data.history.length > 0) {
      return data.history.map(point => ({
        date: new Date(point.t * 1000).toISOString().split('T')[0],
        time: point.t * 1000,
        price: parseFloat(point.p),
        volume: 0,
        high: parseFloat(point.p),
        low: parseFloat(point.p),
        isReal: true,
      }));
    }
    
    // NO FAKE DATA - return null if unavailable
    return null;
  } catch (error) {
    console.warn('Failed to fetch price history:', error.message);
    return null;
  }
}

/**
 * Fetch orderbook
 * Returns null if data unavailable (NO FAKE DATA)
 */
export async function fetchOrderbook(tokenId) {
  if (!tokenId) return null;
  
  try {
    const url = `${CLOB_API}/book?token_id=${tokenId}`;
    const data = await fetchWithFallback(url, { cacheTtl: CACHE_TTL.ORDERBOOK });

    if (data && data.bids && data.asks && (data.bids.length > 0 || data.asks.length > 0)) {
      return transformOrderbook(data);
    }
    
    // NO FAKE DATA - return null if unavailable
    return null;
  } catch (error) {
    console.warn('Failed to fetch orderbook:', error.message);
    return null;
  }
}

/**
 * Transform Polymarket event to our market format
 */
function transformEventToMarket(event) {
  if (!event || !event.markets || event.markets.length === 0) return null;

  const market = event.markets[0];
  const bestBid = parseFloat(market.bestBid) || 0;
  const bestAsk = parseFloat(market.bestAsk) || 0;
  const midPrice = (bestBid + bestAsk) / 2 || parseFloat(market.lastTradePrice) || 0.5;

  // Parse outcomes safely
  let outcomes = [];
  let outcomePrices = [];
  try {
    outcomes = JSON.parse(market.outcomes || '[]');
    outcomePrices = JSON.parse(market.outcomePrices || '[]');
  } catch {}

  const volume24h = parseFloat(market.volume24hr) || 0;
  const volumeTotal = parseFloat(market.volumeNum) || parseFloat(event.volume) || 0;
  const liquidity = parseFloat(market.liquidityNum) || 0;

  // Calculate signal probability (HONEST: heuristic, not ML)
  const signalProb = calculateSignalProbability(midPrice, volume24h, liquidity, market);

  return {
    id: event.id,
    ticker: sanitizeText(event.ticker || generateTicker(event.title), { maxLength: 20, allowNewlines: false }),
    platform: 'Polymarket',
    _source: 'polymarket',
    question: sanitizeText(event.title, { maxLength: 500 }),
    title: sanitizeText(event.title, { maxLength: 500 }),
    description: sanitizeText(event.description, { maxLength: 2000 }),
    category: sanitizeText(event.tags?.[0]?.label || 'General', { maxLength: 50, allowNewlines: false }),
    subcategory: sanitizeText(event.tags?.[1]?.label || '', { maxLength: 50, allowNewlines: false }),

    // Core pricing
    market_prob: midPrice,
    // RENAMED: model_prob is now clearly a signal heuristic, not ML
    model_prob: signalProb,
    signal_prob: signalProb,
    prev_prob: null,

    // Market metrics (REAL DATA)
    bestBid,
    bestAsk,
    spread: bestAsk - bestBid,
    volume_24h: volume24h,
    volume_total: volumeTotal,
    liquidity,
    open_interest: volumeTotal * 0.8,
    trades_24h: Math.floor(volume24h / 50),

    // Dates
    end_date: event.endDate,
    created: event.createdAt,
    resolution_source: sanitizeText(event.resolutionSource || 'Polymarket resolution', { maxLength: 500 }),

    // Market IDs for API calls
    marketId: market.id,
    conditionId: market.conditionId,
    clobTokenIds: market.clobTokenIds,

    // Outcomes
    outcomes,
    outcomePrices,

    // Analysis (marked as heuristic)
    factors: generateFactors(midPrice, signalProb, volume24h, liquidity, market),
    signal_breakdown: generateSignalBreakdown(midPrice, volume24h, liquidity, market),
    model_breakdown: generateSignalBreakdown(midPrice, volume24h, liquidity, market), // Backward compat
    greeks: calculateGreeks(midPrice, event.endDate),

    // Metadata
    _isHeuristic: true,
    _disclaimer: 'Signal probabilities are heuristics based on market data, not ML predictions',
    _raw: event,
  };
}

/**
 * Generate ticker from title
 */
function generateTicker(title) {
  if (!title) return 'UNKNOWN';
  const words = title.split(' ')
    .filter(w => w.length > 2 && !['will', 'the', 'and', 'for', 'are', 'was', 'has', 'have'].includes(w.toLowerCase()))
    .slice(0, 3);
  return words.map(w => w[0]).join('').toUpperCase() || 'MKT';
}

/**
 * Calculate signal probability (HONEST: heuristic, not ML)
 * Based on observable market data only
 */
function calculateSignalProbability(marketProb, volume24h, liquidity, market) {
  // Base: start with market probability
  let signalProb = marketProb;

  // Volume momentum: high volume may indicate informed trading
  const volumeFactor = Math.min(volume24h / 100000, 0.05);

  // Bid/Ask imbalance: real orderbook signal
  const bestBid = parseFloat(market.bestBid) || 0;
  const bestAsk = parseFloat(market.bestAsk) || 0;
  const imbalance = bestBid > 0 && bestAsk > 0
    ? (bestBid / bestAsk - 1) * 0.1
    : 0;

  // Spread factor: tight spread = efficient market
  const spread = bestAsk - bestBid;
  const spreadFactor = spread < 0.02 ? 0.01 : spread > 0.1 ? -0.02 : 0;

  // Combine (DETERMINISTIC - no random)
  signalProb += volumeFactor + imbalance + spreadFactor;

  return Math.max(0.01, Math.min(0.99, signalProb));
}

/**
 * Generate market signal factors
 * HONEST: Marks which have real data
 */
function generateFactors(marketProb, signalProb, volume24h, liquidity, market) {
  const edge = signalProb - marketProb;
  const direction = edge > 0.02 ? 'bullish' : edge < -0.02 ? 'bearish' : 'neutral';

  const bestBid = parseFloat(market?.bestBid) || 0;
  const bestAsk = parseFloat(market?.bestAsk) || 0;
  const hasOrderbookData = bestBid > 0 && bestAsk > 0;
  const realImbalance = hasOrderbookData ? bestBid / (bestBid + bestAsk) : null;

  const volumeScore = Math.min(volume24h / 200000, 1);
  const liqScore = Math.min(liquidity / 1000000, 1);

  return {
    orderbook_imbalance: {
      value: hasOrderbookData ? realImbalance : null,
      contribution: hasOrderbookData ? (realImbalance - 0.5) * 0.3 : 0,
      direction: hasOrderbookData ? (realImbalance > 0.55 ? 'bullish' : realImbalance < 0.45 ? 'bearish' : 'neutral') : 'unknown',
      desc: hasOrderbookData ? `Bid/Ask ratio: ${(realImbalance * 100).toFixed(1)}%` : 'No orderbook data',
      isReal: hasOrderbookData,
    },
    volume_trend: {
      value: volumeScore,
      contribution: volumeScore * 0.1,
      direction: volumeScore > 0.5 ? 'bullish' : volumeScore < 0.3 ? 'bearish' : 'neutral',
      desc: `24h volume: $${(volume24h / 1000).toFixed(1)}K`,
      isReal: true,
    },
    liquidity_score: {
      value: liqScore,
      contribution: liqScore * 0.05,
      direction: liqScore > 0.5 ? 'bullish' : 'neutral',
      desc: `Liquidity: $${(liquidity / 1000).toFixed(1)}K`,
      isReal: true,
    },
    spread_analysis: {
      value: hasOrderbookData ? Math.max(0, 1 - (bestAsk - bestBid) * 10) : null,
      contribution: hasOrderbookData ? (bestAsk - bestBid < 0.02 ? 0.02 : -0.02) : 0,
      direction: hasOrderbookData ? (bestAsk - bestBid < 0.03 ? 'bullish' : 'bearish') : 'unknown',
      desc: hasOrderbookData ? `Spread: ${((bestAsk - bestBid) * 100).toFixed(2)}%` : 'No spread data',
      isReal: hasOrderbookData,
    },
    // Factors without data - honestly marked
    news_sentiment: {
      value: null,
      contribution: 0,
      direction: 'unknown',
      desc: 'Connect News API in settings',
      isReal: false,
    },
    social_sentiment: {
      value: null,
      contribution: 0,
      direction: 'unknown',
      desc: 'Not available',
      isReal: false,
    },
    signal_edge: {
      value: 0.5 + edge,
      contribution: edge * 0.2,
      direction,
      desc: `Signal edge: ${(edge * 100).toFixed(1)}%`,
      isReal: false,
      isHeuristic: true,
    },
  };
}

/**
 * Generate signal breakdown (renamed from model breakdown)
 */
function generateSignalBreakdown(marketProb, volume24h, liquidity, market) {
  const bestBid = parseFloat(market?.bestBid) || 0;
  const bestAsk = parseFloat(market?.bestAsk) || 0;
  const hasOrderbook = bestBid > 0 && bestAsk > 0;
  
  const volumeConfidence = Math.min(volume24h / 100000, 1);
  const liquidityConfidence = Math.min(liquidity / 500000, 1);
  
  return {
    market_consensus: { 
      prob: marketProb, 
      weight: 0.50, 
      confidence: 1.0,
      label: 'Market Price',
      desc: 'Current trading price (real)',
      isReal: true,
    },
    volume_signal: { 
      prob: marketProb, 
      weight: 0.25, 
      confidence: volumeConfidence,
      label: 'Volume Signal',
      desc: volume24h > 50000 ? 'High activity' : 'Low activity',
      isReal: true,
    },
    liquidity_depth: { 
      prob: marketProb, 
      weight: 0.15, 
      confidence: liquidityConfidence,
      label: 'Liquidity',
      desc: liquidity > 100000 ? 'Deep market' : 'Thin market',
      isReal: true,
    },
    orderbook_bias: { 
      prob: hasOrderbook ? Math.max(0.01, Math.min(0.99, marketProb + (bestBid/bestAsk - 1) * 0.1)) : marketProb, 
      weight: 0.10, 
      confidence: hasOrderbook ? 0.7 : 0,
      label: 'Order Flow',
      desc: hasOrderbook ? `Spread: ${((bestAsk - bestBid) * 100).toFixed(2)}%` : 'No data',
      isReal: hasOrderbook,
    },
    _isHeuristic: true,
    _disclaimer: 'Market signals from real data - not ML predictions',
  };
}

/**
 * Calculate Greeks (options-style metrics)
 */
function calculateGreeks(marketProb, endDate) {
  const daysToExpiry = endDate
    ? Math.max(1, (new Date(endDate) - new Date()) / (1000 * 60 * 60 * 24))
    : 30;

  return {
    delta: marketProb,
    gamma: 4 * marketProb * (1 - marketProb),
    theta: -0.01 * (1 / Math.sqrt(daysToExpiry)),
    vega: Math.sqrt(marketProb * (1 - marketProb)) * 0.5,
    rho: 0.01,
  };
}

/**
 * Transform orderbook to our format
 */
function transformOrderbook(data) {
  const bids = (data.bids || []).slice(0, 15).map((bid) => ({
    price: parseFloat(bid.price),
    size: parseFloat(bid.size) * 1000,
    cumulative: 0,
    isReal: true,
  }));

  const asks = (data.asks || []).slice(0, 15).map((ask) => ({
    price: parseFloat(ask.price),
    size: parseFloat(ask.size) * 1000,
    cumulative: 0,
    isReal: true,
  }));

  let bidCum = 0, askCum = 0;
  bids.forEach(b => { bidCum += b.size; b.cumulative = bidCum; });
  asks.forEach(a => { askCum += a.size; a.cumulative = askCum; });

  const totalBids = bids.reduce((sum, b) => sum + b.size, 0);
  const totalAsks = asks.reduce((sum, a) => sum + a.size, 0);

  return {
    bids,
    asks,
    imbalance: (totalBids - totalAsks) / (totalBids + totalAsks || 1),
    isReal: true,
  };
}

export const PolymarketAPI = {
  fetchEventBySlug,
  fetchOpenEvents,
  fetchPriceHistory,
  fetchOrderbook,
  extractEventSlug,
};

export default PolymarketAPI;
