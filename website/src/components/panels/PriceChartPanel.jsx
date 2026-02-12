import { useState, useCallback, useRef } from 'react';
import { PanelHeader } from '../PanelHeader';
import { PriceChart } from '../chart/PriceChart';
import { DrawingOverlay } from '../chart/DrawingOverlay';
import { DrawingToolbar } from '../chart/DrawingToolbar';

const STORAGE_KEY = 'leet-terminal-chart-drawings';

// Persist drawings per market
const loadDrawings = (marketId) => {
  try {
    const all = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    return all[marketId] || [];
  } catch { return []; }
};

const saveDrawings = (marketId, drawings) => {
  try {
    const all = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    if (drawings.length === 0) {
      delete all[marketId];
    } else {
      all[marketId] = drawings;
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  } catch { /* noop */ }
};

export const PriceChartPanel = ({ market }) => {
  const [tool, setTool] = useState('none');
  const [drawings, setDrawings] = useState(() =>
    market ? loadDrawings(market.id) : []
  );
  const chartInstanceRef = useRef(null);
  const prevMarketId = useRef(market?.id);

  // Reload drawings when market changes
  if (market && market.id !== prevMarketId.current) {
    prevMarketId.current = market.id;
    const loaded = loadDrawings(market.id);
    if (loaded.length !== drawings.length || JSON.stringify(loaded) !== JSON.stringify(drawings)) {
      setDrawings(loaded);
    }
  }

  const handleChartReady = useCallback((chartInstance) => {
    chartInstanceRef.current = chartInstance;
  }, []);

  const handleAddDrawing = useCallback((drawing) => {
    setDrawings((prev) => {
      const next = [...prev, drawing];
      if (market) saveDrawings(market.id, next);
      return next;
    });
    // Auto-switch back to pointer after placing a drawing
    setTool('none');
  }, [market]);

  const handleClear = useCallback(() => {
    setDrawings([]);
    if (market) saveDrawings(market.id, []);
  }, [market]);

  const handleUndo = useCallback(() => {
    setDrawings((prev) => {
      const next = prev.slice(0, -1);
      if (market) saveDrawings(market.id, next);
      return next;
    });
  }, [market]);

  if (!market) {
    return (
      <div className="terminal-panel h-full flex items-center justify-center text-gray-600 text-xs">
        Select a market
      </div>
    );
  }

  // Build annotation objects for horizontal lines (rendered natively by Chart.js)
  const annotations = {};
  drawings.forEach((d, i) => {
    if (d.type === 'hline') {
      annotations[`hline_${i}`] = {
        type: 'line',
        yMin: d.price,
        yMax: d.price,
        borderColor: d.color || 'rgba(0,180,255,0.6)',
        borderWidth: 1,
        borderDash: [6, 3],
        label: {
          display: true,
          content: `${d.price.toFixed(1)}¢`,
          position: 'end',
          backgroundColor: 'rgba(0,0,0,0.7)',
          color: d.color || 'rgba(0,180,255,0.8)',
          font: { size: 9, family: 'JetBrains Mono, monospace' },
          padding: 2,
        },
      };
    }
  });

  const priceNow = market.market_prob
    ? `${(market.market_prob * 100).toFixed(1)}¢`
    : '';

  return (
    <div className="terminal-panel h-full flex flex-col">
      <PanelHeader
        title="PRICE"
        subtitle={`${market.ticker} 90D ${priceNow}`}
      />
      <div className="panel-content flex-1 min-h-0 p-1 relative">
        <DrawingToolbar
          activeTool={tool}
          onToolChange={setTool}
          onClear={handleClear}
          onUndo={handleUndo}
          drawingCount={drawings.length}
        />
        <PriceChart
          data={market.price_history}
          annotations={annotations}
          onChartReady={handleChartReady}
          showVolume={true}
        />
        <DrawingOverlay
          chart={chartInstanceRef.current}
          tool={tool}
          drawings={drawings.filter((d) => d.type !== 'hline')}
          onAddDrawing={handleAddDrawing}
          onClearDrawings={handleClear}
        />
      </div>
    </div>
  );
};
