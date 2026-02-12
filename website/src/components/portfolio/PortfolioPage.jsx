import { PortfolioSummaryBar } from './PortfolioSummaryBar';
import { SectorDiversificationChart } from './SectorDiversificationChart';
import { PnLChart } from './PnLChart';
import { PortfolioValueChart } from './PortfolioValueChart';
import { HoldingsTable } from './HoldingsTable';
import { TradeHistoryTable } from './TradeHistoryTable';
import { WalletOverview } from './WalletOverview';

export const PortfolioPage = ({ positions, markets }) => {
  return (
    <div className="h-full flex flex-col gap-1.5 overflow-hidden">
      {/* Top summary bar */}
      <div className="flex-shrink-0">
        <PortfolioSummaryBar positions={positions} markets={markets} />
      </div>

      {/* Main content grid */}
      <div className="flex-1 min-h-0 grid grid-cols-4 grid-rows-2 gap-1.5">
        {/* Row 1: Charts */}
        <div className="col-span-1 row-span-2 min-h-0 overflow-hidden">
          <WalletOverview positions={positions} markets={markets} />
        </div>
        <div className="col-span-1 row-span-1 min-h-0 overflow-hidden">
          <SectorDiversificationChart positions={positions} markets={markets} />
        </div>
        <div className="col-span-1 row-span-1 min-h-0 overflow-hidden">
          <PnLChart positions={positions} markets={markets} />
        </div>
        <div className="col-span-1 row-span-1 min-h-0 overflow-hidden">
          <PortfolioValueChart positions={positions} markets={markets} />
        </div>

        {/* Row 2: Tables */}
        <div className="col-span-2 row-span-1 min-h-0 overflow-hidden">
          <HoldingsTable positions={positions} markets={markets} />
        </div>
        <div className="col-span-1 row-span-1 min-h-0 overflow-hidden">
          <TradeHistoryTable positions={positions} markets={markets} />
        </div>
      </div>
    </div>
  );
};
