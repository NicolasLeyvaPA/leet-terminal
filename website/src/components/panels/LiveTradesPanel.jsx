import { useState, useEffect, useRef } from 'react';
import { PanelHeader } from '../PanelHeader';

// ============================================
// BEGINNER-FRIENDLY LIVE TRADES PANEL
// Shows trades as they execute in real-time
// ============================================

// Tooltip for help text
const QuickTip = ({ tip }) => (
  <span className="ml-1 text-gray-500 cursor-help text-[8px] group relative">
    ⓘ
    <span className="hidden group-hover:block absolute z-50 bottom-full left-0 mb-1 w-40 p-2 bg-gray-800 border border-gray-700 rounded shadow-lg text-[10px] text-gray-300">
      {tip}
    </span>
  </span>
);

// Format currency with proper decimals
const formatCurrency = (value, decimals = 2) => {
  if (value === undefined || value === null || isNaN(value)) return '$0.00';
  const sign = value >= 0 ? '+' : '';
  return `${sign}$${Math.abs(value).toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`;
};

// Format time elapsed
const formatTimeAgo = (timestamp) => {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  return `${Math.floor(seconds / 3600)}h ago`;
};

// Friendly trade type labels
const getTradeTypeLabel = (trade) => {
  const direction = trade.opportunity?.direction;
  const type = trade.opportunity?.type;

  if (direction === 'BUY_POLY_SELL_KALSHI') return 'CROSS-VENUE ARB';
  if (direction === 'BUY_KALSHI_SELL_POLY') return 'CROSS-VENUE ARB';
  if (type === 'OVERROUND') return 'SELL OVERPRICED';
  if (type === 'UNDERROUND') return 'BUY UNDERPRICED';
  return 'TRADE';
};

// Friendly status labels
const getStatusLabel = (status) => {
  const labels = {
    'FILLED': '✓ Completed',
    'SIMULATED': '🔄 Simulated',
    'PENDING': '⏳ Processing',
    'FAILED': '✗ Failed',
  };
  return labels[status] || status;
};

// Single trade row component
const TradeRow = ({ trade, isNew }) => {
  const pnl = trade.profit || 0;
  const isProfitable = pnl >= 0;
  const tradeLabel = getTradeTypeLabel(trade);
  const statusLabel = getStatusLabel(trade.status);

  return (
    <div className={`
      flex items-center gap-3 p-3 rounded-lg border transition-all duration-300
      ${isNew ? 'animate-pulse bg-orange-500/10 border-orange-500/40' : 'bg-gray-900/40 border-gray-800'}
      ${isProfitable ? 'hover:border-green-500/30' : 'hover:border-red-500/30'}
    `}>
      {/* Status indicator */}
      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
        trade.status === 'FILLED' || trade.status === 'SIMULATED'
          ? isProfitable ? 'bg-green-500' : 'bg-red-500'
          : trade.status === 'PENDING'
            ? 'bg-yellow-500 animate-pulse'
            : 'bg-gray-500'
      }`} />

      {/* Trade info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs text-gray-300 font-medium truncate">
            {trade.opportunity?.polymarket?.question?.slice(0, 40) || trade.opportunity?.market?.question?.slice(0, 40) || 'Unknown Market'}...
          </span>
          <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${
            trade.opportunity?.direction
              ? 'bg-blue-500/20 text-blue-400'
              : trade.opportunity?.type === 'OVERROUND'
                ? 'bg-red-500/20 text-red-400'
                : 'bg-green-500/20 text-green-400'
          }`}>
            {tradeLabel}
          </span>
        </div>
        <div className="flex items-center gap-3 text-[10px] text-gray-500">
          <span>{formatTimeAgo(trade.executedAt)}</span>
          <span>Amount: ${trade.opportunity?.tradeSize?.toFixed(0) || '--'}</span>
          <span className="text-gray-600">{statusLabel}</span>
        </div>
      </div>

      {/* P&L display */}
      <div className="text-right flex-shrink-0">
        <div className={`text-lg font-bold mono ${isProfitable ? 'text-green-400' : 'text-red-400'}`}>
          {formatCurrency(pnl)}
        </div>
        <div className={`text-[10px] ${isProfitable ? 'text-green-400/60' : 'text-red-400/60'}`}>
          {isProfitable ? '✓ PROFIT' : '✗ LOSS'}
        </div>
      </div>
    </div>
  );
};

// Main LiveTradesPanel component
export const LiveTradesPanel = ({ bot }) => {
  const [trades, setTrades] = useState([]);
  const [stats, setStats] = useState({
    totalPnL: 0,
    winRate: 0,
    totalTrades: 0,
    wins: 0,
    losses: 0,
  });
  const [newTradeIds, setNewTradeIds] = useState(new Set());
  const tradesRef = useRef([]);

  useEffect(() => {
    if (!bot) return;

    const unsubscribe = bot.subscribe((state) => {
      const newTrades = state.trades || [];

      // Detect new trades
      const prevIds = new Set(tradesRef.current.map(t => t.id));
      const justAdded = newTrades.filter(t => !prevIds.has(t.id)).map(t => t.id);

      if (justAdded.length > 0) {
        setNewTradeIds(new Set(justAdded));
        // Clear "new" status after animation
        setTimeout(() => setNewTradeIds(new Set()), 2000);
      }

      tradesRef.current = newTrades;
      setTrades(newTrades);

      // Calculate stats
      const totalPnL = newTrades.reduce((sum, t) => sum + (t.profit || 0), 0);
      const wins = newTrades.filter(t => (t.profit || 0) > 0).length;
      const losses = newTrades.filter(t => (t.profit || 0) < 0).length;

      setStats({
        totalPnL,
        winRate: newTrades.length > 0 ? (wins / newTrades.length) * 100 : 0,
        totalTrades: newTrades.length,
        wins,
        losses,
      });
    });

    // Initial state
    const initialState = bot.getState();
    setTrades(initialState.trades || []);

    return unsubscribe;
  }, [bot]);

  const isProfitable = stats.totalPnL >= 0;

  return (
    <div className="terminal-panel h-full flex flex-col bg-gradient-to-b from-gray-900/50 to-black/50">
      <PanelHeader
        title="LIVE TRADES"
        subtitle="Real-time Execution Feed"
        actions={
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${trades.length > 0 ? 'bg-green-500 animate-pulse' : 'bg-gray-600'}`} />
            <span className="text-[10px] text-gray-400">{trades.length} trades</span>
          </div>
        }
      />

      {/* Stats bar - Beginner-friendly labels */}
      <div className="p-3 border-b border-gray-800 bg-gray-900/30">
        <div className="grid grid-cols-5 gap-3">
          {/* Total P&L - Large display */}
          <div className="col-span-2 bg-gray-800/50 rounded-lg p-3 border border-gray-700">
            <div className="text-[10px] text-gray-500 mb-1 flex items-center">
              TOTAL PROFIT/LOSS
              <QuickTip tip="Your combined profit or loss from all executed trades" />
            </div>
            <div className={`text-2xl font-bold mono ${isProfitable ? 'text-green-400' : 'text-red-400'}`}>
              {formatCurrency(stats.totalPnL)}
            </div>
          </div>

          {/* Win Rate */}
          <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700">
            <div className="text-[10px] text-gray-500 mb-1 flex items-center">
              SUCCESS RATE
              <QuickTip tip="Percentage of trades that made money" />
            </div>
            <div className="text-lg font-bold text-orange-400 mono">
              {stats.winRate.toFixed(1)}%
            </div>
          </div>

          {/* Wins */}
          <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700">
            <div className="text-[10px] text-gray-500 mb-1">PROFITABLE</div>
            <div className="text-lg font-bold text-green-400 mono">
              {stats.wins}
            </div>
          </div>

          {/* Losses */}
          <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700">
            <div className="text-[10px] text-gray-500 mb-1">UNPROFITABLE</div>
            <div className="text-lg font-bold text-red-400 mono">
              {stats.losses}
            </div>
          </div>
        </div>
      </div>

      {/* Trades list */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {trades.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-16 h-16 rounded-full bg-gray-800/50 flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div className="text-gray-400 text-sm font-medium mb-1">No Trades Yet</div>
            <div className="text-gray-600 text-xs">
              Start the bot to begin executing trades
            </div>
          </div>
        ) : (
          trades.slice().reverse().map((trade) => (
            <TradeRow
              key={trade.id}
              trade={trade}
              isNew={newTradeIds.has(trade.id)}
            />
          ))
        )}
      </div>

      {/* Footer with simulation warning */}
      <div className="p-2 border-t border-gray-800 bg-yellow-500/5">
        <div className="flex items-center justify-center gap-2 text-[9px] text-yellow-500/80">
          <span>⚠</span>
          <span>SIMULATION MODE - No real trades executed</span>
        </div>
      </div>
    </div>
  );
};

export default LiveTradesPanel;
