import { PanelHeader } from '../PanelHeader';
import { DataRow } from '../DataRow';
import { Tag } from '../Tag';
import { QuantEngine } from '../../utils/quantEngine';

// Validate probability is a valid number between 0 and 1
const isValidProbability = (prob) => {
  return typeof prob === 'number' && !isNaN(prob) && prob >= 0 && prob <= 1;
};

// Safe number formatting helper
const formatValue = (value, decimals = 2, prefix = '', suffix = '') => {
  if (value === undefined || value === null || isNaN(value)) return 'N/A';
  return `${prefix}${Number(value).toFixed(decimals)}${suffix}`;
};

export const MarketOverviewPanel = ({ market }) => {
  if (!market)
    return (
      <div className="terminal-panel h-full flex items-center justify-center text-gray-600 text-xs">
        Select a market
      </div>
    );

  // Safely get probabilities with defaults
  const marketProb = isValidProbability(market.market_prob) ? market.market_prob : 0;
  const modelProb = isValidProbability(market.model_prob) ? market.model_prob : 0;
  const hasValidProbs = isValidProbability(market.market_prob) && isValidProbability(market.model_prob);

  const edge = modelProb - marketProb;

  // Safely calculate kelly and EV with error handling
  let kelly = { quarter: 0 };
  let ev = { ev: 0 };

  if (hasValidProbs) {
    try {
      kelly = QuantEngine.kelly(modelProb, marketProb) || { quarter: 0 };
      ev = QuantEngine.expectedValue(modelProb, marketProb) || { ev: 0 };
    } catch {
      console.warn('Failed to calculate kelly/ev');
    }
  }

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
            value={formatValue(marketProb * 100, 2, '', '¢')}
          />
          <DataRow
            label="Model"
            value={formatValue(modelProb * 100, 2, '', '¢')}
            type="info"
          />
          <DataRow
            label="Edge"
            value={`${edge > 0 ? "+" : ""}${formatValue(edge * 100, 2, '', '%')}`}
            type={edge > 0 ? "positive" : "negative"}
          />
          <DataRow
            label="Kelly¼"
            value={formatValue((kelly.quarter || 0) * 100, 2, '', '%')}
            type="highlight"
          />
          <DataRow
            label="EV/$1k"
            value={formatValue(ev.ev, 0, '$', '')}
            type={(ev.ev || 0) > 0 ? "positive" : "negative"}
          />
          <DataRow
            label="Spread"
            value={formatValue((market.spread || 0) * 100, 2, '', '%')}
          />
        </div>

        <div className="border-t border-gray-800 mt-2 pt-2">
          <div className="text-xs text-gray-600 mb-1">MARKET DATA</div>
          <DataRow
            label="Vol 24h"
            value={formatValue((market.volume_24h || 0) / 1000, 0, '$', 'k')}
            small
          />
          <DataRow
            label="Liquidity"
            value={formatValue((market.liquidity || 0) / 1000, 0, '$', 'k')}
            small
          />
          <DataRow
            label="OI"
            value={formatValue((market.open_interest || 0) / 1000000, 2, '$', 'M')}
            small
          />
          <DataRow
            label="Trades"
            value={typeof market.trades_24h === 'number' ? market.trades_24h.toLocaleString() : 'N/A'}
            small
          />
          <DataRow label="Expiry" value={market.end_date || 'N/A'} small />
        </div>
      </div>
    </div>
  );
};

