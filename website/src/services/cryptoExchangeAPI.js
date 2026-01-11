// Crypto Exchange API Service - Multi-exchange price feeds for arbitrage detection
// Connects to major centralized and decentralized exchanges

const EXCHANGES = {
  binance: {
    name: 'Binance',
    baseUrl: 'https://api.binance.com/api/v3',
    tickerEndpoint: '/ticker/price',
    orderbookEndpoint: '/depth',
    fee: 0.001, // 0.1% taker fee
    type: 'CEX',
  },
  coinbase: {
    name: 'Coinbase',
    baseUrl: 'https://api.coinbase.com/v2',
    tickerEndpoint: '/prices',
    fee: 0.006, // 0.6% taker fee
    type: 'CEX',
  },
  kraken: {
    name: 'Kraken',
    baseUrl: 'https://api.kraken.com/0/public',
    tickerEndpoint: '/Ticker',
    orderbookEndpoint: '/Depth',
    fee: 0.0026, // 0.26% taker fee
    type: 'CEX',
  },
  kucoin: {
    name: 'KuCoin',
    baseUrl: 'https://api.kucoin.com/api/v1',
    tickerEndpoint: '/market/allTickers',
    orderbookEndpoint: '/market/orderbook/level2_20',
    fee: 0.001, // 0.1% taker fee
    type: 'CEX',
  },
  bybit: {
    name: 'Bybit',
    baseUrl: 'https://api.bybit.com/v5',
    tickerEndpoint: '/market/tickers',
    fee: 0.001, // 0.1% taker fee
    type: 'CEX',
  },
};

// CORS proxy for browser-based requests
const CORS_PROXIES = [
  (url) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
  (url) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
];

// Supported trading pairs (major pairs for arbitrage)
export const SUPPORTED_PAIRS = [
  { base: 'BTC', quote: 'USDT', displayName: 'Bitcoin' },
  { base: 'ETH', quote: 'USDT', displayName: 'Ethereum' },
  { base: 'SOL', quote: 'USDT', displayName: 'Solana' },
  { base: 'XRP', quote: 'USDT', displayName: 'Ripple' },
  { base: 'DOGE', quote: 'USDT', displayName: 'Dogecoin' },
  { base: 'ADA', quote: 'USDT', displayName: 'Cardano' },
  { base: 'AVAX', quote: 'USDT', displayName: 'Avalanche' },
  { base: 'MATIC', quote: 'USDT', displayName: 'Polygon' },
  { base: 'LINK', quote: 'USDT', displayName: 'Chainlink' },
  { base: 'DOT', quote: 'USDT', displayName: 'Polkadot' },
  { base: 'UNI', quote: 'USDT', displayName: 'Uniswap' },
  { base: 'ATOM', quote: 'USDT', displayName: 'Cosmos' },
  { base: 'LTC', quote: 'USDT', displayName: 'Litecoin' },
  { base: 'BCH', quote: 'USDT', displayName: 'Bitcoin Cash' },
  { base: 'APT', quote: 'USDT', displayName: 'Aptos' },
];

// Helper to fetch with CORS proxy fallback
async function fetchWithProxy(url, options = {}) {
  // Try direct fetch first (may work in some environments)
  try {
    const response = await fetch(url, {
      ...options,
      headers: { 'Accept': 'application/json', ...options.headers },
    });
    if (response.ok) {
      return await response.json();
    }
  } catch (e) {
    // Continue to proxies
  }

  // Try CORS proxies
  for (const makeProxyUrl of CORS_PROXIES) {
    try {
      const proxyUrl = makeProxyUrl(url);
      const response = await fetch(proxyUrl, {
        ...options,
        headers: { 'Accept': 'application/json', ...options.headers },
      });
      if (response.ok) {
        const text = await response.text();
        return JSON.parse(text);
      }
    } catch (e) {
      continue;
    }
  }

  throw new Error(`Failed to fetch: ${url}`);
}

// Format symbol for each exchange
function formatSymbol(base, quote, exchange) {
  switch (exchange) {
    case 'binance':
    case 'bybit':
      return `${base}${quote}`;
    case 'coinbase':
      return `${base}-${quote}`;
    case 'kraken':
      // Kraken uses XBT for BTC
      const krakenBase = base === 'BTC' ? 'XBT' : base;
      return `${krakenBase}${quote}`;
    case 'kucoin':
      return `${base}-${quote}`;
    default:
      return `${base}${quote}`;
  }
}

// Fetch price from Binance
async function fetchBinancePrice(base, quote) {
  const symbol = formatSymbol(base, quote, 'binance');
  const url = `${EXCHANGES.binance.baseUrl}${EXCHANGES.binance.tickerEndpoint}?symbol=${symbol}`;

  try {
    const data = await fetchWithProxy(url);
    return {
      exchange: 'binance',
      exchangeName: EXCHANGES.binance.name,
      symbol: `${base}/${quote}`,
      price: parseFloat(data.price),
      fee: EXCHANGES.binance.fee,
      timestamp: Date.now(),
      type: EXCHANGES.binance.type,
    };
  } catch (error) {
    console.warn(`Binance fetch failed for ${symbol}:`, error.message);
    return null;
  }
}

// Fetch price from Coinbase
async function fetchCoinbasePrice(base, quote) {
  // Coinbase uses USD, not USDT - we'll approximate
  const spotUrl = `${EXCHANGES.coinbase.baseUrl}/prices/${base}-USD/spot`;

  try {
    const data = await fetchWithProxy(spotUrl);
    return {
      exchange: 'coinbase',
      exchangeName: EXCHANGES.coinbase.name,
      symbol: `${base}/${quote}`,
      price: parseFloat(data.data.amount),
      fee: EXCHANGES.coinbase.fee,
      timestamp: Date.now(),
      type: EXCHANGES.coinbase.type,
    };
  } catch (error) {
    console.warn(`Coinbase fetch failed for ${base}:`, error.message);
    return null;
  }
}

// Fetch price from Kraken
async function fetchKrakenPrice(base, quote) {
  const symbol = formatSymbol(base, quote, 'kraken');
  const url = `${EXCHANGES.kraken.baseUrl}${EXCHANGES.kraken.tickerEndpoint}?pair=${symbol}`;

  try {
    const data = await fetchWithProxy(url);
    if (data.error && data.error.length > 0) {
      throw new Error(data.error[0]);
    }
    // Kraken returns data with pair as key
    const pairKey = Object.keys(data.result)[0];
    const ticker = data.result[pairKey];
    return {
      exchange: 'kraken',
      exchangeName: EXCHANGES.kraken.name,
      symbol: `${base}/${quote}`,
      price: parseFloat(ticker.c[0]), // Last trade close price
      bid: parseFloat(ticker.b[0]),
      ask: parseFloat(ticker.a[0]),
      fee: EXCHANGES.kraken.fee,
      timestamp: Date.now(),
      type: EXCHANGES.kraken.type,
    };
  } catch (error) {
    console.warn(`Kraken fetch failed for ${symbol}:`, error.message);
    return null;
  }
}

// Fetch price from KuCoin
async function fetchKucoinPrice(base, quote) {
  const symbol = formatSymbol(base, quote, 'kucoin');
  const url = `${EXCHANGES.kucoin.baseUrl}/market/stats?symbol=${symbol}`;

  try {
    const data = await fetchWithProxy(url);
    if (data.code !== '200000' || !data.data) {
      throw new Error('Invalid response');
    }
    return {
      exchange: 'kucoin',
      exchangeName: EXCHANGES.kucoin.name,
      symbol: `${base}/${quote}`,
      price: parseFloat(data.data.last),
      bid: parseFloat(data.data.buy),
      ask: parseFloat(data.data.sell),
      fee: EXCHANGES.kucoin.fee,
      timestamp: Date.now(),
      type: EXCHANGES.kucoin.type,
    };
  } catch (error) {
    console.warn(`KuCoin fetch failed for ${symbol}:`, error.message);
    return null;
  }
}

// Fetch price from Bybit
async function fetchBybitPrice(base, quote) {
  const symbol = formatSymbol(base, quote, 'bybit');
  const url = `${EXCHANGES.bybit.baseUrl}${EXCHANGES.bybit.tickerEndpoint}?category=spot&symbol=${symbol}`;

  try {
    const data = await fetchWithProxy(url);
    if (data.retCode !== 0 || !data.result.list || data.result.list.length === 0) {
      throw new Error('Invalid response');
    }
    const ticker = data.result.list[0];
    return {
      exchange: 'bybit',
      exchangeName: EXCHANGES.bybit.name,
      symbol: `${base}/${quote}`,
      price: parseFloat(ticker.lastPrice),
      bid: parseFloat(ticker.bid1Price),
      ask: parseFloat(ticker.ask1Price),
      fee: EXCHANGES.bybit.fee,
      timestamp: Date.now(),
      type: EXCHANGES.bybit.type,
    };
  } catch (error) {
    console.warn(`Bybit fetch failed for ${symbol}:`, error.message);
    return null;
  }
}

// Fetch price from all exchanges for a trading pair
export async function fetchAllPrices(base, quote) {
  const fetchFunctions = [
    () => fetchBinancePrice(base, quote),
    () => fetchKrakenPrice(base, quote),
    () => fetchKucoinPrice(base, quote),
    () => fetchBybitPrice(base, quote),
    () => fetchCoinbasePrice(base, quote),
  ];

  const results = await Promise.allSettled(fetchFunctions.map(fn => fn()));

  return results
    .map(result => result.status === 'fulfilled' ? result.value : null)
    .filter(Boolean);
}

// Fetch orderbook from Binance
export async function fetchBinanceOrderbook(base, quote, limit = 20) {
  const symbol = formatSymbol(base, quote, 'binance');
  const url = `${EXCHANGES.binance.baseUrl}${EXCHANGES.binance.orderbookEndpoint}?symbol=${symbol}&limit=${limit}`;

  try {
    const data = await fetchWithProxy(url);
    return {
      exchange: 'binance',
      symbol: `${base}/${quote}`,
      bids: data.bids.map(([price, qty]) => ({ price: parseFloat(price), quantity: parseFloat(qty) })),
      asks: data.asks.map(([price, qty]) => ({ price: parseFloat(price), quantity: parseFloat(qty) })),
      timestamp: Date.now(),
    };
  } catch (error) {
    console.warn(`Binance orderbook fetch failed:`, error.message);
    return null;
  }
}

// Fetch all prices for all supported pairs
export async function fetchAllMarketPrices() {
  const allPrices = {};

  const fetchPromises = SUPPORTED_PAIRS.map(async (pair) => {
    const prices = await fetchAllPrices(pair.base, pair.quote);
    return { pair, prices };
  });

  const results = await Promise.allSettled(fetchPromises);

  results.forEach(result => {
    if (result.status === 'fulfilled' && result.value.prices.length > 0) {
      const { pair, prices } = result.value;
      const key = `${pair.base}/${pair.quote}`;
      allPrices[key] = {
        ...pair,
        prices,
        timestamp: Date.now(),
      };
    }
  });

  return allPrices;
}

// Get exchange info
export function getExchangeInfo(exchangeId) {
  return EXCHANGES[exchangeId] || null;
}

// Get all exchanges
export function getAllExchanges() {
  return Object.entries(EXCHANGES).map(([id, info]) => ({
    id,
    ...info,
  }));
}

export const CryptoExchangeAPI = {
  fetchAllPrices,
  fetchAllMarketPrices,
  fetchBinancePrice,
  fetchKrakenPrice,
  fetchKucoinPrice,
  fetchBybitPrice,
  fetchCoinbasePrice,
  fetchBinanceOrderbook,
  getExchangeInfo,
  getAllExchanges,
  SUPPORTED_PAIRS,
  EXCHANGES,
};

export default CryptoExchangeAPI;
