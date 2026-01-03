import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { PORTFOLIO_POSITIONS } from './data/constants';
import { PolymarketAPI } from './services/polymarketAPI';
import { generatePriceHistory, generateOrderbook } from './utils/helpers';
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
  const [loadingMarkets, setLoadingMarkets] = useState(true);
  const [platformFilter, setPlatformFilter] = useState("all");
  const [selectedMarket, setSelectedMarket] = useState(null);
  const [command, setCommand] = useState("");
  const [workspace, setWorkspace] = useState("analysis");
  const [time, setTime] = useState(new Date());
  const [leftWidth, setLeftWidth] = useState(280);
  const [detailHeight, setDetailHeight] = useState(220);
  const [analyticsWidth, setAnalyticsWidth] = useState(420);
  const [urlInput, setUrlInput] = useState("");
  const [loadingUrl, setLoadingUrl] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const dragStateRef = useRef({ type: null, startX: 0, startY: 0, startVal: 0 });

  // Load markets from Polymarket API on mount
  useEffect(() => {
    const loadMarkets = async () => {
      try {
        setLoadingMarkets(true);
        setStatusMessage("Connecting to Polymarket...");
        const data = await PolymarketAPI.fetchOpenEvents(30);

        // Add price history and orderbook to each market
        const enrichedMarkets = data.map(market => ({
          ...market,
          price_history: generatePriceHistory(market.market_prob, 90),
          orderbook: generateOrderbook(market.market_prob),
        }));

        setMarkets(enrichedMarkets);
        if (enrichedMarkets.length > 0 && !selectedMarket) {
          setSelectedMarket(enrichedMarkets[0]);
        }
        setStatusMessage(`Loaded ${enrichedMarkets.length} live markets`);
        setTimeout(() => setStatusMessage(""), 3000);
      } catch (error) {
        console.error('Failed to load markets:', error);
        setStatusMessage("Failed to load markets - check connection");
      } finally {
        setLoadingMarkets(false);
      }
    };

    loadMarkets();
    // Refresh markets every 60 seconds
    const interval = setInterval(loadMarkets, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Handle loading market from URL
  const loadMarketFromUrl = async (url) => {
    if (!url.trim()) return;

    try {
      setLoadingUrl(true);
      setStatusMessage("Loading market...");

      const market = await PolymarketAPI.fetchEventBySlug(url);

      // Enrich with price history and orderbook
      const enrichedMarket = {
        ...market,
        price_history: generatePriceHistory(market.market_prob, 90),
        orderbook: generateOrderbook(market.market_prob),
      };

      // Add to markets if not already present
      setMarkets(prev => {
        const exists = prev.some(m => m.id === enrichedMarket.id);
        if (exists) {
          return prev.map(m => m.id === enrichedMarket.id ? enrichedMarket : m);
        }
        return [enrichedMarket, ...prev];
      });

      setSelectedMarket(enrichedMarket);
      setUrlInput("");
      setStatusMessage(`Loaded: ${market.ticker}`);
      setTimeout(() => setStatusMessage(""), 3000);
    } catch (error) {
      console.error('Failed to load market from URL:', error);
      setStatusMessage("Failed to load market - check URL");
      setTimeout(() => setStatusMessage(""), 5000);
    } finally {
      setLoadingUrl(false);
    }
  };

  const handleCommand = (e) => {
    if (e.key === "Enter" && command) {
      const cmd = command.trim();

      // Check if it's a Polymarket URL
      if (cmd.includes('polymarket.com')) {
        loadMarketFromUrl(cmd);
        setCommand("");
        return;
      }

      const cmdUpper = cmd.toUpperCase();
      const market = markets.find((m) => m.ticker === cmdUpper);
      if (market) {
        setSelectedMarket(market);
        setCommand("");
        return;
      }
      if (["ANALYSIS", "ANA"].includes(cmdUpper)) setWorkspace("analysis");
      else if (["PORTFOLIO", "PORT"].includes(cmdUpper)) setWorkspace("portfolio");
      else if (["LAB", "QUANTUM"].includes(cmdUpper)) setWorkspace("lab");
      else if (["NEWS", "FEED"].includes(cmdUpper)) setWorkspace("news");
      else if (["BETS", "MARKETS"].includes(cmdUpper)) setWorkspace("bets");
      else if (["REFRESH", "RELOAD"].includes(cmdUpper)) {
        window.location.reload();
      }
      setCommand("");
    }
  };

  const filteredMarkets = useMemo(() => {
    const allMarkets = [...markets, ...watchlist];
    const uniqueMarkets = Array.from(
      new Map(allMarkets.map((m) => [m.id, m])).values()
    );
    let filtered = uniqueMarkets;
    if (platformFilter !== "all") {
      filtered = uniqueMarkets.filter(
        (m) => m.platform?.toLowerCase() === platformFilter
      );
    }
    return filtered;
  }, [markets, watchlist, platformFilter]);

  const handleNewsSelect = (newsItem) => {
    const tickers = newsItem.markets || [];
    const targetMarket = markets.find((m) => tickers.includes(m.ticker));
    if (targetMarket) {
      setPlatformFilter("all");
      setSelectedMarket(targetMarket);
      setWorkspace("analysis");
    }
  };

  const onDragRef = useRef(null);
  const stopDragRef = useRef(null);

  const onDrag = useCallback((event) => {
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
  }, []);

  const stopDrag = useCallback(() => {
    dragStateRef.current = { type: null, startX: 0, startY: 0, startVal: 0 };
    if (onDragRef.current) {
      window.removeEventListener("mousemove", onDragRef.current);
    }
    if (stopDragRef.current) {
      window.removeEventListener("mouseup", stopDragRef.current);
    }
  }, []);

  onDragRef.current = onDrag;
  stopDragRef.current = stopDrag;

  const startDrag = useCallback((type, event) => {
    if (type === "left") {
      dragStateRef.current = { type, startX: event.clientX, startVal: leftWidth };
    } else if (type === "detail") {
      dragStateRef.current = { type, startY: event.clientY, startVal: detailHeight };
    } else if (type === "analytics") {
      dragStateRef.current = { type, startX: event.clientX, startVal: analyticsWidth };
    }
    window.addEventListener("mousemove", onDrag);
    window.addEventListener("mouseup", stopDrag);
  }, [leftWidth, detailHeight, analyticsWidth, onDrag, stopDrag]);

  useEffect(() => {
    const currentOnDrag = onDragRef.current;
    const currentStopDrag = stopDragRef.current;
    return () => {
      if (currentOnDrag) window.removeEventListener("mousemove", currentOnDrag);
      if (currentStopDrag) window.removeEventListener("mouseup", currentStopDrag);
    };
  }, []);

  // Bloomberg-style ticker tape
  const tickerItems = useMemo(() => {
    return markets.slice(0, 15).map((m) => {
      const edge = m.model_prob - m.market_prob;
      const change = m.market_prob - (m.prev_prob || m.market_prob);
      return (
        <span
          key={m.id}
          className="inline-flex items-center gap-1.5 mx-4 text-xs cursor-pointer hover:bg-gray-800/50 px-2 py-0.5 rounded"
          onClick={() => setSelectedMarket(m)}
        >
          <span className="text-orange-500 font-bold">{m.ticker}</span>
          <span className="text-white font-medium">{(m.market_prob * 100).toFixed(1)}¢</span>
          <span className={change > 0 ? "text-green-400" : change < 0 ? "text-red-400" : "text-gray-500"}>
            {change > 0 ? "+" : ""}{(change * 100).toFixed(2)}
          </span>
          {Math.abs(edge) > 0.02 && (
            <span className={`px-1 py-0.5 rounded text-[9px] font-bold ${
              edge > 0 ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"
            }`}>
              {edge > 0 ? "BUY" : "SELL"}
            </span>
          )}
        </span>
      );
    });
  }, [markets]);

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
            <PortfolioPanel positions={PORTFOLIO_POSITIONS} markets={markets} />
          </div>
          <div className="col-span-4 row-span-3">
            <PriceChartPanel market={selectedMarket} />
          </div>
          <div className="col-span-3 row-span-3">
            <GreeksPanel market={selectedMarket} />
          </div>
          <div className="col-span-4 row-span-3">
            <MonteCarloPanel market={selectedMarket} />
          </div>
          <div className="col-span-3 row-span-3">
            <OrderBookPanel market={selectedMarket} />
          </div>
        </div>
      );
    }

    if (workspace === "lab") {
      return (
        <div className="h-full grid grid-cols-10 grid-rows-6 gap-1.5">
          <div className="col-span-3 row-span-6">
            <QuantumLabPanel markets={markets} />
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
          <div className="col-span-3 row-span-3">
            <GreeksPanel market={selectedMarket} />
          </div>
        </div>
      );
    }

    if (workspace === "news") {
      return (
        <div className="h-full">
          <NewsFeedPanel news={[]} onNewsClick={handleNewsSelect} fullPage />
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
        <div className="flex-1 min-h-0 grid grid-cols-3 gap-1.5">
          <ConfluencePanel market={selectedMarket} />
          <MonteCarloPanel market={selectedMarket} />
          <GreeksPanel market={selectedMarket} />
        </div>
      </div>
    );
  };

  return (
    <div className="h-screen flex flex-col bg-[#0a0a0a]">
      {/* Header - Bloomberg style */}
      <div className="h-8 bg-gradient-to-r from-[#0a0a0a] to-[#111] border-b border-orange-500/30 flex items-center justify-between px-3 flex-shrink-0">
        <div className="flex items-center gap-4">
          <div className="flex items-center">
            <span className="text-orange-500 font-black text-lg tracking-tight">LEET</span>
            <span className="text-white font-bold text-lg">QUANTUM</span>
            <span className="text-orange-400 font-bold text-lg ml-1">TERMINAL</span>
            <span className="bg-orange-500 text-black text-[8px] px-1.5 py-0.5 rounded ml-2 font-black">PRO</span>
          </div>
          <div className="h-4 w-px bg-gray-700" />
          <div className="flex">
            {["analysis", "portfolio", "lab", "news", "bets"].map((ws) => (
              <button
                key={ws}
                onClick={() => setWorkspace(ws)}
                className={`px-3 py-1 text-xs font-medium transition-all ${
                  workspace === ws
                    ? "text-orange-400 border-b-2 border-orange-500"
                    : "text-gray-500 hover:text-gray-300"
                }`}
              >
                {ws.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-4 text-xs">
          {statusMessage && (
            <span className="text-orange-400 animate-pulse">{statusMessage}</span>
          )}
          <span className="text-gray-600">POLYMARKET</span>
          <span className="mono text-orange-500 font-medium">{time.toLocaleTimeString()}</span>
          <span className="text-gray-600">{time.toLocaleDateString()}</span>
        </div>
      </div>

      {/* Bloomberg-style Ticker Tape */}
      <div className="ticker-tape h-6 flex items-center text-xs mono flex-shrink-0 bg-[#050505] border-b border-gray-800">
        {loadingMarkets ? (
          <span className="text-gray-500 px-4">Loading live markets...</span>
        ) : markets.length === 0 ? (
          <span className="text-gray-500 px-4">No markets loaded - paste a Polymarket URL below</span>
        ) : (
          <div className="ticker-content">{tickerItems}{tickerItems}</div>
        )}
      </div>

      {/* Command Bar with URL Input */}
      <div className="h-8 bg-[#080808] border-b border-gray-800 flex items-center px-2 gap-2 flex-shrink-0">
        <span className="text-orange-500 text-xs font-bold">GO</span>
        <input
          type="text"
          value={command}
          onChange={(e) => setCommand(e.target.value)}
          onKeyDown={handleCommand}
          placeholder="Paste Polymarket URL or enter ticker (e.g. https://polymarket.com/event/...)..."
          className="cmd-input flex-1 px-2 py-1 text-xs bg-transparent border-none outline-none text-gray-300 placeholder-gray-600"
        />
        <div className="h-4 w-px bg-gray-700" />
        <div className="flex gap-1">
          <button
            onClick={() => command && loadMarketFromUrl(command)}
            disabled={loadingUrl || !command}
            className={`btn text-[10px] px-3 py-1 ${loadingUrl ? 'opacity-50' : ''}`}
          >
            {loadingUrl ? 'LOADING...' : 'ANALYZE'}
          </button>
          <button
            onClick={() => window.location.reload()}
            className="btn text-[10px] px-2 py-1"
            title="Refresh markets"
          >
            REFRESH
          </button>
        </div>
      </div>

      {/* Main Content */}
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

      {/* Footer - Bloomberg style */}
      <div className="h-6 bg-gradient-to-r from-[#080808] to-[#0a0a0a] border-t border-orange-500/20 flex items-center justify-between px-3 text-xs flex-shrink-0">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${loadingMarkets ? 'bg-yellow-500' : 'bg-green-500'} animate-pulse`} />
            <span className="text-gray-500">{loadingMarkets ? 'SYNCING' : 'LIVE'}</span>
          </span>
          <span className="text-gray-600">
            Markets: <span className="text-orange-400 font-medium">{markets.length}</span>
          </span>
          <span className="text-gray-600">
            Signals: <span className="text-green-400 font-medium">
              {markets.filter((m) => Math.abs(m.model_prob - m.market_prob) > 0.03).length}
            </span>
          </span>
          {selectedMarket && (
            <span className="text-gray-600">
              Selected: <span className="text-orange-400">{selectedMarket.ticker}</span>
            </span>
          )}
        </div>
        <div className="flex items-center gap-4">
          <span className="text-orange-500/70 font-medium">LEET QUANTUM TERMINAL</span>
          <span className="text-yellow-500/80">ANALYSIS ONLY - NOT FINANCIAL ADVICE</span>
          <span className="text-gray-600">v3.0.0</span>
        </div>
      </div>
    </div>
  );
};

export default Terminal;
