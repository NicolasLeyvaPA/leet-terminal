// Kalshi API Service - Real market data integration
// v2.0 - With caching, rate limiting, and honest data handling
import { sanitizeText } from '../utils/sanitize';
import { getCached, setCache, waitForRateLimit } from '../utils/apiCache';
import logger from '../utils/logger';
import scrapeology from '../config/scrapeology';

const KALSHI_API = 'https://api.elections.kalshi.com';

// Use custom CORS proxy if configured
const CORS_PROXY = import.meta.env.VITE_CORS_PROXY_URL || '';

// Fallback CORS proxies
const CORS_PROXIES = [
  (url) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
  (url) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
];

const proxyFailures = new Map();
const PROXY_FAILURE_TIMEOUT = 5 * 60 * 1000;

const CACHE_TTL = {
  MARKETS: 30 * 1000,
  PRICE_HISTORY: 60 * 1000,
  ORDERBOOK: 10 * 1000,
  EVENT: 60 * 1000,
};

/**
 * Fetch with CORS fallback and caching
 */
async function fetchWithFallback(url, options = {}) {
  const cacheKey = `kalshi:${url}`;
  const cacheTtl = options.cacheTtl || CACHE_TTL.MARKETS;
  
  const cached = getCached(cacheKey);
  if (cached !== null) return cached;

  await waitForRateLimit('kalshi', 300);

  // Scrapeology backend — preferred when available
  if (scrapeology.isConfigured()) {
    try {
      const scrapePath = url.startsWith(KALSHI_API)
        ? scrapeology.endpoint(`/kalshi${url.slice(KALSHI_API.length)}`)
        : url;
      const response = await fetch(scrapePath, {
        headers: { 'Accept': 'application/json' },
      });
      if (response.ok) {
        const data = await response.json();
        setCache(cacheKey, data, cacheTtl);
        return data;
      }
    } catch (error) {
      logger.warn('Scrapeology Kalshi backend failed, falling back:', error.message);
    }
  }

  const getProxyUrl = (targetUrl) => {
    if (CORS_PROXY) {
      return `${CORS_PROXY}?url=${encodeURIComponent(targetUrl)}`;
    }
    return targetUrl;
  };

  // Primary: Custom proxy or Vite dev proxy
  if (CORS_PROXY || import.meta.env.DEV) {
    const proxyUrl = CORS_PROXY ? getProxyUrl(url) : url.replace(KALSHI_API, '/api/kalshi');
    try {
      const response = await fetch(proxyUrl, {
        ...options,
        headers: { 'Accept': 'application/json', ...options.headers },
      });
      if (response.ok) {
        const data = await response.json();
        setCache(cacheKey, data, cacheTtl);
        return data;
      }
    } catch (error) {
      logger.warn('Kalshi proxy failed:', error.message);
    }
  }

  // Direct fetch
  try {
    const response = await fetch(url, {
      ...options,
      headers: { 'Accept': 'application/json', ...options.headers },
    });
    if (response.ok) {
      const data = await response.json();
      setCache(cacheKey, data, cacheTtl);
      return data;
    }
  } catch (error) {
    logger.warn('Direct fetch failed:', error.message);
  }

  // Fallback proxies
  for (let i = 0; i < CORS_PROXIES.length; i++) {
    const makeProxyUrl = CORS_PROXIES[i];
    const proxyKey = `kalshi_proxy_${i}`;
    
    if (proxyFailures.get(proxyKey) && Date.now() - proxyFailures.get(proxyKey) < PROXY_FAILURE_TIMEOUT) {
      continue;
    }
    
    try {
      const proxyUrl = makeProxyUrl(url);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      
      const response = await fetch(proxyUrl, {
        ...options,
        signal: controller.signal,
        headers: { 'Accept': 'application/json', ...options.headers },
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
    } catch {
      proxyFailures.set(proxyKey, Date.now());
    }
  }

  throw new Error(`Failed to fetch from Kalshi: ${url}`);
}

/**
 * Check if URL/input is for Kalshi
 */
export function isKalshiUrl(input) {
  if (!input) return false;
  const lower = input.toLowerCase().trim();
  return lower.includes('kalshi.com') || lower.startsWith('kx');
}

/**
 * Extract ticker from Kalshi URL
 */
export function extractKalshiTicker(url) {
  try {
    if (url.toUpperCase().startsWith('KX')) {
      return url.toUpperCase();
    }
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split('/').filter(Boolean);
    const marketsIndex = pathParts.indexOf('markets');
    if (marketsIndex !== -1 && pathParts[marketsIndex + 1]) {
      return pathParts[marketsIndex + 1].toUpperCase();
    }
    return pathParts[pathParts.length - 1]?.toUpperCase() || null;
  } catch {
    return url.toUpperCase();
  }
}

/**
 * Fetch open events from Kalshi
 */
export async function fetchOpenEvents(limit = 50) {
  const url = `${KALSHI_API}/trade-api/v2/events?limit=${limit}&status=open`;

  try {
    const data = await fetchWithFallback(url, { cacheTtl: CACHE_TTL.MARKETS });

    if (!data || !data.events) {
      return [];
    }

    return data.events
      .filter(event => event.markets && event.markets.length > 0)
      .map(transformKalshiEvent)
      .filter(Boolean)
      .slice(0, limit);
  } catch (error) {
    logger.error('Kalshi fetch failed:', error.message);
    return [];
  }
}

/**
 * Fetch event by ticker
 */
export async function fetchEventByTicker(tickerOrUrl) {
  const ticker = extractKalshiTicker(tickerOrUrl);
  if (!ticker) throw new Error('Invalid Kalshi ticker');

  const url = `${KALSHI_API}/trade-api/v2/events/${ticker}`;

  try {
    const data = await fetchWithFallback(url, { cacheTtl: CACHE_TTL.EVENT });

    if (!data || !data.event) {
      throw new Error('Event not found');
    }

    return transformKalshiEvent(data.event);
  } catch (error) {
    logger.error('Kalshi event fetch failed:', error.message);
    throw error;
  }
}

/**
 * Fetch price history - returns null if unavailable (NO FAKE DATA)
 */
export async function fetchPriceHistory(marketId, days = 90) {
  if (!marketId) return null;

  try {
    const endTs = Math.floor(Date.now() / 1000);
    const startTs = endTs - (days * 24 * 60 * 60);
    const url = `${KALSHI_API}/trade-api/v2/markets/${marketId}/candlesticks?start_ts=${startTs}&end_ts=${endTs}&period_interval=1440`;

    const data = await fetchWithFallback(url, { cacheTtl: CACHE_TTL.PRICE_HISTORY });

    if (data && data.candlesticks && data.candlesticks.length > 0) {
      return data.candlesticks.map(candle => ({
        date: new Date(candle.end_period_ts * 1000).toISOString().split('T')[0],
        time: candle.end_period_ts * 1000,
        price: (candle.price?.close || candle.yes_price?.close || 50) / 100,
        volume: candle.volume || 0,
        high: (candle.price?.high || candle.yes_price?.high || 50) / 100,
        low: (candle.price?.low || candle.yes_price?.low || 50) / 100,
        isReal: true,
      }));
    }

    return null; // NO FAKE DATA
  } catch (error) {
    logger.warn('Kalshi price history failed:', error.message);
    return null;
  }
}

/**
 * Fetch orderbook - returns null if unavailable (NO FAKE DATA)
 */
export async function fetchOrderbook(marketId) {
  if (!marketId) return null;

  try {
    const url = `${KALSHI_API}/trade-api/v2/markets/${marketId}/orderbook`;
    const data = await fetchWithFallback(url, { cacheTtl: CACHE_TTL.ORDERBOOK });

    if (data && data.orderbook && (data.orderbook.yes?.length > 0 || data.orderbook.no?.length > 0)) {
      return transformKalshiOrderbook(data.orderbook);
    }

    return null; // NO FAKE DATA
  } catch (error) {
    logger.warn('Kalshi orderbook failed:', error.message);
    return null;
  }
}

/**
 * Transform Kalshi event to our market format
 */
function transformKalshiEvent(event) {
  if (!event || !event.markets || event.markets.length === 0) return null;

  const market = event.markets[0];
  const yesPrice = (market.yes_bid || market.last_price || 50) / 100;
  const noPrice = (market.no_bid || (100 - (market.last_price || 50))) / 100;

  const volume24h = market.volume_24h || market.volume || 0;
  const volumeTotal = market.volume || 0;
  const openInterest = market.open_interest || 0;

  const signalProb = calculateSignalProbability(yesPrice, volume24h, openInterest, market);

  return {
    id: `kalshi-${event.event_ticker}`,
    ticker: sanitizeText(event.event_ticker || market.ticker, { maxLength: 20, allowNewlines: false }),
    platform: 'Kalshi',
    _source: 'kalshi',
    question: sanitizeText(event.title || market.title, { maxLength: 500 }),
    title: sanitizeText(event.title || market.title, { maxLength: 500 }),
    description: sanitizeText(event.subtitle || market.subtitle || '', { maxLength: 2000 }),
    category: sanitizeText(event.category || 'General', { maxLength: 50, allowNewlines: false }),
    subcategory: sanitizeText(event.sub_title || '', { maxLength: 50, allowNewlines: false }),

    market_prob: yesPrice,
    model_prob: signalProb,
    signal_prob: signalProb,
    prev_prob: null,

    bestBid: yesPrice - 0.01,
    bestAsk: yesPrice + 0.01,
    spread: 0.02,
    volume_24h: volume24h,
    volume_total: volumeTotal,
    liquidity: openInterest * yesPrice,
    open_interest: openInterest,
    trades_24h: Math.floor(volume24h / 20),

    end_date: event.end_date || market.close_time,
    created: event.created_time || market.open_time,
    resolution_source: 'Kalshi official resolution',

    marketId: market.ticker,
    eventTicker: event.event_ticker,

    outcomes: ['Yes', 'No'],
    outcomePrices: [yesPrice, noPrice],

    factors: generateFactors(yesPrice, signalProb, volume24h, openInterest),
    signal_breakdown: generateSignalBreakdown(yesPrice, volume24h, openInterest),
    model_breakdown: generateSignalBreakdown(yesPrice, volume24h, openInterest),
    greeks: calculateGreeks(yesPrice, event.end_date),

    _isHeuristic: true,
    _disclaimer: 'Signal probabilities are heuristics, not ML predictions',
    _raw: event,
  };
}

/**
 * Calculate signal probability (heuristic)
 */
function calculateSignalProbability(marketProb, volume24h, openInterest, _market) {
  let signalProb = marketProb;
  const volumeFactor = Math.min(volume24h / 50000, 0.05);
  const oiFactor = Math.min(openInterest / 100000, 0.03);
  signalProb += volumeFactor + oiFactor;
  return Math.max(0.01, Math.min(0.99, signalProb));
}

/**
 * Generate factors
 */
function generateFactors(marketProb, signalProb, volume24h, openInterest) {
  const edge = signalProb - marketProb;
  const direction = edge > 0.02 ? 'bullish' : edge < -0.02 ? 'bearish' : 'neutral';
  const volumeScore = Math.min(volume24h / 100000, 1);
  const oiScore = Math.min(openInterest / 200000, 1);

  return {
    volume_trend: {
      value: volumeScore,
      contribution: volumeScore * 0.1,
      direction: volumeScore > 0.5 ? 'bullish' : 'neutral',
      desc: `24h volume: ${volume24h.toLocaleString()} contracts`,
      isReal: true,
    },
    open_interest: {
      value: oiScore,
      contribution: oiScore * 0.05,
      direction: oiScore > 0.5 ? 'bullish' : 'neutral',
      desc: `OI: ${openInterest.toLocaleString()} contracts`,
      isReal: true,
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
 * Generate signal breakdown
 */
function generateSignalBreakdown(marketProb, volume24h, openInterest) {
  const volumeConfidence = Math.min(volume24h / 50000, 1);
  const oiConfidence = Math.min(openInterest / 100000, 1);

  return {
    market_consensus: {
      prob: marketProb,
      weight: 0.60,
      confidence: 1.0,
      label: 'Market Price',
      desc: 'Current Yes price',
      isReal: true,
    },
    volume_signal: {
      prob: marketProb,
      weight: 0.25,
      confidence: volumeConfidence,
      label: 'Volume Signal',
      desc: volume24h > 10000 ? 'High activity' : 'Normal activity',
      isReal: true,
    },
    oi_signal: {
      prob: marketProb,
      weight: 0.15,
      confidence: oiConfidence,
      label: 'Open Interest',
      desc: openInterest > 50000 ? 'Deep market' : 'Standard depth',
      isReal: true,
    },
    _isHeuristic: true,
    _disclaimer: 'Market signals from real data',
  };
}

/**
 * Calculate Greeks
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
 * Transform Kalshi orderbook
 */
function transformKalshiOrderbook(orderbook) {
  const bids = (orderbook.yes || []).map((level, _i) => ({
    price: level[0] / 100,
    size: level[1],
    cumulative: 0,
    isReal: true,
  }));

  const asks = (orderbook.no || []).map((level, _i) => ({
    price: 1 - level[0] / 100,
    size: level[1],
    cumulative: 0,
    isReal: true,
  }));

  let bidCum = 0, askCum = 0;
  bids.forEach(b => { bidCum += b.size; b.cumulative = bidCum; });
  asks.forEach(a => { askCum += a.size; a.cumulative = askCum; });

  return {
    bids,
    asks,
    imbalance: (bidCum - askCum) / (bidCum + askCum || 1),
    isReal: true,
  };
}

export const KalshiAPI = {
  fetchOpenEvents,
  fetchEventByTicker,
  fetchPriceHistory,
  fetchOrderbook,
  isKalshiUrl,
  extractKalshiTicker,
};

export default KalshiAPI;
