import { useState, useMemo } from 'react';
import { PriceChart } from './PriceChart';

// ============================================
// EXPANDED CHART MODAL
// Full-screen interactive chart with news list
// CoinMarketCap-style detailed view
// ============================================

// Format time ago
const formatTimeAgo = (date) => {
  if (!date) return '';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';

  const now = new Date();
  const diffMs = now - d;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return d.toLocaleDateString();
};

// News item component
const NewsItem = ({ item, onClick }) => {
  const sentimentColor = item.sentiment > 0.2 ? 'text-green-400' :
                        item.sentiment < -0.2 ? 'text-red-400' : 'text-gray-400';
  const sentimentBg = item.sentiment > 0.2 ? 'bg-green-500/10 border-green-500/30' :
                     item.sentiment < -0.2 ? 'bg-red-500/10 border-red-500/30' : 'bg-gray-800/50 border-gray-700';
  const impactBadge = item.impact > 5 ? (
    <span className="text-[9px] px-1.5 py-0.5 rounded bg-orange-500/20 text-orange-400 border border-orange-500/30">
      HIGH IMPACT
    </span>
  ) : null;

  return (
    <div
      className={`p-3 rounded-lg border cursor-pointer transition-all hover:border-orange-500/50 ${sentimentBg}`}
      onClick={() => onClick && onClick(item)}
    >
      <div className="flex items-start justify-between gap-2 mb-1">
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-orange-400 font-medium">{item.source}</span>
          <span className="text-[9px] text-gray-600">{formatTimeAgo(item.publishedAt)}</span>
          {impactBadge}
        </div>
        <span className={`text-[10px] font-medium ${sentimentColor}`}>
          {item.sentiment > 0.2 ? '📈 Bullish' :
           item.sentiment < -0.2 ? '📉 Bearish' : '➖ Neutral'}
        </span>
      </div>
      <div className="text-sm text-gray-200 leading-snug mb-2">{item.title}</div>
      {item.description && (
        <div className="text-[11px] text-gray-500 line-clamp-2">{item.description}</div>
      )}
      {item.markets && item.markets.length > 0 && (
        <div className="flex gap-1 mt-2 flex-wrap">
          {item.markets.slice(0, 3).map(m => (
            <span key={m} className="text-[9px] px-1.5 py-0.5 rounded bg-gray-800 text-gray-400 border border-gray-700">
              {m}
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

export const ExpandedChartModal = ({ market, news, isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState('chart'); // chart, news

  // Sort news by impact
  const sortedNews = useMemo(() => {
    if (!news || !Array.isArray(news)) return [];
    return [...news].sort((a, b) => (b.impact || 0) - (a.impact || 0));
  }, [news]);

  // Stats
  const bullishCount = sortedNews.filter(n => n.sentiment > 0.2).length;
  const bearishCount = sortedNews.filter(n => n.sentiment < -0.2).length;
  const highImpactCount = sortedNews.filter(n => (n.impact || 0) > 5).length;

  if (!isOpen || !market) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 h-12 bg-gradient-to-r from-gray-900 to-orange-900/20 border-b border-gray-800 flex items-center justify-between px-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-orange-500 font-bold text-lg">{market.ticker}</span>
            <span className="text-gray-400 text-sm">Price Chart</span>
          </div>
          <div className="h-5 w-px bg-gray-700" />
          <div className="flex items-center gap-3 text-[11px]">
            <span className="text-gray-500">
              Price: <span className="text-orange-400 font-bold">{(market.market_prob * 100).toFixed(1)}¢</span>
            </span>
            <span className="text-gray-500">
              News: <span className="text-white font-medium">{sortedNews.length}</span>
            </span>
            {highImpactCount > 0 && (
              <span className="text-gray-500">
                High Impact: <span className="text-orange-400 font-medium">{highImpactCount}</span>
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Tabs */}
          <div className="flex items-center bg-gray-800 rounded-lg p-0.5">
            <button
              onClick={() => setActiveTab('chart')}
              className={`px-3 py-1 text-[11px] rounded-md transition-colors ${
                activeTab === 'chart'
                  ? 'bg-orange-500 text-black font-bold'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Chart
            </button>
            <button
              onClick={() => setActiveTab('news')}
              className={`px-3 py-1 text-[11px] rounded-md transition-colors ${
                activeTab === 'news'
                  ? 'bg-orange-500 text-black font-bold'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              News ({sortedNews.length})
            </button>
          </div>

          {/* Close */}
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-800 text-gray-400 hover:text-white transition-colors"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0 p-4">
        {activeTab === 'chart' ? (
          <div className="h-full flex gap-4">
            {/* Main Chart - 70% */}
            <div className="flex-1 min-w-0 bg-gray-900/50 rounded-lg border border-gray-800 overflow-hidden">
              <PriceChart
                data={market.price_history}
                newsEvents={sortedNews}
                isExpanded={true}
                showControls={true}
              />
            </div>

            {/* News Sidebar - 30% */}
            <div className="w-80 flex-shrink-0 bg-gray-900/50 rounded-lg border border-gray-800 flex flex-col overflow-hidden">
              <div className="p-3 border-b border-gray-800">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-bold text-white">Related News</span>
                  <div className="flex items-center gap-2 text-[10px]">
                    <span className="text-green-400">{bullishCount} Bullish</span>
                    <span className="text-gray-600">|</span>
                    <span className="text-red-400">{bearishCount} Bearish</span>
                  </div>
                </div>
                <div className="text-[10px] text-gray-500">
                  News affecting {market.ticker} • Hover chart markers for details
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {sortedNews.length === 0 ? (
                  <div className="text-center py-8 text-gray-500 text-sm">
                    No related news found
                  </div>
                ) : (
                  sortedNews.map((item, idx) => (
                    <NewsItem
                      key={item.id || idx}
                      item={item}
                      onClick={() => item.link && window.open(item.link, '_blank')}
                    />
                  ))
                )}
              </div>
            </div>
          </div>
        ) : (
          /* Full News View */
          <div className="h-full bg-gray-900/50 rounded-lg border border-gray-800 overflow-hidden flex flex-col">
            <div className="p-4 border-b border-gray-800">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-white">News Feed</h3>
                  <p className="text-[11px] text-gray-500 mt-0.5">
                    {sortedNews.length} articles related to {market.ticker}
                  </p>
                </div>
                <div className="flex items-center gap-4 text-[11px]">
                  <div className="flex items-center gap-1">
                    <span className="w-3 h-3 rounded-full bg-green-500"></span>
                    <span className="text-gray-400">{bullishCount} Bullish</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="w-3 h-3 rounded-full bg-red-500"></span>
                    <span className="text-gray-400">{bearishCount} Bearish</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="w-3 h-3 rounded-full bg-orange-500"></span>
                    <span className="text-gray-400">{highImpactCount} High Impact</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <div className="grid grid-cols-3 gap-3">
                {sortedNews.map((item, idx) => (
                  <NewsItem
                    key={item.id || idx}
                    item={item}
                    onClick={() => item.link && window.open(item.link, '_blank')}
                  />
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex-shrink-0 h-8 bg-gray-900/80 border-t border-gray-800 flex items-center justify-between px-4 text-[10px]">
        <div className="text-gray-500">
          <span className="text-gray-600">TIP:</span> Scroll to zoom • Click and drag to pan • Larger dots = higher market impact
        </div>
        <div className="text-gray-600">
          Press <kbd className="px-1.5 py-0.5 bg-gray-800 rounded text-gray-400">ESC</kbd> to close
        </div>
      </div>
    </div>
  );
};

export default ExpandedChartModal;
