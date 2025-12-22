import { PanelHeader } from '../PanelHeader';

export const OrderBookPanel = ({ market }) => {
  if (!market)
    return (
      <div className="terminal-panel h-full flex items-center justify-center text-gray-600 text-xs">
        Select a market
      </div>
    );

  const { bids, asks, imbalance } = market.orderbook;
  const maxCumulative = Math.max(
    bids[bids.length - 1]?.cumulative || 0,
    asks[asks.length - 1]?.cumulative || 0
  );

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
        {bids.slice(0, 10).map((bid, i) => {
          const ask = asks[i];
          return (
            <div
              key={i}
              className="grid grid-cols-3 text-xs mono px-2 py-0.5 relative"
            >
              <div
                className="absolute inset-y-0 left-0 bg-green-500/10"
                style={{
                  width: `${
                    (bid.cumulative / (maxCumulative || 1)) * 50
                  }%`,
                }}
              />
              <div
                className="absolute inset-y-0 right-0 bg-red-500/10"
                style={{
                  width: `${
                    (ask.cumulative / (maxCumulative || 1)) * 50
                  }%`,
                }}
              />
              <span className="relative text-gray-500">
                {(bid.size / 1000).toFixed(0)}k
              </span>
              <span className="relative text-center">
                <span className="positive">
                  {(bid.price * 100).toFixed(1)}
                </span>
                <span className="text-gray-600"> / </span>
                <span className="negative">
                  {(ask.price * 100).toFixed(1)}
                </span>
              </span>
              <span className="relative text-right text-gray-500">
                {(ask.size / 1000).toFixed(0)}k
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

