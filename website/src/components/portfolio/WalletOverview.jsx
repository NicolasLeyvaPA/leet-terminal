import { useMemo } from 'react';

export const WalletOverview = ({ positions, markets }) => {
  const stats = useMemo(() => {
    const enriched = positions.map((p) => {
      const market = markets.find((m) => m.id === p.market_id);
      const pnl = (p.current_price - p.avg_price) * p.shares * (p.side === 'NO' ? -1 : 1);
      const value = p.shares * p.current_price;
      return { ...p, market, pnl, value };
    });

    const totalValue = enriched.reduce((s, p) => s + p.value, 0);
    const totalPnL = enriched.reduce((s, p) => s + p.pnl, 0);

    // Sector breakdown for the bar chart
    const sectors = {};
    enriched.forEach((p) => {
      const cat = p.market?.category || 'Other';
      sectors[cat] = (sectors[cat] || 0) + p.value;
    });
    const sortedSectors = Object.entries(sectors).sort((a, b) => b[1] - a[1]);

    // Platform breakdown
    const platforms = {};
    enriched.forEach((p) => {
      const plat = p.market?.platform || 'Unknown';
      platforms[plat] = (platforms[plat] || 0) + p.value;
    });

    return { totalValue, totalPnL, sortedSectors, platforms: Object.entries(platforms), posCount: positions.length };
  }, [positions, markets]);

  const barMax = stats.sortedSectors.length > 0
    ? Math.max(...stats.sortedSectors.map(([, v]) => v))
    : 1;

  const SECTOR_COLORS = {
    Politics: '#ff6b00',
    Crypto: '#a855f7',
    Sports: '#00d26a',
    Finance: '#0088ff',
    Entertainment: '#ffd000',
    Science: '#06b6d4',
    Technology: '#ff3b3b',
    Other: '#555',
  };

  return (
    <div className="terminal-panel h-full flex flex-col">
      <div className="panel-header flex items-center justify-between">
        <span>WALLET OVERVIEW</span>
        <span className="text-gray-600 font-normal text-xs">| breakdown</span>
      </div>
      <div className="flex-1 min-h-0 overflow-auto p-2 space-y-3">
        {/* Amount in Wallet */}
        <div className="bg-[#0d0d0d] border border-[#1e1e1e] rounded p-2.5">
          <div className="text-[9px] text-gray-600 uppercase tracking-wider mb-1">Total in Wallet</div>
          <div className="text-lg font-bold mono text-white">
            ${stats.totalValue.toFixed(2)}
          </div>
          <div className={`text-[10px] mono mt-0.5 ${stats.totalPnL >= 0 ? 'text-[#00d26a]' : 'text-[#ff3b3b]'}`}>
            {stats.totalPnL >= 0 ? '+' : ''}${stats.totalPnL.toFixed(2)} unrealized
          </div>
        </div>

        {/* Sector Bars */}
        <div>
          <div className="text-[9px] text-gray-600 uppercase tracking-wider mb-1.5">Value by Sector</div>
          <div className="space-y-1">
            {stats.sortedSectors.map(([sector, value]) => (
              <div key={sector} className="flex items-center gap-2">
                <span className="text-[9px] text-gray-400 w-16 truncate">{sector}</span>
                <div className="flex-1 h-3 bg-[#1a1a1a] rounded-sm overflow-hidden">
                  <div
                    className="h-full rounded-sm transition-all duration-300"
                    style={{
                      width: `${(value / barMax) * 100}%`,
                      backgroundColor: SECTOR_COLORS[sector] || '#555',
                    }}
                  />
                </div>
                <span className="text-[9px] mono text-gray-500 w-12 text-right">
                  ${value.toFixed(0)}
                </span>
              </div>
            ))}
            {stats.sortedSectors.length === 0 && (
              <div className="text-gray-600 text-[10px]">No sector data</div>
            )}
          </div>
        </div>

        {/* Platform Split */}
        <div>
          <div className="text-[9px] text-gray-600 uppercase tracking-wider mb-1.5">By Platform</div>
          <div className="space-y-1">
            {stats.platforms.map(([platform, value]) => (
              <div key={platform} className="flex items-center justify-between">
                <span className="text-[10px] text-orange-500">{platform}</span>
                <span className="text-[10px] mono text-gray-300">${value.toFixed(2)}</span>
              </div>
            ))}
            {stats.platforms.length === 0 && (
              <div className="text-gray-600 text-[10px]">No platform data</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
