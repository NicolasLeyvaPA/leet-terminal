import { useState, useMemo } from 'react';
import { PanelHeader } from '../PanelHeader';

// ============================================
// PROFIT TESTER PANEL
// Interactive profit/loss calculator
// Replaces GreeksPanel with user-friendly interface
// ============================================

// Tooltip component for explanations
const Tip = ({ children, tip }) => {
  const [show, setShow] = useState(false);

  return (
    <span
      className="relative cursor-help inline-flex items-center gap-0.5"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      {children}
      <span className="text-gray-600 text-[8px]">ⓘ</span>
      {show && (
        <span className="absolute z-50 bottom-full left-0 mb-1 w-48 p-2 bg-gray-900 border border-gray-700 rounded-lg shadow-xl text-[10px] text-gray-300 font-normal whitespace-normal">
          {tip}
        </span>
      )}
    </span>
  );
};

export const ProfitTesterPanel = ({ market }) => {
  const [investAmount, setInvestAmount] = useState(100);
  const [selectedSide, setSelectedSide] = useState('yes');

  // Calculate profit/loss scenarios
  const calculations = useMemo(() => {
    if (!market) return null;

    const prob = market.market_prob || 0.5;
    const yesPrice = prob;
    const noPrice = 1 - prob;

    const price = selectedSide === 'yes' ? yesPrice : noPrice;
    const oppositePrice = selectedSide === 'yes' ? noPrice : yesPrice;

    // Shares you get for your investment
    const shares = price > 0 ? investAmount / price : 0;

    // If you win: each share pays $1
    const winPayout = shares * 1;
    const winProfit = winPayout - investAmount;

    // If you lose: you lose everything
    const lossAmount = investAmount;

    // ROI and multiplier
    const roi = investAmount > 0 ? (winProfit / investAmount) * 100 : 0;
    const multiplier = price > 0 ? 1 / price : 0;

    // Expected value (probability-weighted outcome)
    const expectedValue = (price * winProfit) + (oppositePrice * -lossAmount);

    return {
      price,
      pricePercent: (price * 100).toFixed(1),
      priceCents: (price * 100).toFixed(0),
      shares,
      winProfit,
      winPayout,
      lossAmount,
      roi,
      multiplier,
      expectedValue,
      breakEven: price * 100,
    };
  }, [market, investAmount, selectedSide]);

  if (!market) {
    return (
      <div className="terminal-panel h-full flex items-center justify-center text-gray-600 text-xs">
        Select a market to test profits
      </div>
    );
  }

  const c = calculations;
  const yesPrice = (market.market_prob || 0.5);
  const noPrice = 1 - yesPrice;

  return (
    <div className="terminal-panel h-full flex flex-col">
      <PanelHeader title="PROFIT TESTER" subtitle="Calculate your returns" />

      <div className="panel-content p-3 flex-1 overflow-y-auto">
        {/* YES/NO Side Selector */}
        <div className="grid grid-cols-2 gap-2 mb-3">
          <button
            onClick={() => setSelectedSide('yes')}
            className={`py-2.5 rounded-lg text-sm font-bold transition-all ${
              selectedSide === 'yes'
                ? 'bg-emerald-500/20 border-2 border-emerald-500 text-emerald-400'
                : 'bg-gray-800/50 border-2 border-gray-700 text-gray-400 hover:border-gray-600'
            }`}
          >
            <div className="text-xs mb-0.5">BUY YES</div>
            <div className={`text-lg font-black ${selectedSide === 'yes' ? 'text-emerald-400' : 'text-gray-300'}`}>
              {(yesPrice * 100).toFixed(0)}¢
            </div>
          </button>
          <button
            onClick={() => setSelectedSide('no')}
            className={`py-2.5 rounded-lg text-sm font-bold transition-all ${
              selectedSide === 'no'
                ? 'bg-rose-500/20 border-2 border-rose-500 text-rose-400'
                : 'bg-gray-800/50 border-2 border-gray-700 text-gray-400 hover:border-gray-600'
            }`}
          >
            <div className="text-xs mb-0.5">BUY NO</div>
            <div className={`text-lg font-black ${selectedSide === 'no' ? 'text-rose-400' : 'text-gray-300'}`}>
              {(noPrice * 100).toFixed(0)}¢
            </div>
          </button>
        </div>

        {/* Investment Amount Input */}
        <div className="mb-3">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] text-gray-500 font-medium uppercase tracking-wide">Investment</span>
            <span className="text-[10px] text-gray-600">Balance: $1,000.00</span>
          </div>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">$</span>
            <input
              type="number"
              value={investAmount}
              onChange={(e) => setInvestAmount(Math.max(1, parseFloat(e.target.value) || 0))}
              className="w-full bg-gray-800/80 border border-gray-700 rounded-lg pl-7 pr-3 py-2.5 text-white text-lg font-bold outline-none focus:border-orange-500 transition-colors"
              min="1"
              step="10"
            />
          </div>

          {/* Quick Amount Buttons */}
          <div className="flex gap-1.5 mt-2">
            {[10, 50, 100, 500, 1000].map((amt) => (
              <button
                key={amt}
                onClick={() => setInvestAmount(amt)}
                className={`flex-1 py-1.5 text-[10px] font-bold rounded-md transition-all ${
                  investAmount === amt
                    ? 'bg-orange-500 text-black'
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-gray-300'
                }`}
              >
                ${amt}
              </button>
            ))}
          </div>
        </div>

        {/* Results Section */}
        <div className="space-y-2">
          {/* WIN Scenario */}
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wide">
                If {selectedSide.toUpperCase()} Wins
              </span>
              <span className="text-[9px] text-emerald-500/70 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                {c?.pricePercent}% chance
              </span>
            </div>

            <div className="flex items-end justify-between">
              <div>
                <Tip tip="Your profit after subtracting your initial investment">
                  <span className="text-[10px] text-gray-500">Profit</span>
                </Tip>
              </div>
              <span className="text-2xl font-black text-emerald-400">
                +${c?.winProfit?.toFixed(2) || '0.00'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-emerald-500/20">
              <div className="flex justify-between text-[10px]">
                <Tip tip="Percentage return on your investment">
                  <span className="text-gray-500">ROI</span>
                </Tip>
                <span className="text-emerald-400 font-bold">{c?.roi?.toFixed(0) || 0}%</span>
              </div>
              <div className="flex justify-between text-[10px]">
                <Tip tip="How many times your investment you get back">
                  <span className="text-gray-500">Multiplier</span>
                </Tip>
                <span className="text-orange-400 font-bold">{c?.multiplier?.toFixed(2) || 1}x</span>
              </div>
            </div>
          </div>

          {/* LOSE Scenario */}
          <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold text-rose-400 uppercase tracking-wide">
                If {selectedSide === 'yes' ? 'NO' : 'YES'} Wins
              </span>
              <span className="text-[9px] text-rose-500/70 bg-rose-500/10 px-1.5 py-0.5 rounded">
                {(100 - parseFloat(c?.pricePercent || 50)).toFixed(1)}% chance
              </span>
            </div>

            <div className="flex items-end justify-between">
              <div>
                <Tip tip="You lose your entire investment if wrong">
                  <span className="text-[10px] text-gray-500">Loss</span>
                </Tip>
              </div>
              <span className="text-2xl font-black text-rose-400">
                -${c?.lossAmount?.toFixed(2) || '0.00'}
              </span>
            </div>

            <div className="mt-2 pt-2 border-t border-rose-500/20">
              <p className="text-[9px] text-gray-500">
                You lose your entire ${investAmount.toFixed(2)} investment
              </p>
            </div>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="mt-3 pt-3 border-t border-gray-800">
          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[10px]">
            <div className="flex justify-between">
              <Tip tip="Number of outcome shares you receive">
                <span className="text-gray-500">Shares</span>
              </Tip>
              <span className="text-white font-medium">{c?.shares?.toFixed(2) || 0}</span>
            </div>
            <div className="flex justify-between">
              <Tip tip="Cost per share in cents">
                <span className="text-gray-500">Price/Share</span>
              </Tip>
              <span className="text-orange-400 font-medium">{c?.priceCents || 0}¢</span>
            </div>
            <div className="flex justify-between">
              <Tip tip="Total payout if you win ($1 per share)">
                <span className="text-gray-500">Win Payout</span>
              </Tip>
              <span className="text-white font-medium">${c?.winPayout?.toFixed(2) || 0}</span>
            </div>
            <div className="flex justify-between">
              <Tip tip="Probability-weighted expected return">
                <span className="text-gray-500">Exp. Value</span>
              </Tip>
              <span className={`font-medium ${(c?.expectedValue || 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {(c?.expectedValue || 0) >= 0 ? '+' : ''}${c?.expectedValue?.toFixed(2) || '0.00'}
              </span>
            </div>
          </div>
        </div>

        {/* How It Works */}
        <div className="mt-3 p-2.5 bg-gray-800/50 rounded-lg border border-gray-700/50">
          <div className="text-[9px] text-gray-500 leading-relaxed">
            <strong className="text-gray-400">How it works:</strong> Buy shares at the current price.
            If your prediction is correct, each share pays out $1. If wrong, shares become worthless.
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfitTesterPanel;
