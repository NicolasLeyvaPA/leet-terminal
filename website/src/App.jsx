import { useState, useEffect, useRef, useMemo } from 'react';
import { MARKETS_DATABASE, PORTFOLIO_POSITIONS, NEWS_FEED } from './data/constants';
import { WatchlistPanel } from './components/panels/WatchlistPanel';
import { MarketOverviewPanel } from './components/panels/MarketOverviewPanel';
import { PriceChartPanel } from './components/panels/PriceChartPanel';
import { OrderBookPanel } from './components/panels/OrderBookPanel';
import { ConfluencePanel } from './components/panels/ConfluencePanel';
import { ModelBreakdownPanel } from './components/panels/ModelBreakdownPanel';
import { GreeksPanel } from './components/panels/GreeksPanel';
import { MonteCarloPanel } from './components/panels/MonteCarloPanel';
import { PortfolioPanel } from './components/panels/PortfolioPanel';
import { QuantumLabPanel } from './components/panels/QuantumLabPanel';
import { NewsFeedPanel } from './components/panels/NewsFeedPanel';
import { BetsMarketPanel } from './components/panels/BetsMarketPanel';
import { MarketDetailDock } from './components/MarketDetailDock';
import { useWatchlist } from './utils/useWatchlist';

const Terminal = () => {
  const { watchlist } = useWatchlist();
  const [markets, setMarkets] = useState([]);
  const [loadingMarkets, setLoadingMarkets] = useState(false);
  const [platformFilter, setPlatformFilter] = useState("all");
  const [selectedMarket, setSelectedMarket] = useState(null);
  const [command, setCommand] = useState("");
  const [workspace, setWorkspace] = useState("analysis");
  const [time, setTime] = useState(new Date());
  const [leftWidth, setLeftWidth] = useState(260);
  const [detailHeight, setDetailHeight] = useState(220);
  const [analyticsWidth, setAnalyticsWidth] = useState(420);
  const dragStateRef = useRef({ type: null, startX: 0, startY: 0, startVal: 0 });

  useEffect(() => {
    // Set selected market from watchlist if available
    if (!selectedMarket && watchlist.length > 0) {
      setSelectedMarket(watchlist[0]);
    }
  }, [watchlist]);

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleCommand = (e) => {
    if (e.key === "Enter" && command) {
      const cmd = command.toUpperCase().trim();
      const market = watchlist.find((m) => m.ticker === cmd);
      if (market) {
        setSelectedMarket(market);
        setCommand("");
        return;
      }
      if (["ANALYSIS", "ANA"].includes(cmd)) setWorkspace("analysis");
      else if (["PORTFOLIO", "PORT"].includes(cmd)) setWorkspace("portfolio");
      else if (["LAB", "QUANTUM"].includes(cmd)) setWorkspace("lab");
      else if (["SCAN"].includes(cmd)) setWorkspace("scan");
      else if (["BETS", "MARKETS"].includes(cmd)) setWorkspace("bets");
      setCommand("");
    }
  };

  const filteredMarkets = useMemo(() => {
    // Only show watchlist items, filter by platform if needed
    let filtered = watchlist;
    if (platformFilter !== "all") {
      filtered = watchlist.filter(m => m.platform.toLowerCase() === platformFilter);
    }
    return filtered;
  }, [watchlist, platformFilter]);

  const handleNewsSelect = (newsItem) => {
    const tickers = newsItem.markets || [];
    const targetMarket = watchlist.find(m => tickers.includes(m.ticker));

    if (targetMarket) {
      const platform = targetMarket.platform.toLowerCase();
      setPlatformFilter(platform);
      setSelectedMarket(targetMarket);
      setWorkspace("analysis");
    }
  };

  const startDrag = (type, event) => {
    if (type === "left") {
      dragStateRef.current = { type, startX: event.clientX, startVal: leftWidth };
    } else if (type === "detail") {
      dragStateRef.current = { type, startY: event.clientY, startVal: detailHeight };
    } else if (type === "analytics") {
      dragStateRef.current = { type, startX: event.clientX, startVal: analyticsWidth };
    }
    window.addEventListener("mousemove", onDrag);
    window.addEventListener("mouseup", stopDrag);
  };

  const onDrag = (event) => {
    const state = dragStateRef.current;
    if (!state.type) return;

    if (state.type === "left") {
      const dx = event.clientX - state.startX;
      let next = state.startVal + dx;
      const maxWidth = window.innerWidth - 260;
      next = Math.max(140, Math.min(maxWidth, next));
      setLeftWidth(next);
    } else if (state.type === "detail") {
      const dy = event.clientY - state.startY;
      let next = state.startVal - dy;
      const maxHeight = window.innerHeight - 160;
      next = Math.max(80, Math.min(maxHeight, next));
      setDetailHeight(next);
    } else if (state.type === "analytics") {
      const dx = event.clientX - state.startX;
      let next = state.startVal + dx;
      const container = document.getElementById("analytics-container");
      const containerWidth = container ? container.clientWidth : window.innerWidth;
      const maxWidth = containerWidth - 260;
      next = Math.max(260, Math.min(maxWidth, next));
      setAnalyticsWidth(next);
    }
  };

  const stopDrag = () => {
    dragStateRef.current = { type: null, startX: 0, startY: 0, startVal: 0 };
    window.removeEventListener("mousemove", onDrag);
    window.removeEventListener("mouseup", stopDrag);
  };

  useEffect(() => {
    return () => {
      window.removeEventListener("mousemove", onDrag);
      window.removeEventListener("mouseup", stopDrag);
    };
  }, []);

  const tickerItems = watchlist.slice(0, 12).map((m) => {
    const edge = m.model_prob - m.market_prob;
    const change = m.market_prob - (m.prev_prob || m.market_prob);
    return (
      <span key={m.id} className="inline-flex items-center gap-1 mx-3 text-xs">
        <span className="text-orange-500 font-bold">{m.ticker}</span>
        <span className="text-gray-400">{(m.market_prob * 100).toFixed(1)}¢</span>
        <span className={change > 0 ? "positive" : change < 0 ? "negative" : "text-gray-500"}>
          {change > 0 ? "▲" : change < 0 ? "▼" : "•"} {Math.abs(change * 100).toFixed(1)}
        </span>
        <span className={edge > 0 ? "positive" : "negative"}>
          [{edge > 0 ? "+" : ""}{(edge * 100).toFixed(1)}%]
        </span>
      </span>
    );
  });

  const renderRightGrid = () => {
    if (workspace === "analysis") {
      return (
        <div className="h-full flex flex-col gap-1.5">
          <div className="flex gap-1.5" style={{ flex: "0 0 48%" }}>
            <div className="flex-1">
              <MarketOverviewPanel market={selectedMarket} />
            </div>
            <div className="flex-1">
              <PriceChartPanel market={selectedMarket} />
            </div>
            <div className="w-64">
              <OrderBookPanel market={selectedMarket} />
            </div>
          </div>
          <div id="analytics-container" className="flex-1 min-h-0 flex gap-1.5">
            <div id="analytics-left" className="h-full" style={{ flex: `0 0 ${analyticsWidth}px` }}>
              <ConfluencePanel market={selectedMarket} />
            </div>
            <div className="split-handle-x" onMouseDown={(e) => startDrag("analytics", e)} />
            <div className="flex-1 min-w-0 grid grid-rows-2 gap-1.5">
              <div className="row-span-1">
                <ModelBreakdownPanel market={selectedMarket} />
              </div>
              <div className="row-span-1 grid grid-cols-2 gap-1.5">
                <div className="col-span-1">
                  <GreeksPanel market={selectedMarket} />
                </div>
                <div className="col-span-1">
                  <MonteCarloPanel market={selectedMarket} />
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    if (workspace === "portfolio") {
      return (
        <div className="h-full grid grid-cols-10 grid-rows-6 gap-1.5">
          <div className="col-span-3 row-span-6">
            <PortfolioPanel positions={PORTFOLIO_POSITIONS} markets={watchlist} />
          </div>
          <div className="col-span-4 row-span-3">
            <PriceChartPanel market={selectedMarket} />
          </div>
          <div className="col-span-3 row-span-3">
            <GreeksPanel market={selectedMarket} />
          </div>
          <div className="col-span-5 row-span-3">
            <MonteCarloPanel market={selectedMarket} />
          </div>
          <div className="col-span-5 row-span-3">
            <NewsFeedPanel news={NEWS_FEED} onNewsClick={handleNewsSelect} />
          </div>
        </div>
      );
    }

    if (workspace === "lab") {
      return (
        <div className="h-full grid grid-cols-10 grid-rows-6 gap-1.5">
          <div className="col-span-3 row-span-6">
            <QuantumLabPanel markets={watchlist} />
          </div>
          <div className="col-span-4 row-span-3">
            <MonteCarloPanel market={selectedMarket} />
          </div>
          <div className="col-span-3 row-span-3">
            <ConfluencePanel market={selectedMarket} />
          </div>
          <div className="col-span-4 row-span-3">
            <ModelBreakdownPanel market={selectedMarket} />
          </div>
          <div className="col-span-6 row-span-3">
            <NewsFeedPanel news={NEWS_FEED} onNewsClick={handleNewsSelect} />
          </div>
        </div>
      );
    }

    if (workspace === "bets") {
      return (
        <div className="h-full">
          <BetsMarketPanel />
        </div>
      );
    }

    return (
      <div className="h-full grid grid-cols-10 grid-rows-6 gap-1.5">
        <div className="col-span-4 row-span-3">
          <ConfluencePanel market={selectedMarket} />
        </div>
        <div className="col-span-3 row-span-3">
          <MonteCarloPanel market={selectedMarket} />
        </div>
        <div className="col-span-3 row-span-3">
          <ModelBreakdownPanel market={selectedMarket} />
        </div>
        <div className="col-span-5 row-span-3">
          <NewsFeedPanel news={NEWS_FEED} />
        </div>
        <div className="col-span-5 row-span-3">
          <GreeksPanel market={selectedMarket} />
        </div>
      </div>
    );
  };

  return (
    <div className="h-screen flex flex-col">
      <div className="h-7 bg-[#080808] border-b border-gray-800 flex items-center justify-between px-3 flex-shrink-0">
        <div className="flex items-center gap-4">
          <span className="text-orange-500 font-bold text-sm">
            LEET<span className="text-white ml-1">QUANTUM</span>
            <span className="text-gray-400 ml-1">TERMINAL</span>
            <span className="text-gray-600 text-xs ml-1">PRO</span>
          </span>
          <div className="flex">
            {["analysis", "portfolio", "lab", "scan", "bets"].map((ws) => (
              <button
                key={ws}
                onClick={() => setWorkspace(ws)}
                className={`workspace-tab ${workspace === ws ? "active" : ""}`}
              >
                {ws}
              </button>
            ))}
          </div>
          <div className="flex border-l border-gray-800 pl-3 ml-2">
            <button
              onClick={() => setPlatformFilter("all")}
              className={`workspace-tab ${platformFilter === "all" ? "active" : ""}`}
            >
              ALL
            </button>
            <button
              onClick={() => setPlatformFilter("polymarket")}
              className={`workspace-tab ${platformFilter === "polymarket" ? "active" : ""}`}
            >
              POLY
            </button>
            <button
              onClick={() => setPlatformFilter("kalshi")}
              className={`workspace-tab ${platformFilter === "kalshi" ? "active" : ""}`}
            >
              KALSHI
            </button>
          </div>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <span className="text-gray-600">Polymarket • Kalshi</span>
          <span className="mono text-orange-500">{time.toLocaleTimeString()}</span>
        </div>
      </div>

      <div className="ticker-tape h-5 flex items-center text-xs mono flex-shrink-0">
        <div className="ticker-content">{tickerItems}{tickerItems}</div>
      </div>

      <div className="h-7 bg-[#080808] border-b border-gray-800 flex items-center px-2 gap-2 flex-shrink-0">
        <span className="text-orange-500 text-xs">❯</span>
        <input
          type="text"
          value={command}
          onChange={(e) => setCommand(e.target.value)}
          onKeyDown={handleCommand}
          placeholder="Enter command or ticker (BTC150K, FEDQ1, GPT5, SCAN, PORT, LAB, BETS)..."
          className="cmd-input flex-1 px-2 py-1 text-xs"
        />
        <div className="flex gap-1">
          <button className="btn text-xs">HELP</button>
          <button className="btn text-xs">⚙</button>
        </div>
      </div>

      <div className="flex-1 min-h-0 p-1.5">
        <div className="h-full flex flex-col gap-1.5">
          <div className="flex-1 min-h-0 flex gap-1.5">
            <div className="h-full min-w-[140px]" style={{ flex: `0 0 ${leftWidth}px` }}>
              <WatchlistPanel
                markets={filteredMarkets}
                selectedId={selectedMarket?.id}
                onSelect={setSelectedMarket}
              />
            </div>
            <div className="split-handle-x" onMouseDown={(e) => startDrag("left", e)} />
            <div className="flex-1 min-w-0 h-full">
              {renderRightGrid()}
            </div>
          </div>
          <div className="split-handle-y" onMouseDown={(e) => startDrag("detail", e)} />
          <div className="min-h-[80px]" style={{ flex: `0 0 ${detailHeight}px` }}>
            <MarketDetailDock market={selectedMarket} show={true} onToggle={() => {}} />
          </div>
        </div>
      </div>

      <div className="h-5 bg-[#080808] border-t border-gray-800 flex items-center justify-between px-3 text-xs flex-shrink-0">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
            <span className="text-gray-600">Connected</span>
          </span>
          <span className="text-gray-600">Markets: {watchlist.length}</span>
          <span className="text-gray-600">
            Signals: {watchlist.filter((m) => Math.abs(m.model_prob - m.market_prob) > 0.03).length}
          </span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-yellow-500">⚠ Analysis Only - No Execution</span>
          <span className="text-gray-600">v2.0.0</span>
        </div>
      </div>
    </div>
  );
};

export default Terminal;

