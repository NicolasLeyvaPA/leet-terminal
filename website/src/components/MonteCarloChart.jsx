import { useEffect, useRef, useState } from 'react';
import { Chart } from 'chart.js/auto';
import logger from '../utils/logger';

export const MonteCarloChart = ({ paths }) => {
  const canvasRef = useRef(null);
  const chartRef = useRef(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Validate data before proceeding
    if (!canvasRef.current) return;
    if (!paths || !Array.isArray(paths) || paths.length === 0) {
      setError(null); // Not an error, just no data
      return;
    }

    // Clean up previous chart
    if (chartRef.current) {
      try {
        chartRef.current.destroy();
      } catch {
        // Ignore cleanup errors
      }
    }

    try {
      // Validate paths have valid data
      const validPaths = paths.filter(
        (p) => Array.isArray(p) && p.length > 0
      );

      if (validPaths.length === 0) {
        setError('No valid simulation data');
        return;
      }

      const pathLength = validPaths[0]?.length || 0;
      const labels = Array.from({ length: pathLength }, (_, i) => i);

      const datasets = validPaths.slice(0, 25).map((path) => {
        const lastValue = path[path.length - 1];
        return {
          data: path,
          borderColor:
            typeof lastValue === 'number' && lastValue > 10000
              ? "rgba(0, 210, 106, 0.25)"
              : "rgba(255, 59, 59, 0.25)",
          borderWidth: 1,
          pointRadius: 0,
          fill: false,
        };
      });

      // Calculate median path safely
      const medianPath = [];
      for (let i = 0; i < pathLength; i++) {
        const vals = validPaths
          .map((p) => (typeof p[i] === 'number' ? p[i] : 0))
          .sort((a, b) => a - b);
        medianPath.push(vals[Math.floor(vals.length / 2)] || 0);
      }

      datasets.push({
        data: medianPath,
        borderColor: "#ff6b00",
        borderWidth: 2,
        pointRadius: 0,
        fill: false,
      });

      chartRef.current = new Chart(canvasRef.current, {
        type: "line",
        data: { labels, datasets },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          animation: false,
          plugins: { legend: { display: false } },
          scales: {
            x: { display: false },
            y: {
              display: true,
              grid: { color: "#1a1a1a" },
              ticks: {
                color: "#444",
                font: { size: 9 },
                callback: (v) => "$" + (v / 1000).toFixed(0) + "k",
              },
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
        try {
          chartRef.current.destroy();
        } catch {
          // Ignore cleanup errors
        }
      }
    };
  }, [paths]);

  if (error) {
    return (
      <div className="h-full flex items-center justify-center text-gray-500 text-xs">
        {error}
      </div>
    );
  }

  return (
    <div className="h-full w-full">
      <canvas ref={canvasRef} className="h-full w-full" />
    </div>
  );
};

