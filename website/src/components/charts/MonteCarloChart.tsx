/**
 * Monte Carlo Chart Component (ECharts)
 *
 * Displays Monte Carlo simulation results with:
 * - Multiple sample paths
 * - Median line highlighted
 * - Color coding for profit/loss
 * - Zoom, pan, and tooltips
 * - Fullscreen expansion
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

  // Generate chart options
  const chartOption = useMemo<EChartsOption>(() => {
    if (!samplePaths || samplePaths.length === 0) {
      return {
        title: {
          text: 'No simulation data',
          left: 'center',
          top: 'center',
          textStyle: { color: '#666', fontSize: 14 },
        },
      };
    }

    // Create series for each path
    const series: EChartsOption['series'] = [];

    // Sample paths
    samplePaths.forEach((path, index) => {
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
            ? 'rgba(0, 210, 106, 0.25)'
            : 'rgba(255, 59, 59, 0.25)',
        },
        emphasis: {
          lineStyle: {
            width: 2,
            color: isProfitable ? '#00d26a' : '#ff3b3b',
          },
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
          width: 2.5,
          color: '#ff6b00',
        },
        emphasis: {
          lineStyle: {
            width: 3,
          },
        },
        z: 10,
      });
    }

    // Starting capital reference line
    series.push({
      name: 'Starting Capital',
      type: 'line',
      data: Array(Math.max(...samplePaths.map((p) => p.length), medianPath.length))
        .fill(startingCapital),
      symbol: 'none',
      lineStyle: {
        width: 1,
        color: '#444',
        type: 'dashed',
      },
      silent: true,
      z: 0,
    });

    return {
      title: {
        text: title,
        subtext: `${samplePaths.length} sample paths shown`,
        left: 20,
        top: 10,
      },
      tooltip: {
        trigger: 'axis',
        formatter: (params: any) => {
          if (!Array.isArray(params) || params.length === 0) return '';
          const trade = params[0].dataIndex;
          const medianValue = params.find((p: any) => p.seriesName === 'Median');

          let html = `<div style="font-weight:500;margin-bottom:4px;">Trade #${trade}</div>`;

          if (medianValue) {
            const val = medianValue.value as number;
            const pct = ((val - startingCapital) / startingCapital * 100).toFixed(1);
            const color = val >= startingCapital ? '#00d26a' : '#ff3b3b';
            html += `<div>Median: <span style="color:${color};font-weight:500;">$${val.toLocaleString()}</span> (${pct}%)</div>`;
          }

          return html;
        },
      },
      legend: {
        data: ['Median', 'Starting Capital'],
        right: 20,
        top: 10,
        textStyle: { fontSize: 11 },
      },
      xAxis: {
        type: 'category',
        name: 'Trade #',
        nameLocation: 'middle',
        nameGap: 30,
        data: Array.from(
          { length: Math.max(...samplePaths.map((p) => p.length), medianPath.length) },
          (_, i) => i
        ),
        axisLabel: {
          formatter: (value: string) => {
            const num = parseInt(value);
            if (num % 20 === 0) return num.toString();
            return '';
          },
        },
      },
      yAxis: {
        type: 'value',
        name: 'Capital',
        nameLocation: 'middle',
        nameGap: 50,
        axisLabel: {
          formatter: (value: number) => {
            if (value >= 1000) return `$${(value / 1000).toFixed(0)}k`;
            return `$${value}`;
          },
        },
        splitLine: {
          lineStyle: { color: '#1a1a1a' },
        },
      },
      series,
      grid: {
        left: 70,
        right: 40,
        top: 70,
        bottom: 80,
      },
    };
  }, [samplePaths, medianPath, startingCapital, title]);

  // Render chart
  const renderChart = (chartHeight: number | string) => (
    <EChartsWrapper
      option={chartOption}
      height={chartHeight}
      showDataZoom={true}
      showToolbox={isExpanded}
    />
  );

  return (
    <div className="monte-carlo-chart-container">
      {/* Header with expand button */}
      {showExpand && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            marginBottom: '8px',
          }}
        >
          <ExpandButton onClick={() => setIsExpanded(true)} />
        </div>
      )}

      {/* Main chart */}
      {renderChart(height)}

      {/* Fullscreen modal */}
      <ChartModal
        isOpen={isExpanded}
        onClose={() => setIsExpanded(false)}
        title={title}
        helpText="Monte Carlo simulation showing possible portfolio outcomes. Orange line is the median path."
      >
        {renderChart('100%')}
      </ChartModal>
    </div>
  );
}

export default MonteCarloChart;
