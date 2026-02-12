import { useMemo } from 'react';

export const HoldingsTable = ({ positions, markets }) => {
  const holdings = useMemo(() => {
    const totalValue = positions.reduce((s, p) => s + p.shares * p.current_price, 0);
    return positions.map((p) => {
      const market = markets.find((m) => m.id === p.market_id);
      const value = p.shares * p.current_price;
      const cost = p.shares * p.avg_price;
      const pnl = (p.current_price - p.avg_price) * p.shares * (p.side === 'NO' ? -1 : 1);
      const pnlPct = p.avg_price > 0 ? ((p.current_price - p.avg_price) / p.avg_price) * 100 * (p.side === 'NO' ? -1 : 1) : 0;
      const allocation = totalValue > 0 ? (value / totalValue) * 100 : 0;
      return { ...p, market, value, cost, pnl, pnlPct, allocation };
    }).sort((a, b) => b.value - a.value);
  }, [positions, markets]);

  return (
    <div className="terminal-panel h-full flex flex-col">
      <div className="panel-header flex items-center justify-between">
        <span>HOLDINGS</span>
        <span className="text-gray-600 font-normal text-xs">| {holdings.length} positions</span>
      </div>
      <div className="flex-1 min-h-0 overflow-auto">
        <table className="w-full text-[11px]">
          <thead className="sticky top-0 bg-[#131313] z-10">
            <tr className="text-gray-500 uppercase text-[9px] tracking-wider">
              <th className="text-left py-1.5 px-2 font-medium">Market</th>
              <th className="text-left py-1.5 px-1 font-medium">Side</th>
              <th className="text-right py-1.5 px-1 font-medium">Shares</th>
              <th className="text-right py-1.5 px-1 font-medium">Avg Price</th>
              <th className="text-right py-1.5 px-1 font-medium">Cur Price</th>
              <th className="text-right py-1.5 px-1 font-medium">Value</th>
              <th className="text-right py-1.5 px-1 font-medium">P&L</th>
              <th className="text-right py-1.5 px-2 font-medium">Alloc %</th>
            </tr>
          </thead>
          <tbody>
            {holdings.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center py-8 text-gray-600">
                  No open positions
                </td>
              </tr>
            ) : (
              holdings.map((h, i) => (
                <tr
                  key={i}
                  className="border-t border-[#141414] hover:bg-[#161616] transition-colors"
                >
                  <td className="py-1.5 px-2">
                    <div className="flex flex-col">
                      <span className="text-orange-500 font-semibold text-[10px]">
                        {h.market?.ticker || 'N/A'}
                      </span>
                      <span className="text-gray-600 text-[9px] truncate max-w-[120px]">
                        {h.market?.category || ''}
                      </span>
                    </div>
                  </td>
                  <td className="py-1.5 px-1">
                    <span
                      className={`tag text-[8px] ${
                        h.side === 'YES' ? 'tag-buy' : 'tag-sell'
                      }`}
                    >
                      {h.side}
                    </span>
                  </td>
                  <td className="py-1.5 px-1 text-right mono text-gray-300">
                    {h.shares}
                  </td>
                  <td className="py-1.5 px-1 text-right mono text-gray-400">
                    {(h.avg_price * 100).toFixed(1)}c
                  </td>
                  <td className="py-1.5 px-1 text-right mono text-white">
                    {(h.current_price * 100).toFixed(1)}c
                  </td>
                  <td className="py-1.5 px-1 text-right mono text-white">
                    ${h.value.toFixed(2)}
                  </td>
                  <td className="py-1.5 px-1 text-right">
                    <div className={`mono ${h.pnl >= 0 ? 'text-[#00d26a]' : 'text-[#ff3b3b]'}`}>
                      {h.pnl >= 0 ? '+' : ''}${h.pnl.toFixed(2)}
                    </div>
                    <div className={`text-[9px] mono ${h.pnlPct >= 0 ? 'text-[#00d26a]/70' : 'text-[#ff3b3b]/70'}`}>
                      {h.pnlPct >= 0 ? '+' : ''}{h.pnlPct.toFixed(1)}%
                    </div>
                  </td>
                  <td className="py-1.5 px-2 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <div className="w-12 h-1.5 bg-[#1a1a1a] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-orange-500 rounded-full"
                          style={{ width: `${Math.min(100, h.allocation)}%` }}
                        />
                      </div>
                      <span className="mono text-gray-400 text-[9px] w-8 text-right">
                        {h.allocation.toFixed(1)}%
                      </span>
                    </div>
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
