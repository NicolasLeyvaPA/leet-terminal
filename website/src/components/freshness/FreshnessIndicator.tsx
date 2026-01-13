/**
 * Freshness Indicator Component
 *
 * Displays data freshness metadata with visual indicators for staleness.
 */

import React, { useState, useEffect } from 'react';
import type { DataFreshness } from '@leet-terminal/shared/contracts';
import { formatDataAge, isStale, getDataAge } from '../../api/client';

interface FreshnessIndicatorProps {
  freshness: DataFreshness | undefined;
  onRefresh?: () => void;
  showRefreshButton?: boolean;
  compact?: boolean;
  className?: string;
}

export function FreshnessIndicator({
  freshness,
  onRefresh,
  showRefreshButton = true,
  compact = false,
  className = '',
}: FreshnessIndicatorProps) {
  const [, setTick] = useState(0);

  // Update every 5 seconds to refresh "X seconds ago" display
  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 5000);
    return () => clearInterval(interval);
  }, []);

  if (!freshness) {
    return (
      <div className={`freshness-indicator freshness-unknown ${className}`}>
        <span className="freshness-dot unknown" />
        {!compact && <span className="freshness-text">No data</span>}
      </div>
    );
  }

  const stale = isStale(freshness);
  const age = getDataAge(freshness);
  const ageText = formatDataAge(freshness);

  // Determine status
  let status: 'fresh' | 'aging' | 'stale' | 'error' = 'fresh';
  if (freshness.partial || freshness.sources_status) {
    const hasError = Object.values(freshness.sources_status || {}).some(
      (s) => s === 'error'
    );
    if (hasError) status = 'error';
  }
  if (stale) status = 'stale';
  else if (age > freshness.ttl_seconds * 0.7) status = 'aging';

  const statusColors = {
    fresh: '#00d26a',
    aging: '#ffb800',
    stale: '#ff6b6b',
    error: '#ff3b3b',
  };

  const statusLabels = {
    fresh: 'Fresh',
    aging: 'Aging',
    stale: 'Stale',
    error: 'Partial',
  };

  return (
    <div
      className={`freshness-indicator freshness-${status} ${className}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: compact ? '4px' : '8px',
        fontSize: compact ? '10px' : '11px',
        color: '#888',
      }}
    >
      <span
        className="freshness-dot"
        style={{
          width: compact ? '6px' : '8px',
          height: compact ? '6px' : '8px',
          borderRadius: '50%',
          backgroundColor: statusColors[status],
          boxShadow: `0 0 4px ${statusColors[status]}`,
        }}
        title={`${statusLabels[status]}: ${ageText}`}
      />

      {!compact && (
        <>
          <span className="freshness-text" style={{ color: statusColors[status] }}>
            {ageText}
          </span>

          {freshness.cache_hit && (
            <span
              className="freshness-cache"
              style={{
                fontSize: '9px',
                color: '#666',
                padding: '1px 4px',
                backgroundColor: '#1a1a1a',
                borderRadius: '3px',
              }}
            >
              cached
            </span>
          )}

          {freshness.partial && (
            <span
              className="freshness-partial"
              style={{
                fontSize: '9px',
                color: '#ff6b6b',
                padding: '1px 4px',
                backgroundColor: 'rgba(255, 107, 107, 0.1)',
                borderRadius: '3px',
              }}
            >
              partial
            </span>
          )}
        </>
      )}

      {showRefreshButton && onRefresh && (
        <button
          onClick={onRefresh}
          className="freshness-refresh-btn"
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '2px',
            color: '#666',
            fontSize: compact ? '10px' : '12px',
            lineHeight: 1,
            opacity: 0.7,
            transition: 'opacity 0.2s',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
          onMouseLeave={(e) => (e.currentTarget.style.opacity = '0.7')}
          title="Refresh data"
        >
          ↻
        </button>
      )}
    </div>
  );
}

/**
 * Staleness Warning Banner
 */
export function StalenessWarning({
  freshness,
  onRefresh,
}: {
  freshness: DataFreshness | undefined;
  onRefresh?: () => void;
}) {
  if (!freshness || !isStale(freshness)) return null;

  const age = getDataAge(freshness);
  const minutes = Math.floor(age / 60);

  return (
    <div
      className="staleness-warning"
      style={{
        padding: '8px 12px',
        backgroundColor: 'rgba(255, 107, 107, 0.1)',
        border: '1px solid rgba(255, 107, 107, 0.3)',
        borderRadius: '4px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        fontSize: '12px',
        color: '#ff6b6b',
        marginBottom: '8px',
      }}
    >
      <span>
        ⚠ Data is {minutes > 0 ? `${minutes}m` : `${age}s`} old and may be outdated
      </span>
      {onRefresh && (
        <button
          onClick={onRefresh}
          style={{
            background: 'rgba(255, 107, 107, 0.2)',
            border: '1px solid rgba(255, 107, 107, 0.5)',
            borderRadius: '4px',
            padding: '4px 12px',
            color: '#ff6b6b',
            cursor: 'pointer',
            fontSize: '11px',
          }}
        >
          Refresh Now
        </button>
      )}
    </div>
  );
}

/**
 * Source Status Indicator
 */
export function SourceStatus({
  freshness,
}: {
  freshness: DataFreshness | undefined;
}) {
  if (!freshness?.sources_status) return null;

  return (
    <div
      className="source-status"
      style={{
        display: 'flex',
        gap: '8px',
        fontSize: '10px',
      }}
    >
      {Object.entries(freshness.sources_status).map(([source, status]) => (
        <span
          key={source}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            padding: '2px 6px',
            backgroundColor: '#1a1a1a',
            borderRadius: '3px',
            color: status === 'ok' ? '#00d26a' : '#ff6b6b',
          }}
        >
          <span
            style={{
              width: '5px',
              height: '5px',
              borderRadius: '50%',
              backgroundColor: status === 'ok' ? '#00d26a' : '#ff6b6b',
            }}
          />
          {source}
        </span>
      ))}
    </div>
  );
}

export default FreshnessIndicator;
