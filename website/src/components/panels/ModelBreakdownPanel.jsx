import { PanelHeader } from '../PanelHeader';

export const ModelBreakdownPanel = ({ market }) => {
  if (!market)
    return (
      <div className="terminal-panel h-full flex items-center justify-center text-gray-600 text-xs">
        Select a market
      </div>
    );

  // Calculate signals from REAL market data
  const hasOrderbook = market.bestBid > 0 && market.bestAsk > 0;
  const hasVolume = (market.volume_24h || 0) > 0;
  const hasLiquidity = (market.liquidity || 0) > 0;
  const edge = (market.model_prob || 0) - (market.market_prob || 0);

  // Build signal list from real data
  const signals = [];

  if (hasOrderbook) {
    const spread = market.bestAsk - market.bestBid;
    const imbalance = market.bestBid / (market.bestBid + market.bestAsk);
    
    signals.push({
      name: 'Bid/Ask Spread',
      value: spread,
      display: `${(spread * 100).toFixed(2)}%`,
      quality: spread < 0.02 ? 'good' : spread < 0.05 ? 'fair' : 'poor',
      qualityLabel: spread < 0.02 ? 'Tight' : spread < 0.05 ? 'Normal' : 'Wide',
      isReal: true,
    });
    
    signals.push({
      name: 'Order Imbalance',
      value: imbalance,
      display: `${(imbalance * 100).toFixed(1)}% bid`,
      quality: imbalance > 0.55 ? 'bullish' : imbalance < 0.45 ? 'bearish' : 'neutral',
      qualityLabel: imbalance > 0.55 ? 'Bullish' : imbalance < 0.45 ? 'Bearish' : 'Balanced',
      isReal: true,
    });
  }

  if (hasVolume) {
    signals.push({
      name: '24h Volume',
      value: market.volume_24h,
      display: `$${market.volume_24h >= 1000000 ? (market.volume_24h / 1000000).toFixed(2) + 'M' : (market.volume_24h / 1000).toFixed(1) + 'K'}`,
      quality: market.volume_24h > 100000 ? 'good' : market.volume_24h > 10000 ? 'fair' : 'low',
      qualityLabel: market.volume_24h > 100000 ? 'High' : market.volume_24h > 10000 ? 'Moderate' : 'Low',
      isReal: true,
    });
  }

  if (hasLiquidity) {
    signals.push({
      name: 'Liquidity Depth',
      value: market.liquidity,
      display: `$${market.liquidity >= 1000000 ? (market.liquidity / 1000000).toFixed(2) + 'M' : (market.liquidity / 1000).toFixed(1) + 'K'}`,
      quality: market.liquidity > 500000 ? 'good' : market.liquidity > 100000 ? 'fair' : 'low',
      qualityLabel: market.liquidity > 500000 ? 'Deep' : market.liquidity > 100000 ? 'Moderate' : 'Thin',
      isReal: true,
    });
  }

  // Add data loading status
  const dataStatus = market.dataStatus || 'unknown';
  const dataSource = market.dataSource || 'api';

  return (
    <div className="terminal-panel h-full">
      <PanelHeader 
        title="MARKET SIGNALS" 
        subtitle={signals.length > 0 ? `${signals.length} indicators` : 'Analysis'} 
      />
      <div className="panel-content p-2 overflow-y-auto">
        {/* Honest disclaimer */}
        <div className="mb-3 p-2 bg-yellow-500/10 border border-yellow-500/30 rounded text-xs">
          <span className="text-yellow-500 font-medium">⚠️ Heuristic Only</span>
          <p className="text-gray-400 mt-1 text-[10px]">
            Derived from market microstructure. Not predictive.
          </p>
        </div>

        {signals.length === 0 ? (
          <div className="text-xs text-gray-500 py-4 text-center">
            {dataStatus === 'loading' ? (
              <span className="text-orange-400 animate-pulse">Loading signals...</span>
            ) : dataStatus === 'error' ? (
              <span className="text-red-400">Failed to load data</span>
            ) : (
              'No market signal data available'
            )}
          </div>
        ) : (
          signals.map((signal, idx) => (
            <div key={idx} className="mb-2.5">
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-gray-400 flex items-center gap-1">
                  {signal.name}
                  <span className="text-green-500 text-[9px]" title="Real data">●</span>
                </span>
                <span className="mono text-gray-300">
                  {signal.display}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                  signal.quality === 'good' || signal.quality === 'bullish'
                    ? 'bg-green-500/20 text-green-400'
                    : signal.quality === 'poor' || signal.quality === 'bearish' || signal.quality === 'low'
                    ? 'bg-red-500/20 text-red-400'
                    : 'bg-gray-500/20 text-gray-400'
                }`}>
                  {signal.qualityLabel}
                </span>
              </div>
            </div>
          ))
        )}

        {/* Heuristic Edge Summary */}
        <div className="border-t border-gray-800 pt-2 mt-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-300 font-medium">
              Heuristic Edge
            </span>
            <span className={`mono font-bold ${
              edge > 0.02 ? 'text-green-400' : edge < -0.02 ? 'text-red-400' : 'text-gray-400'
            }`}>
              {edge > 0 ? '+' : ''}{(edge * 100).toFixed(1)}%
            </span>
          </div>
          <div className="flex items-center justify-between text-[10px] text-gray-600 mt-1">
            <span>Market: {((market.market_prob || 0) * 100).toFixed(1)}%</span>
            <span>→</span>
            <span>Heuristic: {((market.model_prob || 0) * 100).toFixed(1)}%</span>
          </div>
        </div>

        {/* Data source indicator */}
        <div className="border-t border-gray-800 pt-2 mt-3">
          <div className="flex items-center justify-between text-[9px] text-gray-600">
            <span className="flex items-center gap-1">
              <span className="text-green-500">●</span> Real API data
            </span>
            <span className={`${
              dataSource === 'api' ? 'text-green-500' : 'text-yellow-500'
            }`}>
              {dataSource === 'api' ? 'Live' : 'Fallback'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
