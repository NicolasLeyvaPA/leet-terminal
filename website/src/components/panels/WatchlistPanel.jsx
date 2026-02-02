import { useState, useEffect, useMemo } from 'react';
import { PanelHeader } from '../PanelHeader';
import { Tag } from '../Tag';
import { useWatchlist } from '../../utils/useWatchlist';

// Storage key for expanded categories
const EXPANDED_CATEGORIES_KEY = 'leet-terminal-expanded-categories';

// Category display config with explicit Tailwind classes (required for JIT)
const CATEGORY_CONFIG = {
  'Politics': {
    border: 'border-blue-500/60',
    borderLight: 'border-blue-500/20',
    bg: 'bg-blue-500/10',
    text: 'text-blue-400',
  },
  'Crypto': {
    border: 'border-yellow-500/60',
    borderLight: 'border-yellow-500/20',
    bg: 'bg-yellow-500/10',
    text: 'text-yellow-400',
  },
  'Sports': {
    border: 'border-green-500/60',
    borderLight: 'border-green-500/20',
    bg: 'bg-green-500/10',
    text: 'text-green-400',
  },
  'Entertainment': {
    border: 'border-purple-500/60',
    borderLight: 'border-purple-500/20',
    bg: 'bg-purple-500/10',
    text: 'text-purple-400',
  },
  'Science': {
    border: 'border-cyan-500/60',
    borderLight: 'border-cyan-500/20',
    bg: 'bg-cyan-500/10',
    text: 'text-cyan-400',
  },
  'Economics': {
    border: 'border-red-500/60',
    borderLight: 'border-red-500/20',
    bg: 'bg-red-500/10',
    text: 'text-red-400',
  },
  'Tech': {
    border: 'border-indigo-500/60',
    borderLight: 'border-indigo-500/20',
    bg: 'bg-indigo-500/10',
    text: 'text-indigo-400',
  },
  'Pop Culture': {
    border: 'border-pink-500/60',
    borderLight: 'border-pink-500/20',
    bg: 'bg-pink-500/10',
    text: 'text-pink-400',
  },
  'Other': {
    border: 'border-gray-500/60',
    borderLight: 'border-gray-500/20',
    bg: 'bg-gray-500/10',
    text: 'text-gray-400',
  },
};

const DEFAULT_CATEGORY_CONFIG = CATEGORY_CONFIG['Other'];

// Load expanded state from localStorage
const loadExpandedState = () => {
  try {
    const saved = localStorage.getItem(EXPANDED_CATEGORIES_KEY);
    return saved ? JSON.parse(saved) : {};
  } catch {
    return {};
  }
};

// Save expanded state to localStorage
const saveExpandedState = (state) => {
  try {
    localStorage.setItem(EXPANDED_CATEGORIES_KEY, JSON.stringify(state));
  } catch {
    // Ignore storage errors
  }
};

export const WatchlistPanel = ({ markets, groupedMarkets, selectedId, onSelect, categoryFilter }) => {
  const { watchlist, removeFromWatchlist } = useWatchlist();
  const [expandedCategories, setExpandedCategories] = useState(loadExpandedState);

  // Save to localStorage when expanded state changes
  useEffect(() => {
    saveExpandedState(expandedCategories);
  }, [expandedCategories]);

  // Toggle category expansion
  const toggleCategory = (category) => {
    setExpandedCategories(prev => ({
      ...prev,
      [category]: !prev[category]
    }));
  };

  // Expand/collapse all
  const expandAll = () => {
    if (!groupedMarkets) return;
    const allExpanded = {};
    Object.keys(groupedMarkets).forEach(cat => {
      allExpanded[cat] = true;
    });
    setExpandedCategories(allExpanded);
  };

  const collapseAll = () => {
    setExpandedCategories({});
  };

  // Calculate stats for a category
  const getCategoryStats = (categoryMarkets) => {
    const signals = categoryMarkets.filter(m =>
      Math.abs((m.model_prob || 0) - (m.market_prob || 0)) > 0.03
    ).length;
    const totalLiquidity = categoryMarkets.reduce((sum, m) => sum + (m.liquidity || 0), 0);
    const topMarket = categoryMarkets[0]; // Already sorted by edge
    return { signals, totalLiquidity, topMarket };
  };

  if (!markets || markets.length === 0) {
    return (
      <div className="terminal-panel h-full">
        <PanelHeader title="MARKETS" subtitle="Loading..." />
        <div className="panel-content flex items-center justify-center h-full">
          <div className="text-center text-gray-600 text-xs p-4">
            <div className="text-orange-500 mb-2">LOADING MARKETS</div>
            <div className="text-[10px]">Connecting to Polymarket API...</div>
          </div>
        </div>
      </div>
    );
  }

  // Render a single market item - compact version
  const MarketItem = ({ m, isFirst }) => {
    const marketProb = m.market_prob || 0;
    const modelProb = m.model_prob || marketProb;
    const prevProb = m.prev_prob || marketProb;
    const edge = modelProb - marketProb;
    const change = marketProb - prevProb;
    const signal = edge > 0.03 ? 'BUY' : edge < -0.03 ? 'SELL' : 'HOLD';
    const isInUserWatchlist = watchlist.some((w) => w.id === m.id || w.ticker === m.ticker);

    return (
      <div
        onClick={() => onSelect(m)}
        className={`px-3 py-2 cursor-pointer transition-all border-b border-gray-800/50 ${
          selectedId === m.id
            ? "bg-orange-500/15 border-l-2 border-l-orange-500"
            : "hover:bg-gray-800/50 border-l-2 border-l-transparent"
        } ${isFirst ? '' : ''}`}
      >
        {/* Main row: Ticker, Price, Edge */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <span className="text-[11px] font-bold text-orange-500 mono truncate max-w-[140px]">
              {m.ticker || 'MKT'}
            </span>
            <Tag type={signal === 'BUY' ? 'buy' : signal === 'SELL' ? 'sell' : 'hold'} small>
              {signal}
            </Tag>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <span className="text-sm text-white font-semibold mono">
              {(marketProb * 100).toFixed(1)}¢
            </span>
            <span
              className={`text-[10px] mono w-12 text-right ${
                edge > 0.02 ? "text-green-400" : edge < -0.02 ? "text-red-400" : "text-gray-500"
              }`}
            >
              {edge > 0 ? "+" : ""}{(edge * 100).toFixed(1)}%
            </span>
          </div>
        </div>

        {/* Question preview */}
        <div className="text-[10px] text-gray-500 mt-1 line-clamp-1 pr-4">
          {m.question}
        </div>

        {/* Bottom row: Liquidity, Change, Actions */}
        <div className="flex items-center justify-between mt-1.5 text-[9px]">
          <span className="text-gray-600">
            Liq: ${((m.liquidity || 0) / 1000).toFixed(1)}k
          </span>
          <div className="flex items-center gap-2">
            <span
              className={change > 0 ? "text-green-400" : change < 0 ? "text-red-400" : "text-gray-600"}
            >
              {change > 0 ? "▲" : change < 0 ? "▼" : "–"} {Math.abs(change * 100).toFixed(1)}%
            </span>
            {isInUserWatchlist && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  removeFromWatchlist(m.id);
                }}
                className="text-gray-600 hover:text-red-400 px-1"
                title="Remove from watchlist"
              >
                ✕
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Category section component
  const CategorySection = ({ category, categoryMarkets }) => {
    const isExpanded = expandedCategories[category] || false;
    const config = CATEGORY_CONFIG[category] || DEFAULT_CATEGORY_CONFIG;
    const { signals, totalLiquidity, topMarket } = getCategoryStats(categoryMarkets);

    return (
      <div className="mb-1">
        {/* Category Header - Always visible, clickable */}
        <button
          onClick={() => toggleCategory(category)}
          className={`w-full px-3 py-2 flex items-center justify-between transition-all border-l-2 ${config.border} ${isExpanded ? config.bg : 'bg-gray-900/30 hover:bg-gray-800/50'}`}
        >
          <div className="flex items-center gap-2">
            {/* Expand/Collapse indicator */}
            <span className={`text-[10px] ${config.text} transition-transform ${isExpanded ? 'rotate-90' : ''}`}>
              ▶
            </span>
            {/* Category name */}
            <span className={`text-[11px] font-bold ${config.text} uppercase tracking-wide`}>
              {category}
            </span>
            {/* Count badge */}
            <span className="text-[9px] text-gray-500 bg-gray-800 px-1.5 py-0.5 rounded">
              {categoryMarkets.length}
            </span>
          </div>

          {/* Right side stats */}
          <div className="flex items-center gap-3 text-[9px]">
            {signals > 0 && (
              <span className="text-green-400 font-medium">
                {signals} {signals === 1 ? 'signal' : 'signals'}
              </span>
            )}
            <span className="text-gray-500">
              ${(totalLiquidity / 1000).toFixed(0)}k
            </span>
          </div>
        </button>

        {/* Collapsed preview - show top market */}
        {!isExpanded && topMarket && (
          <div
            onClick={() => onSelect(topMarket)}
            className="px-3 py-1.5 bg-gray-900/20 border-l-2 border-gray-700 cursor-pointer hover:bg-gray-800/30 flex items-center justify-between"
          >
            <span className="text-[10px] text-gray-400 truncate max-w-[60%]">
              Top: {topMarket.ticker}
            </span>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-white mono">
                {((topMarket.market_prob || 0) * 100).toFixed(1)}¢
              </span>
              {(() => {
                const edge = (topMarket.model_prob || 0) - (topMarket.market_prob || 0);
                return (
                  <span className={`text-[9px] mono ${edge > 0.02 ? 'text-green-400' : edge < -0.02 ? 'text-red-400' : 'text-gray-500'}`}>
                    {edge > 0 ? '+' : ''}{(edge * 100).toFixed(1)}%
                  </span>
                );
              })()}
            </div>
          </div>
        )}

        {/* Expanded market list */}
        {isExpanded && (
          <div className={`border-l-2 ${config.borderLight}`}>
            {categoryMarkets.map((m, idx) => (
              <MarketItem key={m.id} m={m} isFirst={idx === 0} />
            ))}
          </div>
        )}
      </div>
    );
  };

  // If showing all categories, render grouped view
  if (categoryFilter === 'all' && groupedMarkets && Object.keys(groupedMarkets).length > 0) {
    const sortedCategories = Object.keys(groupedMarkets).sort((a, b) => {
      // Sort by number of markets with signals, then by total markets
      const aSignals = groupedMarkets[a].filter(m => Math.abs((m.model_prob || 0) - (m.market_prob || 0)) > 0.03).length;
      const bSignals = groupedMarkets[b].filter(m => Math.abs((m.model_prob || 0) - (m.market_prob || 0)) > 0.03).length;
      if (bSignals !== aSignals) return bSignals - aSignals;
      return groupedMarkets[b].length - groupedMarkets[a].length;
    });

    const expandedCount = Object.values(expandedCategories).filter(Boolean).length;
    const totalCategories = sortedCategories.length;

    return (
      <div className="terminal-panel h-full flex flex-col">
        <PanelHeader title="MARKETS" subtitle={`${markets.length} events`} />

        {/* Controls bar */}
        <div className="px-3 py-1.5 border-b border-gray-800 flex items-center justify-between bg-gray-900/50">
          <span className="text-[9px] text-gray-500">
            {totalCategories} categories
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={expandAll}
              className="text-[9px] text-gray-500 hover:text-orange-400 transition-colors"
              title="Expand all"
            >
              [+all]
            </button>
            <button
              onClick={collapseAll}
              className="text-[9px] text-gray-500 hover:text-orange-400 transition-colors"
              title="Collapse all"
            >
              [-all]
            </button>
          </div>
        </div>

        {/* Categories list */}
        <div className="panel-content flex-1 overflow-y-auto">
          {sortedCategories.map(category => (
            <CategorySection
              key={category}
              category={category}
              categoryMarkets={groupedMarkets[category]}
            />
          ))}
        </div>
      </div>
    );
  }

  // Flat view when filtering by specific category
  return (
    <div className="terminal-panel h-full flex flex-col">
      <PanelHeader
        title="MARKETS"
        subtitle={`${markets.length} ${categoryFilter !== 'all' ? categoryFilter : 'events'}`}
      />
      <div className="panel-content flex-1 overflow-y-auto">
        {markets.map((m, idx) => (
          <MarketItem key={m.id} m={m} isFirst={idx === 0} />
        ))}
      </div>
    </div>
  );
};
