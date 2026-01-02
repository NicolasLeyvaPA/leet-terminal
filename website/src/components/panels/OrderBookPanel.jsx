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
    <div className="terminal-panel h-full">
      <PanelHeader
        title="ORDER BOOK"
        subtitle={`Imbal: ${
          imbalance > 0 ? "+" : ""
        }${(imbalance * 100).toFixed(1)}%`}
      />
      <div className="panel-content">
        <div className="grid grid-cols-3 text-xs text-gray-600 px-2 py-1 border-b border-gray-800">
          <span>BID</span>
          <span className="text-center">PRICE</span>
          <span className="text-right">ASK</span>
        </div>
        {!hasOrderbook ? (
          <div className="px-2 py-4 text-center text-gray-500 text-xs">
            Order book data unavailable
          </div>
        ) : (
          bids.slice(0, 10).map((bid, i) => {
            const ask = asks[i] || { price: 0, size: 0, cumulative: 0 };
            const bidCumulative = bid?.cumulative || 0;
            const askCumulative = ask?.cumulative || 0;
            return (
              <div
                key={i}
                className="grid grid-cols-3 text-xs mono px-2 py-0.5 relative"
              >
                {/* Background bars with proper z-index stacking */}
                <div
                  className="absolute inset-y-0 left-0 bg-green-500/10"
                  style={{
                    width: `${(bidCumulative / (maxCumulative || 1)) * 50}%`,
                    zIndex: 0,
                  }}
                />
                <div
                  className="absolute inset-y-0 right-0 bg-red-500/10"
                  style={{
                    width: `${(askCumulative / (maxCumulative || 1)) * 50}%`,
                    zIndex: 0,
                  }}
                />
                {/* Content with higher z-index */}
                <span className="relative text-gray-500" style={{ zIndex: 1 }}>
                  {formatSize(bid?.size)}
                </span>
                <span className="relative text-center" style={{ zIndex: 1 }}>
                  <span className="positive">
                    {formatPrice(bid?.price)}
                  </span>
                  <span className="text-gray-600"> / </span>
                  <span className="negative">
                    {formatPrice(ask?.price)}
                  </span>
                </span>
                <span className="relative text-right text-gray-500" style={{ zIndex: 1 }}>
                  {formatSize(ask?.size)}
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

