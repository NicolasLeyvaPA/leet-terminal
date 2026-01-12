import { useState } from 'react';
import { PanelHeader } from '../PanelHeader';
import { DataRow } from '../DataRow';
import { Tag } from '../Tag';
import { QuantEngine } from '../../utils/quantEngine';
import { MarketDetailModal } from '../MarketDetailModal';

// ============================================
// BEGINNER-FRIENDLY TOOLTIP COMPONENT
// ============================================
const HelpTip = ({ children, tip }) => {
  const [show, setShow] = useState(false);
  return (
    <span
      className="relative cursor-help"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      {children}
      <span className="ml-0.5 text-gray-500 text-[8px]">ⓘ</span>
      {show && (
        <div className="absolute z-50 bottom-full left-0 mb-1 w-44 p-2 bg-gray-800 border border-gray-700 rounded shadow-lg text-[10px] text-gray-300 leading-relaxed">
          {tip}
        </div>
      )}
    </span>
  );
};

// Beginner-friendly explanations
const TIPS = {
  marketPrice: "What other traders think the chance is. This is the current trading price.",
  modelEstimate: "What our AI model thinks the real chance is. Compare to market price to find opportunities.",
  edge: "The difference between our estimate and the market. Positive = underpriced, negative = overpriced.",
  kelly: "Suggested bet size based on your edge. Smaller = safer. Never bet more than you can afford to lose!",
  ev: "Expected Value - the average profit you'd make on a $1,000 bet. Positive = good bet, negative = bad bet.",
  cents: "In prediction markets, 50¢ means 50% chance. Think of it as cents on the dollar for a $1 payout.",
};

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
  const [showDetailModal, setShowDetailModal] = useState(false);

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

        {/* Main Probability Display - Beginner-friendly */}
        <div className="grid grid-cols-2 gap-2 mb-3">
          <div className="bg-gray-900/50 rounded p-2 border border-gray-800">
            <HelpTip tip={TIPS.marketPrice}>
              <div className="text-[10px] text-gray-500 mb-0.5">MARKET SAYS</div>
            </HelpTip>
            <div className="text-xl font-bold text-white mono">
              {(marketProb * 100).toFixed(1)}%
            </div>
            <div className="text-[10px] text-gray-600">
              Buy: {((market.bestAsk || marketProb) * 100).toFixed(1)}% / Sell: {((market.bestBid || marketProb) * 100).toFixed(1)}%
            </div>
          </div>
          <div className="bg-gray-900/50 rounded p-2 border border-gray-800">
            <HelpTip tip={TIPS.modelEstimate}>
              <div className="text-[10px] text-gray-500 mb-0.5">OUR MODEL SAYS</div>
            </HelpTip>
            <div className={`text-xl font-bold mono ${signalColor}`}>
              {(modelProb * 100).toFixed(1)}%
            </div>
            <HelpTip tip={TIPS.edge}>
              <div className={`text-[10px] ${signalColor}`}>
                {edge > 0 ? 'Underpriced by ' : edge < 0 ? 'Overpriced by ' : 'Fair price '}{Math.abs(edgePct).toFixed(1)}%
              </div>
            </HelpTip>
          </div>
        </div>

        {/* Edge Analysis - Beginner friendly */}
        <div className={`rounded p-2 mb-3 border ${
          Math.abs(edge) > 0.03
            ? edge > 0
              ? 'bg-green-500/10 border-green-500/30'
              : 'bg-red-500/10 border-red-500/30'
            : 'bg-gray-800/50 border-gray-700'
        }`}>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[10px] text-gray-500">RECOMMENDATION</div>
              <div className={`text-lg font-bold ${signalColor}`}>
                {signal === 'BUY' ? '📈 BUY' : signal === 'SELL' ? '📉 SELL' : '⏸️ WAIT'}
              </div>
            </div>
            <div className="text-right">
              <HelpTip tip={TIPS.ev}>
                <div className="text-[10px] text-gray-500">PROFIT ON $1,000</div>
              </HelpTip>
              <div className={`text-lg font-bold mono ${ev.ev > 0 ? 'text-green-400' : ev.ev < 0 ? 'text-red-400' : 'text-gray-400'}`}>
                {ev.ev > 0 ? '+' : ''}{formatValue(ev.ev, 2, '$', '')}
              </div>
            </div>
          </div>
        </div>

        {/* Kelly Sizing - Beginner friendly with clear explanations */}
        <div className="mb-3">
          <div className="flex items-center gap-1 mb-1">
            <HelpTip tip={TIPS.kelly}>
              <div className="text-[10px] text-gray-500">SUGGESTED BET SIZE (% of bankroll)</div>
            </HelpTip>
          </div>
          <div className="grid grid-cols-3 gap-1">
            <div className="bg-gray-900/30 rounded p-1.5 text-center border border-gray-800">
              <div className="text-[9px] text-green-400">SAFE</div>
              <div className="text-xs font-bold text-orange-400 mono">
                {formatValue((kelly.quarter || 0) * 100, 1, '', '%')}
              </div>
            </div>
            <div className="bg-gray-900/30 rounded p-1.5 text-center border border-gray-800">
              <div className="text-[9px] text-yellow-400">MODERATE</div>
              <div className="text-xs font-bold text-orange-300 mono">
                {formatValue((kelly.half || 0) * 100, 1, '', '%')}
              </div>
            </div>
            <div className="bg-gray-900/30 rounded p-1.5 text-center border border-gray-800">
              <div className="text-[9px] text-red-400">AGGRESSIVE</div>
              <div className="text-xs font-bold text-orange-200 mono">
                {formatValue((kelly.full || 0) * 100, 1, '', '%')}
              </div>
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

        {/* Multi-Option Markets Display */}
        {market.isMultiOption && market.allOutcomes && market.allOutcomes.length > 0 && (
          <div className="border-t border-gray-800 pt-2 mt-2">
            <div className="flex items-center justify-between mb-1">
              <div className="text-[10px] text-purple-400 font-bold">
                ALL OPTIONS ({market.marketCount || market.allOutcomes.length})
              </div>
              <button
                onClick={() => setShowDetailModal(true)}
                className="text-[9px] text-orange-400 px-2 py-0.5 rounded bg-orange-500/10 border border-orange-500/30 hover:bg-orange-500/20 transition-colors font-medium"
              >
                View All & Calculate Payouts →
              </button>
            </div>
            <div className="space-y-1 max-h-28 overflow-y-auto scrollbar-thin">
              {market.allOutcomes.slice(0, 6).map((outcome, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between text-[10px] bg-gray-900/40 rounded px-2 py-1 border border-gray-800/50 hover:border-purple-500/30 transition-colors cursor-pointer"
                  onClick={() => setShowDetailModal(true)}
                >
                  <span className="text-gray-300 truncate flex-1 mr-2">
                    {idx + 1}. {outcome.name}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-white font-mono font-bold">
                      {(outcome.probability * 100).toFixed(1)}%
                    </span>
                    <div className="w-12 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full"
                        style={{ width: `${Math.min(outcome.probability * 100, 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
              {market.allOutcomes.length > 6 && (
                <button
                  onClick={() => setShowDetailModal(true)}
                  className="text-[9px] text-orange-400 text-center py-1 w-full hover:text-orange-300 transition-colors"
                >
                  +{market.allOutcomes.length - 6} more options • Click to view all with payout calculator
                </button>
              )}
            </div>
          </div>
        )}

        {/* Market Detail Modal */}
        <MarketDetailModal
          market={market}
          isOpen={showDetailModal}
          onClose={() => setShowDetailModal(false)}
        />
      </div>
    </div>
  );
};
