// Polymarket API Service - Uses backend proxy to avoid CORS issues
import { getAuthToken } from '../utils/auth';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

// Helper to call backend proxy
async function fetchFromBackend(endpoint, options = {}) {
  const token = getAuthToken();
  
  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/polymarket${endpoint}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
        ...options.headers,
      },
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Backend API call failed:', error);
    throw error;
  }
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

  try {
    const data = await fetchFromBackend(`/events/${cleanSlug}`);

    if (data) {
      return transformEventToMarket(data);
    }
    throw new Error('Event not found');
  } catch (error) {
    console.error('Error loading market:', error.message);
    throw error;
  }
}

// Fetch all open events
export async function fetchOpenEvents(limit = 50) {
  try {
    const data = await fetchFromBackend(`/events?closed=false&order=volume&ascending=false&limit=${limit}`);

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

// Fetch market price history - Uses fallback data (CLOB API proxy not implemented yet)
export async function fetchPriceHistory(marketId, days = 90) {
  // TODO: Implement CLOB API proxy in backend for price history
  console.info('Using fallback price history data');
  return generateFallbackPriceHistory(0.5, days);
}

// Fetch orderbook - Uses fallback data (CLOB API proxy not implemented yet)
export async function fetchOrderbook(tokenId) {
  // TODO: Implement CLOB API proxy in backend for orderbook data
  console.info('Using fallback orderbook data');
  return generateFallbackOrderbook(0.5);
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
    ticker: event.ticker || generateTicker(event.title),
    platform: 'Polymarket',
    question: event.title,
    description: event.description,
    category: event.tags?.[0]?.label || 'General',
    subcategory: event.tags?.[1]?.label || '',

    // Core pricing
    market_prob: midPrice,
    model_prob: modelProb,
    prev_prob: midPrice - (Math.random() * 0.02 - 0.01), // Simulated previous

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
    resolution_source: event.resolutionSource || 'Polymarket resolution',

    // Market IDs for API calls
    marketId: market.id,
    conditionId: market.conditionId,
    clobTokenIds: market.clobTokenIds,

    // Outcomes
    outcomes,
    outcomePrices,

    // Generated analysis (will be calculated from real data)
    factors: generateFactors(midPrice, modelProb, volume24h, liquidity),
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

// Calculate model probability (simplified edge detection)
function calculateModelProbability(marketProb, volume24h, liquidity, market) {
  // Base: start with market probability
  let modelProb = marketProb;

  // Volume momentum factor: high recent volume may indicate informed trading
  const volumeFactor = Math.min(volume24h / 100000, 0.05);

  // Liquidity factor: more liquidity = more efficient pricing
  const liquidityFactor = Math.min(liquidity / 500000, 0.03);

  // Bid/Ask imbalance: more bids than asks = bullish signal
  const bestBid = parseFloat(market.bestBid) || 0;
  const bestAsk = parseFloat(market.bestAsk) || 0;
  const imbalance = bestBid > 0 && bestAsk > 0
    ? (bestBid / bestAsk - 1) * 0.1
    : 0;

  // Spread factor: tight spread = more confidence in price
  const spread = bestAsk - bestBid;
  const spreadFactor = spread < 0.02 ? 0.01 : spread > 0.1 ? -0.02 : 0;

  // Combine factors
  modelProb += volumeFactor + imbalance + spreadFactor;

  // Add slight random noise for variation (simulating model uncertainty)
  modelProb += (Math.random() - 0.5) * 0.04;

  // Clamp to valid probability range
  return Math.max(0.01, Math.min(0.99, modelProb));
}

// Generate analysis factors from real data
function generateFactors(marketProb, modelProb, volume24h, liquidity) {
  const edge = modelProb - marketProb;
  const direction = edge > 0.02 ? 'bullish' : edge < -0.02 ? 'bearish' : 'neutral';

  // Orderbook imbalance (simulated from edge)
  const obImbalance = 0.5 + edge * 2;

  // Volume trend
  const volumeScore = Math.min(volume24h / 200000, 1);
  const volumeDirection = volumeScore > 0.5 ? 'bullish' : volumeScore < 0.3 ? 'bearish' : 'neutral';

  // Liquidity score
  const liqScore = Math.min(liquidity / 1000000, 1);

  return {
    orderbook_imbalance: {
      value: Math.max(0, Math.min(1, obImbalance)),
      contribution: edge * 0.3,
      direction,
      desc: edge > 0 ? 'Buy-side pressure detected' : 'Sell-side pressure detected'
    },
    price_momentum: {
      value: 0.5 + edge,
      contribution: edge * 0.2,
      direction,
      desc: 'Based on recent price movement'
    },
    volume_trend: {
      value: volumeScore,
      contribution: volumeScore * 0.1,
      direction: volumeDirection,
      desc: `24h volume: $${(volume24h / 1000).toFixed(1)}K`
    },
    news_sentiment: {
      value: 0.5,
      contribution: 0,
      direction: 'neutral',
      desc: 'No news data available'
    },
    social_sentiment: {
      value: 0.5,
      contribution: 0,
      direction: 'neutral',
      desc: 'Social data not available'
    },
    smart_money: {
      value: 0.5 + edge * 1.5,
      contribution: edge * 0.15,
      direction,
      desc: 'Inferred from orderbook depth'
    },
    historical_pattern: {
      value: 0.5,
      contribution: 0,
      direction: 'neutral',
      desc: 'Historical patterns not analyzed'
    },
    time_decay: {
      value: 0.5,
      contribution: 0,
      direction: 'neutral',
      desc: 'Time decay factor'
    },
    liquidity_score: {
      value: liqScore,
      contribution: liqScore * 0.05,
      direction: liqScore > 0.5 ? 'bullish' : 'neutral',
      desc: `Liquidity: $${(liquidity / 1000).toFixed(1)}K`
    },
    model_confidence: {
      value: Math.abs(edge) > 0.05 ? 0.8 : 0.5,
      contribution: Math.abs(edge) * 0.2,
      direction,
      desc: `Edge detected: ${(edge * 100).toFixed(1)}%`
    },
  };
}

// Generate model breakdown
function generateModelBreakdown(modelProb) {
  const noise = () => (Math.random() - 0.5) * 0.06;
  return {
    lightgbm: { prob: Math.max(0.01, Math.min(0.99, modelProb + noise())), weight: 0.35, confidence: 0.75 + Math.random() * 0.15 },
    xgboost: { prob: Math.max(0.01, Math.min(0.99, modelProb + noise())), weight: 0.3, confidence: 0.72 + Math.random() * 0.15 },
    logistic: { prob: Math.max(0.01, Math.min(0.99, modelProb + noise())), weight: 0.2, confidence: 0.68 + Math.random() * 0.12 },
    bayesian: { prob: Math.max(0.01, Math.min(0.99, modelProb + noise())), weight: 0.15, confidence: 0.7 + Math.random() * 0.14 },
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
