/**
 * ECharts Wrapper Component
 *
 * Provides a reusable wrapper for Apache ECharts with:
 * - ResizeObserver for responsive sizing
 * - Common theme configuration
 * - Zoom/pan interactions
 * - Loading and error states
 */

import React, { useRef, useEffect, useMemo } from 'react';
import * as echarts from 'echarts/core';
import { LineChart, BarChart, ScatterChart } from 'echarts/charts';
import {
  TitleComponent,
  TooltipComponent,
  GridComponent,
  LegendComponent,
  DataZoomComponent,
  ToolboxComponent,
} from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import type { EChartsOption, ECharts } from 'echarts';

// Register ECharts components
echarts.use([
  LineChart,
  BarChart,
  ScatterChart,
  TitleComponent,
  TooltipComponent,
  GridComponent,
  LegendComponent,
  DataZoomComponent,
  ToolboxComponent,
  CanvasRenderer,
]);

// Dark theme configuration
const darkTheme = {
  backgroundColor: 'transparent',
  textStyle: {
    color: '#888',
    fontFamily: 'Inter, system-ui, sans-serif',
  },
  title: {
    textStyle: { color: '#fff', fontSize: 14, fontWeight: 500 },
    subtextStyle: { color: '#666', fontSize: 11 },
  },
  legend: {
    textStyle: { color: '#888' },
    inactiveColor: '#444',
  },
  tooltip: {
    backgroundColor: 'rgba(20, 20, 20, 0.95)',
    borderColor: '#333',
    borderWidth: 1,
    textStyle: { color: '#fff', fontSize: 12 },
    extraCssText: 'box-shadow: 0 4px 12px rgba(0,0,0,0.5);',
  },
  axisPointer: {
    lineStyle: { color: '#444' },
    crossStyle: { color: '#444' },
  },
  xAxis: {
    axisLine: { lineStyle: { color: '#333' } },
    axisTick: { lineStyle: { color: '#333' } },
    axisLabel: { color: '#666', fontSize: 10 },
    splitLine: { lineStyle: { color: '#222', type: 'dashed' } },
  },
  yAxis: {
    axisLine: { lineStyle: { color: '#333' } },
    axisTick: { lineStyle: { color: '#333' } },
    axisLabel: { color: '#666', fontSize: 10 },
    splitLine: { lineStyle: { color: '#222', type: 'dashed' } },
  },
  dataZoom: {
    backgroundColor: '#1a1a1a',
    dataBackgroundColor: '#333',
    fillerColor: 'rgba(255, 107, 0, 0.2)',
    handleColor: '#ff6b00',
    handleSize: '100%',
    textStyle: { color: '#888' },
    borderColor: '#333',
  },
  color: [
    '#ff6b00', // Orange (primary)
    '#00d26a', // Green
    '#3b82f6', // Blue
    '#f59e0b', // Amber
    '#ec4899', // Pink
    '#8b5cf6', // Purple
    '#06b6d4', // Cyan
    '#f43f5e', // Rose
  ],
};

// Register dark theme
echarts.registerTheme('leetTerminal', darkTheme);

interface EChartsWrapperProps {
  option: EChartsOption;
  height?: number | string;
  loading?: boolean;
  onChartReady?: (chart: ECharts) => void;
  className?: string;
  showDataZoom?: boolean;
  showToolbox?: boolean;
}

export function EChartsWrapper({
  option,
  height = 300,
  loading = false,
  onChartReady,
  className = '',
  showDataZoom = true,
  showToolbox = false,
}: EChartsWrapperProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<ECharts | null>(null);

  // Merge default options with provided options
  const mergedOption = useMemo<EChartsOption>(() => {
    const baseOption: EChartsOption = {
      animation: true,
      animationDuration: 300,
      grid: {
        left: 60,
        right: 40,
        top: 40,
        bottom: showDataZoom ? 80 : 40,
        containLabel: false,
      },
      tooltip: {
        trigger: 'axis',
        confine: true,
      },
    };

    // Add dataZoom if enabled
    if (showDataZoom) {
      baseOption.dataZoom = [
        {
          type: 'inside',
          start: 0,
          end: 100,
          zoomOnMouseWheel: true,
          moveOnMouseMove: true,
        },
        {
          type: 'slider',
          start: 0,
          end: 100,
          height: 20,
          bottom: 10,
          showDetail: false,
        },
      ];
    }

    // Add toolbox if enabled
    if (showToolbox) {
      baseOption.toolbox = {
        feature: {
          saveAsImage: {
            title: 'Save as PNG',
            pixelRatio: 2,
          },
          dataZoom: {
            title: { zoom: 'Zoom', back: 'Reset' },
          },
          restore: {
            title: 'Reset',
          },
        },
        right: 20,
        top: 10,
        iconStyle: {
          borderColor: '#666',
        },
        emphasis: {
          iconStyle: {
            borderColor: '#ff6b00',
          },
        },
      };
    }

    // Deep merge with provided option
    return {
      ...baseOption,
      ...option,
      grid: { ...baseOption.grid, ...(option.grid as object) },
      tooltip: { ...baseOption.tooltip, ...(option.tooltip as object) },
    };
  }, [option, showDataZoom, showToolbox]);

  // Initialize chart
  useEffect(() => {
    if (!containerRef.current) return;

    // Create chart instance
    chartRef.current = echarts.init(containerRef.current, 'leetTerminal', {
      renderer: 'canvas',
    });

    // Notify parent
    if (onChartReady) {
      onChartReady(chartRef.current);
    }

    // Cleanup
    return () => {
      chartRef.current?.dispose();
      chartRef.current = null;
    };
  }, []);

  // Update chart options
  useEffect(() => {
    if (chartRef.current) {
      chartRef.current.setOption(mergedOption, { notMerge: false });
    }
  }, [mergedOption]);

  // Handle loading state
  useEffect(() => {
    if (chartRef.current) {
      if (loading) {
        chartRef.current.showLoading('default', {
          text: '',
          color: '#ff6b00',
          maskColor: 'rgba(0, 0, 0, 0.8)',
        });
      } else {
        chartRef.current.hideLoading();
      }
    }
  }, [loading]);

  // ResizeObserver for responsive sizing
  useEffect(() => {
    if (!containerRef.current) return;

    const resizeObserver = new ResizeObserver(() => {
      if (chartRef.current) {
        chartRef.current.resize();
      }
    });

    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className={`echarts-wrapper ${className}`}
      style={{
        width: '100%',
        height: typeof height === 'number' ? `${height}px` : height,
        minHeight: '200px',
      }}
    />
  );
}

export { echarts };
export default EChartsWrapper;
