import { PanelHeader } from '../PanelHeader';
import { Tag } from '../Tag';
import { useWatchlist } from '../../utils/useWatchlist';

export const WatchlistPanel = ({ markets, selectedId, onSelect }) => {
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

  return (
    <div className="terminal-panel h-full">
      <PanelHeader title="MARKETS" subtitle={`${markets.length} live`} />
      <div className="panel-content">
        {markets.map((m) => {
          const marketProb = m.market_prob || 0;
          const modelProb = m.model_prob || marketProb;
          const prevProb = m.prev_prob || marketProb;
          const edge = modelProb - marketProb;
          const change = marketProb - prevProb;
          const signal = edge > 0.03 ? 'BUY' : edge < -0.03 ? 'SELL' : 'HOLD';

          // Show remove button only for items that are actually in the watchlist (user-added)
          const isInUserWatchlist = watchlist.some((w) => w.id === m.id || w.ticker === m.ticker);

          return (
            <div
              key={m.id}
              onClick={() => onSelect(m)}
              className={`px-2 py-2 border-b border-gray-900 cursor-pointer transition-colors ${
                selectedId === m.id
                  ? "bg-orange-500/10 border-l-2 border-l-orange-500"
                  : "hover:bg-gray-900/50"
              }`}
            >
              {/* Ticker and Edge */}
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-orange-500 mono">
                  {m.ticker || 'MKT'}
                </span>
                <span
                  className={`text-xs mono font-medium ${
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
                  className={`text-xs ${
                    change > 0 ? "text-green-400" : change < 0 ? "text-red-400" : "text-gray-500"
                  }`}
                >
                  {change > 0 ? "+" : ""}{(change * 100).toFixed(2)}
                </span>
              </div>

              {/* Question preview */}
              <div className="text-[10px] text-gray-500 mt-1 line-clamp-1">
                {m.question}
              </div>

              {/* Tags and Actions */}
              <div className="flex items-center justify-between mt-1.5">
                <div className="flex items-center gap-1">
                  <Tag type={signal === 'BUY' ? 'buy' : signal === 'SELL' ? 'sell' : 'hold'}>
                    {signal}
                  </Tag>
                  {Math.abs(edge) > 0.05 && (
                    <Tag type={edge > 0 ? 'buy' : 'sell'}>!</Tag>
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
        })}
      </div>
    </div>
  );
};
