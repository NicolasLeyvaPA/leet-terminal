import { useState, useEffect, useMemo } from 'react';
import { PanelHeader } from '../PanelHeader';
import { DataRow } from '../DataRow';
import { Tag } from '../Tag';
import { useWatchlist } from '../../utils/useWatchlist';

// Storage key for expanded categories
const BETS_EXPANDED_KEY = 'leet-terminal-bets-expanded';

// Category styling config
const CATEGORY_CONFIG = {
  'Politics': { border: 'border-blue-500/60', borderLight: 'border-blue-500/20', bg: 'bg-blue-500/10', text: 'text-blue-400' },
  'Crypto': { border: 'border-yellow-500/60', borderLight: 'border-yellow-500/20', bg: 'bg-yellow-500/10', text: 'text-yellow-400' },
  'Sports': { border: 'border-green-500/60', borderLight: 'border-green-500/20', bg: 'bg-green-500/10', text: 'text-green-400' },
  'Entertainment': { border: 'border-purple-500/60', borderLight: 'border-purple-500/20', bg: 'bg-purple-500/10', text: 'text-purple-400' },
  'Science': { border: 'border-cyan-500/60', borderLight: 'border-cyan-500/20', bg: 'bg-cyan-500/10', text: 'text-cyan-400' },
  'Economics': { border: 'border-red-500/60', borderLight: 'border-red-500/20', bg: 'bg-red-500/10', text: 'text-red-400' },
  'Tech': { border: 'border-indigo-500/60', borderLight: 'border-indigo-500/20', bg: 'bg-indigo-500/10', text: 'text-indigo-400' },
  'Pop Culture': { border: 'border-pink-500/60', borderLight: 'border-pink-500/20', bg: 'bg-pink-500/10', text: 'text-pink-400' },
  'Up or Down': { border: 'border-amber-500/60', borderLight: 'border-amber-500/20', bg: 'bg-amber-500/10', text: 'text-amber-400' },
  'Other': { border: 'border-gray-500/60', borderLight: 'border-gray-500/20', bg: 'bg-gray-500/10', text: 'text-gray-400' },
};

const DEFAULT_CONFIG = CATEGORY_CONFIG['Other'];

// Load/save expanded state
const loadExpandedState = () => {
  try {
    const saved = localStorage.getItem(BETS_EXPANDED_KEY);
    return saved ? JSON.parse(saved) : {};
  } catch { return {}; }
};

const saveExpandedState = (state) => {
  try { localStorage.setItem(BETS_EXPANDED_KEY, JSON.stringify(state)); } catch {}
};

export const BetsMarketPanel = () => {
  const { addToWatchlist, isInWatchlist } = useWatchlist();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [expandedCategories, setExpandedCategories] = useState(loadExpandedState);

  // Save expanded state when it changes
  useEffect(() => {
    saveExpandedState(expandedCategories);
  }, [expandedCategories]);

  useEffect(() => {
    const fetchMarkets = async () => {
      try {
        setLoading(true);
        setError(null);

        const apiUrl = import.meta.env.DEV
          ? '/api/polymarket/events?order=id&ascending=false&closed=false&limit=100'
          : 'https://gamma-api.polymarket.com/events?order=id&ascending=false&closed=false&limit=100';

        let response;
        try {
          response = await fetch(apiUrl);
        } catch (corsError) {
          console.warn('Direct fetch failed, trying CORS proxy:', corsError);
          const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent('https://gamma-api.polymarket.com/events?order=id&ascending=false&closed=false&limit=100')}`;
          response = await fetch(proxyUrl);
        }

        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();
        if (!Array.isArray(data)) throw new Error('Invalid response format');
        setEvents(data);
      } catch (err) {
        console.error('Failed to fetch markets:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchMarkets();
    const interval = setInterval(fetchMarkets, 30000);
    return () => clearInterval(interval);
  }, []);

  // Group events by category
  const { groupedEvents, sortedCategories } = useMemo(() => {
    const grouped = {};
    events.forEach(event => {
      const category = event.tags?.[0]?.label || 'Other';
      if (!grouped[category]) grouped[category] = [];
      grouped[category].push(event);
    });

    // Sort categories by count (most markets first)
    const sorted = Object.keys(grouped).sort((a, b) => grouped[b].length - grouped[a].length);

    return { groupedEvents: grouped, sortedCategories: sorted };
  }, [events]);

  const toggleCategory = (category) => {
    setExpandedCategories(prev => ({ ...prev, [category]: !prev[category] }));
  };

  const expandAll = () => {
    const all = {};
    sortedCategories.forEach(cat => { all[cat] = true; });
    setExpandedCategories(all);
  };

  const collapseAll = () => setExpandedCategories({});

  if (loading) {
    return (
      <div className="terminal-panel h-full flex items-center justify-center text-gray-600 text-xs">
        Loading markets...
      </div>
    );
  }

  if (error) {
    return (
      <div className="terminal-panel h-full flex flex-col items-center justify-center text-red-500 text-xs p-4">
        <div className="mb-2">Error: {error}</div>
      </div>
    );
  }

  // Market item component
  const MarketItem = ({ event }) => {
    const market = event.markets?.[0];
    const bestBid = market?.bestBid ? (market.bestBid * 100).toFixed(1) : 'N/A';
    const bestAsk = market?.bestAsk ? (market.bestAsk * 100).toFixed(1) : 'N/A';
    const liquidity = market?.liquidityNum || event.liquidity || 0;
    const inWatchlist = isInWatchlist(event.id);

    return (
      <div
        onClick={() => setSelectedEvent(event)}
        className={`px-3 py-2 cursor-pointer transition-all border-b border-gray-800/50 ${
          selectedEvent?.id === event.id
            ? "bg-orange-500/15 border-l-2 border-l-orange-500"
            : "hover:bg-gray-800/50 border-l-2 border-l-transparent"
        }`}
      >
        <div className="flex items-center justify-between mb-1">
          <span className="text-[11px] font-bold text-orange-500 mono truncate max-w-[180px]">
            {event.ticker}
          </span>
          <span className="text-[10px] text-gray-400 mono">
            {bestBid}¢ / {bestAsk}¢
          </span>
        </div>
        <div className="text-[10px] text-gray-500 mb-1.5 line-clamp-2 leading-tight">
          {event.title}
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[9px] text-gray-600">
            Liq: ${(liquidity / 1000).toFixed(1)}k
          </span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              addToWatchlist(event);
            }}
            className={`text-[9px] px-2 py-0.5 rounded transition-all ${
              inWatchlist
                ? 'bg-green-500/20 text-green-400'
                : 'bg-gray-800 text-gray-500 hover:text-orange-400'
            }`}
          >
            {inWatchlist ? '✓ Watching' : '+ Watch'}
          </button>
        </div>
      </div>
    );
  };

  // Category section component
  const CategorySection = ({ category, categoryEvents }) => {
    const isExpanded = expandedCategories[category] || false;
    const config = CATEGORY_CONFIG[category] || DEFAULT_CONFIG;
    const totalLiquidity = categoryEvents.reduce((sum, e) => {
      const liq = e.markets?.[0]?.liquidityNum || e.liquidity || 0;
      return sum + liq;
    }, 0);

    return (
      <div className="mb-1">
        {/* Category Header */}
        <button
          onClick={() => toggleCategory(category)}
          className={`w-full px-3 py-2 flex items-center justify-between transition-all border-l-2 ${config.border} ${isExpanded ? config.bg : 'bg-gray-900/30 hover:bg-gray-800/50'}`}
        >
          <div className="flex items-center gap-2">
            <span className={`text-[10px] ${config.text} transition-transform ${isExpanded ? 'rotate-90' : ''}`}>
              ▶
            </span>
            <span className={`text-[11px] font-bold ${config.text} uppercase tracking-wide`}>
              {category}
            </span>
            <span className="text-[9px] text-gray-500 bg-gray-800 px-1.5 py-0.5 rounded">
              {categoryEvents.length}
            </span>
          </div>
          <span className="text-[9px] text-gray-500">
            ${(totalLiquidity / 1000).toFixed(0)}k
          </span>
        </button>

        {/* Collapsed preview */}
        {!isExpanded && categoryEvents[0] && (
          <div
            onClick={() => setSelectedEvent(categoryEvents[0])}
            className="px-3 py-1.5 bg-gray-900/20 border-l-2 border-gray-700 cursor-pointer hover:bg-gray-800/30 flex items-center justify-between"
          >
            <span className="text-[10px] text-gray-400 truncate max-w-[65%]">
              {categoryEvents[0].ticker}
            </span>
            <span className="text-[10px] text-white mono">
              {categoryEvents[0].markets?.[0]?.bestBid
                ? `${(categoryEvents[0].markets[0].bestBid * 100).toFixed(1)}¢`
                : 'N/A'}
            </span>
          </div>
        )}

        {/* Expanded list */}
        {isExpanded && (
          <div className={`border-l-2 ${config.borderLight}`}>
            {categoryEvents.map(event => (
              <MarketItem key={event.id} event={event} />
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="h-full flex gap-1.5">
      {/* Left: Grouped Market List */}
      <div className="w-80 terminal-panel h-full flex flex-col">
        <PanelHeader title="MARKETS" subtitle={`${events.length} events`} />

        {/* Controls */}
        <div className="px-3 py-1.5 border-b border-gray-800 flex items-center justify-between bg-gray-900/50 shrink-0">
          <span className="text-[9px] text-gray-500">
            {sortedCategories.length} categories
          </span>
          <div className="flex items-center gap-2">
            <button onClick={expandAll} className="text-[9px] text-gray-500 hover:text-orange-400">[+all]</button>
            <button onClick={collapseAll} className="text-[9px] text-gray-500 hover:text-orange-400">[-all]</button>
          </div>
        </div>

        {/* Categories */}
        <div className="panel-content flex-1 overflow-y-auto">
          {events.length === 0 ? (
            <div className="px-2 py-4 text-center text-gray-600 text-xs">No markets found</div>
          ) : (
            sortedCategories.map(category => (
              <CategorySection
                key={category}
                category={category}
                categoryEvents={groupedEvents[category]}
              />
            ))
          )}
        </div>
      </div>

      {/* Right: Market Details */}
      <div className="flex-1 terminal-panel h-full">
        {selectedEvent ? (
          <>
            <PanelHeader
              title={selectedEvent.ticker}
              subtitle="Market Details"
              actions={
                <button
                  onClick={() => addToWatchlist(selectedEvent)}
                  className={`btn text-[10px] px-2 py-0.5 ${
                    isInWatchlist(selectedEvent.id) ? 'success' : 'primary'
                  }`}
                >
                  {isInWatchlist(selectedEvent.id) ? '✓ In Watchlist' : '+ Add to Watchlist'}
                </button>
              }
            />
            <div className="panel-content p-2">
              <div className="text-xs text-gray-400 mb-3 leading-tight">
                {selectedEvent.title}
              </div>

              {selectedEvent.description && (
                <div className="mb-3">
                  <div className="text-xs text-gray-600 mb-1">DESCRIPTION</div>
                  <div className="text-xs text-gray-400 leading-relaxed">
                    {selectedEvent.description}
                  </div>
                </div>
              )}

              {selectedEvent.markets?.[0] && (
                <>
                  <div className="border-t border-gray-800 pt-2 mb-2">
                    <div className="text-xs text-gray-600 mb-1">MARKET DATA</div>
                    <DataRow label="Best Bid" value={`${(selectedEvent.markets[0].bestBid * 100).toFixed(2)}¢`} type="positive" />
                    <DataRow label="Best Ask" value={`${(selectedEvent.markets[0].bestAsk * 100).toFixed(2)}¢`} type="negative" />
                    <DataRow label="Spread" value={`${((selectedEvent.markets[0].bestAsk - selectedEvent.markets[0].bestBid) * 100).toFixed(2)}%`} />
                    <DataRow label="Liquidity" value={`$${(selectedEvent.markets[0].liquidityNum || 0).toFixed(2)}`} />
                    <DataRow label="Volume" value={`$${(selectedEvent.markets[0].volumeNum || 0).toFixed(2)}`} />
                  </div>

                  <div className="border-t border-gray-800 pt-2 mb-2">
                    <div className="text-xs text-gray-600 mb-1">OUTCOMES</div>
                    {selectedEvent.markets[0].outcomes && (
                      <div className="space-y-1">
                        {(() => {
                          try {
                            const outcomes = JSON.parse(selectedEvent.markets[0].outcomes);
                            if (!Array.isArray(outcomes)) return null;
                            let prices = [];
                            try {
                              if (selectedEvent.markets[0].outcomePrices) {
                                prices = JSON.parse(selectedEvent.markets[0].outcomePrices);
                                if (!Array.isArray(prices)) prices = [];
                              }
                            } catch { prices = []; }
                            return outcomes.map((outcome, idx) => {
                              const price = prices[idx] ? (parseFloat(prices[idx]) * 100).toFixed(2) : 'N/A';
                              return (
                                <div key={idx} className="flex justify-between text-xs">
                                  <span className="text-gray-400">{outcome}</span>
                                  <span className="mono text-gray-300">{price}¢</span>
                                </div>
                              );
                            });
                          } catch {
                            return <div className="text-xs text-gray-500">Unable to parse outcomes</div>;
                          }
                        })()}
                      </div>
                    )}
                  </div>
                </>
              )}

              <div className="border-t border-gray-800 pt-2">
                <div className="text-xs text-gray-600 mb-1">EVENT INFO</div>
                <DataRow label="End Date" value={selectedEvent.endDate ? new Date(selectedEvent.endDate).toLocaleString() : 'N/A'} small />
                {selectedEvent.resolutionSource && (
                  <DataRow label="Resolution" value={selectedEvent.resolutionSource} small />
                )}
                {selectedEvent.series?.length > 0 && (
                  <DataRow label="Series" value={selectedEvent.series[0].title} small />
                )}
                {selectedEvent.tags?.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {selectedEvent.tags.map((tag) => (
                      <Tag key={tag.id} type="category">{tag.label}</Tag>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="h-full flex items-center justify-center text-gray-600 text-xs">
            <div className="text-center">
              <div className="mb-2">Select a market from the list</div>
              <div className="text-[10px] text-gray-500">
                {events.length > 0 ? `${events.length} markets available` : 'No markets found'}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
