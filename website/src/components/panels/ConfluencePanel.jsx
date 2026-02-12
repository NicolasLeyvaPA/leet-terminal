import { PanelHeader } from '../PanelHeader';
import { QuantEngine } from '../../utils/quantEngine';
import logger from '../../utils/logger';

export const ConfluencePanel = ({ market }) => {
  if (!market)
    return (
      <div className="terminal-panel h-full flex items-center justify-center text-gray-600 text-xs">
        Select a market
      </div>
    );

  // Validate factors data exists
  const factors = market.factors || {};
  const hasFactors = Object.keys(factors).length > 0;

  // Safely calculate confluence with fallback - only count REAL factors
  let confluence = { score: 0, bullishFactors: 0, bearishFactors: 0, realFactors: 0, totalFactors: 0 };
  try {
    if (hasFactors) {
      const realFactors = Object.entries(factors).filter(([, f]) => f && f.isReal);
      confluence.realFactors = realFactors.length;
      confluence.totalFactors = Object.keys(factors).length;
      
      // Only calculate from real data
      realFactors.forEach(([, factor]) => {
        if (factor.contribution > 0.01) confluence.bullishFactors++;
        if (factor.contribution < -0.01) confluence.bearishFactors++;
      });
      
      // Score based on real factors only
      if (realFactors.length > 0) {
        const totalContribution = realFactors.reduce((sum, [, f]) => sum + (f.contribution || 0), 0);
        confluence.score = 0.5 + totalContribution;
      } else {
        confluence.score = 0.5; // Neutral when no real data
      }
    }
  } catch {
    logger.warn('Failed to calculate confluence');
  }

  // Sort factors: real data first, then by contribution magnitude
  const sortedFactors = hasFactors
    ? Object.entries(factors)
        .filter(([, factor]) => factor && typeof factor.contribution === 'number')
        .sort((a, b) => {
          // Real data first
          if (a[1].isReal && !b[1].isReal) return -1;
          if (!a[1].isReal && b[1].isReal) return 1;
          // Then by contribution magnitude
          return Math.abs(b[1].contribution) - Math.abs(a[1].contribution);
        })
    : [];

  return (
    <div className="terminal-panel h-full">
      <PanelHeader
        title="CONFLUENCE"
        subtitle={confluence.realFactors > 0 
          ? `${confluence.realFactors}/${confluence.totalFactors} real` 
          : 'Analysis'
        }
      />
      <div className="panel-content p-2 overflow-y-auto">
        {/* Confluence Score - only meaningful with real data */}
        <div className="mb-3">
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-gray-500">Signal Confluence</span>
            <span
              className={
                confluence.realFactors === 0
                  ? "text-gray-500"
                  : confluence.score > 0.6
                  ? "positive"
                  : confluence.score > 0.4
                  ? "neutral"
                  : "negative"
              }
            >
              {confluence.realFactors > 0 
                ? `${(confluence.score * 100).toFixed(0)}%`
                : 'N/A'
              }
            </span>
          </div>
          <div className="confluence-bar">
            <div
              className="confluence-fill"
              style={{
                width: confluence.realFactors > 0 ? `${confluence.score * 100}%` : '50%',
                background:
                  confluence.realFactors === 0
                    ? "#555"
                    : confluence.score > 0.6
                    ? "#00d26a"
                    : confluence.score > 0.4
                    ? "#ffd000"
                    : "#ff3b3b",
              }}
            />
          </div>
          <div className="flex justify-between text-xs mt-1">
            <span className={confluence.realFactors > 0 ? "positive" : "text-gray-600"}>
              {confluence.bullishFactors} bullish
            </span>
            <span className={confluence.realFactors > 0 ? "negative" : "text-gray-600"}>
              {confluence.bearishFactors} bearish
            </span>
          </div>
        </div>

        <div className="text-xs text-gray-600 mb-1 flex items-center justify-between">
          <span>FACTOR CONTRIBUTIONS</span>
          <span className="text-[9px]">
            <span className="text-green-500">●</span> Real
            <span className="mx-1">|</span>
            <span className="text-gray-600">○</span> No data
          </span>
        </div>

        {!hasFactors ? (
          <div className="text-xs text-gray-500 py-2">
            Factor data unavailable
          </div>
        ) : (
          sortedFactors.map(([key, factor]) => {
            const contribution = factor?.contribution || 0;
            const isReal = factor?.isReal;
            const hasNoData = factor?.value === null;
            // Limit the bar width to max 50% to prevent overflow
            const barWidth = Math.min(Math.abs(contribution) * 500, 50);
            
            return (
              <div key={key} className={`mb-2 ${hasNoData ? 'opacity-50' : ''}`}>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-400 capitalize flex items-center gap-1">
                    {key.replace(/_/g, " ")}
                    {isReal && <span className="text-green-500 text-[9px]">●</span>}
                    {hasNoData && <span className="text-gray-600 text-[9px]">○</span>}
                  </span>
                  <span
                    className={
                      hasNoData
                        ? "text-gray-600"
                        : contribution > 0
                        ? "positive"
                        : contribution < 0
                        ? "negative"
                        : "text-gray-500"
                    }
                  >
                    {hasNoData 
                      ? "No data"
                      : `${contribution > 0 ? "+" : ""}${(contribution * 100).toFixed(1)}%`
                    }
                  </span>
                </div>
                {!hasNoData && (
                  <div className="shap-bar relative overflow-hidden">
                    {/* Center divider with explicit z-index */}
                    <div
                      className="absolute inset-y-0 left-1/2 w-px bg-gray-700"
                      style={{ zIndex: 1 }}
                    />
                    {/* Contribution bars with z-index below divider */}
                    {contribution < 0 && (
                      <div
                        className="shap-negative h-full absolute right-1/2"
                        style={{
                          width: `${barWidth}%`,
                          zIndex: 0,
                        }}
                      />
                    )}
                    {contribution > 0 && (
                      <div
                        className="shap-positive h-full absolute left-1/2"
                        style={{
                          width: `${barWidth}%`,
                          zIndex: 0,
                        }}
                      />
                    )}
                  </div>
                )}
                <div className="text-[10px] text-gray-600 mt-0.5">
                  {factor?.desc || ''}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
