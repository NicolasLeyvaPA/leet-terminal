// Arbitrage Detection Engine
// Identifies and scores arbitrage opportunities across exchanges

import { CryptoExchangeAPI } from '../services/cryptoExchangeAPI.js';

// Configuration defaults
const DEFAULT_CONFIG = {
  minProfitPercent: 0.1,        // Minimum profit % after fees to consider
  maxTradeSize: 10000,          // Maximum trade size in USDT
  slippageTolerance: 0.05,      // 5% slippage tolerance
  networkFees: {
    BTC: 0.0001,   // ~$4 at $40k
    ETH: 0.001,    // ~$3 at $3k
    SOL: 0.00025,  // ~$0.05
    default: 0.001,
  },
  withdrawalTimes: {
    BTC: 30,       // minutes
    ETH: 5,
    SOL: 1,
    default: 10,
  },
};

/**
 * Simple Arbitrage: Buy on Exchange A, sell on Exchange B
 * Calculates profit after trading fees
 */
export function findSimpleArbitrage(prices, config = DEFAULT_CONFIG) {
  if (!prices || prices.length < 2) return [];

  const opportunities = [];
  const sortedByPrice = [...prices].sort((a, b) => a.price - b.price);

  // Compare each pair of exchanges
  for (let i = 0; i < sortedByPrice.length; i++) {
    for (let j = i + 1; j < sortedByPrice.length; j++) {
      const buyExchange = sortedByPrice[i];   // Lower price (buy)
      const sellExchange = sortedByPrice[j];  // Higher price (sell)

      const buyPrice = buyExchange.price;
      const sellPrice = sellExchange.price;

      // Calculate gross profit
      const grossProfitPercent = ((sellPrice - buyPrice) / buyPrice) * 100;

      // Calculate fees
      const buyFee = buyExchange.fee * 100;
      const sellFee = sellExchange.fee * 100;
      const totalFees = buyFee + sellFee;

      // Net profit after trading fees
      const netProfitPercent = grossProfitPercent - totalFees;

      if (netProfitPercent >= config.minProfitPercent) {
        const tradeSize = Math.min(config.maxTradeSize, 5000); // Default trade size
        const profitUSD = (netProfitPercent / 100) * tradeSize;

        opportunities.push({
          type: 'simple',
          pair: buyExchange.symbol,
          buyExchange: buyExchange.exchangeName,
          sellExchange: sellExchange.exchangeName,
          buyPrice,
          sellPrice,
          spread: sellPrice - buyPrice,
          spreadPercent: grossProfitPercent,
          buyFee,
          sellFee,
          totalFees,
          netProfitPercent,
          estimatedProfitUSD: profitUSD,
          tradeSize,
          confidence: calculateConfidence(netProfitPercent, grossProfitPercent),
          risk: assessRisk(netProfitPercent, buyExchange, sellExchange),
          timestamp: Date.now(),
          route: `${buyExchange.exchangeName} -> ${sellExchange.exchangeName}`,
          action: {
            buy: { exchange: buyExchange.exchange, price: buyPrice, amount: tradeSize / buyPrice },
            sell: { exchange: sellExchange.exchange, price: sellPrice, amount: tradeSize / buyPrice },
          },
        });
      }
    }
  }

  // Sort by net profit descending
  return opportunities.sort((a, b) => b.netProfitPercent - a.netProfitPercent);
}

/**
 * Triangular Arbitrage: A -> B -> C -> A
 * Finds profit opportunities within a single exchange
 */
export function findTriangularArbitrage(marketPrices, config = DEFAULT_CONFIG) {
  const opportunities = [];

  // Common triangular paths
  const trianglePaths = [
    ['BTC/USDT', 'ETH/BTC', 'ETH/USDT'],
    ['BTC/USDT', 'SOL/BTC', 'SOL/USDT'],
    ['ETH/USDT', 'LINK/ETH', 'LINK/USDT'],
    ['BTC/USDT', 'XRP/BTC', 'XRP/USDT'],
  ];

  // For now, simulate with available data
  // In production, this would use actual cross-pair data

  return opportunities;
}

/**
 * Scan all markets for arbitrage opportunities
 */
export async function scanArbitrageOpportunities(config = DEFAULT_CONFIG) {
  try {
    const marketPrices = await CryptoExchangeAPI.fetchAllMarketPrices();
    const allOpportunities = [];

    // Find simple arbitrage for each pair
    Object.entries(marketPrices).forEach(([pair, data]) => {
      if (data.prices && data.prices.length >= 2) {
        const opportunities = findSimpleArbitrage(data.prices, config);
        opportunities.forEach(opp => {
          opp.displayName = data.displayName;
          allOpportunities.push(opp);
        });
      }
    });

    // Sort by profit potential
    allOpportunities.sort((a, b) => b.netProfitPercent - a.netProfitPercent);

    return {
      opportunities: allOpportunities,
      scannedPairs: Object.keys(marketPrices).length,
      scannedAt: Date.now(),
      config,
    };
  } catch (error) {
    console.error('Arbitrage scan failed:', error);
    return {
      opportunities: [],
      error: error.message,
      scannedAt: Date.now(),
    };
  }
}

/**
 * Calculate confidence score for an opportunity
 */
function calculateConfidence(netProfit, grossProfit) {
  // Higher profit = higher confidence, but diminishing returns
  let confidence = 0;

  // Base confidence from net profit
  if (netProfit >= 1) confidence = 95;
  else if (netProfit >= 0.5) confidence = 85;
  else if (netProfit >= 0.3) confidence = 75;
  else if (netProfit >= 0.2) confidence = 65;
  else confidence = 55;

  // Adjust based on spread (larger spreads may indicate stale data)
  if (grossProfit > 2) confidence -= 10; // Suspiciously high

  return Math.max(30, Math.min(99, confidence));
}

/**
 * Assess risk level for an opportunity
 */
function assessRisk(netProfit, buyExchange, sellExchange) {
  let riskScore = 0;
  const riskFactors = [];

  // Fee structure risk
  if (buyExchange.fee + sellExchange.fee > 0.003) {
    riskScore += 15;
    riskFactors.push('High combined fees');
  }

  // Exchange type risk
  if (buyExchange.type === 'DEX' || sellExchange.type === 'DEX') {
    riskScore += 20;
    riskFactors.push('DEX involved (slippage risk)');
  }

  // Small profit margin risk
  if (netProfit < 0.3) {
    riskScore += 25;
    riskFactors.push('Thin profit margin');
  }

  // Execution risk (always present)
  riskScore += 10;

  return {
    score: Math.min(100, riskScore),
    level: riskScore < 30 ? 'LOW' : riskScore < 60 ? 'MEDIUM' : 'HIGH',
    factors: riskFactors,
  };
}

/**
 * Estimate execution time for an arbitrage trade
 */
export function estimateExecutionTime(opportunity, config = DEFAULT_CONFIG) {
  const base = opportunity.pair.split('/')[0];

  // Trading execution (near instant on CEXs)
  const tradingTime = 2; // seconds

  // If same exchange, no transfer needed
  if (opportunity.buyExchange === opportunity.sellExchange) {
    return { seconds: tradingTime, type: 'internal' };
  }

  // Cross-exchange requires withdrawal
  const withdrawalTime = config.withdrawalTimes[base] || config.withdrawalTimes.default;

  return {
    seconds: tradingTime,
    minutes: withdrawalTime,
    type: 'cross-exchange',
    warning: 'Price may change during transfer',
  };
}

/**
 * Calculate real profit after all fees including network fees
 */
export function calculateRealProfit(opportunity, config = DEFAULT_CONFIG) {
  const base = opportunity.pair.split('/')[0];
  const networkFee = config.networkFees[base] || config.networkFees.default;
  const networkFeeUSD = networkFee * opportunity.buyPrice;

  const grossProfit = opportunity.estimatedProfitUSD;
  const realProfit = grossProfit - networkFeeUSD;

  return {
    grossProfit,
    networkFeeUSD,
    realProfit,
    isProfitable: realProfit > 0,
  };
}

/**
 * Bot state management
 */
export class ArbitrageBot {
  constructor(config = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.isRunning = false;
    this.scanInterval = null;
    this.opportunities = [];
    this.trades = [];
    this.stats = {
      totalScans: 0,
      opportunitiesFound: 0,
      tradesExecuted: 0,
      totalProfit: 0,
      startTime: null,
    };
    this.listeners = new Set();
  }

  // Subscribe to bot updates
  subscribe(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  // Notify all listeners
  notify() {
    const state = this.getState();
    this.listeners.forEach(cb => cb(state));
  }

  // Get current bot state
  getState() {
    return {
      isRunning: this.isRunning,
      opportunities: this.opportunities,
      trades: this.trades,
      stats: this.stats,
      config: this.config,
    };
  }

  // Start the bot
  start(intervalMs = 10000) {
    if (this.isRunning) return;

    this.isRunning = true;
    this.stats.startTime = Date.now();

    // Initial scan
    this.scan();

    // Set up interval scanning
    this.scanInterval = setInterval(() => {
      this.scan();
    }, intervalMs);

    this.notify();
    console.log('[ArbitrageBot] Started with interval:', intervalMs);
  }

  // Stop the bot
  stop() {
    if (!this.isRunning) return;

    this.isRunning = false;
    if (this.scanInterval) {
      clearInterval(this.scanInterval);
      this.scanInterval = null;
    }

    this.notify();
    console.log('[ArbitrageBot] Stopped');
  }

  // Perform a scan
  async scan() {
    if (!this.isRunning) return;

    try {
      const result = await scanArbitrageOpportunities(this.config);
      this.stats.totalScans++;
      this.stats.opportunitiesFound += result.opportunities.length;
      this.opportunities = result.opportunities;

      // Auto-execute if enabled and profitable opportunities exist
      if (this.config.autoExecute && result.opportunities.length > 0) {
        const bestOpp = result.opportunities[0];
        if (bestOpp.netProfitPercent >= this.config.minProfitPercent) {
          await this.executeTrade(bestOpp);
        }
      }

      this.notify();
    } catch (error) {
      console.error('[ArbitrageBot] Scan error:', error);
    }
  }

  // Execute a trade (simulation - real execution would require exchange API keys)
  async executeTrade(opportunity) {
    const trade = {
      id: `trade_${Date.now()}`,
      opportunity,
      status: 'simulated',
      executedAt: Date.now(),
      estimatedProfit: opportunity.estimatedProfitUSD,
    };

    this.trades.push(trade);
    this.stats.tradesExecuted++;
    this.stats.totalProfit += opportunity.estimatedProfitUSD;

    console.log('[ArbitrageBot] Trade executed:', trade);
    this.notify();

    return trade;
  }

  // Update configuration
  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    this.notify();
  }

  // Get runtime duration
  getRuntime() {
    if (!this.stats.startTime) return 0;
    return Date.now() - this.stats.startTime;
  }
}

// Singleton bot instance
let botInstance = null;

export function getArbitrageBot(config) {
  if (!botInstance) {
    botInstance = new ArbitrageBot(config);
  }
  return botInstance;
}

export const ArbitrageEngine = {
  findSimpleArbitrage,
  findTriangularArbitrage,
  scanArbitrageOpportunities,
  estimateExecutionTime,
  calculateRealProfit,
  ArbitrageBot,
  getArbitrageBot,
  DEFAULT_CONFIG,
};

export default ArbitrageEngine;
