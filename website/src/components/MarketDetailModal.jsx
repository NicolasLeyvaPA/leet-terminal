import { useState, useMemo } from 'react';

// ============================================
// MARKET DETAIL MODAL
// Polymarket-style full options view with payout calculator
// ============================================

// Format currency
const formatCurrency = (value) => {
  if (!value || isNaN(value)) return '$0.00';
  return `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

// Format large numbers
const formatNumber = (num) => {
  if (!num || isNaN(num)) return '0';
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(0)}K`;
  return num.toFixed(0);
};

// Single option row with payout calculator
const OptionRow = ({ option, investAmount, isSelected, onSelect }) => {
  const price = option.probability || option.price || 0;
  const pricePercent = (price * 100).toFixed(1);
  const priceCents = (price * 100).toFixed(0);

  // Payout calculations (Polymarket style)
  // Buy at price X, if correct get $1 per share
  const shares = investAmount / price; // How many shares you can buy
  const potentialPayout = shares * 1; // Each share pays $1 if correct
  const potentialProfit = potentialPayout - investAmount;
  const returnMultiple = potentialPayout / investAmount;
  const impliedOdds = price > 0 ? (1 / price) : 0;

  return (
    <div
      className={`p-3 rounded-lg border transition-all cursor-pointer ${
        isSelected
          ? 'bg-orange-500/10 border-orange-500/50'
          : 'bg-gray-900/50 border-gray-800 hover:border-gray-700'
      }`}
      onClick={() => onSelect(option)}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1 min-w-0">
          <div className="text-sm text-white font-medium truncate">{option.name}</div>
          <div className="text-[10px] text-gray-500 mt-0.5">
            Vol: ${formatNumber(option.volume24h || 0)} • Liq: ${formatNumber(option.liquidity || 0)}
          </div>
        </div>
        <div className="text-right ml-3">
          <div className="text-lg font-bold text-orange-400">{priceCents}¢</div>
          <div className="text-[10px] text-gray-500">{pricePercent}% chance</div>
        </div>
      </div>

      {/* Payout Preview */}
      <div className="bg-gray-800/50 rounded p-2 mt-2">
        <div className="grid grid-cols-3 gap-2 text-[10px]">
          <div>
            <div className="text-gray-500">If you invest</div>
            <div className="text-white font-bold">{formatCurrency(investAmount)}</div>
          </div>
          <div>
            <div className="text-gray-500">Potential return</div>
            <div className="text-green-400 font-bold">{formatCurrency(potentialPayout)}</div>
          </div>
          <div>
            <div className="text-gray-500">Profit if correct</div>
            <div className="text-green-400 font-bold">+{formatCurrency(potentialProfit)}</div>
          </div>
        </div>
        <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-700 text-[10px]">
          <span className="text-gray-500">Return multiple: <span className="text-orange-400 font-bold">{returnMultiple.toFixed(2)}x</span></span>
          <span className="text-gray-500">Implied odds: <span className="text-orange-400 font-bold">{impliedOdds.toFixed(1)}:1</span></span>
        </div>
      </div>

      {/* Bid/Ask Spread */}
      {(option.bestBid || option.bestAsk) && (
        <div className="flex items-center gap-4 mt-2 text-[10px] text-gray-500">
          <span>Bid: <span className="text-green-400">{((option.bestBid || 0) * 100).toFixed(1)}¢</span></span>
          <span>Ask: <span className="text-red-400">{((option.bestAsk || 0) * 100).toFixed(1)}¢</span></span>
          <span>Spread: <span className="text-yellow-400">{(((option.bestAsk || 0) - (option.bestBid || 0)) * 100).toFixed(1)}¢</span></span>
        </div>
      )}
    </div>
  );
};

// Main Modal Component
export const MarketDetailModal = ({ market, isOpen, onClose, onTrade }) => {
  const [investAmount, setInvestAmount] = useState(100);
  const [selectedOption, setSelectedOption] = useState(null);
  const [sortBy, setSortBy] = useState('probability'); // probability, volume, name

  // Get all outcomes
  const outcomes = useMemo(() => {
    if (!market) return [];

    let options = market.allOutcomes || [];

    // If no allOutcomes, create from basic market data
    if (options.length === 0 && market.outcomes) {
      const prices = market.outcomePrices ? JSON.parse(market.outcomePrices) : [];
      options = market.outcomes.map((name, idx) => ({
        name,
        probability: parseFloat(prices[idx]) || 0.5,
        price: parseFloat(prices[idx]) || 0.5,
      }));
    }

    // Sort
    switch (sortBy) {
      case 'probability':
        return [...options].sort((a, b) => (b.probability || 0) - (a.probability || 0));
      case 'volume':
        return [...options].sort((a, b) => (b.volume24h || 0) - (a.volume24h || 0));
      case 'name':
        return [...options].sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      default:
        return options;
    }
  }, [market, sortBy]);

  // Calculate total probability
  const totalProbability = useMemo(() => {
    return outcomes.reduce((sum, o) => sum + (o.probability || 0), 0);
  }, [outcomes]);

  if (!isOpen || !market) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-gray-900 rounded-xl border border-gray-800 shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-800 bg-gradient-to-r from-gray-900 to-orange-900/20">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] px-2 py-0.5 rounded bg-orange-500/20 text-orange-400 border border-orange-500/30 font-bold">
                  {market.platform || 'POLYMARKET'}
                </span>
                {market.isMultiOption && (
                  <span className="text-[10px] px-2 py-0.5 rounded bg-purple-500/20 text-purple-400 border border-purple-500/30">
                    {outcomes.length} OPTIONS
                  </span>
                )}
              </div>
              <h2 className="text-lg text-white font-bold leading-tight">{market.question}</h2>
              <div className="text-[11px] text-gray-500 mt-1">{market.category}</div>
            </div>
            <button
              onClick={onClose}
              className="ml-4 p-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Market Stats */}
          <div className="flex items-center gap-6 mt-3 text-[11px]">
            <div>
              <span className="text-gray-500">24h Volume:</span>
              <span className="text-white font-bold ml-1">${formatNumber(market.volume_24h || 0)}</span>
            </div>
            <div>
              <span className="text-gray-500">Liquidity:</span>
              <span className="text-white font-bold ml-1">${formatNumber(market.liquidity || 0)}</span>
            </div>
            <div>
              <span className="text-gray-500">Total Prob:</span>
              <span className={`font-bold ml-1 ${Math.abs(totalProbability - 1) > 0.02 ? 'text-yellow-400' : 'text-green-400'}`}>
                {(totalProbability * 100).toFixed(1)}%
              </span>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="p-3 border-b border-gray-800 bg-gray-900/50 flex items-center justify-between">
          {/* Investment Amount */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-gray-500">Simulate investment:</span>
            <div className="flex items-center gap-1">
              {[10, 50, 100, 500, 1000].map(amt => (
                <button
                  key={amt}
                  onClick={() => setInvestAmount(amt)}
                  className={`px-2 py-1 text-[10px] rounded transition-colors ${
                    investAmount === amt
                      ? 'bg-orange-500 text-black font-bold'
                      : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                  }`}
                >
                  ${amt}
                </button>
              ))}
              <input
                type="number"
                value={investAmount}
                onChange={(e) => setInvestAmount(Math.max(1, parseInt(e.target.value) || 0))}
                className="w-20 px-2 py-1 text-[10px] bg-gray-800 border border-gray-700 rounded text-white outline-none focus:border-orange-500"
              />
            </div>
          </div>

          {/* Sort */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-gray-500">Sort by:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="text-[10px] bg-gray-800 text-gray-300 border border-gray-700 rounded px-2 py-1 outline-none"
            >
              <option value="probability">Probability</option>
              <option value="volume">Volume</option>
              <option value="name">Name</option>
            </select>
          </div>
        </div>

        {/* Options List */}
        <div className="flex-1 overflow-y-auto p-4">
          {outcomes.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-12">
              <div className="text-gray-500 text-sm">No options available for this market</div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {outcomes.map((option, idx) => (
                <OptionRow
                  key={option.marketId || idx}
                  option={option}
                  investAmount={investAmount}
                  isSelected={selectedOption?.name === option.name}
                  onSelect={setSelectedOption}
                />
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-800 bg-gray-900/50">
          <div className="flex items-center justify-between">
            <div className="text-[10px] text-gray-500">
              Click an option to select it for analysis
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={onClose}
                className="px-4 py-2 text-[11px] rounded bg-gray-800 text-gray-400 hover:bg-gray-700 transition-colors"
              >
                Close
              </button>
              {selectedOption && onTrade && (
                <button
                  onClick={() => onTrade(selectedOption)}
                  className="px-4 py-2 text-[11px] rounded bg-orange-500 text-black font-bold hover:bg-orange-400 transition-colors"
                >
                  Trade {selectedOption.name}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MarketDetailModal;
