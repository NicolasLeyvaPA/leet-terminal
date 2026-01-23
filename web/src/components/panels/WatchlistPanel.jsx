import { PanelHeader } from '../PanelHeader';
import { Tag } from '../Tag';
import { useWatchlist } from '../../hooks/useWatchlist';

// Category colors for visual distinction
const CATEGORY_COLORS = {
  'Politics': 'border-blue-500/30 bg-blue-500/5',
  'Crypto': 'border-yellow-500/30 bg-yellow-500/5',
  'Sports': 'border-green-500/30 bg-green-500/5',
  'Entertainment': 'border-purple-500/30 bg-purple-500/5',
  'Science': 'border-cyan-500/30 bg-cyan-500/5',
  'Economics': 'border-red-500/30 bg-red-500/5',
  'Tech': 'border-indigo-500/30 bg-indigo-500/5',
  'Other': 'border-gray-500/30 bg-gray-500/5',
};

const CATEGORY_HEADER_COLORS = {
  'Politics': 'text-blue-400',
  'Crypto': 'text-yellow-400',
  'Sports': 'text-green-400',
  'Entertainment': 'text-purple-400',
  'Science': 'text-cyan-400',
  'Economics': 'text-red-400',
  'Tech': 'text-indigo-400',
  'Other': 'text-gray-400',
};

export const WatchlistPanel = ({ markets, groupedMarkets, selectedId, onSelect, categoryFilter }) => {
  const { watchlist, removeFromWatchlist } = useWatchlist();

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

  // Render a single market item
  const MarketItem = ({ m }) => {
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
        className={`px-2 py-1.5 cursor-pointer transition-colors ${
          selectedId === m.id
            ? "bg-orange-500/10 border-l-2 border-l-orange-500"
            : "hover:bg-gray-900/50 border-l-2 border-l-transparent"
        }`}
      >
        {/* Ticker and Edge */}
        <div className="flex items-center justify-between mb-0.5">
          <span className="text-xs font-bold text-orange-500 mono">
            {m.ticker || 'MKT'}
          </span>
          <span
            className={`text-[10px] mono font-medium ${
              edge > 0.02 ? "text-green-400" : edge < -0.02 ? "text-red-400" : "text-gray-500"
            }`}
          >
            {edge > 0 ? "+" : ""}{(edge * 100).toFixed(1)}%
          </span>
        </div>

        {/* Price and Change */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-white font-medium mono">
            {(marketProb * 100).toFixed(1)}¢
          </span>
          <span
            className={`text-[10px] ${
              change > 0 ? "text-green-400" : change < 0 ? "text-red-400" : "text-gray-500"
            }`}
          >
            {change > 0 ? "+" : ""}{(change * 100).toFixed(2)}
          </span>
        </div>

        {/* Question preview */}
        <div className="text-[10px] text-gray-500 mt-0.5 line-clamp-1">
          {m.question}
        </div>

        {/* Tags and Actions */}
        <div className="flex items-center justify-between mt-1">
          <div className="flex items-center gap-1">
            <Tag type={signal === 'BUY' ? 'buy' : signal === 'SELL' ? 'sell' : 'hold'}>
              {signal}
            </Tag>
            {Math.abs(edge) > 0.05 && (
              <span className={`text-[9px] font-bold ${edge > 0 ? 'text-green-400' : 'text-red-400'}`}>
                !
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            <span className="text-[9px] text-gray-600">
              ${((m.liquidity || 0) / 1000).toFixed(0)}k
            </span>
            {isInUserWatchlist && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  removeFromWatchlist(m.id);
                }}
                className="text-gray-600 hover:text-red-400 text-xs px-1"
                title="Remove from watchlist"
              >
                ×
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  // If showing all categories, render grouped view
  if (categoryFilter === 'all' && groupedMarkets && Object.keys(groupedMarkets).length > 0) {
    const sortedCategories = Object.keys(groupedMarkets).sort((a, b) => {
      // Sort by number of markets with signals
      const aSignals = groupedMarkets[a].filter(m => Math.abs((m.model_prob || 0) - (m.market_prob || 0)) > 0.03).length;
      const bSignals = groupedMarkets[b].filter(m => Math.abs((m.model_prob || 0) - (m.market_prob || 0)) > 0.03).length;
      return bSignals - aSignals;
    });

    return (
      <div className="terminal-panel h-full">
        <PanelHeader title="MARKETS" subtitle={`${markets.length} live • by category`} />
        <div className="panel-content">
          {sortedCategories.map(category => {
            const categoryMarkets = groupedMarkets[category];
            const signals = categoryMarkets.filter(m => Math.abs((m.model_prob || 0) - (m.market_prob || 0)) > 0.03).length;
            const headerColor = CATEGORY_HEADER_COLORS[category] || 'text-gray-400';
            const bgColor = CATEGORY_COLORS[category] || 'border-gray-500/30 bg-gray-500/5';

            return (
              <div key={category} className="mb-2">
                {/* Category Header */}
                <div className={`sticky top-0 z-10 px-2 py-1.5 border-l-2 ${bgColor} backdrop-blur-sm`}>
                  <div className="flex items-center justify-between">
                    <span className={`text-[10px] font-bold ${headerColor}`}>
                      {category.toUpperCase()}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] text-gray-500">
                        {categoryMarkets.length}
                      </span>
                      {signals > 0 && (
                        <span className="text-[9px] text-green-400 font-medium">
                          {signals} signals
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Category Markets */}
                <div className="border-l border-gray-800">
                  {categoryMarkets.slice(0, 10).map((m) => (
                    <MarketItem key={m.id} m={m} />
                  ))}
                  {categoryMarkets.length > 10 && (
                    <div className="px-2 py-1 text-[9px] text-gray-600 text-center">
                      +{categoryMarkets.length - 10} more
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Flat view when filtering by category
  return (
    <div className="terminal-panel h-full">
      <PanelHeader
        title="MARKETS"
        subtitle={`${markets.length} ${categoryFilter !== 'all' ? categoryFilter : 'live'}`}
      />
      <div className="panel-content">
        {markets.map((m) => (
          <MarketItem key={m.id} m={m} />
        ))}
      </div>
    </div>
  );
};
