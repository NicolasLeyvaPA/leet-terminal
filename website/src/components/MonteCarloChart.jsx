import { useEffect, useRef, useState } from 'react';
import { Chart } from 'chart.js/auto';
import logger from '../utils/logger';

export const MonteCarloChart = ({ paths }) => {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const chartRef = useRef(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;
    if (!paths || !Array.isArray(paths) || paths.length === 0) {
      setError(null);
      return;
    }

    if (chartRef.current) {
      try { chartRef.current.destroy(); } catch { /* noop */ }
      chartRef.current = null;
    }

    try {
      const validPaths = paths.filter(
        (p) => Array.isArray(p) && p.length > 0
      );

      if (validPaths.length === 0) {
        setError('No valid simulation data');
        return;
      }

      // DPI-aware canvas sizing
      const dpr = window.devicePixelRatio || 1;
      const rect = containerRef.current.getBoundingClientRect();
      canvasRef.current.width = rect.width * dpr;
      canvasRef.current.height = rect.height * dpr;
      canvasRef.current.style.width = `${rect.width}px`;
      canvasRef.current.style.height = `${rect.height}px`;

      const pathLength = validPaths[0]?.length || 0;
      const labels = Array.from({ length: pathLength }, (_, i) => i);

      // Calculate percentile paths (P5, P25, P50, P75, P95)
      const percentilePaths = { p5: [], p25: [], p50: [], p75: [], p95: [] };
      for (let i = 0; i < pathLength; i++) {
        const vals = validPaths
          .map((p) => (typeof p[i] === 'number' && !isNaN(p[i]) ? p[i] : null))
          .filter((v) => v !== null)
          .sort((a, b) => a - b);

        if (vals.length === 0) {
          percentilePaths.p5.push(0);
          percentilePaths.p25.push(0);
          percentilePaths.p50.push(0);
          percentilePaths.p75.push(0);
          percentilePaths.p95.push(0);
          continue;
        }

        const pct = (p) => vals[Math.floor(vals.length * p)] ?? vals[vals.length - 1];
        percentilePaths.p5.push(pct(0.05));
        percentilePaths.p25.push(pct(0.25));
        percentilePaths.p50.push(pct(0.5));
        percentilePaths.p75.push(pct(0.75));
        percentilePaths.p95.push(pct(0.95));
      }

      const datasets = [];

      // P5-P95 confidence band
      datasets.push({
        label: 'P95',
        data: percentilePaths.p95,
        borderColor: 'transparent',
        backgroundColor: 'rgba(255, 107, 0, 0.06)',
        fill: '+1',
        pointRadius: 0,
        borderWidth: 0,
      });
      datasets.push({
        label: 'P5',
        data: percentilePaths.p5,
        borderColor: 'transparent',
        backgroundColor: 'transparent',
        fill: false,
        pointRadius: 0,
        borderWidth: 0,
      });

      // P25-P75 inner band
      datasets.push({
        label: 'P75',
        data: percentilePaths.p75,
        borderColor: 'transparent',
        backgroundColor: 'rgba(0, 210, 106, 0.08)',
        fill: '+1',
        pointRadius: 0,
        borderWidth: 0,
      });
      datasets.push({
        label: 'P25',
        data: percentilePaths.p25,
        borderColor: 'transparent',
        backgroundColor: 'transparent',
        fill: false,
        pointRadius: 0,
        borderWidth: 0,
      });

      // Individual sample paths (up to 20)
      const samplePaths = validPaths.slice(0, 20);
      samplePaths.forEach((path) => {
        const lastValue = path[path.length - 1];
        datasets.push({
          data: path,
          borderColor:
            typeof lastValue === 'number' && lastValue > 10000
              ? 'rgba(0, 210, 106, 0.15)'
              : 'rgba(255, 59, 59, 0.15)',
          borderWidth: 0.8,
          pointRadius: 0,
          fill: false,
        });
      });

      // Median path (prominent)
      datasets.push({
        label: 'Median',
        data: percentilePaths.p50,
        borderColor: '#ff6b00',
        borderWidth: 2,
        pointRadius: 0,
        fill: false,
      });

      // Starting capital reference line
      const startingCapital = percentilePaths.p50[0] || 10000;
      datasets.push({
        label: 'Start',
        data: Array(pathLength).fill(startingCapital),
        borderColor: 'rgba(255,255,255,0.1)',
        borderWidth: 1,
        borderDash: [4, 4],
        pointRadius: 0,
        fill: false,
      });

      chartRef.current = new Chart(canvasRef.current, {
        type: 'line',
        data: { labels, datasets },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          animation: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              enabled: true,
              backgroundColor: 'rgba(10,10,10,0.95)',
              borderColor: 'rgba(255,107,0,0.3)',
              borderWidth: 1,
              titleColor: '#888',
              bodyColor: '#ccc',
              titleFont: { size: 9, family: 'JetBrains Mono, monospace' },
              bodyFont: { size: 9, family: 'JetBrains Mono, monospace' },
              displayColors: false,
              filter: (item) => item.dataset.label === 'Median',
              callbacks: {
                title: (items) => `Trade ${items[0]?.label || ''}`,
                label: (item) => `$${Number(item.raw).toLocaleString()}`,
              },
            },
          },
          interaction: { mode: 'index', intersect: false },
          scales: {
            x: { display: false },
            y: {
              display: true,
              grid: { color: 'rgba(255,255,255,0.03)', drawBorder: false },
              ticks: {
                color: '#444',
                font: { size: 9, family: 'JetBrains Mono, monospace' },
                callback: (v) => '$' + (v / 1000).toFixed(0) + 'k',
              },
              border: { display: false },
            },
          },
        },
      });
      setError(null);
    } catch (err) {
      logger.warn('Monte Carlo chart initialization failed:', err);
      setError('Chart failed to load');
    }

    return () => {
      if (chartRef.current) {
        try { chartRef.current.destroy(); } catch { /* noop */ }
        chartRef.current = null;
      }
    };
  }, [paths]);

  // Resize observer
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const observer = new ResizeObserver(() => {
      if (chartRef.current) chartRef.current.resize();
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  if (error) {
    return (
      <div className="h-full flex items-center justify-center text-gray-500 text-xs">
        {error}
      </div>
    );
  }

  return (
    <div ref={containerRef} className="h-full w-full relative">
      <canvas ref={canvasRef} />
    </div>
  );
};
