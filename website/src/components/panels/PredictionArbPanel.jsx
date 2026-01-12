import { useState, useEffect, useMemo } from 'react';
import { PanelHeader } from '../PanelHeader';
import { Tag } from '../Tag';

// Format currency
const formatCurrency = (value, decimals = 2) => {
  if (value === undefined || value === null || isNaN(value)) return '$0.00';
  return `$${Number(value).toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`;
};

// Format percentage
const formatPercent = (value, decimals = 2) => {
  if (value === undefined || value === null || isNaN(value)) return '0%';
  return `${Number(value).toFixed(decimals)}%`;
};

// Status indicator component
const StatusIndicator = ({ status, label }) => {
  const colors = {
    running: 'bg-green-500',
    stopped: 'bg-gray-500',
    halted: 'bg-yellow-500',
    killed: 'bg-red-500',
    error: 'bg-red-500',
  };

  return (
    <div className="flex items-center gap-1.5">
      <span className={`w-2 h-2 rounded-full ${colors[status] || 'bg-gray-500'} ${status === 'running' ? 'animate-pulse' : ''}`} />
      <span className="text-[10px] text-gray-400 uppercase">{label}</span>
    </div>
  );
};

// Cost breakdown component
const CostBreakdown = ({ costs }) => {
  if (!costs) return null;

  const breakdown = costs.breakdown || {};

  return (
    <div className="bg-gray-900/50 rounded p-2 border border-gray-800">
      <div className="text-[9px] text-gray-500 mb-1.5 font-bold">COST BREAKDOWN</div>
      <div className="space-y-1">
        {Object.entries(breakdown).map(([key, value]) => (
          <div key={key} className="flex justify-between text-[10px]">
            <span className="text-gray-500">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
            <span className="text-red-400 mono">-{formatCurrency(value)}</span>
          </div>
        ))}
        <div className="border-t border-gray-800 pt-1 flex justify-between text-[10px] font-bold">
          <span className="text-gray-400">Total Costs</span>
          <span className="text-red-400 mono">-{formatCurrency(costs.totalCosts)}</span>
        </div>
        <div className="flex justify-between text-[10px] font-bold">
          <span className="text-gray-400">Net Profit</span>
          <span className={costs.netProfit >= 0 ? 'text-green-400' : 'text-red-400'}>
            {costs.netProfit >= 0 ? '+' : ''}{formatCurrency(costs.netProfit)}
          </span>
        </div>
      </div>
    </div>
  );
};

// Equivalence badge component
const EquivalenceBadge = ({ equivalence }) => {
  if (!equivalence) return null;

  const colors = {
    IDENTICAL: 'bg-green-500/20 text-green-400 border-green-500/30',
    SIMILAR: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    DIFFERENT: 'bg-red-500/20 text-red-400 border-red-500/30',
    UNKNOWN: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
  };

  return (
    <span className={`text-[9px] px-1.5 py-0.5 rounded border ${colors[equivalence.result] || colors.UNKNOWN}`}>
      {equivalence.result} ({formatPercent(equivalence.confidence * 100, 0)})
    </span>
  );
};

// Risk meter component
const RiskMeter = ({ level, label }) => {
  const colors = {
    LOW: 'bg-green-500',
    MEDIUM: 'bg-yellow-500',
    HIGH: 'bg-red-500',
  };

  const widths = {
    LOW: '33%',
    MEDIUM: '66%',
    HIGH: '100%',
  };

  return (
    <div>
      <div className="flex justify-between text-[9px] mb-0.5">
        <span className="text-gray-500">{label}</span>
        <span className={level === 'HIGH' ? 'text-red-400' : level === 'MEDIUM' ? 'text-yellow-400' : 'text-green-400'}>
          {level}
        </span>
      </div>
      <div className="h-1 bg-gray-800 rounded overflow-hidden">
        <div className={`h-full ${colors[level] || 'bg-gray-500'}`} style={{ width: widths[level] || '0%' }} />
      </div>
    </div>
  );
};

// Opportunity card component
const OpportunityCard = ({ opportunity, onExecute, disabled }) => {
  const [expanded, setExpanded] = useState(false);

  if (!opportunity) return null;

  const { polymarket, kalshi, costs, equivalence, spreadPercent } = opportunity;

  return (
    <div className="bg-gray-900/50 rounded border border-gray-800 p-2 mb-2">
      {/* Header */}
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1 min-w-0">
          <div className="text-[10px] text-gray-500 truncate">{polymarket?.question?.slice(0, 60)}...</div>
          <div className="flex items-center gap-2 mt-1">
            <EquivalenceBadge equivalence={equivalence} />
            <span className={`text-xs font-bold ${costs?.netProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {costs?.netProfit >= 0 ? '+' : ''}{formatPercent(costs?.netProfitPercent)}
            </span>
          </div>
        </div>
      </div>

      {/* Price comparison */}
      <div className="grid grid-cols-2 gap-2 mb-2">
        <div className="bg-gray-800/50 rounded p-1.5">
          <div className="text-[8px] text-gray-600">POLYMARKET</div>
          <div className="text-[10px] text-white font-bold">{formatPercent(polymarket?.price * 100)}</div>
          <div className={`text-[9px] ${polymarket?.action === 'BUY' ? 'text-green-400' : 'text-red-400'}`}>
            {polymarket?.action}
          </div>
        </div>
        <div className="bg-gray-800/50 rounded p-1.5">
          <div className="text-[8px] text-gray-600">KALSHI</div>
          <div className="text-[10px] text-white font-bold">{formatPercent(kalshi?.price * 100)}</div>
          <div className={`text-[9px] ${kalshi?.action === 'BUY' ? 'text-green-400' : 'text-red-400'}`}>
            {kalshi?.action}
          </div>
        </div>
      </div>

      {/* Spread indicator */}
      <div className="flex items-center justify-between text-[10px] mb-2">
        <span className="text-gray-500">Gross Spread</span>
        <span className="text-orange-400 font-bold">{formatPercent(spreadPercent)}</span>
      </div>

      {/* Expandable details */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="text-[9px] text-gray-500 hover:text-gray-300 w-full text-left"
      >
        {expanded ? '▼ Hide Details' : '▶ Show Details'}
      </button>

      {expanded && (
        <div className="mt-2 space-y-2">
          <CostBreakdown costs={costs} />

          {/* Risk factors */}
          {equivalence?.risks?.length > 0 && (
            <div className="bg-gray-900/50 rounded p-2 border border-gray-800">
              <div className="text-[9px] text-gray-500 mb-1.5 font-bold">RISK FACTORS</div>
              {equivalence.risks.map((risk, idx) => (
                <div key={idx} className="text-[9px] text-yellow-400 mb-0.5">
                  ⚠ {risk.description}
                </div>
              ))}
            </div>
          )}

          {/* Basis risk */}
          {equivalence?.basisRisk && (
            <div className="bg-gray-900/50 rounded p-2 border border-gray-800">
              <div className="text-[9px] text-gray-500 mb-1.5 font-bold">BASIS RISK</div>
              <div className="text-[10px] text-gray-400">
                Mismatch probability: <span className="text-white">{formatPercent(equivalence.basisRisk.mismatchProbability * 100)}</span>
              </div>
              <div className="text-[10px] text-gray-400">
                Expected loss: <span className="text-red-400">{formatPercent(equivalence.basisRisk.expectedLossPercent)}</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Execute button */}
      <button
        onClick={() => onExecute?.(opportunity)}
        disabled={disabled || !costs?.isProfitable}
        className={`w-full mt-2 py-1.5 text-[10px] font-bold rounded transition-colors ${
          disabled || !costs?.isProfitable
            ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
            : 'bg-orange-500/20 text-orange-400 border border-orange-500/30 hover:bg-orange-500/30'
        }`}
      >
        {!costs?.isProfitable ? 'NOT PROFITABLE' : disabled ? 'TRADING DISABLED' : 'EXECUTE ARB'}
      </button>
    </div>
  );
};

// Main panel component
export const PredictionArbPanel = ({ bot }) => {
  const [state, setState] = useState({
    isRunning: false,
    isKilled: false,
    isHalted: false,
    opportunities: [],
    trades: [],
    stats: {},
  });
  const [activeTab, setActiveTab] = useState('opportunities');

  useEffect(() => {
    if (!bot) return;

    const unsubscribe = bot.subscribe((newState) => {
      setState(newState);
    });

    setState(bot.getState());
    return unsubscribe;
  }, [bot]);

  const handleExecute = async (opportunity) => {
    if (!bot) return;
    try {
      await bot.executeOpportunity(opportunity);
    } catch (error) {
      console.error('Execution failed:', error);
    }
  };

  const handleStart = () => bot?.start(15000);
  const handleStop = () => bot?.stop();
  const handleKillSwitch = () => bot?.killSwitch?.kill('Manual activation');
  const handleResetCircuitBreakers = () => bot?.resetCircuitBreakers();

  // Determine overall status
  const status = state.isKilled ? 'killed' :
    state.isHalted ? 'halted' :
      state.isRunning ? 'running' : 'stopped';

  return (
    <div className="terminal-panel h-full flex flex-col">
      <PanelHeader
        title="PREDICTION MARKET ARB"
        subtitle="Polymarket ↔ Kalshi"
        actions={
          <StatusIndicator status={status} label={status.toUpperCase()} />
        }
      />

      {/* Status bar */}
      {(state.isKilled || state.isHalted) && (
        <div className={`px-2 py-1.5 text-[10px] ${state.isKilled ? 'bg-red-500/20 text-red-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
          {state.isKilled ? '🚨 KILL SWITCH ACTIVE - Manual reset required' :
            `⚠️ HALTED: ${state.haltReason}`}
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-gray-800">
        {['opportunities', 'trades', 'controls', 'config'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-1.5 text-[9px] font-bold uppercase ${
              activeTab === tab
                ? 'text-orange-400 border-b-2 border-orange-400'
                : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-2">
        {activeTab === 'opportunities' && (
          <div>
            {state.opportunities?.length === 0 ? (
              <div className="text-center py-8 text-gray-500 text-xs">
                {state.isRunning ? 'Scanning for opportunities...' : 'Start the bot to scan'}
              </div>
            ) : (
              state.opportunities.map((opp, idx) => (
                <OpportunityCard
                  key={opp.id || idx}
                  opportunity={opp}
                  onExecute={handleExecute}
                  disabled={!state.isRunning || state.isKilled || state.isHalted}
                />
              ))
            )}
          </div>
        )}

        {activeTab === 'trades' && (
          <div>
            {state.trades?.length === 0 ? (
              <div className="text-center py-8 text-gray-500 text-xs">
                No trades executed yet
              </div>
            ) : (
              state.trades.slice().reverse().map((trade, idx) => (
                <div key={trade.id || idx} className="bg-gray-900/50 rounded p-2 mb-2 border border-gray-800">
                  <div className="flex justify-between items-start mb-1">
                    <span className="text-[10px] text-gray-400">
                      {new Date(trade.executedAt).toLocaleTimeString()}
                    </span>
                    <Tag type={trade.profit >= 0 ? 'buy' : 'sell'}>
                      {trade.status}
                    </Tag>
                  </div>
                  <div className="text-xs font-bold text-white truncate mb-1">
                    {trade.opportunity?.polymarket?.question?.slice(0, 50)}...
                  </div>
                  <div className="flex justify-between text-[10px]">
                    <span className="text-gray-500">Profit</span>
                    <span className={trade.profit >= 0 ? 'text-green-400' : 'text-red-400'}>
                      {trade.profit >= 0 ? '+' : ''}{formatCurrency(trade.profit)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'controls' && (
          <div className="space-y-3">
            {/* Main controls */}
            <div className="flex gap-2">
              <button
                onClick={handleStart}
                disabled={state.isRunning || state.isKilled}
                className={`flex-1 py-2 text-xs font-bold rounded ${
                  state.isRunning || state.isKilled
                    ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                    : 'bg-green-500/20 text-green-400 border border-green-500/30 hover:bg-green-500/30'
                }`}
              >
                START
              </button>
              <button
                onClick={handleStop}
                disabled={!state.isRunning}
                className={`flex-1 py-2 text-xs font-bold rounded ${
                  !state.isRunning
                    ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                    : 'bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30'
                }`}
              >
                STOP
              </button>
            </div>

            {/* Kill switch */}
            <button
              onClick={handleKillSwitch}
              disabled={state.isKilled}
              className="w-full py-2 text-xs font-bold rounded bg-red-600/30 text-red-400 border border-red-500/50 hover:bg-red-600/50"
            >
              🚨 KILL SWITCH
            </button>

            {/* Reset circuit breakers */}
            {state.isHalted && (
              <button
                onClick={handleResetCircuitBreakers}
                className="w-full py-2 text-xs font-bold rounded bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 hover:bg-yellow-500/30"
              >
                Reset Circuit Breakers
              </button>
            )}

            {/* Stats */}
            <div className="bg-gray-900/50 rounded p-2 border border-gray-800">
              <div className="text-[9px] text-gray-500 mb-2 font-bold">SESSION STATS</div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <div className="text-[9px] text-gray-500">Scans</div>
                  <div className="text-sm font-bold text-white">{state.stats?.totalScans || 0}</div>
                </div>
                <div>
                  <div className="text-[9px] text-gray-500">Opportunities</div>
                  <div className="text-sm font-bold text-orange-400">{state.stats?.opportunitiesFound || 0}</div>
                </div>
                <div>
                  <div className="text-[9px] text-gray-500">Trades</div>
                  <div className="text-sm font-bold text-blue-400">{state.stats?.tradesExecuted || 0}</div>
                </div>
                <div>
                  <div className="text-[9px] text-gray-500">Total Profit</div>
                  <div className={`text-sm font-bold ${(state.stats?.totalProfit || 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {formatCurrency(state.stats?.totalProfit || 0)}
                  </div>
                </div>
              </div>
            </div>

            {/* Risk indicators */}
            <div className="bg-gray-900/50 rounded p-2 border border-gray-800">
              <div className="text-[9px] text-gray-500 mb-2 font-bold">RISK STATUS</div>
              <div className="space-y-2">
                <div className="flex justify-between text-[10px]">
                  <span className="text-gray-500">Unpaired Exposure</span>
                  <span className="text-white">{formatCurrency(state.unpairedExposure || 0)}</span>
                </div>
                <div className="flex justify-between text-[10px]">
                  <span className="text-gray-500">Reconciliation</span>
                  <span className={state.hasMismatches ? 'text-red-400' : 'text-green-400'}>
                    {state.hasMismatches ? 'MISMATCH' : 'OK'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'config' && (
          <div className="space-y-3">
            <div className="bg-gray-900/50 rounded p-2 border border-gray-800">
              <div className="text-[9px] text-gray-500 mb-2 font-bold">PROFITABILITY</div>
              <div className="space-y-2 text-[10px]">
                <div className="flex justify-between">
                  <span className="text-gray-500">Min Net Profit</span>
                  <span className="text-white">{formatPercent(state.config?.minNetProfitPercent || 0.5)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Min Gross Spread</span>
                  <span className="text-white">{formatPercent(state.config?.minGrossProfitPercent || 1)}</span>
                </div>
              </div>
            </div>

            <div className="bg-gray-900/50 rounded p-2 border border-gray-800">
              <div className="text-[9px] text-gray-500 mb-2 font-bold">POSITION LIMITS</div>
              <div className="space-y-2 text-[10px]">
                <div className="flex justify-between">
                  <span className="text-gray-500">Max Per Market</span>
                  <span className="text-white">{formatCurrency(state.config?.maxPositionPerMarket || 5000)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Max Total Exposure</span>
                  <span className="text-white">{formatCurrency(state.config?.maxTotalExposure || 25000)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Max Daily Loss</span>
                  <span className="text-white">{formatCurrency(state.config?.maxDailyLoss || 1000)}</span>
                </div>
              </div>
            </div>

            <div className="bg-gray-900/50 rounded p-2 border border-gray-800">
              <div className="text-[9px] text-gray-500 mb-2 font-bold">COSTS (Estimated)</div>
              <div className="space-y-2 text-[10px]">
                <div className="flex justify-between">
                  <span className="text-gray-500">Polymarket Gas</span>
                  <span className="text-white">{formatCurrency(state.config?.costs?.polymarketGas || 5)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Kalshi Fee Rate</span>
                  <span className="text-white">{formatPercent((state.config?.costs?.kalshiFeeRate || 0.07) * 100)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Stablecoin Conv.</span>
                  <span className="text-white">{formatPercent((state.config?.costs?.stablecoinConversion || 0.003) * 100)}</span>
                </div>
              </div>
            </div>

            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded p-2">
              <div className="text-[9px] text-yellow-400 font-bold mb-1">⚠️ SIMULATION MODE</div>
              <div className="text-[9px] text-yellow-200/70">
                Real trading requires API credentials. Currently running in simulation mode.
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PredictionArbPanel;
