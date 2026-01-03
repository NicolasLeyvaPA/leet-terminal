import { PanelHeader } from '../PanelHeader';

export const NewsFeedPanel = ({ news, onNewsClick, fullPage = false }) => {
  // Empty state - Bloomberg style information display
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

              {/* Features */}
              <div className="flex flex-col">
                <div className="bg-blue-500/10 border border-blue-500/30 rounded-t px-4 py-3">
                  <span className="text-blue-400 text-sm font-bold">ANALYSIS FEATURES</span>
                </div>
                <div className="flex-1 bg-[#050505] border-x border-b border-gray-800 rounded-b p-4">
                  <div className="space-y-3">
                    <div className="flex items-start gap-2">
                      <span className="text-green-400 text-xs">+</span>
                      <div>
                        <div className="text-gray-300 text-xs font-medium">Edge Detection</div>
                        <div className="text-gray-600 text-xs">Model vs market probability analysis</div>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-green-400 text-xs">+</span>
                      <div>
                        <div className="text-gray-300 text-xs font-medium">Kelly Criterion</div>
                        <div className="text-gray-600 text-xs">Optimal position sizing</div>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-green-400 text-xs">+</span>
                      <div>
                        <div className="text-gray-300 text-xs font-medium">Monte Carlo Simulation</div>
                        <div className="text-gray-600 text-xs">5,000 simulations for risk analysis</div>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-green-400 text-xs">+</span>
                      <div>
                        <div className="text-gray-300 text-xs font-medium">Options Greeks</div>
                        <div className="text-gray-600 text-xs">Delta, Gamma, Theta, Vega</div>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-green-400 text-xs">+</span>
                      <div>
                        <div className="text-gray-300 text-xs font-medium">Confluence Analysis</div>
                        <div className="text-gray-600 text-xs">Multi-factor signal aggregation</div>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-green-400 text-xs">+</span>
                      <div>
                        <div className="text-gray-300 text-xs font-medium">Order Book Analysis</div>
                        <div className="text-gray-600 text-xs">Depth visualization & imbalance</div>
                      </div>
                    </div>
                  </div>
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
                      Markets are loaded automatically from Polymarket API. Check the BETS tab to browse all open markets.
                    </div>
                    <div className="border border-gray-800 rounded p-3">
                      <div className="text-gray-500 text-xs mb-2">EXAMPLE URLS</div>
                      <div className="space-y-2 text-xs font-mono">
                        <div className="text-orange-400 break-all">polymarket.com/event/will-the-us-invade-venezuela-in-2025</div>
                        <div className="text-orange-400 break-all">polymarket.com/event/bitcoin-above-100k</div>
                        <div className="text-orange-400 break-all">polymarket.com/event/presidential-election</div>
                      </div>
                    </div>
                    <div className="mt-4 pt-4 border-t border-gray-800">
                      <div className="text-gray-500 text-xs mb-2">DATA SOURCES</div>
                      <div className="flex flex-wrap gap-2">
                        <span className="text-xs bg-gray-800 text-gray-400 px-2 py-1 rounded">Polymarket API</span>
                        <span className="text-xs bg-gray-800 text-gray-400 px-2 py-1 rounded">Real-time Prices</span>
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
          <div className="text-gray-500">News feed requires external API</div>
        </div>
      </div>
    );
  }

  // Group news by sentiment for full page view
  const positiveNews = news.filter(item => item.sentiment > 0.1);
  const negativeNews = news.filter(item => item.sentiment < -0.1);
  const neutralNews = news.filter(item => item.sentiment >= -0.1 && item.sentiment <= 0.1);

  const NewsItem = ({ item }) => (
    <div
      className={`news-item px-3 py-2.5 border-b border-gray-900 cursor-pointer hover:bg-gray-900/70 transition-colors ${
        item.sentiment > 0.3
          ? "news-positive"
          : item.sentiment < -0.3
          ? "news-negative"
          : "news-neutral"
      }`}
      onClick={() => onNewsClick && onNewsClick(item)}
    >
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs text-orange-500 font-medium">
          {item.source}
        </span>
        <span className="text-xs text-gray-600">
          {item.time}
        </span>
      </div>
      <div className="text-sm text-gray-300 leading-snug mb-2">
        {item.title}
      </div>
      <div className="flex items-center gap-3">
        <span
          className={`text-xs font-medium ${
            item.sentiment > 0 ? "positive" : item.sentiment < 0 ? "negative" : "text-gray-500"
          }`}
        >
          {item.sentiment > 0 ? "+" : item.sentiment < 0 ? "-" : ""}{" "}
          {Math.abs(item.sentiment * 100).toFixed(0)}% sentiment
        </span>
        <div className="flex gap-1.5 flex-wrap">
          {item.markets?.map((t) => (
            <span
              key={t}
              className="text-xs text-orange-400 bg-orange-500/10 px-1.5 py-0.5 rounded border border-orange-500/20 hover:bg-orange-500/20"
            >
              {t}
            </span>
          ))}
        </div>
      </div>
    </div>
  );

  if (fullPage) {
    return (
      <div className="terminal-panel h-full">
        <PanelHeader
          title="NEWS & SOCIAL FEED"
          subtitle={`${news.length} articles • LEET QUANTUM TERMINAL`}
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
      <PanelHeader title="NEWS & SOCIAL" subtitle="Live feed" />
      <div className="panel-content">
        {news.map((item) => (
          <NewsItem key={item.id} item={item} />
        ))}
      </div>
    </div>
  );
};
