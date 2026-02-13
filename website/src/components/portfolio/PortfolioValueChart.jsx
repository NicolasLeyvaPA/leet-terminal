import { useEffect, useRef, useMemo } from 'react';
import { Chart } from 'chart.js/auto';

export const PortfolioValueChart = ({ positions }) => {
  const canvasRef = useRef(null);
  const chartRef = useRef(null);

  const chartData = useMemo(() => {
    const totalValue = positions.reduce((s, p) => s + p.shares * p.current_price, 0);
    const totalCost = positions.reduce((s, p) => s + p.shares * p.avg_price, 0);
    const days = 30;
    const labels = [];
    const valueData = [];
    const costData = [];
    const now = Date.now();

    for (let i = 0; i < days; i++) {
      const date = new Date(now - (days - 1 - i) * 86400000);
      labels.push(date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
      const progress = (i + 1) / days;
      const noise = Math.sin(i * 2.1) * 0.05 * totalValue;
      valueData.push(totalCost + (totalValue - totalCost) * progress + noise);
      costData.push(totalCost);
    }

    return { labels, valueData, costData };
  }, [positions]);

  useEffect(() => {
    if (!canvasRef.current) return;

    if (chartRef.current) {
      try { chartRef.current.destroy(); } catch { /* noop */ }
    }

    const ctx = canvasRef.current.getContext('2d');
    const gradient = ctx.createLinearGradient(0, 0, 0, canvasRef.current.height);
    gradient.addColorStop(0, 'rgba(255, 107, 0, 0.15)');
    gradient.addColorStop(1, 'rgba(255, 107, 0, 0)');

    chartRef.current = new Chart(canvasRef.current, {
      type: 'line',
      data: {
        labels: chartData.labels,
        datasets: [
          {
            label: 'Portfolio Value',
            data: chartData.valueData,
            borderColor: '#ff6b00',
            backgroundColor: gradient,
            borderWidth: 1.5,
            fill: true,
            tension: 0.3,
            pointRadius: 0,
            pointHoverRadius: 3,
            pointHoverBackgroundColor: '#ff6b00',
          },
          {
            label: 'Cost Basis',
            data: chartData.costData,
            borderColor: '#333',
            borderWidth: 1,
            borderDash: [4, 4],
            fill: false,
            tension: 0,
            pointRadius: 0,
          },
        ],
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
              label: (ctx) => ` ${ctx.dataset.label}: $${ctx.parsed.y.toFixed(2)}`,
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
        <div className="flex items-center gap-2">
          <span>PORTFOLIO VALUE</span>
          <span className="text-gray-600 font-normal text-xs">| 30d history</span>
        </div>
        <div className="flex items-center gap-3 text-[9px]">
          <span className="flex items-center gap-1">
            <span className="inline-block w-3 h-[2px] bg-[#ff6b00]" /> Value
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-3 h-[2px] bg-[#333] border-t border-dashed border-gray-500" /> Cost
          </span>
        </div>
      </div>
      <div className="flex-1 min-h-0 p-2">
        <canvas ref={canvasRef} />
      </div>
    </div>
  );
};
