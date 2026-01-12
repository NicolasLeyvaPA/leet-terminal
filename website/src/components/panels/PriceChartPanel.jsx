import { useState, useMemo, useEffect } from 'react';
import { PanelHeader } from '../PanelHeader';
import { PriceChart } from '../PriceChart';
import { ExpandedChartModal } from '../ExpandedChartModal';

// ============================================
// PRICE CHART PANEL WITH NEWS EVENTS
// Shows price history with news event markers
// Supports fullscreen expansion
// ============================================

// Extract keywords from market question for news matching
const extractKeywords = (question) => {
  if (!question) return [];
  return question
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .split(/\s+/)
    .filter(w => w.length > 3)
    .filter(w => !['will', 'what', 'when', 'where', 'which', 'does', 'have', 'this', 'that', 'with', 'from', 'they', 'been', 'would', 'could', 'should', 'their', 'there', 'about'].includes(w));
};

// Match news to market based on keywords
const filterNewsForMarket = (news, market) => {
  if (!news || !Array.isArray(news) || news.length === 0) return [];
  if (!market) return [];

  const keywords = extractKeywords(market.question);
  const ticker = market.ticker?.toLowerCase() || '';
  const category = market.category?.toLowerCase() || '';

  // Score each news item by relevance
  const scored = news.map(item => {
    let score = 0;
    const itemText = ((item.title || '') + ' ' + (item.description || '')).toLowerCase();

    // Check ticker match
    if (ticker && itemText.includes(ticker)) score += 3;

    // Check category match
    if (category && item.markets?.some(m => m.toLowerCase() === category)) score += 2;

    // Check keyword matches
    keywords.forEach(kw => {
      if (itemText.includes(kw)) score += 1;
    });

    return { ...item, relevanceScore: score };
  });

  // Return all relevant news sorted by score (for expanded view)
  return scored
    .filter(item => item.relevanceScore > 0)
    .sort((a, b) => b.relevanceScore - a.relevanceScore);
};

export const PriceChartPanel = ({ market, news = [] }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  // Filter news relevant to this market
  const relevantNews = useMemo(() => {
    return filterNewsForMarket(news, market);
  }, [news, market]);

  // Handle ESC key to close expanded view
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isExpanded) {
        setIsExpanded(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isExpanded]);

  if (!market)
    return (
      <div className="terminal-panel h-full flex items-center justify-center text-gray-600 text-xs">
        Select a market
      </div>
    );

  return (
    <>
      <div className="terminal-panel h-full flex flex-col">
        <PanelHeader
          title="PRICE"
          subtitle={market.ticker}
          actions={
            <div className="flex items-center gap-1">
              {relevantNews.length > 0 && (
                <span className="text-[9px] text-blue-400 px-1.5 py-0.5 bg-blue-500/10 rounded">
                  {relevantNews.length} news
                </span>
              )}
              <button
                onClick={() => setIsExpanded(true)}
                className="text-[9px] text-gray-500 hover:text-orange-400 px-1.5 py-0.5 rounded hover:bg-gray-800 transition-colors"
                title="Expand to fullscreen"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
                </svg>
              </button>
            </div>
          }
        />
        <div className="flex-1 min-h-0">
          <PriceChart
            data={market.price_history}
            newsEvents={relevantNews.slice(0, 10)}
            onExpand={() => setIsExpanded(true)}
            showControls={true}
          />
        </div>
      </div>

      {/* Expanded Chart Modal */}
      <ExpandedChartModal
        market={market}
        news={relevantNews}
        isOpen={isExpanded}
        onClose={() => setIsExpanded(false)}
      />
    </>
  );
};

export default PriceChartPanel;
