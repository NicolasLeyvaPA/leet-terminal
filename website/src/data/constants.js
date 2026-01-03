// Constants - No fake data, all markets loaded from Polymarket API

// Empty markets database - will be populated from API
export const MARKETS_DATABASE = [];

// Empty portfolio - no fake positions
export const PORTFOLIO_POSITIONS = [];

// Empty news feed - no fake news
export const NEWS_FEED = [];

// Default empty market structure for reference
export const EMPTY_MARKET = {
  id: null,
  ticker: '',
  platform: 'Polymarket',
  question: '',
  category: '',
  market_prob: 0.5,
  model_prob: 0.5,
  prev_prob: 0.5,
  volume_24h: 0,
  volume_total: 0,
  liquidity: 0,
  spread: 0,
  open_interest: 0,
  trades_24h: 0,
  end_date: null,
  factors: {},
  model_breakdown: {},
  greeks: { delta: 0, gamma: 0, theta: 0, vega: 0, rho: 0 },
  correlations: {},
  related_news: [],
  price_history: [],
  orderbook: { bids: [], asks: [], imbalance: 0 },
};
