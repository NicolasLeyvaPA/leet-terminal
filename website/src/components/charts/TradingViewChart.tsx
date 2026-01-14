/**
 * TradingView Lightweight Charts Component
 *
 * Professional-grade price chart with:
 * - Candlestick or line display
 * - Zoom/pan interactions
 * - Crosshair tooltips
 * - Volume overlay (optional)
 * - Fullscreen expansion
 */

import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  createChart,
  ColorType,
  CrosshairMode,
  LineStyle,
  IChartApi,
  ISeriesApi,
  Time,
} from 'lightweight-charts';
import { ChartModal, ExpandButton } from './ChartModal';

interface PriceDataPoint {
  timestamp: number;
  date: string;
  price: number;
  volume?: number;
  high?: number;
  low?: number;
}

interface TradingViewChartProps {
  data: PriceDataPoint[];
  height?: number;
  showExpand?: boolean;
  title?: string;
  chartType?: 'line' | 'candlestick' | 'area';
  showVolume?: boolean;
  priceFormat?: 'percent' | 'price';
}

// Chart theme configuration
const chartTheme = {
  layout: {
    background: { type: ColorType.Solid, color: 'transparent' },
    textColor: '#888',
    fontFamily: 'Inter, system-ui, sans-serif',
  },
  grid: {
    vertLines: { color: '#1a1a1a', style: LineStyle.Dotted },
    horzLines: { color: '#1a1a1a', style: LineStyle.Dotted },
  },
  crosshair: {
    mode: CrosshairMode.Normal,
    vertLine: {
      color: '#ff6b00',
      width: 1 as const,
      style: LineStyle.Dashed,
      labelBackgroundColor: '#ff6b00',
    },
    horzLine: {
      color: '#ff6b00',
      width: 1 as const,
      style: LineStyle.Dashed,
      labelBackgroundColor: '#ff6b00',
    },
  },
  timeScale: {
    borderColor: '#333',
    timeVisible: true,
    secondsVisible: false,
  },
  rightPriceScale: {
    borderColor: '#333',
    scaleMargins: { top: 0.1, bottom: 0.2 },
  },
} as const;

export function TradingViewChart({
  data,
  height = 300,
  showExpand = true,
  title = 'Price History',
  chartType = 'area',
  showVolume = false,
  priceFormat = 'percent',
}: TradingViewChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Line' | 'Candlestick' | 'Area'> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [tooltipData, setTooltipData] = useState<{
    price: number;
    date: string;
    change: number;
  } | null>(null);

  // Format data for TradingView
  const formattedData = React.useMemo(() => {
    if (!data || data.length === 0) return [];

    return data.map((point) => ({
      time: (point.timestamp / 1000) as Time, // Convert ms to seconds
      value: priceFormat === 'percent' ? point.price * 100 : point.price,
      open: priceFormat === 'percent' ? (point.price - 0.01) * 100 : point.price - 0.01,
      high: priceFormat === 'percent' ? (point.high || point.price) * 100 : (point.high || point.price),
      low: priceFormat === 'percent' ? (point.low || point.price) * 100 : (point.low || point.price),
      close: priceFormat === 'percent' ? point.price * 100 : point.price,
    }));
  }, [data, priceFormat]);

  // Volume data
  const volumeData = React.useMemo(() => {
    if (!data || data.length === 0 || !showVolume) return [];

    return data.map((point, index) => {
      const prevPrice = index > 0 ? data[index - 1].price : point.price;
      return {
        time: (point.timestamp / 1000) as Time,
        value: point.volume || 0,
        color: point.price >= prevPrice ? 'rgba(0, 210, 106, 0.5)' : 'rgba(255, 59, 59, 0.5)',
      };
    });
  }, [data, showVolume]);

  // Initialize chart
  const initChart = useCallback(
    (container: HTMLDivElement, chartHeight: number) => {
      if (chartRef.current) {
        chartRef.current.remove();
      }

      const chart = createChart(container, {
        width: container.clientWidth,
        height: chartHeight,
        ...chartTheme,
      });

      // Create main series based on chart type
      if (chartType === 'candlestick') {
        seriesRef.current = chart.addCandlestickSeries({
          upColor: '#00d26a',
          downColor: '#ff3b3b',
          borderUpColor: '#00d26a',
          borderDownColor: '#ff3b3b',
          wickUpColor: '#00d26a',
          wickDownColor: '#ff3b3b',
        });
      } else if (chartType === 'area') {
        seriesRef.current = chart.addAreaSeries({
          lineColor: '#ff6b00',
          topColor: 'rgba(255, 107, 0, 0.3)',
          bottomColor: 'rgba(255, 107, 0, 0.0)',
          lineWidth: 2,
          priceFormat: {
            type: 'custom',
            formatter: (price: number) =>
              priceFormat === 'percent' ? `${price.toFixed(1)}%` : `$${price.toFixed(2)}`,
          },
        });
      } else {
        seriesRef.current = chart.addLineSeries({
          color: '#ff6b00',
          lineWidth: 2,
          priceFormat: {
            type: 'custom',
            formatter: (price: number) =>
              priceFormat === 'percent' ? `${price.toFixed(1)}%` : `$${price.toFixed(2)}`,
          },
        });
      }

      // Add volume if enabled
      if (showVolume) {
        volumeSeriesRef.current = chart.addHistogramSeries({
          priceFormat: {
            type: 'volume',
          },
          priceScaleId: 'volume',
        });
        chart.priceScale('volume').applyOptions({
          scaleMargins: { top: 0.8, bottom: 0 },
        });
      }

      // Crosshair move handler for tooltip
      chart.subscribeCrosshairMove((param) => {
        if (!param.time || !param.seriesData) {
          setTooltipData(null);
          return;
        }

        const seriesData = param.seriesData.get(seriesRef.current!);
        if (seriesData) {
          // Type-safe access to price data (line/area has 'value', candlestick has 'close')
          const price = 'value' in seriesData
            ? (seriesData as { value: number }).value
            : (seriesData as { close: number }).close;
          const firstPrice = formattedData[0]?.value || formattedData[0]?.close || price;
          setTooltipData({
            price: price as number,
            date: new Date((param.time as number) * 1000).toLocaleDateString(),
            change: ((price as number) - firstPrice) / firstPrice * 100,
          });
        }
      });

      chartRef.current = chart;

      // Handle resize
      const resizeObserver = new ResizeObserver(() => {
        chart.applyOptions({ width: container.clientWidth });
      });
      resizeObserver.observe(container);

      return () => {
        resizeObserver.disconnect();
        chart.remove();
      };
    },
    [chartType, showVolume, priceFormat, formattedData]
  );

  // Initialize and update chart
  useEffect(() => {
    if (!containerRef.current || !formattedData.length) return;

    const cleanup = initChart(containerRef.current, height);

    // Update data
    if (seriesRef.current) {
      if (chartType === 'candlestick') {
        seriesRef.current.setData(
          formattedData.map((d) => ({
            time: d.time,
            open: d.open,
            high: d.high,
            low: d.low,
            close: d.close,
          }))
        );
      } else {
        seriesRef.current.setData(
          formattedData.map((d) => ({ time: d.time, value: d.value }))
        );
      }
    }

    if (volumeSeriesRef.current && volumeData.length) {
      volumeSeriesRef.current.setData(volumeData);
    }

    // Fit content
    chartRef.current?.timeScale().fitContent();

    return cleanup;
  }, [formattedData, volumeData, height, initChart, chartType]);

  // Handle expansion
  useEffect(() => {
    if (isExpanded) {
      // Re-render in modal
    }
  }, [isExpanded]);

  if (!data || data.length === 0) {
    return (
      <div
        style={{
          height,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#666',
          fontSize: '13px',
        }}
      >
        No price history available
      </div>
    );
  }

  return (
    <div className="tradingview-chart-container">
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '8px',
          padding: '0 4px',
        }}
      >
        <div>
          <span style={{ fontSize: '12px', fontWeight: 500, color: '#fff' }}>
            {title}
          </span>
          {tooltipData && (
            <span style={{ marginLeft: '12px', fontSize: '11px', color: '#888' }}>
              {tooltipData.date} •{' '}
              <span style={{ color: '#ff6b00' }}>
                {priceFormat === 'percent'
                  ? `${tooltipData.price.toFixed(1)}%`
                  : `$${tooltipData.price.toFixed(2)}`}
              </span>
              <span
                style={{
                  marginLeft: '6px',
                  color: tooltipData.change >= 0 ? '#00d26a' : '#ff3b3b',
                }}
              >
                {tooltipData.change >= 0 ? '+' : ''}
                {tooltipData.change.toFixed(2)}%
              </span>
            </span>
          )}
        </div>
        {showExpand && <ExpandButton onClick={() => setIsExpanded(true)} />}
      </div>

      {/* Chart */}
      <div
        ref={containerRef}
        style={{
          width: '100%',
          height,
          backgroundColor: '#0d0d0d',
          borderRadius: '4px',
        }}
      />

      {/* Fullscreen modal */}
      <ChartModal
        isOpen={isExpanded}
        onClose={() => setIsExpanded(false)}
        title={title}
        helpText="Price history over the selected time period. Scroll to zoom, drag to pan."
      >
        <TradingViewChartExpanded
          data={data}
          chartType={chartType}
          showVolume={showVolume}
          priceFormat={priceFormat}
        />
      </ChartModal>
    </div>
  );
}

// Expanded chart for modal (separate instance)
function TradingViewChartExpanded({
  data,
  chartType,
  showVolume,
  priceFormat,
}: Omit<TradingViewChartProps, 'height' | 'showExpand' | 'title'>) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || !data.length) return;

    const container = containerRef.current;
    const chart = createChart(container, {
      width: container.clientWidth,
      height: container.clientHeight,
      ...chartTheme,
    });

    const formattedData = data.map((point) => ({
      time: (point.timestamp / 1000) as Time,
      value: priceFormat === 'percent' ? point.price * 100 : point.price,
      open: priceFormat === 'percent' ? (point.price - 0.01) * 100 : point.price - 0.01,
      high: priceFormat === 'percent' ? (point.high || point.price) * 100 : point.high || point.price,
      low: priceFormat === 'percent' ? (point.low || point.price) * 100 : point.low || point.price,
      close: priceFormat === 'percent' ? point.price * 100 : point.price,
    }));

    let series: ISeriesApi<'Line' | 'Candlestick' | 'Area'>;

    if (chartType === 'candlestick') {
      series = chart.addCandlestickSeries({
        upColor: '#00d26a',
        downColor: '#ff3b3b',
        borderUpColor: '#00d26a',
        borderDownColor: '#ff3b3b',
        wickUpColor: '#00d26a',
        wickDownColor: '#ff3b3b',
      });
      series.setData(
        formattedData.map((d) => ({
          time: d.time,
          open: d.open,
          high: d.high,
          low: d.low,
          close: d.close,
        }))
      );
    } else if (chartType === 'area') {
      series = chart.addAreaSeries({
        lineColor: '#ff6b00',
        topColor: 'rgba(255, 107, 0, 0.3)',
        bottomColor: 'rgba(255, 107, 0, 0.0)',
        lineWidth: 2,
      });
      series.setData(formattedData.map((d) => ({ time: d.time, value: d.value })));
    } else {
      series = chart.addLineSeries({ color: '#ff6b00', lineWidth: 2 });
      series.setData(formattedData.map((d) => ({ time: d.time, value: d.value })));
    }

    if (showVolume) {
      const volumeSeries = chart.addHistogramSeries({
        priceFormat: { type: 'volume' },
        priceScaleId: 'volume',
      });
      chart.priceScale('volume').applyOptions({
        scaleMargins: { top: 0.85, bottom: 0 },
      });
      volumeSeries.setData(
        data.map((point, index) => ({
          time: (point.timestamp / 1000) as Time,
          value: point.volume || 0,
          color:
            index > 0 && point.price >= data[index - 1].price
              ? 'rgba(0, 210, 106, 0.5)'
              : 'rgba(255, 59, 59, 0.5)',
        }))
      );
    }

    chart.timeScale().fitContent();

    const resizeObserver = new ResizeObserver(() => {
      chart.applyOptions({
        width: container.clientWidth,
        height: container.clientHeight,
      });
    });
    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
      chart.remove();
    };
  }, [data, chartType, showVolume, priceFormat]);

  return <div ref={containerRef} style={{ width: '100%', height: '100%' }} />;
}

export default TradingViewChart;
