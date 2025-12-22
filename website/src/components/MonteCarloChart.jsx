import { useEffect, useRef } from 'react';
import { Chart } from 'chart.js/auto';

export const MonteCarloChart = ({ paths, height = 150 }) => {
  const canvasRef = useRef(null);
  const chartRef = useRef(null);

  useEffect(() => {
    if (!canvasRef.current || !paths?.length) return;
    if (chartRef.current) chartRef.current.destroy();

    const labels = Array.from({ length: paths[0]?.length || 0 }, (_, i) => i);
    const datasets = paths.slice(0, 25).map((path) => ({
      data: path,
      borderColor:
        path[path.length - 1] > 10000
          ? "rgba(0, 210, 106, 0.25)"
          : "rgba(255, 59, 59, 0.25)",
      borderWidth: 1,
      pointRadius: 0,
      fill: false,
    }));

    const medianPath = [];
    for (let i = 0; i < (paths[0]?.length || 0); i++) {
      const vals = paths.map((p) => p[i] || 0).sort((a, b) => a - b);
      medianPath.push(vals[Math.floor(vals.length / 2)]);
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

    return () => {
      if (chartRef.current) chartRef.current.destroy();
    };
  }, [paths]);

  return <canvas ref={canvasRef} style={{ height }} />;
};

