import { useState, useEffect } from 'react';
import { PanelHeader } from '../PanelHeader';

// Arbitrage Opportunity Card
const ArbitrageCard = ({ opportunity, onAnalyze, compact = false }) => {
  const { polymarket, kalshi, gap, profitPct, recommendation, scores, similarity } = opportunity;

  // Confidence color
  const confColor = recommendation.confidence > 0.7 ? 'text-green-400' :
    recommendation.confidence > 0.4 ? 'text-yellow-400' : 'text-gray-400';

  // Gap color based on size
  const gapColor = gap >= 0.10 ? 'text-green-400' : gap >= 0.05 ? 'text-yellow-400' : 'text-orange-400';

  if (compact) {
    return (
      <div
        className="p-3 border-b border-gray-800 cursor-pointer hover:bg-gray-900/50 transition-colors"
        onClick={() => onAnalyze && onAnalyze(polymarket)}
      >
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <span className={`text-lg font-black ${gapColor}`}>+{(gap * 100).toFixed(1)}%</span>
            {gap >= 0.10 && <span className="text-yellow-500 text-xs">!!!</span>}
          </div>
          <span className={`text-xs ${confColor}`}>{(recommendation.confidence * 100).toFixed(0)}% conf</span>
        </div>
        <div className="text-gray-300 text-xs line-clamp-1 mb-2">{polymarket.question}</div>
        <div className="flex items-center gap-2 text-[10px]">
          <span className="text-green-400">BUY {recommendation.buyExchange} @ {(recommendation.buyPrice * 100).toFixed(1)}%</span>
          <span className="text-gray-600">→</span>
          <span className="text-red-400">SELL {recommendation.sellExchange} @ {(recommendation.sellPrice * 100).toFixed(1)}%</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 bg-gradient-to-b from-purple-900/20 to-gray-900/30 rounded-lg border border-purple-500/30 mb-3">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className={`text-2xl font-black ${gapColor}`}>
            +{(gap * 100).toFixed(1)}%
          </div>
          {gap >= 0.10 && <span className="bg-green-500/20 text-green-400 text-[10px] font-bold px-2 py-0.5 rounded border border-green-500/30">CRITICAL</span>}
          {gap >= 0.05 && gap < 0.10 && <span className="bg-yellow-500/20 text-yellow-400 text-[10px] font-bold px-2 py-0.5 rounded border border-yellow-500/30">HIGH</span>}
        </div>
        <div className="text-right">
          <div className="text-[10px] text-gray-500">Confidence</div>
          <div className={`text-lg font-bold ${confColor}`}>{(recommendation.confidence * 100).toFixed(0)}%</div>
        </div>
      </div>

      {/* Market info */}
      <div className="mb-4">
        <div className="text-white font-medium mb-1 line-clamp-2">{polymarket.question}</div>
        <div className="text-gray-500 text-xs">Match similarity: {(similarity * 100).toFixed(0)}%</div>
      </div>

      {/* Price comparison */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className={`p-3 rounded-lg border ${recommendation.buyExchange === 'Polymarket' ? 'bg-green-500/10 border-green-500/30' : 'bg-red-500/10 border-red-500/30'}`}>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-bold text-orange-400">POLYMARKET</span>
            <span className={`text-[10px] font-bold ${recommendation.buyExchange === 'Polymarket' ? 'text-green-400' : 'text-red-400'}`}>
              {recommendation.buyExchange === 'Polymarket' ? 'BUY' : 'SELL'}
            </span>
          </div>
          <div className="text-xl font-bold text-white">{(polymarket.price * 100).toFixed(1)}%</div>
          <div className="text-[10px] text-gray-500">
            Bid: {(polymarket.bestBid * 100).toFixed(1)}% • Ask: {(polymarket.bestAsk * 100).toFixed(1)}%
          </div>
        </div>

        <div className={`p-3 rounded-lg border ${recommendation.buyExchange === 'Kalshi' ? 'bg-green-500/10 border-green-500/30' : 'bg-red-500/10 border-red-500/30'}`}>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-bold text-blue-400">KALSHI</span>
            <span className={`text-[10px] font-bold ${recommendation.buyExchange === 'Kalshi' ? 'text-green-400' : 'text-red-400'}`}>
              {recommendation.buyExchange === 'Kalshi' ? 'BUY' : 'SELL'}
            </span>
          </div>
          <div className="text-xl font-bold text-white">{(kalshi.price * 100).toFixed(1)}%</div>
          <div className="text-[10px] text-gray-500">
            Bid: {(kalshi.bestBid * 100).toFixed(1)}% • Ask: {(kalshi.bestAsk * 100).toFixed(1)}%
          </div>
        </div>
      </div>

      {/* Trade recommendation */}
      <div className="p-3 bg-black/30 rounded-lg border border-gray-800 mb-3">
        <div className="text-[10px] text-gray-500 uppercase mb-2">Recommended Trade</div>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-green-400 font-medium">
            BUY on {recommendation.buyExchange} @ {(recommendation.buyPrice * 100).toFixed(1)}%
          </span>
          <span className="text-gray-600">→</span>
          <span className="text-red-400 font-medium">
            SELL on {recommendation.sellExchange} @ {(recommendation.sellPrice * 100).toFixed(1)}%
          </span>
        </div>
        <div className="mt-2 text-xs text-gray-400">
          Theoretical profit: <span className="text-green-400 font-bold">{profitPct.toFixed(2)}%</span> per contract (before fees)
        </div>
      </div>

      {/* Quality scores */}
      <div className="grid grid-cols-4 gap-2 mb-3">
        {[
          { label: 'Gap', score: scores.gapScore, color: 'purple' },
          { label: 'Liquidity', score: scores.liquidityScore, color: 'blue' },
          { label: 'Volume', score: scores.volumeScore, color: 'green' },
          { label: 'Spread', score: scores.spreadScore, color: 'orange' },
        ].map(({ label, score, color }) => (
          <div key={label} className="text-center p-2 bg-black/20 rounded border border-gray-800/30">
            <div className="text-[9px] text-gray-500 uppercase">{label}</div>
            <div className={`text-sm font-bold text-${color}-400`}>{(score * 100).toFixed(0)}%</div>
          </div>
        ))}
      </div>

      {/* Action buttons */}
      <div className="flex gap-2">
        <button
          onClick={() => onAnalyze && onAnalyze(polymarket)}
          className="flex-1 py-2 px-3 bg-orange-500/20 hover:bg-orange-500/30 text-orange-400 font-medium text-xs rounded transition-colors border border-orange-500/30"
        >
          ANALYZE POLYMARKET
        </button>
        <button
          onClick={() => onAnalyze && onAnalyze(kalshi)}
          className="flex-1 py-2 px-3 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 font-medium text-xs rounded transition-colors border border-blue-500/30"
        >
          ANALYZE KALSHI
        </button>
      </div>
    </div>
  );
};

// Main Arbitrage Panel
export const ArbitragePanel = ({
  opportunities = [],
  stats = null,
  onAnalyze,
  onRefresh,
  loading = false,
  fullPage = false,
}) => {
  const [filter, setFilter] = useState('all'); // 'all' | 'critical' | 'high'
  const [sortBy, setSortBy] = useState('gap'); // 'gap' | 'confidence' | 'liquidity'

  // Filter opportunities
  const filtered = opportunities.filter(opp => {
    if (filter === 'critical') return opp.gap >= 0.10;
    if (filter === 'high') return opp.gap >= 0.05;
    return true;
  });

  // Sort opportunities
  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === 'gap') return b.gap - a.gap;
    if (sortBy === 'confidence') return b.recommendation.confidence - a.recommendation.confidence;
    if (sortBy === 'liquidity') return b.scores.liquidityScore - a.scores.liquidityScore;
    return 0;
  });

  if (!fullPage) {
    // Compact sidebar view
    return (
      <div className="terminal-panel h-full">
        <PanelHeader
          title="ARBITRAGE"
          subtitle={opportunities.length > 0 ? `${opportunities.length} opportunities` : 'Scanning...'}
        />
        <div className="panel-content overflow-y-auto">
          {loading ? (
            <div className="p-4 text-center text-gray-500 text-xs">
              <div className="text-orange-400 mb-1">Scanning exchanges...</div>
              <div>Comparing Polymarket & Kalshi</div>
            </div>
          ) : opportunities.length === 0 ? (
            <div className="p-4 text-center">
              <div className="text-gray-500 text-xs mb-2">No arbitrage opportunities</div>
              <div className="text-gray-600 text-[10px]">Markets are efficiently priced</div>
            </div>
          ) : (
            sorted.slice(0, 5).map(opp => (
              <ArbitrageCard key={opp.id} opportunity={opp} onAnalyze={onAnalyze} compact />
            ))
          )}
        </div>
      </div>
    );
  }

  // Full page view
  return (
    <div className="terminal-panel h-full flex flex-col">
      <PanelHeader
        title="CROSS-EXCHANGE ARBITRAGE"
        subtitle="Polymarket vs Kalshi • LEET QUANTUM TERMINAL"
      />

      {/* Controls */}
      <div className="flex-shrink-0 px-4 py-2 border-b border-gray-800 bg-black/30 flex items-center justify-between">
        <div className="flex gap-2">
          {[
            { value: 'all', label: 'ALL' },
            { value: 'high', label: '5%+' },
            { value: 'critical', label: '10%+' },
          ].map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setFilter(value)}
              className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                filter === value
                  ? 'bg-purple-500 text-white'
                  : 'text-gray-500 hover:text-gray-300 hover:bg-gray-800'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-gray-500">SORT:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="text-[10px] bg-transparent text-gray-400 border border-gray-700 rounded px-2 py-1 outline-none"
            >
              <option value="gap" className="bg-gray-900">GAP SIZE</option>
              <option value="confidence" className="bg-gray-900">CONFIDENCE</option>
              <option value="liquidity" className="bg-gray-900">LIQUIDITY</option>
            </select>
          </div>

          <button
            onClick={onRefresh}
            disabled={loading}
            className={`px-3 py-1 text-[10px] font-medium rounded border border-gray-700 text-gray-400 hover:text-gray-200 hover:border-gray-600 transition-colors ${loading ? 'opacity-50' : ''}`}
          >
            {loading ? 'SCANNING...' : 'RESCAN'}
          </button>
        </div>
      </div>

      {/* Stats bar */}
      {stats && (
        <div className="flex-shrink-0 px-4 py-2 border-b border-gray-800/50 bg-purple-900/10 flex items-center justify-between text-[10px]">
          <div className="flex gap-4">
            <span className="text-gray-500">
              Total Matches: <span className="text-white font-bold">{stats.totalMatches}</span>
            </span>
            <span className="text-gray-500">
              Actionable: <span className="text-purple-400 font-bold">{stats.actionableCount}</span>
            </span>
            <span className="text-gray-500">
              Avg Gap: <span className="text-green-400 font-bold">{(stats.avgGap * 100).toFixed(2)}%</span>
            </span>
            <span className="text-gray-500">
              Max Gap: <span className="text-green-400 font-bold">{(stats.maxGap * 100).toFixed(2)}%</span>
            </span>
          </div>
          <div className="text-gray-500">
            Potential Profit: <span className="text-green-400 font-bold">+{stats.totalPotentialProfit.toFixed(1)}%</span>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 min-h-0 overflow-y-auto p-4">
        {loading ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <div className="text-purple-400 text-lg mb-2">Scanning Markets...</div>
              <div className="text-gray-500 text-xs">Comparing prices across Polymarket and Kalshi</div>
              <div className="mt-4 flex justify-center gap-1">
                {[0, 1, 2].map(i => (
                  <div
                    key={i}
                    className="w-2 h-2 bg-purple-500 rounded-full animate-pulse"
                    style={{ animationDelay: `${i * 0.2}s` }}
                  />
                ))}
              </div>
            </div>
          </div>
        ) : sorted.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <div className="text-gray-500 text-lg mb-2">No Arbitrage Opportunities</div>
              <div className="text-gray-600 text-xs mb-4">Markets are currently efficiently priced</div>
              <div className="text-[10px] text-gray-700 max-w-md">
                Arbitrage opportunities occur when the same market is priced differently across exchanges.
                The scanner checks for price discrepancies above 2%.
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {sorted.map(opp => (
              <ArbitrageCard key={opp.id} opportunity={opp} onAnalyze={onAnalyze} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ArbitragePanel;
