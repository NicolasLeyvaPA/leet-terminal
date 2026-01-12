// Cross-Exchange Arbitrage Detection Engine
// Detects pricing discrepancies between Polymarket and Kalshi

import { PolymarketAPI } from './polymarketAPI';
import { KalshiAPI } from './kalshiAPI';

// Similarity matching configuration
const SIMILARITY_THRESHOLD = 0.6; // Minimum similarity for market matching
const MIN_ARBITRAGE_GAP = 0.02; // 2% minimum gap for arbitrage signal
const HIGH_CONFIDENCE_GAP = 0.05; // 5% gap for high confidence opportunities
const CRITICAL_GAP = 0.10; // 10% gap - exceptional opportunity

// Text similarity using Jaccard index + keyword matching
function calculateTextSimilarity(text1, text2) {
  if (!text1 || !text2) return 0;

  // Normalize texts
  const normalize = (text) => text.toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .split(/\s+/)
    .filter(word => word.length > 2);

  const words1 = new Set(normalize(text1));
  const words2 = new Set(normalize(text2));

  // Jaccard similarity
  const intersection = new Set([...words1].filter(x => words2.has(x)));
  const union = new Set([...words1, ...words2]);

  const jaccard = intersection.size / (union.size || 1);

  // Boost for key matching terms
  const keyTerms = ['president', 'bitcoin', 'btc', 'trump', 'biden', 'election', 'fed', 'rate', 'price', 'above', 'below', 'win', 'year', '2024', '2025', '2026'];
  let keywordBoost = 0;
  for (const term of keyTerms) {
    if (words1.has(term) && words2.has(term)) {
      keywordBoost += 0.1;
    }
  }

  return Math.min(1, jaccard + keywordBoost);
}

// Match markets across exchanges
export function matchMarkets(polymarkets, kalshiMarkets) {
  const matches = [];

  for (const poly of polymarkets) {
    for (const kalshi of kalshiMarkets) {
      const similarity = calculateTextSimilarity(poly.question, kalshi.question);

      if (similarity >= SIMILARITY_THRESHOLD) {
        // Calculate price gap (arbitrage opportunity)
        const polyYes = poly.market_prob;
        const kalshiYes = kalshi.market_prob;
        const gap = Math.abs(polyYes - kalshiYes);

        // Determine which side to buy/sell
        const buyPoly = polyYes < kalshiYes;
        const buyPrice = buyPoly ? polyYes : kalshiYes;
        const sellPrice = buyPoly ? kalshiYes : polyYes;

        // Calculate theoretical profit (before fees)
        const profitPct = (sellPrice - buyPrice) * 100;
        const profitPerContract = sellPrice - buyPrice;

        matches.push({
          id: `arb-${poly.id}-${kalshi.id}`,
          similarity,
          gap,
          profitPct,
          profitPerContract,

          // Market details
          polymarket: {
            ...poly,
            price: polyYes,
            bestBid: poly.bestBid,
            bestAsk: poly.bestAsk,
          },
          kalshi: {
            ...kalshi,
            price: kalshiYes,
            bestBid: kalshi.bestBid,
            bestAsk: kalshi.bestAsk,
          },

          // Trade recommendation
          recommendation: {
            action: gap >= MIN_ARBITRAGE_GAP ? 'ARBITRAGE' : 'MONITOR',
            buyExchange: buyPoly ? 'Polymarket' : 'Kalshi',
            sellExchange: buyPoly ? 'Kalshi' : 'Polymarket',
            buyPrice,
            sellPrice,
            confidence: calculateConfidence(gap, similarity, poly, kalshi),
          },

          // Quality scores
          scores: {
            gapScore: Math.min(1, gap / 0.15), // Normalize to 0-1
            liquidityScore: calculateLiquidityScore(poly, kalshi),
            volumeScore: calculateVolumeScore(poly, kalshi),
            spreadScore: calculateSpreadScore(poly, kalshi),
          },

          // Timestamps
          detectedAt: new Date().toISOString(),
        });
      }
    }
  }

  // Sort by profit potential and quality
  return matches.sort((a, b) => {
    const scoreA = a.profitPct * a.recommendation.confidence;
    const scoreB = b.profitPct * b.recommendation.confidence;
    return scoreB - scoreA;
  });
}

// Calculate confidence score
function calculateConfidence(gap, similarity, poly, kalshi) {
  let confidence = 0;

  // Gap contribution (40%)
  if (gap >= CRITICAL_GAP) confidence += 0.4;
  else if (gap >= HIGH_CONFIDENCE_GAP) confidence += 0.3;
  else if (gap >= MIN_ARBITRAGE_GAP) confidence += 0.2;

  // Similarity contribution (30%)
  confidence += similarity * 0.3;

  // Liquidity contribution (20%)
  const polyLiq = poly.liquidity || 0;
  const kalshiLiq = kalshi.liquidity || 0;
  const avgLiq = (polyLiq + kalshiLiq) / 2;
  if (avgLiq > 100000) confidence += 0.2;
  else if (avgLiq > 50000) confidence += 0.15;
  else if (avgLiq > 10000) confidence += 0.1;

  // Spread contribution (10%)
  const avgSpread = ((poly.spread || 0.05) + (kalshi.spread || 0.05)) / 2;
  if (avgSpread < 0.02) confidence += 0.1;
  else if (avgSpread < 0.05) confidence += 0.05;

  return Math.min(1, confidence);
}

// Calculate liquidity score
function calculateLiquidityScore(poly, kalshi) {
  const polyLiq = poly.liquidity || 0;
  const kalshiLiq = kalshi.liquidity || 0;
  const minLiq = Math.min(polyLiq, kalshiLiq);
  return Math.min(1, minLiq / 100000);
}

// Calculate volume score
function calculateVolumeScore(poly, kalshi) {
  const polyVol = poly.volume_24h || 0;
  const kalshiVol = kalshi.volume_24h || 0;
  const avgVol = (polyVol + kalshiVol) / 2;
  return Math.min(1, avgVol / 50000);
}

// Calculate spread score (lower spread = higher score)
function calculateSpreadScore(poly, kalshi) {
  const avgSpread = ((poly.spread || 0.05) + (kalshi.spread || 0.05)) / 2;
  return Math.max(0, 1 - avgSpread * 10);
}

// Main arbitrage scanner
export async function scanArbitrageOpportunities() {
  try {
    // Fetch markets from both exchanges in parallel
    const [polymarkets, kalshiMarkets] = await Promise.all([
      PolymarketAPI.fetchOpenEvents(100),
      KalshiAPI.fetchKalshiEvents(100),
    ]);

    console.log(`Loaded ${polymarkets.length} Polymarket and ${kalshiMarkets.length} Kalshi markets`);

    // Find matching markets and arbitrage opportunities
    const opportunities = matchMarkets(polymarkets, kalshiMarkets);

    // Filter to actionable opportunities
    const actionable = opportunities.filter(opp => opp.gap >= MIN_ARBITRAGE_GAP);

    console.log(`Found ${opportunities.length} potential matches, ${actionable.length} actionable arbitrage opportunities`);

    return {
      allMatches: opportunities,
      actionable,
      highConfidence: actionable.filter(opp => opp.gap >= HIGH_CONFIDENCE_GAP),
      critical: actionable.filter(opp => opp.gap >= CRITICAL_GAP),
      stats: {
        totalMatches: opportunities.length,
        actionableCount: actionable.length,
        avgGap: actionable.length > 0
          ? actionable.reduce((sum, o) => sum + o.gap, 0) / actionable.length
          : 0,
        maxGap: actionable.length > 0
          ? Math.max(...actionable.map(o => o.gap))
          : 0,
        totalPotentialProfit: actionable.reduce((sum, o) => sum + o.profitPct, 0),
      },
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error('Arbitrage scan failed:', error);
    return {
      allMatches: [],
      actionable: [],
      highConfidence: [],
      critical: [],
      stats: { totalMatches: 0, actionableCount: 0, avgGap: 0, maxGap: 0, totalPotentialProfit: 0 },
      error: error.message,
      timestamp: new Date().toISOString(),
    };
  }
}

// Calculate optimal position size for arbitrage
export function calculateArbitragePosition(opportunity, bankroll = 10000) {
  const { gap, recommendation, scores } = opportunity;

  // Base Kelly fraction for arbitrage (typically more aggressive)
  // Since arbitrage is theoretically risk-free, use higher fraction
  const baseKelly = gap / (1 - gap); // Simplified Kelly for arbitrage

  // Adjust for confidence
  const adjustedKelly = baseKelly * recommendation.confidence;

  // Cap at reasonable levels
  const maxAllocation = 0.25; // Max 25% of bankroll per opportunity
  const kellyFraction = Math.min(adjustedKelly, maxAllocation);

  // Calculate position sizes
  const totalPosition = bankroll * kellyFraction;

  // Adjust for liquidity constraints
  const liquidityAdjusted = totalPosition * scores.liquidityScore;

  return {
    suggestedSize: Math.floor(liquidityAdjusted),
    kellyFraction,
    maxSize: Math.floor(totalPosition),
    limitedByLiquidity: liquidityAdjusted < totalPosition,
    expectedProfit: liquidityAdjusted * opportunity.profitPerContract,
    expectedProfitPct: opportunity.profitPct * recommendation.confidence,
  };
}

// Real-time arbitrage monitor
export class ArbitrageMonitor {
  constructor(onUpdate, interval = 30000) {
    this.onUpdate = onUpdate;
    this.interval = interval;
    this.isRunning = false;
    this.lastScan = null;
    this.opportunities = [];
  }

  async start() {
    this.isRunning = true;
    await this.scan();
    this.timer = setInterval(() => this.scan(), this.interval);
  }

  stop() {
    this.isRunning = false;
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  async scan() {
    if (!this.isRunning) return;

    try {
      const result = await scanArbitrageOpportunities();
      this.lastScan = result.timestamp;
      this.opportunities = result.actionable;

      if (this.onUpdate) {
        this.onUpdate(result);
      }
    } catch (error) {
      console.error('Arbitrage monitor scan failed:', error);
    }
  }

  getOpportunities() {
    return this.opportunities;
  }

  getLastScan() {
    return this.lastScan;
  }
}

// Export utilities
export const ArbitrageEngine = {
  matchMarkets,
  scanArbitrageOpportunities,
  calculateArbitragePosition,
  ArbitrageMonitor,
  calculateTextSimilarity,
  MIN_ARBITRAGE_GAP,
  HIGH_CONFIDENCE_GAP,
  CRITICAL_GAP,
};

export default ArbitrageEngine;
