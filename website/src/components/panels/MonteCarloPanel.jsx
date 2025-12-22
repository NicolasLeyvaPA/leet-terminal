import { useState, useEffect } from 'react';
import { PanelHeader } from '../PanelHeader';
import { DataRow } from '../DataRow';
import { MonteCarloChart } from '../MonteCarloChart';
import { QuantEngine } from '../../utils/quantEngine';

export const MonteCarloPanel = ({ market }) => {
  const [simulation, setSimulation] = useState(null);

  useEffect(() => {
    if (market) {
      const result = QuantEngine.monteCarlo(
        market.market_prob,
        market.model_prob
      );
      setSimulation(result);
    }
  }, [market]);

  if (!market || !simulation)
    return (
      <div className="terminal-panel h-full flex items-center justify-center text-gray-600 text-xs">
        Select a market
      </div>
    );

  const s = simulation.stats;

  return (
    <div className="terminal-panel h-full">
      <PanelHeader
        title="MONTE CARLO"
        subtitle="5k sims × 100 trades"
      />
      <div className="panel-content">
        <div className="p-2">
          <MonteCarloChart paths={simulation.paths} height={120} />
        </div>
        <div className="px-2 pb-2 border-t border-gray-800">
          <div className="grid grid-cols-2 gap-x-3 mt-2">
            <DataRow
              label="E[Return]"
              value={`${s.expectedReturn >= 0 ? "+" : ""}${s.expectedReturn.toFixed(1)}%`}
              type={s.expectedReturn > 0 ? "positive" : "negative"}
            />
            <DataRow
              label="Median"
              value={`${s.medianReturn >= 0 ? "+" : ""}${s.medianReturn.toFixed(1)}%`}
              type={s.medianReturn > 0 ? "positive" : "negative"}
            />
            <DataRow
              label="Sharpe"
              value={s.sharpeRatio.toFixed(2)}
            />
            <DataRow
              label="Std Dev"
              value={`${s.stdDev.toFixed(1)}%`}
            />
            <DataRow
              label="VaR 95%"
              value={`${s.var95.toFixed(1)}%`}
              type="negative"
            />
            <DataRow
              label="CVaR 95%"
              value={`${s.cvar95.toFixed(1)}%`}
              type="negative"
            />
            <DataRow
              label="P(Profit)"
              value={`${s.probProfit.toFixed(1)}%`}
              type={s.probProfit > 50 ? "positive" : "negative"}
            />
            <DataRow
              label="Max DD"
              value={`-${s.avgMaxDrawdown.toFixed(1)}%`}
              type="negative"
            />
          </div>
          <div className="mt-2 pt-2 border-t border-gray-800">
            <div className="text-xs text-gray-600 mb-1">
              PERCENTILES
            </div>
            <div className="flex justify-between text-xs mono">
              <span className="negative">
                5%: {s.percentile5.toFixed(0)}
              </span>
              <span className="neutral">
                25%: {s.percentile25.toFixed(0)}
              </span>
              <span className="text-gray-400">
                50%: {s.medianReturn.toFixed(0)}
              </span>
              <span className="info">
                75%: {s.percentile75.toFixed(0)}
              </span>
              <span className="positive">
                95%: +{s.percentile95.toFixed(0)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

