import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { PORTFOLIO_POSITIONS } from './data/constants';
import { PolymarketAPI } from './services/polymarketAPI';
import { KalshiAPI } from './services/kalshiAPI';
import { NewsAPI } from './services/newsAPI';
import { polymarketWS } from './services/polymarketWebSocket';
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
import { ResearchPanel } from './components/panels/ResearchPanel';
import { AlertsPanel } from './components/panels/AlertsPanel';
import { MarketDetailDock } from './components/MarketDetailDock';
import { alertsEngine } from './utils/alertsEngine';
import { useWatchlist } from './utils/useWatchlist';
import Login from './components/Login';
import Signup from './components/Signup';
import ErrorBoundary, { PanelErrorBoundary } from './components/ErrorBoundary';
import { getSession, signOut, verifyAuthentication } from './utils/auth';
import { isSupabaseConfigured } from './utils/supabase';
import logger from './utils/logger';

// Layout constants (moved from magic numbers)
const MIN_LEFT_PANEL_WIDTH = 140;
const MIN_DETAIL_HEIGHT = 80;
const MIN_ANALYTICS_WIDTH = 260;
const MAX_WIDTH_OFFSET = 260;
const MAX_HEIGHT_OFFSET = 160;

// Market limit options
const MARKET_LIMITS = [10, 25, 50, 100];
const REFRESH_INTERVAL = 15000; // 15 seconds

const Terminal = ({ onLogout, authInfo }) => {
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
  const [wsStatus, setWsStatus] = useState('disconnected');
  const [news, setNews] = useState([]);
  const [newsLoading, setNewsLoading] = useState(false);
  const dragStateRef = useRef({ type: null, startX: 0, startY: 0, startVal: 0 });
  const wsSubscriptions = useRef(new Map());

  // WebSocket status listener
  useEffect(() => {
    const unsubscribe = polymarketWS.onStatusChange(setWsStatus);
    return () => unsubscribe();
  }, []);

  // Subscribe to WebSocket for selected Polymarket market
  useEffect(() => {
    if (!selectedMarket) return;
    
    // Only subscribe to Polymarket markets
    if (selectedMarket.platform !== 'Polymarket' || !selectedMarket.clobTokenIds?.[0]) return;
    
    const tokenId = selectedMarket.clobTokenIds[0];
    
    // Clean up previous subscription for this market
    if (wsSubscriptions.current.has(selectedMarket.id)) {
      wsSubscriptions.current.get(selectedMarket.id)();
      wsSubscriptions.current.delete(selectedMarket.id);
    }
    
    // Subscribe to real-time updates
    const unsubscribe = polymarketWS.subscribe(tokenId, (data) => {
      if (data.type === 'price' || data.type === 'trade') {
        const price = parseFloat(data.price);
        if (isNaN(price) || price < 0 || price > 1) return; // Validate price
        // Update market price in real-time
        setMarkets(prev => prev.map(m =>
          m.id === selectedMarket.id
            ? { ...m, market_prob: price, _wsUpdated: Date.now() }
            : m
        ));
        setSelectedMarket(prev =>
          prev?.id === selectedMarket.id
            ? { ...prev, market_prob: price, _wsUpdated: Date.now() }
            : prev
        );
      }
    });
    
    wsSubscriptions.current.set(selectedMarket.id, unsubscribe);
    
    return () => {
      if (wsSubscriptions.current.has(selectedMarket.id)) {
        wsSubscriptions.current.get(selectedMarket.id)();
        wsSubscriptions.current.delete(selectedMarket.id);
      }
    };
  }, [selectedMarket?.id, selectedMarket?.clobTokenIds]);

  // Load news on mount and periodically
  useEffect(() => {
    const loadNews = async () => {
      if (!NewsAPI.isConfigured()) return;
      
      setNewsLoading(true);
      try {
        const articles = await NewsAPI.fetchMarketNews({ limit: 30 });
        const matchedNews = NewsAPI.matchNewsToMarkets(articles, markets);
        setNews(matchedNews);
      } catch (error) {
        logger.warn('Failed to load news:', error.message);
      } finally {
        setNewsLoading(false);
      }
    };

    loadNews();
    // Refresh news every 5 minutes
    const interval = setInterval(loadNews, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [markets.length]); // Re-run when market count changes

  // Load markets from Polymarket and Kalshi APIs with REAL data
  const loadMarkets = useCallback(async (limit = marketLimit, isManual = false) => {
    try {
      if (isManual) setLoadingMarkets(true);
      setStatusMessage("Syncing...");
      
      // Fetch from Polymarket and Kalshi in parallel
      const [polymarketData, kalshiData] = await Promise.all([
        PolymarketAPI.fetchOpenEvents(Math.ceil(limit * 0.7)), // 70% from Polymarket
        KalshiAPI.fetchOpenEvents(Math.ceil(limit * 0.3)).catch(err => {
          logger.warn('Kalshi fetch failed:', err.message);
          return []; // Don't fail if Kalshi fails
        }),
      ]);

      // Combine markets from both platforms
      const allMarkets = [...polymarketData, ...kalshiData];

      // Markets start without price_history/orderbook - will be fetched on selection
      // This avoids overwhelming the API with requests for all markets
      const enrichedMarkets = allMarkets.map(market => ({
        ...market,
        price_history: null, // Fetched on demand
        orderbook: null, // Fetched on demand
        dataStatus: 'pending', // Track loading state
      }));

      setMarkets(enrichedMarkets);
      // FIX: Use functional update to avoid stale closure
      setSelectedMarket(prev => {
        if (prev) return prev; // Keep existing selection
        return enrichedMarkets.length > 0 ? enrichedMarkets[0] : null;
      });
      setLastRefresh(new Date());
      
      // Check alerts against updated markets
      alertsEngine.checkAlerts(enrichedMarkets);
      
      // Show platform breakdown in status
      const polyCount = polymarketData.length;
      const kalshiCount = kalshiData.length;
      setStatusMessage(`${enrichedMarkets.length} mkts (PM:${polyCount} KA:${kalshiCount})`);
      setTimeout(() => setStatusMessage(""), 3000);
    } catch (error) {
      logger.error('Failed to load markets:', error);
      setStatusMessage("Sync failed");
    } finally {
      setLoadingMarkets(false);
    }
  }, [marketLimit]); // FIX: Removed selectedMarket from deps to prevent stale closure

  // Fetch real price history and orderbook when a market is selected
  const fetchMarketData = useCallback(async (market) => {
    if (!market || market.dataStatus === 'loaded' || market.dataStatus === 'loading') return;

    // Mark as loading
    setMarkets(prev => prev.map(m => 
      m.id === market.id ? { ...m, dataStatus: 'loading' } : m
    ));

    try {
      let priceHistory, orderbook;
      
      // Use different APIs based on platform
      const isKalshi = market.platform === 'Kalshi' || market._source === 'kalshi';
      
      if (isKalshi) {
        // Fetch from Kalshi API
        [priceHistory, orderbook] = await Promise.all([
          market.marketId ? KalshiAPI.fetchPriceHistory(market.marketId, 90) : null,
          market.marketId ? KalshiAPI.fetchOrderbook(market.marketId) : null,
        ]);
      } else {
        // Fetch from Polymarket CLOB API
        [priceHistory, orderbook] = await Promise.all([
          market.marketId ? PolymarketAPI.fetchPriceHistory(market.marketId, 90) : null,
          market.clobTokenIds?.[0] ? PolymarketAPI.fetchOrderbook(market.clobTokenIds[0]) : null,
        ]);
      }

      // Calculate prev_prob from price history if available
      let prevProb = null;
      if (priceHistory && priceHistory.length > 1) {
        // Get price from ~24h ago
        const dayAgoIndex = Math.max(0, priceHistory.length - 24);
        prevProb = priceHistory[dayAgoIndex]?.price || null;
      }

      // Update market with real data
      setMarkets(prev => prev.map(m => 
        m.id === market.id 
          ? { 
              ...m, 
              price_history: priceHistory,
              orderbook: orderbook,
              prev_prob: prevProb,
              dataStatus: 'loaded',
              dataSource: priceHistory ? 'api' : 'fallback',
            } 
          : m
      ));

      // Update selected market if it's the same one
      setSelectedMarket(prev => 
        prev?.id === market.id 
          ? { 
              ...prev, 
              price_history: priceHistory,
              orderbook: orderbook,
              prev_prob: prevProb,
              dataStatus: 'loaded',
              dataSource: priceHistory ? 'api' : 'fallback',
            }
          : prev
      );
    } catch (error) {
      logger.error('Failed to fetch market data:', error);
      setMarkets(prev => prev.map(m => 
        m.id === market.id ? { ...m, dataStatus: 'error' } : m
      ));
    }
  }, []);

  // Fetch data when market is selected
  useEffect(() => {
    if (selectedMarket && selectedMarket.dataStatus === 'pending') {
      fetchMarketData(selectedMarket);
    }
  }, [selectedMarket, fetchMarketData]);

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

  // Handle market limit change — just update state; useEffect handles the refetch
  const handleLimitChange = (newLimit) => {
    setMarketLimit(newLimit);
  };

  // Handle loading market from URL (supports both Polymarket and Kalshi)
  const loadMarketFromUrl = async (url) => {
    if (!url.trim()) return;

    try {
      setLoadingUrl(true);
      setStatusMessage("Loading...");

      let market;
      const isKalshi = KalshiAPI.isKalshiUrl(url);
      
      if (isKalshi) {
        // Load from Kalshi
        market = await KalshiAPI.fetchEventByTicker(url);
        setStatusMessage(`Kalshi: ${market.ticker}`);
      } else {
        // Load from Polymarket
        market = await PolymarketAPI.fetchEventBySlug(url);
        setStatusMessage(`Polymarket: ${market.ticker}`);
      }

      // Market starts with pending data status - will be fetched when selected
      const enrichedMarket = {
        ...market,
        price_history: null,
        orderbook: null,
        dataStatus: 'pending',
      };

      setMarkets(prev => {
        const exists = prev.some(m => m.id === enrichedMarket.id);
        if (exists) {
          return prev.map(m => m.id === enrichedMarket.id ? enrichedMarket : m);
        }
        return [enrichedMarket, ...prev];
      });

      setSelectedMarket(enrichedMarket);
      // This will trigger fetchMarketData via useEffect
      setTimeout(() => setStatusMessage(""), 2000);
    } catch (error) {
      logger.error('Failed to load market from URL:', error);
      setStatusMessage("Failed - check URL/ticker");
      setTimeout(() => setStatusMessage(""), 3000);
    } finally {
      setLoadingUrl(false);
    }
  };

  const handleCommand = (e) => {
    if (e.key === "Enter" && command) {
      const cmd = command.trim();

      // Handle Polymarket or Kalshi URLs
      if (cmd.includes('polymarket.com') || cmd.includes('kalshi.com')) {
        loadMarketFromUrl(cmd);
        setCommand("");
        return;
      }
      
      // Handle Kalshi tickers (start with KX)
      if (cmd.toUpperCase().startsWith('KX')) {
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

  // FIX: Stable refs for drag handlers to prevent memory leaks
  const onDragRef = useRef(null);
  const stopDragRef = useRef(null);
  const isDraggingRef = useRef(false);

  // FIX: Use refs to access current state values without recreating handlers
  const leftWidthRef = useRef(leftWidth);
  const detailHeightRef = useRef(detailHeight);
  const analyticsWidthRef = useRef(analyticsWidth);
  
  // Keep refs in sync with state
  useEffect(() => {
    leftWidthRef.current = leftWidth;
    detailHeightRef.current = detailHeight;
    analyticsWidthRef.current = analyticsWidth;
  }, [leftWidth, detailHeight, analyticsWidth]);

  // FIX: Create stable handlers that don't change on re-render
  useEffect(() => {
    const handleDrag = (event) => {
      const state = dragStateRef.current;
      if (!state.type) return;

      if (state.type === "left") {
        const dx = event.clientX - state.startX;
        let next = state.startVal + dx;
        const maxWidth = window.innerWidth - 260;
        const MIN_LEFT_WIDTH = 140;
        next = Math.max(MIN_LEFT_WIDTH, Math.min(maxWidth, next));
        setLeftWidth(next);
      } else if (state.type === "detail") {
        const dy = event.clientY - state.startY;
        let next = state.startVal - dy;
        const maxHeight = window.innerHeight - 160;
        const MIN_DETAIL_HEIGHT = 80;
        next = Math.max(MIN_DETAIL_HEIGHT, Math.min(maxHeight, next));
        setDetailHeight(next);
      } else if (state.type === "analytics") {
        const dx = event.clientX - state.startX;
        let next = state.startVal + dx;
        const container = document.getElementById("analytics-container");
        const containerWidth = container ? container.clientWidth : window.innerWidth;
        const maxWidth = containerWidth - 260;
        const MIN_ANALYTICS_WIDTH = 260;
        next = Math.max(MIN_ANALYTICS_WIDTH, Math.min(maxWidth, next));
        setAnalyticsWidth(next);
      }
    };

    const handleStopDrag = () => {
      if (!isDraggingRef.current) return;
      isDraggingRef.current = false;
      dragStateRef.current = { type: null, startX: 0, startY: 0, startVal: 0 };
      window.removeEventListener("mousemove", handleDrag);
      window.removeEventListener("mouseup", handleStopDrag);
    };

    // Store refs for external access
    onDragRef.current = handleDrag;
    stopDragRef.current = handleStopDrag;

    // Cleanup on unmount
    return () => {
      window.removeEventListener("mousemove", handleDrag);
      window.removeEventListener("mouseup", handleStopDrag);
    };
  }, []); // Empty deps - handlers are stable

  const startDrag = useCallback((type, event) => {
    if (isDraggingRef.current) return; // Prevent multiple drag sessions
    isDraggingRef.current = true;
    
    if (type === "left") {
      dragStateRef.current = { type, startX: event.clientX, startY: 0, startVal: leftWidthRef.current };
    } else if (type === "detail") {
      dragStateRef.current = { type, startX: 0, startY: event.clientY, startVal: detailHeightRef.current };
    } else if (type === "analytics") {
      dragStateRef.current = { type, startX: event.clientX, startY: 0, startVal: analyticsWidthRef.current };
    }
    
    if (onDragRef.current) window.addEventListener("mousemove", onDragRef.current);
    if (stopDragRef.current) window.addEventListener("mouseup", stopDragRef.current);
  }, []); // Empty deps - uses refs

  // Bloomberg-style ticker tape
  const tickerItems = useMemo(() => {
    return markets.slice(0, 20).map((m) => {
      const edge = m.model_prob - m.market_prob;
      const change = m.market_prob - (m.prev_prob || m.market_prob);
      const isKalshi = m.platform === 'Kalshi';
      const platformColor = isKalshi 
        ? 'bg-purple-500/30 text-purple-400' 
        : 'bg-blue-500/30 text-blue-400';
      const platformLetter = isKalshi ? 'K' : 'P';
      return (
        <span
          key={m.id}
          className="inline-flex items-center gap-1.5 mx-4 text-xs cursor-pointer hover:bg-gray-800/50 px-2 py-0.5 rounded"
          onClick={() => setSelectedMarket(m)}
        >
          <span className={`text-[9px] px-1 rounded ${platformColor}`}>
            {platformLetter}
          </span>
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
      // Clean 3x2 grid layout - no overlapping
      return (
        <div className="h-full grid grid-cols-3 grid-rows-2 gap-1.5 overflow-hidden">
          {/* Row 1 */}
          <div className="col-span-1 row-span-1 min-h-0 overflow-hidden">
            <PanelErrorBoundary panelName="Market Overview">
              <MarketOverviewPanel market={selectedMarket} />
            </PanelErrorBoundary>
          </div>
          <div className="col-span-1 row-span-1 min-h-0 overflow-hidden">
            <PanelErrorBoundary panelName="Price Chart">
              <PriceChartPanel market={selectedMarket} />
            </PanelErrorBoundary>
          </div>
          <div className="col-span-1 row-span-1 min-h-0 overflow-hidden">
            <PanelErrorBoundary panelName="Confluence">
              <ConfluencePanel market={selectedMarket} />
            </PanelErrorBoundary>
          </div>
          {/* Row 2 */}
          <div className="col-span-1 row-span-1 min-h-0 overflow-hidden">
            <PanelErrorBoundary panelName="Model Breakdown">
              <ModelBreakdownPanel market={selectedMarket} />
            </PanelErrorBoundary>
          </div>
          <div className="col-span-1 row-span-1 min-h-0 overflow-hidden">
            <PanelErrorBoundary panelName="Monte Carlo">
              <MonteCarloPanel market={selectedMarket} />
            </PanelErrorBoundary>
          </div>
          <div className="col-span-1 row-span-1 min-h-0 overflow-hidden">
            <PanelErrorBoundary panelName="Greeks">
              <GreeksPanel market={selectedMarket} />
            </PanelErrorBoundary>
          </div>
        </div>
      );
    }

    if (workspace === "research") {
      return (
        <div className="h-full grid grid-cols-3 grid-rows-2 gap-1.5 overflow-hidden">
          <div className="col-span-2 row-span-2 min-h-0 overflow-hidden">
            <PanelErrorBoundary panelName="Research">
              <ResearchPanel market={selectedMarket} />
            </PanelErrorBoundary>
          </div>
          <div className="col-span-1 row-span-1 min-h-0 overflow-hidden">
            <PanelErrorBoundary panelName="Market Overview">
              <MarketOverviewPanel market={selectedMarket} />
            </PanelErrorBoundary>
          </div>
          <div className="col-span-1 row-span-1 min-h-0 overflow-hidden">
            <PanelErrorBoundary panelName="Price Chart">
              <PriceChartPanel market={selectedMarket} />
            </PanelErrorBoundary>
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
            <PriceChartPanel market={selectedMarket} />
          </div>
          <div className="col-span-1 row-span-1 min-h-0 overflow-hidden">
            <OrderBookPanel market={selectedMarket} />
          </div>
          <div className="col-span-1 row-span-1 min-h-0 overflow-hidden">
            <MonteCarloPanel market={selectedMarket} />
          </div>
          <div className="col-span-1 row-span-1 min-h-0 overflow-hidden">
            <GreeksPanel market={selectedMarket} />
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
            <GreeksPanel market={selectedMarket} />
          </div>
        </div>
      );
    }

    if (workspace === "news") {
      return (
        <div className="h-full overflow-hidden">
          <NewsFeedPanel news={news} onNewsClick={handleNewsSelect} fullPage loading={newsLoading} />
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

    if (workspace === "alerts") {
      return (
        <div className="h-full grid grid-cols-3 grid-rows-2 gap-1.5 overflow-hidden">
          <div className="col-span-1 row-span-2 min-h-0 overflow-hidden">
            <PanelErrorBoundary panelName="Alerts">
              <AlertsPanel 
                markets={markets} 
                selectedMarket={selectedMarket} 
                onSelectMarket={setSelectedMarket}
              />
            </PanelErrorBoundary>
          </div>
          <div className="col-span-1 row-span-1 min-h-0 overflow-hidden">
            <PanelErrorBoundary panelName="Market Overview">
              <MarketOverviewPanel market={selectedMarket} />
            </PanelErrorBoundary>
          </div>
          <div className="col-span-1 row-span-1 min-h-0 overflow-hidden">
            <PanelErrorBoundary panelName="Price Chart">
              <PriceChartPanel market={selectedMarket} />
            </PanelErrorBoundary>
          </div>
          <div className="col-span-1 row-span-1 min-h-0 overflow-hidden">
            <PanelErrorBoundary panelName="Order Book">
              <OrderBookPanel market={selectedMarket} />
            </PanelErrorBoundary>
          </div>
          <div className="col-span-1 row-span-1 min-h-0 overflow-hidden">
            <PanelErrorBoundary panelName="Confluence">
              <ConfluencePanel market={selectedMarket} />
            </PanelErrorBoundary>
          </div>
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
          <PriceChartPanel market={selectedMarket} />
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
            <span className="text-orange-500 font-black text-xl tracking-tight brand-glow">LEET</span>
            <span className="text-white font-black text-xl tracking-tight ml-0.5">TERMINAL</span>
            <span className="bg-orange-500 text-black text-[8px] px-1.5 py-0.5 rounded ml-2 font-black tracking-wider">PRO</span>
          </div>
          <div className="h-4 w-px bg-gray-700" />
          <div className="flex">
            {["analysis", "research", "portfolio", "lab", "alerts", "news", "bets"].map((ws) => (
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
          <span className="text-gray-600">PM</span>
          <span className="text-gray-700">|</span>
          <span className="text-gray-600">KA</span>
          <span className="mono text-orange-500 font-medium">{time.toLocaleTimeString()}</span>
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
          <span className="text-gray-500 px-4">Loading markets from Polymarket & Kalshi...</span>
        ) : markets.length === 0 ? (
          <span className="text-gray-500 px-4">No markets loaded - paste a Polymarket or Kalshi URL below</span>
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
          placeholder="Paste URL (Polymarket/Kalshi) or ticker..."
          className="flex-1 px-2 py-1 text-xs bg-transparent border-none outline-none text-gray-300 placeholder-gray-600"
        />

        {/* Platform Filter */}
        <div className="flex items-center gap-1 border-l border-gray-700 pl-2">
          <span className="text-[10px] text-gray-500">SRC:</span>
          {['all', 'polymarket', 'kalshi'].map(plat => (
            <button
              key={plat}
              onClick={() => setPlatformFilter(plat)}
              className={`text-[10px] px-1.5 py-0.5 rounded transition-all ${
                platformFilter === plat
                  ? 'bg-orange-500 text-black font-bold'
                  : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              {plat === 'all' ? 'ALL' : plat === 'polymarket' ? 'PM' : 'KA'}
            </button>
          ))}
        </div>

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
          <span className="flex items-center gap-1.5" title="WebSocket real-time feed">
            <span className={`w-2 h-2 rounded-full ${
              wsStatus === 'connected' ? 'bg-cyan-500' : 
              wsStatus === 'connecting' || wsStatus === 'reconnecting' ? 'bg-yellow-500 animate-pulse' : 
              'bg-gray-600'
            }`} />
            <span className="text-gray-500">WS</span>
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
          {selectedMarket && (
            <span className="text-gray-600">
              <span className="text-orange-400">{selectedMarket.ticker}</span>
              {selectedMarket._wsUpdated && (
                <span className="text-cyan-500 ml-1" title="Real-time price">●</span>
              )}
            </span>
          )}
        </div>
        <div className="flex items-center gap-4">
          <span className="text-orange-500 font-bold tracking-wide brand-glow">LEET TERMINAL</span>
          <span className="text-gray-600 mx-1">|</span>
          <span className="text-yellow-500/80">ANALYSIS ONLY</span>
          <span className="text-gray-600">v4.0.0</span>
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
  const authCheckInProgress = useRef(false);

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
        logger.log('Authentication verified:', {
          type: verification.authType,
          hasJWT: !!verification.user?.jwtToken || !!verification.session?.access_token,
          user: verification.user?.publicKey || verification.user?.address || verification.user?.email,
        });
      } else {
        setIsAuthenticated(false);
        setAuthInfo(null);
        localStorage.removeItem('isAuthenticated');

        // Log why auth failed
        logger.warn('Authentication failed:', verification.reason || 'Unknown reason');
      }

      setLoading(false);
    };

    checkAuth();
  }, []);

  // Handle OAuth callback (guarded against double-fire)
  useEffect(() => {
    if (authCheckInProgress.current) return;
    if (isSupabaseConfigured() && window.location.hash) {
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      if (hashParams.get('access_token')) {
        authCheckInProgress.current = true;
        getSession().then(async ({ session, isValid }) => {
          if (session && isValid) {
            const verification = await verifyAuthentication();
            if (verification.isValid) {
              setIsAuthenticated(true);
              setAuthInfo(verification);
              localStorage.setItem('isAuthenticated', 'true');
              logger.log('OAuth callback verified:', verification.authType);
              window.history.replaceState({}, document.title, window.location.pathname);
            } else {
              logger.error('OAuth callback verification failed:', verification.reason);
              setIsAuthenticated(false);
            }
          }
        }).finally(() => {
          authCheckInProgress.current = false;
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
      logger.log('Login verified:', verification.authType);
    } else {
      logger.error('Login verification failed:', verification.reason);
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
      logger.log('Signup verified:', verification.authType);
    } else {
      logger.error('Signup verification failed:', verification.reason);
      // Don't set authenticated if verification fails
    }
  };

  const handleLogout = async () => {
    await signOut();
    setIsAuthenticated(false);
  };

  if (loading) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-[#0a0a0a]">
        <div className="flex items-center mb-4">
          <span className="text-orange-500 font-black text-3xl tracking-tight brand-glow">LEET</span>
          <span className="text-white font-black text-3xl tracking-tight ml-1">TERMINAL</span>
        </div>
        <div className="text-gray-600 text-xs tracking-widest uppercase">Prediction Markets Analytics</div>
        <div className="mt-6 w-32 h-0.5 bg-gray-800 rounded-full overflow-hidden">
          <div className="h-full bg-orange-500 rounded-full brand-load-bar" />
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    if (showSignup) {
      return <Signup onSignup={handleSignup} onSwitchToLogin={() => setShowSignup(false)} />;
    }
    return <Login onLogin={handleLogin} onSwitchToSignup={() => setShowSignup(true)} />;
  }

  return (
    <ErrorBoundary showDetails={import.meta.env.DEV}>
      <Terminal onLogout={handleLogout} authInfo={authInfo} />
    </ErrorBoundary>
  );
};

export default App;
