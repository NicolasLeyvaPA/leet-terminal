import { useEffect, useRef, useMemo } from 'react';
import { Chart } from 'chart.js/auto';

const SECTOR_COLORS = {
  Politics: '#ff6b00',
  Crypto: '#a855f7',
  Sports: '#00d26a',
  Finance: '#0088ff',
  Entertainment: '#ffd000',
  Science: '#06b6d4',
  Technology: '#ff3b3b',
  Other: '#555555',
};

export const SectorDiversificationChart = ({ positions, markets }) => {
  const canvasRef = useRef(null);
  const chartRef = useRef(null);

  const sectorData = useMemo(() => {
    const sectors = {};
    positions.forEach((p) => {
      const market = markets.find((m) => m.id === p.market_id);
      const category = market?.category || 'Other';
      const value = p.shares * p.current_price;
      sectors[category] = (sectors[category] || 0) + value;
    });
    const labels = Object.keys(sectors);
    const data = Object.values(sectors);
    const total = data.reduce((s, v) => s + v, 0);
    const colors = labels.map((l) => SECTOR_COLORS[l] || SECTOR_COLORS.Other);
    return { labels, data, total, colors };
  }, [positions, markets]);

  useEffect(() => {
    if (!canvasRef.current) return;

    if (chartRef.current) {
      try { chartRef.current.destroy(); } catch { /* noop */ }
    }

    if (sectorData.labels.length === 0) return;

    chartRef.current = new Chart(canvasRef.current, {
      type: 'doughnut',
      data: {
        labels: sectorData.labels,
        datasets: [{
          data: sectorData.data,
          backgroundColor: sectorData.colors,
          borderColor: '#0a0a0a',
          borderWidth: 2,
          hoverBorderColor: '#333',
          hoverBorderWidth: 2,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '65%',
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
              label: (ctx) => {
                const pct = ((ctx.parsed / sectorData.total) * 100).toFixed(1);
                return ` ${ctx.label}: $${ctx.parsed.toFixed(0)} (${pct}%)`;
              },
            },
          },
        },
      },
    });

    return () => {
      if (chartRef.current) {
        try { chartRef.current.destroy(); } catch { /* noop */ }
      }
    };
  }, [sectorData]);

  return (
    <div className="terminal-panel h-full flex flex-col">
      <div className="panel-header flex items-center justify-between">
        <span>SECTOR ALLOCATION</span>
        <span className="text-gray-600 font-normal text-xs">| diversification</span>
      </div>
      <div className="flex-1 min-h-0 flex">
        <div className="flex-1 min-h-0 p-2 flex items-center justify-center">
          {sectorData.labels.length > 0 ? (
            <canvas ref={canvasRef} />
          ) : (
            <span className="text-gray-600 text-xs">No positions</span>
          )}
        </div>
        <div className="w-28 p-2 flex flex-col justify-center gap-1 overflow-y-auto">
          {sectorData.labels.map((label, i) => {
            const pct = sectorData.total > 0
              ? ((sectorData.data[i] / sectorData.total) * 100).toFixed(1)
              : '0.0';
            return (
              <div key={label} className="flex items-center gap-1.5">
                <div
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: sectorData.colors[i] }}
                />
                <div className="min-w-0 flex-1">
                  <div className="text-[9px] text-gray-400 truncate">{label}</div>
                  <div className="text-[10px] mono text-white">{pct}%</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
