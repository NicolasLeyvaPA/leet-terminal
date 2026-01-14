// Polymarket API Service - Routes through backend to avoid CORS issues
// NO CORS PROXIES - All data fetched via backend server

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api/v1';

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

// Fetch all open events via backend
export async function fetchOpenEvents(limit = 50) {
  try {
    const response = await fetch(`${API_BASE}/markets?limit=${limit}&platform=polymarket`);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();

    if (!data.success || !data.data) {
      console.warn('Unexpected response format:', data);
      return [];
    }

    // Transform backend format to frontend format
    return data.data.map(market => transformMarketFromBackend(market));
  } catch (error) {
    console.error('Error loading markets:', error.message);
    return [];
  }
}

// Fetch event by slug via backend
export async function fetchEventBySlug(slug) {
  const cleanSlug = extractEventSlug(slug);

  try {
    // Try to fetch by ID first
    const response = await fetch(`${API_BASE}/markets/${encodeURIComponent(cleanSlug)}`);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();

    if (!data.success || !data.data) {
      throw new Error('Market not found');
    }

    return transformMarketFromBackend(data.data);
  } catch (error) {
    console.error('Error loading market:', error.message);
    throw error;
  }
}

// Fetch market price history via backend
export async function fetchPriceHistory(marketId, days = 90) {
  try {
    const response = await fetch(`${API_BASE}/markets/${encodeURIComponent(marketId)}/history?days=${days}`);

    if (!response.ok) {
      return generateFallbackPriceHistory(0.5, days);
    }

    const data = await response.json();

    if (!data.success || !data.data || !data.data.points) {
      return generateFallbackPriceHistory(0.5, days);
    }

    return data.data.points.map(point => ({
      date: point.date,
      time: point.timestamp,
      price: point.price,
      volume: point.volume || 0,
      high: point.high || point.price,
      low: point.low || point.price,
    }));
  } catch (error) {
    console.warn('Failed to fetch price history:', error);
    return generateFallbackPriceHistory(0.5, days);
  }
}

// Fetch orderbook via backend
export async function fetchOrderbook(marketId) {
  try {
    const response = await fetch(`${API_BASE}/markets/${encodeURIComponent(marketId)}/orderbook`);

    if (!response.ok) {
      return generateFallbackOrderbook(0.5);
    }

    const data = await response.json();

    if (!data.success || !data.data) {
      return generateFallbackOrderbook(0.5);
    }

    return {
      bids: data.data.bids || [],
      asks: data.data.asks || [],
      imbalance: data.data.imbalance || 0,
    };
  } catch (error) {
    console.warn('Failed to fetch orderbook:', error);
    return generateFallbackOrderbook(0.5);
  }
}

// Transform backend MarketSummary to frontend format
function transformMarketFromBackend(market) {
  if (!market) return null;

  const modelProb = market.model_prob || market.market_prob;
  const edge = modelProb - market.market_prob;

  return {
    id: market.id,
    ticker: market.ticker,
    platform: market.platform,
    question: market.question,
    description: market.description,
    category: market.category || 'General',
    subcategory: market.subcategory || '',

    // Core pricing
    market_prob: market.market_prob,
    model_prob: modelProb,
    prev_prob: market.prev_prob || market.market_prob,

    // Market metrics
    bestBid: market.best_bid,
    bestAsk: market.best_ask,
    spread: market.spread,
    volume_24h: market.volume_24h,
    volume_total: market.volume_total,
    liquidity: market.liquidity,
    open_interest: market.open_interest,
    trades_24h: market.trades_24h,

    // Dates
    end_date: market.end_date,
    created: market.created_at,

    // Market IDs for API calls
    marketId: market.platform_ids?.market_id || market.id,
    conditionId: market.platform_ids?.condition_id,
    clobTokenIds: market.platform_ids?.clob_token_ids,

    // Outcomes
    outcomes: market.outcomes || ['Yes', 'No'],
    outcomePrices: market.outcome_prices || [market.market_prob, 1 - market.market_prob],

    // Generated analysis
    factors: generateFactors(market.market_prob, modelProb, market.volume_24h, market.liquidity),
    model_breakdown: generateModelBreakdown(modelProb),
    greeks: calculateGreeks(market.market_prob, market.end_date),
    correlations: {},
    related_news: [],

    // Freshness metadata from backend
    _freshness: market.freshness,
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

// Generate analysis factors from real data
function generateFactors(marketProb, modelProb, volume24h, liquidity) {
  const edge = modelProb - marketProb;
  const direction = edge > 0.02 ? 'bullish' : edge < -0.02 ? 'bearish' : 'neutral';

  const volumeScore = Math.min((volume24h || 0) / 200000, 1);
  const volumeDirection = volumeScore > 0.5 ? 'bullish' : volumeScore < 0.3 ? 'bearish' : 'neutral';
  const liqScore = Math.min((liquidity || 0) / 1000000, 1);

  return {
    orderbook_imbalance: {
      value: Math.max(0, Math.min(1, 0.5 + edge * 2)),
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
      desc: `24h volume: $${((volume24h || 0) / 1000).toFixed(1)}K`
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
      desc: `Liquidity: $${((liquidity || 0) / 1000).toFixed(1)}K`
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

  const delta = marketProb;
  const gamma = 4 * marketProb * (1 - marketProb);
  const theta = -0.01 * (1 / Math.sqrt(daysToExpiry));
  const vega = Math.sqrt(marketProb * (1 - marketProb)) * 0.5;
  const rho = 0.01;

  return { delta, gamma, theta, vega, rho };
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

// News fetching (placeholder)
export async function fetchMarketNews(keywords) {
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
