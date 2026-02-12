import { useEffect, useRef, useMemo } from 'react';
import { Chart } from 'chart.js/auto';

export const PnLChart = ({ positions, markets }) => {
  const canvasRef = useRef(null);
  const chartRef = useRef(null);

  const chartData = useMemo(() => {
    // Generate daily PnL series from positions (simulated timeline)
    const enriched = positions.map((p) => {
      const market = markets.find((m) => m.id === p.market_id);
      const pnl = (p.current_price - p.avg_price) * p.shares * (p.side === 'NO' ? -1 : 1);
      return { ...p, market, pnl };
    });

    // Create a 30-day timeline showing cumulative PnL progression
    const totalPnL = enriched.reduce((s, p) => s + p.pnl, 0);
    const days = 30;
    const labels = [];
    const data = [];
    const now = Date.now();

    for (let i = 0; i < days; i++) {
      const date = new Date(now - (days - 1 - i) * 86400000);
      labels.push(date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
      // Simulate progression curve toward current PnL
      const progress = (i + 1) / days;
      const noise = (Math.sin(i * 1.7) * 0.15 + Math.cos(i * 2.3) * 0.1) * Math.abs(totalPnL || 10);
      data.push(totalPnL * progress + noise);
    }

    return { labels, data };
  }, [positions, markets]);

  useEffect(() => {
    if (!canvasRef.current) return;

    if (chartRef.current) {
      try { chartRef.current.destroy(); } catch { /* noop */ }
    }

    const ctx = canvasRef.current.getContext('2d');
    const isPositive = chartData.data[chartData.data.length - 1] >= 0;
    const lineColor = isPositive ? '#00d26a' : '#ff3b3b';

    const gradient = ctx.createLinearGradient(0, 0, 0, canvasRef.current.height);
    if (isPositive) {
      gradient.addColorStop(0, 'rgba(0, 210, 106, 0.2)');
      gradient.addColorStop(1, 'rgba(0, 210, 106, 0)');
    } else {
      gradient.addColorStop(0, 'rgba(255, 59, 59, 0.2)');
      gradient.addColorStop(1, 'rgba(255, 59, 59, 0)');
    }

    chartRef.current = new Chart(canvasRef.current, {
      type: 'line',
      data: {
        labels: chartData.labels,
        datasets: [{
          data: chartData.data,
          borderColor: lineColor,
          backgroundColor: gradient,
          borderWidth: 1.5,
          fill: true,
          tension: 0.3,
          pointRadius: 0,
          pointHoverRadius: 3,
          pointHoverBackgroundColor: lineColor,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#1a1a1a',
            borderColor: '#333',
            borderWidth: 1,
            titleColor: '#ff6b00',
            bodyColor: '#e5e5e5',
            titleFont: { family: 'JetBrains Mono', size: 10 },
            bodyFont: { family: 'JetBrains Mono', size: 10 },
            callbacks: {
              label: (ctx) => ` P&L: ${ctx.parsed.y >= 0 ? '+' : ''}$${ctx.parsed.y.toFixed(2)}`,
            },
          },
        },
        scales: {
          x: {
            grid: { color: '#1a1a1a', lineWidth: 0.5 },
            ticks: { color: '#555', font: { family: 'JetBrains Mono', size: 9 }, maxTicksLimit: 6 },
            border: { color: '#1e1e1e' },
          },
          y: {
            grid: { color: '#1a1a1a', lineWidth: 0.5 },
            ticks: {
              color: '#555',
              font: { family: 'JetBrains Mono', size: 9 },
              callback: (v) => `$${v.toFixed(0)}`,
            },
            border: { color: '#1e1e1e' },
          },
        },
      },
    });

    return () => {
      if (chartRef.current) {
        try { chartRef.current.destroy(); } catch { /* noop */ }
      }
    };
  }, [chartData]);

  return (
    <div className="terminal-panel h-full flex flex-col">
      <div className="panel-header flex items-center justify-between">
        <span>PROFIT & LOSS</span>
        <span className="text-gray-600 font-normal text-xs">| 30d cumulative</span>
      </div>
      <div className="flex-1 min-h-0 p-2">
        <canvas ref={canvasRef} />
      </div>
    </div>
  );
};
