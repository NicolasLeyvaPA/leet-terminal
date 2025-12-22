import { PanelHeader } from '../PanelHeader';
import { Tag } from '../Tag';
import { useWatchlist } from '../../utils/useWatchlist';

export const WatchlistPanel = ({ markets, selectedId, onSelect }) => {
  const { removeFromWatchlist, isInWatchlist } = useWatchlist();
  
  return (
    <div className="terminal-panel h-full">
      <PanelHeader title="WATCHLIST" subtitle={`${markets.length} mkts`} />
      <div className="panel-content">
        {markets.map((m) => {
          const edge = m.model_prob - m.market_prob;
          const change = m.market_prob - m.prev_prob;
          const isWatchlistOnly = m.isPolymarketEvent || isInWatchlist(m.id);
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
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold text-orange-500 mono">
                {m.ticker}
              </span>
              <span className={`text-xs mono ${edge > 0 ? "positive" : "negative"}`}>
                {edge > 0 ? "+" : ""}
                {(edge * 100).toFixed(1)}%
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">
                {(m.market_prob * 100).toFixed(1)}¢
              </span>
              <span
                className={`text-xs ${
                  change > 0
                    ? "positive"
                    : change < 0
                    ? "negative"
                    : "text-gray-500"
                }`}
              >
                {change > 0 ? "▲" : change < 0 ? "▼" : "•"}{" "}
                {Math.abs(change * 100).toFixed(1)}
              </span>
            </div>
            <div className="flex items-center justify-between mt-1">
              <div className="flex items-center gap-1">
                <Tag type="platform">{m.platform.slice(0, 4)}</Tag>
                <Tag
                  type={
                    edge > 0.03
                      ? "buy"
                      : edge < -0.03
                      ? "sell"
                      : "hold"
                  }
                >
                  {edge > 0.03
                    ? "BUY"
                    : edge < -0.03
                    ? "SELL"
                    : "HOLD"}
                </Tag>
              </div>
              {isWatchlistOnly && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFromWatchlist(m.id);
                  }}
                  className="btn text-[10px] px-2 py-0.5 danger"
                  title="Remove from watchlist"
                >
                  ×
                </button>
              )}
            </div>
          </div>
        );
      })}
      </div>
    </div>
  );
};

