import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { PORTFOLIO_POSITIONS } from './data/constants';
import { PolymarketAPI } from './services/polymarketAPI';
import { KalshiAPI } from './services/kalshiAPI';
import { fetchAllNews, getMockNews } from './services/newsAPI';
import { generatePriceHistory, generateOrderbook } from './utils/helpers';
import { WatchlistPanel } from './components/panels/WatchlistPanel';
import { MarketOverviewPanel } from './components/panels/MarketOverviewPanel';
import { PriceChartPanel } from './components/panels/PriceChartPanel';
import { OrderBookPanel } from './components/panels/OrderBookPanel';
import { ConfluencePanel } from './components/panels/ConfluencePanel';
import { ModelBreakdownPanel } from './components/panels/ModelBreakdownPanel';
import { ProfitTesterPanel } from './components/panels/ProfitTesterPanel';
import { MonteCarloPanel } from './components/panels/MonteCarloPanel';
import { PortfolioPanel } from './components/panels/PortfolioPanel';
import { QuantumLabPanel } from './components/panels/QuantumLabPanel';
import { NewsFeedPanel } from './components/panels/NewsFeedPanel';
import { BetsMarketPanel } from './components/panels/BetsMarketPanel';
import { ArbitrageOpportunitiesPanel } from './components/panels/ArbitrageOpportunitiesPanel';
import { ArbitrageBotPanel } from './components/panels/ArbitrageBotPanel';
import { PredictionArbPanel } from './components/panels/PredictionArbPanel';
import { LiveTradesPanel } from './components/panels/LiveTradesPanel';
import { FeedPanel } from './components/panels/FeedPanel';
import { LayoutSettings } from './components/LayoutSettings';
// MarketDetailDock removed - content now embedded in analysis grid
import { useWatchlist } from './utils/useWatchlist';
import { useLayout } from './utils/useLayout';
import { getArbitrageBot } from './utils/arbitrageEngine';
import { getPredictionMarketArbitrageBot } from './utils/predictionMarketArbitrage';
import Login from './components/Login';
import Signup from './components/Signup';
import { getSession, signOut, getPhantomAuth, getMetaMaskAuth, verifyAuthentication } from './utils/auth';
import { isSupabaseConfigured } from './utils/supabase';

// Market limit options
const MARKET_LIMITS = [10, 25, 50, 100];
const REFRESH_INTERVAL = 15000; // 15 seconds

const Terminal = ({ onLogout }) => {
  const { watchlist } = useWatchlist();
  const [markets, setMarkets] = useState([]);
  const [kalshiMarkets, setKalshiMarkets] = useState([]);
  const [newsData, setNewsData] = useState([]);
  const [loadingMarkets, setLoadingMarkets] = useState(true);
  const [loadingKalshi, setLoadingKalshi] = useState(false);
  const [loadingNews, setLoadingNews] = useState(false);
  const [marketLimit, setMarketLimit] = useState(25); // Default 25 markets
  const [platformFilter, setPlatformFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [selectedMarket, setSelectedMarket] = useState(null);
  const [command, setCommand] = useState("");
  const [workspace, setWorkspace] = useState("analysis");
  const [time, setTime] = useState(new Date());

  // Layout management for drag-and-drop panels
  const layout = useLayout(workspace);

  // Initialize arbitrage bots
  const arbitrageBot = useMemo(() => getArbitrageBot(), []);
  const predictionArbBot = useMemo(() => getPredictionMarketArbitrageBot(), []);
  const [leftWidth, setLeftWidth] = useState(300);
  const [detailHeight, setDetailHeight] = useState(220);
  const [analyticsWidth, setAnalyticsWidth] = useState(420);
  const [loadingUrl, setLoadingUrl] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  // lastRefresh tracking available but not displayed in current UI
  const [lastRefresh, setLastRefresh] = useState(null);
  const dragStateRef = useRef({ type: null, startX: 0, startY: 0, startVal: 0 });

  // Load markets from Polymarket API
  const loadMarkets = useCallback(async (limit = marketLimit, isManual = false) => {
    try {
      if (isManual) setLoadingMarkets(true);
      setStatusMessage("Syncing Polymarket...");
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

      // Pass market data to the prediction arbitrage bot (with current Kalshi data)
      predictionArbBot.setMarketData(enrichedMarkets, kalshiMarkets);

      setLastRefresh(new Date());
      setStatusMessage(`${enrichedMarkets.length} markets`);
      setTimeout(() => setStatusMessage(""), 2000);
    } catch (error) {
      console.error('Failed to load markets:', error);
      setStatusMessage("Sync failed");
    } finally {
      setLoadingMarkets(false);
    }
  }, [marketLimit, selectedMarket, predictionArbBot, kalshiMarkets]);

  // Load Kalshi markets (separate to avoid blocking Polymarket)
  const loadKalshiMarkets = useCallback(async () => {
    try {
      setLoadingKalshi(true);
      console.log('[Kalshi] Fetching markets...');

      // Use demo API for now (no auth required for public data)
      const kalshiData = await KalshiAPI.fetchAllOpenMarkets(false);

      setKalshiMarkets(kalshiData);
      console.log(`[Kalshi] Loaded ${kalshiData.length} markets`);

      // Update arbitrage bot with new Kalshi data
      predictionArbBot.setMarketData(markets, kalshiData);

      return kalshiData;
    } catch (error) {
      console.warn('[Kalshi] Failed to load markets:', error.message);
      // Don't fail silently - Kalshi may have CORS issues in browser
      return [];
    } finally {
      setLoadingKalshi(false);
    }
  }, [predictionArbBot, markets]);

  // Initial load and refresh interval for Polymarket
  useEffect(() => {
    loadMarkets(marketLimit, true);
    const interval = setInterval(() => loadMarkets(marketLimit, false), REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [marketLimit]);

  // Load Kalshi markets on startup and refresh every 30 seconds
  useEffect(() => {
    // Initial load after a short delay (let Polymarket load first)
    const initialLoad = setTimeout(() => loadKalshiMarkets(), 2000);
    // Refresh Kalshi every 30 seconds (less aggressive due to rate limits)
    const kalshiInterval = setInterval(() => loadKalshiMarkets(), 30000);
    return () => {
      clearTimeout(initialLoad);
      clearInterval(kalshiInterval);
    };
  }, []);

  // Load news from RSS feeds
  const loadNews = useCallback(async () => {
    try {
      setLoadingNews(true);
      console.log('[News] Fetching RSS feeds...');
      const news = await fetchAllNews();

      if (news.length > 0) {
        setNewsData(news);
        console.log(`[News] Loaded ${news.length} articles`);
      } else {
        // Fallback to mock news if RSS fails
        console.log('[News] RSS failed, using mock data');
        setNewsData(getMockNews());
      }
    } catch (error) {
      console.warn('[News] Failed to load:', error.message);
      // Fallback to mock news on error
      setNewsData(getMockNews());
    } finally {
      setLoadingNews(false);
    }
  }, []);

  // Load news on startup and refresh every 5 minutes
  useEffect(() => {
    // Initial load after short delay
    const initialNewsLoad = setTimeout(() => loadNews(), 3000);
    // Refresh news every 5 minutes (300000ms)
    const newsInterval = setInterval(() => loadNews(), 300000);
    return () => {
      clearTimeout(initialNewsLoad);
      clearInterval(newsInterval);
    };
  }, [loadNews]);

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
      else if (["FEED", "TRENDING", "DISCOVER"].includes(cmdUpper)) setWorkspace("feed");
      else if (["PORTFOLIO", "PORT"].includes(cmdUpper)) setWorkspace("portfolio");
      else if (["LAB", "QUANTUM"].includes(cmdUpper)) setWorkspace("lab");
      else if (["NEWS"].includes(cmdUpper)) setWorkspace("news");
      else if (["BETS", "MARKETS"].includes(cmdUpper)) setWorkspace("bets");
      else if (["ARB", "ARBITRAGE", "BOT"].includes(cmdUpper)) setWorkspace("arbitrage");
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
      // Clean 3x3 grid layout with OrderBook integrated
      return (
        <div className="h-full grid grid-cols-3 gap-1.5 overflow-hidden" style={{ gridTemplateRows: '1fr 1fr 0.6fr' }}>
          {/* Row 1 */}
          <div className="col-span-1 min-h-0 overflow-hidden">
            <MarketOverviewPanel market={selectedMarket} />
          </div>
          <div className="col-span-1 min-h-0 overflow-hidden">
            <PriceChartPanel market={selectedMarket} news={newsData} />
          </div>
          <div className="col-span-1 min-h-0 overflow-hidden">
            <ConfluencePanel market={selectedMarket} />
          </div>
          {/* Row 2 */}
          <div className="col-span-1 min-h-0 overflow-hidden">
            <ModelBreakdownPanel market={selectedMarket} />
          </div>
          <div className="col-span-1 min-h-0 overflow-hidden">
            <MonteCarloPanel market={selectedMarket} />
          </div>
          <div className="col-span-1 min-h-0 overflow-hidden">
            <ProfitTesterPanel market={selectedMarket} />
          </div>
          {/* Row 3: OrderBook spanning full width */}
          <div className="col-span-3 min-h-0 overflow-hidden">
            <OrderBookPanel market={selectedMarket} horizontal />
          </div>
        </div>
      );
    }

    if (workspace === "portfolio") {
      return (
        <div className="h-full grid grid-cols-3 grid-rows-2 gap-1.5 overflow-hidden">
          <div className="col-span-1 row-span-2 min-h-0 overflow-hidden">
            <PortfolioPanel positions={PORTFOLIO_POSITIONS} markets={markets} />
          </div>
          <div className="col-span-1 row-span-1 min-h-0 overflow-hidden">
            <PriceChartPanel market={selectedMarket} news={newsData} />
          </div>
          <div className="col-span-1 row-span-1 min-h-0 overflow-hidden">
            <OrderBookPanel market={selectedMarket} />
          </div>
          <div className="col-span-1 row-span-1 min-h-0 overflow-hidden">
            <MonteCarloPanel market={selectedMarket} />
          </div>
          <div className="col-span-1 row-span-1 min-h-0 overflow-hidden">
            <ProfitTesterPanel market={selectedMarket} />
          </div>
        </div>
      );
    }

    if (workspace === "lab") {
      return (
        <div className="h-full grid grid-cols-3 grid-rows-2 gap-1.5 overflow-hidden">
          <div className="col-span-1 row-span-2 min-h-0 overflow-hidden">
            <QuantumLabPanel markets={markets} />
          </div>
          <div className="col-span-1 row-span-1 min-h-0 overflow-hidden">
            <MonteCarloPanel market={selectedMarket} />
          </div>
          <div className="col-span-1 row-span-1 min-h-0 overflow-hidden">
            <ConfluencePanel market={selectedMarket} />
          </div>
          <div className="col-span-1 row-span-1 min-h-0 overflow-hidden">
            <ModelBreakdownPanel market={selectedMarket} />
          </div>
          <div className="col-span-1 row-span-1 min-h-0 overflow-hidden">
            <ProfitTesterPanel market={selectedMarket} />
          </div>
        </div>
      );
    }

    if (workspace === "news") {
      return (
        <div className="h-full overflow-hidden">
          <NewsFeedPanel news={newsData} onNewsClick={handleNewsSelect} fullPage />
        </div>
      );
    }

    if (workspace === "bets") {
      return (
        <div className="h-full overflow-hidden">
          <BetsMarketPanel />
        </div>
      );
    }

    if (workspace === "arbitrage") {
      // CUTTING-EDGE ARBITRAGE TERMINAL
      // Premium trading terminal feel with live execution feed
      return (
        <div className="h-full flex flex-col gap-1.5 overflow-hidden">
          {/* Top bar - Terminal header with key metrics */}
          <div className="flex-shrink-0 bg-gradient-to-r from-gray-900 via-gray-900 to-orange-900/20 rounded border border-orange-500/20 p-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-orange-500 animate-pulse" />
                  <span className="text-orange-400 font-black text-sm tracking-wider">ARB TERMINAL</span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-orange-500/20 text-orange-400 border border-orange-500/30">v2.0</span>
                </div>
                <div className="h-4 w-px bg-gray-700" />
                <div className="flex items-center gap-4 text-[10px]">
                  <div>
                    <span className="text-gray-500">POLY:</span>
                    <span className="text-orange-400 font-bold ml-1">{markets.length}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">MULTI:</span>
                    <span className="text-purple-400 font-bold ml-1">{markets.filter(m => m.isMultiOption).length}</span>
                  </div>
                  <div className="flex items-center">
                    <span className="text-gray-500">KALSHI:</span>
                    {loadingKalshi ? (
                      <span className="text-blue-400/50 font-bold ml-1 animate-pulse">...</span>
                    ) : (
                      <span className={`font-bold ml-1 ${kalshiMarkets.length > 0 ? 'text-blue-400' : 'text-gray-500'}`}>
                        {kalshiMarkets.length || '0'}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className={`flex items-center gap-1.5 px-2 py-1 rounded ${
                  predictionArbBot.isRunning
                    ? 'bg-green-500/20 border border-green-500/30'
                    : 'bg-gray-800 border border-gray-700'
                }`}>
                  <span className={`w-2 h-2 rounded-full ${predictionArbBot.isRunning ? 'bg-green-500 animate-pulse' : 'bg-gray-500'}`} />
                  <span className={`text-[10px] font-bold ${predictionArbBot.isRunning ? 'text-green-400' : 'text-gray-500'}`}>
                    {predictionArbBot.isRunning ? 'RUNNING' : 'STOPPED'}
                  </span>
                </div>
                <div className="text-[10px] text-gray-500 mono">
                  {new Date().toLocaleTimeString()}
                </div>
              </div>
            </div>
          </div>

          {/* Main content area */}
          <div className="flex-1 min-h-0 grid grid-cols-12 gap-1.5">
            {/* Left column - Opportunities & Controls */}
            <div className="col-span-4 flex flex-col gap-1.5 min-h-0">
              <div className="flex-1 min-h-0 overflow-hidden">
                <PredictionArbPanel bot={predictionArbBot} />
              </div>
            </div>

            {/* Center column - LIVE TRADES (BIG) */}
            <div className="col-span-5 min-h-0 overflow-hidden">
              <LiveTradesPanel bot={predictionArbBot} />
            </div>

            {/* Right column - Crypto Arb */}
            <div className="col-span-3 flex flex-col gap-1.5 min-h-0">
              <div className="flex-1 min-h-0 overflow-hidden">
                <ArbitrageBotPanel bot={arbitrageBot} />
              </div>
              <div className="flex-1 min-h-0 overflow-hidden">
                <ArbitrageOpportunitiesPanel bot={arbitrageBot} />
              </div>
            </div>
          </div>
        </div>
      );
    }

    if (workspace === "feed") {
      return (
        <div className="h-full overflow-hidden">
          <FeedPanel
            polymarkets={markets}
            kalshiMarkets={kalshiMarkets}
            onSelectMarket={(market) => {
              setSelectedMarket(market);
              setWorkspace("analysis");
            }}
            onAddToWatchlist={(market) => {
              // TODO: Add to watchlist functionality
              console.log('Add to watchlist:', market.ticker);
            }}
          />
        </div>
      );
    }

    // Default fallback - same as analysis
    return (
      <div className="h-full grid grid-cols-3 grid-rows-2 gap-1.5 overflow-hidden">
        <div className="col-span-1 row-span-1 min-h-0 overflow-hidden">
          <MarketOverviewPanel market={selectedMarket} />
        </div>
        <div className="col-span-1 row-span-1 min-h-0 overflow-hidden">
          <PriceChartPanel market={selectedMarket} news={newsData} />
        </div>
        <div className="col-span-1 row-span-1 min-h-0 overflow-hidden">
          <ConfluencePanel market={selectedMarket} />
        </div>
        <div className="col-span-1 row-span-1 min-h-0 overflow-hidden">
          <ModelBreakdownPanel market={selectedMarket} />
        </div>
        <div className="col-span-1 row-span-1 min-h-0 overflow-hidden">
          <MonteCarloPanel market={selectedMarket} />
        </div>
        <div className="col-span-1 row-span-1 min-h-0 overflow-hidden">
          <ProfitTesterPanel market={selectedMarket} />
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
            {["analysis", "feed", "portfolio", "lab", "arbitrage", "news", "bets"].map((ws) => (
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
        <div className="flex items-center gap-3 text-xs">
          {statusMessage && (
            <span className="text-orange-400 animate-pulse">{statusMessage}</span>
          )}
          <span className="text-gray-600">POLYMARKET</span>
          <span className="mono text-orange-500 font-medium">{time.toLocaleTimeString()}</span>
          <LayoutSettings
            panels={layout.panels}
            panelInfo={layout.panelInfo}
            visibility={layout.visibility}
            toggleVisibility={layout.toggleVisibility}
            collapsed={layout.collapsed}
            toggleCollapsed={layout.toggleCollapsed}
            movePanel={layout.movePanel}
            resetLayout={layout.resetLayout}
          />
          <button
            onClick={onLogout}
            className="btn text-xs hover:bg-red-500/20 hover:text-red-400"
            title="Logout"
          >
            LOGOUT
          </button>
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
        <div className="h-full flex gap-1.5">
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

const App = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showSignup, setShowSignup] = useState(false);
  const [loading, setLoading] = useState(true);
  const [authInfo, setAuthInfo] = useState(null);

  // Check authentication status on mount
  useEffect(() => {
    const checkAuth = async () => {
      // Verify authentication is valid
      const verification = await verifyAuthentication();

      if (verification.isValid) {
        setIsAuthenticated(true);
        setAuthInfo(verification);
        localStorage.setItem('isAuthenticated', 'true');

        // Log auth info for debugging
        console.log('Authentication verified:', {
          type: verification.authType,
          hasJWT: !!verification.user?.jwtToken || !!verification.session?.access_token,
          user: verification.user?.publicKey || verification.user?.address || verification.user?.email,
        });
      } else {
        setIsAuthenticated(false);
        setAuthInfo(null);
        localStorage.removeItem('isAuthenticated');

        // Log why auth failed
        console.warn('Authentication failed:', verification.reason || 'Unknown reason');
      }

      setLoading(false);
    };

    checkAuth();
  }, []);

  // Handle OAuth callback
  useEffect(() => {
    if (isSupabaseConfigured() && window.location.hash) {
      // Check if this is an OAuth callback
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      if (hashParams.get('access_token')) {
        // OAuth callback detected, session will be set by Supabase
        getSession().then(async ({ session, isValid }) => {
          if (session && isValid) {
            // Verify authentication is valid
            const verification = await verifyAuthentication();
            if (verification.isValid) {
              setIsAuthenticated(true);
              setAuthInfo(verification);
              localStorage.setItem('isAuthenticated', 'true');
              console.log('OAuth callback verified:', verification.authType);
              // Clean up URL
              window.history.replaceState({}, document.title, window.location.pathname);
            } else {
              console.error('OAuth callback verification failed:', verification.reason);
              setIsAuthenticated(false);
            }
          }
        });
      }
    }
  }, []);

  const handleLogin = async () => {
    // Verify authentication after login
    const verification = await verifyAuthentication();
    if (verification.isValid) {
      setIsAuthenticated(true);
      setAuthInfo(verification);
      localStorage.setItem('isAuthenticated', 'true');
      console.log('Login verified:', verification.authType);
    } else {
      console.error('Login verification failed:', verification.reason);
      // Don't set authenticated if verification fails
    }
  };

  const handleSignup = async () => {
    // Verify authentication after signup
    const verification = await verifyAuthentication();
    if (verification.isValid) {
      setIsAuthenticated(true);
      setAuthInfo(verification);
      localStorage.setItem('isAuthenticated', 'true');
      console.log('Signup verified:', verification.authType);
    } else {
      console.error('Signup verification failed:', verification.reason);
      // Don't set authenticated if verification fails
    }
  };

  const handleLogout = async () => {
    await signOut();
    setIsAuthenticated(false);
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-[#0a0a0a]">
        <div className="text-orange-500 text-lg">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    if (showSignup) {
      return <Signup onSignup={handleSignup} onSwitchToLogin={() => setShowSignup(false)} />;
    }
    return <Login onLogin={handleLogin} onSwitchToSignup={() => setShowSignup(true)} />;
  }

  return <Terminal onLogout={handleLogout} />;
};

export default App;
