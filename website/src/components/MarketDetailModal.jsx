import { useState, useMemo } from 'react';

// ============================================
// MARKET DETAIL MODAL
// Polymarket/Kalshi-style with YES/NO payouts
// Shows all options with clear names and payouts
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

// Single option card with YES/NO payout calculator
const OptionCard = ({ option, investAmount, isSelected, onSelect, index }) => {
  const yesPrice = option.probability || option.price || 0.5;
  const noPrice = 1 - yesPrice;
  const yesCents = (yesPrice * 100).toFixed(0);
  const noCents = (noPrice * 100).toFixed(0);

  // YES calculations - buy YES shares
  const yesShares = yesPrice > 0 ? investAmount / yesPrice : 0;
  const yesWinPayout = yesShares * 1; // Each share pays $1 if YES wins
  const yesWinProfit = yesWinPayout - investAmount;
  const yesLoseLoss = investAmount; // Lose entire investment if NO wins
  const yesReturnMultiple = yesPrice > 0 ? (1 / yesPrice) : 0;

  // NO calculations - buy NO shares
  const noShares = noPrice > 0 ? investAmount / noPrice : 0;
  const noWinPayout = noShares * 1; // Each share pays $1 if NO wins
  const noWinProfit = noWinPayout - investAmount;
  const noLoseLoss = investAmount; // Lose entire investment if YES wins
  const noReturnMultiple = noPrice > 0 ? (1 / noPrice) : 0;

  // Clean up option name - remove common prefixes
  const displayName = option.name || `Option ${index + 1}`;

  return (
    <div
      className={`rounded-xl border transition-all cursor-pointer overflow-hidden ${
        isSelected
          ? 'border-orange-500 shadow-lg shadow-orange-500/20'
          : 'border-gray-800 hover:border-gray-600'
      }`}
      onClick={() => onSelect(option)}
    >
      {/* Option Header */}
      <div className={`p-4 ${isSelected ? 'bg-orange-500/10' : 'bg-gray-900/80'}`}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] text-gray-500 font-mono">#{index + 1}</span>
              {option.volume24h > 10000 && (
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-green-500/20 text-green-400 border border-green-500/30">
                  HOT
                </span>
              )}
            </div>
            <h3 className="text-base text-white font-bold leading-tight">{displayName}</h3>
            <div className="text-[10px] text-gray-500 mt-1">
              Vol: ${formatNumber(option.volume24h || 0)} • Liq: ${formatNumber(option.liquidity || 0)}
            </div>
          </div>

          {/* Current Price Badge */}
          <div className="text-center">
            <div className="text-2xl font-black text-orange-400">{yesCents}¢</div>
            <div className="text-[10px] text-gray-500">{(yesPrice * 100).toFixed(1)}% chance</div>
          </div>
        </div>
      </div>

      {/* YES/NO Payout Section */}
      <div className="grid grid-cols-2 divide-x divide-gray-800">
        {/* BUY YES */}
        <div className="p-3 bg-green-500/5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-green-400">BUY YES</span>
            <span className="text-sm font-bold text-white">{yesCents}¢</span>
          </div>
          <div className="space-y-1.5 text-[10px]">
            <div className="flex justify-between">
              <span className="text-gray-500">If YES wins:</span>
              <span className="text-green-400 font-bold">+{formatCurrency(yesWinProfit)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">If NO wins:</span>
              <span className="text-red-400 font-bold">-{formatCurrency(yesLoseLoss)}</span>
            </div>
            <div className="flex justify-between pt-1 border-t border-gray-800">
              <span className="text-gray-500">Payout:</span>
              <span className="text-orange-400 font-bold">{yesReturnMultiple.toFixed(2)}x</span>
            </div>
          </div>
        </div>

        {/* BUY NO */}
        <div className="p-3 bg-red-500/5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-red-400">BUY NO</span>
            <span className="text-sm font-bold text-white">{noCents}¢</span>
          </div>
          <div className="space-y-1.5 text-[10px]">
            <div className="flex justify-between">
              <span className="text-gray-500">If NO wins:</span>
              <span className="text-green-400 font-bold">+{formatCurrency(noWinProfit)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">If YES wins:</span>
              <span className="text-red-400 font-bold">-{formatCurrency(noLoseLoss)}</span>
            </div>
            <div className="flex justify-between pt-1 border-t border-gray-800">
              <span className="text-gray-500">Payout:</span>
              <span className="text-orange-400 font-bold">{noReturnMultiple.toFixed(2)}x</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bid/Ask Spread */}
      {(option.bestBid || option.bestAsk) && (
        <div className="px-3 py-2 bg-gray-900/50 border-t border-gray-800 flex items-center justify-between text-[10px]">
          <div className="flex items-center gap-3">
            <span className="text-gray-500">Bid: <span className="text-green-400 font-mono">{((option.bestBid || 0) * 100).toFixed(1)}¢</span></span>
            <span className="text-gray-500">Ask: <span className="text-red-400 font-mono">{((option.bestAsk || 0) * 100).toFixed(1)}¢</span></span>
          </div>
          <span className="text-gray-500">Spread: <span className="text-yellow-400 font-mono">{(((option.bestAsk || yesPrice) - (option.bestBid || yesPrice)) * 100).toFixed(1)}¢</span></span>
        </div>
      )}
    </div>
  );
};

// Compact row view for long lists
const OptionRow = ({ option, investAmount, isSelected, onSelect, index }) => {
  const yesPrice = option.probability || option.price || 0.5;
  const noPrice = 1 - yesPrice;
  const yesCents = (yesPrice * 100).toFixed(0);
  const noCents = (noPrice * 100).toFixed(0);

  // YES payout
  const yesShares = yesPrice > 0 ? investAmount / yesPrice : 0;
  const yesWinProfit = (yesShares * 1) - investAmount;

  // NO payout
  const noShares = noPrice > 0 ? investAmount / noPrice : 0;
  const noWinProfit = (noShares * 1) - investAmount;

  const displayName = option.name || `Option ${index + 1}`;

  return (
    <div
      className={`p-3 rounded-lg border transition-all cursor-pointer ${
        isSelected
          ? 'bg-orange-500/10 border-orange-500/50'
          : 'bg-gray-900/50 border-gray-800 hover:border-gray-700'
      }`}
      onClick={() => onSelect(option)}
    >
      <div className="flex items-center gap-4">
        {/* Index */}
        <span className="text-[10px] text-gray-600 font-mono w-6">#{index + 1}</span>

        {/* Name */}
        <div className="flex-1 min-w-0">
          <div className="text-sm text-white font-medium truncate">{displayName}</div>
          <div className="text-[9px] text-gray-500">
            Vol: ${formatNumber(option.volume24h || 0)}
          </div>
        </div>

        {/* YES Price & Payout */}
        <div className="text-center w-24">
          <div className="text-[10px] text-green-400 font-medium">YES {yesCents}¢</div>
          <div className="text-[10px] text-gray-500">
            Win: <span className="text-green-400">+{formatCurrency(yesWinProfit)}</span>
          </div>
        </div>

        {/* NO Price & Payout */}
        <div className="text-center w-24">
          <div className="text-[10px] text-red-400 font-medium">NO {noCents}¢</div>
          <div className="text-[10px] text-gray-500">
            Win: <span className="text-green-400">+{formatCurrency(noWinProfit)}</span>
          </div>
        </div>

        {/* Main Price */}
        <div className="text-right w-16">
          <div className="text-lg font-bold text-orange-400">{yesCents}¢</div>
        </div>
      </div>
    </div>
  );
};

// Main Modal Component
export const MarketDetailModal = ({ market, isOpen, onClose, onTrade }) => {
  const [investAmount, setInvestAmount] = useState(100);
  const [selectedOption, setSelectedOption] = useState(null);
  const [sortBy, setSortBy] = useState('probability');
  const [viewMode, setViewMode] = useState('cards'); // cards or list

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

  // Determine market type for better labeling
  const marketType = useMemo(() => {
    if (!market?.question) return 'OPTIONS';
    const q = market.question.toLowerCase();
    if (q.includes('who will win') || q.includes('winner')) return 'TEAMS';
    if (q.includes('when') || q.includes('date') || q.includes('by')) return 'DATES';
    if (q.includes('how many') || q.includes('total')) return 'OUTCOMES';
    return 'OPTIONS';
  }, [market]);

  if (!isOpen || !market) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm">
      <div className="bg-gray-900 rounded-xl border border-gray-800 shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-800 bg-gradient-to-r from-gray-900 via-gray-900 to-orange-900/30">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[10px] px-2 py-0.5 rounded bg-orange-500/20 text-orange-400 border border-orange-500/30 font-bold">
                  {market.platform || 'POLYMARKET'}
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-purple-500/20 text-purple-400 border border-purple-500/30">
                  {outcomes.length} {marketType}
                </span>
                {market.category && (
                  <span className="text-[10px] px-2 py-0.5 rounded bg-gray-800 text-gray-400 border border-gray-700">
                    {market.category}
                  </span>
                )}
              </div>
              <h2 className="text-xl text-white font-bold leading-tight">{market.question}</h2>
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
              <span className={`font-bold ml-1 ${Math.abs(totalProbability - 1) > 0.05 ? 'text-yellow-400' : 'text-green-400'}`}>
                {(totalProbability * 100).toFixed(1)}%
              </span>
            </div>
            <div className="ml-auto flex items-center gap-2 text-gray-500">
              <span>Press ESC to close</span>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="p-3 border-b border-gray-800 bg-gray-900/50 flex items-center justify-between flex-wrap gap-2">
          {/* Investment Amount */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-gray-500">Investment:</span>
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

          <div className="flex items-center gap-3">
            {/* View Mode */}
            <div className="flex items-center bg-gray-800 rounded-lg p-0.5">
              <button
                onClick={() => setViewMode('cards')}
                className={`px-2 py-1 text-[10px] rounded transition-colors ${
                  viewMode === 'cards' ? 'bg-orange-500 text-black font-bold' : 'text-gray-400 hover:text-white'
                }`}
              >
                Cards
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`px-2 py-1 text-[10px] rounded transition-colors ${
                  viewMode === 'list' ? 'bg-orange-500 text-black font-bold' : 'text-gray-400 hover:text-white'
                }`}
              >
                List
              </button>
            </div>

            {/* Sort */}
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-gray-500">Sort:</span>
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
        </div>

        {/* Explanation Banner */}
        <div className="px-4 py-2 bg-blue-500/10 border-b border-blue-500/20">
          <div className="flex items-center gap-3 text-[11px]">
            <span className="text-blue-400 font-bold">How it works:</span>
            <span className="text-gray-400">
              Buy <span className="text-green-400 font-medium">YES</span> if you think this option will win.
              Buy <span className="text-red-400 font-medium">NO</span> if you think it won't.
              If correct, you receive <span className="text-white font-medium">$1.00 per share</span>.
            </span>
          </div>
        </div>

        {/* Options List */}
        <div className="flex-1 overflow-y-auto p-4">
          {outcomes.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-12">
              <div className="text-gray-500 text-sm">No options available for this market</div>
            </div>
          ) : viewMode === 'cards' ? (
            <div className="grid grid-cols-2 gap-4">
              {outcomes.map((option, idx) => (
                <OptionCard
                  key={option.marketId || option.name || idx}
                  option={option}
                  investAmount={investAmount}
                  isSelected={selectedOption?.name === option.name}
                  onSelect={setSelectedOption}
                  index={idx}
                />
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {/* List Header */}
              <div className="flex items-center gap-4 px-3 py-2 text-[10px] text-gray-500 border-b border-gray-800">
                <span className="w-6">#</span>
                <span className="flex-1">{marketType.slice(0, -1)}</span>
                <span className="w-24 text-center">BUY YES</span>
                <span className="w-24 text-center">BUY NO</span>
                <span className="w-16 text-right">PRICE</span>
              </div>
              {outcomes.map((option, idx) => (
                <OptionRow
                  key={option.marketId || option.name || idx}
                  option={option}
                  investAmount={investAmount}
                  isSelected={selectedOption?.name === option.name}
                  onSelect={setSelectedOption}
                  index={idx}
                />
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-800 bg-gray-900/80">
          <div className="flex items-center justify-between">
            <div className="text-[10px] text-gray-500">
              {selectedOption ? (
                <span>
                  Selected: <span className="text-orange-400 font-bold">{selectedOption.name}</span>
                </span>
              ) : (
                <span>Click a {marketType.toLowerCase().slice(0, -1)} to see detailed payouts</span>
              )}
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
