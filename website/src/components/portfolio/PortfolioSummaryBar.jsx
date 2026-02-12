import { useMemo } from 'react';

const StatCard = ({ label, value, subValue, color, icon }) => (
  <div className="bg-[#0d0d0d] border border-[#1e1e1e] rounded px-3 py-2.5 flex-1 min-w-0">
    <div className="flex items-center gap-1.5 mb-1">
      <span className="text-[10px] text-gray-600 uppercase tracking-wider">{icon} {label}</span>
    </div>
    <div className={`text-sm font-bold mono ${color || 'text-white'}`}>{value}</div>
    {subValue && <div className="text-[10px] text-gray-500 mono mt-0.5">{subValue}</div>}
  </div>
);

export const PortfolioSummaryBar = ({ positions, markets }) => {
  const stats = useMemo(() => {
    const enriched = positions.map((p) => {
      const market = markets.find((m) => m.id === p.market_id);
      const pnl = (p.current_price - p.avg_price) * p.shares * (p.side === 'NO' ? -1 : 1);
      const value = p.shares * p.current_price;
      const cost = p.shares * p.avg_price;
      return { ...p, market, pnl, value, cost };
    });

    const totalValue = enriched.reduce((s, p) => s + p.value, 0);
    const totalCost = enriched.reduce((s, p) => s + p.cost, 0);
    const totalPnL = enriched.reduce((s, p) => s + p.pnl, 0);
    const pnlPct = totalCost > 0 ? (totalPnL / totalCost) * 100 : 0;
    const winners = enriched.filter((p) => p.pnl > 0).length;
    const winRate = enriched.length > 0 ? (winners / enriched.length) * 100 : 0;
    const totalTrades = enriched.length;
    const bestTrade = enriched.length > 0 ? Math.max(...enriched.map((p) => p.pnl)) : 0;
    const worstTrade = enriched.length > 0 ? Math.min(...enriched.map((p) => p.pnl)) : 0;

    return { totalValue, totalPnL, pnlPct, winRate, totalTrades, bestTrade, worstTrade, totalCost };
  }, [positions, markets]);

  const fmt = (n) => {
    if (Math.abs(n) >= 1000) return `$${(n / 1000).toFixed(1)}K`;
    return `$${n.toFixed(2)}`;
  };

  return (
    <div className="flex gap-1.5 overflow-x-auto">
      <StatCard
        icon="$"
        label="Portfolio Value"
        value={fmt(stats.totalValue)}
        subValue={`Cost basis: ${fmt(stats.totalCost)}`}
        color="text-white"
      />
      <StatCard
        icon={stats.totalPnL >= 0 ? '+' : '-'}
        label="Unrealized P&L"
        value={`${stats.totalPnL >= 0 ? '+' : ''}${fmt(stats.totalPnL)}`}
        subValue={`${stats.pnlPct >= 0 ? '+' : ''}${stats.pnlPct.toFixed(2)}%`}
        color={stats.totalPnL >= 0 ? 'text-[#00d26a]' : 'text-[#ff3b3b]'}
      />
      <StatCard
        icon="%"
        label="Win Rate"
        value={`${stats.winRate.toFixed(1)}%`}
        subValue={`${stats.totalTrades} positions`}
        color={stats.winRate >= 50 ? 'text-[#00d26a]' : 'text-[#ff3b3b]'}
      />
      <StatCard
        icon="^"
        label="Best Trade"
        value={`+${fmt(Math.max(0, stats.bestTrade))}`}
        color="text-[#00d26a]"
      />
      <StatCard
        icon="v"
        label="Worst Trade"
        value={fmt(stats.worstTrade)}
        color="text-[#ff3b3b]"
      />
    </div>
  );
};
