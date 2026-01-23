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

// Format time remaining
const formatTimeRemaining = (dateStr) => {
  if (!dateStr) return 'N/A';
  const target = new Date(dateStr);
  const now = new Date();
  const diff = target - now;
  if (diff < 0) return 'EXPIRED';
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days > 30) return `${Math.floor(days / 30)}mo ${days % 30}d`;
  if (days > 0) return `${days}d`;
  const hours = Math.floor(diff / (1000 * 60 * 60));
  return `${hours}h`;
};

export const MarketOverviewPanel = ({ market }) => {
  if (!market)
    return (
      <div className="terminal-panel h-full flex items-center justify-center text-gray-600 text-xs">
        <div className="text-center">
          <div className="text-orange-500 mb-2">NO MARKET SELECTED</div>
          <div className="text-gray-600 text-[10px]">
            Paste a Polymarket URL above or select from the list
          </div>
        </div>
      </div>
    );

  // Safely get probabilities with defaults
  const marketProb = isValidProbability(market.market_prob) ? market.market_prob : 0;
  const modelProb = isValidProbability(market.model_prob) ? market.model_prob : 0;
  const hasValidProbs = isValidProbability(market.market_prob) && isValidProbability(market.model_prob);

  const edge = modelProb - marketProb;
  const edgePct = edge * 100;
  const signal = edge > 0.03 ? 'BUY' : edge < -0.03 ? 'SELL' : 'HOLD';
  const signalColor = edge > 0.03 ? 'text-green-400' : edge < -0.03 ? 'text-red-400' : 'text-gray-400';

  // Safely calculate kelly and EV with error handling
  let kelly = { quarter: 0, half: 0, full: 0 };
  let ev = { ev: 0, evPct: 0 };

  if (hasValidProbs && marketProb > 0) {
    try {
      kelly = QuantEngine.kelly(modelProb, marketProb) || { quarter: 0, half: 0, full: 0 };
      ev = QuantEngine.expectedValue(modelProb, marketProb) || { ev: 0, evPct: 0 };
    } catch {
      console.warn('Failed to calculate kelly/ev');
    }
  }

  return (
    <div className="terminal-panel h-full">
      <PanelHeader
        title={market.ticker || 'MARKET'}
        subtitle={market.platform || 'Polymarket'}
      />
      <div className="panel-content p-2">
        {/* Question */}
        <div className="text-xs text-gray-400 mb-2 leading-tight line-clamp-2">
          {market.question}
        </div>

        {/* Tags */}
        <div className="flex gap-1 mb-3 flex-wrap">
          {market.category && <Tag type="category">{market.category}</Tag>}
          <Tag type={signal === 'BUY' ? 'buy' : signal === 'SELL' ? 'sell' : 'hold'}>
            {signal}
          </Tag>
          {Math.abs(edge) > 0.05 && (
            <Tag type={edge > 0 ? 'buy' : 'sell'}>STRONG</Tag>
          )}
        </div>

        {/* Main Probability Display */}
        <div className="grid grid-cols-2 gap-2 mb-3">
          <div className="bg-gray-900/50 rounded p-2 border border-gray-800">
            <div className="text-[10px] text-gray-500 mb-0.5">MARKET PRICE</div>
            <div className="text-xl font-bold text-white mono">
              {(marketProb * 100).toFixed(1)}¢
            </div>
            <div className="text-[10px] text-gray-600">
              Bid: {((market.bestBid || marketProb) * 100).toFixed(1)}¢ / Ask: {((market.bestAsk || marketProb) * 100).toFixed(1)}¢
            </div>
          </div>
          <div className="bg-gray-900/50 rounded p-2 border border-gray-800">
            <div className="text-[10px] text-gray-500 mb-0.5">MODEL ESTIMATE</div>
            <div className={`text-xl font-bold mono ${signalColor}`}>
              {(modelProb * 100).toFixed(1)}¢
            </div>
            <div className={`text-[10px] ${signalColor}`}>
              Edge: {edge > 0 ? '+' : ''}{edgePct.toFixed(2)}%
            </div>
          </div>
        </div>

        {/* Edge Analysis */}
        <div className={`rounded p-2 mb-3 border ${
          Math.abs(edge) > 0.03
            ? edge > 0
              ? 'bg-green-500/10 border-green-500/30'
              : 'bg-red-500/10 border-red-500/30'
            : 'bg-gray-800/50 border-gray-700'
        }`}>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[10px] text-gray-500">SIGNAL</div>
              <div className={`text-lg font-bold ${signalColor}`}>{signal}</div>
            </div>
            <div className="text-right">
              <div className="text-[10px] text-gray-500">EV / $1,000</div>
              <div className={`text-lg font-bold mono ${ev.ev > 0 ? 'text-green-400' : ev.ev < 0 ? 'text-red-400' : 'text-gray-400'}`}>
                {ev.ev > 0 ? '+' : ''}{formatValue(ev.ev, 2, '$', '')}
              </div>
            </div>
          </div>
        </div>

        {/* Kelly Sizing */}
        <div className="grid grid-cols-3 gap-1 mb-3">
          <div className="bg-gray-900/30 rounded p-1.5 text-center border border-gray-800">
            <div className="text-[9px] text-gray-500">KELLY 1/4</div>
            <div className="text-xs font-bold text-orange-400 mono">
              {formatValue((kelly.quarter || 0) * 100, 1, '', '%')}
            </div>
          </div>
          <div className="bg-gray-900/30 rounded p-1.5 text-center border border-gray-800">
            <div className="text-[9px] text-gray-500">KELLY 1/2</div>
            <div className="text-xs font-bold text-orange-300 mono">
              {formatValue((kelly.half || 0) * 100, 1, '', '%')}
            </div>
          </div>
          <div className="bg-gray-900/30 rounded p-1.5 text-center border border-gray-800">
            <div className="text-[9px] text-gray-500">KELLY FULL</div>
            <div className="text-xs font-bold text-orange-200 mono">
              {formatValue((kelly.full || 0) * 100, 1, '', '%')}
            </div>
          </div>
        </div>

        {/* Market Metrics */}
        <div className="border-t border-gray-800 pt-2">
          <div className="text-[10px] text-gray-600 mb-1">MARKET METRICS</div>
          <div className="grid grid-cols-2 gap-x-3">
            <DataRow
              label="Volume 24h"
              value={formatValue((market.volume_24h || 0) / 1000, 1, '$', 'K')}
              small
            />
            <DataRow
              label="Liquidity"
              value={formatValue((market.liquidity || 0) / 1000, 1, '$', 'K')}
              small
            />
            <DataRow
              label="Spread"
              value={formatValue((market.spread || 0) * 100, 2, '', '%')}
              small
            />
            <DataRow
              label="Time Left"
              value={formatTimeRemaining(market.end_date)}
              small
            />
          </div>
        </div>
      </div>
    </div>
  );
};
