import { PanelHeader } from '../PanelHeader';
import { DataRow } from '../DataRow';
import { Tag } from '../Tag';
import { QuantEngine } from '../../utils/quantEngine';

export const MarketOverviewPanel = ({ market }) => {
  if (!market)
    return (
      <div className="terminal-panel h-full flex items-center justify-center text-gray-600 text-xs">
        Select a market
      </div>
    );

  const edge = market.model_prob - market.market_prob;
  const kelly = QuantEngine.kelly(market.model_prob, market.market_prob);
  const ev = QuantEngine.expectedValue(market.model_prob, market.market_prob);

  return (
    <div className="terminal-panel h-full">
      <PanelHeader title={market.ticker} subtitle={market.platform} />
      <div className="panel-content p-2">
        <div className="text-xs text-gray-400 mb-2 leading-tight">
          {market.question}
        </div>

        <div className="flex gap-1 mb-3">
          <Tag type="category">{market.category}</Tag>
          <Tag
            type={
              edge > 0.03 ? "buy" : edge < -0.03 ? "sell" : "hold"
            }
          >
            {edge > 0.03 ? "BUY" : edge < -0.03 ? "SELL" : "HOLD"}
          </Tag>
        </div>

        <div className="grid grid-cols-2 gap-x-3">
          <DataRow
            label="Market"
            value={`${(market.market_prob * 100).toFixed(2)}¢`}
          />
          <DataRow
            label="Model"
            value={`${(market.model_prob * 100).toFixed(2)}¢`}
            type="info"
          />
          <DataRow
            label="Edge"
            value={`${edge > 0 ? "+" : ""}${(edge * 100).toFixed(2)}%`}
            type={edge > 0 ? "positive" : "negative"}
          />
          <DataRow
            label="Kelly¼"
            value={`${(kelly.quarter * 100).toFixed(2)}%`}
            type="highlight"
          />
          <DataRow
            label="EV/$1k"
            value={`$${ev.ev.toFixed(0)}`}
            type={ev.ev > 0 ? "positive" : "negative"}
          />
          <DataRow
            label="Spread"
            value={`${(market.spread * 100).toFixed(2)}%`}
          />
        </div>

        <div className="border-t border-gray-800 mt-2 pt-2">
          <div className="text-xs text-gray-600 mb-1">MARKET DATA</div>
          <DataRow
            label="Vol 24h"
            value={`$${(market.volume_24h / 1000).toFixed(0)}k`}
            small
          />
          <DataRow
            label="Liquidity"
            value={`$${(market.liquidity / 1000).toFixed(0)}k`}
            small
          />
          <DataRow
            label="OI"
            value={`$${(market.open_interest / 1000000).toFixed(2)}M`}
            small
          />
          <DataRow
            label="Trades"
            value={market.trades_24h.toLocaleString()}
            small
          />
          <DataRow label="Expiry" value={market.end_date} small />
        </div>
      </div>
    </div>
  );
};

