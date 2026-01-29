// Manifold Markets API Service - Real market data integration
// v2.0 - With caching, rate limiting, and honest data handling
// Docs: https://docs.manifold.markets/api
import { sanitizeText } from '../utils/sanitize';
import { getCached, setCache, waitForRateLimit } from '../utils/apiCache';

const MANIFOLD_API = 'https://api.manifold.markets/v0';

// Manifold has good CORS support, no proxy needed
const CACHE_TTL = {
  MARKETS: 30 * 1000,
  PRICE_HISTORY: 60 * 1000,
  MARKET: 60 * 1000,
};

/**
 * Fetch from Manifold with caching
 */
async function fetchManifold(endpoint, options = {}) {
  const url = `${MANIFOLD_API}${endpoint}`;
  const cacheKey = `manifold:${endpoint}`;
  const cacheTtl = options.cacheTtl || CACHE_TTL.MARKETS;

  const cached = getCached(cacheKey);
  if (cached !== null) return cached;

  await waitForRateLimit('manifold', 200);

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

    const data = await response.json();
    setCache(cacheKey, data, cacheTtl);
    return data;
  } catch (error) {
    console.error('Manifold fetch failed:', error.message);
    throw error;
  }
}

/**
 * Check if URL is for Manifold
 */
export function isManifoldUrl(input) {
  if (!input) return false;
  return input.toLowerCase().includes('manifold.markets');
}

/**
 * Extract market slug from Manifold URL
 */
export function extractManifoldSlug(url) {
  try {
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split('/').filter(Boolean);
    if (pathParts.length >= 2) {
      return pathParts[pathParts.length - 1];
    }
    return null;
  } catch {
    return url;
  }
}

/**
 * Fetch open markets sorted by liquidity
 */
export async function fetchOpenMarkets(limit = 50) {
  try {
    const data = await fetchManifold(
      `/search-markets?term=&sort=liquidity&filter=open&limit=${Math.min(limit, 100)}`,
      { cacheTtl: CACHE_TTL.MARKETS }
    );

    if (!Array.isArray(data)) {
      console.warn('Unexpected Manifold response');
      return [];
    }

    return data
      .filter(m => m.outcomeType === 'BINARY' && !m.isResolved && m.volume > 0)
      .slice(0, limit)
      .map(transformManifoldMarket)
      .filter(Boolean);
  } catch (error) {
    console.error('Manifold fetch failed:', error.message);
    return [];
  }
}

/**
 * Fetch market by slug
 */
export async function fetchMarketBySlug(slug) {
  const cleanSlug = extractManifoldSlug(slug);

  try {
    const data = await fetchManifold(`/slug/${cleanSlug}`, { cacheTtl: CACHE_TTL.MARKET });

    if (!data || !data.id) {
      throw new Error('Market not found');
    }

    return transformManifoldMarket(data);
  } catch (error) {
    console.error('Manifold market fetch failed:', error.message);
    throw error;
  }
}

/**
 * Fetch market by ID
 */
export async function fetchMarketById(id) {
  try {
    const data = await fetchManifold(`/market/${id}`, { cacheTtl: CACHE_TTL.MARKET });

    if (!data || !data.id) {
      throw new Error('Market not found');
    }

    return transformManifoldMarket(data);
  } catch (error) {
    console.error('Manifold market fetch failed:', error.message);
    throw error;
  }
}

/**
 * Fetch price history (bets) - returns null if unavailable (NO FAKE DATA)
 */
export async function fetchPriceHistory(marketId, days = 90) {
  if (!marketId) return null;

  try {
    const data = await fetchManifold(
      `/bets?contractId=${marketId}&limit=500`,
      { cacheTtl: CACHE_TTL.PRICE_HISTORY }
    );

    if (!Array.isArray(data) || data.length === 0) {
      return null; // NO FAKE DATA
    }

    // Group bets by day and calculate OHLC
    const byDay = new Map();
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;

    for (const bet of data) {
      if (bet.createdTime < cutoff) continue;

      const date = new Date(bet.createdTime).toISOString().split('T')[0];
      const prob = bet.probAfter || bet.probability;

      if (!prob) continue;

      if (!byDay.has(date)) {
        byDay.set(date, { prices: [], volume: 0 });
      }

      byDay.get(date).prices.push(prob);
      byDay.get(date).volume += Math.abs(bet.amount || 0);
    }

    if (byDay.size === 0) return null;

    const history = [];
    for (const [date, { prices, volume }] of byDay.entries()) {
      if (prices.length === 0) continue;

      history.push({
        date,
        time: new Date(date).getTime(),
        price: prices[prices.length - 1],
        volume,
        high: Math.max(...prices),
        low: Math.min(...prices),
        isReal: true,
      });
    }

    return history.sort((a, b) => a.time - b.time);
  } catch (error) {
    console.warn('Manifold price history failed:', error.message);
    return null;
  }
}

/**
 * Fetch orderbook (simulated from probability) - Manifold uses AMM
 * Returns null since Manifold doesn't have a traditional orderbook
 */
export async function fetchOrderbook(market) {
  // Manifold uses an AMM, not an orderbook
  // Return null to indicate no orderbook data
  return null;
}

/**
 * Transform Manifold market to our format
 */
function transformManifoldMarket(market) {
  if (!market || !market.id) return null;

  const prob = market.probability || 0.5;
  const volume = market.volume || 0;
  const volume24h = market.volume24Hours || volume * 0.1;
  const liquidity = market.totalLiquidity || market.pool?.YES || 0;

  const signalProb = calculateSignalProbability(prob, volume24h, liquidity, market);

  // Generate ticker from question
  const ticker = generateTicker(market.question || market.slug);

  return {
    id: `manifold-${market.id}`,
    ticker: sanitizeText(ticker, { maxLength: 20, allowNewlines: false }),
    platform: 'Manifold',
    _source: 'manifold',
    question: sanitizeText(market.question, { maxLength: 500 }),
    title: sanitizeText(market.question, { maxLength: 500 }),
    description: sanitizeText(market.description || market.textDescription || '', { maxLength: 2000 }),
    category: sanitizeText(market.groupSlugs?.[0] || 'General', { maxLength: 50, allowNewlines: false }),
    subcategory: sanitizeText(market.groupSlugs?.[1] || '', { maxLength: 50, allowNewlines: false }),

    market_prob: prob,
    model_prob: signalProb,
    signal_prob: signalProb,
    prev_prob: market.prob24HoursAgo || null,

    bestBid: prob - 0.02,
    bestAsk: prob + 0.02,
    spread: 0.04, // AMM spread
    volume_24h: volume24h,
    volume_total: volume,
    liquidity,
    open_interest: liquidity,
    trades_24h: market.uniqueBettors24Hours || Math.floor(volume24h / 100),

    end_date: market.closeTime ? new Date(market.closeTime).toISOString() : null,
    created: market.createdTime ? new Date(market.createdTime).toISOString() : null,
    resolution_source: 'Manifold community resolution',

    marketId: market.id,
    slug: market.slug,
    url: market.url || `https://manifold.markets/${market.creatorUsername}/${market.slug}`,

    outcomes: ['Yes', 'No'],
    outcomePrices: [prob, 1 - prob],

    factors: generateFactors(prob, signalProb, volume24h, liquidity),
    signal_breakdown: generateSignalBreakdown(prob, volume24h, liquidity, market),
    model_breakdown: generateSignalBreakdown(prob, volume24h, liquidity, market),
    greeks: calculateGreeks(prob, market.closeTime),

    // Manifold-specific
    uniqueBettors: market.uniqueBettorCount || 0,
    creator: market.creatorUsername,

    _isHeuristic: true,
    _disclaimer: 'Signal probabilities are heuristics, not ML predictions',
    _ammBased: true, // Flag that this uses AMM, not orderbook
    _raw: market,
  };
}

/**
 * Generate ticker from question
 */
function generateTicker(question) {
  if (!question) return 'MF';
  const words = question.split(' ')
    .filter(w => w.length > 2 && !['will', 'the', 'and', 'for', 'are', 'was', 'has', 'have', 'does'].includes(w.toLowerCase()))
    .slice(0, 3);
  return words.map(w => w[0]).join('').toUpperCase() || 'MF';
}

/**
 * Calculate signal probability (heuristic)
 */
function calculateSignalProbability(marketProb, volume24h, liquidity, market) {
  let signalProb = marketProb;

  // Volume factor
  const volumeFactor = Math.min(volume24h / 10000, 0.03);

  // Liquidity factor
  const liqFactor = Math.min(liquidity / 50000, 0.02);

  // Unique bettors factor (more bettors = more information)
  const bettors = market.uniqueBettorCount || 0;
  const bettorFactor = Math.min(bettors / 100, 0.02);

  signalProb += volumeFactor + liqFactor + bettorFactor;

  return Math.max(0.01, Math.min(0.99, signalProb));
}

/**
 * Generate factors
 */
function generateFactors(marketProb, signalProb, volume24h, liquidity) {
  const edge = signalProb - marketProb;
  const direction = edge > 0.02 ? 'bullish' : edge < -0.02 ? 'bearish' : 'neutral';
  const volumeScore = Math.min(volume24h / 20000, 1);
  const liqScore = Math.min(liquidity / 100000, 1);

  return {
    volume_trend: {
      value: volumeScore,
      contribution: volumeScore * 0.08,
      direction: volumeScore > 0.5 ? 'bullish' : 'neutral',
      desc: `24h volume: M$${(volume24h / 1000).toFixed(1)}K`,
      isReal: true,
    },
    liquidity_score: {
      value: liqScore,
      contribution: liqScore * 0.05,
      direction: liqScore > 0.5 ? 'bullish' : 'neutral',
      desc: `Liquidity: M$${(liquidity / 1000).toFixed(1)}K`,
      isReal: true,
    },
    amm_indicator: {
      value: 1.0,
      contribution: 0,
      direction: 'neutral',
      desc: 'AMM-based pricing (no orderbook)',
      isReal: true,
      isAMM: true,
    },
    signal_edge: {
      value: 0.5 + edge,
      contribution: edge * 0.15,
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
function generateSignalBreakdown(marketProb, volume24h, liquidity, market) {
  const volumeConfidence = Math.min(volume24h / 10000, 1);
  const liqConfidence = Math.min(liquidity / 50000, 1);
  const bettorConfidence = Math.min((market.uniqueBettorCount || 0) / 50, 1);

  return {
    market_consensus: {
      prob: marketProb,
      weight: 0.55,
      confidence: 1.0,
      label: 'AMM Price',
      desc: 'Current probability (AMM)',
      isReal: true,
    },
    volume_signal: {
      prob: marketProb,
      weight: 0.20,
      confidence: volumeConfidence,
      label: 'Volume Signal',
      desc: volume24h > 1000 ? 'Active trading' : 'Low activity',
      isReal: true,
    },
    liquidity_depth: {
      prob: marketProb,
      weight: 0.15,
      confidence: liqConfidence,
      label: 'Liquidity Pool',
      desc: liquidity > 10000 ? 'Deep pool' : 'Shallow pool',
      isReal: true,
    },
    bettor_diversity: {
      prob: marketProb,
      weight: 0.10,
      confidence: bettorConfidence,
      label: 'Unique Bettors',
      desc: `${market.uniqueBettorCount || 0} traders`,
      isReal: true,
    },
    _isHeuristic: true,
    _disclaimer: 'Market signals from real data (AMM-based)',
  };
}

/**
 * Calculate Greeks
 */
function calculateGreeks(marketProb, closeTime) {
  const daysToExpiry = closeTime
    ? Math.max(1, (new Date(closeTime) - new Date()) / (1000 * 60 * 60 * 24))
    : 30;

  return {
    delta: marketProb,
    gamma: 4 * marketProb * (1 - marketProb),
    theta: -0.01 * (1 / Math.sqrt(daysToExpiry)),
    vega: Math.sqrt(marketProb * (1 - marketProb)) * 0.5,
    rho: 0.01,
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
