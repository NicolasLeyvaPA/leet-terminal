import { useState, useCallback, useRef, useEffect } from 'react';
import { PriceChart } from './chart/PriceChart';
import { DrawingOverlay } from './chart/DrawingOverlay';
import { DrawingToolbar } from './chart/DrawingToolbar';
import { MonteCarloChart } from './MonteCarloChart';
import { MarketTradesPanel } from './panels/MarketTradesPanel';
import { BuySellPanel } from './panels/BuySellPanel';
import { QuantEngine } from '../utils/quantEngine';

export const MarketDetailDock = ({ market, show, onToggle }) => {
  const [mode, setMode] = useState('price');
  const [tool, setTool] = useState('none');
  const [drawings, setDrawings] = useState([]);
  const [mcPaths, setMcPaths] = useState(null);
  const chartRef = useRef(null);

  // Run Monte Carlo when switching to mc mode
  useEffect(() => {
    if (mode !== 'mc' || !market) { setMcPaths(null); return; }
    const prob = market.market_prob;
    const modelProb = market.model_prob;
    if (typeof prob !== 'number' || typeof modelProb !== 'number') return;
    try {
      const result = QuantEngine.monteCarlo(prob, modelProb);
      setMcPaths(result?.paths || null);
    } catch {
      setMcPaths(null);
    }
  }, [mode, market]);

  const handleChartReady = useCallback((c) => { chartRef.current = c; }, []);
  const handleAddDrawing = useCallback((d) => {
    setDrawings((prev) => [...prev, d]);
    setTool('none');
  }, []);

  if (!market) return null;
  const heightClass = show ? 'h-full' : 'h-6';

  // Key events from price history
  const keyPoints = (market.price_history || []).reduce((acc, d, i, arr) => {
    if (i < 2 || i >= arr.length - 1) return acc;
    const prev = arr[i - 1];
    const next = arr[i + 1];
    const change = Math.abs(d.price - prev.price);
    if (change > 0.05) {
      acc.push({ date: d.date, price: d.price, change: d.price - prev.price });
    }
    return acc;
  }, []).slice(-8);

  return (
    <div className={heightClass + ' transition-all duration-200'}>
      <div className="terminal-panel h-full">
        <div
          className="panel-header flex items-center justify-between cursor-pointer"
          onClick={onToggle}
        >
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">DETAIL</span>
            <span className="mono text-orange-500">{market.ticker}</span>
            <span className="text-gray-500 text-[10px] truncate max-w-[260px]">
              {market.question}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex text-[10px] bg-black/40 rounded border border-gray-800 overflow-hidden">
              {['price', 'events', 'mc', 'lhs'].map((m) => (
                <button
                  key={m}
                  onClick={(e) => { e.stopPropagation(); setMode(m); }}
                  className={`px-2 py-0.5 uppercase ${
                    mode === m
                      ? 'bg-orange-500 text-black'
                      : 'text-gray-500 hover:text-gray-200'
                  }`}
                >
                  {m === 'price' && 'Price'}
                  {m === 'events' && 'Key Pts'}
                  {m === 'mc' && 'MC Sim'}
                  {m === 'lhs' && 'Scenarios'}
                </button>
              ))}
            </div>
            <span className="text-[10px] text-gray-500">
              {show ? '▼ collapse' : '▲ expand'}
            </span>
          </div>
        </div>
        {show && (
          <div className="panel-content p-1">
            <div className="grid grid-cols-12 gap-1 h-full">
              <div className="col-span-7 h-full bg-[#050505] border border-gray-900 rounded-sm flex flex-col">
                <div className="flex items-center justify-between px-2 pt-1 text-[10px] text-gray-500">
                  <span>
                    {mode === 'price' && 'Probability over time'}
                    {mode === 'events' && `${keyPoints.length} significant moves`}
                    {mode === 'mc' && '5k simulations × 100 trades'}
                    {mode === 'lhs' && 'Scenario analysis'}
                  </span>
                </div>
                <div className="flex-1 p-1 relative">
                  {mode === 'price' && (
                    <>
                      {tool !== 'none' && (
                        <DrawingToolbar
                          activeTool={tool}
                          onToolChange={setTool}
                          onClear={() => setDrawings([])}
                          onUndo={() => setDrawings((p) => p.slice(0, -1))}
                          drawingCount={drawings.length}
                        />
                      )}
                      {tool === 'none' && (
                        <button
                          onClick={() => setTool('trendline')}
                          className="absolute top-1 left-1 z-20 bg-gray-900/80 border border-gray-700 rounded px-1.5 py-0.5 text-[9px] text-gray-400 hover:text-orange-400"
                        >
                          Draw
                        </button>
                      )}
                      <PriceChart
                        data={market.price_history}
                        onChartReady={handleChartReady}
                      />
                      <DrawingOverlay
                        chart={chartRef.current}
                        tool={tool}
                        drawings={drawings}
                        onAddDrawing={handleAddDrawing}
                        onClearDrawings={() => setDrawings([])}
                      />
                    </>
                  )}
                  {mode === 'events' && (
                    <div className="h-full overflow-y-auto px-1">
                      {keyPoints.length === 0 ? (
                        <div className="text-gray-600 text-xs text-center py-4">
                          No significant price moves detected
                        </div>
                      ) : (
                        keyPoints.map((pt, i) => (
                          <div key={i} className="flex items-center justify-between py-1 border-b border-gray-800/50 text-[10px]">
                            <span className="text-gray-500 mono">{pt.date}</span>
                            <span className="text-gray-400 mono">{(pt.price * 100).toFixed(1)}¢</span>
                            <span className={`mono font-medium ${pt.change > 0 ? 'text-green-400' : 'text-red-400'}`}>
                              {pt.change > 0 ? '+' : ''}{(pt.change * 100).toFixed(1)}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                  {mode === 'mc' && (
                    mcPaths ? (
                      <MonteCarloChart paths={mcPaths} />
                    ) : (
                      <div className="h-full flex items-center justify-center text-gray-600 text-xs">
                        Running simulation...
                      </div>
                    )
                  )}
                  {mode === 'lhs' && (
                    <div className="h-full overflow-y-auto px-1">
                      {[
                        { label: 'Bull Case', prob: Math.min(0.99, (market.market_prob || 0.5) + 0.15), color: 'text-green-400' },
                        { label: 'Base Case', prob: market.market_prob || 0.5, color: 'text-orange-400' },
                        { label: 'Bear Case', prob: Math.max(0.01, (market.market_prob || 0.5) - 0.15), color: 'text-red-400' },
                      ].map((scenario) => {
                        const ev = scenario.prob * 100 - (market.market_prob || 0.5) * 100;
                        return (
                          <div key={scenario.label} className="mb-2 p-1.5 bg-gray-900/50 rounded border border-gray-800/50">
                            <div className="flex items-center justify-between text-[10px] mb-1">
                              <span className={`font-medium ${scenario.color}`}>{scenario.label}</span>
                              <span className="mono text-gray-400">{(scenario.prob * 100).toFixed(1)}¢</span>
                            </div>
                            <div className="h-1 bg-gray-800 rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full"
                                style={{
                                  width: `${scenario.prob * 100}%`,
                                  backgroundColor: scenario.color.includes('green') ? '#00d26a' : scenario.color.includes('red') ? '#ff3b3b' : '#ff6b00',
                                }}
                              />
                            </div>
                            <div className="text-[9px] text-gray-600 mt-0.5">
                              EV: {ev > 0 ? '+' : ''}{ev.toFixed(1)}¢ vs market
                            </div>
                          </div>
                        );
                      })}
                      <div className="text-[8px] text-gray-700 mt-1 px-1">
                        Heuristic scenarios based on market probability ±15%
                      </div>
                    </div>
                  )}
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
