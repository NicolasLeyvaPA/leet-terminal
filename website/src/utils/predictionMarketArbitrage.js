// Prediction Market Arbitrage Engine
// Cross-venue arbitrage between Polymarket and Kalshi
// Includes full cost modeling, legging risk, circuit breakers, and reconciliation

import { ContractEquivalence } from './contractEquivalence.js';
import { KalshiAPI } from '../services/kalshiAPI.js';

// ============================================================================
// CONFIGURATION & CONSTANTS
// ============================================================================

export const DEFAULT_CONFIG = {
  // Profitability thresholds
  minNetProfitPercent: 0.5,       // Minimum profit after ALL costs
  minGrossProfitPercent: 1.0,     // Minimum gross spread to consider

  // Position limits
  maxPositionPerMarket: 5000,     // Max $ per market pair
  maxTotalExposure: 25000,        // Max $ total across all pairs
  maxOpenOrders: 20,              // Max concurrent orders
  maxInventoryImbalance: 2000,    // Max $ one-sided exposure

  // Risk limits
  maxDailyLoss: 1000,             // Stop trading for day
  maxDrawdown: 3000,              // Stop trading until review
  maxStuckLegTime: 60,            // Seconds before forced unwind

  // Execution settings
  defaultOrderType: 'limit',      // 'limit' or 'market'
  slippageTolerance: 0.02,        // 2% max slippage
  fillTimeout: 5000,              // 5 seconds to fill or cancel

  // Contract equivalence
  minEquivalenceConfidence: 0.8,  // Minimum confidence to trade
  requireVerifiedPairs: true,     // Only trade manually verified pairs

  // Costs (conservative estimates)
  costs: {
    polymarketGas: 5.00,          // Estimated gas per trade
    polymarketSpread: 0.005,      // 0.5% effective spread
    kalshiFeeRate: 0.07,          // 7% of profit
    kalshiMaxFee: 0.07,           // $0.07 per contract cap
    stablecoinConversion: 0.003,  // 0.3% USDC<->USD
    settlementDelayCost: 0.001,   // Daily cost of locked capital
  },

  // Circuit breakers
  circuitBreakers: {
    spreadSpikeThreshold: 0.15,   // Halt if spread jumps >15%
    slippageThreshold: 0.03,      // Halt if slippage >3%
    fillRateMin: 0.5,             // Halt if <50% fills succeed
    staleDataMs: 10000,           // Halt if data >10s old
    apiErrorRate: 0.15,           // Halt if >15% API errors
    reconciliationMismatch: true, // Halt on any mismatch
  },
};

// ============================================================================
// COST MODEL
// ============================================================================

/**
 * Calculate all-in costs for an arbitrage trade
 */
export function calculateAllInCosts(opportunity, config = DEFAULT_CONFIG) {
  const { costs } = config;
  const { tradeSize, polyPrice, kalshiPrice, side } = opportunity;

  // Number of contracts (assuming $1 contracts)
  const contracts = tradeSize;

  // Polymarket costs
  const polyGasCost = costs.polymarketGas;
  const polySpreadCost = tradeSize * costs.polymarketSpread;

  // Kalshi costs (7% of profit, capped at $0.07 per contract)
  const potentialProfit = Math.abs(kalshiPrice - polyPrice) * contracts;
  const kalshiFee = Math.min(
    potentialProfit * costs.kalshiFeeRate,
    contracts * costs.kalshiMaxFee
  );

  // Stablecoin conversion (USDC <-> USD)
  const conversionCost = tradeSize * costs.stablecoinConversion * 2; // Both directions

  // Slippage estimate
  const slippageCost = tradeSize * config.slippageTolerance * 0.5; // Assume half of tolerance

  // Settlement delay cost (capital locked)
  const avgSettlementDays = 7; // Conservative estimate
  const settlementCost = tradeSize * costs.settlementDelayCost * avgSettlementDays;

  const totalCosts = polyGasCost + polySpreadCost + kalshiFee + conversionCost + slippageCost + settlementCost;

  const grossProfit = Math.abs(kalshiPrice - polyPrice) * contracts;
  const netProfit = grossProfit - totalCosts;

  return {
    breakdown: {
      polymarketGas: polyGasCost,
      polymarketSpread: polySpreadCost,
      kalshiFee,
      stablecoinConversion: conversionCost,
      estimatedSlippage: slippageCost,
      settlementDelayCost: settlementCost,
    },
    totalCosts,
    grossProfit,
    netProfit,
    netProfitPercent: (netProfit / tradeSize) * 100,
    isProfitable: netProfit > 0,
    breakEvenSpread: totalCosts / contracts,
  };
}

// ============================================================================
// OPPORTUNITY DETECTION
// ============================================================================

/**
 * Detect arbitrage opportunities between matched market pairs
 */
export function detectOpportunities(polyMarkets, kalshiMarkets, config = DEFAULT_CONFIG) {
  const opportunities = [];

  // Find potential matches
  const matches = ContractEquivalence.findPotentialMatches(polyMarkets, kalshiMarkets);

  for (const match of matches) {
    // Verify equivalence
    const equivalence = ContractEquivalence.verifyEquivalence(match.polymarket, match.kalshi);

    // Skip if not confident enough
    if (equivalence.confidence < config.minEquivalenceConfidence) {
      continue;
    }

    if (config.requireVerifiedPairs && equivalence.equivalence !== 'IDENTICAL') {
      continue;
    }

    // Get prices
    const polyBid = match.polymarket.bestBid || 0;
    const polyAsk = match.polymarket.bestAsk || 1;
    const kalshiBid = match.kalshi.bestBid || 0;
    const kalshiAsk = match.kalshi.bestAsk || 1;

    // Check for arbitrage in both directions

    // Direction 1: Buy on Polymarket, Sell on Kalshi
    const spread1 = kalshiBid - polyAsk;
    if (spread1 > config.minGrossProfitPercent / 100) {
      const opp1 = createOpportunity(
        match,
        equivalence,
        'BUY_POLY_SELL_KALSHI',
        polyAsk,
        kalshiBid,
        spread1,
        config
      );
      if (opp1.costs.isProfitable && opp1.costs.netProfitPercent >= config.minNetProfitPercent) {
        opportunities.push(opp1);
      }
    }

    // Direction 2: Buy on Kalshi, Sell on Polymarket
    const spread2 = polyBid - kalshiAsk;
    if (spread2 > config.minGrossProfitPercent / 100) {
      const opp2 = createOpportunity(
        match,
        equivalence,
        'BUY_KALSHI_SELL_POLY',
        kalshiAsk,
        polyBid,
        spread2,
        config
      );
      if (opp2.costs.isProfitable && opp2.costs.netProfitPercent >= config.minNetProfitPercent) {
        opportunities.push(opp2);
      }
    }
  }

  // Sort by net profit
  opportunities.sort((a, b) => b.costs.netProfitPercent - a.costs.netProfitPercent);

  return opportunities;
}

/**
 * Create opportunity object
 */
function createOpportunity(match, equivalence, direction, buyPrice, sellPrice, spread, config) {
  const tradeSize = Math.min(
    config.maxPositionPerMarket,
    estimateMaxExecutableSize(match.polymarket, match.kalshi)
  );

  const costs = calculateAllInCosts({
    tradeSize,
    polyPrice: direction === 'BUY_POLY_SELL_KALSHI' ? buyPrice : sellPrice,
    kalshiPrice: direction === 'BUY_POLY_SELL_KALSHI' ? sellPrice : buyPrice,
    side: 'YES',
  }, config);

  return {
    id: `${match.polymarket.id}_${match.kalshi.ticker}_${Date.now()}`,
    direction,
    polymarket: {
      id: match.polymarket.id,
      ticker: match.polymarket.ticker,
      question: match.polymarket.question,
      price: direction === 'BUY_POLY_SELL_KALSHI' ? buyPrice : sellPrice,
      action: direction === 'BUY_POLY_SELL_KALSHI' ? 'BUY' : 'SELL',
    },
    kalshi: {
      ticker: match.kalshi.ticker,
      question: match.kalshi.question,
      price: direction === 'BUY_POLY_SELL_KALSHI' ? sellPrice : buyPrice,
      action: direction === 'BUY_POLY_SELL_KALSHI' ? 'SELL' : 'BUY',
    },
    spread,
    spreadPercent: spread * 100,
    tradeSize,
    costs,
    equivalence: {
      result: equivalence.equivalence,
      confidence: equivalence.confidence,
      risks: equivalence.risks,
      basisRisk: equivalence.basisRisk,
    },
    timestamp: Date.now(),
  };
}

/**
 * Estimate maximum executable size based on orderbook depth
 */
function estimateMaxExecutableSize(polyMarket, kalshiMarket) {
  // Conservative: use minimum of available liquidity on both sides
  const polyLiquidity = polyMarket.liquidity || 1000;
  const kalshiLiquidity = kalshiMarket.open_interest || 1000;

  // Don't take more than 10% of available liquidity
  return Math.min(polyLiquidity * 0.1, kalshiLiquidity * 0.1, 5000);
}

// ============================================================================
// LEGGING RISK MANAGEMENT
// ============================================================================

/**
 * Legging risk manager - handles partial fills and stuck legs
 */
export class LeggingRiskManager {
  constructor(config = DEFAULT_CONFIG) {
    this.config = config;
    this.openLegs = new Map(); // Track single-leg positions
    this.unwindAttempts = new Map();
  }

  /**
   * Register a leg execution
   */
  registerLeg(opportunityId, leg, fillInfo) {
    const legKey = `${opportunityId}_${leg}`;
    this.openLegs.set(legKey, {
      opportunityId,
      leg,
      fillInfo,
      timestamp: Date.now(),
      status: 'OPEN',
    });
  }

  /**
   * Mark leg as paired (both legs filled)
   */
  markPaired(opportunityId) {
    const leg1Key = `${opportunityId}_1`;
    const leg2Key = `${opportunityId}_2`;

    if (this.openLegs.has(leg1Key)) {
      this.openLegs.get(leg1Key).status = 'PAIRED';
    }
    if (this.openLegs.has(leg2Key)) {
      this.openLegs.get(leg2Key).status = 'PAIRED';
    }
  }

  /**
   * Check for stuck legs that need unwinding
   */
  checkStuckLegs() {
    const stuckLegs = [];
    const now = Date.now();

    for (const [key, leg] of this.openLegs) {
      if (leg.status === 'OPEN') {
        const age = (now - leg.timestamp) / 1000;
        if (age > this.config.maxStuckLegTime) {
          stuckLegs.push({
            key,
            leg,
            ageSeconds: age,
          });
        }
      }
    }

    return stuckLegs;
  }

  /**
   * Calculate unwind strategy for a stuck leg
   */
  calculateUnwindStrategy(stuckLeg) {
    const { leg } = stuckLeg;
    const attempts = this.unwindAttempts.get(stuckLeg.key) || 0;

    // Progressive unwind: start aggressive, get more desperate
    const urgencyMultiplier = 1 + (attempts * 0.5);
    const maxLossPercent = Math.min(5 + (attempts * 2), 15); // 5% -> 15% max

    return {
      venue: leg.leg === '1' ? 'SAME_VENUE' : 'SAME_VENUE',
      orderType: attempts < 2 ? 'limit' : 'market',
      priceOffset: urgencyMultiplier * 0.02, // 2% worse each attempt
      maxLossPercent,
      attempts: attempts + 1,
    };
  }

  /**
   * Record unwind attempt
   */
  recordUnwindAttempt(legKey) {
    const attempts = this.unwindAttempts.get(legKey) || 0;
    this.unwindAttempts.set(legKey, attempts + 1);
  }

  /**
   * Complete unwind
   */
  completeUnwind(legKey) {
    this.openLegs.delete(legKey);
    this.unwindAttempts.delete(legKey);
  }

  /**
   * Get current exposure from unpaired legs
   */
  getUnpairedExposure() {
    let exposure = 0;
    for (const [, leg] of this.openLegs) {
      if (leg.status === 'OPEN') {
        exposure += leg.fillInfo?.size || 0;
      }
    }
    return exposure;
  }
}

// ============================================================================
// CIRCUIT BREAKERS
// ============================================================================

export class CircuitBreakers {
  constructor(config = DEFAULT_CONFIG) {
    this.config = config.circuitBreakers;
    this.state = {
      isHalted: false,
      haltReason: null,
      haltTime: null,
    };
    this.metrics = {
      recentFills: [],
      recentErrors: [],
      lastDataTimestamp: Date.now(),
      spreadHistory: [],
    };
  }

  /**
   * Check all circuit breakers
   */
  check(context = {}) {
    const checks = [
      this.checkDataStaleness(context),
      this.checkFillRate(context),
      this.checkApiErrors(context),
      this.checkSpreadSpike(context),
      this.checkSlippage(context),
      this.checkReconciliation(context),
    ];

    for (const check of checks) {
      if (check.triggered) {
        this.halt(check.reason);
        return { halted: true, reason: check.reason };
      }
    }

    return { halted: false };
  }

  /**
   * Halt trading
   */
  halt(reason) {
    this.state.isHalted = true;
    this.state.haltReason = reason;
    this.state.haltTime = Date.now();
    console.error(`[CIRCUIT BREAKER] HALTED: ${reason}`);
  }

  /**
   * Reset (manual only)
   */
  reset() {
    this.state.isHalted = false;
    this.state.haltReason = null;
    this.state.haltTime = null;
    console.log('[CIRCUIT BREAKER] Reset');
  }

  /**
   * Check if data is stale
   */
  checkDataStaleness(context) {
    const { lastDataTimestamp } = context;
    if (!lastDataTimestamp) return { triggered: false };

    const age = Date.now() - lastDataTimestamp;
    if (age > this.config.staleDataMs) {
      return {
        triggered: true,
        reason: `Stale data: ${(age / 1000).toFixed(1)}s old (limit: ${this.config.staleDataMs / 1000}s)`,
      };
    }
    return { triggered: false };
  }

  /**
   * Check fill rate
   */
  checkFillRate(context) {
    const recentFills = this.metrics.recentFills.filter(
      f => Date.now() - f.timestamp < 60000
    );

    if (recentFills.length < 5) return { triggered: false };

    const successRate = recentFills.filter(f => f.success).length / recentFills.length;
    if (successRate < this.config.fillRateMin) {
      return {
        triggered: true,
        reason: `Low fill rate: ${(successRate * 100).toFixed(1)}% (limit: ${this.config.fillRateMin * 100}%)`,
      };
    }
    return { triggered: false };
  }

  /**
   * Check API error rate
   */
  checkApiErrors(context) {
    const recentErrors = this.metrics.recentErrors.filter(
      e => Date.now() - e.timestamp < 60000
    );

    if (recentErrors.length === 0) return { triggered: false };

    // Assuming roughly 60 requests per minute max
    const errorRate = recentErrors.length / 60;
    if (errorRate > this.config.apiErrorRate) {
      return {
        triggered: true,
        reason: `High API error rate: ${(errorRate * 100).toFixed(1)}% (limit: ${this.config.apiErrorRate * 100}%)`,
      };
    }
    return { triggered: false };
  }

  /**
   * Check for spread spikes
   */
  checkSpreadSpike(context) {
    const { currentSpread, historicalSpread } = context;
    if (!currentSpread || !historicalSpread) return { triggered: false };

    const spike = Math.abs(currentSpread - historicalSpread) / historicalSpread;
    if (spike > this.config.spreadSpikeThreshold) {
      return {
        triggered: true,
        reason: `Spread spike: ${(spike * 100).toFixed(1)}% change (limit: ${this.config.spreadSpikeThreshold * 100}%)`,
      };
    }
    return { triggered: false };
  }

  /**
   * Check slippage
   */
  checkSlippage(context) {
    const { expectedPrice, actualPrice } = context;
    if (!expectedPrice || !actualPrice) return { triggered: false };

    const slippage = Math.abs(actualPrice - expectedPrice) / expectedPrice;
    if (slippage > this.config.slippageThreshold) {
      return {
        triggered: true,
        reason: `High slippage: ${(slippage * 100).toFixed(1)}% (limit: ${this.config.slippageThreshold * 100}%)`,
      };
    }
    return { triggered: false };
  }

  /**
   * Check position reconciliation
   */
  checkReconciliation(context) {
    const { reconciliationMismatch } = context;
    if (this.config.reconciliationMismatch && reconciliationMismatch) {
      return {
        triggered: true,
        reason: 'Position reconciliation mismatch detected',
      };
    }
    return { triggered: false };
  }

  /**
   * Record a fill attempt
   */
  recordFill(success) {
    this.metrics.recentFills.push({ success, timestamp: Date.now() });
    // Keep last 100
    if (this.metrics.recentFills.length > 100) {
      this.metrics.recentFills.shift();
    }
  }

  /**
   * Record an API error
   */
  recordError() {
    this.metrics.recentErrors.push({ timestamp: Date.now() });
    // Keep last 100
    if (this.metrics.recentErrors.length > 100) {
      this.metrics.recentErrors.shift();
    }
  }

  /**
   * Update data timestamp
   */
  updateDataTimestamp() {
    this.metrics.lastDataTimestamp = Date.now();
  }
}

// ============================================================================
// POSITION RECONCILIATION
// ============================================================================

export class PositionReconciler {
  constructor() {
    this.localPositions = new Map();
    this.lastReconciliation = null;
    this.mismatches = [];
  }

  /**
   * Update local position tracking
   */
  updateLocalPosition(venue, marketId, position) {
    const key = `${venue}_${marketId}`;
    this.localPositions.set(key, {
      ...position,
      lastUpdated: Date.now(),
    });
  }

  /**
   * Reconcile with venue positions
   */
  async reconcile(polyPositions, kalshiPositions) {
    const mismatches = [];

    // Check Polymarket positions
    for (const pos of polyPositions) {
      const key = `polymarket_${pos.marketId}`;
      const local = this.localPositions.get(key);

      if (!local) {
        mismatches.push({
          venue: 'polymarket',
          marketId: pos.marketId,
          type: 'UNKNOWN_POSITION',
          venuePosition: pos,
          localPosition: null,
        });
        continue;
      }

      if (Math.abs(local.size - pos.size) > 0.01) {
        mismatches.push({
          venue: 'polymarket',
          marketId: pos.marketId,
          type: 'SIZE_MISMATCH',
          venuePosition: pos,
          localPosition: local,
          diff: pos.size - local.size,
        });
      }
    }

    // Check Kalshi positions
    for (const pos of kalshiPositions) {
      const key = `kalshi_${pos.ticker}`;
      const local = this.localPositions.get(key);

      if (!local) {
        mismatches.push({
          venue: 'kalshi',
          marketId: pos.ticker,
          type: 'UNKNOWN_POSITION',
          venuePosition: pos,
          localPosition: null,
        });
        continue;
      }

      if (Math.abs(local.size - pos.position) > 0.01) {
        mismatches.push({
          venue: 'kalshi',
          marketId: pos.ticker,
          type: 'SIZE_MISMATCH',
          venuePosition: pos,
          localPosition: local,
          diff: pos.position - local.size,
        });
      }
    }

    this.mismatches = mismatches;
    this.lastReconciliation = Date.now();

    return {
      success: mismatches.length === 0,
      mismatches,
      timestamp: this.lastReconciliation,
    };
  }

  /**
   * Get current mismatch status
   */
  hasMismatches() {
    return this.mismatches.length > 0;
  }
}

// ============================================================================
// KILL SWITCH
// ============================================================================

export class KillSwitch {
  constructor(onKill = null) {
    this.isKilled = false;
    this.killTime = null;
    this.killReason = null;
    this.onKill = onKill;
    this.pendingActions = [];
  }

  /**
   * Activate kill switch
   */
  kill(reason) {
    if (this.isKilled) return;

    this.isKilled = true;
    this.killTime = Date.now();
    this.killReason = reason;

    console.error(`[KILL SWITCH] ACTIVATED: ${reason}`);

    // Store pending actions for manual review
    this.pendingActions.push({
      action: 'KILL_SWITCH_ACTIVATED',
      reason,
      timestamp: this.killTime,
    });

    if (this.onKill) {
      this.onKill(reason);
    }

    return {
      success: true,
      actions: [
        'All new orders blocked',
        'Open orders should be cancelled manually',
        'Positions require manual review',
        'System requires manual reset',
      ],
    };
  }

  /**
   * Check if operations should proceed
   */
  canProceed() {
    return !this.isKilled;
  }

  /**
   * Reset (requires explicit action)
   */
  reset(confirmation) {
    if (confirmation !== 'CONFIRM_KILL_SWITCH_RESET') {
      throw new Error('Kill switch reset requires explicit confirmation');
    }

    this.isKilled = false;
    this.killTime = null;
    this.killReason = null;
    console.log('[KILL SWITCH] Reset');
  }
}

// ============================================================================
// MAIN ARBITRAGE BOT CLASS
// ============================================================================

export class PredictionMarketArbitrageBot {
  constructor(config = DEFAULT_CONFIG) {
    this.config = config;
    this.isRunning = false;
    this.scanInterval = null;

    // Core components
    this.leggingManager = new LeggingRiskManager(config);
    this.circuitBreakers = new CircuitBreakers(config);
    this.reconciler = new PositionReconciler();
    this.killSwitch = new KillSwitch(() => this.emergencyStop());

    // State
    this.opportunities = [];
    this.trades = [];
    this.stats = {
      totalScans: 0,
      opportunitiesFound: 0,
      tradesExecuted: 0,
      totalProfit: 0,
      totalLoss: 0,
      startTime: null,
    };

    // Credentials (must be set before trading)
    this.credentials = {
      kalshi: null,
      polymarket: null,
    };

    // Listeners
    this.listeners = new Set();

    // Market data (received from App.jsx)
    this.polymarkets = [];
    this.kalshiMarkets = [];
    this.dataReceivedAt = null;
  }

  /**
   * Receive market data from App.jsx
   * This is the main way the bot gets market data
   */
  setMarketData(polymarkets, kalshiMarkets = []) {
    this.polymarkets = polymarkets || [];
    this.kalshiMarkets = kalshiMarkets || [];
    this.dataReceivedAt = Date.now();

    // Update circuit breaker timestamp
    this.circuitBreakers.updateDataTimestamp();

    // Detect opportunities with new data
    if (this.polymarkets.length > 0) {
      this.opportunities = this.findPolymarketOpportunities();
    }

    this.notify();
    console.log(`[PredictionMarketArbitrageBot] Received ${this.polymarkets.length} Polymarket markets`);
  }

  /**
   * Find opportunities within Polymarket (same-venue arb on multi-option markets)
   * This works even without Kalshi data
   */
  findPolymarketOpportunities() {
    const opportunities = [];

    for (const market of this.polymarkets) {
      // Skip markets without multi-option data
      if (!market.allOutcomes || market.allOutcomes.length < 2) continue;

      // Check if probabilities sum to more than 1 (overround = arb opportunity)
      const totalProb = market.allOutcomes.reduce((sum, o) => sum + (o.probability || 0), 0);

      // Also check for underround (probs sum to less than 1)
      if (totalProb > 1.02 || totalProb < 0.98) {
        const spread = Math.abs(1 - totalProb);

        opportunities.push({
          id: `poly_internal_${market.id}_${Date.now()}`,
          type: totalProb > 1 ? 'OVERROUND' : 'UNDERROUND',
          market: {
            id: market.id,
            question: market.question,
            category: market.category,
            outcomes: market.allOutcomes,
          },
          totalProbability: totalProb,
          spread: spread,
          spreadPercent: (spread * 100).toFixed(2),
          timestamp: Date.now(),
          venue: 'polymarket',
          action: totalProb > 1 ? 'Sell all outcomes' : 'Buy all outcomes',
        });
      }
    }

    // Sort by spread (best opportunities first)
    opportunities.sort((a, b) => b.spread - a.spread);

    return opportunities;
  }

  /**
   * Set API credentials
   */
  setCredentials(venue, credentials) {
    this.credentials[venue] = credentials;
  }

  /**
   * Subscribe to updates
   */
  subscribe(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  /**
   * Notify listeners
   */
  notify() {
    const state = this.getState();
    this.listeners.forEach(cb => cb(state));
  }

  /**
   * Get current state
   */
  getState() {
    return {
      isRunning: this.isRunning,
      isKilled: this.killSwitch.isKilled,
      isHalted: this.circuitBreakers.state.isHalted,
      haltReason: this.circuitBreakers.state.haltReason,
      opportunities: this.opportunities,
      trades: this.trades,
      stats: this.stats,
      unpairedExposure: this.leggingManager.getUnpairedExposure(),
      hasMismatches: this.reconciler.hasMismatches(),
      config: this.config,
      // Market data info
      polymarketCount: this.polymarkets.length,
      kalshiCount: this.kalshiMarkets.length,
      dataReceivedAt: this.dataReceivedAt,
      dataAge: this.dataReceivedAt ? Date.now() - this.dataReceivedAt : null,
    };
  }

  /**
   * Start the bot
   */
  start(intervalMs = 15000) {
    if (this.isRunning) return;
    if (this.killSwitch.isKilled) {
      console.error('Cannot start: Kill switch is active');
      return;
    }

    this.isRunning = true;
    this.stats.startTime = Date.now();

    // Initial scan
    this.scan();

    // Set up interval
    this.scanInterval = setInterval(() => this.scan(), intervalMs);

    this.notify();
    console.log('[PredictionMarketArbitrageBot] Started');
  }

  /**
   * Stop the bot
   */
  stop() {
    this.isRunning = false;
    if (this.scanInterval) {
      clearInterval(this.scanInterval);
      this.scanInterval = null;
    }
    this.notify();
    console.log('[PredictionMarketArbitrageBot] Stopped');
  }

  /**
   * Emergency stop
   */
  emergencyStop() {
    this.stop();
    console.error('[PredictionMarketArbitrageBot] EMERGENCY STOP');
  }

  /**
   * Perform a scan
   */
  async scan() {
    if (!this.isRunning || this.killSwitch.isKilled) return;

    // Check circuit breakers
    const breakerCheck = this.circuitBreakers.check({
      lastDataTimestamp: this.circuitBreakers.metrics.lastDataTimestamp,
      reconciliationMismatch: this.reconciler.hasMismatches(),
    });

    if (breakerCheck.halted) {
      console.warn('[Scan] Halted by circuit breaker:', breakerCheck.reason);
      this.notify();
      return;
    }

    try {
      this.stats.totalScans++;
      this.circuitBreakers.updateDataTimestamp();

      // In real implementation, fetch markets from both venues
      // For now, this is a placeholder that would be filled with actual API calls
      console.log('[Scan] Scanning for opportunities...');

      // Check for stuck legs
      const stuckLegs = this.leggingManager.checkStuckLegs();
      if (stuckLegs.length > 0) {
        console.warn('[Scan] Stuck legs detected:', stuckLegs.length);
        // In production: attempt to unwind stuck legs
      }

      this.notify();
    } catch (error) {
      console.error('[Scan] Error:', error);
      this.circuitBreakers.recordError();
    }
  }

  /**
   * Execute an arbitrage opportunity (simulation mode)
   */
  async executeOpportunity(opportunity) {
    if (!this.killSwitch.canProceed()) {
      throw new Error('Kill switch is active');
    }

    if (this.circuitBreakers.state.isHalted) {
      throw new Error('Circuit breakers halted trading');
    }

    // Check exposure limits
    const currentExposure = this.leggingManager.getUnpairedExposure();
    if (currentExposure + opportunity.tradeSize > this.config.maxTotalExposure) {
      throw new Error('Would exceed max exposure limit');
    }

    // In simulation mode, just record the trade
    const trade = {
      id: `trade_${Date.now()}`,
      opportunity,
      status: 'SIMULATED',
      executedAt: Date.now(),
      leg1: { status: 'FILLED', venue: 'polymarket' },
      leg2: { status: 'FILLED', venue: 'kalshi' },
      profit: opportunity.costs.netProfit,
    };

    this.trades.push(trade);
    this.stats.tradesExecuted++;

    if (trade.profit > 0) {
      this.stats.totalProfit += trade.profit;
    } else {
      this.stats.totalLoss += Math.abs(trade.profit);
    }

    // Check daily loss limit
    if (this.stats.totalLoss > this.config.maxDailyLoss) {
      this.killSwitch.kill('Daily loss limit exceeded');
    }

    this.notify();
    return trade;
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    this.notify();
  }

  /**
   * Get runtime
   */
  getRuntime() {
    if (!this.stats.startTime) return 0;
    return Date.now() - this.stats.startTime;
  }

  /**
   * Reset circuit breakers (manual action)
   */
  resetCircuitBreakers() {
    this.circuitBreakers.reset();
    this.notify();
  }

  /**
   * Reset kill switch (requires confirmation)
   */
  resetKillSwitch(confirmation) {
    this.killSwitch.reset(confirmation);
    this.notify();
  }
}

// Singleton instance
let botInstance = null;

export function getPredictionMarketArbitrageBot(config) {
  if (!botInstance) {
    botInstance = new PredictionMarketArbitrageBot(config);
  }
  return botInstance;
}

export default {
  PredictionMarketArbitrageBot,
  getPredictionMarketArbitrageBot,
  calculateAllInCosts,
  detectOpportunities,
  LeggingRiskManager,
  CircuitBreakers,
  PositionReconciler,
  KillSwitch,
  DEFAULT_CONFIG,
};
