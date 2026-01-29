// Manifold Markets API Service - Real market data integration
// Docs: https://docs.manifold.markets/api
import { sanitizeText } from '../utils/sanitize';

const MANIFOLD_API = 'https://api.manifold.markets/v0';

// Simple fetch wrapper (Manifold has good CORS support)
async function fetchManifold(endpoint, options = {}) {
  const url = `${MANIFOLD_API}${endpoint}`;
  
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Accept': 'application/json',
        ...options.headers,
      },
    });
    
    if (!response.ok) {
      throw new Error(`Manifold API error: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Manifold fetch failed:', error.message);
    throw error;
  }
}

// Check if URL/input is for Manifold
export function isManifoldUrl(input) {
  if (!input) return false;
  const lower = input.toLowerCase().trim();
  return lower.includes('manifold.markets');
}

// Extract market slug from Manifold URL
export function extractManifoldSlug(url) {
  try {
    const urlObj = new URL(url);
    // Manifold URLs: manifold.markets/username/market-slug
    const pathParts = urlObj.pathname.split('/').filter(Boolean);
    if (pathParts.length >= 2) {
      return pathParts[pathParts.length - 1]; // The slug
    }
    return null;
  } catch {
    return url; // Assume it's already a slug or ID
  }
}

// Fetch open markets sorted by liquidity/volume
export async function fetchOpenMarkets(limit = 50) {
  try {
    const data = await fetchManifold(
      `/search-markets?term=&sort=liquidity&filter=open&limit=${Math.min(limit, 100)}`
    );
    
    if (!Array.isArray(data)) {
      console.warn('Unexpected Manifold response');
      return [];
    }
    
    // Filter to binary markets with activity
    const markets = data
      .filter(m => m.outcomeType === 'BINARY' && !m.isResolved && m.volume > 0)
      .slice(0, limit)
      .map(transformManifoldMarket)
      .filter(Boolean);
    
    return markets;
  } catch (error) {
    console.error('Error loading Manifold markets:', error.message);
    return [];
  }
}

// Fetch market by slug (searches for it)
export async function fetchMarketBySlug(slug) {
  const cleanSlug = extractManifoldSlug(slug);
  
  try {
    // Try direct slug lookup first
    const data = await fetchManifold(`/slug/${cleanSlug}`);
    
    if (!data || !data.id) {
      throw new Error('Market not found');
    }
    
    return transformManifoldMarket(data);
  } catch (error) {
    console.error('Error loading Manifold market:', error.message);
    throw error;
  }
}

// Fetch market by ID
export async function fetchMarketById(id) {
  try {
    const data = await fetchManifold(`/market/${id}`);
    
    if (!data || !data.id) {
      throw new Error('Market not found');
    }
    
    return transformManifoldMarket(data);
  } catch (error) {
    console.error('Error loading Manifold market by ID:', error.message);
    throw error;
  }
}

// Fetch price history from bets
export async function fetchPriceHistory(marketId, days = 90) {
  try {
    // Fetch recent bets to build price history
    const bets = await fetchManifold(`/bets?contractId=${marketId}&limit=1000`);
    
    if (!Array.isArray(bets) || bets.length === 0) {
      return generateFallbackHistory(0.5, days);
    }
    
    // Convert bets to price history
    // Sort by time ascending
    const sortedBets = bets
      .filter(b => b.probAfter !== undefined)
      .sort((a, b) => a.createdTime - b.createdTime);
    
    if (sortedBets.length === 0) {
      return generateFallbackHistory(0.5, days);
    }
    
    // Group by day and get daily closing price
    const dailyPrices = new Map();
    const cutoffTime = Date.now() - (days * 24 * 60 * 60 * 1000);
    
    sortedBets.forEach(bet => {
      if (bet.createdTime < cutoffTime) return;
      const date = new Date(bet.createdTime).toISOString().split('T')[0];
      dailyPrices.set(date, {
        date,
        time: bet.createdTime,
        price: bet.probAfter,
        volume: (dailyPrices.get(date)?.volume || 0) + Math.abs(bet.amount || 0),
      });
    });
    
    // Convert to array and fill gaps
    const history = Array.from(dailyPrices.values()).sort((a, b) => a.time - b.time);
    
    // Add high/low (approximated from price movement)
    history.forEach((point, i) => {
      const prevPrice = i > 0 ? history[i - 1].price : point.price;
      point.high = Math.max(point.price, prevPrice) + 0.01;
      point.low = Math.min(point.price, prevPrice) - 0.01;
      point.high = Math.min(0.99, point.high);
      point.low = Math.max(0.01, point.low);
    });
    
    // Mark as real data
    history._isReal = true;
    return history;
  } catch (error) {
    console.warn('Failed to fetch Manifold price history:', error);
    return generateFallbackHistory(0.5, days);
  }
}

// Manifold doesn't have traditional orderbook - generate from pool
export async function fetchOrderbook(market) {
  // Manifold uses AMM (CPMM), not orderbook
  // We'll generate a synthetic orderbook from the pool
  const pool = market?.pool || market?._raw?.pool;
  const prob = market?.market_prob || market?.probability || 0.5;
  
  if (!pool) {
    return generateFallbackOrderbook(prob);
  }
  
  const yesPool = pool.YES || 1000;
  const noPool = pool.NO || 1000;
  const totalLiquidity = yesPool + noPool;
  
  // Generate synthetic levels based on AMM curve
  const bids = [];
  const asks = [];
  let bidCum = 0, askCum = 0;
  
  for (let i = 1; i <= 10; i++) {
    // AMM impact calculation (simplified)
    const priceImpact = i * 0.005;
    const bidPrice = Math.max(0.01, prob - priceImpact);
    const askPrice = Math.min(0.99, prob + priceImpact);
    
    // Size decreases with distance from mid
    const sizeFactor = Math.max(0.1, 1 - (i * 0.08));
    const baseSize = totalLiquidity * 0.02 * sizeFactor;
    
    bidCum += baseSize;
    askCum += baseSize;
    
    bids.push({ price: bidPrice, size: baseSize, cumulative: bidCum });
    asks.push({ price: askPrice, size: baseSize, cumulative: askCum });
  }
  
  return {
    bids,
    asks,
    imbalance: (yesPool - noPool) / totalLiquidity,
    _synthetic: true,
    _note: 'Manifold uses AMM - orderbook is synthetic',
  };
}

// Transform Manifold market to our unified format
function transformManifoldMarket(market) {
  if (!market) return null;
  
  // Only support binary markets for now
  if (market.outcomeType !== 'BINARY') return null;
  
  const prob = market.probability || market.p || 0.5;
  const pool = market.pool || {};
  const yesPool = pool.YES || 0;
  const noPool = pool.NO || 0;
  const totalLiquidity = market.totalLiquidity || (yesPool + noPool);
  
  // Generate ticker from question
  const ticker = generateTicker(market.question);
  
  // Calculate synthetic bid/ask from AMM
  const spread = 0.02; // ~2% spread for AMM
  const bestBid = Math.max(0.01, prob - spread / 2);
  const bestAsk = Math.min(0.99, prob + spread / 2);
  
  // Heuristic probability (minimal adjustment for Manifold - markets are already efficient)
  const modelProb = calculateHeuristicProbability(prob, market.volume24Hours, totalLiquidity);
  
  return {
    id: market.id,
    ticker: sanitizeText(ticker, { maxLength: 20, allowNewlines: false }),
    platform: 'Manifold',
    question: sanitizeText(market.question, { maxLength: 500 }),
    description: sanitizeText(market.textDescription || '', { maxLength: 2000 }),
    category: 'General', // Manifold doesn't have categories in API
    
    // Core pricing
    market_prob: prob,
    model_prob: modelProb,
    prev_prob: null, // Would need historical lookup
    
    // Market metrics  
    bestBid,
    bestAsk,
    spread: bestAsk - bestBid,
    volume_24h: market.volume24Hours || 0,
    volume_total: market.volume || 0,
    liquidity: totalLiquidity,
    open_interest: market.uniqueBettorCount || 0,
    trades_24h: Math.floor((market.volume24Hours || 0) / 50),
    
    // Pool info (Manifold-specific)
    pool: { yes: yesPool, no: noPool },
    
    // Dates
    end_date: market.closeTime ? new Date(market.closeTime).toISOString() : null,
    created: market.createdTime ? new Date(market.createdTime).toISOString() : null,
    resolution_source: 'Manifold Markets resolution',
    
    // IDs
    marketId: market.id,
    slug: market.slug,
    url: market.url,
    
    // Outcomes
    outcomes: ['Yes', 'No'],
    outcomePrices: [prob, 1 - prob],
    
    // Creator info
    creator: {
      username: market.creatorUsername,
      name: market.creatorName,
      avatarUrl: market.creatorAvatarUrl,
    },
    
    // Generated analysis
    factors: generateFactors(prob, modelProb, market.volume24Hours, totalLiquidity, market),
    greeks: calculateGreeks(prob, market.closeTime),
    
    // Status
    isResolved: market.isResolved || false,
    resolution: market.resolution,
    
    // Raw data
    _raw: market,
    _source: 'manifold',
  };
}

// Generate ticker from question
function generateTicker(question) {
  if (!question) return 'MKT';
  
  // Remove common words and take first letters
  const stopWords = ['will', 'the', 'be', 'a', 'an', 'in', 'on', 'at', 'to', 'for', 'of', 'and', 'or', 'is', 'are', 'was', 'were', 'has', 'have', 'this', 'that', 'with', 'by'];
  const words = question
    .replace(/[^a-zA-Z0-9\s]/g, '')
    .split(/\s+/)
    .filter(w => w.length > 1 && !stopWords.includes(w.toLowerCase()))
    .slice(0, 4);
  
  if (words.length === 0) return 'MKT';
  
  // Take first letter of each word, max 6 chars
  return words.map(w => w[0]).join('').toUpperCase().slice(0, 6);
}

// Calculate heuristic probability (minimal for Manifold - prediction markets are efficient)
function calculateHeuristicProbability(marketProb, volume24h, liquidity) {
  // Manifold markets tend to be well-calibrated
  // Only small adjustments based on activity
  let adjustment = 0;
  
  // Higher volume = more confidence in market price (smaller adjustment)
  const volumeFactor = Math.min(volume24h / 10000, 1);
  const liquidityFactor = Math.min(liquidity / 50000, 1);
  const confidence = (volumeFactor + liquidityFactor) / 2;
  
  // Very small mean reversion toward 0.5 for low-activity markets
  if (confidence < 0.3) {
    adjustment = (0.5 - marketProb) * 0.02 * (1 - confidence);
  }
  
  return Math.max(0.01, Math.min(0.99, marketProb + adjustment));
}

// Generate factors from real data
function generateFactors(marketProb, heuristicProb, volume24h, liquidity, market) {
  const edge = heuristicProb - marketProb;
  const direction = edge > 0.02 ? 'bullish' : edge < -0.02 ? 'bearish' : 'neutral';
  
  const pool = market.pool || {};
  const yesPool = pool.YES || 0;
  const noPool = pool.NO || 0;
  const hasPool = yesPool > 0 && noPool > 0;
  
  return {
    pool_imbalance: {
      value: hasPool ? yesPool / (yesPool + noPool) : null,
      contribution: hasPool ? (yesPool / (yesPool + noPool) - 0.5) * 0.05 : 0,
      direction: hasPool ? (yesPool > noPool ? 'bullish' : 'bearish') : 'neutral',
      desc: hasPool ? `Pool: ${yesPool.toFixed(0)} YES / ${noPool.toFixed(0)} NO` : 'No pool data',
      isReal: hasPool,
    },
    volume_trend: {
      value: Math.min((volume24h || 0) / 5000, 1),
      contribution: Math.min((volume24h || 0) / 5000, 0.05),
      direction: volume24h > 500 ? 'bullish' : volume24h < 50 ? 'bearish' : 'neutral',
      desc: `24h volume: M$${(volume24h || 0).toFixed(0)}`,
      isReal: true,
    },
    liquidity_score: {
      value: Math.min(liquidity / 50000, 1),
      contribution: Math.min(liquidity / 50000, 0.03),
      direction: liquidity > 5000 ? 'bullish' : 'neutral',
      desc: `Liquidity: M$${liquidity.toFixed(0)}`,
      isReal: true,
    },
    unique_bettors: {
      value: market.uniqueBettorCount ? Math.min(market.uniqueBettorCount / 100, 1) : null,
      contribution: market.uniqueBettorCount ? Math.min(market.uniqueBettorCount / 100, 0.03) : 0,
      direction: market.uniqueBettorCount > 50 ? 'bullish' : 'neutral',
      desc: market.uniqueBettorCount ? `${market.uniqueBettorCount} traders` : 'No data',
      isReal: !!market.uniqueBettorCount,
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
      contribution: edge * 0.1,
      direction,
      desc: `Edge: ${(edge * 100).toFixed(1)}%`,
      isReal: false,
      isHeuristic: true,
    },
  };
}

// Calculate Greeks
function calculateGreeks(marketProb, closeTime) {
  const daysToExpiry = closeTime
    ? Math.max(1, (new Date(closeTime) - new Date()) / (1000 * 60 * 60 * 24))
    : 365; // Manifold markets can be long-dated
  
  const delta = marketProb;
  const gamma = 4 * marketProb * (1 - marketProb);
  const theta = -0.01 * (1 / Math.sqrt(daysToExpiry));
  const vega = Math.sqrt(marketProb * (1 - marketProb)) * 0.5;
  const rho = 0.01;
  
  return { delta, gamma, theta, vega, rho };
}

// Fallback price history generator
function generateFallbackHistory(currentPrice, days) {
  const history = [];
  let price = currentPrice - (Math.random() * 0.08 - 0.02);
  
  for (let i = days; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    
    const drift = (currentPrice - price) * 0.03;
    price += drift + (Math.random() - 0.5) * 0.015;
    price = Math.max(0.01, Math.min(0.99, price));
    
    history.push({
      date: date.toISOString().split('T')[0],
      time: date.getTime(),
      price,
      volume: Math.floor(Math.random() * 200) + 20,
      high: Math.min(0.99, price + Math.random() * 0.02),
      low: Math.max(0.01, price - Math.random() * 0.02),
    });
  }
  
  history[history.length - 1].price = currentPrice;
  history._isSimulated = true;
  return history;
}

// Fallback orderbook generator
function generateFallbackOrderbook(midPrice) {
  const bids = [], asks = [];
  let bidCum = 0, askCum = 0;
  
  for (let i = 1; i <= 10; i++) {
    const size = Math.floor(Math.random() * 500) + 100;
    bidCum += size;
    askCum += size;
    
    bids.push({
      price: Math.max(0.01, midPrice - i * 0.01),
      size,
      cumulative: bidCum,
    });
    asks.push({
      price: Math.min(0.99, midPrice + i * 0.01),
      size,
      cumulative: askCum,
    });
  }
  
  return {
    bids,
    asks,
    imbalance: 0,
    _synthetic: true,
  };
}

export const ManifoldAPI = {
  fetchOpenMarkets,
  fetchMarketBySlug,
  fetchMarketById,
  fetchPriceHistory,
  fetchOrderbook,
  isManifoldUrl,
  extractManifoldSlug,
};

export default ManifoldAPI;
