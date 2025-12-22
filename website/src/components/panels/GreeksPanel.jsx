import { PanelHeader } from '../PanelHeader';
import { DataRow } from '../DataRow';

export const GreeksPanel = ({ market }) => {
  if (!market)
    return (
      <div className="terminal-panel h-full flex items-center justify-center text-gray-600 text-xs">
        Select a market
      </div>
    );

  return (
    <div className="terminal-panel h-full">
      <PanelHeader title="GREEKS" subtitle="Risk metrics" />
      <div className="panel-content p-2">
        <div className="text-xs text-gray-600 mb-1">
          SENSITIVITIES
        </div>
        <DataRow
          label="Delta (Δ)"
          value={market.greeks.delta.toFixed(3)}
          type={market.greeks.delta > 0 ? "positive" : "negative"}
        />
        <DataRow
          label="Gamma (Γ)"
          value={market.greeks.gamma.toFixed(3)}
        />
        <DataRow
          label="Theta (Θ)"
          value={market.greeks.theta.toFixed(4)}
          type="negative"
        />
        <DataRow
          label="Vega (ν)"
          value={market.greeks.vega.toFixed(3)}
        />
        <DataRow
          label="Rho (ρ)"
          value={market.greeks.rho.toFixed(3)}
        />

        <div className="text-xs text-gray-600 mt-3 mb-1">
          CORRELATIONS
        </div>
        {Object.entries(market.correlations)
          .slice(0, 4)
          .map(([ticker, corr]) => (
            <DataRow
              key={ticker}
              label={ticker}
              value={corr.toFixed(2)}
              type={
                corr > 0.3
                  ? "positive"
                  : corr < -0.3
                  ? "negative"
                  : ""
              }
            />
          ))}
      </div>
    </div>
  );
};

