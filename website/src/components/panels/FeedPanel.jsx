import { useState, useEffect, useRef, useCallback } from 'react';
import { PanelHeader } from '../PanelHeader';

// Feed Card Component - Full screen vertical scroll card
const FeedCard = ({ item, onAnalyze, isActive }) => {
  const { market, cardType, tags, totalScore, breakdown } = item;
  const { trending, closure, edge, volatility, liquidity, arbitrage } = breakdown;

  // Card background based on type
  const cardBg = {
    arbitrage: 'from-purple-900/30 to-purple-950/50 border-purple-500/40',
    closing: 'from-red-900/30 to-red-950/50 border-red-500/40',
    trending: 'from-orange-900/30 to-orange-950/50 border-orange-500/40',
    signal: 'from-green-900/30 to-green-950/50 border-green-500/40',
    standard: 'from-gray-900/30 to-gray-950/50 border-gray-700/40',
  }[cardType] || 'from-gray-900/30 to-gray-950/50 border-gray-700/40';

  // Signal color
  const signalColor = edge.signal === 'BUY' ? 'text-green-400' : edge.signal === 'SELL' ? 'text-red-400' : 'text-gray-400';
  const signalBg = edge.signal === 'BUY' ? 'bg-green-500/20 border-green-500/40' : edge.signal === 'SELL' ? 'bg-red-500/20 border-red-500/40' : 'bg-gray-500/20 border-gray-500/40';

  return (
    <div className={`feed-card h-full snap-start flex flex-col bg-gradient-to-b ${cardBg} border rounded-lg overflow-hidden transition-all duration-300 ${isActive ? 'ring-2 ring-orange-500/50' : ''}`}>
      {/* Header with tags */}
      <div className="flex-shrink-0 p-4 border-b border-gray-800/50">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-orange-500 font-bold text-lg">{market.ticker}</span>
            <span className="text-gray-500 text-xs">{market.platform}</span>
          </div>
          <div className="flex gap-1.5">
            {tags.slice(0, 3).map((tag, i) => (
              <span
                key={i}
                className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                  tag === 'HOT' || tag === 'TRENDING' ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30' :
                  tag === 'CLOSING SOON' || tag === 'THIS WEEK' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                  tag === 'ARBITRAGE' ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' :
                  tag === 'STRONG EDGE' || tag === 'EDGE' ? 'bg-green-500/20 text-green-400 border border-green-500/30' :
                  'bg-gray-500/20 text-gray-400 border border-gray-500/30'
                }`}
              >
                {tag}
              </span>
            ))}
          </div>
        </div>

        {/* Question */}
        <h3 className="text-white text-base font-medium leading-snug line-clamp-2">
          {market.question}
        </h3>
      </div>

      {/* Main content */}
      <div className="flex-1 p-4 overflow-y-auto">
        {/* Price display */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="bg-black/30 rounded-lg p-3 border border-gray-800/50">
            <div className="text-gray-500 text-[10px] uppercase mb-1">Market Price</div>
            <div className="text-2xl font-bold text-white">
              {(market.market_prob * 100).toFixed(1)}%
            </div>
            <div className={`text-xs ${volatility.trend === 'bullish' ? 'text-green-400' : volatility.trend === 'bearish' ? 'text-red-400' : 'text-gray-500'}`}>
              {volatility.priceChange24h > 0 ? '+' : ''}{(volatility.priceChange24h * 100).toFixed(2)}% 24h
            </div>
          </div>

          <div className="bg-black/30 rounded-lg p-3 border border-gray-800/50">
            <div className="text-gray-500 text-[10px] uppercase mb-1">Model Estimate</div>
            <div className="text-2xl font-bold text-orange-400">
              {(market.model_prob * 100).toFixed(1)}%
            </div>
            <div className={`text-xs ${signalColor}`}>
              Edge: {edge.edge > 0 ? '+' : ''}{(edge.edge * 100).toFixed(2)}%
            </div>
          </div>
        </div>

        {/* Signal */}
        <div className={`mb-4 p-3 rounded-lg border ${signalBg}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className={`text-lg font-black ${signalColor}`}>{edge.signal}</span>
              {edge.isVeryStrong && <span className="text-yellow-500">!!!</span>}
              {edge.isStrong && !edge.isVeryStrong && <span className="text-yellow-500">!</span>}
            </div>
            <div className="text-right">
              <div className="text-xs text-gray-500">Confidence</div>
              <div className="text-sm font-medium text-white">{(totalScore * 100).toFixed(0)}%</div>
            </div>
          </div>
        </div>

        {/* Arbitrage opportunity */}
        {arbitrage && arbitrage.score > 0.1 && (
          <div className="mb-4 p-3 rounded-lg bg-purple-500/10 border border-purple-500/30">
            <div className="flex items-center justify-between mb-2">
              <span className="text-purple-400 font-bold text-sm">ARBITRAGE OPPORTUNITY</span>
              <span className="text-purple-300 text-lg font-bold">+{(arbitrage.gap * 100).toFixed(1)}%</span>
            </div>
            <div className="text-xs text-gray-400">
              Buy on <span className="text-green-400">{arbitrage.buyExchange}</span> @ {(arbitrage.buyPrice * 100).toFixed(1)}%
              {' → '}
              Sell on <span className="text-red-400">{arbitrage.sellExchange}</span> @ {(arbitrage.sellPrice * 100).toFixed(1)}%
            </div>
          </div>
        )}

        {/* Stats grid */}
        <div className="grid grid-cols-4 gap-2 mb-4">
          <div className="text-center p-2 bg-black/20 rounded border border-gray-800/30">
            <div className="text-[10px] text-gray-500 uppercase">Volume 24h</div>
            <div className="text-sm font-medium text-white">${(market.volume_24h / 1000).toFixed(0)}K</div>
          </div>
          <div className="text-center p-2 bg-black/20 rounded border border-gray-800/30">
            <div className="text-[10px] text-gray-500 uppercase">Liquidity</div>
            <div className="text-sm font-medium text-white">${(market.liquidity / 1000).toFixed(0)}K</div>
          </div>
          <div className="text-center p-2 bg-black/20 rounded border border-gray-800/30">
            <div className="text-[10px] text-gray-500 uppercase">Spread</div>
            <div className="text-sm font-medium text-white">{((market.spread || 0) * 100).toFixed(1)}%</div>
          </div>
          <div className="text-center p-2 bg-black/20 rounded border border-gray-800/30">
            <div className="text-[10px] text-gray-500 uppercase">Trades</div>
            <div className="text-sm font-medium text-white">{market.trades_24h || 0}</div>
          </div>
        </div>

        {/* Time remaining */}
        {closure.urgency !== 'unknown' && (
          <div className={`mb-4 p-2 rounded-lg text-center ${
            closure.urgency === 'critical' ? 'bg-red-500/20 border border-red-500/30' :
            closure.urgency === 'urgent' ? 'bg-yellow-500/20 border border-yellow-500/30' :
            'bg-gray-500/10 border border-gray-700/30'
          }`}>
            <div className="text-[10px] text-gray-500 uppercase">Time Remaining</div>
            <div className={`text-lg font-bold ${
              closure.urgency === 'critical' ? 'text-red-400' :
              closure.urgency === 'urgent' ? 'text-yellow-400' :
              'text-gray-300'
            }`}>
              {closure.daysRemaining !== null ? (
                closure.daysRemaining < 1 ? `${closure.hoursRemaining}h` :
                closure.daysRemaining < 7 ? `${closure.daysRemaining}d ${closure.hoursRemaining % 24}h` :
                `${closure.daysRemaining} days`
              ) : 'No end date'}
            </div>
          </div>
        )}

        {/* Score breakdown */}
        <div className="space-y-2">
          <div className="text-[10px] text-gray-500 uppercase mb-1">Feed Score Breakdown</div>
          {[
            { label: 'Trending', score: trending.score, color: 'orange' },
            { label: 'Closing Soon', score: closure.score, color: 'red' },
            { label: 'Edge', score: edge.score, color: 'green' },
            { label: 'Volatility', score: volatility.score, color: 'yellow' },
            { label: 'Liquidity', score: liquidity.score, color: 'blue' },
          ].map(({ label, score, color }) => (
            <div key={label} className="flex items-center gap-2">
              <span className="text-[10px] text-gray-500 w-20">{label}</span>
              <div className="flex-1 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full bg-${color}-500`}
                  style={{ width: `${score * 100}%` }}
                />
              </div>
              <span className="text-[10px] text-gray-400 w-8 text-right">{(score * 100).toFixed(0)}%</span>
            </div>
          ))}
        </div>
      </div>

      {/* Footer with actions */}
      <div className="flex-shrink-0 p-4 border-t border-gray-800/50 bg-black/30">
        <div className="flex gap-2">
          <button
            onClick={() => onAnalyze && onAnalyze(market)}
            className="flex-1 py-2.5 px-4 bg-orange-500 hover:bg-orange-600 text-black font-bold text-sm rounded transition-colors"
          >
            ANALYZE
          </button>
          <button className="py-2.5 px-4 bg-gray-800 hover:bg-gray-700 text-gray-300 font-medium text-sm rounded transition-colors border border-gray-700">
            WATCHLIST
          </button>
        </div>
      </div>
    </div>
  );
};

// Mini card for horizontal scroll sections
const MiniCard = ({ item, onAnalyze, onSelect }) => {
  const { market, cardType, tags, totalScore, breakdown } = item;
  const { edge } = breakdown;

  const cardBorder = {
    arbitrage: 'border-purple-500/40 hover:border-purple-400',
    closing: 'border-red-500/40 hover:border-red-400',
    trending: 'border-orange-500/40 hover:border-orange-400',
    signal: 'border-green-500/40 hover:border-green-400',
    standard: 'border-gray-700/40 hover:border-gray-600',
  }[cardType];

  return (
    <div
      className={`flex-shrink-0 w-64 p-3 bg-gray-900/50 rounded-lg border ${cardBorder} cursor-pointer transition-all hover:bg-gray-800/50`}
      onClick={() => onSelect && onSelect(item)}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-orange-500 font-bold text-sm">{market.ticker}</span>
        {tags[0] && (
          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-orange-500/20 text-orange-400">
            {tags[0]}
          </span>
        )}
      </div>
      <div className="text-white text-xs line-clamp-2 mb-2 h-8">
        {market.question}
      </div>
      <div className="flex items-center justify-between">
        <span className="text-lg font-bold text-white">{(market.market_prob * 100).toFixed(0)}%</span>
        <span className={`text-sm font-medium ${edge.signal === 'BUY' ? 'text-green-400' : edge.signal === 'SELL' ? 'text-red-400' : 'text-gray-500'}`}>
          {edge.signal}
        </span>
      </div>
    </div>
  );
};

// Horizontal scroll section
const FeedSection = ({ title, items, onAnalyze, onSelect }) => {
  if (!items || items.length === 0) return null;

  return (
    <div className="mb-4">
      <div className="flex items-center justify-between mb-2 px-2">
        <span className="text-gray-400 text-xs font-bold uppercase">{title}</span>
        <span className="text-gray-600 text-xs">{items.length} markets</span>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-2 px-2 scrollbar-thin scrollbar-thumb-gray-700">
        {items.map(item => (
          <MiniCard key={item.id} item={item} onAnalyze={onAnalyze} onSelect={onSelect} />
        ))}
      </div>
    </div>
  );
};

// Main Feed Panel Component
export const FeedPanel = ({
  feedItems = [],
  sections = null,
  stats = null,
  onAnalyze,
  onRefresh,
  loading = false,
  fullPage = false,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [viewMode, setViewMode] = useState('scroll'); // 'scroll' | 'sections' | 'grid'
  const scrollContainerRef = useRef(null);
  const [selectedItem, setSelectedItem] = useState(null);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (viewMode !== 'scroll') return;

      if (e.key === 'ArrowDown' || e.key === 'j') {
        e.preventDefault();
        setCurrentIndex(prev => Math.min(prev + 1, feedItems.length - 1));
      } else if (e.key === 'ArrowUp' || e.key === 'k') {
        e.preventDefault();
        setCurrentIndex(prev => Math.max(prev - 1, 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (feedItems[currentIndex]) {
          onAnalyze && onAnalyze(feedItems[currentIndex].market);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [viewMode, currentIndex, feedItems, onAnalyze]);

  // Scroll to current card
  useEffect(() => {
    if (viewMode === 'scroll' && scrollContainerRef.current) {
      const cards = scrollContainerRef.current.querySelectorAll('.feed-card');
      if (cards[currentIndex]) {
        cards[currentIndex].scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  }, [currentIndex, viewMode]);

  // Handle scroll snap
  const handleScroll = useCallback(() => {
    if (!scrollContainerRef.current || viewMode !== 'scroll') return;

    const container = scrollContainerRef.current;
    const scrollTop = container.scrollTop;
    const cardHeight = container.clientHeight;
    const newIndex = Math.round(scrollTop / cardHeight);

    if (newIndex !== currentIndex && newIndex >= 0 && newIndex < feedItems.length) {
      setCurrentIndex(newIndex);
    }
  }, [currentIndex, feedItems.length, viewMode]);

  // Handle section item selection
  const handleSelectItem = (item) => {
    setSelectedItem(item);
    setViewMode('scroll');
    const index = feedItems.findIndex(f => f.id === item.id);
    if (index >= 0) setCurrentIndex(index);
  };

  if (!fullPage) {
    // Compact sidebar view
    return (
      <div className="terminal-panel h-full">
        <PanelHeader title="FEED" subtitle={`${feedItems.length} markets`} />
        <div className="panel-content overflow-y-auto">
          {feedItems.slice(0, 10).map((item, i) => (
            <div
              key={item.id}
              className="p-2 border-b border-gray-800 cursor-pointer hover:bg-gray-900/50"
              onClick={() => onAnalyze && onAnalyze(item.market)}
            >
              <div className="flex items-center justify-between">
                <span className="text-orange-500 font-bold text-xs">{item.market.ticker}</span>
                <span className="text-[10px] text-gray-500">{(item.totalScore * 100).toFixed(0)}</span>
              </div>
              <div className="text-gray-300 text-xs line-clamp-1">{item.market.question}</div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Full page feed view
  return (
    <div className="terminal-panel h-full flex flex-col">
      <PanelHeader
        title="MARKET FEED"
        subtitle={`${feedItems.length} markets • LEET QUANTUM TERMINAL`}
      />

      {/* View mode tabs and controls */}
      <div className="flex-shrink-0 px-4 py-2 border-b border-gray-800 bg-black/30 flex items-center justify-between">
        <div className="flex gap-1">
          {[
            { mode: 'scroll', label: 'SCROLL', icon: '↕' },
            { mode: 'sections', label: 'SECTIONS', icon: '☰' },
            { mode: 'grid', label: 'GRID', icon: '⊞' },
          ].map(({ mode, label, icon }) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                viewMode === mode
                  ? 'bg-orange-500 text-black'
                  : 'text-gray-500 hover:text-gray-300 hover:bg-gray-800'
              }`}
            >
              {icon} {label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-4">
          {stats && (
            <div className="flex gap-3 text-[10px]">
              <span className="text-gray-500">
                Arbitrage: <span className="text-purple-400 font-bold">{stats.arbitrage}</span>
              </span>
              <span className="text-gray-500">
                Closing: <span className="text-red-400 font-bold">{stats.closing}</span>
              </span>
              <span className="text-gray-500">
                Trending: <span className="text-orange-400 font-bold">{stats.trending}</span>
              </span>
            </div>
          )}
          <button
            onClick={onRefresh}
            disabled={loading}
            className={`px-2 py-1 text-[10px] font-medium rounded border border-gray-700 text-gray-400 hover:text-gray-200 hover:border-gray-600 transition-colors ${loading ? 'opacity-50' : ''}`}
          >
            {loading ? '...' : 'REFRESH'}
          </button>
        </div>
      </div>

      {/* Navigation indicator for scroll mode */}
      {viewMode === 'scroll' && feedItems.length > 0 && (
        <div className="flex-shrink-0 px-4 py-1 bg-black/50 flex items-center justify-between text-[10px]">
          <span className="text-gray-500">
            Use ↑↓ or scroll • Enter to analyze
          </span>
          <span className="text-gray-500">
            {currentIndex + 1} / {feedItems.length}
          </span>
        </div>
      )}

      {/* Main content area */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {loading ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <div className="text-orange-500 text-lg mb-2">Loading Feed...</div>
              <div className="text-gray-500 text-xs">Analyzing markets and opportunities</div>
            </div>
          </div>
        ) : feedItems.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <div className="text-gray-500 text-lg mb-2">No Markets Found</div>
              <div className="text-gray-600 text-xs">Check your connection or filters</div>
            </div>
          </div>
        ) : viewMode === 'scroll' ? (
          /* Vertical scroll view */
          <div
            ref={scrollContainerRef}
            className="h-full overflow-y-auto snap-y snap-mandatory scroll-smooth"
            onScroll={handleScroll}
          >
            {feedItems.map((item, index) => (
              <div key={item.id} className="h-full p-2 snap-start">
                <FeedCard
                  item={item}
                  onAnalyze={onAnalyze}
                  isActive={index === currentIndex}
                />
              </div>
            ))}
          </div>
        ) : viewMode === 'sections' ? (
          /* Sections view */
          <div className="h-full overflow-y-auto p-2">
            {sections && (
              <>
                <FeedSection
                  title="Featured Markets"
                  items={sections.featured}
                  onAnalyze={onAnalyze}
                  onSelect={handleSelectItem}
                />
                <FeedSection
                  title="Arbitrage Opportunities"
                  items={sections.arbitrage}
                  onAnalyze={onAnalyze}
                  onSelect={handleSelectItem}
                />
                <FeedSection
                  title="Closing Soon"
                  items={sections.closingSoon}
                  onAnalyze={onAnalyze}
                  onSelect={handleSelectItem}
                />
                <FeedSection
                  title="Trending Now"
                  items={sections.trending}
                  onAnalyze={onAnalyze}
                  onSelect={handleSelectItem}
                />
                <FeedSection
                  title="Strong Signals"
                  items={sections.strongSignals}
                  onAnalyze={onAnalyze}
                  onSelect={handleSelectItem}
                />
              </>
            )}
          </div>
        ) : (
          /* Grid view */
          <div className="h-full overflow-y-auto p-2">
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
              {feedItems.map(item => (
                <MiniCard
                  key={item.id}
                  item={item}
                  onAnalyze={onAnalyze}
                  onSelect={handleSelectItem}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FeedPanel;
