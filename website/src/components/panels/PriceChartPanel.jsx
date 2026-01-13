import { PanelHeader } from '../PanelHeader';
import { TradingViewChart } from '../charts/TradingViewChart';

export const PriceChartPanel = ({ market }) => {
  if (!market)
    return (
      <div className="terminal-panel h-full flex items-center justify-center text-gray-600 text-xs">
        Select a market
      </div>
    );

  return (
    <div className="terminal-panel h-full">
      <PanelHeader title="PRICE" subtitle={`${market.ticker} 90D`} />
      <div className="panel-content p-1 flex flex-col">
        <div className="flex-1 min-h-0">
          <TradingViewChart
            data={(market.price_history || []).map(p => ({
              ...p,
              timestamp: p.time || p.timestamp || Date.now()
            }))}
            height={200}
            chartType="area"
            priceFormat="percent"
            showExpand={true}
          />
        </div>
      </div>
    </div>
  );
};

