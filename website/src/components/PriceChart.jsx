import { useEffect, useRef, useState } from 'react';
import { Chart } from 'chart.js/auto';

// ============================================
// PRICE CHART WITH NEWS EVENT MARKERS
// Shows price history with hoverable news events
// Like CoinMarketCap's event markers
// ============================================

export const PriceChart = ({ data, newsEvents = [] }) => {
  const canvasRef = useRef(null);
  const chartRef = useRef(null);
  const [error, setError] = useState(null);
  const [hoveredEvent, setHoveredEvent] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    // Validate data before proceeding
    if (!canvasRef.current) return;
    if (!data || !Array.isArray(data) || data.length === 0) {
      setError(null);
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
      // Validate data points
      const validData = data.filter(
        (d) => d && typeof d.price === 'number' && !isNaN(d.price)
      );

      if (validData.length === 0) {
        setError('No valid price data');
        return;
      }

      // Match news events to price data points
      const eventMarkers = [];
      if (newsEvents && newsEvents.length > 0) {
        newsEvents.forEach(event => {
          // Find the closest date in price data
          const eventDate = new Date(event.publishedAt || event.date);
          let closestIdx = -1;
          let closestDiff = Infinity;

          validData.forEach((d, idx) => {
            const dataDate = new Date(d.date);
            const diff = Math.abs(dataDate - eventDate);
            if (diff < closestDiff && diff < 86400000 * 3) { // Within 3 days
              closestDiff = diff;
              closestIdx = idx;
            }
          });

          if (closestIdx !== -1) {
            eventMarkers.push({
              idx: closestIdx,
              price: validData[closestIdx].price,
              event: event
            });
          }
        });
      }

      // Create event marker data (null for non-event points)
      const eventData = validData.map((d, idx) => {
        const marker = eventMarkers.find(m => m.idx === idx);
        return marker ? (marker.price * 100).toFixed(1) : null;
      });

      // Store event info for tooltips
      const eventInfo = validData.map((d, idx) => {
        const marker = eventMarkers.find(m => m.idx === idx);
        return marker ? marker.event : null;
      });

      chartRef.current = new Chart(canvasRef.current, {
        type: "line",
        data: {
          labels: validData.map((d) => d.date || ''),
          datasets: [
            // Main price line
            {
              data: validData.map((d) => (d.price * 100).toFixed(1)),
              borderColor: "#ff6b00",
              backgroundColor: "rgba(255, 107, 0, 0.05)",
              borderWidth: 1.5,
              fill: true,
              tension: 0.2,
              pointRadius: 0,
              order: 2,
            },
            // News event markers
            {
              data: eventData,
              borderColor: "transparent",
              backgroundColor: eventData.map((d, idx) => {
                if (!d) return "transparent";
                const event = eventInfo[idx];
                if (!event) return "#3b82f6";
                // Color by sentiment
                if (event.sentiment > 0.2) return "#22c55e"; // Green for positive
                if (event.sentiment < -0.2) return "#ef4444"; // Red for negative
                return "#3b82f6"; // Blue for neutral
              }),
              pointRadius: eventData.map(d => d ? 6 : 0),
              pointHoverRadius: eventData.map(d => d ? 8 : 0),
              pointStyle: 'circle',
              pointBorderColor: '#1a1a1a',
              pointBorderWidth: 2,
              showLine: false,
              order: 1,
              // Store event info for tooltip access
              eventInfo: eventInfo,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              mode: "nearest",
              intersect: true,
              callbacks: {
                title: function(context) {
                  // Check if this is an event marker
                  if (context[0]?.datasetIndex === 1 && context[0]?.raw) {
                    const eventInfo = context[0].dataset.eventInfo;
                    const event = eventInfo?.[context[0].dataIndex];
                    if (event) {
                      return event.source || 'News';
                    }
                  }
                  return context[0]?.label || '';
                },
                label: function(context) {
                  // Check if this is an event marker
                  if (context.datasetIndex === 1 && context.raw) {
                    const eventInfo = context.dataset.eventInfo;
                    const event = eventInfo?.[context.dataIndex];
                    if (event) {
                      // Truncate title for tooltip
                      const title = event.title || 'News event';
                      return title.length > 50 ? title.slice(0, 50) + '...' : title;
                    }
                  }
                  return `Price: ${context.raw}¢`;
                },
                afterLabel: function(context) {
                  if (context.datasetIndex === 1 && context.raw) {
                    const eventInfo = context.dataset.eventInfo;
                    const event = eventInfo?.[context.dataIndex];
                    if (event) {
                      const sentiment = event.sentiment || 0;
                      const sentimentText = sentiment > 0.2 ? '📈 Bullish' :
                                           sentiment < -0.2 ? '📉 Bearish' : '➖ Neutral';
                      return [`${sentimentText}`, `Price: ${context.raw}¢`];
                    }
                  }
                  return '';
                }
              },
              backgroundColor: 'rgba(20, 20, 20, 0.95)',
              titleColor: '#ff6b00',
              bodyColor: '#e5e5e5',
              borderColor: '#333',
              borderWidth: 1,
              padding: 10,
              displayColors: false,
            },
          },
          interaction: {
            mode: "nearest",
            axis: "x",
            intersect: false
          },
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
          onHover: (event, elements) => {
            // Update cursor for event markers
            if (elements.length > 0 && elements[0].datasetIndex === 1) {
              event.native.target.style.cursor = 'pointer';
            } else {
              event.native.target.style.cursor = 'crosshair';
            }
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
  }, [data, newsEvents]);

  if (error) {
    return (
      <div className="h-full flex items-center justify-center text-gray-500 text-xs">
        {error}
      </div>
    );
  }

  return (
    <div className="h-full w-full relative">
      <canvas ref={canvasRef} className="h-full w-full" />

      {/* Legend for news markers */}
      {newsEvents && newsEvents.length > 0 && (
        <div className="absolute bottom-1 left-1 flex items-center gap-2 text-[8px] bg-black/60 rounded px-1.5 py-0.5">
          <span className="flex items-center gap-0.5">
            <span className="w-2 h-2 rounded-full bg-green-500"></span>
            <span className="text-gray-500">Bullish</span>
          </span>
          <span className="flex items-center gap-0.5">
            <span className="w-2 h-2 rounded-full bg-red-500"></span>
            <span className="text-gray-500">Bearish</span>
          </span>
          <span className="flex items-center gap-0.5">
            <span className="w-2 h-2 rounded-full bg-blue-500"></span>
            <span className="text-gray-500">News</span>
          </span>
        </div>
      )}
    </div>
  );
};

export default PriceChart;
