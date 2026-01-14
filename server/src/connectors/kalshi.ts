/**
 * Kalshi API Connector (Server-side)
 *
 * Fetches data from Kalshi API.
 * Requires API credentials for authenticated endpoints.
 */

import { request } from 'undici';
import type {
  MarketSummary,
  OrderbookSnapshot,
  MarketHistoryPoint,
  DataFreshness,
} from '@leet-terminal/shared/contracts';
import { createFreshness } from '@leet-terminal/shared/contracts';
import { CACHE_TTL } from '../services/cache.js';

const KALSHI_API = 'https://api.elections.kalshi.com/trade-api/v2';
// For demo mode: 'https://demo-api.kalshi.co/trade-api/v2'

const RETRY_CONFIG = {
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 10000,
  backoffMultiplier: 2,
};

interface KalshiMarket {
  ticker: string;
  event_ticker: string;
  title: string;
  subtitle?: string;
  category?: string;
  yes_bid?: number;
  yes_ask?: number;
  last_price?: number;
  volume?: number;
  volume_24h?: number;
  liquidity?: number;
  open_interest?: number;
  close_time?: string;
  created_time?: string;
  status?: string;
}

interface KalshiOrderbookResponse {
  orderbook?: {
    yes?: Array<[number, number]>; // [price_cents, quantity]
    no?: Array<[number, number]>;
  };
}

interface KalshiHistoryResponse {
  history?: Array<{
    ts: number;
    yes_price: number;
    volume?: number;
  }>;
}

// Configuration
const config = {
  apiKey: process.env.KALSHI_API_KEY || '',
  mockMode: !process.env.KALSHI_API_KEY,
};

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
        `[Kalshi] ${operation} attempt ${attempt}/${RETRY_CONFIG.maxRetries} failed:`,
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
 * Fetch JSON from Kalshi API
 */
async function fetchJson<T>(url: string): Promise<T> {
  const headers: Record<string, string> = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    'User-Agent': 'LeetTerminal/4.0',
  };

  if (config.apiKey) {
    headers['Authorization'] = `Bearer ${config.apiKey}`;
  }

  const { statusCode, body } = await request(url, {
    method: 'GET',
    headers,
    headersTimeout: 10000,
    bodyTimeout: 15000,
  });

  if (statusCode === 401) {
    throw new Error('Kalshi API authentication failed');
  }

  if (statusCode !== 200) {
    throw new Error(`HTTP ${statusCode} from ${url}`);
  }

  const text = await body.text();
  return JSON.parse(text) as T;
}

/**
 * Transform Kalshi market to normalized MarketSummary
 */
function transformMarket(market: KalshiMarket): MarketSummary {
  const yesBid = (market.yes_bid || 0) / 100; // Convert cents to decimal
  const yesAsk = (market.yes_ask || 0) / 100;
  const lastPrice = (market.last_price || 50) / 100;
  const midPrice = (yesBid + yesAsk) / 2 || lastPrice;

  const volume24h = market.volume_24h || 0;
  const liquidity = market.liquidity || 0;

  // Simple model probability
  let modelProb = midPrice;
  const volumeFactor = Math.min(volume24h / 50000, 0.03);
  const spreadFactor = yesAsk - yesBid < 0.03 ? 0.01 : 0;
  modelProb = Math.max(0.01, Math.min(0.99, modelProb + volumeFactor + spreadFactor));

  return {
    id: `kalshi-${market.ticker}`,
    ticker: market.ticker,
    platform: 'Kalshi',
    question: market.title,
    description: market.subtitle,
    category: market.category || 'General',
    subcategory: undefined,

    market_prob: midPrice,
    model_prob: modelProb,
    prev_prob: midPrice - 0.003,

    best_bid: yesBid,
    best_ask: yesAsk,
    spread: yesAsk - yesBid,
    volume_24h: volume24h,
    volume_total: market.volume || 0,
    liquidity,
    open_interest: market.open_interest || 0,
    trades_24h: Math.floor(volume24h / 30),

    end_date: market.close_time || null,
    created_at: market.created_time || new Date().toISOString(),

    platform_ids: {
      market_id: market.ticker,
      event_ticker: market.event_ticker,
    },

    outcomes: ['Yes', 'No'],
    outcome_prices: [midPrice, 1 - midPrice],
  };
}

/**
 * Generate mock markets when API credentials are not available
 */
function generateMockMarkets(count: number = 10): MarketSummary[] {
  const categories = ['Politics', 'Economics', 'Science', 'Sports', 'Entertainment'];
  const markets: MarketSummary[] = [];

  for (let i = 0; i < count; i++) {
    const prob = 0.2 + Math.random() * 0.6;
    markets.push({
      id: `kalshi-mock-${i}`,
      ticker: `MOCK${i}`,
      platform: 'Kalshi',
      question: `Mock Kalshi Market ${i + 1}`,
      description: 'This is a mock market for demonstration purposes',
      category: categories[i % categories.length],
      subcategory: undefined,

      market_prob: prob,
      model_prob: prob + (Math.random() - 0.5) * 0.04,
      prev_prob: prob - 0.005,

      best_bid: prob - 0.01,
      best_ask: prob + 0.01,
      spread: 0.02,
      volume_24h: Math.floor(Math.random() * 50000),
      volume_total: Math.floor(Math.random() * 500000),
      liquidity: Math.floor(Math.random() * 100000),
      open_interest: Math.floor(Math.random() * 200000),
      trades_24h: Math.floor(Math.random() * 500),

      end_date: new Date(Date.now() + Math.random() * 90 * 24 * 60 * 60 * 1000).toISOString(),
      created_at: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),

      platform_ids: {
        market_id: `MOCK${i}`,
        event_ticker: `MOCKEVENT${i}`,
      },

      outcomes: ['Yes', 'No'],
      outcome_prices: [prob, 1 - prob],
    });
  }

  return markets;
}

/**
 * Fetch markets from Kalshi
 */
export async function fetchMarkets(
  limit: number = 50
): Promise<{ markets: MarketSummary[]; freshness: DataFreshness }> {
  if (config.mockMode) {
    console.log('[Kalshi] Running in mock mode (no API key configured)');
    return {
      markets: generateMockMarkets(Math.min(limit, 20)),
      freshness: createFreshness('kalshi', CACHE_TTL.MARKETS, false, false, {
        kalshi: 'ok',
      }),
    };
  }

  try {
    const url = `${KALSHI_API}/markets?limit=${limit}&status=open`;
    const response = await withRetry(
      () => fetchJson<{ markets: KalshiMarket[] }>(url),
      'fetchMarkets'
    );

    const markets = (response.markets || []).map(transformMarket);

    return {
      markets,
      freshness: createFreshness('kalshi', CACHE_TTL.MARKETS, false, false, {
        kalshi: 'ok',
      }),
    };
  } catch (error) {
    console.error('[Kalshi] fetchMarkets failed:', error);
    return {
      markets: [],
      freshness: createFreshness('kalshi', 0, false, true, {
        kalshi: 'error',
      }),
    };
  }
}

/**
 * Fetch orderbook for a market
 */
export async function fetchOrderbook(
  ticker: string
): Promise<{ orderbook: OrderbookSnapshot | null; freshness: DataFreshness }> {
  if (config.mockMode) {
    // Generate mock orderbook
    const midPrice = 0.5;
    const bids = [];
    const asks = [];
    let bidCum = 0;
    let askCum = 0;

    for (let i = 0; i < 10; i++) {
      const bidSize = 1000 + Math.random() * 5000;
      const askSize = 1000 + Math.random() * 5000;
      bidCum += bidSize;
      askCum += askSize;
      bids.push({
        price: midPrice - (i + 1) * 0.01,
        size: bidSize,
        cumulative: bidCum,
      });
      asks.push({
        price: midPrice + (i + 1) * 0.01,
        size: askSize,
        cumulative: askCum,
      });
    }

    return {
      orderbook: {
        market_id: ticker,
        bids,
        asks,
        imbalance: (bidCum - askCum) / (bidCum + askCum),
        spread: 0.02,
        mid_price: midPrice,
        freshness: createFreshness('kalshi', CACHE_TTL.ORDERBOOK, false, false, {
          kalshi: 'ok',
        }),
      },
      freshness: createFreshness('kalshi', CACHE_TTL.ORDERBOOK, false, false, {
        kalshi: 'ok',
      }),
    };
  }

  try {
    const url = `${KALSHI_API}/markets/${ticker}/orderbook`;
    const response = await withRetry(
      () => fetchJson<KalshiOrderbookResponse>(url),
      'fetchOrderbook'
    );

    if (!response.orderbook) {
      return {
        orderbook: null,
        freshness: createFreshness('kalshi', 0, false, false, {
          kalshi: 'ok',
        }),
      };
    }

    let bidCumulative = 0;
    const bids = (response.orderbook.yes || []).map(([price, size]) => {
      bidCumulative += size;
      return { price: price / 100, size, cumulative: bidCumulative };
    });

    let askCumulative = 0;
    const asks = (response.orderbook.no || []).map(([price, size]) => {
      askCumulative += size;
      return { price: (100 - price) / 100, size, cumulative: askCumulative };
    });

    const totalBids = bids.reduce((sum, b) => sum + b.size, 0);
    const totalAsks = asks.reduce((sum, a) => sum + a.size, 0);
    const midPrice =
      bids.length > 0 && asks.length > 0
        ? (bids[0].price + asks[0].price) / 2
        : 0.5;

    const orderbook: OrderbookSnapshot = {
      market_id: ticker,
      bids,
      asks,
      imbalance: (totalBids - totalAsks) / (totalBids + totalAsks || 1),
      spread: asks.length > 0 && bids.length > 0 ? asks[0].price - bids[0].price : 0,
      mid_price: midPrice,
      freshness: createFreshness('kalshi', CACHE_TTL.ORDERBOOK, false, false, {
        kalshi: 'ok',
      }),
    };

    return { orderbook, freshness: orderbook.freshness };
  } catch (error) {
    console.error('[Kalshi] fetchOrderbook failed:', error);
    return {
      orderbook: null,
      freshness: createFreshness('kalshi', 0, false, true, {
        kalshi: 'error',
      }),
    };
  }
}

/**
 * Fetch price history for a market
 */
export async function fetchPriceHistory(
  ticker: string,
  days: number = 90
): Promise<{ history: MarketHistoryPoint[]; freshness: DataFreshness }> {
  if (config.mockMode) {
    // Generate mock history
    const history: MarketHistoryPoint[] = [];
    let price = 0.4 + Math.random() * 0.2;

    for (let i = days; i >= 0; i--) {
      const timestamp = Date.now() - i * 24 * 60 * 60 * 1000;
      price += (Math.random() - 0.48) * 0.02;
      price = Math.max(0.1, Math.min(0.9, price));
      history.push({
        timestamp,
        date: new Date(timestamp).toISOString().split('T')[0],
        price,
        volume: Math.floor(Math.random() * 10000),
        high: Math.min(0.95, price + Math.random() * 0.02),
        low: Math.max(0.05, price - Math.random() * 0.02),
      });
    }

    return {
      history,
      freshness: createFreshness('kalshi', CACHE_TTL.PRICE_HISTORY, false, false, {
        kalshi: 'ok',
      }),
    };
  }

  try {
    const endTs = Math.floor(Date.now() / 1000);
    const startTs = endTs - days * 24 * 60 * 60;
    const url = `${KALSHI_API}/markets/${ticker}/history?min_ts=${startTs}&max_ts=${endTs}`;

    const response = await withRetry(
      () => fetchJson<KalshiHistoryResponse>(url),
      'fetchPriceHistory'
    );

    if (!response.history) {
      return {
        history: [],
        freshness: createFreshness('kalshi', 0, false, false, {
          kalshi: 'ok',
        }),
      };
    }

    const history: MarketHistoryPoint[] = response.history.map((point) => {
      const timestamp = point.ts * 1000;
      const price = point.yes_price / 100;
      return {
        timestamp,
        date: new Date(timestamp).toISOString().split('T')[0],
        price,
        volume: point.volume || 0,
        high: price,
        low: price,
      };
    });

    return {
      history,
      freshness: createFreshness('kalshi', CACHE_TTL.PRICE_HISTORY, false, false, {
        kalshi: 'ok',
      }),
    };
  } catch (error) {
    console.error('[Kalshi] fetchPriceHistory failed:', error);
    return {
      history: [],
      freshness: createFreshness('kalshi', 0, false, true, {
        kalshi: 'error',
      }),
    };
  }
}

export const KalshiConnector = {
  fetchMarkets,
  fetchOrderbook,
  fetchPriceHistory,
  isMockMode: () => config.mockMode,
};

export default KalshiConnector;
