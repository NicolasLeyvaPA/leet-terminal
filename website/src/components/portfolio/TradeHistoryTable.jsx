import { useMemo } from 'react';

export const TradeHistoryTable = ({ positions, markets }) => {
  const trades = useMemo(() => {
    return positions.map((p, i) => {
      const market = markets.find((m) => m.id === p.market_id);
      const pnl = (p.current_price - p.avg_price) * p.shares * (p.side === 'NO' ? -1 : 1);
      // Simulate trade timestamps (staggered over last 30 days)
      const daysAgo = Math.floor((positions.length - i) * (30 / Math.max(positions.length, 1)));
      const timestamp = new Date(Date.now() - daysAgo * 86400000);
      return { ...p, market, pnl, timestamp };
    }).sort((a, b) => b.timestamp - a.timestamp);
  }, [positions, markets]);

  return (
    <div className="terminal-panel h-full flex flex-col">
      <div className="panel-header flex items-center justify-between">
        <span>TRADE HISTORY</span>
        <span className="text-gray-600 font-normal text-xs">| recent activity</span>
      </div>
      <div className="flex-1 min-h-0 overflow-auto">
        <table className="w-full text-[11px]">
          <thead className="sticky top-0 bg-[#131313] z-10">
            <tr className="text-gray-500 uppercase text-[9px] tracking-wider">
              <th className="text-left py-1.5 px-2 font-medium">Date</th>
              <th className="text-left py-1.5 px-1 font-medium">Market</th>
              <th className="text-left py-1.5 px-1 font-medium">Action</th>
              <th className="text-right py-1.5 px-1 font-medium">Qty</th>
              <th className="text-right py-1.5 px-1 font-medium">Price</th>
              <th className="text-right py-1.5 px-1 font-medium">Total</th>
              <th className="text-right py-1.5 px-2 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {trades.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-8 text-gray-600">
                  No trade history
                </td>
              </tr>
            ) : (
              trades.map((t, i) => (
                <tr
                  key={i}
                  className="border-t border-[#141414] hover:bg-[#161616] transition-colors"
                >
                  <td className="py-1.5 px-2 mono text-gray-500 text-[10px]">
                    {t.timestamp.toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                    })}
                    <div className="text-[8px] text-gray-700">
                      {t.timestamp.toLocaleTimeString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </div>
                  </td>
                  <td className="py-1.5 px-1">
                    <span className="text-orange-500 font-semibold text-[10px]">
                      {t.market?.ticker || 'N/A'}
                    </span>
                  </td>
                  <td className="py-1.5 px-1">
                    <span
                      className={`tag text-[8px] ${
                        t.side === 'YES' ? 'tag-buy' : 'tag-sell'
                      }`}
                    >
                      BUY {t.side}
                    </span>
                  </td>
                  <td className="py-1.5 px-1 text-right mono text-gray-300">
                    {t.shares}
                  </td>
                  <td className="py-1.5 px-1 text-right mono text-gray-400">
                    {(t.avg_price * 100).toFixed(1)}c
                  </td>
                  <td className="py-1.5 px-1 text-right mono text-white">
                    ${(t.shares * t.avg_price).toFixed(2)}
                  </td>
                  <td className="py-1.5 px-2 text-right">
                    <span className={`text-[9px] mono font-medium ${
                      t.pnl >= 0 ? 'text-[#00d26a]' : 'text-[#ff3b3b]'
                    }`}>
                      {t.pnl >= 0 ? '+' : ''}{t.pnl.toFixed(2)}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
