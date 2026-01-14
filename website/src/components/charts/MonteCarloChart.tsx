/**
 * Monte Carlo Chart Component (ECharts)
 *
 * Displays Monte Carlo simulation results with:
 * - Multiple sample paths
 * - Median line highlighted
 * - Color coding for profit/loss
 * - Compact mode for panel embedding
 * - Fullscreen expansion for detailed view
 */

import React, { useState, useMemo } from 'react';
import type { EChartsOption } from 'echarts';
import { EChartsWrapper } from './EChartsWrapper';
import { ChartModal, ExpandButton } from './ChartModal';

interface MonteCarloChartProps {
  samplePaths: number[][];
  medianPath: number[];
  startingCapital: number;
  height?: number | string;
  showExpand?: boolean;
  title?: string;
}

export function MonteCarloChart({
  samplePaths,
  medianPath,
  startingCapital,
  height = 300,
  showExpand = true,
  title = 'Monte Carlo Simulation',
}: MonteCarloChartProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Determine if we're in compact mode (small height)
  const isCompact = typeof height === 'string' || (typeof height === 'number' && height < 200);

  // Generate chart options - simplified for compact mode
  const chartOption = useMemo<EChartsOption>(() => {
    if (!samplePaths || samplePaths.length === 0) {
      return {
        graphic: {
          type: 'text',
          left: 'center',
          top: 'center',
          style: {
            text: 'No simulation data',
            fill: '#666',
            fontSize: 12,
          },
        },
      };
    }

    // Create series for each path
    const series: EChartsOption['series'] = [];

    // Sample paths (limit to 40 for performance)
    const pathsToShow = samplePaths.slice(0, 40);
    pathsToShow.forEach((path, index) => {
      const finalValue = path[path.length - 1] || 0;
      const isProfitable = finalValue >= startingCapital;

      series.push({
        name: `Path ${index + 1}`,
        type: 'line',
        data: path,
        symbol: 'none',
        lineStyle: {
          width: 1,
          color: isProfitable
            ? 'rgba(0, 210, 106, 0.3)'
            : 'rgba(255, 59, 59, 0.3)',
        },
        silent: true,
        z: 1,
      });
    });

    // Median path (highlighted)
    if (medianPath && medianPath.length > 0) {
      series.push({
        name: 'Median',
        type: 'line',
        data: medianPath,
        symbol: 'none',
        lineStyle: {
          width: 2,
          color: '#ff6b00',
        },
        z: 10,
      });
    }

    // Starting capital reference line
    const maxLength = Math.max(
      ...samplePaths.map((p) => p.length),
      medianPath?.length || 0
    );
    series.push({
      name: 'Start',
      type: 'line',
      data: Array(maxLength).fill(startingCapital),
      symbol: 'none',
      lineStyle: {
        width: 1,
        color: '#333',
        type: 'dashed',
      },
      silent: true,
      z: 0,
    });

    return {
      // No title in compact mode - panel header handles it
      tooltip: isCompact ? { show: false } : {
        trigger: 'axis',
        confine: true,
        formatter: (params: unknown) => {
          const p = params as Array<{ dataIndex: number; seriesName: string; value: number }>;
          if (!Array.isArray(p) || p.length === 0) return '';
          const trade = p[0].dataIndex;
          const medianValue = p.find((item) => item.seriesName === 'Median');
          if (medianValue) {
            const val = medianValue.value;
            const pct = ((val - startingCapital) / startingCapital * 100).toFixed(1);
            return `Trade #${trade}<br/>Median: $${val.toLocaleString()} (${pct}%)`;
          }
          return `Trade #${trade}`;
        },
      },
      // No legend in compact mode
      legend: isCompact ? { show: false } : {
        data: ['Median', 'Start'],
        right: 10,
        top: 5,
        textStyle: { fontSize: 10, color: '#888' },
        itemWidth: 12,
        itemHeight: 8,
      },
      xAxis: {
        type: 'category',
        data: Array.from({ length: maxLength }, (_, i) => i),
        axisLine: { lineStyle: { color: '#333' } },
        axisTick: { show: false },
        axisLabel: {
          show: !isCompact,
          fontSize: 9,
          color: '#666',
          formatter: (value: string) => {
            const num = parseInt(value);
            return num % 50 === 0 ? num.toString() : '';
          },
        },
        splitLine: { show: false },
      },
      yAxis: {
        type: 'value',
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: {
          show: !isCompact,
          fontSize: 9,
          color: '#666',
          formatter: (value: number) => {
            if (value >= 1000000) return `$${(value / 1000000).toFixed(0)}M`;
            if (value >= 1000) return `$${(value / 1000).toFixed(0)}k`;
            return `$${value}`;
          },
        },
        splitLine: {
          lineStyle: { color: '#1a1a1a' },
        },
      },
      series,
      grid: isCompact
        ? { left: 5, right: 5, top: 5, bottom: 5, containLabel: false }
        : { left: 50, right: 20, top: 30, bottom: 30 },
      animation: false,
    };
  }, [samplePaths, medianPath, startingCapital, isCompact]);

  // Full chart options for expanded view
  const expandedChartOption = useMemo<EChartsOption>(() => {
    if (!samplePaths || samplePaths.length === 0) {
      return chartOption;
    }

    const series: EChartsOption['series'] = [];
    const pathsToShow = samplePaths.slice(0, 40);

    pathsToShow.forEach((path, index) => {
      const finalValue = path[path.length - 1] || 0;
      const isProfitable = finalValue >= startingCapital;
      series.push({
        name: `Path ${index + 1}`,
        type: 'line',
        data: path,
        symbol: 'none',
        lineStyle: {
          width: 1,
          color: isProfitable
            ? 'rgba(0, 210, 106, 0.3)'
            : 'rgba(255, 59, 59, 0.3)',
        },
        silent: true,
        z: 1,
      });
    });

    if (medianPath && medianPath.length > 0) {
      series.push({
        name: 'Median',
        type: 'line',
        data: medianPath,
        symbol: 'none',
        lineStyle: { width: 2.5, color: '#ff6b00' },
        z: 10,
      });
    }

    const maxLength = Math.max(...samplePaths.map((p) => p.length), medianPath?.length || 0);
    series.push({
      name: 'Starting Capital',
      type: 'line',
      data: Array(maxLength).fill(startingCapital),
      symbol: 'none',
      lineStyle: { width: 1, color: '#444', type: 'dashed' },
      silent: true,
      z: 0,
    });

    return {
      title: {
        text: title,
        subtext: `${pathsToShow.length} sample paths shown`,
        left: 20,
        top: 10,
        textStyle: { color: '#fff', fontSize: 16 },
        subtextStyle: { color: '#888', fontSize: 12 },
      },
      tooltip: {
        trigger: 'axis',
        confine: true,
        formatter: (params: unknown) => {
          const p = params as Array<{ dataIndex: number; seriesName: string; value: number }>;
          if (!Array.isArray(p) || p.length === 0) return '';
          const trade = p[0].dataIndex;
          const medianValue = p.find((item) => item.seriesName === 'Median');
          if (medianValue) {
            const val = medianValue.value;
            const pct = ((val - startingCapital) / startingCapital * 100).toFixed(1);
            const color = val >= startingCapital ? '#00d26a' : '#ff3b3b';
            return `<div style="font-weight:500">Trade #${trade}</div>
                    <div>Median: <span style="color:${color}">$${val.toLocaleString()}</span> (${pct}%)</div>`;
          }
          return `Trade #${trade}`;
        },
      },
      legend: {
        data: ['Median', 'Starting Capital'],
        right: 20,
        top: 10,
        textStyle: { fontSize: 11, color: '#888' },
      },
      xAxis: {
        type: 'category',
        name: 'Trade #',
        nameLocation: 'middle',
        nameGap: 25,
        data: Array.from({ length: maxLength }, (_, i) => i),
        axisLine: { lineStyle: { color: '#444' } },
        axisLabel: {
          fontSize: 10,
          color: '#888',
          formatter: (value: string) => {
            const num = parseInt(value);
            return num % 20 === 0 ? num.toString() : '';
          },
        },
      },
      yAxis: {
        type: 'value',
        name: 'Capital',
        nameLocation: 'middle',
        nameGap: 50,
        axisLine: { show: false },
        axisLabel: {
          fontSize: 10,
          color: '#888',
          formatter: (value: number) => {
            if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
            if (value >= 1000) return `$${(value / 1000).toFixed(0)}k`;
            return `$${value}`;
          },
        },
        splitLine: { lineStyle: { color: '#222' } },
      },
      series,
      grid: { left: 70, right: 40, top: 60, bottom: 60 },
      dataZoom: [
        { type: 'inside', xAxisIndex: 0 },
        { type: 'slider', xAxisIndex: 0, bottom: 10, height: 20 },
      ],
    };
  }, [samplePaths, medianPath, startingCapital, title, chartOption]);

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      {/* Expand button - positioned in top right corner */}
      {showExpand && (
        <div style={{ position: 'absolute', top: 4, right: 4, zIndex: 10 }}>
          <ExpandButton onClick={() => setIsExpanded(true)} />
        </div>
      )}

      {/* Main chart - fills container */}
      <EChartsWrapper
        option={chartOption}
        height={height}
        showDataZoom={false}
        showToolbox={false}
      />

      {/* Fullscreen modal */}
      <ChartModal
        isOpen={isExpanded}
        onClose={() => setIsExpanded(false)}
        title={title}
        helpText="Monte Carlo simulation showing possible portfolio outcomes. Orange line is the median path. Green paths end in profit, red paths end in loss."
      >
        <EChartsWrapper
          option={expandedChartOption}
          height="100%"
          showDataZoom={true}
          showToolbox={true}
        />
      </ChartModal>
    </div>
  );
}

export default MonteCarloChart;
