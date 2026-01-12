import { useState, useEffect, useMemo } from 'react';
import { PanelHeader } from '../PanelHeader';
import { Tag } from '../Tag';

// ============================================
// BEGINNER-FRIENDLY TOOLTIPS & EXPLANATIONS
// ============================================

// Tooltip component for hover explanations
const Tooltip = ({ children, text, position = 'top' }) => {
  const [show, setShow] = useState(false);

  const positionClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-1',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-1',
    left: 'right-full top-1/2 -translate-y-1/2 mr-1',
    right: 'left-full top-1/2 -translate-y-1/2 ml-1',
  };

  return (
    <div
      className="relative inline-flex items-center"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      {children}
      <span className="ml-0.5 text-gray-500 cursor-help text-[8px]">ⓘ</span>
      {show && (
        <div className={`absolute ${positionClasses[position]} z-50 w-48 p-2 bg-gray-800 border border-gray-700 rounded shadow-lg text-[10px] text-gray-300 leading-relaxed`}>
          {text}
          <div className="absolute w-2 h-2 bg-gray-800 border-gray-700 transform rotate-45
            ${position === 'top' ? 'bottom-[-5px] left-1/2 -translate-x-1/2 border-r border-b' : ''}
            ${position === 'bottom' ? 'top-[-5px] left-1/2 -translate-x-1/2 border-l border-t' : ''}
          " />
        </div>
      )}
    </div>
  );
};

// Plain English explanations for key concepts
const EXPLANATIONS = {
  overround: "The market is charging too much! All options together cost more than 100%. Like paying $1.05 for a lottery that only pays $1.",
  underround: "A rare opportunity! All options together cost less than 100%. Like getting $1.05 lottery for $0.95.",
  probabilitySum: "Add up all the chances. In a fair market, they equal 100%. If higher = overpriced. If lower = underpriced.",
  deviation: "How far off from fair value (100%). A 5% deviation means the market is 5% overpriced or underpriced.",
  edge: "Your potential profit percentage before costs. Higher is better!",
  equivalence: "How well two markets match. IDENTICAL = same event, safe to trade. SIMILAR = likely same, some risk. DIFFERENT = don't trade.",
  basisRisk: "The chance that two seemingly identical markets settle differently. Lower is safer.",
  spreadProfit: "The difference between buy and sell prices. This is where arbitrage profit comes from.",
  netProfit: "Your actual profit after ALL costs (fees, gas, slippage). This is what matters!",
};

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

// Equivalence badge component - shows how well two markets match
const EquivalenceBadge = ({ equivalence }) => {
  if (!equivalence) return null;

  const colors = {
    IDENTICAL: 'bg-green-500/20 text-green-400 border-green-500/30',
    SIMILAR: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    DIFFERENT: 'bg-red-500/20 text-red-400 border-red-500/30',
    UNKNOWN: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
  };

  // Beginner-friendly labels
  const labels = {
    IDENTICAL: 'PERFECT MATCH',
    SIMILAR: 'LIKELY MATCH',
    DIFFERENT: 'NOT A MATCH',
    UNKNOWN: 'UNKNOWN',
  };

  const explanations = {
    IDENTICAL: "Both markets track the exact same event. Safe to trade!",
    SIMILAR: "Markets look similar but may have slight differences. Some risk.",
    DIFFERENT: "These markets are NOT the same event. Do NOT trade!",
    UNKNOWN: "Unable to verify if markets match. Proceed with caution.",
  };

  return (
    <Tooltip text={explanations[equivalence.result] || explanations.UNKNOWN} position="bottom">
      <span className={`text-[9px] px-1.5 py-0.5 rounded border ${colors[equivalence.result] || colors.UNKNOWN}`}>
        {labels[equivalence.result] || 'UNKNOWN'} ({formatPercent(equivalence.confidence * 100, 0)})
      </span>
    </Tooltip>
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

// Polymarket internal opportunity card (overround/underround)
// BEGINNER-FRIENDLY: This card shows when a market's prices don't add up correctly
const PolymarketOpportunityCard = ({ opportunity }) => {
  const [expanded, setExpanded] = useState(false);

  if (!opportunity) return null;

  const { market, type, totalProbability, deviationPercent, theoreticalEdge, action, venue, riskNote } = opportunity;
  const isOverround = type === 'OVERROUND';

  // Format total probability as percentage (1.05 → "105.0%")
  const totalProbDisplay = (totalProbability * 100).toFixed(1);

  // Plain English type label
  const typeLabel = isOverround ? 'OVERPRICED' : 'UNDERPRICED';
  const typeExplanation = isOverround ? EXPLANATIONS.overround : EXPLANATIONS.underround;

  return (
    <div className="bg-gray-900/50 rounded border border-gray-800 p-3 mb-2 hover:border-gray-700 transition-colors">
      {/* Header */}
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1 min-w-0">
          <div className="text-[11px] text-gray-300 font-medium truncate">{market?.question}</div>
          <div className="flex items-center gap-2 mt-1.5">
            <Tooltip text={typeExplanation} position="bottom">
              <span className={`text-[9px] px-1.5 py-0.5 rounded border font-bold ${
                isOverround
                  ? 'bg-red-500/20 text-red-400 border-red-500/30'
                  : 'bg-green-500/20 text-green-400 border-green-500/30'
              }`}>
                {typeLabel}
              </span>
            </Tooltip>
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-400 border border-purple-500/30">
              {market?.outcomes?.length || 0} OPTIONS
            </span>
          </div>
        </div>
        <div className="text-right">
          <Tooltip text={EXPLANATIONS.edge} position="left">
            <div className={`text-xl font-bold ${isOverround ? 'text-red-400' : 'text-green-400'}`}>
              {deviationPercent}%
            </div>
          </Tooltip>
          <div className="text-[9px] text-gray-500">potential profit</div>
        </div>
      </div>

      {/* Probability analysis - beginner-friendly labels */}
      <div className="bg-gray-800/50 rounded p-2 mb-2 space-y-1.5">
        <div className="flex justify-between text-[10px]">
          <Tooltip text={EXPLANATIONS.probabilitySum} position="right">
            <span className="text-gray-500">Total of all options</span>
          </Tooltip>
          <span className={totalProbability > 1 ? 'text-red-400 font-bold' : 'text-green-400 font-bold'}>
            {totalProbDisplay}%
          </span>
        </div>
        <div className="flex justify-between text-[10px]">
          <span className="text-gray-500">Should be</span>
          <span className="text-gray-400">100.0%</span>
        </div>
        <div className="flex justify-between text-[10px]">
          <Tooltip text={EXPLANATIONS.deviation} position="right">
            <span className="text-gray-500">Mispricing</span>
          </Tooltip>
          <span className={`font-bold ${isOverround ? 'text-red-400' : 'text-green-400'}`}>
            {isOverround ? '+' : '-'}{deviationPercent}%
          </span>
        </div>
      </div>

      {/* Strategy - what to do */}
      <div className="text-[10px] text-yellow-400 bg-yellow-500/10 rounded px-2 py-1.5 mb-2 border border-yellow-500/20">
        <span className="font-bold">💡 Strategy: </span>{action}
      </div>

      {/* Expandable outcomes */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="text-[9px] text-gray-500 hover:text-gray-300 w-full text-left flex items-center gap-1"
      >
        <span>{expanded ? '▼' : '▶'}</span>
        <span>See all {market?.outcomes?.length || 0} options and their prices</span>
      </button>

      {expanded && market?.outcomes && (
        <div className="mt-2 space-y-1 max-h-40 overflow-y-auto">
          {market.outcomes.map((outcome, idx) => (
            <div key={idx} className="flex justify-between text-[10px] bg-gray-800/30 rounded px-2 py-1">
              <span className="text-gray-400 truncate flex-1">{outcome.name}</span>
              <span className="text-white font-mono ml-2">{(outcome.probability * 100).toFixed(1)}%</span>
            </div>
          ))}
          <div className="border-t border-gray-700 pt-1 mt-1">
            <div className="flex justify-between text-[10px] font-bold">
              <span className="text-gray-400">TOTAL</span>
              <span className={totalProbability > 1 ? 'text-red-400' : 'text-green-400'}>
                {totalProbDisplay}%
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Risk note */}
      {riskNote && (
        <div className="mt-2 text-[9px] text-gray-500 italic">
          {riskNote}
        </div>
      )}
    </div>
  );
};

// Cross-venue opportunity card component (Polymarket ↔ Kalshi)
const OpportunityCard = ({ opportunity, onExecute, disabled }) => {
  const [expanded, setExpanded] = useState(false);

  if (!opportunity) return null;

  // Check if this is a Polymarket internal opportunity
  if (opportunity.venue === 'polymarket' && opportunity.type) {
    return <PolymarketOpportunityCard opportunity={opportunity} />;
  }

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
            {/* Data status */}
            <div className="bg-gray-900/50 rounded p-2 mb-2 border border-gray-800">
              <div className="flex justify-between text-[10px]">
                <span className="text-gray-500">Polymarket Markets</span>
                <span className="text-orange-400 font-bold">{state.polymarketCount || 0}</span>
              </div>
              <div className="flex justify-between text-[10px]">
                <span className="text-gray-500">Kalshi Markets</span>
                <span className="text-blue-400 font-bold">{state.kalshiCount || '--'}</span>
              </div>
              {state.dataReceivedAt && (
                <div className="flex justify-between text-[10px] mt-1">
                  <span className="text-gray-500">Data Age</span>
                  <span className={`${state.dataAge > 30000 ? 'text-yellow-400' : 'text-green-400'}`}>
                    {Math.round((state.dataAge || 0) / 1000)}s ago
                  </span>
                </div>
              )}
            </div>

            {state.opportunities?.length === 0 ? (
              <div className="text-center py-8 text-gray-500 text-xs">
                {state.polymarketCount === 0
                  ? 'Waiting for market data...'
                  : state.isRunning
                    ? 'Scanning for opportunities...'
                    : 'Click START to begin scanning'}
              </div>
            ) : (
              <>
                <div className="text-[9px] text-gray-500 mb-2">
                  Found {state.opportunities.length} potential opportunities
                </div>
                {state.opportunities.map((opp, idx) => (
                  <OpportunityCard
                    key={opp.id || idx}
                    opportunity={opp}
                    onExecute={handleExecute}
                    disabled={!state.isRunning || state.isKilled || state.isHalted}
                  />
                ))}
              </>
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
