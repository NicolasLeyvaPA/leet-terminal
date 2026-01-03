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

// Market limit options
const MARKET_LIMITS = [10, 25, 50, 100];
const REFRESH_INTERVAL = 15000; // 15 seconds

const Terminal = () => {
  const { watchlist } = useWatchlist();
  const [markets, setMarkets] = useState([]);
  const [loadingMarkets, setLoadingMarkets] = useState(true);
  const [marketLimit, setMarketLimit] = useState(25); // Default 25 markets
  const [platformFilter, setPlatformFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [selectedMarket, setSelectedMarket] = useState(null);
  const [command, setCommand] = useState("");
  const [workspace, setWorkspace] = useState("analysis");
  const [time, setTime] = useState(new Date());
  const [leftWidth, setLeftWidth] = useState(300);
  const [detailHeight, setDetailHeight] = useState(220);
  const [analyticsWidth, setAnalyticsWidth] = useState(420);
  const [loadingUrl, setLoadingUrl] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [lastRefresh, setLastRefresh] = useState(null);
  const dragStateRef = useRef({ type: null, startX: 0, startY: 0, startVal: 0 });

  // Load markets from Polymarket API
  const loadMarkets = useCallback(async (limit = marketLimit, isManual = false) => {
    try {
      if (isManual) setLoadingMarkets(true);
      setStatusMessage("Syncing...");
      const data = await PolymarketAPI.fetchOpenEvents(limit);

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
      setLastRefresh(new Date());
      setStatusMessage(`${enrichedMarkets.length} markets`);
      setTimeout(() => setStatusMessage(""), 2000);
    } catch (error) {
      console.error('Failed to load markets:', error);
      setStatusMessage("Sync failed");
    } finally {
      setLoadingMarkets(false);
    }
  }, [marketLimit, selectedMarket]);

  // Initial load and refresh interval
  useEffect(() => {
    loadMarkets(marketLimit, true);
    const interval = setInterval(() => loadMarkets(marketLimit, false), REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [marketLimit]);

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Handle market limit change
  const handleLimitChange = (newLimit) => {
    setMarketLimit(newLimit);
    loadMarkets(newLimit, true);
  };

  // Handle loading market from URL
  const loadMarketFromUrl = async (url) => {
    if (!url.trim()) return;

    try {
      setLoadingUrl(true);
      setStatusMessage("Loading...");

      const market = await PolymarketAPI.fetchEventBySlug(url);

      const enrichedMarket = {
        ...market,
        price_history: generatePriceHistory(market.market_prob, 90),
        orderbook: generateOrderbook(market.market_prob),
      };

      setMarkets(prev => {
        const exists = prev.some(m => m.id === enrichedMarket.id);
        if (exists) {
          return prev.map(m => m.id === enrichedMarket.id ? enrichedMarket : m);
        }
        return [enrichedMarket, ...prev];
      });

      setSelectedMarket(enrichedMarket);
      setStatusMessage(`Loaded: ${market.ticker}`);
      setTimeout(() => setStatusMessage(""), 2000);
    } catch (error) {
      console.error('Failed to load market from URL:', error);
      setStatusMessage("Failed - check URL");
      setTimeout(() => setStatusMessage(""), 3000);
    } finally {
      setLoadingUrl(false);
    }
  };

  const handleCommand = (e) => {
    if (e.key === "Enter" && command) {
      const cmd = command.trim();

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
        loadMarkets(marketLimit, true);
      }
      setCommand("");
    }
  };

  // Get unique categories from markets
  const categories = useMemo(() => {
    const cats = new Set(markets.map(m => m.category || 'Other'));
    return ['all', ...Array.from(cats).sort()];
  }, [markets]);

  // Filter and group markets
  const { filteredMarkets, groupedMarkets } = useMemo(() => {
    const allMarkets = [...markets, ...watchlist];
    const uniqueMarkets = Array.from(
      new Map(allMarkets.map((m) => [m.id, m])).values()
    );

    let filtered = uniqueMarkets;
    if (platformFilter !== "all") {
      filtered = filtered.filter(m => m.platform?.toLowerCase() === platformFilter);
    }
    if (categoryFilter !== "all") {
      filtered = filtered.filter(m => m.category === categoryFilter);
    }

    // Group by category
    const grouped = filtered.reduce((acc, market) => {
      const cat = market.category || 'Other';
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(market);
      return acc;
    }, {});

    // Sort markets within each category by edge
    Object.keys(grouped).forEach(cat => {
      grouped[cat].sort((a, b) => {
        const edgeA = Math.abs((a.model_prob || 0) - (a.market_prob || 0));
        const edgeB = Math.abs((b.model_prob || 0) - (b.market_prob || 0));
        return edgeB - edgeA;
      });
    });

    return { filteredMarkets: filtered, groupedMarkets: grouped };
  }, [markets, watchlist, platformFilter, categoryFilter]);

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
    return markets.slice(0, 20).map((m) => {
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

      {/* Command Bar with Controls */}
      <div className="h-8 bg-[#080808] border-b border-gray-800 flex items-center px-2 gap-2 flex-shrink-0">
        <span className="text-orange-500 text-xs font-bold">GO</span>
        <input
          type="text"
          value={command}
          onChange={(e) => setCommand(e.target.value)}
          onKeyDown={handleCommand}
          placeholder="Paste Polymarket URL or enter ticker..."
          className="flex-1 px-2 py-1 text-xs bg-transparent border-none outline-none text-gray-300 placeholder-gray-600"
        />

        {/* Market Limit Selector */}
        <div className="flex items-center gap-1 border-l border-gray-700 pl-2">
          <span className="text-[10px] text-gray-500">LIMIT:</span>
          {MARKET_LIMITS.map(limit => (
            <button
              key={limit}
              onClick={() => handleLimitChange(limit)}
              className={`text-[10px] px-1.5 py-0.5 rounded transition-all ${
                marketLimit === limit
                  ? 'bg-orange-500 text-black font-bold'
                  : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              {limit}
            </button>
          ))}
        </div>

        {/* Category Filter */}
        <div className="flex items-center gap-1 border-l border-gray-700 pl-2">
          <span className="text-[10px] text-gray-500">CAT:</span>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="text-[10px] bg-transparent text-gray-400 border border-gray-700 rounded px-1 py-0.5 outline-none"
          >
            {categories.map(cat => (
              <option key={cat} value={cat} className="bg-gray-900">
                {cat === 'all' ? 'ALL' : cat.toUpperCase()}
              </option>
            ))}
          </select>
        </div>

        <div className="h-4 w-px bg-gray-700" />
        <div className="flex gap-1">
          <button
            onClick={() => command && loadMarketFromUrl(command)}
            disabled={loadingUrl || !command}
            className={`btn text-[10px] px-3 py-1 ${loadingUrl ? 'opacity-50' : ''}`}
          >
            {loadingUrl ? '...' : 'ANALYZE'}
          </button>
          <button
            onClick={() => loadMarkets(marketLimit, true)}
            disabled={loadingMarkets}
            className={`btn text-[10px] px-2 py-1 ${loadingMarkets ? 'opacity-50' : ''}`}
            title="Refresh markets (auto every 15s)"
          >
            SYNC
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
                groupedMarkets={groupedMarkets}
                selectedId={selectedMarket?.id}
                onSelect={setSelectedMarket}
                categoryFilter={categoryFilter}
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
            Markets: <span className="text-orange-400 font-medium">{filteredMarkets.length}</span>
            {categoryFilter !== 'all' && <span className="text-gray-500">/{markets.length}</span>}
          </span>
          <span className="text-gray-600">
            Signals: <span className="text-green-400 font-medium">
              {filteredMarkets.filter((m) => Math.abs(m.model_prob - m.market_prob) > 0.03).length}
            </span>
          </span>
          <span className="text-gray-600">
            Refresh: <span className="text-gray-500">15s</span>
          </span>
          {selectedMarket && (
            <span className="text-gray-600">
              <span className="text-orange-400">{selectedMarket.ticker}</span>
            </span>
          )}
        </div>
        <div className="flex items-center gap-4">
          <span className="text-orange-500/70 font-medium">LEET QUANTUM TERMINAL</span>
          <span className="text-yellow-500/80">ANALYSIS ONLY</span>
          <span className="text-gray-600">v3.1.0</span>
        </div>
      </div>
    </div>
  );
};

export default Terminal;
