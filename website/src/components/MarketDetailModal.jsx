import { useState, useMemo } from 'react';
import {
  getTickerFromName,
  getPartyInfo,
  getTickerColor,
  detectMarketType,
  formatVolume,
  getInitials,
} from '../utils/tickerMapping';

// ============================================
// MARKET DETAIL MODAL
// Polymarket/Kalshi-style multi-option view
// With profile images, party affiliations, inline Yes/No buttons
// ============================================

// Format currency
const formatCurrency = (value) => {
  if (!value || isNaN(value)) return '$0.00';
  return `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

// ============================================
// OPTION ROW - Kalshi/Polymarket style
// Profile | Name + Party | Percentage | Yes/No buttons
// ============================================
const OptionRow = ({ option, index, isSelected, onSelect, onBuyYes, onBuyNo }) => {
  const yesPrice = option.probability || option.price || 0.5;
  const noPrice = 1 - yesPrice;
  const yesCents = Math.round(yesPrice * 100);
  const noCents = Math.round(noPrice * 100);

  const ticker = getTickerFromName(option.name);
  const partyInfo = getPartyInfo(option.name, option.subtitle || '');
  const tickerColor = getTickerColor(ticker);
  const initials = getInitials(option.name);
  const displayName = option.name || `Option ${index + 1}`;

  // Price change (mock for now - could come from historical data)
  const priceChange = option.priceChange24h || (Math.random() > 0.5 ? Math.random() * 5 : -Math.random() * 5);
  const hasChange = Math.abs(priceChange) > 0.1;

  return (
    <div
      className={`flex items-center px-4 py-3 border-b border-gray-800/50 transition-all hover:bg-gray-800/30 cursor-pointer ${
        isSelected ? 'bg-gray-800/50' : ''
      }`}
      onClick={() => onSelect(option)}
    >
      {/* Profile Image / Initials */}
      <div
        className="w-12 h-12 rounded-lg flex items-center justify-center text-sm font-bold mr-4 flex-shrink-0"
        style={{
          backgroundColor: partyInfo?.bgColor || `${tickerColor}20`,
          color: partyInfo?.color || tickerColor,
          border: `1px solid ${partyInfo?.color || tickerColor}40`,
        }}
      >
        {option.image ? (
          <img src={option.image} alt={displayName} className="w-full h-full rounded-lg object-cover" />
        ) : (
          initials
        )}
      </div>

      {/* Name + Party */}
      <div className="flex-1 min-w-0 mr-4">
        <div className="text-white font-semibold text-sm truncate">{displayName}</div>
        {partyInfo ? (
          <div className="text-xs" style={{ color: partyInfo.color }}>
            {partyInfo.name}
          </div>
        ) : (
          <div className="text-xs text-gray-500">
            {formatVolume(option.volume24h || 0)} Vol
          </div>
        )}
      </div>

      {/* Percentage + Change */}
      <div className="flex items-center gap-2 mr-6 min-w-[100px] justify-end">
        <span className="text-2xl font-bold text-white">{yesCents}%</span>
        {hasChange && (
          <span className={`text-sm ${priceChange > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
            {priceChange > 0 ? '▼' : '▲'}{Math.abs(priceChange).toFixed(0)}
          </span>
        )}
      </div>

      {/* Yes Button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onBuyYes(option);
        }}
        className="px-5 py-2.5 rounded-lg font-semibold text-sm mr-2 transition-all bg-emerald-500 hover:bg-emerald-400 text-white min-w-[100px]"
      >
        Yes {yesCents}¢
      </button>

      {/* No Button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onBuyNo(option);
        }}
        className="px-5 py-2.5 rounded-lg font-semibold text-sm transition-all bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 border border-rose-500/30 min-w-[100px]"
      >
        No {noCents}¢
      </button>
    </div>
  );
};

// ============================================
// RIGHT SIDEBAR - Trade Panel
// Shows when an option is selected
// ============================================
const TradeSidebar = ({ option, market, investAmount, setInvestAmount, onTrade, onClose }) => {
  const [tradeType, setTradeType] = useState('buy');
  const [selectedSide, setSelectedSide] = useState('yes');

  if (!option) return null;

  const ticker = getTickerFromName(option.name);
  const partyInfo = getPartyInfo(option.name);
  const initials = getInitials(option.name);
  const tickerColor = getTickerColor(ticker);

  const yesPrice = option.probability || option.price || 0.5;
  const noPrice = 1 - yesPrice;
  const yesCents = (yesPrice * 100).toFixed(1);
  const noCents = (noPrice * 100).toFixed(1);

  // Calculate based on selected side
  const price = selectedSide === 'yes' ? yesPrice : noPrice;
  const shares = price > 0 ? investAmount / price : 0;
  const potentialProfit = shares - investAmount;

  return (
    <div className="w-80 border-l border-gray-800 bg-gray-900/95 flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-gray-800">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center text-xs font-bold"
            style={{
              backgroundColor: partyInfo?.bgColor || `${tickerColor}20`,
              color: partyInfo?.color || tickerColor,
            }}
          >
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-white font-semibold text-sm truncate">{option.name}</div>
            <div className="text-xs text-gray-500">{market?.question}</div>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white p-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Buy/Sell Toggle */}
      <div className="flex border-b border-gray-800">
        <button
          onClick={() => setTradeType('buy')}
          className={`flex-1 py-3 text-sm font-medium transition-colors ${
            tradeType === 'buy'
              ? 'text-emerald-400 border-b-2 border-emerald-400 bg-emerald-400/5'
              : 'text-gray-500 hover:text-gray-300'
          }`}
        >
          Buy
        </button>
        <button
          onClick={() => setTradeType('sell')}
          className={`flex-1 py-3 text-sm font-medium transition-colors ${
            tradeType === 'sell'
              ? 'text-rose-400 border-b-2 border-rose-400 bg-rose-400/5'
              : 'text-gray-500 hover:text-gray-300'
          }`}
        >
          Sell
        </button>
        <div className="flex items-center px-3 border-l border-gray-800">
          <span className="text-xs text-gray-500">Dollars</span>
        </div>
      </div>

      {/* Yes/No Price Buttons */}
      <div className="p-4 grid grid-cols-2 gap-3">
        <button
          onClick={() => setSelectedSide('yes')}
          className={`p-4 rounded-xl text-center transition-all ${
            selectedSide === 'yes'
              ? 'bg-emerald-500 text-white'
              : 'bg-gray-800 text-gray-400 hover:bg-gray-700 border border-gray-700'
          }`}
        >
          <div className="text-sm font-medium mb-1">Yes</div>
          <div className="text-xl font-bold">{yesCents}¢</div>
        </button>
        <button
          onClick={() => setSelectedSide('no')}
          className={`p-4 rounded-xl text-center transition-all ${
            selectedSide === 'no'
              ? 'bg-rose-500/80 text-white'
              : 'bg-gray-800 text-gray-400 hover:bg-gray-700 border border-gray-700'
          }`}
        >
          <div className="text-sm font-medium mb-1">No</div>
          <div className="text-xl font-bold">{noCents}¢</div>
        </button>
      </div>

      {/* Amount Input */}
      <div className="px-4">
        <div className="flex items-center justify-between text-xs mb-2">
          <span className="text-gray-500">Amount</span>
          <span className="text-emerald-400">Earn 3.25% Interest</span>
        </div>
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-lg">$</span>
          <input
            type="number"
            value={investAmount}
            onChange={(e) => setInvestAmount(Math.max(0, parseFloat(e.target.value) || 0))}
            className="w-full bg-gray-800 border border-gray-700 rounded-xl pl-8 pr-4 py-4 text-right text-3xl font-light text-white outline-none focus:border-emerald-500"
            placeholder="0"
          />
        </div>

        {/* Quick Amount Buttons */}
        <div className="flex gap-2 mt-3">
          {[1, 20, 100, 'Max'].map((amt) => (
            <button
              key={amt}
              onClick={() => setInvestAmount(amt === 'Max' ? 1000 : amt)}
              className="flex-1 py-2 text-xs font-medium bg-gray-800 hover:bg-gray-700 text-gray-400 rounded-lg transition-colors border border-gray-700"
            >
              +${amt === 'Max' ? amt : amt}
            </button>
          ))}
        </div>
      </div>

      {/* Potential Return */}
      {investAmount > 0 && (
        <div className="mx-4 mt-4 p-3 bg-gray-800/50 rounded-xl border border-gray-700/50">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Potential return</span>
            <span className="text-emerald-400 font-bold">
              +${potentialProfit.toFixed(2)} ({((potentialProfit / investAmount) * 100).toFixed(0)}%)
            </span>
          </div>
          <div className="flex justify-between text-xs mt-1">
            <span className="text-gray-600">Shares</span>
            <span className="text-gray-400">{shares.toFixed(2)}</span>
          </div>
        </div>
      )}

      {/* Action Button */}
      <div className="p-4 mt-auto">
        <button
          onClick={() => onTrade && onTrade({ ...option, side: selectedSide, amount: investAmount })}
          className={`w-full py-4 rounded-xl font-bold text-base transition-all ${
            selectedSide === 'yes'
              ? 'bg-emerald-500 hover:bg-emerald-400 text-white'
              : 'bg-rose-500 hover:bg-rose-400 text-white'
          }`}
        >
          {tradeType === 'buy' ? 'Buy' : 'Sell'} {selectedSide.charAt(0).toUpperCase() + selectedSide.slice(1)}
        </button>
        <p className="text-center text-[10px] text-gray-600 mt-2">
          By trading, you agree to the <span className="underline cursor-pointer">Terms of Use</span>
        </p>
      </div>

      {/* Related Markets */}
      <div className="p-4 border-t border-gray-800">
        <div className="text-xs text-gray-500 mb-3">Related markets</div>
        <div className="space-y-2">
          {[
            { name: 'Will Trump run in 2028?', chance: '42%' },
            { name: 'GOP primary winner?', chance: '—' },
          ].map((related, idx) => (
            <div key={idx} className="flex items-center justify-between p-2 bg-gray-800/50 rounded-lg hover:bg-gray-800 cursor-pointer">
              <span className="text-xs text-gray-400 truncate flex-1">{related.name}</span>
              <span className="text-xs text-white font-medium ml-2">{related.chance}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ============================================
// MAIN MODAL
// ============================================
export const MarketDetailModal = ({ market, isOpen, onClose, onTrade }) => {
  const [investAmount, setInvestAmount] = useState(100);
  const [selectedOption, setSelectedOption] = useState(null);
  const [sortBy, setSortBy] = useState('probability');

  // Get all outcomes
  const outcomes = useMemo(() => {
    if (!market) return [];

    let options = market.allOutcomes || [];

    // If no allOutcomes, create from basic market data
    if (options.length === 0 && market.outcomes) {
      const prices = market.outcomePrices
        ? (typeof market.outcomePrices === 'string' ? JSON.parse(market.outcomePrices) : market.outcomePrices)
        : [];
      options = market.outcomes.map((name, idx) => ({
        name: typeof name === 'string' ? name : name.name || `Option ${idx + 1}`,
        probability: parseFloat(prices[idx]) || 0.5,
        price: parseFloat(prices[idx]) || 0.5,
        volume24h: market.volume_24h ? market.volume_24h / market.outcomes.length : 0,
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

  const marketType = detectMarketType(market);

  const handleBuyYes = (option) => {
    setSelectedOption(option);
  };

  const handleBuyNo = (option) => {
    setSelectedOption(option);
  };

  if (!isOpen || !market) return null;

  return (
    <div className="fixed inset-0 z-50 flex bg-black/95 backdrop-blur-sm">
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-gray-800">
          <div className="flex items-start gap-4">
            {/* Market Icon */}
            <div className="w-16 h-16 rounded-xl bg-gray-800 flex items-center justify-center flex-shrink-0 border border-gray-700">
              {marketType === 'politics' ? (
                <span className="text-2xl">🏛️</span>
              ) : marketType === 'sports' ? (
                <span className="text-2xl">🏆</span>
              ) : (
                <span className="text-2xl">📊</span>
              )}
            </div>

            <div className="flex-1 min-w-0">
              {/* Breadcrumb */}
              <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
                <span>{market.category || 'Markets'}</span>
                <span>·</span>
                <span>{market.platform || 'Polymarket'}</span>
              </div>
              {/* Title */}
              <h1 className="text-2xl font-bold text-white leading-tight">{market.question}</h1>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <button className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-400">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
              </button>
              <button className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-400">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
              </button>
              <button
                onClick={onClose}
                className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Volume */}
          <div className="mt-4 text-sm text-gray-500">
            {formatVolume(market.volume_total || market.volume_24h || 0)} vol
          </div>
        </div>

        {/* Column Header */}
        <div className="px-4 py-3 border-b border-gray-800 flex items-center justify-between bg-gray-900/50">
          <div className="flex items-center gap-8">
            <span className="text-sm text-gray-500 w-48">Chance</span>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="text-xs bg-gray-800 text-gray-400 border border-gray-700 rounded-lg px-3 py-1.5 outline-none"
            >
              <option value="probability">Sort by Chance</option>
              <option value="volume">Sort by Volume</option>
              <option value="name">Sort by Name</option>
            </select>
          </div>
        </div>

        {/* Options List */}
        <div className="flex-1 overflow-y-auto">
          {outcomes.length === 0 ? (
            <div className="flex items-center justify-center h-64 text-gray-500">
              No options available
            </div>
          ) : (
            outcomes.map((option, idx) => (
              <OptionRow
                key={option.marketId || option.name || idx}
                option={option}
                index={idx}
                isSelected={selectedOption?.name === option.name}
                onSelect={setSelectedOption}
                onBuyYes={handleBuyYes}
                onBuyNo={handleBuyNo}
              />
            ))
          )}
        </div>

        {/* More Markets Link */}
        <div className="p-4 border-t border-gray-800">
          <button className="text-sm text-emerald-400 hover:text-emerald-300 font-medium">
            More markets →
          </button>
        </div>
      </div>

      {/* Right Sidebar - Trade Panel */}
      {selectedOption && (
        <TradeSidebar
          option={selectedOption}
          market={market}
          investAmount={investAmount}
          setInvestAmount={setInvestAmount}
          onTrade={onTrade}
          onClose={() => setSelectedOption(null)}
        />
      )}
    </div>
  );
};

export default MarketDetailModal;
