import { PanelHeader } from '../PanelHeader';
import { PriceChart } from '../Visualization/DataChart';

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
          <PriceChart data={market.price_history} />
        </div>
      </div>
    </div>
  );
};

