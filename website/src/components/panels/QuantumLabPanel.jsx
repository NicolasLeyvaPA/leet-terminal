import { useState } from 'react';
import { PanelHeader } from '../PanelHeader';
import { QuantEngine } from '../../utils/quantEngine';

export const QuantumLabPanel = ({ markets }) => {
  const [result, setResult] = useState(null);
  const [running, setRunning] = useState(false);

  const runOptimization = () => {
    setRunning(true);
    setTimeout(() => {
      const res = QuantEngine.quantumOptimize(
        markets.filter((m) => m.model_prob - m.market_prob > 0.02)
      );
      setResult(res);
      setRunning(false);
    }, 1000);
  };

  return (
    <div className="terminal-panel h-full quantum-glow">
      <PanelHeader title="⚛ QUANTUM LAB" subtitle="Experimental" />
      <div className="panel-content p-2">
        <div className="text-xs text-purple-400 mb-2">
          Quantum-Inspired Portfolio Optimization
        </div>
        <div className="text-xs text-gray-500 mb-3">
          Uses simulated quantum annealing to find optimal position allocations
          across markets with positive edge.
        </div>

        <button
          onClick={runOptimization}
          disabled={running}
          className={`btn w-full mb-3 ${running ? "" : "primary"}`}
        >
          {running
            ? "⚛ Running Quantum Optimization..."
            : "⚛ Run Optimization"}
        </button>

        {result && (
          <div>
            <div className="text-xs text-gray-600 mb-1">
              OPTIMAL ALLOCATION
            </div>
            {Object.entries(result.allocation).map(([ticker, alloc]) => (
              <div
                key={ticker}
                className="flex justify-between text-xs py-1 border-b border-gray-900"
              >
                <span className="text-purple-400">{ticker}</span>
                <span className="mono">
                  {(alloc * 100).toFixed(1)}%
                </span>
              </div>
            ))}
            <div className="flex justify-between text-xs mt-2 pt-2 border-t border-gray-800">
              <span className="text-gray-500">
                Expected Edge Score
              </span>
              <span className="mono positive">
                +{result.score.toFixed(2)}%
              </span>
            </div>
          </div>
        )}

        <div className="mt-3 pt-3 border-t border-gray-800 text-xs text-gray-600">
          ⚠️ Experimental feature. Results are for research purposes only.
        </div>
      </div>
    </div>
  );
};

