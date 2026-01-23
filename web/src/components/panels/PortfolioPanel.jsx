import { PanelHeader } from '../PanelHeader';
import { Tag } from '../Tag';

export const PortfolioPanel = ({ positions, markets }) => {
  const enrichedPositions = positions.map((p) => {
    const market = markets.find((m) => m.id === p.market_id);
    const pnl =
      (p.current_price - p.avg_price) *
      p.shares *
      (p.side === "NO" ? -1 : 1);
    const pnlPct =
      ((p.current_price - p.avg_price) / (p.avg_price || 1) * 100) *
      (p.side === "NO" ? -1 : 1);
    return { ...p, market, pnl, pnlPct };
  });

  const totalPnL = enrichedPositions.reduce((sum, p) => sum + p.pnl, 0);
  const totalValue = enrichedPositions.reduce(
    (sum, p) => sum + p.shares * p.current_price,
    0
  );

  return (
    <div className="terminal-panel h-full">
      <PanelHeader
        title="PORTFOLIO"
        subtitle={`${positions.length} positions`}
      />
      <div className="panel-content">
        <div className="px-2 py-2 border-b border-gray-800 bg-gray-900/30">
          <div className="flex justify-between text-xs">
            <span className="text-gray-500">Total Value</span>
            <span className="mono">${totalValue.toFixed(0)}</span>
          </div>
          <div className="flex justify-between text-xs mt-1">
            <span className="text-gray-500">Unrealized P&L</span>
            <span
              className={`mono ${
                totalPnL >= 0 ? "positive" : "negative"
              }`}
            >
              {totalPnL >= 0 ? "+" : ""}${totalPnL.toFixed(2)}
            </span>
          </div>
        </div>
        {enrichedPositions.map((p, i) => (
          <div key={i} className="px-2 py-2 border-b border-gray-900">
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs font-bold text-orange-500">
                {p.market?.ticker || "N/A"}
              </span>
              <Tag type={p.side === "YES" ? "buy" : "sell"}>
                {p.side}
              </Tag>
            </div>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div>
                <span className="text-gray-600">Shares</span>
                <div className="mono">{p.shares}</div>
              </div>
              <div>
                <span className="text-gray-600">Avg</span>
                <div className="mono">
                  {(p.avg_price * 100).toFixed(1)}¢
                </div>
              </div>
              <div>
                <span className="text-gray-600">P&L</span>
                <div
                  className={`mono ${
                    p.pnl >= 0 ? "positive" : "negative"
                  }`}
                >
                  {p.pnl >= 0 ? "+" : ""}${p.pnl.toFixed(2)}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

