import { useState, useEffect } from 'react';
import { PanelHeader } from '../PanelHeader';
import { DataRow } from '../DataRow';
import { MonteCarloChart } from '../MonteCarloChart';
import { QuantEngine } from '../../utils/quantEngine';

// ============================================
// BEGINNER-FRIENDLY MONTE CARLO PANEL
// Plain English labels with explanatory tooltips
// ============================================

// Tooltip component for explanations
const Tip = ({ children, explanation }) => {
  const [show, setShow] = useState(false);
  return (
    <span
      className="relative cursor-help"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      {children}
      <span className="ml-0.5 text-gray-500 text-[8px]">ⓘ</span>
      {show && (
        <span className="absolute z-50 bottom-full left-0 mb-1 w-44 p-2 bg-gray-800 border border-gray-700 rounded shadow-lg text-[10px] text-gray-300 leading-relaxed">
          {explanation}
        </span>
      )}
    </span>
  );
};

// Plain English explanations
const EXPLANATIONS = {
  simulation: "We simulated 5,000 different scenarios to see what might happen. Each line shows one possible outcome.",
  avgReturn: "The average profit or loss across all simulations. Positive = you'd typically make money.",
  median: "The 'middle' outcome - half the simulations were better, half were worse. Often more realistic than average.",
  riskScore: "How good is this bet compared to the risk? Higher = better. Above 1.0 is generally considered good.",
  volatility: "How much results vary. High volatility = unpredictable outcomes. Low = more consistent.",
  worstCase: "In the worst 5% of scenarios, you'd lose at least this much. Helps you understand your downside risk.",
  winChance: "The percentage of simulations where you made a profit. Above 50% = more likely to win than lose.",
  percentiles: "Range of possible outcomes. 5% = bad scenario, 50% = typical, 95% = good scenario."
};

// Validate probability
const isValidProbability = (prob) => {
  return typeof prob === 'number' && !isNaN(prob) && prob >= 0 && prob <= 1;
};

export const MonteCarloPanel = ({ market }) => {
  const [simulation, setSimulation] = useState(null);
  const [error, setError] = useState(null);
  const [showHelp, setShowHelp] = useState(false);

  useEffect(() => {
    if (!market) {
      setSimulation(null);
      setError(null);
      return;
    }

    if (!isValidProbability(market.market_prob) || !isValidProbability(market.model_prob)) {
      setError('Invalid probability data');
      setSimulation(null);
      return;
    }

    try {
      const result = QuantEngine.monteCarlo(
        market.market_prob,
        market.model_prob
      );

      if (!result || !result.stats || !result.paths) {
        setError('Simulation failed');
        setSimulation(null);
        return;
      }

      setSimulation(result);
      setError(null);
    } catch (err) {
      console.warn('Monte Carlo simulation failed:', err);
      setError('Simulation error');
      setSimulation(null);
    }
  }, [market]);

  if (!market) {
    return (
      <div className="terminal-panel h-full flex items-center justify-center text-gray-600 text-xs">
        Select a market
      </div>
    );
  }

  if (error) {
    return (
      <div className="terminal-panel h-full flex items-center justify-center text-gray-500 text-xs">
        {error}
      </div>
    );
  }

  if (!simulation) {
    return (
      <div className="terminal-panel h-full flex items-center justify-center text-gray-600 text-xs">
        Running simulation...
      </div>
    );
  }

  const s = simulation.stats;

  // Interpret results for beginners
  const getOverallVerdict = () => {
    if (s.expectedReturn > 5 && s.probProfit > 55 && s.sharpeRatio > 0.5) {
      return { text: "Looks promising", color: "text-green-400", emoji: "✓" };
    } else if (s.expectedReturn < -5 || s.probProfit < 45) {
      return { text: "High risk", color: "text-red-400", emoji: "⚠" };
    } else {
      return { text: "Moderate", color: "text-yellow-400", emoji: "~" };
    }
  };

  const verdict = getOverallVerdict();

  return (
    <div className="terminal-panel h-full flex flex-col">
      <PanelHeader
        title="MONTE CARLO"
        subtitle="5,000 simulated scenarios"
        actions={
          <button
            onClick={() => setShowHelp(!showHelp)}
            className={`text-[9px] px-1.5 py-0.5 rounded transition-colors ${
              showHelp ? 'bg-orange-500/20 text-orange-400' : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            {showHelp ? 'Hide Help' : '? Help'}
          </button>
        }
      />
      <div className="panel-content flex-1 flex flex-col">
        {/* Help Panel */}
        {showHelp && (
          <div className="bg-blue-500/10 border border-blue-500/20 rounded p-2 mx-2 mt-1 mb-2">
            <div className="text-[10px] text-blue-400 font-bold mb-1">What is this?</div>
            <div className="text-[9px] text-gray-400 leading-relaxed">
              {EXPLANATIONS.simulation}
              <br /><br />
              <span className="text-green-400">Green lines</span> = profitable scenarios.
              <span className="text-red-400 ml-1">Red lines</span> = losing scenarios.
              <span className="text-orange-400 ml-1">Orange</span> = typical outcome.
            </div>
          </div>
        )}

        {/* Chart */}
        <div className="h-20 px-1">
          <MonteCarloChart paths={simulation.paths} />
        </div>

        {/* Quick Verdict */}
        <div className={`mx-2 my-1 px-2 py-1.5 rounded border ${
          verdict.color === 'text-green-400' ? 'bg-green-500/10 border-green-500/20' :
          verdict.color === 'text-red-400' ? 'bg-red-500/10 border-red-500/20' :
          'bg-yellow-500/10 border-yellow-500/20'
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-gray-500">Quick Assessment:</span>
            <span className={`text-[11px] font-bold ${verdict.color}`}>
              {verdict.emoji} {verdict.text}
            </span>
          </div>
        </div>

        {/* Stats Grid - Plain English */}
        <div className="px-2 pb-2 border-t border-gray-800 flex-1">
          <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 mt-1">
            <div className="flex items-center justify-between text-[10px]">
              <Tip explanation={EXPLANATIONS.avgReturn}>
                <span className="text-gray-500">Avg Profit/Loss</span>
              </Tip>
              <span className={s.expectedReturn >= 0 ? 'text-green-400 font-bold' : 'text-red-400 font-bold'}>
                {s.expectedReturn >= 0 ? '+' : ''}{s.expectedReturn.toFixed(1)}%
              </span>
            </div>

            <div className="flex items-center justify-between text-[10px]">
              <Tip explanation={EXPLANATIONS.median}>
                <span className="text-gray-500">Typical Result</span>
              </Tip>
              <span className={s.medianReturn >= 0 ? 'text-green-400 font-bold' : 'text-red-400 font-bold'}>
                {s.medianReturn >= 0 ? '+' : ''}{s.medianReturn.toFixed(1)}%
              </span>
            </div>

            <div className="flex items-center justify-between text-[10px]">
              <Tip explanation={EXPLANATIONS.riskScore}>
                <span className="text-gray-500">Risk Score</span>
              </Tip>
              <span className={s.sharpeRatio > 1 ? 'text-green-400 font-bold' : s.sharpeRatio > 0.5 ? 'text-yellow-400 font-bold' : 'text-gray-400 font-bold'}>
                {s.sharpeRatio.toFixed(2)} {s.sharpeRatio > 1 ? '(Good)' : s.sharpeRatio > 0.5 ? '(OK)' : '(Low)'}
              </span>
            </div>

            <div className="flex items-center justify-between text-[10px]">
              <Tip explanation={EXPLANATIONS.volatility}>
                <span className="text-gray-500">Volatility</span>
              </Tip>
              <span className={s.stdDev < 15 ? 'text-green-400' : s.stdDev < 30 ? 'text-yellow-400' : 'text-red-400'}>
                {s.stdDev.toFixed(1)}% {s.stdDev < 15 ? '(Low)' : s.stdDev < 30 ? '(Med)' : '(High)'}
              </span>
            </div>

            <div className="flex items-center justify-between text-[10px]">
              <Tip explanation={EXPLANATIONS.worstCase}>
                <span className="text-gray-500">Worst Case (5%)</span>
              </Tip>
              <span className="text-red-400 font-bold">
                {s.var95.toFixed(1)}%
              </span>
            </div>

            <div className="flex items-center justify-between text-[10px]">
              <Tip explanation={EXPLANATIONS.winChance}>
                <span className="text-gray-500">Win Chance</span>
              </Tip>
              <span className={s.probProfit > 55 ? 'text-green-400 font-bold' : s.probProfit > 45 ? 'text-yellow-400 font-bold' : 'text-red-400 font-bold'}>
                {s.probProfit.toFixed(0)}%
              </span>
            </div>
          </div>

          {/* Percentile Range */}
          <div className="mt-2 pt-2 border-t border-gray-800">
            <Tip explanation={EXPLANATIONS.percentiles}>
              <div className="text-[9px] text-gray-600 mb-1">OUTCOME RANGE</div>
            </Tip>
            <div className="flex justify-between text-[9px] mono">
              <span className="text-red-400">Bad: {s.percentile5.toFixed(0)}%</span>
              <span className="text-gray-400">Typical: {s.medianReturn >= 0 ? '+' : ''}{s.medianReturn.toFixed(0)}%</span>
              <span className="text-green-400">Good: +{s.percentile95.toFixed(0)}%</span>
            </div>
            {/* Visual range bar */}
            <div className="mt-1 h-1.5 bg-gray-800 rounded-full overflow-hidden flex">
              <div className="bg-red-500/50" style={{ width: '15%' }} />
              <div className="bg-yellow-500/50" style={{ width: '35%' }} />
              <div className="bg-green-500/50" style={{ width: '35%' }} />
              <div className="bg-green-400/50" style={{ width: '15%' }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
