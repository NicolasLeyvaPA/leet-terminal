import { PanelHeader } from '../PanelHeader';

export const NewsFeedPanel = ({ news, onNewsClick, fullPage = false }) => {
  if (!news || news.length === 0) {
    return (
      <div className="terminal-panel h-full flex items-center justify-center text-gray-600 text-xs">
        No news available
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
          {item.sentiment > 0 ? "▲" : item.sentiment < 0 ? "▼" : "•"}{" "}
          {Math.abs(item.sentiment * 100).toFixed(0)}% sentiment
        </span>
        <div className="flex gap-1.5 flex-wrap">
          {item.markets.map((t) => (
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
                <span className="text-green-500 text-sm font-bold">▲ BULLISH</span>
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
                <span className="text-gray-400 text-sm font-bold">• NEUTRAL</span>
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
                <span className="text-red-500 text-sm font-bold">▼ BEARISH</span>
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
      <PanelHeader title="NEWS & SOCIAL" subtitle="Live feed • Click to jump" />
      <div className="panel-content">
        {news.map((item) => (
          <NewsItem key={item.id} item={item} />
        ))}
      </div>
    </div>
  );
};

