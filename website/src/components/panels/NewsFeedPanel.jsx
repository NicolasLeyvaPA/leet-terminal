import { useState } from 'react';
import { PanelHeader } from '../PanelHeader';

export const NewsFeedPanel = ({ news, onNewsClick, fullPage = false }) => {
  const [selectedNews, setSelectedNews] = useState(null);

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

  const handleNewsClick = (item) => {
    setSelectedNews(item);
    if (onNewsClick) onNewsClick(item);
  };

  const NewsItem = ({ item }) => (
    <div
      className={`news-item px-3 py-2.5 border-b border-gray-900 cursor-pointer hover:bg-gray-900/70 transition-colors ${
        item.sentiment > 0.3
          ? "news-positive"
          : item.sentiment < -0.3
          ? "news-negative"
          : "news-neutral"
      } ${selectedNews?.id === item.id ? "bg-orange-500/10 border-l-2 border-l-orange-500" : ""}`}
      onClick={() => handleNewsClick(item)}
    >
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-2">
          <span className="text-xs text-orange-500 font-medium">
            {item.source}
          </span>
          {item.region && (
            <span className="text-[10px] text-gray-600 bg-gray-800 px-1.5 py-0.5 rounded">
              {item.region}
            </span>
          )}
        </div>
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

  // News Detail Panel Component
  const NewsDetailPanel = ({ item, onClose }) => {
    if (!item) return null;

    return (
      <div className="h-full flex flex-col bg-[#0a0a0a] border-l border-gray-800">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800 bg-[#080808]">
          <div className="flex items-center gap-2">
            <span className="text-orange-500 font-bold text-sm">NEWS DETAIL</span>
            {item.region && (
              <span className="text-[10px] text-gray-500 bg-gray-800 px-2 py-0.5 rounded">
                {item.region}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-white text-lg leading-none px-2"
          >
            ×
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {/* Source and Time */}
          <div className="flex items-center justify-between mb-3">
            <span className="text-orange-500 font-medium">{item.source}</span>
            <span className="text-gray-600 text-xs">{item.time}</span>
          </div>

          {/* Title */}
          <h2 className="text-lg text-white font-medium leading-snug mb-4">
            {item.title}
          </h2>

          {/* Sentiment Badge */}
          <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded mb-4 ${
            item.sentiment > 0.3 ? "bg-green-500/10 border border-green-500/30" :
            item.sentiment < -0.3 ? "bg-red-500/10 border border-red-500/30" :
            "bg-gray-500/10 border border-gray-500/30"
          }`}>
            <span className={`text-sm font-bold ${
              item.sentiment > 0 ? "text-green-500" :
              item.sentiment < 0 ? "text-red-500" :
              "text-gray-400"
            }`}>
              {item.sentiment > 0 ? "▲ BULLISH" : item.sentiment < 0 ? "▼ BEARISH" : "• NEUTRAL"}
            </span>
            <span className="text-gray-500 text-xs">
              {Math.abs(item.sentiment * 100).toFixed(0)}% confidence
            </span>
          </div>

          {/* Summary Section */}
          {item.summary && (
            <div className="mb-4">
              <h3 className="text-xs text-gray-500 uppercase tracking-wider mb-2">Key Points</h3>
              <p className="text-sm text-gray-300 leading-relaxed bg-gray-900/50 p-3 rounded border border-gray-800">
                {item.summary}
              </p>
            </div>
          )}

          {/* Analysis Section */}
          {item.analysis && (
            <div className="mb-4">
              <h3 className="text-xs text-gray-500 uppercase tracking-wider mb-2">Market Analysis</h3>
              <p className="text-sm text-gray-400 leading-relaxed">
                {item.analysis}
              </p>
            </div>
          )}

          {/* Bet Relation Section */}
          {item.betRelation && (
            <div className="mb-4">
              <h3 className="text-xs text-gray-500 uppercase tracking-wider mb-2">Trading Signal</h3>
              <div className={`p-3 rounded border ${
                item.sentiment > 0.3 ? "bg-green-500/5 border-green-500/20" :
                item.sentiment < -0.3 ? "bg-red-500/5 border-red-500/20" :
                "bg-gray-500/5 border-gray-500/20"
              }`}>
                <p className={`text-sm font-medium ${
                  item.sentiment > 0 ? "text-green-400" :
                  item.sentiment < 0 ? "text-red-400" :
                  "text-gray-400"
                }`}>
                  {item.betRelation}
                </p>
              </div>
            </div>
          )}

          {/* Related Markets */}
          <div className="mb-4">
            <h3 className="text-xs text-gray-500 uppercase tracking-wider mb-2">Related Markets</h3>
            <div className="flex flex-wrap gap-2">
              {item.markets.map((market) => (
                <span
                  key={market}
                  className="text-sm text-orange-400 bg-orange-500/10 px-3 py-1.5 rounded border border-orange-500/20 hover:bg-orange-500/20 cursor-pointer transition-colors"
                >
                  {market}
                </span>
              ))}
            </div>
          </div>

          {/* Source Link */}
          {item.url && (
            <div className="mt-6 pt-4 border-t border-gray-800">
              <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm text-orange-500 hover:text-orange-400 transition-colors"
              >
                <span>Read Full Article</span>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
              <p className="text-xs text-gray-600 mt-1">{item.url}</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  if (fullPage) {
    return (
      <div className="terminal-panel h-full">
        <PanelHeader
          title="NEWS & SOCIAL FEED"
          subtitle={`${news.length} articles • Global Coverage`}
        />
        <div className="panel-content h-[calc(100%-40px)]">
          <div className="flex h-full gap-1.5 p-1.5">
            {/* News Columns */}
            <div className={`grid grid-cols-3 gap-1.5 ${selectedNews ? 'flex-1' : 'w-full'}`}>
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

            {/* Detail Panel */}
            {selectedNews && (
              <div className="w-96 h-full">
                <NewsDetailPanel
                  item={selectedNews}
                  onClose={() => setSelectedNews(null)}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Compact view for sidebar usage
  return (
    <div className="terminal-panel h-full flex flex-col">
      <PanelHeader title="NEWS & SOCIAL" subtitle="Live feed • Click for details" />
      <div className="flex-1 flex overflow-hidden">
        {/* News List */}
        <div className={`${selectedNews ? 'w-1/2' : 'w-full'} overflow-y-auto`}>
          {news.map((item) => (
            <NewsItem key={item.id} item={item} />
          ))}
        </div>

        {/* Detail Panel for compact view */}
        {selectedNews && (
          <div className="w-1/2 border-l border-gray-800">
            <NewsDetailPanel
              item={selectedNews}
              onClose={() => setSelectedNews(null)}
            />
          </div>
        )}
      </div>
    </div>
  );
};
