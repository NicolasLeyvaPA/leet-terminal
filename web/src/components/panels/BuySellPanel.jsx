import { useState } from 'react';
import { PanelHeader } from '../PanelHeader';
import { QuantEngine } from '../../utils/quantEngine';

export const BuySellPanel = ({ market }) => {
  const [side, setSide] = useState("YES");
  const [size, setSize] = useState(100);

  if (!market) {
    return (
      <div className="terminal-panel h-full flex items-center justify-center text-gray-600 text-xs">
        Select a market
      </div>
    );
  }

  // Safe validation
  const marketProb = typeof market.market_prob === 'number' ? market.market_prob : 0.5;
  const modelProb = typeof market.model_prob === 'number' ? market.model_prob : 0.5;
  const validSize = Math.max(0, size || 0);

  // Calculate potential profit (to win)
  const price = side === "YES" ? marketProb : (1 - marketProb);
  const contracts = validSize / price;
  const potentialWin = contracts * (1 - price); // Profit if correct

  // Expected value based on model
  let ev = { ev: 0 };
  let kelly = { full: 0, quarter: 0 };
  try {
    ev = QuantEngine.expectedValue(modelProb, marketProb, validSize) || { ev: 0 };
    kelly = QuantEngine.kelly(modelProb, marketProb) || { full: 0, quarter: 0 };
  } catch {
    // Use defaults
  }

  const edge = modelProb - marketProb;

  const handleSizeChange = (e) => {
    const value = e.target.value.replace(/[^0-9]/g, '');
    setSize(value === '' ? 0 : parseInt(value, 10));
  };

  return (
    <div className="terminal-panel h-full flex flex-col">
      <PanelHeader title="SIMULATOR" subtitle="LEET QUANTUM" />
      <div className="panel-content p-2 text-xs flex-1 flex flex-col">
        {/* Side Selection */}
        <div className="flex gap-1 mb-2">
          <button
            className={`flex-1 py-1.5 rounded text-xs font-bold transition-all ${
              side === "YES"
                ? "bg-green-500 text-black"
                : "bg-gray-800 text-gray-400 hover:bg-gray-700"
            }`}
            onClick={() => setSide("YES")}
          >
            YES
          </button>
          <button
            className={`flex-1 py-1.5 rounded text-xs font-bold transition-all ${
              side === "NO"
                ? "bg-red-500 text-black"
                : "bg-gray-800 text-gray-400 hover:bg-gray-700"
            }`}
            onClick={() => setSide("NO")}
          >
            NO
          </button>
        </div>

        {/* Investment Input */}
        <div className="mb-2">
          <label className="text-[10px] text-gray-500 block mb-1">INVESTMENT</label>
          <div className="relative">
            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500">$</span>
            <input
              type="text"
              value={size}
              onChange={handleSizeChange}
              className="w-full bg-black border border-gray-700 rounded px-2 py-1.5 pl-5 text-sm mono text-white focus:border-orange-500 focus:outline-none"
              placeholder="Enter amount"
            />
          </div>
        </div>

        {/* TO WIN - Main highlight */}
        <div className="bg-gradient-to-r from-green-500/20 to-green-500/5 border border-green-500/30 rounded p-2 mb-2">
          <div className="text-[10px] text-green-400 mb-0.5">IF CORRECT, YOU WIN</div>
          <div className="text-xl font-bold text-green-400 mono">
            +${potentialWin.toFixed(2)}
          </div>
          <div className="text-[10px] text-gray-500 mt-0.5">
            {(contracts).toFixed(1)} contracts @ {(price * 100).toFixed(1)}¢
          </div>
        </div>

        {/* Key Metrics */}
        <div className="space-y-1 flex-1">
          <div className="flex justify-between items-center py-0.5">
            <span className="text-gray-500 text-[10px]">Current Price</span>
            <span className="mono text-white">{(price * 100).toFixed(1)}¢</span>
          </div>
          <div className="flex justify-between items-center py-0.5">
            <span className="text-gray-500 text-[10px]">Model Fair Value</span>
            <span className="mono text-blue-400">{(modelProb * 100).toFixed(1)}¢</span>
          </div>
          <div className="flex justify-between items-center py-0.5">
            <span className="text-gray-500 text-[10px]">Edge</span>
            <span className={`mono font-medium ${edge > 0 ? 'text-green-400' : 'text-red-400'}`}>
              {edge > 0 ? '+' : ''}{(edge * 100).toFixed(1)}%
            </span>
          </div>
          <div className="flex justify-between items-center py-0.5">
            <span className="text-gray-500 text-[10px]">Expected Value</span>
            <span className={`mono font-medium ${(ev.ev || 0) > 0 ? 'text-green-400' : 'text-red-400'}`}>
              {(ev.ev || 0) >= 0 ? '+' : ''}${(ev.ev || 0).toFixed(2)}
            </span>
          </div>
          <div className="flex justify-between items-center py-0.5">
            <span className="text-gray-500 text-[10px]">Kelly Suggested</span>
            <span className="mono text-orange-400">{((kelly.quarter || 0) * 100).toFixed(1)}%</span>
          </div>
        </div>

        {/* Disclaimer */}
        <div className="mt-2 pt-2 border-t border-gray-800 text-[9px] text-gray-600 leading-tight">
          Analysis only • No execution
        </div>
      </div>
    </div>
  );
};

