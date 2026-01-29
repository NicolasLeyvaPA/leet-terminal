import { useEffect, useRef, useState } from 'react';
import { Chart } from 'chart.js/auto';

export const PriceChart = ({ data }) => {
  const canvasRef = useRef(null);
  const chartRef = useRef(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Validate data before proceeding
    if (!canvasRef.current) return;
    if (!data || !Array.isArray(data) || data.length === 0) {
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
      // Validate data points have required properties
      const validData = data.filter(
        (d) => d && typeof d.price === 'number' && !isNaN(d.price)
      );

      if (validData.length === 0) {
        setError('No valid price data');
        return;
      }

      chartRef.current = new Chart(canvasRef.current, {
        type: "line",
        data: {
          labels: validData.map((d) => d.date || ''),
          datasets: [
            {
              data: validData.map((d) => (d.price * 100).toFixed(1)),
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
      setError(null);
    } catch (err) {
      console.warn('Chart initialization failed:', err);
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
  }, [data]);

  if (error) {
    return (
      <div className="h-full flex items-center justify-center text-gray-500 text-xs">
        {error}
      </div>
    );
  }

  // Show message when no data
  if (!data || !Array.isArray(data) || data.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-gray-600 text-xs">
        <div className="text-gray-500 mb-1">○ No Price History</div>
        <div className="text-gray-700 text-[10px]">Data unavailable from API</div>
      </div>
    );
  }

  return (
    <div className="h-full w-full">
      <canvas ref={canvasRef} className="h-full w-full" />
    </div>
  );
};

