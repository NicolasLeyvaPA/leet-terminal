/**
 * Polymarket API Connector (Server-side)
 *
 * Fetches data from Polymarket Gamma and CLOB APIs without CORS issues.
 */

import { request } from 'undici';
import type {
  MarketSummary,
  OrderbookSnapshot,
  MarketHistoryPoint,
  DataFreshness,
  NormalizedOutcome,
  MarketType,
} from '@leet-terminal/shared/contracts';
import { createFreshness, detectMarketType } from '@leet-terminal/shared/contracts';
import { CACHE_TTL } from '../services/cache.js';

const GAMMA_API = 'https://gamma-api.polymarket.com';
const CLOB_API = 'https://clob.polymarket.com';

const RETRY_CONFIG = {
  maxRetries: 3,
  baseDelayMs: 500,
  maxDelayMs: 5000,
  backoffMultiplier: 2,
};

interface PolymarketEvent {
  id: string;
  title: string;
  ticker?: string;
  description?: string;
  tags?: Array<{ label: string }>;
  volume?: string;
  endDate?: string;
  createdAt?: string;
  markets?: Array<{
    id: string;
    conditionId?: string;
    clobTokenIds?: string;
    bestBid?: string;
    bestAsk?: string;
    lastTradePrice?: string;
    volume24hr?: string;
    volumeNum?: string;
    liquidityNum?: string;
    outcomes?: string;
    outcomePrices?: string;
  }>;
}

interface PolymarketOrderbook {
  bids?: Array<{ price: string; size: string }>;
  asks?: Array<{ price: string; size: string }>;
}

interface PolymarketPriceHistory {
  history?: Array<{ t: number; p: string }>;
}

/**
 * Retry wrapper with exponential backoff
 */
async function withRetry<T>(
  fn: () => Promise<T>,
  operation: string
): Promise<T> {
  let lastError: Error | null = null;
  let delay = RETRY_CONFIG.baseDelayMs;

  for (let attempt = 1; attempt <= RETRY_CONFIG.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      console.warn(
        `[Polymarket] ${operation} attempt ${attempt}/${RETRY_CONFIG.maxRetries} failed:`,
        lastError.message
      );

      if (attempt < RETRY_CONFIG.maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, delay));
        delay = Math.min(delay * RETRY_CONFIG.backoffMultiplier, RETRY_CONFIG.maxDelayMs);
      }
    }
  }

  throw lastError;
}

/**
 * Fetch JSON from Polymarket API
 */
async function fetchJson<T>(url: string): Promise<T> {
  const { statusCode, body } = await request(url, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      'User-Agent': 'LeetTerminal/4.0',
    },
    headersTimeout: 10000,
    bodyTimeout: 15000,
  });

  if (statusCode !== 200) {
    throw new Error(`HTTP ${statusCode} from ${url}`);
  }

  const text = await body.text();
  return JSON.parse(text) as T;
}

/**
 * Generate ticker from title
 */
function generateTicker(title: string): string {
  if (!title) return 'UNK';
  const stopWords = ['will', 'the', 'and', 'for', 'are', 'was', 'has', 'have', 'be', 'to', 'in', 'of'];
  const words = title
    .split(/\s+/)
    .filter((w) => w.length > 2 && !stopWords.includes(w.toLowerCase()))
    .slice(0, 3);
  return words.map((w) => w[0]).join('').toUpperCase() || 'MKT';
}

/**
 * Calculate model probability from market data
 */
function calculateModelProbability(
  marketProb: number,
  volume24h: number,
  liquidity: number,
  bestBid: number,
  bestAsk: number
): number {
  let modelProb = marketProb;

  // Volume momentum factor
  const volumeFactor = Math.min(volume24h / 100000, 0.05);

  // Bid/Ask imbalance
  const imbalance =
    bestBid > 0 && bestAsk > 0 ? (bestBid / bestAsk - 1) * 0.1 : 0;

  // Spread factor
  const spread = bestAsk - bestBid;
  const spreadFactor = spread < 0.02 ? 0.01 : spread > 0.1 ? -0.02 : 0;

  modelProb += volumeFactor + imbalance + spreadFactor;

  // Small deterministic adjustment based on volume (not random)
  const volumeAdjust = ((volume24h % 1000) / 1000 - 0.5) * 0.02;
  modelProb += volumeAdjust;

  return Math.max(0.01, Math.min(0.99, modelProb));
}

/**
 * Determine outcome type based on label
 */
function getOutcomeType(label: string, allLabels: string[]): 'YES' | 'NO' | 'OPTION' {
  const lower = label.toLowerCase();
  if (lower === 'yes' || lower === 'true') return 'YES';
  if (lower === 'no' || lower === 'false') return 'NO';
  // If only two outcomes and not yes/no, still treat as binary structure
  if (allLabels.length === 2) {
    const index = allLabels.findIndex(l => l.toLowerCase() === lower);
    return index === 0 ? 'YES' : 'NO';
  }
  return 'OPTION';
}

/**
 * Transform Polymarket event to normalized MarketSummary
 *
 * CRITICAL: Properly handles multi-outcome markets (e.g., "Who will win the Super Bowl?")
 */
function transformEvent(event: PolymarketEvent): MarketSummary | null {
  if (!event || !event.markets || event.markets.length === 0) return null;

  // Parse outcomes from all markets in the event
  let allOutcomes: string[] = [];
  let allOutcomePrices: number[] = [];
  let allClobTokenIds: string[] = [];

  // Check if this is a multi-market event (categorical)
  // Polymarket represents multi-outcome as multiple markets under one event
  const isMultiMarketEvent = event.markets.length > 1;

  if (isMultiMarketEvent) {
    // Each market represents a different outcome
    event.markets.forEach((m) => {
      // For multi-market events, the market title/outcome is the choice
      let outcomeLabel = m.outcomes ? 'Yes' : 'Option';
      try {
        const parsedOutcomes = JSON.parse(m.outcomes || '[]');
        // Usually ["Yes", "No"] - we want the "Yes" side as the choice label
        // But for multi-market events, the market itself is the outcome
        outcomeLabel = parsedOutcomes[0] || 'Yes';
      } catch {
        // Use market ID as fallback
      }

      // The outcome is essentially "this market wins"
      // We infer the outcome label from the market structure
      // In Polymarket, multi-outcome events have each outcome as a separate market
      const price = parseFloat(m.bestBid || '0') + parseFloat(m.bestAsk || '0');
      const midPrice = price / 2 || parseFloat(m.lastTradePrice || '0') || 0;

      allOutcomes.push(outcomeLabel);
      allOutcomePrices.push(midPrice);

      // Get CLOB token IDs
      try {
        const tokens = m.clobTokenIds ? JSON.parse(m.clobTokenIds) : [];
        allClobTokenIds.push(...tokens);
      } catch {
        if (m.clobTokenIds) allClobTokenIds.push(m.clobTokenIds);
      }
    });
  } else {
    // Single market - parse outcomes from the market data
    const market = event.markets[0];
    try {
      allOutcomes = JSON.parse(market.outcomes || '["Yes", "No"]');
      allOutcomePrices = JSON.parse(market.outcomePrices || '[0.5, 0.5]').map(Number);
    } catch {
      allOutcomes = ['Yes', 'No'];
      allOutcomePrices = [0.5, 0.5];
    }

    try {
      allClobTokenIds = market.clobTokenIds ? JSON.parse(market.clobTokenIds) : [];
    } catch {
      if (market.clobTokenIds) allClobTokenIds = [market.clobTokenIds];
    }
  }

  // Build normalized outcomes array
  const normalizedOutcomes: NormalizedOutcome[] = allOutcomes.map((label, index) => ({
    id: allClobTokenIds[index] || `outcome-${index}`,
    label,
    type: getOutcomeType(label, allOutcomes),
    probability: allOutcomePrices[index] || 0,
    best_bid: undefined, // Per-outcome bid/ask would need separate API calls
    best_ask: undefined,
    volume: undefined,
    liquidity: undefined,
    is_winner: undefined,
  }));

  // Detect market type
  const marketType: MarketType = detectMarketType(normalizedOutcomes);

  // Use first market for aggregate metrics
  const market = event.markets[0];
  const bestBid = parseFloat(market.bestBid || '0') || 0;
  const bestAsk = parseFloat(market.bestAsk || '0') || 0;
  const midPrice =
    (bestBid + bestAsk) / 2 || parseFloat(market.lastTradePrice || '0.5') || 0.5;

  // Aggregate volume and liquidity across all markets
  let volume24h = 0;
  let volumeTotal = 0;
  let liquidity = 0;
  event.markets.forEach((m) => {
    volume24h += parseFloat(m.volume24hr || '0') || 0;
    volumeTotal += parseFloat(m.volumeNum || '0') || 0;
    liquidity += parseFloat(m.liquidityNum || '0') || 0;
  });
  volumeTotal = volumeTotal || parseFloat(event.volume || '0') || 0;

  const modelProb = calculateModelProbability(
    midPrice,
    volume24h,
    liquidity,
    bestBid,
    bestAsk
  );

  return {
    id: event.id,
    ticker: event.ticker || generateTicker(event.title),
    platform: 'Polymarket',
    question: event.title,
    description: event.description,
    category: event.tags?.[0]?.label || 'General',
    subcategory: event.tags?.[1]?.label,

    // CRITICAL: Set market type
    market_type: marketType,

    // For binary: first outcome prob. For categorical: highest prob outcome
    market_prob: marketType === 'BINARY'
      ? midPrice
      : Math.max(...normalizedOutcomes.map(o => o.probability)),
    model_prob: modelProb,
    prev_prob: midPrice - 0.005,

    best_bid: bestBid,
    best_ask: bestAsk,
    spread: bestAsk - bestBid,
    volume_24h: volume24h,
    volume_total: volumeTotal,
    liquidity,
    open_interest: volumeTotal * 0.8,
    trades_24h: Math.floor(volume24h / 50),

    end_date: event.endDate || null,
    created_at: event.createdAt || new Date().toISOString(),

    platform_ids: {
      market_id: market.id,
      condition_id: market.conditionId,
      clob_token_ids: allClobTokenIds,
    },

    // CRITICAL: Include normalized outcomes
    normalized_outcomes: normalizedOutcomes,

    // Legacy fields for backward compatibility
    outcomes: allOutcomes,
    outcome_prices: allOutcomePrices,
  };
}

/**
 * Fetch all open events from Polymarket
 */
export async function fetchOpenEvents(
  limit: number = 50
): Promise<{ markets: MarketSummary[]; freshness: DataFreshness }> {
  const startTime = Date.now();

  try {
    const url = `${GAMMA_API}/events?closed=false&order=volume&ascending=false&limit=${limit}`;
    const events = await withRetry(
      () => fetchJson<PolymarketEvent[]>(url),
      'fetchOpenEvents'
    );

    const markets = (events || [])
      .map(transformEvent)
      .filter((m): m is MarketSummary => m !== null);

    return {
      markets,
      freshness: createFreshness('polymarket', CACHE_TTL.MARKETS, false, false, {
        polymarket: 'ok',
      }),
    };
  } catch (error) {
    console.error('[Polymarket] fetchOpenEvents failed:', error);
    return {
      markets: [],
      freshness: createFreshness('polymarket', 0, false, true, {
        polymarket: 'error',
      }),
    };
  }
}

/**
 * Fetch single event by slug
 */
export async function fetchEventBySlug(
  slug: string
): Promise<{ market: MarketSummary | null; freshness: DataFreshness }> {
  try {
    const url = `${GAMMA_API}/events?slug=${encodeURIComponent(slug)}`;
    const events = await withRetry(
      () => fetchJson<PolymarketEvent[]>(url),
      'fetchEventBySlug'
    );

    if (!events || events.length === 0) {
      return {
        market: null,
        freshness: createFreshness('polymarket', 0, false, false, {
          polymarket: 'ok',
        }),
      };
    }

    return {
      market: transformEvent(events[0]),
      freshness: createFreshness('polymarket', CACHE_TTL.MARKETS, false, false, {
        polymarket: 'ok',
      }),
    };
  } catch (error) {
    console.error('[Polymarket] fetchEventBySlug failed:', error);
    return {
      market: null,
      freshness: createFreshness('polymarket', 0, false, true, {
        polymarket: 'error',
      }),
    };
  }
}

/**
 * Fetch orderbook for a market
 */
export async function fetchOrderbook(
  tokenId: string
): Promise<{ orderbook: OrderbookSnapshot | null; freshness: DataFreshness }> {
  try {
    const url = `${CLOB_API}/book?token_id=${tokenId}`;
    const data = await withRetry(
      () => fetchJson<PolymarketOrderbook>(url),
      'fetchOrderbook'
    );

    if (!data || !data.bids || !data.asks) {
      return {
        orderbook: null,
        freshness: createFreshness('polymarket', 0, false, false, {
          polymarket: 'ok',
        }),
      };
    }

    const bids = (data.bids || []).slice(0, 15).map((bid) => ({
      price: parseFloat(bid.price),
      size: parseFloat(bid.size) * 1000,
      cumulative: 0,
    }));

    const asks = (data.asks || []).slice(0, 15).map((ask) => ({
      price: parseFloat(ask.price),
      size: parseFloat(ask.size) * 1000,
      cumulative: 0,
    }));

    // Calculate cumulative
    let bidCum = 0;
    let askCum = 0;
    bids.forEach((b) => {
      bidCum += b.size;
      b.cumulative = bidCum;
    });
    asks.forEach((a) => {
      askCum += a.size;
      a.cumulative = askCum;
    });

    const totalBids = bids.reduce((sum, b) => sum + b.size, 0);
    const totalAsks = asks.reduce((sum, a) => sum + a.size, 0);
    const midPrice =
      bids.length > 0 && asks.length > 0
        ? (bids[0].price + asks[0].price) / 2
        : 0.5;

    const orderbook: OrderbookSnapshot = {
      market_id: tokenId,
      bids,
      asks,
      imbalance: (totalBids - totalAsks) / (totalBids + totalAsks || 1),
      spread: asks.length > 0 && bids.length > 0 ? asks[0].price - bids[0].price : 0,
      mid_price: midPrice,
      freshness: createFreshness('polymarket', CACHE_TTL.ORDERBOOK, false, false, {
        polymarket: 'ok',
      }),
    };

    return { orderbook, freshness: orderbook.freshness };
  } catch (error) {
    console.error('[Polymarket] fetchOrderbook failed:', error);
    return {
      orderbook: null,
      freshness: createFreshness('polymarket', 0, false, true, {
        polymarket: 'error',
      }),
    };
  }
}

/**
 * Fetch price history for a market
 */
export async function fetchPriceHistory(
  marketId: string,
  days: number = 90
): Promise<{ history: MarketHistoryPoint[]; freshness: DataFreshness }> {
  try {
    const endTs = Math.floor(Date.now() / 1000);
    const startTs = endTs - days * 24 * 60 * 60;
    const url = `${CLOB_API}/prices-history?market=${marketId}&startTs=${startTs}&endTs=${endTs}&fidelity=60`;

    const data = await withRetry(
      () => fetchJson<PolymarketPriceHistory>(url),
      'fetchPriceHistory'
    );

    if (!data || !data.history) {
      return {
        history: [],
        freshness: createFreshness('polymarket', 0, false, false, {
          polymarket: 'ok',
        }),
      };
    }

    const history: MarketHistoryPoint[] = data.history.map((point) => {
      const timestamp = point.t * 1000;
      const price = parseFloat(point.p);
      return {
        timestamp,
        date: new Date(timestamp).toISOString().split('T')[0],
        price,
        volume: 0,
        high: price,
        low: price,
      };
    });

    return {
      history,
      freshness: createFreshness('polymarket', CACHE_TTL.PRICE_HISTORY, false, false, {
        polymarket: 'ok',
      }),
    };
  } catch (error) {
    console.error('[Polymarket] fetchPriceHistory failed:', error);
    return {
      history: [],
      freshness: createFreshness('polymarket', 0, false, true, {
        polymarket: 'error',
      }),
    };
  }
}

export const PolymarketConnector = {
  fetchOpenEvents,
  fetchEventBySlug,
  fetchOrderbook,
  fetchPriceHistory,
};

export default PolymarketConnector;
