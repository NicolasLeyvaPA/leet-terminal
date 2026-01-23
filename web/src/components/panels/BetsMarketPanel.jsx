import { useState, useEffect } from 'react';
import { PanelHeader } from '../PanelHeader';
import { DataRow } from '../DataRow';
import { Tag } from '../Tag';
import { useWatchlist } from '../../hooks/useWatchlist';
import { getAuthToken } from '../../utils/auth';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

export const BetsMarketPanel = () => {
  const { addToWatchlist, isInWatchlist } = useWatchlist();
  const [events, setEvents] = useState([]);
  const [filteredEvents, setFilteredEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchMode, setSearchMode] = useState('fuzzy'); // 'fuzzy' or 'regex'
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Fuzzy search function
  const fuzzyMatch = (text, query) => {
    if (!query) return true;
    
    const lowerText = text.toLowerCase();
    const lowerQuery = query.toLowerCase();
    
    // Simple fuzzy matching: check if all characters in query appear in order
    let queryIndex = 0;
    for (let i = 0; i < lowerText.length && queryIndex < lowerQuery.length; i++) {
      if (lowerText[i] === lowerQuery[queryIndex]) {
        queryIndex++;
      }
    }
    return queryIndex === lowerQuery.length;
  };

  // Regex search function
  const regexMatch = (text, pattern) => {
    if (!pattern) return true;
    
    try {
      const regex = new RegExp(pattern, 'i');
      return regex.test(text);
    } catch (e) {
      // Invalid regex, fall back to includes
      return text.toLowerCase().includes(pattern.toLowerCase());
    }
  };

  // Filter events based on search
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredEvents(events);
      return;
    }

    const filtered = events.filter(event => {
      const searchText = `${event.title} ${event.ticker} ${event.description || ''}`;
      
      if (searchMode === 'regex') {
        return regexMatch(searchText, searchQuery);
      } else {
        return fuzzyMatch(searchText, searchQuery);
      }
    });

    setFilteredEvents(filtered);
  }, [searchQuery, searchMode, events]);

  useEffect(() => {
    const fetchMarkets = async () => {
      try {
        // Don't show loading on refresh if we already have data
        if (events.length === 0) {
          setLoading(true);
        } else {
          setIsRefreshing(true);
        }
        setError(null);
        
        // Always use backend proxy to avoid CORS issues
        const token = getAuthToken();
        const apiUrl = `${API_BASE_URL}/api/v1/polymarket/events?order=id&ascending=false&closed=false&limit=100`;
        
        const response = await fetch(apiUrl, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        // Validate response data
        if (!Array.isArray(data)) {
          throw new Error('Invalid response format');
        }
        
        // Update events without disrupting UI
        setEvents(prevEvents => {
          // If we have a selected event, try to maintain selection
          if (selectedEvent) {
            const updatedEvent = data.find(e => e.id === selectedEvent.id);
            if (updatedEvent) {
              setSelectedEvent(updatedEvent);
            }
          }
          return data;
        });
      } catch (err) {
        console.error('Failed to fetch markets:', err);
        // Only set error if we don't have existing data
        if (events.length === 0) {
          setError(`Error loading markets: ${err.message}`);
        } else {
          console.warn('Failed to refresh markets, using cached data');
        }
      } finally {
        setLoading(false);
        setIsRefreshing(false);
      }
    };

    fetchMarkets();
    const interval = setInterval(fetchMarkets, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, [selectedEvent?.id]); // Only depend on selectedEvent.id to avoid infinite loops

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
        <div className="mb-2">Error loading markets: {error}</div>
        <div className="text-gray-500 text-[10px] mt-2">
          If this is a CORS error, you may need to use a proxy or enable CORS on the API.
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex gap-1.5">
      {/* Left: Market List */}
      <div className="w-80 terminal-panel h-full flex flex-col">
        <PanelHeader 
          title="MARKETS" 
          subtitle={`${filteredEvents.length} of ${events.length} events${isRefreshing ? ' • ↻ Refreshing...' : ''}`} 
        />
        
        {/* Search Bar */}
        <div className="px-2 py-2 border-b border-gray-800">
          <div className="flex gap-1 mb-1">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={searchMode === 'regex' ? 'Search with regex...' : 'Search markets...'}
              className="flex-1 px-2 py-1 bg-black/40 border border-cyan-500/30 text-cyan-400 text-xs font-mono rounded focus:outline-none focus:border-cyan-500"
            />
            <button
              onClick={() => setSearchMode(searchMode === 'fuzzy' ? 'regex' : 'fuzzy')}
              className={`px-2 py-1 text-xs font-mono rounded border transition-colors ${
                searchMode === 'regex'
                  ? 'bg-orange-500/20 border-orange-500/50 text-orange-400'
                  : 'bg-cyan-500/20 border-cyan-500/50 text-cyan-400'
              }`}
              title={`Current: ${searchMode === 'regex' ? 'Regex' : 'Fuzzy'} search. Click to switch.`}
            >
              {searchMode === 'regex' ? '.*' : 'Az'}
            </button>
          </div>
          {searchQuery && (
            <div className="text-xs text-gray-500">
              {searchMode === 'regex' ? 'Regex mode' : 'Fuzzy search'} • {filteredEvents.length} match{filteredEvents.length !== 1 ? 'es' : ''}
            </div>
          )}
        </div>

        <div className="panel-content flex-1 overflow-y-auto">
          {filteredEvents.length === 0 ? (
            <div className="px-2 py-4 text-center text-gray-600 text-xs">
              {searchQuery ? 'No markets match your search' : 'No markets found'}
            </div>
          ) : (
            filteredEvents.map((event) => {
              const market = event.markets?.[0];
              const bestBid = market?.bestBid ? (market.bestBid * 100).toFixed(1) : 'N/A';
              const bestAsk = market?.bestAsk ? (market.bestAsk * 100).toFixed(1) : 'N/A';
              const liquidity = market?.liquidityNum || event.liquidity || 0;
            
            return (
              <div
                key={event.id}
                onClick={() => setSelectedEvent(event)}
                className={`px-2 py-2 border-b border-gray-900 cursor-pointer transition-colors ${
                  selectedEvent?.id === event.id
                    ? "bg-orange-500/10 border-l-2 border-l-orange-500"
                    : "hover:bg-gray-900/50"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-orange-500 mono">
                    {event.ticker}
                  </span>
                  {market && (
                    <span className="text-xs text-gray-500">
                      {bestBid}¢ / {bestAsk}¢
                    </span>
                  )}
                </div>
                <div className="text-xs text-gray-400 mb-1 leading-tight line-clamp-2">
                  {event.title}
                </div>
                <div className="flex items-center justify-between mt-1">
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-gray-600">
                      Liq: ${(liquidity / 1000).toFixed(1)}k
                    </span>
                    {event.tags && event.tags.length > 0 && (
                      <Tag type="category">
                        {event.tags[0].label}
                      </Tag>
                    )}
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      addToWatchlist(event);
                    }}
                    className={`btn text-[10px] px-2 py-0.5 ${
                      isInWatchlist(event.id) ? 'success' : ''
                    }`}
                    title={isInWatchlist(event.id) ? 'In watchlist' : 'Add to watchlist'}
                  >
                    {isInWatchlist(event.id) ? '✓ Added' : '+ Watch'}
                  </button>
                </div>
              </div>
            );
          })
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
                    <DataRow
                      label="Best Bid"
                      value={`${(selectedEvent.markets[0].bestBid * 100).toFixed(2)}¢`}
                      type="positive"
                    />
                    <DataRow
                      label="Best Ask"
                      value={`${(selectedEvent.markets[0].bestAsk * 100).toFixed(2)}¢`}
                      type="negative"
                    />
                    <DataRow
                      label="Spread"
                      value={`${((selectedEvent.markets[0].bestAsk - selectedEvent.markets[0].bestBid) * 100).toFixed(2)}%`}
                    />
                    <DataRow
                      label="Liquidity"
                      value={`$${(selectedEvent.markets[0].liquidityNum || 0).toFixed(2)}`}
                    />
                    <DataRow
                      label="Volume"
                      value={`$${(selectedEvent.markets[0].volumeNum || 0).toFixed(2)}`}
                    />
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
                            } catch {
                              prices = [];
                            }

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
                            return (
                              <div className="text-xs text-gray-500">
                                Unable to parse outcome data
                              </div>
                            );
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
                {selectedEvent.series && selectedEvent.series.length > 0 && (
                  <DataRow label="Series" value={selectedEvent.series[0].title} small />
                )}
                {selectedEvent.tags && selectedEvent.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {selectedEvent.tags.map((tag) => (
                      <Tag key={tag.id} type="category">
                        {tag.label}
                      </Tag>
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

