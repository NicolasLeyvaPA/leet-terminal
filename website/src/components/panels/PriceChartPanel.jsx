import { useMemo } from 'react';
import { PanelHeader } from '../PanelHeader';
import { PriceChart } from '../PriceChart';

// ============================================
// PRICE CHART PANEL WITH NEWS EVENTS
// Shows price history with news event markers
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

  // Return top 5 relevant news items (score > 0)
  return scored
    .filter(item => item.relevanceScore > 0)
    .sort((a, b) => b.relevanceScore - a.relevanceScore)
    .slice(0, 5);
};

export const PriceChartPanel = ({ market, news = [] }) => {
  // Filter news relevant to this market
  const relevantNews = useMemo(() => {
    return filterNewsForMarket(news, market);
  }, [news, market]);

  if (!market)
    return (
      <div className="terminal-panel h-full flex items-center justify-center text-gray-600 text-xs">
        Select a market
      </div>
    );

  return (
    <div className="terminal-panel h-full">
      <PanelHeader
        title="PRICE"
        subtitle={`${market.ticker} 90D`}
        actions={
          relevantNews.length > 0 && (
            <span className="text-[9px] text-blue-400 px-1.5 py-0.5 bg-blue-500/10 rounded">
              {relevantNews.length} news
            </span>
          )
        }
      />
      <div className="panel-content p-1 flex flex-col">
        <div className="flex-1 min-h-0">
          <PriceChart data={market.price_history} newsEvents={relevantNews} />
        </div>
      </div>
    </div>
  );
};

export default PriceChartPanel;
