import { PanelHeader } from '../PanelHeader';

export const OrderBookPanel = ({ market }) => {
  if (!market)
    return (
      <div className="terminal-panel h-full flex items-center justify-center text-gray-600 text-xs">
        Select a market
      </div>
    );

  // Validate orderbook data exists
  const orderbook = market.orderbook || {};
  const bids = Array.isArray(orderbook.bids) ? orderbook.bids : [];
  const asks = Array.isArray(orderbook.asks) ? orderbook.asks : [];
  const imbalance = typeof orderbook.imbalance === 'number' ? orderbook.imbalance : 0;

  const hasOrderbook = bids.length > 0 && asks.length > 0;

  const maxCumulative = Math.max(
    bids[bids.length - 1]?.cumulative || 0,
    asks[asks.length - 1]?.cumulative || 0
  );

  // Safe number formatting helper
  const formatSize = (size) => {
    if (size === undefined || size === null || isNaN(size)) return '0k';
    return (size / 1000).toFixed(0) + 'k';
  };

  const formatPrice = (price) => {
    if (price === undefined || price === null || isNaN(price)) return '0.0';
    return (price * 100).toFixed(1);
  };

  return (
    <div className="terminal-panel h-full flex flex-col" style={{ isolation: 'isolate' }}>
      <PanelHeader
        title="ORDER BOOK"
        subtitle={`Imbal: ${
          imbalance > 0 ? "+" : ""
        }${(imbalance * 100).toFixed(1)}%`}
      />
      <div className="panel-content flex-1 overflow-hidden">
        <div className="grid grid-cols-3 text-xs text-gray-600 px-2 py-1 border-b border-gray-800">
          <span>BID</span>
          <span className="text-center">PRICE</span>
          <span className="text-right">ASK</span>
        </div>
        <div className="overflow-y-auto" style={{ maxHeight: 'calc(100% - 24px)' }}>
          {!hasOrderbook ? (
            <div className="px-2 py-4 text-center text-gray-500 text-xs">
              <div className="text-gray-500 mb-1">○ No Order Book</div>
              <div className="text-gray-700 text-[10px]">
                {market._ammBased 
                  ? 'AMM-based market (no orderbook)'
                  : 'Data unavailable from API'}
              </div>
            </div>
          ) : (
            bids.slice(0, 10).map((bid, i) => {
              const ask = asks[i] || { price: 0, size: 0, cumulative: 0 };
              const bidCumulative = bid?.cumulative || 0;
              const askCumulative = ask?.cumulative || 0;
              return (
                <div
                  key={i}
                  className="grid grid-cols-3 text-xs mono px-2 py-0.5 relative overflow-hidden"
                  style={{ isolation: 'isolate' }}
                >
                  {/* Background bars - absolutely positioned within isolated context */}
                  <div
                    className="absolute inset-y-0 left-0 bg-green-500/15 pointer-events-none"
                    style={{
                      width: `${Math.min((bidCumulative / (maxCumulative || 1)) * 50, 50)}%`,
                      zIndex: 0,
                    }}
                  />
                  <div
                    className="absolute inset-y-0 right-0 bg-red-500/15 pointer-events-none"
                    style={{
                      width: `${Math.min((askCumulative / (maxCumulative || 1)) * 50, 50)}%`,
                      zIndex: 0,
                    }}
                  />
                  {/* Content layer */}
                  <span className="relative text-gray-400" style={{ zIndex: 1 }}>
                    {formatSize(bid?.size)}
                  </span>
                  <span className="relative text-center" style={{ zIndex: 1 }}>
                    <span className="text-green-400 font-medium">
                      {formatPrice(bid?.price)}
                    </span>
                    <span className="text-gray-700 mx-0.5">/</span>
                    <span className="text-red-400 font-medium">
                      {formatPrice(ask?.price)}
                    </span>
                  </span>
                  <span className="relative text-right text-gray-400" style={{ zIndex: 1 }}>
                    {formatSize(ask?.size)}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

