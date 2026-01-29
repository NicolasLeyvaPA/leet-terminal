// Kalshi API Service - Real market data integration
import { sanitizeText } from '../utils/sanitize';

const KALSHI_API = 'https://api.elections.kalshi.com';

// CORS proxy options (fallbacks if direct fails)
const CORS_PROXIES = [
  (url) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
  (url) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
];

// Track proxy failures to avoid repeated attempts
const proxyFailures = new Map();
const PROXY_FAILURE_TIMEOUT = 5 * 60 * 1000; // 5 minutes

// Helper to handle API calls with CORS fallback
async function fetchWithFallback(url, options = {}) {
  // First try: Vite proxy in development
  if (import.meta.env.DEV) {
    const proxyUrl = url.replace(KALSHI_API, '/api/kalshi');
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

  // Second try: Direct fetch
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
    const proxyKey = `kalshi_proxy_${i}`;
    
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
          return JSON.parse(text);
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

// Extract event/market ticker from Kalshi URL
export function extractKalshiTicker(url) {
  try {
    const urlObj = new URL(url);
    // Kalshi URLs: kalshi.com/markets/TICKER or kalshi.com/events/TICKER
    const pathParts = urlObj.pathname.split('/').filter(Boolean);
    if (pathParts.length >= 2) {
      return pathParts[pathParts.length - 1].toUpperCase();
    }
    return null;
  } catch {
    // Assume it's already a ticker
    return url.toUpperCase();
  }
}

// Fetch open markets from Kalshi (more efficient than events endpoint)
// Uses /markets directly which includes pricing data - avoids N+1 queries
export async function fetchOpenEvents(limit = 50) {
  const url = `${KALSHI_API}/trade-api/v2/markets?limit=${Math.min(limit, 100)}`;
  
  try {
    const data = await fetchWithFallback(url);
    
    if (!data.markets || !Array.isArray(data.markets)) {
      console.warn('Unexpected Kalshi markets response');
      return [];
    }
    
    // Filter to active markets with actual trading activity
    // Transform directly - no additional API calls needed
    const transformedMarkets = data.markets
      .filter(m => m.status === 'active' && (m.volume > 0 || m.liquidity > 0))
      .slice(0, limit)
      .map(transformKalshiMarket)
      .filter(Boolean);
    
    return transformedMarkets;
  } catch (error) {
    console.error('Error loading Kalshi markets:', error.message);
    return [];
  }
}

// Fetch markets list (for browsing all markets)
export async function fetchMarkets(limit = 50, cursor = null) {
  let url = `${KALSHI_API}/trade-api/v2/markets?limit=${limit}`;
  if (cursor) {
    url += `&cursor=${cursor}`;
  }
  
  try {
    const data = await fetchWithFallback(url);
    
    if (!data.markets || !Array.isArray(data.markets)) {
      return { markets: [], cursor: null };
    }
    
    const transformedMarkets = data.markets
      .filter(m => m.status === 'active' && m.last_price > 0)
      .map(transformKalshiMarket)
      .filter(Boolean);
    
    return {
      markets: transformedMarkets,
      cursor: data.cursor || null,
    };
  } catch (error) {
    console.error('Error loading Kalshi markets:', error.message);
    return { markets: [], cursor: null };
  }
}

// Fetch event by ticker (includes markets)
export async function fetchEventByTicker(ticker) {
  const cleanTicker = extractKalshiTicker(ticker);
  const url = `${KALSHI_API}/trade-api/v2/events/${cleanTicker}`;
  
  try {
    const data = await fetchWithFallback(url);
    
    if (!data.event) {
      throw new Error('Event not found');
    }
    
    // If event has markets, use the first one for primary display
    const primaryMarket = data.markets?.[0];
    if (!primaryMarket) {
      throw new Error('No markets in event');
    }
    
    return transformKalshiEventWithMarket(data.event, primaryMarket, data.markets);
  } catch (error) {
    console.error('Error loading Kalshi event:', error.message);
    throw error;
  }
}

// Fetch single market by ticker
export async function fetchMarketByTicker(ticker) {
  const cleanTicker = extractKalshiTicker(ticker);
  const url = `${KALSHI_API}/trade-api/v2/markets/${cleanTicker}`;
  
  try {
    const data = await fetchWithFallback(url);
    
    if (!data.market) {
      throw new Error('Market not found');
    }
    
    return transformKalshiMarket(data.market);
  } catch (error) {
    console.error('Error loading Kalshi market:', error.message);
    throw error;
  }
}

// Fetch orderbook for a market
export async function fetchOrderbook(ticker) {
  const cleanTicker = extractKalshiTicker(ticker);
  const url = `${KALSHI_API}/trade-api/v2/markets/${cleanTicker}/orderbook`;
  
  try {
    const data = await fetchWithFallback(url);
    
    if (!data.orderbook) {
      return generateFallbackOrderbook(0.5);
    }
    
    return transformKalshiOrderbook(data.orderbook);
  } catch (error) {
    console.warn('Failed to fetch Kalshi orderbook:', error);
    return generateFallbackOrderbook(0.5);
  }
}

// Fetch price history for Kalshi market
// NOTE: Kalshi's public API does not expose historical price data
// This returns SIMULATED data based on current price for chart display
// Real history would require authenticated API access
export async function fetchPriceHistory(ticker, days = 90) {
  try {
    const market = await fetchMarketByTicker(ticker);
    const currentPrice = market?.market_prob || 0.5;
    const history = generatePriceHistory(currentPrice, days);
    // Mark as simulated so UI can indicate this
    history._isSimulated = true;
    history._disclaimer = 'Simulated - Kalshi public API does not provide price history';
    return history;
  } catch {
    const history = generatePriceHistory(0.5, days);
    history._isSimulated = true;
    return history;
  }
}

// Transform Kalshi event + market to our unified format
function transformKalshiEventWithMarket(event, market, allMarkets = []) {
  // Kalshi prices are in cents (0-100), convert to probability (0-1)
  const yesPrice = (market.yes_bid + market.yes_ask) / 2 / 100 || market.last_price / 100;
  const bestBid = market.yes_bid / 100;
  const bestAsk = market.yes_ask / 100;
  
  // Volume is in contracts
  const volume24h = market.volume_24h || 0;
  const volumeTotal = market.volume || 0;
  const liquidity = (market.liquidity || 0) / 100; // Convert from cents
  const openInterest = market.open_interest || 0;
  
  // Calculate heuristic probability
  const modelProb = calculateHeuristicProbability(yesPrice, volume24h, liquidity, market);
  
  return {
    id: event.event_ticker,
    ticker: sanitizeText(market.ticker || event.event_ticker, { maxLength: 30, allowNewlines: false }),
    platform: 'Kalshi',
    question: sanitizeText(market.title || event.title, { maxLength: 500 }),
    description: sanitizeText(market.rules_primary || '', { maxLength: 2000 }),
    category: sanitizeText(event.category || 'General', { maxLength: 50, allowNewlines: false }),
    subcategory: sanitizeText(event.sub_title || '', { maxLength: 50, allowNewlines: false }),
    
    // Core pricing (convert from cents to 0-1)
    market_prob: yesPrice,
    model_prob: modelProb,
    prev_prob: market.previous_price ? market.previous_price / 100 : null,
    
    // Market metrics
    bestBid,
    bestAsk,
    spread: bestAsk - bestBid,
    volume_24h: volume24h,
    volume_total: volumeTotal,
    liquidity,
    open_interest: openInterest,
    trades_24h: Math.floor(volume24h / 10),
    
    // Dates
    end_date: market.expiration_time,
    close_time: market.close_time,
    created: market.created_time,
    resolution_source: sanitizeText(market.rules_primary || 'Kalshi resolution', { maxLength: 500 }),
    
    // Market IDs
    marketId: market.ticker,
    eventTicker: event.event_ticker,
    seriesTicker: event.series_ticker,
    
    // Outcomes (Kalshi is binary: Yes/No)
    outcomes: ['Yes', 'No'],
    outcomePrices: [yesPrice, 1 - yesPrice],
    
    // All markets in event (for multi-outcome events)
    allMarkets: allMarkets.map(m => ({
      ticker: m.ticker,
      title: m.title,
      yesPrice: m.last_price / 100,
      volume: m.volume,
    })),
    
    // Generated analysis
    factors: generateFactors(yesPrice, modelProb, volume24h, liquidity, market),
    model_breakdown: generateModelBreakdown(modelProb),
    greeks: calculateGreeks(yesPrice, market.expiration_time),
    
    // Status
    status: market.status,
    canCloseEarly: market.can_close_early,
    earlyCloseCondition: market.early_close_condition,
    
    // Raw data reference
    _raw: { event, market },
    _source: 'kalshi',
  };
}

// Transform single Kalshi market to our format
function transformKalshiMarket(market) {
  if (!market || market.status !== 'active') return null;
  
  const yesPrice = market.last_price / 100 || 0.5;
  const bestBid = market.yes_bid / 100;
  const bestAsk = market.yes_ask / 100;
  const volume24h = market.volume_24h || 0;
  const liquidity = (market.liquidity || 0) / 100;
  
  const modelProb = calculateHeuristicProbability(yesPrice, volume24h, liquidity, market);
  
  return {
    id: market.ticker,
    ticker: sanitizeText(market.ticker, { maxLength: 30, allowNewlines: false }),
    platform: 'Kalshi',
    question: sanitizeText(market.title, { maxLength: 500 }),
    description: sanitizeText(market.rules_primary || '', { maxLength: 2000 }),
    category: 'General',
    
    market_prob: yesPrice,
    model_prob: modelProb,
    prev_prob: market.previous_price ? market.previous_price / 100 : null,
    
    bestBid,
    bestAsk,
    spread: bestAsk - bestBid,
    volume_24h: volume24h,
    volume_total: market.volume || 0,
    liquidity,
    open_interest: market.open_interest || 0,
    
    end_date: market.expiration_time,
    marketId: market.ticker,
    eventTicker: market.event_ticker,
    
    outcomes: ['Yes', 'No'],
    outcomePrices: [yesPrice, 1 - yesPrice],
    
    factors: generateFactors(yesPrice, modelProb, volume24h, liquidity, market),
    greeks: calculateGreeks(yesPrice, market.expiration_time),
    
    status: market.status,
    _source: 'kalshi',
  };
}

// Transform Kalshi orderbook format
function transformKalshiOrderbook(orderbook) {
  // Kalshi format: yes/no arrays of [price_cents, quantity]
  // Convert to our format with bids (yes) and asks (no)
  
  const yesLevels = orderbook.yes_dollars || orderbook.yes || [];
  const noLevels = orderbook.no_dollars || orderbook.no || [];
  
  // Yes orders are bids (people wanting to buy Yes)
  // No orders at high prices = people selling Yes (asks)
  const bids = yesLevels
    .map(([price, size]) => ({
      price: typeof price === 'string' ? parseFloat(price) : price / 100,
      size: typeof size === 'string' ? parseFloat(size) : size,
      cumulative: 0,
    }))
    .sort((a, b) => b.price - a.price)
    .slice(0, 15);
  
  // No orders: inverted to show as asks for Yes
  // If someone bids 91c on No, that's equivalent to asking 9c on Yes
  const asks = noLevels
    .filter(([price]) => {
      const p = typeof price === 'string' ? parseFloat(price) : price / 100;
      return p >= 0.5; // Only high No bids are relevant as Yes asks
    })
    .map(([price, size]) => ({
      price: 1 - (typeof price === 'string' ? parseFloat(price) : price / 100),
      size: typeof size === 'string' ? parseFloat(size) : size,
      cumulative: 0,
    }))
    .sort((a, b) => a.price - b.price)
    .slice(0, 15);
  
  // Calculate cumulative
  let bidCum = 0, askCum = 0;
  bids.forEach(b => { bidCum += b.size; b.cumulative = bidCum; });
  asks.forEach(a => { askCum += a.size; a.cumulative = askCum; });
  
  const totalBids = bids.reduce((sum, b) => sum + b.size, 0);
  const totalAsks = asks.reduce((sum, a) => sum + a.size, 0);
  
  return {
    bids,
    asks,
    imbalance: totalBids + totalAsks > 0 
      ? (totalBids - totalAsks) / (totalBids + totalAsks) 
      : 0,
  };
}

// Calculate heuristic probability (NOT ML - market signal analysis)
function calculateHeuristicProbability(marketProb, volume24h, liquidity, market) {
  let heuristicProb = marketProb;
  
  // Volume factor
  const volumeFactor = Math.min(volume24h / 5000, 0.03);
  
  // Bid/Ask analysis
  const yesBid = (market.yes_bid || 0) / 100;
  const yesAsk = (market.yes_ask || 0) / 100;
  const spread = yesAsk - yesBid;
  const imbalance = yesBid > 0 && yesAsk > 0 
    ? (yesBid / yesAsk - 1) * 0.05 
    : 0;
  
  // Spread factor
  const spreadFactor = spread < 0.02 ? 0.01 : spread > 0.1 ? -0.02 : 0;
  
  heuristicProb += volumeFactor + imbalance + spreadFactor;
  
  return Math.max(0.01, Math.min(0.99, heuristicProb));
}

// Generate factors from real data
function generateFactors(marketProb, heuristicProb, volume24h, liquidity, market) {
  const edge = heuristicProb - marketProb;
  const direction = edge > 0.02 ? 'bullish' : edge < -0.02 ? 'bearish' : 'neutral';
  
  const yesBid = (market.yes_bid || 0) / 100;
  const yesAsk = (market.yes_ask || 0) / 100;
  const hasOrderbook = yesBid > 0 && yesAsk > 0;
  const spread = yesAsk - yesBid;
  
  return {
    orderbook_imbalance: {
      value: hasOrderbook ? yesBid / (yesBid + (1 - yesAsk)) : null,
      contribution: hasOrderbook ? (yesBid / yesAsk - 1) * 0.1 : 0,
      direction: hasOrderbook ? (yesBid > yesAsk * 0.9 ? 'bullish' : 'neutral') : 'unknown',
      desc: hasOrderbook ? `Spread: ${(spread * 100).toFixed(1)}%` : 'No orderbook data',
      isReal: hasOrderbook,
    },
    volume_trend: {
      value: Math.min(volume24h / 10000, 1),
      contribution: Math.min(volume24h / 10000, 1) * 0.1,
      direction: volume24h > 500 ? 'bullish' : volume24h < 50 ? 'bearish' : 'neutral',
      desc: `24h volume: ${volume24h} contracts`,
      isReal: true,
    },
    liquidity_score: {
      value: Math.min(liquidity / 50000, 1),
      contribution: Math.min(liquidity / 50000, 1) * 0.05,
      direction: liquidity > 10000 ? 'bullish' : 'neutral',
      desc: `Liquidity: $${(liquidity).toFixed(0)}`,
      isReal: true,
    },
    open_interest: {
      value: market.open_interest ? Math.min(market.open_interest / 10000, 1) : null,
      contribution: market.open_interest ? Math.min(market.open_interest / 10000, 0.05) : 0,
      direction: market.open_interest > 1000 ? 'bullish' : 'neutral',
      desc: market.open_interest ? `OI: ${market.open_interest} contracts` : 'No OI data',
      isReal: !!market.open_interest,
    },
    news_sentiment: {
      value: null,
      contribution: 0,
      direction: 'unknown',
      desc: 'News API not connected',
      isReal: false,
    },
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

// Generate model breakdown (heuristic signals, not ML)
function generateModelBreakdown(prob) {
  return {
    market_price: { prob, weight: 0.60, confidence: 1.0 },
    volume_signal: { prob, weight: 0.25, confidence: 0.7 },
    liquidity_signal: { prob, weight: 0.15, confidence: 0.6 },
    _disclaimer: 'Heuristic signals - no ML models',
  };
}

// Calculate Greeks
function calculateGreeks(marketProb, endDate) {
  const daysToExpiry = endDate
    ? Math.max(1, (new Date(endDate) - new Date()) / (1000 * 60 * 60 * 24))
    : 30;
  
  const delta = marketProb;
  const gamma = 4 * marketProb * (1 - marketProb);
  const theta = -0.01 * (1 / Math.sqrt(daysToExpiry));
  const vega = Math.sqrt(marketProb * (1 - marketProb)) * 0.5;
  const rho = 0.01;
  
  return { delta, gamma, theta, vega, rho };
}

// Generate price history (simulated - Kalshi doesn't have public history API)
function generatePriceHistory(currentPrice, days) {
  const history = [];
  let price = currentPrice - (Math.random() * 0.1 - 0.03);
  
  for (let i = days; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    
    // Random walk toward current price
    const drift = (currentPrice - price) * 0.05;
    price += drift + (Math.random() - 0.5) * 0.02;
    price = Math.max(0.01, Math.min(0.99, price));
    
    history.push({
      date: date.toISOString().split('T')[0],
      time: date.getTime(),
      price,
      volume: Math.floor(Math.random() * 500) + 50,
      high: Math.min(0.99, price + Math.random() * 0.02),
      low: Math.max(0.01, price - Math.random() * 0.02),
    });
  }
  
  // Ensure last point matches current price
  history[history.length - 1].price = currentPrice;
  
  return history;
}

// Fallback orderbook generator
function generateFallbackOrderbook(midPrice) {
  const bids = [], asks = [];
  let bidCum = 0, askCum = 0;
  
  for (let i = 1; i <= 15; i++) {
    const bidSize = Math.floor(Math.random() * 500) + 100;
    const askSize = Math.floor(Math.random() * 500) + 100;
    bidCum += bidSize;
    askCum += askSize;
    
    bids.push({
      price: Math.max(0.01, midPrice - i * 0.01),
      size: bidSize,
      cumulative: bidCum,
    });
    asks.push({
      price: Math.min(0.99, midPrice + i * 0.01),
      size: askSize,
      cumulative: askCum,
    });
  }
  
  return {
    bids,
    asks,
    imbalance: (bidCum - askCum) / (bidCum + askCum || 1),
  };
}

// Check if a URL/ticker is for Kalshi
// Kalshi tickers start with "KX" (e.g., KXELONMARS-99, KXWARMING-50)
export function isKalshiUrl(input) {
  if (!input) return false;
  const lower = input.toLowerCase().trim();
  
  // Check for kalshi.com URLs
  if (lower.includes('kalshi.com')) return true;
  
  // Check for KX prefix (Kalshi ticker format)
  if (lower.startsWith('kx')) return true;
  
  return false;
}

export const KalshiAPI = {
  fetchOpenEvents,
  fetchMarkets,
  fetchEventByTicker,
  fetchMarketByTicker,
  fetchOrderbook,
  fetchPriceHistory,
  extractKalshiTicker,
  isKalshiUrl,
};

export default KalshiAPI;
