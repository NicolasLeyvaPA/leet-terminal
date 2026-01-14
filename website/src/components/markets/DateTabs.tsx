/**
 * DateTabs Component
 *
 * Horizontal tab navigation for TIME_BUCKET markets.
 * Shows date-based outcomes like "Jan 31 | Feb 28 | Mar 31" with probability bars.
 * Highlights the "LEADING" bucket and "CURRENT" bucket.
 */

import React, { useState, useMemo } from 'react';
import type { NormalizedOutcome, TimeBucket } from '@leet-terminal/shared/contracts';

interface DateTabsProps {
  outcomes: NormalizedOutcome[];
  onOutcomeClick?: (outcome: NormalizedOutcome) => void;
  compact?: boolean;
}

/**
 * Main DateTabs component for TIME_BUCKET markets
 */
export function DateTabs({
  outcomes,
  onOutcomeClick,
  compact = false,
}: DateTabsProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  // Sort outcomes by time_bucket.sort_order or by bucket_date
  const sortedOutcomes = useMemo(() => {
    return [...outcomes].sort((a, b) => {
      const orderA = a.time_bucket?.sort_order ?? 999;
      const orderB = b.time_bucket?.sort_order ?? 999;
      if (orderA !== orderB) return orderA - orderB;

      // Fallback to date comparison
      const dateA = a.time_bucket?.bucket_date ?? '';
      const dateB = b.time_bucket?.bucket_date ?? '';
      return dateA.localeCompare(dateB);
    });
  }, [outcomes]);

  // Find leading (highest probability) and current bucket
  const { leadingIndex, currentIndex } = useMemo(() => {
    let leading = 0;
    let current = -1;
    let maxProb = 0;

    sortedOutcomes.forEach((outcome, index) => {
      if (outcome.probability > maxProb) {
        maxProb = outcome.probability;
        leading = index;
      }
      if (outcome.time_bucket?.is_current_bucket) {
        current = index;
      }
    });

    return { leadingIndex: leading, currentIndex: current };
  }, [sortedOutcomes]);

  // Get probability bar color
  const getProbColor = (prob: number, isLeading: boolean): string => {
    if (isLeading) return 'bg-orange-500';
    if (prob >= 0.3) return 'bg-green-500';
    if (prob >= 0.15) return 'bg-yellow-500';
    return 'bg-gray-600';
  };

  // Get text color based on probability
  const getProbTextColor = (prob: number, isLeading: boolean): string => {
    if (isLeading) return 'text-orange-400';
    if (prob >= 0.3) return 'text-green-400';
    if (prob >= 0.15) return 'text-yellow-400';
    return 'text-gray-400';
  };

  if (outcomes.length === 0) {
    return (
      <div className="text-gray-500 text-xs text-center py-4">
        No date outcomes available
      </div>
    );
  }

  if (compact) {
    return <DateTimeline outcomes={sortedOutcomes} leadingIndex={leadingIndex} />;
  }

  return (
    <div className="date-tabs">
      {/* Tab navigation */}
      <div className="flex overflow-x-auto gap-1 pb-2 scrollbar-thin scrollbar-thumb-gray-700">
        {sortedOutcomes.map((outcome, index) => {
          const isLeading = index === leadingIndex;
          const isCurrent = index === currentIndex;
          const isSelected = selectedIndex === index;

          return (
            <button
              key={outcome.id}
              onClick={() => {
                setSelectedIndex(isSelected ? null : index);
                onOutcomeClick?.(outcome);
              }}
              className={`flex-shrink-0 px-3 py-2 rounded-lg border transition-all ${
                isSelected
                  ? 'bg-orange-500/20 border-orange-500'
                  : isLeading
                  ? 'bg-orange-500/10 border-orange-500/50'
                  : 'bg-gray-900/50 border-gray-700 hover:border-gray-600'
              }`}
            >
              {/* Date label */}
              <div className="flex items-center gap-2">
                <span className={`text-xs font-medium ${
                  isLeading ? 'text-orange-400' : 'text-gray-300'
                }`}>
                  {outcome.time_bucket?.label || outcome.label}
                </span>
                {isLeading && (
                  <span className="text-[9px] px-1 py-0.5 bg-orange-500/30 text-orange-300 rounded">
                    LEADING
                  </span>
                )}
                {isCurrent && !isLeading && (
                  <span className="text-[9px] px-1 py-0.5 bg-blue-500/30 text-blue-300 rounded">
                    NOW
                  </span>
                )}
              </div>

              {/* Probability */}
              <div className={`text-lg font-bold mono mt-1 ${
                getProbTextColor(outcome.probability, isLeading)
              }`}>
                {(outcome.probability * 100).toFixed(1)}%
              </div>

              {/* Probability bar */}
              <div className="w-full h-1 bg-gray-800 rounded-full mt-1 overflow-hidden">
                <div
                  className={`h-full rounded-full ${getProbColor(outcome.probability, isLeading)}`}
                  style={{ width: `${Math.max(2, outcome.probability * 100)}%` }}
                />
              </div>
            </button>
          );
        })}
      </div>

      {/* Selected outcome details */}
      {selectedIndex !== null && sortedOutcomes[selectedIndex] && (
        <div className="mt-3 p-3 bg-gray-900/50 rounded-lg border border-gray-800">
          <OutcomeDetails outcome={sortedOutcomes[selectedIndex]} />
        </div>
      )}
    </div>
  );
}

/**
 * Compact timeline variant for smaller spaces
 */
export function DateTimeline({
  outcomes,
  leadingIndex,
}: {
  outcomes: NormalizedOutcome[];
  leadingIndex: number;
}) {
  return (
    <div className="flex items-center gap-1 overflow-x-auto py-1">
      {outcomes.map((outcome, index) => {
        const isLeading = index === leadingIndex;

        return (
          <div
            key={outcome.id}
            className={`flex-shrink-0 px-2 py-1 rounded text-center ${
              isLeading
                ? 'bg-orange-500/20 border border-orange-500/50'
                : 'bg-gray-800/50'
            }`}
          >
            <div className={`text-[10px] ${isLeading ? 'text-orange-400' : 'text-gray-500'}`}>
              {outcome.time_bucket?.label || outcome.label}
            </div>
            <div className={`text-xs font-bold mono ${
              isLeading ? 'text-orange-400' : 'text-gray-400'
            }`}>
              {(outcome.probability * 100).toFixed(0)}%
            </div>
          </div>
        );
      })}
    </div>
  );
}

/**
 * Outcome details panel
 */
function OutcomeDetails({ outcome }: { outcome: NormalizedOutcome }) {
  const bucket = outcome.time_bucket;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-white">
          {bucket?.label || outcome.label}
        </span>
        <span className="text-lg font-bold mono text-orange-400">
          {(outcome.probability * 100).toFixed(1)}%
        </span>
      </div>

      {bucket?.bucket_date && (
        <div className="text-xs text-gray-500">
          Target date: {new Date(bucket.bucket_date).toLocaleDateString('en-US', {
            weekday: 'short',
            year: 'numeric',
            month: 'short',
            day: 'numeric',
          })}
        </div>
      )}

      <div className="grid grid-cols-2 gap-2 text-xs">
        {outcome.best_bid !== undefined && (
          <div>
            <span className="text-gray-500">Bid: </span>
            <span className="text-green-400 mono">{(outcome.best_bid * 100).toFixed(1)}¢</span>
          </div>
        )}
        {outcome.best_ask !== undefined && (
          <div>
            <span className="text-gray-500">Ask: </span>
            <span className="text-red-400 mono">{(outcome.best_ask * 100).toFixed(1)}¢</span>
          </div>
        )}
        {outcome.volume !== undefined && (
          <div>
            <span className="text-gray-500">Volume: </span>
            <span className="text-gray-300 mono">${(outcome.volume / 1000).toFixed(1)}K</span>
          </div>
        )}
        {outcome.liquidity !== undefined && (
          <div>
            <span className="text-gray-500">Liquidity: </span>
            <span className="text-gray-300 mono">${(outcome.liquidity / 1000).toFixed(1)}K</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default DateTabs;
