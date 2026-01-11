import { useState, useEffect } from 'react';
import { PanelHeader } from '../PanelHeader';
import { Tag } from '../Tag';
import { ArbitrageEngine } from '../../utils/arbitrageEngine';

// Format currency with commas
const formatCurrency = (value, decimals = 2) => {
  if (value === undefined || value === null || isNaN(value)) return '$0.00';
  return `$${Number(value).toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`;
};

// Format percentage
const formatPercent = (value, decimals = 3) => {
  if (value === undefined || value === null || isNaN(value)) return '0%';
  return `${Number(value).toFixed(decimals)}%`;
};

// Format time ago
const formatTimeAgo = (timestamp) => {
  if (!timestamp) return 'N/A';
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  return `${Math.floor(seconds / 3600)}h ago`;
};

// Opportunity card component
const OpportunityCard = ({ opportunity, onExecute }) => {
  const profitColor = opportunity.netProfitPercent >= 0.5
    ? 'text-green-400'
    : opportunity.netProfitPercent >= 0.2
      ? 'text-yellow-400'
      : 'text-orange-400';

  const riskColor = opportunity.risk.level === 'LOW'
    ? 'text-green-400'
    : opportunity.risk.level === 'MEDIUM'
      ? 'text-yellow-400'
      : 'text-red-400';

  return (
    <div className="bg-gray-900/50 rounded border border-gray-800 p-3 mb-2 hover:border-orange-500/50 transition-colors">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-white">{opportunity.pair}</span>
          {opportunity.displayName && (
            <span className="text-[10px] text-gray-500">{opportunity.displayName}</span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Tag type={opportunity.risk.level === 'LOW' ? 'buy' : opportunity.risk.level === 'MEDIUM' ? 'hold' : 'sell'}>
            {opportunity.risk.level}
          </Tag>
          <span className={`text-xs font-bold ${profitColor}`}>
            +{formatPercent(opportunity.netProfitPercent)}
          </span>
        </div>
      </div>

      {/* Route */}
      <div className="flex items-center gap-2 mb-2">
        <div className="flex-1 bg-gray-800/50 rounded p-2">
          <div className="text-[9px] text-gray-500 mb-0.5">BUY</div>
          <div className="text-xs text-green-400 font-bold">{opportunity.buyExchange}</div>
          <div className="text-[10px] text-gray-400 mono">{formatCurrency(opportunity.buyPrice)}</div>
        </div>
        <div className="text-gray-500 text-xs">→</div>
        <div className="flex-1 bg-gray-800/50 rounded p-2">
          <div className="text-[9px] text-gray-500 mb-0.5">SELL</div>
          <div className="text-xs text-red-400 font-bold">{opportunity.sellExchange}</div>
          <div className="text-[10px] text-gray-400 mono">{formatCurrency(opportunity.sellPrice)}</div>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-4 gap-1 mb-2">
        <div className="text-center">
          <div className="text-[9px] text-gray-500">SPREAD</div>
          <div className="text-[10px] text-white mono">{formatPercent(opportunity.spreadPercent)}</div>
        </div>
        <div className="text-center">
          <div className="text-[9px] text-gray-500">FEES</div>
          <div className="text-[10px] text-red-400 mono">-{formatPercent(opportunity.totalFees)}</div>
        </div>
        <div className="text-center">
          <div className="text-[9px] text-gray-500">NET</div>
          <div className={`text-[10px] mono ${profitColor}`}>+{formatPercent(opportunity.netProfitPercent)}</div>
        </div>
        <div className="text-center">
          <div className="text-[9px] text-gray-500">PROFIT</div>
          <div className="text-[10px] text-green-400 mono">+{formatCurrency(opportunity.estimatedProfitUSD)}</div>
        </div>
      </div>

      {/* Confidence bar */}
      <div className="mb-2">
        <div className="flex items-center justify-between text-[9px] mb-0.5">
          <span className="text-gray-500">CONFIDENCE</span>
          <span className="text-gray-400">{opportunity.confidence}%</span>
        </div>
        <div className="h-1 bg-gray-800 rounded overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-orange-500 to-green-500"
            style={{ width: `${opportunity.confidence}%` }}
          />
        </div>
      </div>

      {/* Execute button */}
      <button
        onClick={() => onExecute(opportunity)}
        className="w-full py-1.5 text-xs font-bold bg-orange-500/20 text-orange-400 rounded border border-orange-500/30 hover:bg-orange-500/30 transition-colors"
      >
        EXECUTE TRADE
      </button>
    </div>
  );
};

export const ArbitrageOpportunitiesPanel = ({ bot }) => {
  const [state, setState] = useState(bot?.getState() || { opportunities: [], stats: {} });
  const [filter, setFilter] = useState('all'); // all, profitable, low-risk
  const [sortBy, setSortBy] = useState('profit'); // profit, risk, confidence

  useEffect(() => {
    if (!bot) return;

    // Subscribe to bot updates
    const unsubscribe = bot.subscribe((newState) => {
      setState(newState);
    });

    // Get initial state
    setState(bot.getState());

    return unsubscribe;
  }, [bot]);

  const handleExecute = async (opportunity) => {
    if (bot) {
      await bot.executeTrade(opportunity);
    }
  };

  // Filter and sort opportunities
  let filteredOpportunities = [...(state.opportunities || [])];

  if (filter === 'profitable') {
    filteredOpportunities = filteredOpportunities.filter(o => o.netProfitPercent >= 0.3);
  } else if (filter === 'low-risk') {
    filteredOpportunities = filteredOpportunities.filter(o => o.risk.level === 'LOW');
  }

  if (sortBy === 'risk') {
    filteredOpportunities.sort((a, b) => a.risk.score - b.risk.score);
  } else if (sortBy === 'confidence') {
    filteredOpportunities.sort((a, b) => b.confidence - a.confidence);
  }
  // Default is already sorted by profit

  const hasOpportunities = filteredOpportunities.length > 0;

  return (
    <div className="terminal-panel h-full flex flex-col">
      <PanelHeader
        title="ARBITRAGE SCANNER"
        subtitle={state.isRunning ? 'LIVE' : 'PAUSED'}
        actions={
          <div className="flex items-center gap-2">
            <span className={`text-[10px] ${state.isRunning ? 'text-green-400' : 'text-gray-500'}`}>
              {state.isRunning ? '● SCANNING' : '○ IDLE'}
            </span>
          </div>
        }
      />

      {/* Controls */}
      <div className="px-2 py-1 border-b border-gray-800 flex items-center gap-2">
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="text-[10px] bg-gray-800 border border-gray-700 rounded px-1.5 py-0.5 text-white"
        >
          <option value="all">All Opportunities</option>
          <option value="profitable">High Profit (&gt;0.3%)</option>
          <option value="low-risk">Low Risk Only</option>
        </select>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="text-[10px] bg-gray-800 border border-gray-700 rounded px-1.5 py-0.5 text-white"
        >
          <option value="profit">Sort by Profit</option>
          <option value="risk">Sort by Risk</option>
          <option value="confidence">Sort by Confidence</option>
        </select>
        <span className="text-[10px] text-gray-500 ml-auto">
          {filteredOpportunities.length} found
        </span>
      </div>

      {/* Stats bar */}
      <div className="px-2 py-1.5 bg-gray-900/30 border-b border-gray-800 grid grid-cols-4 gap-2">
        <div className="text-center">
          <div className="text-[9px] text-gray-500">SCANS</div>
          <div className="text-xs text-orange-400 mono">{state.stats?.totalScans || 0}</div>
        </div>
        <div className="text-center">
          <div className="text-[9px] text-gray-500">FOUND</div>
          <div className="text-xs text-green-400 mono">{state.stats?.opportunitiesFound || 0}</div>
        </div>
        <div className="text-center">
          <div className="text-[9px] text-gray-500">TRADES</div>
          <div className="text-xs text-blue-400 mono">{state.stats?.tradesExecuted || 0}</div>
        </div>
        <div className="text-center">
          <div className="text-[9px] text-gray-500">PROFIT</div>
          <div className="text-xs text-green-400 mono">{formatCurrency(state.stats?.totalProfit || 0)}</div>
        </div>
      </div>

      {/* Opportunities list */}
      <div className="panel-content p-2 flex-1 overflow-y-auto">
        {!hasOpportunities ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="text-gray-500 text-xs mb-2">
              {state.isRunning ? 'Scanning for opportunities...' : 'Bot is paused'}
            </div>
            <div className="text-[10px] text-gray-600">
              {state.isRunning
                ? 'Profitable arbitrage opportunities will appear here'
                : 'Start the bot to begin scanning'
              }
            </div>
          </div>
        ) : (
          filteredOpportunities.map((opp, idx) => (
            <OpportunityCard
              key={`${opp.pair}-${opp.buyExchange}-${opp.sellExchange}-${idx}`}
              opportunity={opp}
              onExecute={handleExecute}
            />
          ))
        )}
      </div>
    </div>
  );
};

export default ArbitrageOpportunitiesPanel;
