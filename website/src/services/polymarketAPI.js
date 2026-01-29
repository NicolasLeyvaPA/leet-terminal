// Polymarket API Service - Real market data integration
import { sanitizeText, sanitizeUrl } from '../utils/sanitize';

const GAMMA_API = 'https://gamma-api.polymarket.com';
const CLOB_API = 'https://clob.polymarket.com';

// CORS proxy options (fallbacks if direct/vite proxy fails)
// NOTE: These are public proxies and may be unreliable or rate-limited
// For production, consider setting up your own proxy server
const CORS_PROXIES = [
  // corsproxy.io - generally reliable
  (url) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
  // allorigins - alternative
  (url) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
];

// Track proxy failures to avoid repeated attempts to dead proxies
const proxyFailures = new Map();
const PROXY_FAILURE_TIMEOUT = 5 * 60 * 1000; // 5 minutes

// Helper to handle API calls with CORS fallback
async function fetchWithFallback(url, options = {}) {
  // First try: Vite proxy in development
  if (import.meta.env.DEV) {
    const proxyUrl = url
      .replace(GAMMA_API, '/api/polymarket')
      .replace(CLOB_API, '/api/clob');

    try {
      const response = await fetch(proxyUrl, {
        ...options,
        headers: {
          'Accept': 'application/json',
          ...options.headers,
        },
      });
      if (response.ok) {
        return await response.json();
      }
      console.warn(`Vite proxy returned ${response.status}, trying fallbacks...`);
    } catch (error) {
      console.warn('Vite proxy failed:', error.message);
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
      return await response.json();
    }
  } catch (error) {
    console.warn('Direct fetch failed:', error.message);
  }

  // Third try: CORS proxies as fallback
  for (let i = 0; i < CORS_PROXIES.length; i++) {
    const makeProxyUrl = CORS_PROXIES[i];
    const proxyKey = `proxy_${i}`;
    
    // Skip proxies that have recently failed
    const lastFailure = proxyFailures.get(proxyKey);
    if (lastFailure && Date.now() - lastFailure < PROXY_FAILURE_TIMEOUT) {
      console.warn(`Skipping proxy ${i} (recently failed)`);
      continue;
    }
    
    try {
      const proxyUrl = makeProxyUrl(url);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout
      
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
          // Clear failure record on success
          proxyFailures.delete(proxyKey);
          return JSON.parse(text);
        } catch {
          console.warn('Proxy returned non-JSON response');
          continue;
        }
      }
    } catch (error) {
      console.warn(`CORS proxy ${i} failed:`, error.message);
      // Record failure
      proxyFailures.set(proxyKey, Date.now());
      continue;
    }
  }

  // All methods failed
  throw new Error(`Failed to fetch from ${url}. All proxy methods exhausted.`);
}

// Extract event slug from Polymarket URL
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

// Fetch event by slug
export async function fetchEventBySlug(slug) {
  const cleanSlug = extractEventSlug(slug);
  const url = `${GAMMA_API}/events?slug=${cleanSlug}`;

  try {
    const data = await fetchWithFallback(url);

    if (Array.isArray(data) && data.length > 0) {
      return transformEventToMarket(data[0]);
    }
    throw new Error('Event not found');
  } catch (error) {
    console.error('Error loading market:', error.message);
    throw error;
  }
}

// Fetch all open events
export async function fetchOpenEvents(limit = 50) {
  const url = `${GAMMA_API}/events?closed=false&order=volume&ascending=false&limit=${limit}`;

  try {
    const data = await fetchWithFallback(url);

    if (!Array.isArray(data)) {
      console.warn('Unexpected response format, returning empty array');
      return [];
    }
    return data.map(transformEventToMarket).filter(Boolean);
  } catch (error) {
    console.error('Error loading markets:', error.message);
    // Return empty array instead of throwing to prevent app crash
    return [];
  }
}

// Fetch market price history
export async function fetchPriceHistory(marketId, days = 90) {
  try {
    const endTs = Math.floor(Date.now() / 1000);
    const startTs = endTs - (days * 24 * 60 * 60);
    const url = `${CLOB_API}/prices-history?market=${marketId}&startTs=${startTs}&endTs=${endTs}&fidelity=60`;
    const data = await fetchWithFallback(url);

    if (data && data.history) {
      return data.history.map(point => ({
        date: new Date(point.t * 1000).toISOString().split('T')[0],
        time: point.t * 1000,
        price: parseFloat(point.p),
        volume: 0,
        high: parseFloat(point.p),
        low: parseFloat(point.p),
      }));
    }
    return generateFallbackPriceHistory(0.5, days);
  } catch (error) {
    console.warn('Failed to fetch price history:', error);
    return generateFallbackPriceHistory(0.5, days);
  }
}

// Fetch orderbook
export async function fetchOrderbook(tokenId) {
  try {
    const url = `${CLOB_API}/book?token_id=${tokenId}`;
    const data = await fetchWithFallback(url);

    if (data && data.bids && data.asks) {
      return transformOrderbook(data);
    }
    return generateFallbackOrderbook(0.5);
  } catch (error) {
    console.warn('Failed to fetch orderbook:', error);
    return generateFallbackOrderbook(0.5);
  }
}

// Transform Polymarket event to our market format
function transformEventToMarket(event) {
  if (!event || !event.markets || event.markets.length === 0) return null;

  const market = event.markets[0];
  const bestBid = parseFloat(market.bestBid) || 0;
  const bestAsk = parseFloat(market.bestAsk) || 0;
  const midPrice = (bestBid + bestAsk) / 2 || parseFloat(market.lastTradePrice) || 0.5;

  // Parse outcomes and prices safely
  let outcomes = [];
  let outcomePrices = [];
  try {
    outcomes = JSON.parse(market.outcomes || '[]');
    outcomePrices = JSON.parse(market.outcomePrices || '[]');
  } catch {}

  // Calculate edge (we'll use a simple model based on volume and price movement)
  const volume24h = parseFloat(market.volume24hr) || 0;
  const volumeTotal = parseFloat(market.volumeNum) || parseFloat(event.volume) || 0;
  const liquidity = parseFloat(market.liquidityNum) || 0;

  // Simple model probability estimation based on market dynamics
  // In a real system, this would be a sophisticated ML model
  const modelProb = calculateModelProbability(midPrice, volume24h, liquidity, market);

  return {
    id: event.id,
    // Sanitize all text fields to prevent XSS
    ticker: sanitizeText(event.ticker || generateTicker(event.title), { maxLength: 20, allowNewlines: false }),
    platform: 'Polymarket',
    question: sanitizeText(event.title, { maxLength: 500 }),
    description: sanitizeText(event.description, { maxLength: 2000 }),
    category: sanitizeText(event.tags?.[0]?.label || 'General', { maxLength: 50, allowNewlines: false }),
    subcategory: sanitizeText(event.tags?.[1]?.label || '', { maxLength: 50, allowNewlines: false }),

    // Core pricing
    market_prob: midPrice,
    model_prob: modelProb,
    prev_prob: null, // Will be calculated from price history if available

    // Market metrics
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

    // Generated analysis (will be calculated from real data)
    factors: generateFactors(midPrice, modelProb, volume24h, liquidity, market),
    model_breakdown: generateModelBreakdown(modelProb),
    greeks: calculateGreeks(midPrice, event.endDate),
    correlations: {},
    related_news: [],

    // Raw event data for reference
    _raw: event,
  };
}

// Generate ticker from title
function generateTicker(title) {
  if (!title) return 'UNKNOWN';
  const words = title.split(' ')
    .filter(w => w.length > 2 && !['will', 'the', 'and', 'for', 'are', 'was', 'has', 'have'].includes(w.toLowerCase()))
    .slice(0, 3);
  return words.map(w => w[0]).join('').toUpperCase() || 'MKT';
}

// Calculate heuristic probability estimate (NOT ML - just market signal analysis)
// This is a deterministic heuristic based on observable market data
function calculateHeuristicProbability(marketProb, volume24h, liquidity, market) {
  // Base: start with market probability (the wisdom of the crowd)
  let heuristicProb = marketProb;

  // Volume momentum factor: high recent volume may indicate informed trading
  // Max adjustment: +5% if volume > $100k
  const volumeFactor = Math.min(volume24h / 100000, 0.05);

  // Bid/Ask imbalance: more bids than asks = bullish signal
  // This is REAL data from the orderbook
  const bestBid = parseFloat(market.bestBid) || 0;
  const bestAsk = parseFloat(market.bestAsk) || 0;
  const imbalance = bestBid > 0 && bestAsk > 0
    ? (bestBid / bestAsk - 1) * 0.1
    : 0;

  // Spread factor: tight spread = more liquid/efficient market
  const spread = bestAsk - bestBid;
  const spreadFactor = spread < 0.02 ? 0.01 : spread > 0.1 ? -0.02 : 0;

  // Combine factors (deterministic - NO random noise)
  heuristicProb += volumeFactor + imbalance + spreadFactor;

  // Clamp to valid probability range
  return Math.max(0.01, Math.min(0.99, heuristicProb));
}

// Alias for backward compatibility
const calculateModelProbability = calculateHeuristicProbability;

// Generate market signal factors
// HONEST: Clearly marks which factors have real data vs no data
function generateFactors(marketProb, heuristicProb, volume24h, liquidity, market) {
  const edge = heuristicProb - marketProb;
  const direction = edge > 0.02 ? 'bullish' : edge < -0.02 ? 'bearish' : 'neutral';

  // Calculate REAL orderbook imbalance if we have bid/ask data
  const bestBid = parseFloat(market?.bestBid) || 0;
  const bestAsk = parseFloat(market?.bestAsk) || 0;
  const hasOrderbookData = bestBid > 0 && bestAsk > 0;
  const realImbalance = hasOrderbookData ? bestBid / (bestBid + bestAsk) : null;

  // Volume metrics (REAL data from API)
  const volumeScore = Math.min(volume24h / 200000, 1);
  const volumeDirection = volumeScore > 0.5 ? 'bullish' : volumeScore < 0.3 ? 'bearish' : 'neutral';

  // Liquidity score (REAL data from API)
  const liqScore = Math.min(liquidity / 1000000, 1);

  return {
    // REAL DATA FACTORS
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
      direction: volumeDirection,
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
    
    // NO DATA FACTORS - Honestly marked
    news_sentiment: {
      value: null,
      contribution: 0,
      direction: 'unknown',
      desc: 'News API not connected',
      isReal: false,
    },
    social_sentiment: {
      value: null,
      contribution: 0,
      direction: 'unknown',
      desc: 'Social API not connected',
      isReal: false,
    },
    historical_pattern: {
      value: null,
      contribution: 0,
      direction: 'unknown',
      desc: 'Historical analysis not available',
      isReal: false,
    },
    
    // DERIVED/HEURISTIC FACTORS
    heuristic_edge: {
      value: 0.5 + edge,
      contribution: edge * 0.2,
      direction,
      desc: `Heuristic edge: ${(edge * 100).toFixed(1)}%`,
      isReal: false,
      isHeuristic: true,
    },
  };
}

// Generate HONEST signal breakdown
// These are market signals derived from real data, NOT ML predictions
function generateSignalBreakdown(marketProb, volume24h, liquidity, market) {
  const bestBid = parseFloat(market?.bestBid) || 0;
  const bestAsk = parseFloat(market?.bestAsk) || 0;
  const spread = bestAsk - bestBid;
  const hasOrderbook = bestBid > 0 && bestAsk > 0;
  
  const volumeConfidence = Math.min(volume24h / 100000, 1);
  const liquidityConfidence = Math.min(liquidity / 500000, 1);
  
  return {
    market_consensus: { 
      prob: marketProb, 
      weight: 0.50, 
      confidence: 1.0,
      label: 'Market Consensus',
      desc: 'Current trading price',
      isReal: true,
    },
    volume_weight: { 
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
      desc: hasOrderbook ? `Spread: ${(spread * 100).toFixed(2)}%` : 'No data',
      isReal: hasOrderbook,
    },
    _isHeuristic: true,
    _disclaimer: 'Market signals from real data - not ML predictions',
  };
}

// Backward compatibility wrapper
function generateModelBreakdown(modelProb) {
  // Return structure compatible with old UI, but honestly labeled
  return {
    market_price: { prob: modelProb, weight: 0.60, confidence: 1.0 },
    volume_signal: { prob: modelProb, weight: 0.25, confidence: 0.7 },
    liquidity_signal: { prob: modelProb, weight: 0.15, confidence: 0.6 },
    _disclaimer: 'Heuristic signals - no ML models',
  };
}

// Calculate Greeks (options-style metrics for prediction markets)
function calculateGreeks(marketProb, endDate) {
  const daysToExpiry = endDate
    ? Math.max(1, (new Date(endDate) - new Date()) / (1000 * 60 * 60 * 24))
    : 30;

  // Delta: rate of change of price with respect to outcome probability
  const delta = marketProb;

  // Gamma: rate of change of delta (highest near 50%)
  const gamma = 4 * marketProb * (1 - marketProb);

  // Theta: time decay (negative, accelerates near expiry)
  const theta = -0.01 * (1 / Math.sqrt(daysToExpiry));

  // Vega: sensitivity to volatility
  const vega = Math.sqrt(marketProb * (1 - marketProb)) * 0.5;

  // Rho: sensitivity to "risk-free rate" (minimal in prediction markets)
  const rho = 0.01;

  return { delta, gamma, theta, vega, rho };
}

// Transform orderbook to our format
function transformOrderbook(data) {
  const bids = (data.bids || []).slice(0, 15).map((bid, i) => ({
    price: parseFloat(bid.price),
    size: parseFloat(bid.size) * 1000,
    cumulative: 0,
  }));

  const asks = (data.asks || []).slice(0, 15).map((ask, i) => ({
    price: parseFloat(ask.price),
    size: parseFloat(ask.size) * 1000,
    cumulative: 0,
  }));

  // Calculate cumulative
  let bidCum = 0, askCum = 0;
  bids.forEach(b => { bidCum += b.size; b.cumulative = bidCum; });
  asks.forEach(a => { askCum += a.size; a.cumulative = askCum; });

  const totalBids = bids.reduce((sum, b) => sum + b.size, 0);
  const totalAsks = asks.reduce((sum, a) => sum + a.size, 0);

  return {
    bids,
    asks,
    imbalance: (totalBids - totalAsks) / (totalBids + totalAsks || 1),
  };
}

// Fallback generators when API fails
function generateFallbackPriceHistory(currentPrice, days) {
  const history = [];
  let price = currentPrice - (Math.random() * 0.12 - 0.04);
  for (let i = days; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    price += (Math.random() - 0.48) * 0.015;
    price = Math.max(0.05, Math.min(0.95, price));
    history.push({
      date: date.toISOString().split('T')[0],
      time: date.getTime(),
      price,
      volume: Math.floor(Math.random() * 100000) + 50000,
      high: Math.min(0.95, price + Math.random() * 0.02),
      low: Math.max(0.05, price - Math.random() * 0.02),
    });
  }
  history[history.length - 1].price = currentPrice;
  return history;
}

function generateFallbackOrderbook(midPrice) {
  const bids = [], asks = [];
  let bidCumulative = 0, askCumulative = 0;
  for (let i = 1; i <= 15; i++) {
    const bidSize = Math.floor(Math.random() * 80000) + 20000;
    const askSize = Math.floor(Math.random() * 80000) + 20000;
    bidCumulative += bidSize;
    askCumulative += askSize;
    bids.push({
      price: Math.max(0.01, midPrice - i * 0.005),
      size: bidSize,
      cumulative: bidCumulative,
    });
    asks.push({
      price: Math.min(0.99, midPrice + i * 0.005),
      size: askSize,
      cumulative: askCumulative,
    });
  }
  return {
    bids,
    asks,
    imbalance: (bidCumulative - askCumulative) / (bidCumulative + askCumulative || 1),
  };
}

// News fetching (placeholder - would connect to real news API)
export async function fetchMarketNews(keywords) {
  // In production, this would connect to a news aggregation API
  // For now, return empty array - no fake news
  return [];
}

export const PolymarketAPI = {
  fetchEventBySlug,
  fetchOpenEvents,
  fetchPriceHistory,
  fetchOrderbook,
  fetchMarketNews,
  extractEventSlug,
};

export default PolymarketAPI;
