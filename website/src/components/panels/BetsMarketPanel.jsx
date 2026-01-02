import { useState, useEffect } from 'react';
import { PanelHeader } from '../PanelHeader';
import { DataRow } from '../DataRow';
import { Tag } from '../Tag';
import { useWatchlist } from '../../utils/useWatchlist';

export const BetsMarketPanel = () => {
  const { addToWatchlist, isInWatchlist } = useWatchlist();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);

  useEffect(() => {
    const fetchMarkets = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Use proxy in development, direct API with CORS proxy fallback in production
        const apiUrl = import.meta.env.DEV
          ? '/api/polymarket/events?order=id&ascending=false&closed=false&limit=100'
          : 'https://gamma-api.polymarket.com/events?order=id&ascending=false&closed=false&limit=100';
        
        let response;
        try {
          response = await fetch(apiUrl);
        } catch (corsError) {
          // Fallback to CORS proxy if direct fetch fails
          console.warn('Direct fetch failed, trying CORS proxy:', corsError);
          const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent('https://gamma-api.polymarket.com/events?order=id&ascending=false&closed=false&limit=100')}`;
          response = await fetch(proxyUrl);
        }
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        // Validate response data
        if (!Array.isArray(data)) {
          throw new Error('Invalid response format');
        }
        setEvents(data);
      } catch (err) {
        console.error('Failed to fetch markets:', err);
        const errorMessage = err.message.includes('CORS') || err.message.includes('Failed to fetch')
          ? 'CORS error: Unable to fetch from Polymarket API. The proxy should handle this in development.'
          : err.message;
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    fetchMarkets();
    const interval = setInterval(fetchMarkets, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

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
      <div className="w-80 terminal-panel h-full">
        <PanelHeader title="MARKETS" subtitle={`${events.length} events`} />
        <div className="panel-content">
          {events.length === 0 ? (
            <div className="px-2 py-4 text-center text-gray-600 text-xs">
              No markets found
            </div>
          ) : (
            events.map((event) => {
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

