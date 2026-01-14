/**
 * Monte Carlo Simulation Web Worker
 *
 * Runs simulations off the main thread to prevent UI blocking.
 * Supports multiple algorithms and seeded RNG for reproducibility.
 */

import { SeededRNG } from './prng';

// Types
interface MonteCarloConfig {
  simulations: number;
  tradesPerSim: number;
  startingCapital: number;
  kellyFraction: number;
  maxBetFraction: number;
  riskFreeRate: number;
  algorithm: 'bootstrap_historical' | 'student_t_parametric' | 'regime_switching';
  seed?: number;
  marketProb: number;
  modelProb: number;
  historicalReturns?: number[]; // For bootstrap algorithm
}

interface MonteCarloResult {
  expectedReturn: number;
  medianReturn: number;
  stdDeviation: number;
  sharpeRatio: number;
  sortinoRatio: number;
  var95: number;
  var99: number;
  cvar95: number;
  cvar99: number;
  maxDrawdown: number;
  avgDrawdown: number;
  probProfit: number;
  probRuin: number;
  probLoss10pct: number;
  probLoss25pct: number;
  probDouble: number;
  expectedLogGrowth: number;
  geometricMeanReturn: number;
  percentiles: {
    p5: number;
    p10: number;
    p25: number;
    p50: number;
    p75: number;
    p90: number;
    p95: number;
  };
  samplePaths: number[][];
  medianPath: number[];
  computationMs: number;
}

interface WorkerMessage {
  type: 'run' | 'cancel';
  config?: MonteCarloConfig;
}

interface WorkerResponse {
  type: 'progress' | 'result' | 'error' | 'cancelled';
  progress?: number;
  result?: MonteCarloResult;
  error?: string;
}

let cancelled = false;

/**
 * Calculate Kelly Criterion bet size
 */
function calculateKellyBet(
  modelProb: number,
  marketProb: number,
  capital: number,
  kellyFraction: number,
  maxBetFraction: number
): number {
  // Edge = modelProb - marketProb
  const edge = modelProb - marketProb;
  if (edge <= 0) return 0;

  // Odds (decimal)
  const odds = 1 / marketProb;

  // Kelly formula: f = (bp - q) / b where b = odds - 1, p = modelProb, q = 1 - modelProb
  const b = odds - 1;
  const kellyFull = (b * modelProb - (1 - modelProb)) / b;

  // Apply Kelly fraction and max bet cap
  const betFraction = Math.min(kellyFull * kellyFraction, maxBetFraction);

  return Math.max(0, betFraction * capital);
}

/**
 * Calculate maximum drawdown for a path
 */
function calculateMaxDrawdown(path: number[]): number {
  let maxSoFar = path[0];
  let maxDrawdown = 0;

  for (const value of path) {
    maxSoFar = Math.max(maxSoFar, value);
    const drawdown = (maxSoFar - value) / maxSoFar;
    maxDrawdown = Math.max(maxDrawdown, drawdown);
  }

  return maxDrawdown;
}

/**
 * Generate outcome using specified algorithm
 */
function generateOutcome(
  rng: SeededRNG,
  config: MonteCarloConfig,
  regimeState: { highVol: boolean }
): boolean {
  let effectiveProb = config.modelProb;

  switch (config.algorithm) {
    case 'bootstrap_historical':
      // Sample from historical returns if available
      if (config.historicalReturns && config.historicalReturns.length > 0) {
        const sampledReturn = config.historicalReturns[
          rng.randInt(0, config.historicalReturns.length - 1)
        ];
        // Convert return to probability adjustment
        effectiveProb = config.modelProb + sampledReturn * 0.1;
      }
      break;

    case 'student_t_parametric': {
      // Fat-tail distribution using Student's t with 5 degrees of freedom
      const tNoise = rng.randomStudentT(5) * 0.05;
      effectiveProb = config.modelProb + tNoise;
      break;
    }

    case 'regime_switching': {
      // Two-regime model: low volatility and high volatility
      // Transition probability
      if (regimeState.highVol) {
        if (rng.random() < 0.1) regimeState.highVol = false; // 10% chance to exit high vol
      } else {
        if (rng.random() < 0.05) regimeState.highVol = true; // 5% chance to enter high vol
      }

      const volatility = regimeState.highVol ? 0.15 : 0.05;
      effectiveProb = config.modelProb + rng.randomNormal(0, volatility);
      break;
    }
  }

  // Clamp probability
  effectiveProb = Math.max(0.01, Math.min(0.99, effectiveProb));

  // Bernoulli trial
  return rng.random() < effectiveProb;
}

/**
 * Run a single simulation
 */
function runSimulation(
  rng: SeededRNG,
  config: MonteCarloConfig
): { finalCapital: number; path: number[]; maxDrawdown: number } {
  let capital = config.startingCapital;
  const path: number[] = [capital];
  const regimeState = { highVol: false };

  for (let trade = 0; trade < config.tradesPerSim; trade++) {
    // Calculate bet size
    const betSize = calculateKellyBet(
      config.modelProb,
      config.marketProb,
      capital,
      config.kellyFraction,
      config.maxBetFraction
    );

    if (betSize <= 0 || capital <= 0) {
      // No edge or ruined
      path.push(capital);
      continue;
    }

    // Generate outcome
    const win = generateOutcome(rng, config, regimeState);

    // Update capital
    if (win) {
      // Win: receive payout
      const payout = betSize * (1 / config.marketProb - 1);
      capital += payout;
    } else {
      // Lose: lose bet
      capital -= betSize;
    }

    // Ensure capital doesn't go negative
    capital = Math.max(0, capital);
    path.push(capital);

    // Check for ruin
    if (capital < 1) break;
  }

  return {
    finalCapital: capital,
    path,
    maxDrawdown: calculateMaxDrawdown(path),
  };
}

/**
 * Calculate CVaR (Expected Shortfall)
 */
function calculateCVaR(sortedReturns: number[], percentile: number): number {
  const index = Math.floor(sortedReturns.length * percentile);
  const tailReturns = sortedReturns.slice(0, index);
  if (tailReturns.length === 0) return sortedReturns[0] || 0;
  return tailReturns.reduce((a, b) => a + b, 0) / tailReturns.length;
}

/**
 * Main Monte Carlo simulation function
 */
function runMonteCarlo(config: MonteCarloConfig): MonteCarloResult {
  const startTime = performance.now();
  const rng = new SeededRNG(config.seed);

  const results: number[] = [];
  const returns: number[] = [];
  const drawdowns: number[] = [];
  const samplePaths: number[][] = [];
  const pathsAtEachTrade: number[][] = [];

  // Initialize paths tracking
  for (let i = 0; i <= config.tradesPerSim; i++) {
    pathsAtEachTrade.push([]);
  }

  // Run simulations
  const reportInterval = Math.floor(config.simulations / 20); // Report 20 times

  for (let sim = 0; sim < config.simulations; sim++) {
    if (cancelled) {
      throw new Error('Cancelled');
    }

    // Report progress
    if (sim % reportInterval === 0 && sim > 0) {
      const progress = sim / config.simulations;
      self.postMessage({ type: 'progress', progress } as WorkerResponse);
    }

    const { finalCapital, path, maxDrawdown } = runSimulation(rng, config);

    results.push(finalCapital);
    returns.push((finalCapital - config.startingCapital) / config.startingCapital);
    drawdowns.push(maxDrawdown);

    // Store sample paths (first 40)
    if (sim < 40) {
      samplePaths.push(path);
    }

    // Track all paths for median calculation
    for (let i = 0; i < path.length && i <= config.tradesPerSim; i++) {
      pathsAtEachTrade[i].push(path[i]);
    }
  }

  // Sort returns for percentile calculations
  const sortedReturns = [...returns].sort((a, b) => a - b);
  const sortedResults = [...results].sort((a, b) => a - b);

  // Calculate statistics
  const n = results.length;
  const mean = returns.reduce((a, b) => a + b, 0) / n;
  const variance = returns.reduce((a, b) => a + (b - mean) ** 2, 0) / n;
  const stdDev = Math.sqrt(variance);

  // Downside deviation for Sortino ratio
  const negativeReturns = returns.filter((r) => r < 0);
  const downsideVariance =
    negativeReturns.length > 0
      ? negativeReturns.reduce((a, b) => a + b ** 2, 0) / negativeReturns.length
      : 0;
  const downsideDeviation = Math.sqrt(downsideVariance);

  // Sharpe ratio with risk-free rate
  const excessReturn = mean - config.riskFreeRate / 252; // Daily risk-free rate
  const sharpeRatio = stdDev > 0 ? excessReturn / stdDev : 0;
  const sortinoRatio = downsideDeviation > 0 ? excessReturn / downsideDeviation : 0;

  // VaR and CVaR
  const var95Index = Math.floor(n * 0.05);
  const var99Index = Math.floor(n * 0.01);

  // Calculate median path
  const medianPath: number[] = [];
  for (let i = 0; i <= config.tradesPerSim; i++) {
    if (pathsAtEachTrade[i].length > 0) {
      const sorted = pathsAtEachTrade[i].sort((a, b) => a - b);
      medianPath.push(sorted[Math.floor(sorted.length / 2)]);
    }
  }

  // Calculate percentiles for results
  const getPercentile = (p: number) => sortedResults[Math.floor(n * p)] || 0;

  const computationMs = performance.now() - startTime;

  return {
    expectedReturn: mean,
    medianReturn: sortedReturns[Math.floor(n / 2)],
    stdDeviation: stdDev,
    sharpeRatio,
    sortinoRatio,
    var95: sortedReturns[var95Index] || 0,
    var99: sortedReturns[var99Index] || 0,
    cvar95: calculateCVaR(sortedReturns, 0.05),
    cvar99: calculateCVaR(sortedReturns, 0.01),
    maxDrawdown: Math.max(...drawdowns),
    avgDrawdown: drawdowns.reduce((a, b) => a + b, 0) / n,
    probProfit: returns.filter((r) => r > 0).length / n,
    probRuin: results.filter((r) => r < 100).length / n, // Less than $100
    probLoss10pct: returns.filter((r) => r < -0.1).length / n,
    probLoss25pct: returns.filter((r) => r < -0.25).length / n,
    probDouble: results.filter((r) => r >= config.startingCapital * 2).length / n,
    expectedLogGrowth:
      returns.filter((r) => r > -1).reduce((a, r) => a + Math.log(1 + r), 0) / n,
    geometricMeanReturn: Math.exp(
      returns.filter((r) => r > -1).reduce((a, r) => a + Math.log(1 + r), 0) / n
    ) - 1,
    percentiles: {
      p5: getPercentile(0.05),
      p10: getPercentile(0.1),
      p25: getPercentile(0.25),
      p50: getPercentile(0.5),
      p75: getPercentile(0.75),
      p90: getPercentile(0.9),
      p95: getPercentile(0.95),
    },
    samplePaths,
    medianPath,
    computationMs,
  };
}

// Worker message handler
self.onmessage = (event: MessageEvent<WorkerMessage>) => {
  const { type, config } = event.data;

  if (type === 'cancel') {
    cancelled = true;
    self.postMessage({ type: 'cancelled' } as WorkerResponse);
    return;
  }

  if (type === 'run' && config) {
    cancelled = false;

    try {
      const result = runMonteCarlo(config);
      self.postMessage({ type: 'result', result } as WorkerResponse);
    } catch (error) {
      if ((error as Error).message === 'Cancelled') {
        self.postMessage({ type: 'cancelled' } as WorkerResponse);
      } else {
        self.postMessage({
          type: 'error',
          error: (error as Error).message,
        } as WorkerResponse);
      }
    }
  }
};

export {};
