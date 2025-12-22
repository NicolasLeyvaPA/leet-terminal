import { useEffect, useRef } from 'react';
import { Chart } from 'chart.js/auto';

export const PriceChart = ({ data, height = 120 }) => {
  const canvasRef = useRef(null);
  const chartRef = useRef(null);

  useEffect(() => {
    if (!canvasRef.current || !data?.length) return;
    if (chartRef.current) chartRef.current.destroy();

    chartRef.current = new Chart(canvasRef.current, {
      type: "line",
      data: {
        labels: data.map((d) => d.date),
        datasets: [
          {
            data: data.map((d) => (d.price * 100).toFixed(1)),
            borderColor: "#ff6b00",
            backgroundColor: "rgba(255, 107, 0, 0.05)",
            borderWidth: 1.5,
            fill: true,
            tension: 0.2,
            pointRadius: 0,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: { mode: "index", intersect: false },
        },
        interaction: { mode: "nearest", axis: "x", intersect: false },
        scales: {
          x: { display: false },
          y: {
            display: true,
            position: "right",
            grid: { color: "#1a1a1a", drawBorder: false },
            ticks: {
              color: "#444",
              font: { size: 9 },
              callback: (v) => v + "¢",
            },
          },
        },
      },
    });

    return () => {
      if (chartRef.current) chartRef.current.destroy();
    };
  }, [data]);

  return <canvas ref={canvasRef} style={{ height }} />;
};

