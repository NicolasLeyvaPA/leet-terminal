import { useEffect, useRef, useState, useCallback } from 'react';
import { Chart } from 'chart.js/auto';
import zoomPlugin from 'chartjs-plugin-zoom';

// Register zoom plugin
Chart.register(zoomPlugin);

// ============================================
// INTERACTIVE PRICE CHART WITH NEWS MARKERS
// CoinMarketCap-style with zoom, pan, and events
// ============================================

// Time range options
const TIME_RANGES = [
  { label: '7D', days: 7 },
  { label: '30D', days: 30 },
  { label: '90D', days: 90 },
  { label: 'ALL', days: null },
];

// Calculate price impact from news (correlate timing with price changes)
const calculateNewsImpact = (event, priceData, eventIdx) => {
  if (!priceData || eventIdx < 0 || eventIdx >= priceData.length) return 0;

  // Look at price change after the news (next 1-3 days)
  const priceAtNews = priceData[eventIdx]?.price || 0;
  const priceAfter = priceData[Math.min(eventIdx + 2, priceData.length - 1)]?.price || priceAtNews;
  const priceBefore = priceData[Math.max(eventIdx - 2, 0)]?.price || priceAtNews;

  // Calculate change percentage
  const changeAfter = priceAtNews > 0 ? ((priceAfter - priceAtNews) / priceAtNews) * 100 : 0;
  const changeBefore = priceBefore > 0 ? ((priceAtNews - priceBefore) / priceBefore) * 100 : 0;

  // Impact score based on price movement correlation
  const totalChange = Math.abs(changeAfter) + Math.abs(changeBefore);
  return totalChange;
};

export const PriceChart = ({
  data,
  newsEvents = [],
  onExpand,
  isExpanded = false,
  showControls = true
}) => {
  const canvasRef = useRef(null);
  const chartRef = useRef(null);
  const [error, setError] = useState(null);
  const [timeRange, setTimeRange] = useState('90D');
  const [showAllNews, setShowAllNews] = useState(isExpanded);

  // Filter data by time range
  const getFilteredData = useCallback(() => {
    if (!data || !Array.isArray(data)) return [];

    const range = TIME_RANGES.find(r => r.label === timeRange);
    if (!range || !range.days) return data;

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - range.days);

    return data.filter(d => {
      const date = new Date(d.date);
      return date >= cutoffDate;
    });
  }, [data, timeRange]);

  // Reset zoom
  const resetZoom = useCallback(() => {
    if (chartRef.current) {
      chartRef.current.resetZoom();
    }
  }, []);

  useEffect(() => {
    if (!canvasRef.current) return;

    const filteredData = getFilteredData();
    if (!filteredData || filteredData.length === 0) {
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
      const validData = filteredData.filter(
        (d) => d && typeof d.price === 'number' && !isNaN(d.price)
      );

      if (validData.length === 0) {
        setError('No valid price data');
        return;
      }

      // Match news events to price data with impact scoring
      const eventMarkers = [];
      const maxNews = showAllNews ? 20 : 5;

      if (newsEvents && newsEvents.length > 0) {
        const scoredEvents = newsEvents.map(event => {
          const eventDate = new Date(event.publishedAt || event.date);
          let closestIdx = -1;
          let closestDiff = Infinity;

          validData.forEach((d, idx) => {
            const dataDate = new Date(d.date);
            const diff = Math.abs(dataDate - eventDate);
            if (diff < closestDiff && diff < 86400000 * 5) {
              closestDiff = diff;
              closestIdx = idx;
            }
          });

          const impact = closestIdx !== -1 ? calculateNewsImpact(event, validData, closestIdx) : 0;

          return {
            event,
            idx: closestIdx,
            impact,
            price: closestIdx !== -1 ? validData[closestIdx].price : 0
          };
        });

        // Sort by impact and take top events
        scoredEvents
          .filter(e => e.idx !== -1)
          .sort((a, b) => b.impact - a.impact)
          .slice(0, maxNews)
          .forEach(e => eventMarkers.push(e));
      }

      // Create event marker data
      const eventData = validData.map((d, idx) => {
        const marker = eventMarkers.find(m => m.idx === idx);
        return marker ? (marker.price * 100).toFixed(1) : null;
      });

      const eventInfo = validData.map((d, idx) => {
        const marker = eventMarkers.find(m => m.idx === idx);
        return marker ? { ...marker.event, impact: marker.impact } : null;
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
              backgroundColor: (context) => {
                const ctx = context.chart.ctx;
                const gradient = ctx.createLinearGradient(0, 0, 0, context.chart.height);
                gradient.addColorStop(0, 'rgba(255, 107, 0, 0.15)');
                gradient.addColorStop(1, 'rgba(255, 107, 0, 0)');
                return gradient;
              },
              borderWidth: isExpanded ? 2 : 1.5,
              fill: true,
              tension: 0.3,
              pointRadius: 0,
              pointHoverRadius: isExpanded ? 6 : 4,
              pointHoverBackgroundColor: '#ff6b00',
              pointHoverBorderColor: '#fff',
              pointHoverBorderWidth: 2,
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
                // Color by sentiment and impact
                const alpha = Math.min(0.5 + (event.impact || 0) / 20, 1);
                if (event.sentiment > 0.2) return `rgba(34, 197, 94, ${alpha})`;
                if (event.sentiment < -0.2) return `rgba(239, 68, 68, ${alpha})`;
                return `rgba(59, 130, 246, ${alpha})`;
              }),
              pointRadius: eventData.map((d, idx) => {
                if (!d) return 0;
                const event = eventInfo[idx];
                const baseSize = isExpanded ? 8 : 6;
                // Larger markers for higher impact news
                return baseSize + Math.min((event?.impact || 0) / 5, 4);
              }),
              pointHoverRadius: eventData.map((d, idx) => {
                if (!d) return 0;
                const event = eventInfo[idx];
                const baseSize = isExpanded ? 10 : 8;
                return baseSize + Math.min((event?.impact || 0) / 5, 4);
              }),
              pointStyle: 'circle',
              pointBorderColor: eventData.map((d, idx) => {
                if (!d) return "transparent";
                const event = eventInfo[idx];
                if (event?.impact > 5) return '#fff'; // White border for high impact
                return '#1a1a1a';
              }),
              pointBorderWidth: eventData.map((d, idx) => {
                const event = eventInfo[idx];
                return event?.impact > 5 ? 3 : 2;
              }),
              showLine: false,
              order: 1,
              eventInfo: eventInfo,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          animation: {
            duration: 300
          },
          plugins: {
            legend: { display: false },
            tooltip: {
              enabled: true,
              mode: "nearest",
              intersect: false,
              callbacks: {
                title: function(context) {
                  if (context[0]?.datasetIndex === 1 && context[0]?.raw) {
                    const eventInfo = context[0].dataset.eventInfo;
                    const event = eventInfo?.[context[0].dataIndex];
                    if (event) {
                      const impactText = event.impact > 5 ? ' (HIGH IMPACT)' : '';
                      return `${event.source || 'News'}${impactText}`;
                    }
                  }
                  return context[0]?.label || '';
                },
                label: function(context) {
                  if (context.datasetIndex === 1 && context.raw) {
                    const eventInfo = context.dataset.eventInfo;
                    const event = eventInfo?.[context.dataIndex];
                    if (event) {
                      const title = event.title || 'News event';
                      return title.length > 60 ? title.slice(0, 60) + '...' : title;
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
                      const impactText = event.impact > 5 ? `⚡ Impact: ${event.impact.toFixed(1)}%` : '';
                      return [sentimentText, impactText, `Price: ${context.raw}¢`].filter(Boolean);
                    }
                  }
                  return '';
                }
              },
              backgroundColor: 'rgba(15, 15, 15, 0.95)',
              titleColor: '#ff6b00',
              titleFont: { weight: 'bold', size: isExpanded ? 13 : 11 },
              bodyColor: '#e5e5e5',
              bodyFont: { size: isExpanded ? 12 : 10 },
              borderColor: '#333',
              borderWidth: 1,
              padding: isExpanded ? 12 : 8,
              displayColors: false,
              cornerRadius: 6,
            },
            zoom: {
              pan: {
                enabled: true,
                mode: 'x',
                modifierKey: null,
              },
              zoom: {
                wheel: {
                  enabled: true,
                  speed: 0.1,
                },
                pinch: {
                  enabled: true
                },
                drag: {
                  enabled: true,
                  backgroundColor: 'rgba(255, 107, 0, 0.1)',
                  borderColor: '#ff6b00',
                  borderWidth: 1,
                },
                mode: 'x',
              },
              limits: {
                x: { min: 'original', max: 'original' },
              },
            },
          },
          interaction: {
            mode: "index",
            intersect: false,
          },
          scales: {
            x: {
              display: isExpanded,
              grid: {
                color: '#1a1a1a',
                drawBorder: false,
              },
              ticks: {
                color: '#666',
                font: { size: 10 },
                maxRotation: 0,
                autoSkip: true,
                maxTicksLimit: isExpanded ? 10 : 5,
              },
            },
            y: {
              display: true,
              position: "right",
              grid: { color: "#1a1a1a", drawBorder: false },
              ticks: {
                color: "#666",
                font: { size: isExpanded ? 11 : 9 },
                callback: (v) => v + "¢",
              },
            },
          },
          onHover: (event, elements) => {
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
  }, [data, newsEvents, timeRange, showAllNews, isExpanded, getFilteredData]);

  if (error) {
    return (
      <div className="h-full flex items-center justify-center text-gray-500 text-xs">
        {error}
      </div>
    );
  }

  const hasNews = newsEvents && newsEvents.length > 0;

  return (
    <div className="h-full w-full flex flex-col">
      {/* Controls */}
      {showControls && (
        <div className="flex items-center justify-between px-1 py-0.5 border-b border-gray-800/50">
          {/* Time Range Selector */}
          <div className="flex items-center gap-0.5">
            {TIME_RANGES.map(range => (
              <button
                key={range.label}
                onClick={() => setTimeRange(range.label)}
                className={`px-1.5 py-0.5 text-[9px] rounded transition-colors ${
                  timeRange === range.label
                    ? 'bg-orange-500 text-black font-bold'
                    : 'text-gray-500 hover:text-gray-300 hover:bg-gray-800'
                }`}
              >
                {range.label}
              </button>
            ))}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-1">
            {hasNews && (
              <button
                onClick={() => setShowAllNews(!showAllNews)}
                className={`px-1.5 py-0.5 text-[9px] rounded transition-colors ${
                  showAllNews
                    ? 'bg-blue-500/20 text-blue-400'
                    : 'text-gray-500 hover:text-blue-400'
                }`}
                title={showAllNews ? 'Show top 5 news' : 'Show all news'}
              >
                {showAllNews ? 'Less' : 'More'} News
              </button>
            )}
            <button
              onClick={resetZoom}
              className="px-1.5 py-0.5 text-[9px] text-gray-500 hover:text-gray-300 rounded hover:bg-gray-800 transition-colors"
              title="Reset zoom"
            >
              Reset
            </button>
            {onExpand && (
              <button
                onClick={onExpand}
                className="px-1.5 py-0.5 text-[9px] text-gray-500 hover:text-orange-400 rounded hover:bg-gray-800 transition-colors"
                title="Expand chart"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
                </svg>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Chart */}
      <div className="flex-1 min-h-0 relative">
        <canvas ref={canvasRef} className="h-full w-full" />

        {/* Zoom hint */}
        {!isExpanded && (
          <div className="absolute top-1 left-1 text-[8px] text-gray-600 bg-black/40 rounded px-1">
            Scroll to zoom • Drag to pan
          </div>
        )}

        {/* Legend for news markers */}
        {hasNews && (
          <div className={`absolute bottom-1 left-1 flex items-center gap-2 bg-black/60 rounded px-1.5 py-0.5 ${isExpanded ? 'text-[10px]' : 'text-[8px]'}`}>
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
            <span className="text-gray-600 ml-1">| Larger = Higher Impact</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default PriceChart;
