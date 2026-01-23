import { useState } from 'react';
import { PriceChart } from './Visualization/DataChart';
import { MarketTradesPanel } from './panels/MarketTradesPanel';
import { BuySellPanel } from './panels/BuySellPanel';

export const MarketDetailDock = ({ market, show, onToggle }) => {
  const [mode, setMode] = useState("price");

  if (!market) return null;
  const heightClass = show ? "h-full" : "h-6";

  return (
    <div className={heightClass + " transition-all duration-200"}>
      <div className="terminal-panel h-full">
        <div
          className="panel-header flex items-center justify-between cursor-pointer"
          onClick={onToggle}
        >
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">DETAIL</span>
            <span className="mono text-orange-500">
              {market.ticker}
            </span>
            <span className="text-gray-500 text-[10px] truncate max-w-[260px]">
              {market.question}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex text-[10px] bg-black/40 rounded border border-gray-800 overflow-hidden">
              {["price", "events", "mc", "lhs"].map((m) => (
                <button
                  key={m}
                  onClick={(e) => {
                    e.stopPropagation();
                    setMode(m);
                  }}
                  className={`px-2 py-0.5 uppercase ${
                    mode === m
                      ? "bg-orange-500 text-black"
                      : "text-gray-500 hover:text-gray-200"
                  }`}
                >
                  {m === "price" && "Price"}
                  {m === "events" && "Key Pts"}
                  {m === "mc" && "Monte Carlo"}
                  {m === "lhs" && "LHS"}
                </button>
              ))}
            </div>
            <span className="text-[10px] text-gray-500">
              {show ? "▼ collapse" : "▲ expand"}
            </span>
          </div>
        </div>
        {show && (
          <div className="panel-content p-1">
            <div className="grid grid-cols-12 gap-1 h-full">
              <div className="col-span-7 h-full bg-[#050505] border border-gray-900 rounded-sm flex flex-col">
                <div className="flex items-center justify-between px-2 pt-1 text-[10px] text-gray-500">
                  <span>
                    {mode === "price" && "Probability over time"}
                    {mode === "events" && "Annotated key points (stub)"}
                    {mode === "mc" &&
                      "Monte Carlo distribution (stub – wire later)"}
                    {mode === "lhs" && "LHS scenarios (stub)"}
                  </span>
                  <span className="text-gray-600">
                    chart modes WIP
                  </span>
                </div>
                <div className="flex-1 p-1">
                  <PriceChart
                    data={market.price_history}
                    height={150}
                  />
                </div>
              </div>

              <div className="col-span-3 h-full">
                <MarketTradesPanel market={market} />
              </div>

              <div className="col-span-2 h-full">
                <BuySellPanel market={market} />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

