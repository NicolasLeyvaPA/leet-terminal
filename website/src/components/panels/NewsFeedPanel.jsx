import { PanelHeader } from '../PanelHeader';
import { NewsAPI } from '../../services/newsAPI';

export const NewsFeedPanel = ({ news, onNewsClick, fullPage = false, loading = false }) => {
  const isConfigured = NewsAPI.isConfigured();

  // Loading state
  if (loading) {
    return (
      <div className="terminal-panel h-full">
        <PanelHeader
          title="NEWS & MARKET INTELLIGENCE"
          subtitle="Loading..."
        />
        <div className="panel-content flex items-center justify-center h-full">
          <div className="text-center">
            <div className="text-orange-500 animate-pulse text-lg mb-2">Loading News...</div>
            <div className="text-gray-500 text-xs">Fetching from news sources</div>
          </div>
        </div>
      </div>
    );
  }

  // Empty state - show help or API configuration prompt
  if (!news || news.length === 0) {
    if (fullPage) {
      return (
        <div className="terminal-panel h-full">
          <PanelHeader
            title="NEWS & MARKET INTELLIGENCE"
            subtitle="LEET QUANTUM TERMINAL"
          />
          <div className="panel-content p-4">
            <div className="grid grid-cols-3 gap-4 h-full">
              {/* Getting Started */}
              <div className="flex flex-col">
                <div className="bg-orange-500/10 border border-orange-500/30 rounded-t px-4 py-3">
                  <span className="text-orange-500 text-sm font-bold">GETTING STARTED</span>
                </div>
                <div className="flex-1 bg-[#050505] border-x border-b border-gray-800 rounded-b p-4">
                  <div className="space-y-4">
                    <div className="border-b border-gray-800 pb-3">
                      <div className="text-orange-400 text-xs font-medium mb-1">STEP 1</div>
                      <div className="text-gray-300 text-sm">Go to Polymarket.com</div>
                      <div className="text-gray-500 text-xs mt-1">Find any prediction market you want to analyze</div>
                    </div>
                    <div className="border-b border-gray-800 pb-3">
                      <div className="text-orange-400 text-xs font-medium mb-1">STEP 2</div>
                      <div className="text-gray-300 text-sm">Copy the market URL</div>
                      <div className="text-gray-500 text-xs mt-1">e.g. polymarket.com/event/will-...</div>
                    </div>
                    <div className="border-b border-gray-800 pb-3">
                      <div className="text-orange-400 text-xs font-medium mb-1">STEP 3</div>
                      <div className="text-gray-300 text-sm">Paste in the command bar above</div>
                      <div className="text-gray-500 text-xs mt-1">Press Enter or click ANALYZE</div>
                    </div>
                    <div>
                      <div className="text-green-400 text-xs font-medium mb-1">RESULT</div>
                      <div className="text-gray-300 text-sm">Get instant edge analysis</div>
                      <div className="text-gray-500 text-xs mt-1">Kelly sizing, Monte Carlo, Greeks & more</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* News API Setup */}
              <div className="flex flex-col">
                <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-t px-4 py-3">
                  <span className="text-cyan-400 text-sm font-bold">
                    {isConfigured ? 'NEWS FEED ACTIVE' : 'ENABLE NEWS FEED'}
                  </span>
                </div>
                <div className="flex-1 bg-[#050505] border-x border-b border-gray-800 rounded-b p-4">
                  {isConfigured ? (
                    <div className="space-y-3">
                      <div className="text-green-400 text-sm">✓ News API configured</div>
                      <div className="text-gray-400 text-xs">
                        No news articles found matching prediction market topics. 
                        News updates every 5 minutes.
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="text-gray-400 text-xs">
                        Add news API keys to your .env file to enable the news feed:
                      </div>
                      <div className="bg-gray-900 rounded p-3 text-xs font-mono space-y-1">
                        <div className="text-gray-500"># Get free key from newsapi.org</div>
                        <div className="text-cyan-400">VITE_NEWS_API_KEY=your_key</div>
                        <div className="text-gray-500 mt-2"># Or from gnews.io</div>
                        <div className="text-cyan-400">VITE_GNEWS_API_KEY=your_key</div>
                      </div>
                      <div className="text-gray-500 text-xs mt-2">
                        Free tiers: 100 requests/day each
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Live Markets */}
              <div className="flex flex-col">
                <div className="bg-purple-500/10 border border-purple-500/30 rounded-t px-4 py-3">
                  <span className="text-purple-400 text-sm font-bold">LIVE DATA</span>
                </div>
                <div className="flex-1 bg-[#050505] border-x border-b border-gray-800 rounded-b p-4">
                  <div className="space-y-4">
                    <div className="text-gray-400 text-xs">
                      Markets are loaded automatically. Check the BETS tab to browse all open markets.
                    </div>
                    <div className="border border-gray-800 rounded p-3">
                      <div className="text-gray-500 text-xs mb-2">SUPPORTED PLATFORMS</div>
                      <div className="flex flex-wrap gap-2">
                        <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-1 rounded">Polymarket</span>
                        <span className="text-xs bg-purple-500/20 text-purple-400 px-2 py-1 rounded">Kalshi</span>
                        <span className="text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded">Manifold</span>
                      </div>
                    </div>
                    <div className="mt-4 pt-4 border-t border-gray-800">
                      <div className="text-gray-500 text-xs mb-2">FEATURES</div>
                      <div className="flex flex-wrap gap-2">
                        <span className="text-xs bg-gray-800 text-gray-400 px-2 py-1 rounded">Real-time Prices</span>
                        <span className="text-xs bg-gray-800 text-gray-400 px-2 py-1 rounded">WebSocket</span>
                        <span className="text-xs bg-gray-800 text-gray-400 px-2 py-1 rounded">Order Book</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="terminal-panel h-full flex items-center justify-center text-gray-600 text-xs">
        <div className="text-center p-4">
          <div className="text-orange-500 mb-2 font-bold">NO NEWS DATA</div>
          <div className="text-gray-500">
            {isConfigured ? 'No matching articles found' : 'Configure NEWS_API_KEY in .env'}
          </div>
        </div>
      </div>
    );
  }

  // Group news by sentiment for full page view
  const positiveNews = news.filter(item => item.sentiment === 'bullish');
  const negativeNews = news.filter(item => item.sentiment === 'bearish');
  const neutralNews = news.filter(item => item.sentiment === 'neutral' || !item.sentiment);

  // Format time ago
  const formatTimeAgo = (timestamp) => {
    if (!timestamp) return '';
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'just now';
  };

  const NewsItem = ({ item }) => (
    <div
      className={`news-item px-3 py-2.5 border-b border-gray-900 cursor-pointer hover:bg-gray-900/70 transition-colors ${
        item.sentiment === 'bullish'
          ? "border-l-2 border-l-green-500/50"
          : item.sentiment === 'bearish'
          ? "border-l-2 border-l-red-500/50"
          : "border-l-2 border-l-gray-700"
      }`}
      onClick={() => {
        if (item.url) {
          window.open(item.url, '_blank');
        }
        if (onNewsClick) onNewsClick(item);
      }}
    >
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs text-orange-500 font-medium">
          {item.source}
        </span>
        <span className="text-xs text-gray-600">
          {formatTimeAgo(item.timestamp)}
        </span>
      </div>
      <div className="text-sm text-gray-300 leading-snug mb-2 line-clamp-2">
        {item.title}
      </div>
      {item.description && (
        <div className="text-xs text-gray-500 mb-2 line-clamp-1">
          {item.description}
        </div>
      )}
      <div className="flex items-center gap-3">
        <span
          className={`text-xs font-medium px-1.5 py-0.5 rounded ${
            item.sentiment === 'bullish' 
              ? "bg-green-500/20 text-green-400" 
              : item.sentiment === 'bearish' 
              ? "bg-red-500/20 text-red-400" 
              : "bg-gray-700 text-gray-400"
          }`}
        >
          {item.sentiment || 'neutral'}
        </span>
        {item.category && (
          <span className="text-xs text-gray-500 bg-gray-800 px-1.5 py-0.5 rounded">
            {item.category}
          </span>
        )}
        {item.markets?.length > 0 && (
          <div className="flex gap-1.5 flex-wrap">
            {item.markets.slice(0, 3).map((t) => (
              <span
                key={t}
                className="text-xs text-orange-400 bg-orange-500/10 px-1.5 py-0.5 rounded border border-orange-500/20"
              >
                {t}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  if (fullPage) {
    return (
      <div className="terminal-panel h-full">
        <PanelHeader
          title="NEWS & SOCIAL FEED"
          subtitle={`${news.length} articles • LEET TERMINAL`}
        />
        <div className="panel-content">
          <div className="grid grid-cols-3 gap-1.5 h-full p-1.5">
            {/* Bullish Column */}
            <div className="flex flex-col h-full overflow-hidden">
              <div className="bg-green-500/10 border border-green-500/20 rounded-t px-3 py-2 flex items-center gap-2">
                <span className="text-green-500 text-sm font-bold">BULLISH</span>
                <span className="text-green-500/60 text-xs">({positiveNews.length})</span>
              </div>
              <div className="flex-1 overflow-y-auto bg-[#050505] border-x border-b border-gray-800 rounded-b">
                {positiveNews.length > 0 ? (
                  positiveNews.map((item) => <NewsItem key={item.id} item={item} />)
                ) : (
                  <div className="p-4 text-center text-gray-600 text-xs">No bullish news</div>
                )}
              </div>
            </div>

            {/* Neutral Column */}
            <div className="flex flex-col h-full overflow-hidden">
              <div className="bg-gray-500/10 border border-gray-500/20 rounded-t px-3 py-2 flex items-center gap-2">
                <span className="text-gray-400 text-sm font-bold">NEUTRAL</span>
                <span className="text-gray-500 text-xs">({neutralNews.length})</span>
              </div>
              <div className="flex-1 overflow-y-auto bg-[#050505] border-x border-b border-gray-800 rounded-b">
                {neutralNews.length > 0 ? (
                  neutralNews.map((item) => <NewsItem key={item.id} item={item} />)
                ) : (
                  <div className="p-4 text-center text-gray-600 text-xs">No neutral news</div>
                )}
              </div>
            </div>

            {/* Bearish Column */}
            <div className="flex flex-col h-full overflow-hidden">
              <div className="bg-red-500/10 border border-red-500/20 rounded-t px-3 py-2 flex items-center gap-2">
                <span className="text-red-500 text-sm font-bold">BEARISH</span>
                <span className="text-red-500/60 text-xs">({negativeNews.length})</span>
              </div>
              <div className="flex-1 overflow-y-auto bg-[#050505] border-x border-b border-gray-800 rounded-b">
                {negativeNews.length > 0 ? (
                  negativeNews.map((item) => <NewsItem key={item.id} item={item} />)
                ) : (
                  <div className="p-4 text-center text-gray-600 text-xs">No bearish news</div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Compact view for sidebar usage
  return (
    <div className="terminal-panel h-full">
      <PanelHeader title="NEWS & SOCIAL" subtitle={`${news.length} articles`} />
      <div className="panel-content overflow-y-auto">
        {news.slice(0, 10).map((item) => (
          <NewsItem key={item.id} item={item} />
        ))}
      </div>
    </div>
  );
};
