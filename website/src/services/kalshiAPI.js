// Kalshi API Service - Full trading support for prediction market arbitrage
// Documentation: https://trading-api.readme.io/reference/getting-started

const KALSHI_BASE_URL = 'https://trading-api.kalshi.com/trade-api/v2';
const KALSHI_DEMO_URL = 'https://demo-api.kalshi.co/trade-api/v2';

// CORS proxies for browser-based requests
const CORS_PROXIES = [
  (url) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
  (url) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
];

// Kalshi fee structure
export const KALSHI_FEES = {
  takerFee: 0.07,        // 7% of profit (capped)
  makerFee: 0.00,        // 0% maker fee
  maxFeePerContract: 0.07, // $0.07 max per contract
  minTradeSize: 1,       // Minimum 1 contract
  contractValue: 1.00,   // Each contract worth $1 at settlement
};

// Rate limits
const RATE_LIMITS = {
  requestsPerSecond: 10,
  requestsPerMinute: 100,
  ordersPerSecond: 5,
};

// Request queue for rate limiting
let requestQueue = [];
let lastRequestTime = 0;

// Helper to fetch with CORS proxy fallback
async function fetchWithProxy(url, options = {}) {
  const headers = {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    ...options.headers,
  };

  // Try direct fetch first
  try {
    const response = await fetch(url, { ...options, headers });
    if (response.ok) {
      return await response.json();
    }
    if (response.status === 401) {
      throw new Error('KALSHI_AUTH_REQUIRED');
    }
    if (response.status === 429) {
      throw new Error('KALSHI_RATE_LIMITED');
    }
  } catch (e) {
    if (e.message.includes('KALSHI_')) throw e;
  }

  // Try CORS proxies for GET requests only
  if (!options.method || options.method === 'GET') {
    for (const makeProxyUrl of CORS_PROXIES) {
      try {
        const proxyUrl = makeProxyUrl(url);
        const response = await fetch(proxyUrl, { ...options, headers });
        if (response.ok) {
          const text = await response.text();
          return JSON.parse(text);
        }
      } catch (e) {
        continue;
      }
    }
  }

  throw new Error(`Failed to fetch: ${url}`);
}

// Rate-limited request wrapper
async function rateLimitedRequest(requestFn) {
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;
  const minInterval = 1000 / RATE_LIMITS.requestsPerSecond;

  if (timeSinceLastRequest < minInterval) {
    await new Promise(resolve => setTimeout(resolve, minInterval - timeSinceLastRequest));
  }

  lastRequestTime = Date.now();
  return requestFn();
}

/**
 * Authentication - Get session token
 * Requires API credentials from user
 */
export async function login(email, password, useDemo = false) {
  const baseUrl = useDemo ? KALSHI_DEMO_URL : KALSHI_BASE_URL;
  const url = `${baseUrl}/login`;

  const response = await fetchWithProxy(url, {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });

  return {
    token: response.token,
    memberId: response.member_id,
    expiresAt: response.expires_at,
  };
}

/**
 * Fetch all active events/series
 */
export async function fetchEvents(params = {}, useDemo = false) {
  const baseUrl = useDemo ? KALSHI_DEMO_URL : KALSHI_BASE_URL;
  const queryParams = new URLSearchParams({
    status: 'open',
    limit: params.limit || 100,
    ...params,
  });

  const url = `${baseUrl}/events?${queryParams}`;

  return rateLimitedRequest(async () => {
    const data = await fetchWithProxy(url);
    return data.events || [];
  });
}

/**
 * Fetch markets for a specific event
 */
export async function fetchMarkets(eventTicker, useDemo = false) {
  const baseUrl = useDemo ? KALSHI_DEMO_URL : KALSHI_BASE_URL;
  const url = `${baseUrl}/events/${eventTicker}/markets`;

  return rateLimitedRequest(async () => {
    const data = await fetchWithProxy(url);
    return data.markets || [];
  });
}

/**
 * Fetch single market details
 */
export async function fetchMarket(ticker, useDemo = false) {
  const baseUrl = useDemo ? KALSHI_DEMO_URL : KALSHI_BASE_URL;
  const url = `${baseUrl}/markets/${ticker}`;

  return rateLimitedRequest(async () => {
    const data = await fetchWithProxy(url);
    return data.market;
  });
}

/**
 * Fetch orderbook for a market
 * CRITICAL: Kalshi YES/NO are reciprocal - must handle correctly
 */
export async function fetchOrderbook(ticker, useDemo = false) {
  const baseUrl = useDemo ? KALSHI_DEMO_URL : KALSHI_BASE_URL;
  const url = `${baseUrl}/markets/${ticker}/orderbook`;

  return rateLimitedRequest(async () => {
    const data = await fetchWithProxy(url);

    // Transform to normalized format
    // Kalshi returns: { yes: [{price, quantity}], no: [{price, quantity}] }
    const orderbook = data.orderbook || {};

    // YES side: bids to buy YES, asks to sell YES
    const yesBids = (orderbook.yes || [])
      .filter(o => o.side === 'bid')
      .map(o => ({ price: o.price / 100, quantity: o.quantity }))
      .sort((a, b) => b.price - a.price);

    const yesAsks = (orderbook.yes || [])
      .filter(o => o.side === 'ask')
      .map(o => ({ price: o.price / 100, quantity: o.quantity }))
      .sort((a, b) => a.price - b.price);

    // NO side: compute implied YES prices
    // If NO bid is at 40c, implied YES ask is 60c
    // If NO ask is at 35c, implied YES bid is 65c
    const noBids = (orderbook.no || [])
      .filter(o => o.side === 'bid')
      .map(o => ({ price: o.price / 100, quantity: o.quantity }));

    const noAsks = (orderbook.no || [])
      .filter(o => o.side === 'ask')
      .map(o => ({ price: o.price / 100, quantity: o.quantity }));

    // Best prices
    const bestYesBid = yesBids[0]?.price || 0;
    const bestYesAsk = yesAsks[0]?.price || 1;
    const bestNoBid = noBids[0]?.price || 0;
    const bestNoAsk = noAsks[0]?.price || 1;

    // Implied prices from NO side
    const impliedYesBidFromNo = 1 - bestNoAsk;  // Can sell YES by buying NO
    const impliedYesAskFromNo = 1 - bestNoBid;  // Can buy YES by selling NO

    return {
      ticker,
      timestamp: Date.now(),
      yes: {
        bids: yesBids,
        asks: yesAsks,
        bestBid: bestYesBid,
        bestAsk: bestYesAsk,
      },
      no: {
        bids: noBids,
        asks: noAsks,
        bestBid: bestNoBid,
        bestAsk: bestNoAsk,
      },
      // Effective prices considering both sides
      effective: {
        bestBidForYes: Math.max(bestYesBid, impliedYesBidFromNo),
        bestAskForYes: Math.min(bestYesAsk, impliedYesAskFromNo),
        midPrice: (Math.max(bestYesBid, impliedYesBidFromNo) + Math.min(bestYesAsk, impliedYesAskFromNo)) / 2,
        spread: Math.min(bestYesAsk, impliedYesAskFromNo) - Math.max(bestYesBid, impliedYesBidFromNo),
      },
      raw: orderbook,
    };
  });
}

/**
 * Fetch user's current positions
 */
export async function fetchPositions(token, useDemo = false) {
  const baseUrl = useDemo ? KALSHI_DEMO_URL : KALSHI_BASE_URL;
  const url = `${baseUrl}/portfolio/positions`;

  return rateLimitedRequest(async () => {
    const data = await fetchWithProxy(url, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    return data.market_positions || [];
  });
}

/**
 * Fetch user's balance
 */
export async function fetchBalance(token, useDemo = false) {
  const baseUrl = useDemo ? KALSHI_DEMO_URL : KALSHI_BASE_URL;
  const url = `${baseUrl}/portfolio/balance`;

  return rateLimitedRequest(async () => {
    const data = await fetchWithProxy(url, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    return {
      available: data.balance / 100,  // Convert cents to dollars
      portfolioValue: data.portfolio_value / 100,
    };
  });
}

/**
 * Place an order
 * @param {Object} order - Order parameters
 * @param {string} order.ticker - Market ticker
 * @param {string} order.side - 'yes' or 'no'
 * @param {string} order.action - 'buy' or 'sell'
 * @param {number} order.count - Number of contracts
 * @param {number} order.price - Limit price in cents (1-99)
 * @param {string} order.type - 'limit' or 'market'
 * @param {string} order.timeInForce - 'gtc', 'ioc', 'fok'
 */
export async function placeOrder(token, order, useDemo = false) {
  const baseUrl = useDemo ? KALSHI_DEMO_URL : KALSHI_BASE_URL;
  const url = `${baseUrl}/portfolio/orders`;

  // Validate order
  if (!order.ticker || !order.side || !order.action || !order.count) {
    throw new Error('Invalid order: missing required fields');
  }

  if (order.price && (order.price < 1 || order.price > 99)) {
    throw new Error('Invalid order: price must be between 1 and 99 cents');
  }

  const payload = {
    ticker: order.ticker,
    side: order.side,
    action: order.action,
    count: order.count,
    type: order.type || 'limit',
  };

  if (order.type !== 'market' && order.price) {
    payload.yes_price = order.side === 'yes' ? order.price : undefined;
    payload.no_price = order.side === 'no' ? order.price : undefined;
  }

  if (order.timeInForce) {
    payload.time_in_force = order.timeInForce;
  }

  // Client order ID for idempotency
  payload.client_order_id = order.clientOrderId || `arb_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  return rateLimitedRequest(async () => {
    const data = await fetchWithProxy(url, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body: JSON.stringify(payload),
    });
    return {
      orderId: data.order?.order_id,
      clientOrderId: payload.client_order_id,
      status: data.order?.status,
      filledCount: data.order?.filled_count || 0,
      remainingCount: data.order?.remaining_count || order.count,
      avgPrice: data.order?.avg_price,
    };
  });
}

/**
 * Cancel an order
 */
export async function cancelOrder(token, orderId, useDemo = false) {
  const baseUrl = useDemo ? KALSHI_DEMO_URL : KALSHI_BASE_URL;
  const url = `${baseUrl}/portfolio/orders/${orderId}`;

  return rateLimitedRequest(async () => {
    const data = await fetchWithProxy(url, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` },
    });
    return {
      orderId,
      cancelled: true,
      reducedBy: data.reduced_by,
    };
  });
}

/**
 * Get order status
 */
export async function getOrder(token, orderId, useDemo = false) {
  const baseUrl = useDemo ? KALSHI_DEMO_URL : KALSHI_BASE_URL;
  const url = `${baseUrl}/portfolio/orders/${orderId}`;

  return rateLimitedRequest(async () => {
    const data = await fetchWithProxy(url, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    return data.order;
  });
}

/**
 * Get all open orders
 */
export async function getOpenOrders(token, useDemo = false) {
  const baseUrl = useDemo ? KALSHI_DEMO_URL : KALSHI_BASE_URL;
  const url = `${baseUrl}/portfolio/orders?status=resting`;

  return rateLimitedRequest(async () => {
    const data = await fetchWithProxy(url, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    return data.orders || [];
  });
}

/**
 * Cancel all open orders
 */
export async function cancelAllOrders(token, useDemo = false) {
  const baseUrl = useDemo ? KALSHI_DEMO_URL : KALSHI_BASE_URL;
  const url = `${baseUrl}/portfolio/orders`;

  return rateLimitedRequest(async () => {
    const data = await fetchWithProxy(url, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` },
    });
    return {
      cancelledCount: data.cancelled_count || 0,
    };
  });
}

/**
 * Transform Kalshi market to standardized format
 * Matches Polymarket market structure for comparison
 */
export function transformMarketToStandard(market, orderbook = null) {
  const yesPrice = orderbook?.effective?.midPrice || (market.yes_bid + market.yes_ask) / 200;
  const spread = orderbook?.effective?.spread || (market.yes_ask - market.yes_bid) / 100;

  return {
    // Identifiers
    id: market.ticker,
    ticker: market.ticker,
    platform: 'Kalshi',
    eventTicker: market.event_ticker,

    // Question data
    question: market.title,
    description: market.subtitle || '',
    category: market.category || 'Unknown',

    // Pricing (normalized to 0-1)
    market_prob: yesPrice,
    bestBid: orderbook?.effective?.bestBidForYes || market.yes_bid / 100,
    bestAsk: orderbook?.effective?.bestAskForYes || market.yes_ask / 100,
    spread: spread,

    // Volume/liquidity
    volume_24h: market.volume_24h || 0,
    volume_total: market.volume || 0,
    liquidity: market.open_interest || 0,
    open_interest: market.open_interest || 0,

    // Dates
    end_date: market.close_time,
    expiration_time: market.expiration_time,
    settlement_time: market.settlement_timer_seconds,
    created: market.created_time,

    // Settlement info (CRITICAL for arbitrage)
    settlement: {
      source: market.settlement_source_url,
      rules: market.rules_primary,
      status: market.status,
      result: market.result,
    },

    // Kalshi-specific
    kalshi: {
      yesSubtitle: market.yes_sub_title,
      noSubtitle: market.no_sub_title,
      canCloseEarly: market.can_close_early,
      expirationValue: market.expiration_value,
      strikeType: market.strike_type,
      floorStrike: market.floor_strike,
      capStrike: market.cap_strike,
    },

    // Fees
    fees: { ...KALSHI_FEES },

    // Raw data
    _raw: market,
    _orderbook: orderbook,
  };
}

/**
 * Fetch and transform all open markets
 */
export async function fetchAllOpenMarkets(useDemo = false) {
  const events = await fetchEvents({ status: 'open', limit: 200 }, useDemo);
  const allMarkets = [];

  for (const event of events) {
    try {
      const markets = await fetchMarkets(event.event_ticker, useDemo);
      for (const market of markets) {
        if (market.status === 'open') {
          const orderbook = await fetchOrderbook(market.ticker, useDemo);
          allMarkets.push(transformMarketToStandard(market, orderbook));
        }
      }
    } catch (e) {
      console.warn(`Failed to fetch markets for ${event.event_ticker}:`, e.message);
    }
  }

  return allMarkets;
}

/**
 * Calculate fees for a trade
 */
export function calculateTradeFees(side, action, count, price) {
  // Kalshi charges 7% of profit, capped at $0.07 per contract
  // Profit on YES = (100 - price) cents if wins
  // Profit on NO = (100 - price) cents if wins

  const priceInCents = price * 100;
  const potentialProfit = 100 - priceInCents;
  const feePerContract = Math.min(potentialProfit * KALSHI_FEES.takerFee, KALSHI_FEES.maxFeePerContract * 100);
  const totalFee = (feePerContract * count) / 100;  // Convert back to dollars

  return {
    feePerContract: feePerContract / 100,
    totalFee,
    effectivePrice: price + (action === 'buy' ? feePerContract / 100 : -feePerContract / 100),
  };
}

// Export API object
export const KalshiAPI = {
  // Auth
  login,

  // Market data (public)
  fetchEvents,
  fetchMarkets,
  fetchMarket,
  fetchOrderbook,
  fetchAllOpenMarkets,

  // Trading (requires auth)
  fetchPositions,
  fetchBalance,
  placeOrder,
  cancelOrder,
  getOrder,
  getOpenOrders,
  cancelAllOrders,

  // Utilities
  transformMarketToStandard,
  calculateTradeFees,

  // Constants
  FEES: KALSHI_FEES,
  RATE_LIMITS,
  BASE_URL: KALSHI_BASE_URL,
  DEMO_URL: KALSHI_DEMO_URL,
};

export default KalshiAPI;
