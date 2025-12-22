import { useState } from 'react';
import { PanelHeader } from '../PanelHeader';
import { DataRow } from '../DataRow';
import { QuantEngine } from '../../utils/quantEngine';

export const BuySellPanel = ({ market }) => {
  const [side, setSide] = useState("YES");
  const [size, setSize] = useState(1000);

  if (!market) {
    return (
      <div className="terminal-panel h-full flex items-center justify-center text-gray-600 text-xs">
        Select a market
      </div>
    );
  }

  const ev = QuantEngine.expectedValue(market.model_prob, market.market_prob, size);
  const kelly = QuantEngine.kelly(market.model_prob, market.market_prob);

  return (
    <div className="terminal-panel h-full">
      <PanelHeader title="BUY / SELL" subtitle="Analysis Only" />
      <div className="panel-content p-2 text-xs">
        <div className="flex gap-2 mb-3">
          <button
            className={`flex-1 btn ${side === "YES" ? "primary" : ""}`}
            onClick={() => setSide("YES")}
          >
            Buy YES
          </button>
          <button
            className={`flex-1 btn ${side === "NO" ? "danger" : ""}`}
            onClick={() => setSide("NO")}
          >
            Buy NO
          </button>
        </div>

        <div className="mb-3">
          <div className="flex justify-between mb-1">
            <span className="text-gray-500">Size (USD)</span>
            <span className="mono">${size}</span>
          </div>
          <input
            type="range"
            min="100"
            max="5000"
            step="100"
            value={size}
            onChange={(e) => setSize(parseInt(e.target.value, 10))}
            className="w-full"
          />
          <div className="flex justify-between mt-1 text-[10px] text-gray-500">
            <span>$100</span>
            <span>$2500</span>
            <span>$5k</span>
          </div>
        </div>

        <div className="border-t border-gray-800 pt-2 space-y-1">
          <DataRow
            label="Market Prob"
            value={`${(market.market_prob * 100).toFixed(1)}%`}
          />
          <DataRow
            label="Model Prob"
            value={`${(market.model_prob * 100).toFixed(1)}%`}
            type="info"
          />
          <DataRow
            label="Edge"
            value={`${(
              (market.model_prob - market.market_prob) * 100
            ).toFixed(1)}%`}
            type={
              market.model_prob > market.market_prob
                ? "positive"
                : "negative"
            }
          />
          <DataRow
            label="EV on Size"
            value={`${ev.ev >= 0 ? "+" : ""}$${ev.ev.toFixed(2)}`}
            type={ev.ev > 0 ? "positive" : "negative"}
          />
          <DataRow
            label="Kelly (full)"
            value={`${(kelly.full * 100).toFixed(1)}%`}
          />
          <DataRow
            label="Kelly (¼)"
            value={`${(kelly.quarter * 100).toFixed(1)}%`}
            type="highlight"
          />
        </div>

        <div className="mt-3 pt-2 border-t border-gray-800 text-[10px] text-gray-500 leading-snug">
          ⚠ This panel is for sizing and edge analysis only. Leet Quantum
          Terminal does not execute orders on Polymarket or Kalshi.
        </div>
      </div>
    </div>
  );
};

