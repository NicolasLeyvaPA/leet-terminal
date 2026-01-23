import { PanelHeader } from '../PanelHeader';
import { QuantEngine } from '../../utils/quantEngine';

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

  // Safely calculate confluence with fallback
  let confluence = { score: 0, bullishFactors: 0, bearishFactors: 0 };
  try {
    if (hasFactors) {
      confluence = QuantEngine.calculateConfluence(factors);
    }
  } catch {
    console.warn('Failed to calculate confluence');
  }

  // Safely sort factors with validation
  const sortedFactors = hasFactors
    ? Object.entries(factors)
        .filter(([, factor]) => factor && typeof factor.contribution === 'number')
        .sort((a, b) => Math.abs(b[1].contribution) - Math.abs(a[1].contribution))
    : [];

  return (
    <div className="terminal-panel h-full">
      <PanelHeader
        title="CONFLUENCE"
        subtitle={`Score: ${(confluence.score * 100).toFixed(0)}%`}
      />
      <div className="panel-content p-2">
        <div className="mb-3">
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-gray-500">Overall Confluence</span>
            <span
              className={
                confluence.score > 0.6
                  ? "positive"
                  : confluence.score > 0.4
                  ? "neutral"
                  : "negative"
              }
            >
              {(confluence.score * 100).toFixed(0)}%
            </span>
          </div>
          <div className="confluence-bar">
            <div
              className="confluence-fill"
              style={{
                width: `${confluence.score * 100}%`,
                background:
                  confluence.score > 0.6
                    ? "#00d26a"
                    : confluence.score > 0.4
                    ? "#ffd000"
                    : "#ff3b3b",
              }}
            />
          </div>
          <div className="flex justify-between text-xs mt-1">
            <span className="positive">
              {confluence.bullishFactors} bullish
            </span>
            <span className="negative">
              {confluence.bearishFactors} bearish
            </span>
          </div>
        </div>

        <div className="text-xs text-gray-600 mb-1">
          FACTOR CONTRIBUTIONS
        </div>
        {!hasFactors ? (
          <div className="text-xs text-gray-500 py-2">
            Factor data unavailable
          </div>
        ) : (
          sortedFactors.map(([key, factor]) => {
            const contribution = factor?.contribution || 0;
            // Limit the bar width to max 50% to prevent overflow
            const barWidth = Math.min(Math.abs(contribution) * 500, 50);
            return (
              <div key={key} className="mb-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-400 capitalize">
                    {key.replace(/_/g, " ")}
                  </span>
                  <span
                    className={
                      contribution > 0
                        ? "positive"
                        : contribution < 0
                        ? "negative"
                        : "text-gray-500"
                    }
                  >
                    {contribution > 0 ? "+" : ""}
                    {(contribution * 100).toFixed(1)}%
                  </span>
                </div>
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
                <div className="text-xs text-gray-600 mt-0.5">
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

