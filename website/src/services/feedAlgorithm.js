// Feed Recommendation Algorithm
// Prioritizes trending markets, markets near closure, and high-opportunity trades

// Score weights for feed ranking
const WEIGHTS = {
  trending: 0.25,        // High volume activity
  nearClosure: 0.20,     // Close to resolution
  arbitrage: 0.20,       // Cross-exchange opportunity
  edge: 0.15,           // Model vs market edge
  volatility: 0.10,     // Price movement
  liquidity: 0.10,      // Market depth
};

// Time thresholds for "near closure" scoring
const CLOSURE_THRESHOLDS = {
  critical: 24 * 60 * 60 * 1000,    // 24 hours
  urgent: 7 * 24 * 60 * 60 * 1000,  // 7 days
  soon: 30 * 24 * 60 * 60 * 1000,   // 30 days
};

// Calculate trending score based on volume and activity
export function calculateTrendingScore(market) {
  const volume24h = market.volume_24h || 0;
  const volumeTotal = market.volume_total || 0;
  const trades24h = market.trades_24h || 0;

  // Volume velocity (how much of total volume happened in last 24h)
  const volumeVelocity = volumeTotal > 0 ? volume24h / volumeTotal : 0;

  // Absolute volume score (normalized)
  const volumeScore = Math.min(1, volume24h / 500000);

  // Trade frequency score
  const tradeScore = Math.min(1, trades24h / 1000);

  // Combined trending score
  const trendingScore = (
    volumeVelocity * 0.4 +
    volumeScore * 0.35 +
    tradeScore * 0.25
  );

  return {
    score: Math.min(1, trendingScore),
    volume24h,
    volumeVelocity,
    trades24h,
    isTrending: trendingScore > 0.5,
    isHot: trendingScore > 0.75,
  };
}

// Calculate time-to-closure score
export function calculateClosureScore(market) {
  const endDate = market.end_date ? new Date(market.end_date) : null;

  if (!endDate) {
    return {
      score: 0,
      hoursRemaining: null,
      daysRemaining: null,
      urgency: 'unknown',
    };
  }

  const now = new Date();
  const timeRemaining = endDate.getTime() - now.getTime();

  // Already closed or past
  if (timeRemaining <= 0) {
    return {
      score: 0,
      hoursRemaining: 0,
      daysRemaining: 0,
      urgency: 'closed',
    };
  }

  const hoursRemaining = timeRemaining / (60 * 60 * 1000);
  const daysRemaining = hoursRemaining / 24;

  // Calculate score - higher for markets closer to closure
  let score = 0;
  let urgency = 'normal';

  if (timeRemaining <= CLOSURE_THRESHOLDS.critical) {
    score = 1.0;
    urgency = 'critical';
  } else if (timeRemaining <= CLOSURE_THRESHOLDS.urgent) {
    score = 0.75;
    urgency = 'urgent';
  } else if (timeRemaining <= CLOSURE_THRESHOLDS.soon) {
    score = 0.5;
    urgency = 'soon';
  } else {
    // Gradually decrease for markets further out
    score = Math.max(0.1, 0.5 - (daysRemaining / 365) * 0.4);
    urgency = 'normal';
  }

  return {
    score,
    hoursRemaining: Math.floor(hoursRemaining),
    daysRemaining: Math.floor(daysRemaining),
    urgency,
    endDate: endDate.toISOString(),
  };
}

// Calculate edge score (model vs market)
export function calculateEdgeScore(market) {
  const marketProb = market.market_prob || 0.5;
  const modelProb = market.model_prob || marketProb;
  const edge = modelProb - marketProb;
  const absEdge = Math.abs(edge);

  // Signal determination
  let signal = 'HOLD';
  if (edge > 0.03) signal = 'BUY';
  else if (edge < -0.03) signal = 'SELL';

  // Score based on edge magnitude
  const score = Math.min(1, absEdge / 0.15);

  return {
    score,
    edge,
    absEdge,
    signal,
    marketProb,
    modelProb,
    isStrong: absEdge > 0.05,
    isVeryStrong: absEdge > 0.10,
  };
}

// Calculate volatility score based on price history
export function calculateVolatilityScore(market) {
  const priceHistory = market.price_history || [];

  if (priceHistory.length < 2) {
    return {
      score: 0.5,
      volatility: 0,
      priceChange24h: 0,
      trend: 'neutral',
    };
  }

  // Get recent prices
  const recentPrices = priceHistory.slice(-24);
  const prices = recentPrices.map(p => p.price);

  // Calculate volatility (standard deviation)
  const mean = prices.reduce((a, b) => a + b, 0) / prices.length;
  const variance = prices.reduce((sum, p) => sum + Math.pow(p - mean, 2), 0) / prices.length;
  const volatility = Math.sqrt(variance);

  // Price change over 24h
  const oldPrice = prices[0] || 0.5;
  const newPrice = prices[prices.length - 1] || 0.5;
  const priceChange24h = newPrice - oldPrice;

  // Trend determination
  let trend = 'neutral';
  if (priceChange24h > 0.02) trend = 'bullish';
  else if (priceChange24h < -0.02) trend = 'bearish';

  // Higher volatility = higher score (more action)
  const score = Math.min(1, volatility * 10);

  return {
    score,
    volatility,
    priceChange24h,
    trend,
    isVolatile: volatility > 0.05,
  };
}

// Calculate liquidity score
export function calculateLiquidityScore(market) {
  const liquidity = market.liquidity || 0;
  const spread = market.spread || 0.1;
  const openInterest = market.open_interest || 0;

  // Liquidity score
  const liqScore = Math.min(1, liquidity / 1000000);

  // Spread score (tighter = better)
  const spreadScore = Math.max(0, 1 - spread * 10);

  // Open interest score
  const oiScore = Math.min(1, openInterest / 500000);

  const combinedScore = (liqScore * 0.4 + spreadScore * 0.35 + oiScore * 0.25);

  return {
    score: combinedScore,
    liquidity,
    spread,
    openInterest,
    isLiquid: combinedScore > 0.5,
    isHighlyLiquid: combinedScore > 0.75,
  };
}

// Calculate overall feed score for a market
export function calculateFeedScore(market, arbitrageOpportunity = null) {
  const trending = calculateTrendingScore(market);
  const closure = calculateClosureScore(market);
  const edge = calculateEdgeScore(market);
  const volatility = calculateVolatilityScore(market);
  const liquidity = calculateLiquidityScore(market);

  // Arbitrage score (if opportunity exists)
  let arbitrageScore = 0;
  if (arbitrageOpportunity) {
    arbitrageScore = Math.min(1, arbitrageOpportunity.gap / 0.10);
  }

  // Weighted combination
  const totalScore = (
    trending.score * WEIGHTS.trending +
    closure.score * WEIGHTS.nearClosure +
    arbitrageScore * WEIGHTS.arbitrage +
    edge.score * WEIGHTS.edge +
    volatility.score * WEIGHTS.volatility +
    liquidity.score * WEIGHTS.liquidity
  );

  // Determine feed card type
  let cardType = 'standard';
  if (arbitrageScore > 0.5) cardType = 'arbitrage';
  else if (closure.urgency === 'critical') cardType = 'closing';
  else if (trending.isHot) cardType = 'trending';
  else if (edge.isVeryStrong) cardType = 'signal';

  // Generate tags
  const tags = [];
  if (trending.isHot) tags.push('HOT');
  if (trending.isTrending) tags.push('TRENDING');
  if (closure.urgency === 'critical') tags.push('CLOSING SOON');
  if (closure.urgency === 'urgent') tags.push('THIS WEEK');
  if (edge.isVeryStrong) tags.push('STRONG EDGE');
  if (edge.isStrong) tags.push('EDGE');
  if (arbitrageScore > 0.3) tags.push('ARBITRAGE');
  if (volatility.isVolatile) tags.push('VOLATILE');
  if (liquidity.isHighlyLiquid) tags.push('LIQUID');

  return {
    totalScore,
    cardType,
    tags,
    breakdown: {
      trending,
      closure,
      edge,
      volatility,
      liquidity,
      arbitrage: arbitrageOpportunity ? {
        score: arbitrageScore,
        gap: arbitrageOpportunity.gap,
        ...arbitrageOpportunity.recommendation,
      } : null,
    },
  };
}

// Generate feed items from markets
export function generateFeed(markets, arbitrageOpportunities = []) {
  // Create a map of arbitrage opportunities by market ID
  const arbMap = new Map();
  for (const opp of arbitrageOpportunities) {
    arbMap.set(opp.polymarket.id, opp);
    arbMap.set(opp.kalshi.id, opp);
  }

  // Score all markets
  const feedItems = markets.map(market => {
    const arbitrageOpp = arbMap.get(market.id);
    const feedScore = calculateFeedScore(market, arbitrageOpp);

    return {
      id: market.id,
      market,
      arbitrageOpportunity: arbitrageOpp,
      ...feedScore,
    };
  });

  // Sort by total score (descending)
  feedItems.sort((a, b) => b.totalScore - a.totalScore);

  return feedItems;
}

// Get personalized feed (with user preferences)
export function getPersonalizedFeed(markets, arbitrageOpportunities = [], preferences = {}) {
  const {
    preferTrending = true,
    preferClosing = true,
    preferArbitrage = true,
    preferCategories = [],
    excludeCategories = [],
    minLiquidity = 0,
    maxDaysToClose = null,
  } = preferences;

  // Filter markets
  let filtered = markets;

  if (excludeCategories.length > 0) {
    filtered = filtered.filter(m => !excludeCategories.includes(m.category));
  }

  if (preferCategories.length > 0) {
    // Boost preferred categories but don't exclude others
    filtered = filtered.map(m => ({
      ...m,
      _categoryBoost: preferCategories.includes(m.category) ? 0.1 : 0,
    }));
  }

  if (minLiquidity > 0) {
    filtered = filtered.filter(m => (m.liquidity || 0) >= minLiquidity);
  }

  if (maxDaysToClose !== null) {
    const maxMs = maxDaysToClose * 24 * 60 * 60 * 1000;
    filtered = filtered.filter(m => {
      if (!m.end_date) return true;
      const remaining = new Date(m.end_date) - new Date();
      return remaining <= maxMs && remaining > 0;
    });
  }

  // Generate feed
  let feed = generateFeed(filtered, arbitrageOpportunities);

  // Apply preference boosts
  if (!preferTrending) {
    feed = feed.map(item => ({
      ...item,
      totalScore: item.totalScore - item.breakdown.trending.score * WEIGHTS.trending,
    }));
  }

  if (!preferClosing) {
    feed = feed.map(item => ({
      ...item,
      totalScore: item.totalScore - item.breakdown.closure.score * WEIGHTS.nearClosure,
    }));
  }

  if (!preferArbitrage) {
    feed = feed.map(item => ({
      ...item,
      totalScore: item.totalScore - (item.breakdown.arbitrage?.score || 0) * WEIGHTS.arbitrage,
    }));
  }

  // Re-sort after adjustments
  feed.sort((a, b) => b.totalScore - a.totalScore);

  return feed;
}

// Get feed sections (grouped by type)
export function getFeedSections(feedItems) {
  return {
    featured: feedItems.slice(0, 3),
    arbitrage: feedItems.filter(item => item.cardType === 'arbitrage').slice(0, 10),
    closingSoon: feedItems.filter(item => item.cardType === 'closing').slice(0, 10),
    trending: feedItems.filter(item => item.cardType === 'trending').slice(0, 10),
    strongSignals: feedItems.filter(item => item.cardType === 'signal').slice(0, 10),
    all: feedItems,
  };
}

// Feed statistics
export function getFeedStats(feedItems) {
  const total = feedItems.length;
  const arbitrage = feedItems.filter(i => i.breakdown.arbitrage?.score > 0.3).length;
  const closing = feedItems.filter(i => ['critical', 'urgent'].includes(i.breakdown.closure.urgency)).length;
  const trending = feedItems.filter(i => i.breakdown.trending.isHot).length;
  const strongEdge = feedItems.filter(i => i.breakdown.edge.isStrong).length;

  const avgScore = feedItems.length > 0
    ? feedItems.reduce((sum, i) => sum + i.totalScore, 0) / feedItems.length
    : 0;

  return {
    total,
    arbitrage,
    closing,
    trending,
    strongEdge,
    avgScore,
    topScore: feedItems[0]?.totalScore || 0,
  };
}

export const FeedAlgorithm = {
  calculateTrendingScore,
  calculateClosureScore,
  calculateEdgeScore,
  calculateVolatilityScore,
  calculateLiquidityScore,
  calculateFeedScore,
  generateFeed,
  getPersonalizedFeed,
  getFeedSections,
  getFeedStats,
  WEIGHTS,
  CLOSURE_THRESHOLDS,
};

export default FeedAlgorithm;
