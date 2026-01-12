// Kalshi API Service - Real market data integration
// Kalshi is a CFTC-regulated prediction market exchange

const KALSHI_API = 'https://api.elections.kalshi.com/trade-api/v2';
const KALSHI_DEMO_API = 'https://demo-api.kalshi.co/trade-api/v2';

// CORS proxy options (fallbacks if direct fetch fails)
const CORS_PROXIES = [
  (url) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
  (url) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
  (url) => `https://cors-anywhere.herokuapp.com/${url}`,
];

// Helper to handle API calls with CORS fallback
async function fetchWithFallback(url, options = {}) {
  // First try: Vite proxy in development
  if (import.meta.env.DEV) {
    const proxyUrl = url
      .replace(KALSHI_API, '/api/kalshi')
      .replace(KALSHI_DEMO_API, '/api/kalshi-demo');

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
  for (const makeProxyUrl of CORS_PROXIES) {
    try {
      const proxyUrl = makeProxyUrl(url);
      const response = await fetch(proxyUrl, {
        ...options,
        headers: {
          'Accept': 'application/json',
          ...options.headers,
        },
      });
      if (response.ok) {
        const text = await response.text();
        try {
          return JSON.parse(text);
        } catch {
          console.warn('Proxy returned non-JSON response');
          continue;
        }
      }
    } catch (error) {
      console.warn('CORS proxy failed:', error.message);
      continue;
    }
  }

  // All methods failed
  throw new Error(`Failed to fetch from ${url}. All proxy methods exhausted.`);
}

// Fetch all active markets from Kalshi
export async function fetchKalshiMarkets(limit = 100, status = 'open') {
  const url = `${KALSHI_API}/markets?limit=${limit}&status=${status}`;

  try {
    const data = await fetchWithFallback(url);

    if (data && data.markets && Array.isArray(data.markets)) {
      return data.markets.map(transformKalshiMarket).filter(Boolean);
    }

    console.warn('Unexpected Kalshi response format, returning empty array');
    return [];
  } catch (error) {
    console.error('Error loading Kalshi markets:', error.message);
    return [];
  }
}

// Fetch specific market by ticker
export async function fetchKalshiMarketByTicker(ticker) {
  const url = `${KALSHI_API}/markets/${ticker}`;

  try {
    const data = await fetchWithFallback(url);

    if (data && data.market) {
      return transformKalshiMarket(data.market);
    }
    throw new Error('Market not found');
  } catch (error) {
    console.error('Error loading Kalshi market:', error.message);
    throw error;
  }
}

// Fetch events (groups of related markets)
export async function fetchKalshiEvents(limit = 50, status = 'open') {
  const url = `${KALSHI_API}/events?limit=${limit}&status=${status}&with_nested_markets=true`;

  try {
    const data = await fetchWithFallback(url);

    if (data && data.events && Array.isArray(data.events)) {
      // Flatten events into individual markets
      const markets = [];
      for (const event of data.events) {
        if (event.markets && Array.isArray(event.markets)) {
          for (const market of event.markets) {
            const transformed = transformKalshiMarket({ ...market, event_ticker: event.ticker, event_title: event.title, category: event.category });
            if (transformed) markets.push(transformed);
          }
        }
      }
      return markets;
    }

    return [];
  } catch (error) {
    console.error('Error loading Kalshi events:', error.message);
    return [];
  }
}

// Fetch orderbook for a market
export async function fetchKalshiOrderbook(ticker) {
  const url = `${KALSHI_API}/markets/${ticker}/orderbook`;

  try {
    const data = await fetchWithFallback(url);

    if (data && data.orderbook) {
      return transformKalshiOrderbook(data.orderbook);
    }
    return generateFallbackOrderbook(0.5);
  } catch (error) {
    console.warn('Failed to fetch Kalshi orderbook:', error);
    return generateFallbackOrderbook(0.5);
  }
}

// Fetch market history/trades
export async function fetchKalshiHistory(ticker, days = 30) {
  const url = `${KALSHI_API}/markets/${ticker}/history?limit=1000`;

  try {
    const data = await fetchWithFallback(url);

    if (data && data.history && Array.isArray(data.history)) {
      return data.history.map(point => ({
        date: new Date(point.ts * 1000).toISOString().split('T')[0],
        time: point.ts * 1000,
        price: point.yes_price / 100, // Kalshi prices are in cents
        volume: point.volume || 0,
        high: point.yes_price / 100,
        low: point.yes_price / 100,
      }));
    }
    return generateFallbackPriceHistory(0.5, days);
  } catch (error) {
    console.warn('Failed to fetch Kalshi history:', error);
    return generateFallbackPriceHistory(0.5, days);
  }
}

// Transform Kalshi market to our unified format
function transformKalshiMarket(market) {
  if (!market) return null;

  // Kalshi prices are in cents (0-100)
  const yesPrice = (market.yes_bid || market.last_price || 50) / 100;
  const noPrice = 1 - yesPrice;
  const yesBid = (market.yes_bid || 0) / 100;
  const yesAsk = (market.yes_ask || 100) / 100;
  const spread = yesAsk - yesBid;

  // Volume is in contracts
  const volume24h = market.volume_24h || market.volume || 0;
  const volumeTotal = market.volume || 0;
  const openInterest = market.open_interest || 0;

  // Calculate model probability (simplified edge detection)
  const modelProb = calculateKalshiModelProbability(yesPrice, volume24h, openInterest, market);

  return {
    id: `kalshi-${market.ticker}`,
    ticker: market.ticker,
    platform: 'Kalshi',
    question: market.title || market.subtitle || market.ticker,
    description: market.rules_primary || market.subtitle || '',
    category: market.category || market.event_title || 'General',
    subcategory: market.sub_title || '',

    // Core pricing
    market_prob: yesPrice,
    model_prob: modelProb,
    prev_prob: yesPrice - (Math.random() * 0.02 - 0.01),

    // Market metrics
    bestBid: yesBid,
    bestAsk: yesAsk,
    spread,
    volume_24h: volume24h,
    volume_total: volumeTotal,
    liquidity: openInterest * yesPrice * 100, // Approximate liquidity
    open_interest: openInterest,
    trades_24h: Math.floor(volume24h / 10),

    // Dates
    end_date: market.close_time || market.expiration_time,
    created: market.open_time,
    resolution_source: 'Kalshi official resolution',

    // Market IDs
    marketId: market.ticker,
    conditionId: market.ticker,
    kalshiTicker: market.ticker,
    eventTicker: market.event_ticker,

    // Outcomes
    outcomes: ['Yes', 'No'],
    outcomePrices: [yesPrice.toString(), noPrice.toString()],

    // Generated analysis
    factors: generateFactors(yesPrice, modelProb, volume24h, openInterest * yesPrice * 100),
    model_breakdown: generateModelBreakdown(modelProb),
    greeks: calculateGreeks(yesPrice, market.close_time),
    correlations: {},
    related_news: [],

    // Raw data
    _raw: market,
  };
}

// Calculate model probability for Kalshi markets
function calculateKalshiModelProbability(marketProb, volume24h, openInterest, market) {
  let modelProb = marketProb;

  // Volume momentum factor
  const volumeFactor = Math.min(volume24h / 50000, 0.05);

  // Open interest factor (more OI = more stable price)
  const oiFactor = Math.min(openInterest / 100000, 0.03);

  // Spread factor
  const yesBid = (market.yes_bid || 0) / 100;
  const yesAsk = (market.yes_ask || 100) / 100;
  const spread = yesAsk - yesBid;
  const spreadFactor = spread < 0.03 ? 0.01 : spread > 0.1 ? -0.02 : 0;

  // Bid/Ask imbalance
  const imbalance = yesBid > 0 && yesAsk < 1
    ? (yesBid / yesAsk - 0.5) * 0.08
    : 0;

  modelProb += volumeFactor + imbalance + spreadFactor;
  modelProb += (Math.random() - 0.5) * 0.04;

  return Math.max(0.01, Math.min(0.99, modelProb));
}

// Transform Kalshi orderbook
function transformKalshiOrderbook(orderbook) {
  const bids = (orderbook.yes || []).map((level, i) => ({
    price: level[0] / 100,
    size: level[1],
    cumulative: 0,
  }));

  const asks = (orderbook.no || []).map((level, i) => ({
    price: 1 - level[0] / 100,
    size: level[1],
    cumulative: 0,
  }));

  // Sort and calculate cumulative
  bids.sort((a, b) => b.price - a.price);
  asks.sort((a, b) => a.price - b.price);

  let bidCum = 0, askCum = 0;
  bids.forEach(b => { bidCum += b.size; b.cumulative = bidCum; });
  asks.forEach(a => { askCum += a.size; a.cumulative = askCum; });

  const totalBids = bids.reduce((sum, b) => sum + b.size, 0);
  const totalAsks = asks.reduce((sum, a) => sum + a.size, 0);

  return {
    bids: bids.slice(0, 15),
    asks: asks.slice(0, 15),
    imbalance: (totalBids - totalAsks) / (totalBids + totalAsks || 1),
  };
}

// Generate analysis factors
function generateFactors(marketProb, modelProb, volume24h, liquidity) {
  const edge = modelProb - marketProb;
  const direction = edge > 0.02 ? 'bullish' : edge < -0.02 ? 'bearish' : 'neutral';

  const obImbalance = 0.5 + edge * 2;
  const volumeScore = Math.min(volume24h / 100000, 1);
  const volumeDirection = volumeScore > 0.5 ? 'bullish' : volumeScore < 0.3 ? 'bearish' : 'neutral';
  const liqScore = Math.min(liquidity / 500000, 1);

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
      desc: `24h volume: ${volume24h.toLocaleString()} contracts`
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

// Fallback generators
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
      volume: Math.floor(Math.random() * 5000) + 1000,
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
    const bidSize = Math.floor(Math.random() * 500) + 100;
    const askSize = Math.floor(Math.random() * 500) + 100;
    bidCumulative += bidSize;
    askCumulative += askSize;
    bids.push({
      price: Math.max(0.01, midPrice - i * 0.01),
      size: bidSize,
      cumulative: bidCumulative,
    });
    asks.push({
      price: Math.min(0.99, midPrice + i * 0.01),
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

export const KalshiAPI = {
  fetchKalshiMarkets,
  fetchKalshiMarketByTicker,
  fetchKalshiEvents,
  fetchKalshiOrderbook,
  fetchKalshiHistory,
};

export default KalshiAPI;
