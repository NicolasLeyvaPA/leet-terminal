export const QuantEngine = {
  // Safe Kelly calculation with edge case handling
  _safeKelly: (modelProb, marketProb, fraction = 0.25) => {
    // Guard against edge cases that cause division issues
    if (marketProb <= 0.01 || marketProb >= 0.99) return 0;
    if (modelProb <= 0 || modelProb >= 1) return 0;
    if (modelProb <= marketProb) return 0; // No edge, no bet
    
    const odds = (1 / marketProb) - 1;
    if (odds <= 0) return 0;
    
    const kelly = (odds * modelProb - (1 - modelProb)) / odds;
    return Math.max(0, Math.min(kelly * fraction, 0.05)); // Cap at 5%
  },

  monteCarlo: (marketProb, modelProb, config = {}) => {
    const { numSims = 5000, numTrades = 100, kellyFraction = 0.25, startingCapital = 10000 } = config;
    
    // Validate inputs
    const safeMarketProb = Math.max(0.01, Math.min(0.99, marketProb || 0.5));
    const safeModelProb = Math.max(0.01, Math.min(0.99, modelProb || 0.5));
    
    const results = [];
    for (let sim = 0; sim < numSims; sim++) {
      let capital = startingCapital;
      const path = [capital];
      let wins = 0, losses = 0, maxCapital = capital, maxDrawdown = 0;
      for (let t = 0; t < numTrades && capital > 0; t++) {
        const odds = (1 / safeMarketProb) - 1;
        const kelly = QuantEngine._safeKelly(safeModelProb, safeMarketProb, kellyFraction);
        const betSize = capital * kelly;
        if (Math.random() < safeModelProb) {
          capital += betSize * odds;
          wins++;
        } else {
          capital -= betSize;
          losses++;
        }
        capital = Math.max(0, capital);
        path.push(capital);
        if (capital > maxCapital) maxCapital = capital;
        const dd = (maxCapital - capital) / (maxCapital || 1);
        if (dd > maxDrawdown) maxDrawdown = dd;
      }
      results.push({
        finalCapital: capital,
        returnPct: ((capital - startingCapital) / startingCapital) * 100,
        path,
        maxDrawdown: maxDrawdown * 100,
        winRate: (wins / (wins + losses || 1)) * 100,
      });
    }
    const returns = results.map((r) => r.returnPct).sort((a, b) => a - b);
    const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
    const variance = returns.reduce((a, r) => a + Math.pow(r - mean, 2), 0) / returns.length;
    const stdDev = Math.sqrt(variance);
    const idx = (p) => returns[Math.floor(returns.length * p)] ?? returns[0];
    const tail = (p) => {
      const n = Math.floor(returns.length * p);
      if (n <= 0) return returns[0] ?? 0;
      return returns.slice(0, n).reduce((a, b) => a + b, 0) / n;
    };
    return {
      paths: results.slice(0, 40).map((r) => r.path),
      distribution: returns,
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
        probProfit: (results.filter((r) => r.returnPct > 0).length / results.length) * 100,
        probRuin: (results.filter((r) => r.finalCapital <= 0).length / results.length) * 100,
        avgMaxDrawdown: results.reduce((a, r) => a + r.maxDrawdown, 0) / results.length,
        avgWinRate: results.reduce((a, r) => a + r.winRate, 0) / results.length,
      },
    };
  },

  kelly: (modelProb, marketProb) => {
    // Guard against edge cases
    if (!marketProb || !modelProb || marketProb <= 0.01 || marketProb >= 0.99) {
      return { full: 0, half: 0, quarter: 0, eighth: 0, optimal: 0 };
    }
    
    const safeModelProb = Math.max(0.01, Math.min(0.99, modelProb));
    const safeMarketProb = Math.max(0.01, Math.min(0.99, marketProb));
    
    const odds = (1 / safeMarketProb) - 1;
    if (odds <= 0) {
      return { full: 0, half: 0, quarter: 0, eighth: 0, optimal: 0 };
    }
    
    const full = (odds * safeModelProb - (1 - safeModelProb)) / odds;
    const safe = Math.max(0, full);
    
    return {
      full: safe,
      half: safe * 0.5,
      quarter: safe * 0.25,
      eighth: safe * 0.125,
      optimal: Math.max(0, Math.min(safe * 0.25, 0.05)), // Cap at 5%
    };
  },

  expectedValue: (modelProb, marketProb, stake = 1000) => {
    // Guard against invalid inputs
    if (!marketProb || !modelProb || marketProb <= 0 || marketProb >= 1) {
      return { ev: 0, evPct: 0, payout: 0, stake, edgePct: 0 };
    }
    
    const safeModelProb = Math.max(0.01, Math.min(0.99, modelProb));
    const safeMarketProb = Math.max(0.01, Math.min(0.99, marketProb));
    
    const payout = stake / safeMarketProb;
    const ev = safeModelProb * (payout - stake) - (1 - safeModelProb) * stake;
    const evPct = (ev / stake) * 100;
    const edgePct = (safeModelProb - safeMarketProb) * 100;
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

  quantumOptimize: (markets, capital = 10000) => {
    const iterations = 1000;
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

