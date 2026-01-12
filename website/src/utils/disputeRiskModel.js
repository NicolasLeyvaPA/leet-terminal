// Dispute & Oracle Risk Model
// Models resolution risk for Polymarket (UMA) and Kalshi

/**
 * UMA Optimistic Oracle Parameters
 * Documentation: https://docs.uma.xyz/protocol-overview/how-does-umas-oracle-work
 */
export const UMA_ORACLE = {
  // Standard dispute window (optimistic period)
  standardDisputeWindow: 2 * 60 * 60 * 1000,  // 2 hours in ms

  // If disputed, escalates to DVM (Data Verification Mechanism)
  dvmResolutionTime: {
    min: 48 * 60 * 60 * 1000,   // 48 hours minimum
    typical: 72 * 60 * 60 * 1000, // 72 hours typical
    max: 96 * 60 * 60 * 1000,   // 96 hours max (can be longer in edge cases)
  },

  // Bond requirements for disputes
  bondAmount: {
    proposer: 750,  // USDC bond to propose
    disputer: 750,  // USDC bond to dispute
  },

  // Historical dispute rates (estimates)
  historicalDisputeRate: {
    allMarkets: 0.02,        // ~2% of all markets get disputed
    closeMarkets: 0.08,      // ~8% of markets with tight outcomes
    politicalMarkets: 0.05,  // ~5% of political markets
    sportsMarkets: 0.01,     // ~1% of sports markets
  },

  // Dispute success rate (disputer wins)
  disputeSuccessRate: 0.15,  // ~15% of disputes overturn original proposal
};

/**
 * Kalshi Settlement Parameters
 */
export const KALSHI_SETTLEMENT = {
  // Kalshi uses authoritative sources
  resolutionType: 'AUTHORITATIVE',

  // Settlement timing
  settlementTiming: {
    immediate: true,  // Usually immediate once outcome known
    maxDelay: 24 * 60 * 60 * 1000,  // 24 hours max in edge cases
  },

  // Appeal process
  appealWindow: 24 * 60 * 60 * 1000,  // 24 hours
  appealSuccessRate: 0.05,  // ~5% of appeals successful

  // Edge case handling
  voidConditions: [
    'Market cancelled by exchange',
    'Event cancelled/postponed',
    'Ambiguous outcome per rules',
  ],
};

/**
 * Resolution risk factors
 */
export const RISK_FACTORS = {
  // Market characteristics that increase dispute risk
  HIGH_DISPUTE_RISK: [
    { name: 'CLOSE_PROBABILITY', threshold: 0.1, weight: 2.0, description: 'Market near 50/50' },
    { name: 'POLITICAL_EVENT', keywords: ['election', 'vote', 'congress', 'president'], weight: 1.5 },
    { name: 'SUBJECTIVE_OUTCOME', keywords: ['will', 'might', 'could', 'likely'], weight: 1.3 },
    { name: 'AMBIGUOUS_WORDING', keywords: ['approximately', 'around', 'roughly'], weight: 1.8 },
    { name: 'TIME_SENSITIVE', keywords: ['by midnight', 'before', 'end of'], weight: 1.2 },
  ],

  // Market characteristics that reduce dispute risk
  LOW_DISPUTE_RISK: [
    { name: 'BINARY_NUMERIC', keywords: ['above', 'below', 'exactly', 'at least'], weight: 0.7 },
    { name: 'OFFICIAL_SOURCE', keywords: ['official', 'government', 'sec', 'fed'], weight: 0.8 },
    { name: 'SPORTS_OUTCOME', keywords: ['win', 'score', 'game', 'match'], weight: 0.6 },
  ],
};

/**
 * Calculate dispute probability for a Polymarket market
 */
export function calculatePolymarketDisputeRisk(market) {
  let baseRisk = UMA_ORACLE.historicalDisputeRate.allMarkets;
  const factors = [];

  // Adjust for market probability (closer to 50% = higher risk)
  const prob = market.market_prob || 0.5;
  const distanceFrom50 = Math.abs(prob - 0.5);
  if (distanceFrom50 < 0.1) {
    baseRisk *= 2.0;
    factors.push({
      name: 'CLOSE_MARKET',
      impact: 'HIGH',
      detail: `Market at ${(prob * 100).toFixed(1)}% - high dispute risk near settlement`,
    });
  }

  // Check for high-risk keywords
  const questionLower = (market.question || '').toLowerCase();
  const categoryLower = (market.category || '').toLowerCase();

  for (const factor of RISK_FACTORS.HIGH_DISPUTE_RISK) {
    if (factor.keywords) {
      const hasKeyword = factor.keywords.some(kw =>
        questionLower.includes(kw) || categoryLower.includes(kw)
      );
      if (hasKeyword) {
        baseRisk *= factor.weight;
        factors.push({
          name: factor.name,
          impact: 'HIGH',
          detail: factor.description || `Contains risk keyword`,
        });
      }
    }
  }

  // Check for low-risk keywords
  for (const factor of RISK_FACTORS.LOW_DISPUTE_RISK) {
    if (factor.keywords) {
      const hasKeyword = factor.keywords.some(kw =>
        questionLower.includes(kw) || categoryLower.includes(kw)
      );
      if (hasKeyword) {
        baseRisk *= factor.weight;
        factors.push({
          name: factor.name,
          impact: 'LOW',
          detail: `Lower risk: ${factor.name}`,
        });
      }
    }
  }

  // Cap at reasonable levels
  const disputeProbability = Math.min(Math.max(baseRisk, 0.001), 0.25);

  return {
    disputeProbability,
    factors,
    expectedDisputeWindowHours: 2,
    worstCaseResolutionHours: 96,
    riskLevel: disputeProbability > 0.1 ? 'HIGH' : disputeProbability > 0.05 ? 'MEDIUM' : 'LOW',
  };
}

/**
 * Calculate settlement risk for a Kalshi market
 */
export function calculateKalshiSettlementRisk(market) {
  let baseRisk = 0.01; // Kalshi generally more reliable
  const factors = [];

  // Check for edge cases
  const questionLower = (market.question || '').toLowerCase();

  // Subjective outcomes increase risk
  const subjectiveKeywords = ['might', 'could', 'likely', 'probably'];
  if (subjectiveKeywords.some(kw => questionLower.includes(kw))) {
    baseRisk *= 2.0;
    factors.push({
      name: 'SUBJECTIVE_LANGUAGE',
      impact: 'MEDIUM',
      detail: 'Outcome may require interpretation',
    });
  }

  // Time-sensitive events
  const timeKeywords = ['midnight', 'eod', 'end of day', 'close of'];
  if (timeKeywords.some(kw => questionLower.includes(kw))) {
    baseRisk *= 1.5;
    factors.push({
      name: 'TIME_SENSITIVE',
      impact: 'LOW',
      detail: 'Exact timing may affect outcome',
    });
  }

  const settlementDelayRisk = Math.min(baseRisk, 0.1);

  return {
    settlementDelayRisk,
    factors,
    expectedSettlementHours: 1,
    worstCaseSettlementHours: 24,
    riskLevel: settlementDelayRisk > 0.05 ? 'MEDIUM' : 'LOW',
  };
}

/**
 * Calculate cross-venue resolution mismatch risk
 */
export function calculateResolutionMismatchRisk(polyMarket, kalshiMarket, equivalence) {
  const polyRisk = calculatePolymarketDisputeRisk(polyMarket);
  const kalshiRisk = calculateKalshiSettlementRisk(kalshiMarket);

  // Combined probability of at least one dispute/delay
  const anyIssueProb = 1 - (1 - polyRisk.disputeProbability) * (1 - kalshiRisk.settlementDelayRisk);

  // Probability that venues resolve differently
  // This is the basis risk from contract non-equivalence
  const equivalenceFactor = equivalence?.confidence || 0.5;
  const resolutionMismatchProb = (1 - equivalenceFactor) * 0.5;  // Half of non-equivalent cases mismatch

  // Combined mismatch risk
  const totalMismatchRisk = Math.min(
    anyIssueProb + resolutionMismatchProb,
    0.5  // Cap at 50%
  );

  return {
    polymarketRisk: polyRisk,
    kalshiRisk: kalshiRisk,
    anyIssueProb,
    resolutionMismatchProb,
    totalMismatchRisk,

    // Time windows
    timing: {
      polymarketMinResolution: polyRisk.expectedDisputeWindowHours,
      polymarketMaxResolution: polyRisk.worstCaseResolutionHours,
      kalshiMinResolution: kalshiRisk.expectedSettlementHours,
      kalshiMaxResolution: kalshiRisk.worstCaseSettlementHours,
      maxTimingGapHours: Math.abs(
        polyRisk.worstCaseResolutionHours - kalshiRisk.expectedSettlementHours
      ),
    },

    // Financial impact
    financialImpact: {
      capitalAtRiskDuringDispute: true,
      maxCapitalLockupHours: polyRisk.worstCaseResolutionHours,
      potentialLossOnMismatch: 100,  // 100% of position
      expectedLossPercent: totalMismatchRisk * 100,
    },

    // Recommendations
    recommendations: generateRiskRecommendations(polyRisk, kalshiRisk, totalMismatchRisk),

    // Overall risk level
    overallRisk: totalMismatchRisk > 0.15 ? 'HIGH' :
      totalMismatchRisk > 0.08 ? 'MEDIUM' : 'LOW',
  };
}

/**
 * Generate risk recommendations
 */
function generateRiskRecommendations(polyRisk, kalshiRisk, totalRisk) {
  const recommendations = [];

  if (polyRisk.riskLevel === 'HIGH') {
    recommendations.push({
      priority: 'HIGH',
      action: 'REDUCE_SIZE',
      detail: 'Reduce position size due to high Polymarket dispute risk',
    });
  }

  if (totalRisk > 0.1) {
    recommendations.push({
      priority: 'HIGH',
      action: 'MANUAL_REVIEW',
      detail: 'Manual verification required before trading',
    });
  }

  if (polyRisk.worstCaseResolutionHours > 48) {
    recommendations.push({
      priority: 'MEDIUM',
      action: 'ACCOUNT_FOR_LOCKUP',
      detail: 'Account for potential 4-day capital lockup in position sizing',
    });
  }

  if (polyRisk.disputeProbability > 0.05) {
    recommendations.push({
      priority: 'MEDIUM',
      action: 'HEDGE_EARLY',
      detail: 'Consider closing position before settlement if in profit',
    });
  }

  if (recommendations.length === 0) {
    recommendations.push({
      priority: 'LOW',
      action: 'PROCEED',
      detail: 'Risk profile acceptable for standard position sizing',
    });
  }

  return recommendations;
}

/**
 * Monitor active positions for dispute events
 */
export class DisputeMonitor {
  constructor() {
    this.watchedMarkets = new Map();
    this.alerts = [];
  }

  /**
   * Add market to watch list
   */
  watch(marketId, platform, details) {
    this.watchedMarkets.set(`${platform}_${marketId}`, {
      marketId,
      platform,
      details,
      addedAt: Date.now(),
      lastChecked: null,
      status: 'ACTIVE',
    });
  }

  /**
   * Remove market from watch list
   */
  unwatch(marketId, platform) {
    this.watchedMarkets.delete(`${platform}_${marketId}`);
  }

  /**
   * Check for disputes (would integrate with UMA API in production)
   */
  async checkDisputes() {
    const disputes = [];

    for (const [key, market] of this.watchedMarkets) {
      if (market.platform === 'polymarket') {
        // In production: check UMA oracle for dispute status
        // For now, this is a placeholder

        market.lastChecked = Date.now();

        // Simulated check - in production, query UMA contracts
        const hasDispute = false; // Would come from UMA API

        if (hasDispute) {
          disputes.push({
            key,
            market,
            disputeType: 'UMA_DISPUTE',
            detectedAt: Date.now(),
          });

          this.alerts.push({
            type: 'DISPUTE_DETECTED',
            market,
            timestamp: Date.now(),
          });
        }
      }
    }

    return disputes;
  }

  /**
   * Get all alerts
   */
  getAlerts() {
    return this.alerts;
  }

  /**
   * Clear alerts
   */
  clearAlerts() {
    this.alerts = [];
  }
}

export const DisputeRiskModel = {
  UMA_ORACLE,
  KALSHI_SETTLEMENT,
  RISK_FACTORS,
  calculatePolymarketDisputeRisk,
  calculateKalshiSettlementRisk,
  calculateResolutionMismatchRisk,
  DisputeMonitor,
};

export default DisputeRiskModel;
