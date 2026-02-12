import { useRef, useEffect, useCallback, useState } from 'react';

/**
 * Canvas overlay for freeform chart drawing tools.
 * Renders on a transparent canvas positioned exactly over the Chart.js chart.
 *
 * Drawing types:
 *  - trendline: two-point line extended to chart edges
 *  - hline: horizontal line at a price level
 *  - fibonacci: two-point Fibonacci retracement levels
 *  - ray: one-directional ray from a point
 */

const FIB_LEVELS = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1];
const FIB_COLORS = [
  'rgba(255,107,0,0.6)',   // 0%
  'rgba(255,210,0,0.4)',   // 23.6%
  'rgba(0,210,106,0.4)',   // 38.2%
  'rgba(0,180,255,0.5)',   // 50%
  'rgba(0,210,106,0.4)',   // 61.8%
  'rgba(255,210,0,0.4)',   // 78.6%
  'rgba(255,107,0,0.6)',   // 100%
];

export const DrawingOverlay = ({ chart, tool, drawings, onAddDrawing, onClearDrawings }) => {
  const canvasRef = useRef(null);
  const [drawState, setDrawState] = useState({ phase: 'idle', p1: null });
  const [cursor, setCursor] = useState(null);

  // Convert pixel position to data coordinates
  const pixelToData = useCallback((px, py) => {
    if (!chart) return null;
    const xScale = chart.scales.x;
    const yScale = chart.scales.y;
    if (!xScale || !yScale) return null;
    return {
      xIdx: Math.round(xScale.getValueForPixel(px)),
      price: yScale.getValueForPixel(py),
    };
  }, [chart]);

  // Convert data coordinates to pixel
  const dataToPixel = useCallback((xIdx, price) => {
    if (!chart) return null;
    const xScale = chart.scales.x;
    const yScale = chart.scales.y;
    if (!xScale || !yScale) return null;
    return {
      x: xScale.getPixelForValue(xIdx),
      y: yScale.getPixelForValue(price),
    };
  }, [chart]);

  // Get chart area bounds
  const getChartArea = useCallback(() => {
    if (!chart) return null;
    return chart.chartArea;
  }, [chart]);

  // Render all drawings + in-progress drawing
  const render = useCallback(() => {
    const canvas = canvasRef.current;
    const area = getChartArea();
    if (!canvas || !area) return;

    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const parent = canvas.parentElement;
    if (!parent) return;

    const rect = parent.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, rect.width, rect.height);

    // Clip to chart area
    ctx.save();
    ctx.beginPath();
    ctx.rect(area.left, area.top, area.right - area.left, area.bottom - area.top);
    ctx.clip();

    // Draw completed drawings
    for (const d of drawings) {
      drawShape(ctx, d, area);
    }

    // Draw in-progress
    if (drawState.phase === 'placed1' && drawState.p1 && cursor) {
      const p1px = dataToPixel(drawState.p1.xIdx, drawState.p1.price);
      if (p1px) {
        if (tool === 'trendline' || tool === 'ray') {
          drawTrendline(ctx, p1px.x, p1px.y, cursor.x, cursor.y, area, 'rgba(255,107,0,0.5)', tool === 'ray');
        } else if (tool === 'fibonacci') {
          drawFibonacci(ctx, p1px.y, cursor.y, area);
        }
      }
    }

    // Draw crosshair at cursor
    if (cursor && tool !== 'none') {
      ctx.setLineDash([3, 3]);
      ctx.strokeStyle = 'rgba(255,255,255,0.15)';
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(area.left, cursor.y);
      ctx.lineTo(area.right, cursor.y);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cursor.x, area.top);
      ctx.lineTo(cursor.x, area.bottom);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    ctx.restore();
  }, [drawings, drawState, cursor, tool, getChartArea, dataToPixel]);

  // Draw individual shape
  const drawShape = useCallback((ctx, d, area) => {
    if (d.type === 'hline') {
      const p = dataToPixel(0, d.price);
      if (!p) return;
      ctx.strokeStyle = d.color || 'rgba(0,180,255,0.6)';
      ctx.lineWidth = 1;
      ctx.setLineDash([6, 3]);
      ctx.beginPath();
      ctx.moveTo(area.left, p.y);
      ctx.lineTo(area.right, p.y);
      ctx.stroke();
      ctx.setLineDash([]);
      // Label
      ctx.fillStyle = d.color || 'rgba(0,180,255,0.8)';
      ctx.font = '9px JetBrains Mono, monospace';
      ctx.fillText(`${d.price.toFixed(1)}¢`, area.right - 38, p.y - 3);
    } else if (d.type === 'trendline' || d.type === 'ray') {
      const p1 = dataToPixel(d.p1.xIdx, d.p1.price);
      const p2 = dataToPixel(d.p2.xIdx, d.p2.price);
      if (!p1 || !p2) return;
      drawTrendline(ctx, p1.x, p1.y, p2.x, p2.y, area, d.color || 'rgba(255,107,0,0.7)', d.type === 'ray');
    } else if (d.type === 'fibonacci') {
      const p1 = dataToPixel(0, d.p1.price);
      const p2 = dataToPixel(0, d.p2.price);
      if (!p1 || !p2) return;
      drawFibonacci(ctx, p1.y, p2.y, area);
    }
  }, [dataToPixel]);

  // Trendline rendering (extended to chart edges)
  const drawTrendline = (ctx, x1, y1, x2, y2, area, color, isRay) => {
    const dx = x2 - x1;
    const dy = y2 - y1;
    if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return;

    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.beginPath();

    if (!isRay) {
      // Extend line to chart edges
      const slope = dy / dx;
      const leftY = y1 + slope * (area.left - x1);
      const rightY = y1 + slope * (area.right - x1);
      ctx.moveTo(area.left, leftY);
      ctx.lineTo(area.right, rightY);
    } else {
      ctx.moveTo(x1, y1);
      // Extend in direction of p2 only
      const len = Math.sqrt(dx * dx + dy * dy);
      const scale = Math.max(area.right - area.left, area.bottom - area.top) * 2 / len;
      ctx.lineTo(x1 + dx * scale, y1 + dy * scale);
    }
    ctx.stroke();

    // Draw anchor points
    for (const [px, py] of [[x1, y1], [x2, y2]]) {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(px, py, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  };

  // Fibonacci retracement
  const drawFibonacci = (ctx, y1, y2, area) => {
    const range = y2 - y1;

    FIB_LEVELS.forEach((level, i) => {
      const y = y1 + range * level;
      ctx.strokeStyle = FIB_COLORS[i];
      ctx.lineWidth = 1;
      ctx.setLineDash(level === 0 || level === 1 ? [] : [4, 3]);
      ctx.beginPath();
      ctx.moveTo(area.left, y);
      ctx.lineTo(area.right, y);
      ctx.stroke();

      // Label
      ctx.fillStyle = FIB_COLORS[i];
      ctx.font = '8px JetBrains Mono, monospace';
      ctx.fillText(`${(level * 100).toFixed(1)}%`, area.left + 4, y - 2);
    });
    ctx.setLineDash([]);

    // Shaded zone between 38.2% and 61.8%
    const y382 = y1 + range * 0.382;
    const y618 = y1 + range * 0.618;
    ctx.fillStyle = 'rgba(0,210,106,0.04)';
    ctx.fillRect(area.left, Math.min(y382, y618), area.right - area.left, Math.abs(y618 - y382));
  };

  // Mouse handlers
  const handleMouseMove = useCallback((e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    setCursor({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  }, []);

  const handleMouseLeave = useCallback(() => {
    setCursor(null);
  }, []);

  const handleClick = useCallback((e) => {
    if (!tool || tool === 'none') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;
    const dataCoord = pixelToData(px, py);
    if (!dataCoord) return;

    if (tool === 'hline') {
      onAddDrawing({ type: 'hline', price: dataCoord.price, color: 'rgba(0,180,255,0.6)' });
    } else if (tool === 'trendline' || tool === 'ray' || tool === 'fibonacci') {
      if (drawState.phase === 'idle') {
        setDrawState({ phase: 'placed1', p1: dataCoord });
      } else if (drawState.phase === 'placed1' && drawState.p1) {
        onAddDrawing({
          type: tool,
          p1: drawState.p1,
          p2: dataCoord,
          color: tool === 'fibonacci' ? undefined : 'rgba(255,107,0,0.7)',
        });
        setDrawState({ phase: 'idle', p1: null });
      }
    }
  }, [tool, drawState, pixelToData, onAddDrawing]);

  // Reset draw state when tool changes
  useEffect(() => {
    setDrawState({ phase: 'idle', p1: null });
  }, [tool]);

  // Redraw on any state change
  useEffect(() => {
    render();
  }, [render]);

  // Redraw on chart resize/update
  useEffect(() => {
    if (!chart) return;
    const afterRender = () => render();
    chart.options.animation = { ...chart.options.animation, onComplete: afterRender };
  }, [chart, render]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 z-10"
      style={{ pointerEvents: tool && tool !== 'none' ? 'auto' : 'none', cursor: tool && tool !== 'none' ? 'crosshair' : 'default' }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
    />
  );
};
