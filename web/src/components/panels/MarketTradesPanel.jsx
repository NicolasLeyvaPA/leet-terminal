import { useState, useEffect } from 'react';
import { PanelHeader } from '../PanelHeader';
import { makeInitialTrades, makeRandomTrade } from '../../utils/helpers';

export const MarketTradesPanel = ({ market }) => {
  const [trades, setTrades] = useState([]);

  useEffect(() => {
    if (!market) return;
    const base = makeInitialTrades(market.ticker, 30);
    setTrades(base);

    const id = setInterval(() => {
      setTrades((prev) => {
        const next = [makeRandomTrade(market.ticker), ...prev];
        return next.slice(0, 60);
      });
    }, 4000);

    return () => clearInterval(id);
  }, [market?.id]);

  if (!market) {
    return (
      <div className="terminal-panel h-full flex items-center justify-center text-gray-600 text-xs">
        Select a market
      </div>
    );
  }

  return (
    <div className="terminal-panel h-full">
      <PanelHeader title="TRADES" subtitle={market.ticker} />
      <div className="panel-content text-xs">
        <div className="grid grid-cols-5 px-2 py-1 border-b border-gray-800 text-[10px] text-gray-500">
          <span>Age</span>
          <span>Type</span>
          <span className="text-right">MC</span>
          <span className="text-right">Amount</span>
          <span className="text-right">Total USD</span>
        </div>
        {trades.map((t) => (
          <div
            key={t.id}
            className="grid grid-cols-5 px-2 py-1 border-b border-gray-900 hover:bg-gray-900/60"
          >
            <span className="text-gray-500">{t.ageLabel}</span>
            <span
              className={t.side === "Buy" ? "text-green-400" : "text-red-400"}
            >
              {t.side}
            </span>
            <span className="text-right text-gray-400">{t.mc}</span>
            <span className="text-right text-gray-400">{t.amount}</span>
            <span
              className={`text-right mono ${
                t.side === "Buy" ? "text-green-400" : "text-red-400"
              }`}
            >
              ${t.usd}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

