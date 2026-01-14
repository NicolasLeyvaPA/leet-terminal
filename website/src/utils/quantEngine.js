export const QuantEngine = {
  // Memory-optimized Monte Carlo: 500 sims (was 5000), 50 trades (was 100), 10 paths (was 40)
  monteCarlo: (marketProb, modelProb, config = {}) => {
    const { numSims = 500, numTrades = 50, kellyFraction = 0.25, startingCapital = 10000 } = config;

    // Only store paths for visualization (first 10 sims)
    const pathsToStore = 10;
    const storedPaths = [];

    // Stats accumulators - no need to store all results
    let sumReturns = 0, sumSquaredReturns = 0;
    let sumMaxDrawdown = 0, sumWinRate = 0;
    let profitCount = 0, ruinCount = 0;
    const returns = [];

    for (let sim = 0; sim < numSims; sim++) {
      let capital = startingCapital;
      const storePath = sim < pathsToStore;
      const path = storePath ? [capital] : null;
      let wins = 0, losses = 0, maxCapital = capital, maxDrawdown = 0;

      for (let t = 0; t < numTrades && capital > 0; t++) {
        const odds = 1 / marketProb - 1;
        const kelly = Math.max(0, (odds * modelProb - (1 - modelProb)) / (odds || 1)) * kellyFraction;
        const betSize = capital * Math.min(kelly, 0.05);
        if (Math.random() < modelProb) {
          capital += betSize * odds;
          wins++;
        } else {
          capital -= betSize;
          losses++;
        }
        capital = Math.max(0, capital);
        if (storePath) path.push(capital);
        if (capital > maxCapital) maxCapital = capital;
        const dd = (maxCapital - capital) / (maxCapital || 1);
        if (dd > maxDrawdown) maxDrawdown = dd;
      }

      const returnPct = ((capital - startingCapital) / startingCapital) * 100;
      const winRate = (wins / (wins + losses || 1)) * 100;
      const drawdownPct = maxDrawdown * 100;

      // Accumulate stats
      returns.push(returnPct);
      sumReturns += returnPct;
      sumSquaredReturns += returnPct * returnPct;
      sumMaxDrawdown += drawdownPct;
      sumWinRate += winRate;
      if (returnPct > 0) profitCount++;
      if (capital <= 0) ruinCount++;

      if (storePath) storedPaths.push(path);
    }

    // Calculate stats from accumulators
    returns.sort((a, b) => a - b);
    const mean = sumReturns / numSims;
    const variance = (sumSquaredReturns / numSims) - (mean * mean);
    const stdDev = Math.sqrt(Math.max(0, variance));
    const idx = (p) => returns[Math.floor(returns.length * p)] ?? returns[0];
    const tail = (p) => {
      const n = Math.floor(returns.length * p);
      if (n <= 0) return returns[0] ?? 0;
      return returns.slice(0, n).reduce((a, b) => a + b, 0) / n;
    };

    return {
      paths: storedPaths,
      stats: {
        expectedReturn: mean,
        medianReturn: idx(0.5),
        stdDev,
        sharpeRatio: stdDev ? mean / stdDev : 0,
        var95: idx(0.05),
        var99: idx(0.01),
        cvar95: tail(0.05),
        percentile5: idx(0.05),
        percentile25: idx(0.25),
        percentile75: idx(0.75),
        percentile95: idx(0.95),
        probProfit: (profitCount / numSims) * 100,
        probRuin: (ruinCount / numSims) * 100,
        avgMaxDrawdown: sumMaxDrawdown / numSims,
        avgWinRate: sumWinRate / numSims,
      },
    };
  },

  kelly: (modelProb, marketProb) => {
    const odds = 1 / marketProb - 1;
    const full = (odds * modelProb - (1 - modelProb)) / (odds || 1);
    const safe = Math.max(0, full);
    return {
      full: safe,
      half: safe * 0.5,
      quarter: safe * 0.25,
      eighth: safe * 0.125,
      optimal: Math.max(0, Math.min(safe * 0.25, 0.05)),
    };
  },

  expectedValue: (modelProb, marketProb, stake = 1000) => {
    const payout = stake / marketProb;
    const ev = modelProb * (payout - stake) - (1 - modelProb) * stake;
    const evPct = (ev / stake) * 100;
    const edgePct = (modelProb - marketProb) * 100;
    return { ev, evPct, payout, stake, edgePct };
  },

  calculateConfluence: (factors) => {
    const weights = {
      orderbook_imbalance: 0.12,
      price_momentum: 0.1,
      volume_trend: 0.08,
      news_sentiment: 0.15,
      social_sentiment: 0.08,
      smart_money: 0.12,
      historical_pattern: 0.08,
      time_decay: 0.05,
      liquidity_score: 0.07,
      model_confidence: 0.15,
    };
    let totalScore = 0;
    let bullishCount = 0, bearishCount = 0;
    Object.entries(factors).forEach(([key, factor]) => {
      const w = weights[key] ?? 0.1;
      totalScore += factor.value * w;
      if (factor.direction === "bullish") bullishCount++;
      else if (factor.direction === "bearish") bearishCount++;
    });
    return {
      score: totalScore,
      bullishFactors: bullishCount,
      bearishFactors: bearishCount,
      agreement: Math.max(bullishCount, bearishCount) / (bullishCount + bearishCount || 1),
    };
  },

  // Reduced iterations from 1000 to 200 for memory savings
  quantumOptimize: (markets, capital = 10000) => {
    const iterations = 200;
    let bestAllocation = {};
    let bestScore = -Infinity;
    for (let i = 0; i < iterations; i++) {
      const allocation = {};
      let remaining = 1.0;
      markets.forEach((m, idx) => {
        if (idx === markets.length - 1) {
          allocation[m.ticker] = remaining;
        } else {
          const kelly = QuantEngine.kelly(m.model_prob, m.market_prob).quarter;
          const noise = (Math.random() - 0.5) * 0.1;
          const alloc = Math.max(0, Math.min(remaining, kelly + noise));
          allocation[m.ticker] = alloc;
          remaining -= alloc;
        }
      });
      let score = 0;
      markets.forEach((m) => {
        const edge = m.model_prob - m.market_prob;
        score += (allocation[m.ticker] || 0) * edge * 100;
      });
      if (score > bestScore) {
        bestScore = score;
        bestAllocation = { ...allocation };
      }
    }
    return { allocation: bestAllocation, score: bestScore };
  },
};

