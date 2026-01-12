import { useState, useMemo } from 'react';
import { PanelHeader } from '../PanelHeader';

// ============================================
// FEED PANEL - Marketplace with Recommendation Algorithm
// Shows trending bets from Polymarket + Kalshi
// ============================================

// Tooltip component
const Tip = ({ children, text }) => {
  const [show, setShow] = useState(false);
  return (
    <span
      className="relative cursor-help"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      {children}
      {show && (
        <span className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-1 w-40 p-2 bg-gray-800 border border-gray-700 rounded shadow-lg text-[10px] text-gray-300">
          {text}
        </span>
      )}
    </span>
  );
};

// Format large numbers (1000 -> 1K, 1000000 -> 1M)
const formatNumber = (num) => {
  if (!num || isNaN(num)) return '0';
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(0)}K`;
  return num.toFixed(0);
};

// Format time remaining
const formatTimeLeft = (dateStr) => {
  if (!dateStr) return 'N/A';
  const target = new Date(dateStr);
  const now = new Date();
  const diff = target - now;
  if (diff < 0) return 'Ended';
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days > 30) return `${Math.floor(days / 30)}mo`;
  if (days > 0) return `${days}d`;
  const hours = Math.floor(diff / (1000 * 60 * 60));
  if (hours > 0) return `${hours}h`;
  return '<1h';
};

// ============================================
// RECOMMENDATION ALGORITHM
// 100-point scoring based on 6 factors
// ============================================
const calculateTrendingScore = (market) => {
  // Volume score (25 points) - High trading volume = high interest
  const volumeRaw = market.volume_24h || market.volume || 0;
  const volumeScore = Math.min(volumeRaw / 100000, 1) * 25;

  // Edge score (20 points) - Model sees mispricing opportunity
  const modelProb = market.model_prob || market.market_prob || 0.5;
  const marketProb = market.market_prob || 0.5;
  const edge = Math.abs(modelProb - marketProb);
  const edgeScore = Math.min(edge * 5, 1) * 20;

  // Momentum score (20 points) - Price moving fast
  const prevProb = market.prev_prob || market.market_prob || 0.5;
  const momentum = Math.abs(marketProb - prevProb);
  const momentumScore = Math.min(momentum * 10, 1) * 20;

  // Liquidity score (15 points) - Easy to enter/exit
  const liquidity = market.liquidity || market.open_interest || 0;
  const liquidityScore = Math.min(liquidity / 500000, 1) * 15;

  // Time factor (10 points) - Near expiration gets boost
  const endDate = market.end_date ? new Date(market.end_date) : new Date(Date.now() + 30 * 86400000);
  const daysToExp = Math.max(1, (endDate - new Date()) / 86400000);
  const timeScore = Math.min(30 / daysToExp, 1) * 10;

  // Spread quality (10 points) - Tight spreads = efficient market
  const spread = market.spread || 0.02;
  const spreadScore = Math.max(0, 1 - spread * 10) * 10;

  return {
    total: Math.round(volumeScore + edgeScore + momentumScore + liquidityScore + timeScore + spreadScore),
    breakdown: { volumeScore, edgeScore, momentumScore, liquidityScore, timeScore, spreadScore }
  };
};

// ============================================
// MARKET CARD COMPONENT
// ============================================
const MarketCard = ({ market, score, onAnalyze, onWatch, compact = false }) => {
  const isPolymarket = market.platform === 'Polymarket' || !market.platform;
  const prob = (market.market_prob || 0.5) * 100;
  const prevProb = (market.prev_prob || market.market_prob || 0.5) * 100;
  const change = prob - prevProb;
  const isUp = change > 0;

  return (
    <div
      className={`bg-gray-900/60 rounded-lg border border-gray-800 hover:border-orange-500/40 transition-all cursor-pointer group ${compact ? 'p-3' : 'p-4'}`}
      onClick={() => onAnalyze(market)}
    >
      {/* Header: Platform + Score */}
      <div className="flex items-start justify-between mb-2">
        <span className={`text-[9px] px-2 py-0.5 rounded font-bold ${
          isPolymarket
            ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
            : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
        }`}>
          {isPolymarket ? 'POLYMARKET' : 'KALSHI'}
        </span>
        <Tip text={`Trending score based on volume, edge, momentum, liquidity, time, and spread`}>
          <span className="text-[10px] text-gray-500 flex items-center gap-1">
            <span className="text-orange-400">🔥</span>
            <span className="font-bold text-orange-400">{score}</span>
          </span>
        </Tip>
      </div>

      {/* Question */}
      <h3 className={`text-gray-200 font-medium leading-tight ${compact ? 'text-[11px] line-clamp-2' : 'text-sm line-clamp-2'} mb-2 group-hover:text-white transition-colors`}>
        {market.question || market.title || 'Unknown Market'}
      </h3>

      {/* Probability + Change */}
      <div className="flex items-center gap-2 mb-3">
        <span className={`${compact ? 'text-xl' : 'text-2xl'} font-bold ${prob > 50 ? 'text-green-400' : 'text-red-400'}`}>
          {prob.toFixed(0)}%
        </span>
        {Math.abs(change) > 0.1 && (
          <span className={`text-xs font-medium ${isUp ? 'text-green-400' : 'text-red-400'}`}>
            {isUp ? '↑' : '↓'} {Math.abs(change).toFixed(1)}%
          </span>
        )}
      </div>

      {/* Metrics Row */}
      <div className={`flex gap-3 ${compact ? 'text-[9px]' : 'text-[10px]'} text-gray-500 mb-3`}>
        <span>Vol: ${formatNumber(market.volume_24h || market.volume || 0)}</span>
        <span>Liq: ${formatNumber(market.liquidity || market.open_interest || 0)}</span>
        <span>{formatTimeLeft(market.end_date)}</span>
      </div>

      {/* Category Badge */}
      {market.category && (
        <span className="text-[9px] px-1.5 py-0.5 rounded bg-gray-800 text-gray-400 border border-gray-700">
          {market.category}
        </span>
      )}

      {/* Hover Actions */}
      <div className="hidden group-hover:flex gap-2 mt-3 pt-3 border-t border-gray-800">
        <button
          onClick={(e) => { e.stopPropagation(); onAnalyze(market); }}
          className="flex-1 text-[10px] py-1.5 rounded bg-orange-500/20 text-orange-400 hover:bg-orange-500/30 transition-colors font-medium"
        >
          Analyze
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onWatch(market); }}
          className="flex-1 text-[10px] py-1.5 rounded bg-gray-800 text-gray-400 hover:bg-gray-700 transition-colors font-medium"
        >
          + Watch
        </button>
      </div>
    </div>
  );
};

// ============================================
// HORIZONTAL SCROLL SECTION
// ============================================
const FeedSection = ({ title, emoji, markets, onAnalyze, onWatch, tip }) => {
  if (!markets || markets.length === 0) return null;

  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-lg">{emoji}</span>
        <Tip text={tip}>
          <h2 className="text-sm font-bold text-white">{title}</h2>
        </Tip>
        <span className="text-[10px] text-gray-500">({markets.length})</span>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-gray-700">
        {markets.map((item) => (
          <div key={item.market.id} className="flex-shrink-0 w-64">
            <MarketCard
              market={item.market}
              score={item.score}
              onAnalyze={onAnalyze}
              onWatch={onWatch}
              compact
            />
          </div>
        ))}
      </div>
    </div>
  );
};

// ============================================
// MAIN FEED PANEL COMPONENT
// ============================================
export const FeedPanel = ({ polymarkets = [], kalshiMarkets = [], onSelectMarket, onAddToWatchlist }) => {
  const [platformFilter, setPlatformFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [sortBy, setSortBy] = useState('trending');

  // Combine and score all markets
  const scoredMarkets = useMemo(() => {
    const allMarkets = [
      ...polymarkets.map(m => ({ ...m, platform: 'Polymarket' })),
      ...kalshiMarkets.map(m => ({ ...m, platform: 'Kalshi' }))
    ];

    return allMarkets.map(market => {
      const { total, breakdown } = calculateTrendingScore(market);
      return { market, score: total, breakdown };
    });
  }, [polymarkets, kalshiMarkets]);

  // Get unique categories
  const categories = useMemo(() => {
    const cats = new Set(scoredMarkets.map(m => m.market.category).filter(Boolean));
    return ['all', ...Array.from(cats).sort()];
  }, [scoredMarkets]);

  // Apply filters
  const filteredMarkets = useMemo(() => {
    let filtered = scoredMarkets;

    if (platformFilter !== 'all') {
      filtered = filtered.filter(m => m.market.platform === platformFilter);
    }

    if (categoryFilter !== 'all') {
      filtered = filtered.filter(m => m.market.category === categoryFilter);
    }

    // Sort
    switch (sortBy) {
      case 'trending':
        filtered.sort((a, b) => b.score - a.score);
        break;
      case 'volume':
        filtered.sort((a, b) => (b.market.volume_24h || 0) - (a.market.volume_24h || 0));
        break;
      case 'movement':
        filtered.sort((a, b) => {
          const moveA = Math.abs((a.market.market_prob || 0) - (a.market.prev_prob || a.market.market_prob || 0));
          const moveB = Math.abs((b.market.market_prob || 0) - (b.market.prev_prob || b.market.market_prob || 0));
          return moveB - moveA;
        });
        break;
      case 'liquidity':
        filtered.sort((a, b) => (b.market.liquidity || 0) - (a.market.liquidity || 0));
        break;
      case 'ending':
        filtered.sort((a, b) => {
          const dateA = a.market.end_date ? new Date(a.market.end_date) : new Date(9999, 0);
          const dateB = b.market.end_date ? new Date(b.market.end_date) : new Date(9999, 0);
          return dateA - dateB;
        });
        break;
      default:
        filtered.sort((a, b) => b.score - a.score);
    }

    return filtered;
  }, [scoredMarkets, platformFilter, categoryFilter, sortBy]);

  // Create specialized feeds
  const trendingNow = filteredMarkets.slice(0, 6);

  const highEdge = useMemo(() => {
    return [...scoredMarkets]
      .filter(m => {
        const edge = Math.abs((m.market.model_prob || 0.5) - (m.market.market_prob || 0.5));
        return edge > 0.03; // >3% edge
      })
      .sort((a, b) => b.breakdown.edgeScore - a.breakdown.edgeScore)
      .slice(0, 10);
  }, [scoredMarkets]);

  const fastMovers = useMemo(() => {
    return [...scoredMarkets]
      .filter(m => {
        const move = Math.abs((m.market.market_prob || 0) - (m.market.prev_prob || m.market.market_prob || 0));
        return move > 0.02; // >2% move
      })
      .sort((a, b) => b.breakdown.momentumScore - a.breakdown.momentumScore)
      .slice(0, 10);
  }, [scoredMarkets]);

  const endingSoon = useMemo(() => {
    const now = new Date();
    return [...scoredMarkets]
      .filter(m => {
        if (!m.market.end_date) return false;
        const daysLeft = (new Date(m.market.end_date) - now) / 86400000;
        return daysLeft > 0 && daysLeft < 7; // Within 7 days
      })
      .sort((a, b) => new Date(a.market.end_date) - new Date(b.market.end_date))
      .slice(0, 10);
  }, [scoredMarkets]);

  const handleAnalyze = (market) => {
    if (onSelectMarket) onSelectMarket(market);
  };

  const handleWatch = (market) => {
    if (onAddToWatchlist) onAddToWatchlist(market);
  };

  return (
    <div className="terminal-panel h-full flex flex-col">
      <PanelHeader
        title="FEED"
        subtitle="Trending Markets"
        actions={
          <div className="flex items-center gap-2 text-[10px]">
            <span className="text-orange-400">{polymarkets.length} Poly</span>
            <span className="text-gray-600">|</span>
            <span className="text-blue-400">{kalshiMarkets.length} Kalshi</span>
          </div>
        }
      />

      {/* Filters Bar */}
      <div className="flex items-center gap-3 px-3 py-2 border-b border-gray-800 bg-gray-900/30">
        {/* Platform Filter */}
        <div className="flex items-center gap-1">
          <span className="text-[9px] text-gray-500">PLATFORM:</span>
          <select
            value={platformFilter}
            onChange={(e) => setPlatformFilter(e.target.value)}
            className="text-[10px] bg-gray-800 text-gray-300 border border-gray-700 rounded px-2 py-1 outline-none focus:border-orange-500/50"
          >
            <option value="all">All</option>
            <option value="Polymarket">Polymarket</option>
            <option value="Kalshi">Kalshi</option>
          </select>
        </div>

        {/* Category Filter */}
        <div className="flex items-center gap-1">
          <span className="text-[9px] text-gray-500">CATEGORY:</span>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="text-[10px] bg-gray-800 text-gray-300 border border-gray-700 rounded px-2 py-1 outline-none focus:border-orange-500/50"
          >
            {categories.map(cat => (
              <option key={cat} value={cat}>
                {cat === 'all' ? 'All' : cat}
              </option>
            ))}
          </select>
        </div>

        {/* Sort */}
        <div className="flex items-center gap-1 ml-auto">
          <span className="text-[9px] text-gray-500">SORT:</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="text-[10px] bg-gray-800 text-gray-300 border border-gray-700 rounded px-2 py-1 outline-none focus:border-orange-500/50"
          >
            <option value="trending">🔥 Trending</option>
            <option value="volume">📊 Volume</option>
            <option value="movement">📈 Movement</option>
            <option value="liquidity">💧 Liquidity</option>
            <option value="ending">⏰ Ending Soon</option>
          </select>
        </div>
      </div>

      {/* Feed Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {scoredMarkets.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-16 h-16 rounded-full bg-gray-800/50 flex items-center justify-center mb-4">
              <span className="text-3xl">📊</span>
            </div>
            <div className="text-gray-400 text-sm mb-2">No markets loaded yet</div>
            <div className="text-gray-600 text-xs">Markets will appear once data syncs</div>
          </div>
        ) : (
          <>
            {/* Trending Now - Grid of top 6 */}
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-lg">🔥</span>
                <h2 className="text-sm font-bold text-white">TRENDING NOW</h2>
                <span className="text-[10px] text-gray-500">(Top by recommendation score)</span>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {trendingNow.map((item) => (
                  <MarketCard
                    key={item.market.id}
                    market={item.market}
                    score={item.score}
                    onAnalyze={handleAnalyze}
                    onWatch={handleWatch}
                  />
                ))}
              </div>
            </div>

            {/* High Edge Section */}
            <FeedSection
              title="HIGH EDGE"
              emoji="📈"
              tip="Markets where our model sees significant mispricing opportunity (>3% edge)"
              markets={highEdge}
              onAnalyze={handleAnalyze}
              onWatch={handleWatch}
            />

            {/* Fast Movers Section */}
            <FeedSection
              title="FAST MOVERS"
              emoji="⚡"
              tip="Markets with significant price movement in the last 24 hours (>2% change)"
              markets={fastMovers}
              onAnalyze={handleAnalyze}
              onWatch={handleWatch}
            />

            {/* Ending Soon Section */}
            <FeedSection
              title="ENDING SOON"
              emoji="⏰"
              tip="Markets expiring within the next 7 days - last chance to trade!"
              markets={endingSoon}
              onAnalyze={handleAnalyze}
              onWatch={handleWatch}
            />

            {/* All Markets Grid (if filtered) */}
            {(platformFilter !== 'all' || categoryFilter !== 'all') && (
              <div className="mt-6">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-lg">🔍</span>
                  <h2 className="text-sm font-bold text-white">FILTERED RESULTS</h2>
                  <span className="text-[10px] text-gray-500">({filteredMarkets.length} markets)</span>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {filteredMarkets.slice(0, 12).map((item) => (
                    <MarketCard
                      key={item.market.id}
                      market={item.market}
                      score={item.score}
                      onAnalyze={handleAnalyze}
                      onWatch={handleWatch}
                    />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Footer Stats */}
      <div className="px-3 py-2 border-t border-gray-800 bg-gray-900/30 flex items-center justify-between text-[10px]">
        <div className="flex items-center gap-4 text-gray-500">
          <span>Total: <span className="text-white font-medium">{scoredMarkets.length}</span> markets</span>
          <span>Filtered: <span className="text-orange-400 font-medium">{filteredMarkets.length}</span></span>
        </div>
        <div className="text-gray-600">
          Click any card to analyze
        </div>
      </div>
    </div>
  );
};

export default FeedPanel;
