import { PanelHeader } from '../PanelHeader';
import { DataRow } from '../DataRow';

export const GreeksPanel = ({ market }) => {
  if (!market)
    return (
      <div className="terminal-panel h-full flex items-center justify-center text-gray-600 text-xs">
        Select a market
      </div>
    );

  // Validate greeks data exists
  const greeks = market.greeks || {};
  const hasGreeks = greeks.delta !== undefined;

  // Validate correlations data exists
  const correlations = market.correlations || {};
  const hasCorrelations = Object.keys(correlations).length > 0;

  // Safe number formatting helper
  const formatNumber = (value, decimals = 3) => {
    if (value === undefined || value === null || isNaN(value)) return 'N/A';
    return Number(value).toFixed(decimals);
  };

  return (
    <div className="terminal-panel h-full">
      <PanelHeader title="GREEKS" subtitle="Risk metrics" />
      <div className="panel-content p-2">
        <div className="text-xs text-gray-600 mb-1">
          SENSITIVITIES
        </div>
        {hasGreeks ? (
          <>
            <DataRow
              label="Delta (Δ)"
              value={formatNumber(greeks.delta)}
              type={greeks.delta > 0 ? "positive" : "negative"}
            />
            <DataRow
              label="Gamma (Γ)"
              value={formatNumber(greeks.gamma)}
            />
            <DataRow
              label="Theta (Θ)"
              value={formatNumber(greeks.theta, 4)}
              type="negative"
            />
            <DataRow
              label="Vega (ν)"
              value={formatNumber(greeks.vega)}
            />
            <DataRow
              label="Rho (ρ)"
              value={formatNumber(greeks.rho)}
            />
          </>
        ) : (
          <div className="text-xs text-gray-500 py-2">
            Greeks data unavailable
          </div>
        )}

        <div className="text-xs text-gray-600 mt-3 mb-1">
          CORRELATIONS
        </div>
        {hasCorrelations ? (
          Object.entries(correlations)
            .slice(0, 4)
            .map(([ticker, corr]) => (
              <DataRow
                key={ticker}
                label={ticker}
                value={formatNumber(corr, 2)}
                type={
                  corr > 0.3
                    ? "positive"
                    : corr < -0.3
                    ? "negative"
                    : ""
                }
              />
            ))
        ) : (
          <div className="text-xs text-gray-500 py-2">
            Correlation data unavailable
          </div>
        )}
      </div>
    </div>
  );
};

