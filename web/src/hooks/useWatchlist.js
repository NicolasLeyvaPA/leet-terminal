import { useState, useEffect } from 'react';

const WATCHLIST_STORAGE_KEY = 'leet-terminal-watchlist';

export const useWatchlist = () => {
  const [watchlist, setWatchlist] = useState(() => {
    try {
      const stored = localStorage.getItem(WATCHLIST_STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(WATCHLIST_STORAGE_KEY, JSON.stringify(watchlist));
    } catch (err) {
      console.error('Failed to save watchlist:', err);
    }
  }, [watchlist]);

  const addToWatchlist = (market) => {
    setWatchlist((prev) => {
      // Check if already exists
      if (prev.some((m) => m.id === market.id || m.ticker === market.ticker)) {
        return prev;
      }
      // Convert Polymarket event to watchlist format
      const watchlistItem = {
        id: market.id || `poly-${market.ticker}`,
        ticker: market.ticker,
        platform: 'Polymarket',
        question: market.title || market.question || '',
        category: market.tags?.[0]?.label || 'Other',
        market_prob: market.markets?.[0]?.bestBid || 0.5,
        model_prob: market.markets?.[0]?.bestBid || 0.5,
        prev_prob: market.markets?.[0]?.bestBid || 0.5,
        volume_24h: market.volume24hr || 0,
        liquidity: market.markets?.[0]?.liquidityNum || market.liquidity || 0,
        spread: market.markets?.[0]?.spread || 0,
        open_interest: market.openInterest || 0,
        trades_24h: 0,
        end_date: market.endDate || '',
        isPolymarketEvent: true,
        originalEvent: market,
      };
      return [...prev, watchlistItem];
    });
  };

  const removeFromWatchlist = (id) => {
    setWatchlist((prev) => prev.filter((m) => m.id !== id));
  };

  const isInWatchlist = (idOrTicker) => {
    return watchlist.some((m) => m.id === idOrTicker || m.ticker === idOrTicker);
  };

  return {
    watchlist,
    addToWatchlist,
    removeFromWatchlist,
    isInWatchlist,
  };
};

