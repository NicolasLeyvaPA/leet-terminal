/**
 * OutcomesTable Component
 *
 * Renders a table/list of outcomes for categorical (multi-outcome) markets.
 * Supports sorting, search/filter, and displays probabilities/prices.
 * For TIME_BUCKET markets, delegates to DateTabs component.
 */

import React, { useState, useMemo } from 'react';
import type { NormalizedOutcome, MarketType } from '@leet-terminal/shared/contracts';
import { DateTabs } from './DateTabs';

interface OutcomesTableProps {
  outcomes: NormalizedOutcome[];
  marketType?: MarketType;
  maxVisible?: number;
  showSearch?: boolean;
  compact?: boolean;
  onOutcomeClick?: (outcome: NormalizedOutcome) => void;
}

type SortField = 'probability' | 'label' | 'volume';
type SortDirection = 'asc' | 'desc';

export function OutcomesTable({
  outcomes,
  marketType,
  maxVisible = 10,
  showSearch = true,
  compact = false,
  onOutcomeClick,
}: OutcomesTableProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<SortField>('probability');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [showAll, setShowAll] = useState(false);

  // Filter and sort outcomes - must be called before any returns (React hooks rules)
  const processedOutcomes = useMemo(() => {
    let filtered = outcomes;

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = outcomes.filter((o) =>
        o.label.toLowerCase().includes(query)
      );
    }

    // Sort
    const sorted = [...filtered].sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'probability':
          comparison = (a.probability || 0) - (b.probability || 0);
          break;
        case 'label':
          comparison = a.label.localeCompare(b.label);
          break;
        case 'volume':
          comparison = (a.volume || 0) - (b.volume || 0);
          break;
      }
      return sortDirection === 'desc' ? -comparison : comparison;
    });

    return sorted;
  }, [outcomes, searchQuery, sortField, sortDirection]);

  // Visible outcomes (with "show more" support)
  const visibleOutcomes = showAll
    ? processedOutcomes
    : processedOutcomes.slice(0, maxVisible);
  const hasMore = processedOutcomes.length > maxVisible;

  // Toggle sort
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  // Get color for probability
  const getProbColor = (prob: number): string => {
    if (prob >= 0.7) return 'text-green-400';
    if (prob >= 0.4) return 'text-yellow-400';
    if (prob >= 0.2) return 'text-orange-400';
    return 'text-gray-400';
  };

  // Delegate to DateTabs for TIME_BUCKET markets (after all hooks are called)
  if (marketType === 'TIME_BUCKET') {
    return (
      <DateTabs
        outcomes={outcomes}
        onOutcomeClick={onOutcomeClick}
        compact={compact}
      />
    );
  }

  if (outcomes.length === 0) {
    return (
      <div className="text-gray-500 text-xs text-center py-4">
        No outcomes available
      </div>
    );
  }

  return (
    <div className="outcomes-table">
      {/* Search */}
      {showSearch && outcomes.length > 5 && (
        <div className="mb-2">
          <input
            type="text"
            placeholder="Search outcomes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-2 py-1 text-xs bg-gray-900 border border-gray-700 rounded outline-none focus:border-orange-500 text-gray-300 placeholder-gray-600"
          />
        </div>
      )}

      {/* Header */}
      {!compact && (
        <div className="flex items-center gap-2 text-[10px] text-gray-500 mb-1 px-1">
          <button
            onClick={() => handleSort('label')}
            className={`flex-1 text-left hover:text-gray-300 ${
              sortField === 'label' ? 'text-orange-500' : ''
            }`}
          >
            OUTCOME {sortField === 'label' && (sortDirection === 'asc' ? '↑' : '↓')}
          </button>
          <button
            onClick={() => handleSort('probability')}
            className={`w-16 text-right hover:text-gray-300 ${
              sortField === 'probability' ? 'text-orange-500' : ''
            }`}
          >
            PROB {sortField === 'probability' && (sortDirection === 'asc' ? '↑' : '↓')}
          </button>
          {!compact && (
            <button
              onClick={() => handleSort('volume')}
              className={`w-16 text-right hover:text-gray-300 ${
                sortField === 'volume' ? 'text-orange-500' : ''
              }`}
            >
              VOL {sortField === 'volume' && (sortDirection === 'asc' ? '↑' : '↓')}
            </button>
          )}
        </div>
      )}

      {/* Outcomes list */}
      <div className="space-y-0.5">
        {visibleOutcomes.map((outcome, index) => (
          <div
            key={outcome.id}
            onClick={() => onOutcomeClick?.(outcome)}
            className={`flex items-center gap-2 px-2 py-1.5 rounded transition-colors ${
              onOutcomeClick ? 'cursor-pointer hover:bg-gray-800' : ''
            } ${index === 0 ? 'bg-gray-800/50' : 'bg-gray-900/30'}`}
          >
            {/* Rank indicator */}
            <span className={`text-[10px] w-4 ${index === 0 ? 'text-orange-500 font-bold' : 'text-gray-600'}`}>
              {index + 1}
            </span>

            {/* Outcome label */}
            <span className={`flex-1 text-xs ${compact ? '' : 'truncate'} ${
              index === 0 ? 'text-white font-medium' : 'text-gray-300'
            }`}>
              {outcome.label}
            </span>

            {/* Probability bar (visual) */}
            <div className="w-16 h-1.5 bg-gray-800 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${
                  index === 0 ? 'bg-orange-500' : 'bg-gray-600'
                }`}
                style={{ width: `${Math.max(2, outcome.probability * 100)}%` }}
              />
            </div>

            {/* Probability value */}
            <span className={`w-12 text-right text-xs mono font-medium ${getProbColor(outcome.probability)}`}>
              {(outcome.probability * 100).toFixed(1)}%
            </span>

            {/* Volume (if available and not compact) */}
            {!compact && outcome.volume !== undefined && (
              <span className="w-14 text-right text-[10px] text-gray-500 mono">
                ${(outcome.volume / 1000).toFixed(1)}k
              </span>
            )}

            {/* Bid/Ask spread indicator */}
            {!compact && outcome.best_bid !== undefined && outcome.best_ask !== undefined && (
              <span className="text-[9px] text-gray-600">
                {((outcome.best_ask - outcome.best_bid) * 100).toFixed(1)}%
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Show more/less */}
      {hasMore && (
        <button
          onClick={() => setShowAll(!showAll)}
          className="w-full mt-2 py-1 text-[10px] text-gray-500 hover:text-orange-500 transition-colors border border-gray-800 rounded hover:border-orange-500/30"
        >
          {showAll ? `Show less` : `Show all ${processedOutcomes.length} outcomes`}
        </button>
      )}

      {/* No results message */}
      {processedOutcomes.length === 0 && searchQuery && (
        <div className="text-gray-500 text-xs text-center py-2">
          No outcomes match &quot;{searchQuery}&quot;
        </div>
      )}
    </div>
  );
}

/**
 * Compact version for panel embedding
 */
export function OutcomesListCompact({
  outcomes,
  maxVisible = 5,
}: {
  outcomes: NormalizedOutcome[];
  maxVisible?: number;
}) {
  const topOutcomes = useMemo(() => {
    return [...outcomes]
      .sort((a, b) => b.probability - a.probability)
      .slice(0, maxVisible);
  }, [outcomes, maxVisible]);

  return (
    <div className="space-y-1">
      {topOutcomes.map((outcome, index) => (
        <div
          key={outcome.id}
          className="flex items-center justify-between text-xs"
        >
          <span className={`truncate ${index === 0 ? 'text-white' : 'text-gray-400'}`}>
            {outcome.label}
          </span>
          <span className={`mono ml-2 ${
            outcome.probability >= 0.5 ? 'text-green-400' : 'text-gray-400'
          }`}>
            {(outcome.probability * 100).toFixed(1)}%
          </span>
        </div>
      ))}
      {outcomes.length > maxVisible && (
        <div className="text-[10px] text-gray-500 text-center">
          +{outcomes.length - maxVisible} more
        </div>
      )}
    </div>
  );
}

export default OutcomesTable;
