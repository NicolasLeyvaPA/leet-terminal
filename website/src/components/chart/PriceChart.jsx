import { useEffect, useRef, useState, useCallback } from 'react';
import { Chart } from 'chart.js/auto';
import annotationPlugin from 'chartjs-plugin-annotation';
import logger from '../../utils/logger';

Chart.register(annotationPlugin);

/**
 * Production-quality PriceChart with:
 * - DPI-aware canvas rendering
 * - Volume bars (secondary axis)
 * - Crosshair tooltip
 * - Annotation support for drawing tools
 * - Proper number types (no string coercion)
 */
export const PriceChart = ({
  data,
  annotations = {},
  onChartReady,
  onHover,
  showVolume = true,
}) => {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const chartRef = useRef(null);
  const [error, setError] = useState(null);

  // DPI-aware canvas sizing
  const setupCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = container.getBoundingClientRect();

    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;
  }, []);

  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;
    if (!data || !Array.isArray(data) || data.length === 0) {
      setError(null);
      return;
    }

    // Clean up previous chart
    if (chartRef.current) {
      try { chartRef.current.destroy(); } catch { /* noop */ }
      chartRef.current = null;
    }

    try {
      setupCanvas();

      const validData = data.filter(
        (d) => d && typeof d.price === 'number' && !isNaN(d.price)
      );

      if (validData.length === 0) {
        setError('No valid price data');
        return;
      }

      const labels = validData.map((d) => d.date || '');
      const prices = validData.map((d) => Number((d.price * 100).toFixed(2)));
      const hasHiLo = validData.some((d) => d.high != null && d.low != null);

      const datasets = [];

      // High/Low range fill (if OHLC-like data is available)
      if (hasHiLo) {
        datasets.push({
          label: 'High',
          data: validData.map((d) => d.high != null ? Number((d.high * 100).toFixed(2)) : null),
          borderColor: 'transparent',
          backgroundColor: 'rgba(255, 107, 0, 0.04)',
          fill: '+1',
          pointRadius: 0,
          borderWidth: 0,
          yAxisID: 'y',
        });
        datasets.push({
          label: 'Low',
          data: validData.map((d) => d.low != null ? Number((d.low * 100).toFixed(2)) : null),
          borderColor: 'transparent',
          backgroundColor: 'transparent',
          fill: false,
          pointRadius: 0,
          borderWidth: 0,
          yAxisID: 'y',
        });
      }

      // Main price line
      datasets.push({
        label: 'Price',
        data: prices,
        borderColor: '#ff6b00',
        backgroundColor: 'rgba(255, 107, 0, 0.06)',
        borderWidth: 1.5,
        fill: true,
        tension: 0.15,
        pointRadius: 0,
        pointHoverRadius: 4,
        pointHoverBackgroundColor: '#ff6b00',
        pointHoverBorderColor: '#fff',
        pointHoverBorderWidth: 1.5,
        yAxisID: 'y',
      });

      // Volume bars
      const hasVolume = showVolume && validData.some((d) => (d.volume || 0) > 0);
      if (hasVolume) {
        datasets.push({
          label: 'Volume',
          data: validData.map((d) => d.volume || 0),
          type: 'bar',
          backgroundColor: validData.map((d, i) => {
            if (i === 0) return 'rgba(255, 107, 0, 0.15)';
            const prev = validData[i - 1];
            return d.price >= prev.price
              ? 'rgba(0, 210, 106, 0.2)'
              : 'rgba(255, 59, 59, 0.2)';
          }),
          borderWidth: 0,
          yAxisID: 'yVolume',
          barPercentage: 0.8,
          categoryPercentage: 1.0,
        });
      }

      const scales = {
        x: {
          display: true,
          grid: { display: false },
          ticks: {
            color: '#333',
            font: { size: 8, family: 'JetBrains Mono, monospace' },
            maxTicksLimit: 6,
            maxRotation: 0,
          },
          border: { display: false },
        },
        y: {
          display: true,
          position: 'right',
          grid: { color: 'rgba(255,255,255,0.03)', drawBorder: false },
          ticks: {
            color: '#555',
            font: { size: 9, family: 'JetBrains Mono, monospace' },
            callback: (v) => v.toFixed(1) + '¢',
            padding: 4,
          },
          border: { display: false },
        },
      };

      if (hasVolume) {
        scales.yVolume = {
          display: false,
          position: 'left',
          beginAtZero: true,
          max: Math.max(...validData.map((d) => d.volume || 0)) * 5,
          grid: { display: false },
        };
      }

      chartRef.current = new Chart(canvasRef.current, {
        type: 'line',
        data: { labels, datasets },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          animation: { duration: 300, easing: 'easeOutQuart' },
          interaction: {
            mode: 'index',
            intersect: false,
          },
          plugins: {
            legend: { display: false },
            tooltip: {
              enabled: true,
              backgroundColor: 'rgba(10,10,10,0.95)',
              borderColor: 'rgba(255,107,0,0.4)',
              borderWidth: 1,
              titleColor: '#ff6b00',
              bodyColor: '#ccc',
              titleFont: { size: 10, family: 'JetBrains Mono, monospace' },
              bodyFont: { size: 10, family: 'JetBrains Mono, monospace' },
              padding: 8,
              displayColors: false,
              callbacks: {
                title: (items) => items[0]?.label || '',
                label: (item) => {
                  if (item.dataset.label === 'Volume') {
                    return `Vol: ${Number(item.raw).toLocaleString()}`;
                  }
                  if (item.dataset.label === 'High' || item.dataset.label === 'Low') return '';
                  return `Price: ${Number(item.raw).toFixed(2)}¢`;
                },
              },
              filter: (item) => item.dataset.label !== 'High' && item.dataset.label !== 'Low',
            },
            annotation: {
              annotations: annotations,
            },
          },
          scales,
          onHover: (event, elements, chart) => {
            if (onHover && chart && event.native) {
              const rect = chart.canvas.getBoundingClientRect();
              const x = event.native.clientX - rect.left;
              const y = event.native.clientY - rect.top;
              const xVal = chart.scales.x.getValueForPixel(x);
              const yVal = chart.scales.y.getValueForPixel(y);
              onHover({ x, y, xVal, yVal, chart });
            }
          },
        },
      });

      // Expose chart instance for drawing tools
      if (onChartReady && chartRef.current) {
        onChartReady(chartRef.current);
      }

      setError(null);
    } catch (err) {
      logger.warn('Chart initialization failed:', err);
      setError('Chart failed to load');
    }

    return () => {
      if (chartRef.current) {
        try { chartRef.current.destroy(); } catch { /* noop */ }
        chartRef.current = null;
      }
    };
  }, [data, annotations, setupCanvas, onChartReady, onHover, showVolume]);

  // Resize observer for responsive canvas
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver(() => {
      if (chartRef.current) {
        chartRef.current.resize();
      }
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

  if (!data || !Array.isArray(data) || data.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-gray-600 text-xs">
        <div className="text-gray-500 mb-1">No Price History</div>
        <div className="text-gray-700 text-[10px]">Data unavailable from API</div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="h-full w-full relative">
      <canvas ref={canvasRef} />
    </div>
  );
};
