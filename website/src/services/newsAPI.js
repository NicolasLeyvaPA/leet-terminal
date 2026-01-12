// ============================================
// RSS NEWS FEED SERVICE
// Fetches news from Bloomberg, Reuters, CNBC via RSS
// No API keys required - uses public RSS feeds
// ============================================

// CORS proxy for browser-based RSS fetching
const CORS_PROXY = 'https://api.allorigins.win/raw?url=';

// RSS feed sources (public, no API key needed)
const RSS_FEEDS = [
  {
    name: 'Reuters',
    url: 'https://www.reutersagency.com/feed/?best-topics=business-finance&post_type=best',
    category: 'finance',
    priority: 1
  },
  {
    name: 'CNBC',
    url: 'https://www.cnbc.com/id/100003114/device/rss/rss.html',
    category: 'markets',
    priority: 1
  },
  {
    name: 'Yahoo Finance',
    url: 'https://finance.yahoo.com/news/rssindex',
    category: 'finance',
    priority: 2
  },
  {
    name: 'MarketWatch',
    url: 'https://feeds.marketwatch.com/marketwatch/topstories/',
    category: 'markets',
    priority: 1
  },
  {
    name: 'CoinDesk',
    url: 'https://www.coindesk.com/arc/outboundfeeds/rss/',
    category: 'crypto',
    priority: 2
  },
  {
    name: 'CryptoPanic',
    url: 'https://cryptopanic.com/news/rss/',
    category: 'crypto',
    priority: 2
  }
];

// Keywords for market matching and sentiment analysis
const POSITIVE_KEYWORDS = [
  'surge', 'jump', 'rally', 'gain', 'rise', 'soar', 'bullish', 'boost',
  'growth', 'profit', 'win', 'success', 'breakthrough', 'record high',
  'outperform', 'beat', 'exceed', 'optimistic', 'upgrade', 'buy'
];

const NEGATIVE_KEYWORDS = [
  'drop', 'fall', 'crash', 'plunge', 'decline', 'loss', 'bearish', 'slump',
  'recession', 'crisis', 'fear', 'risk', 'warning', 'downgrade', 'sell',
  'fail', 'miss', 'cut', 'layoff', 'bankruptcy', 'default', 'scandal'
];

// Market-related keywords for matching news to prediction markets
const MARKET_KEYWORDS = {
  politics: ['trump', 'biden', 'election', 'congress', 'senate', 'democrat', 'republican', 'president', 'vote', 'poll'],
  crypto: ['bitcoin', 'btc', 'ethereum', 'eth', 'crypto', 'blockchain', 'defi', 'nft', 'altcoin', 'stablecoin'],
  sports: ['nfl', 'nba', 'mlb', 'soccer', 'football', 'basketball', 'superbowl', 'championship', 'playoffs', 'finals'],
  tech: ['apple', 'google', 'microsoft', 'amazon', 'meta', 'tesla', 'nvidia', 'ai', 'artificial intelligence'],
  finance: ['fed', 'interest rate', 'inflation', 'gdp', 'economy', 'stock', 'bond', 'treasury', 'market'],
  world: ['ukraine', 'russia', 'china', 'war', 'conflict', 'sanctions', 'nato', 'trade', 'tariff']
};

// Parse RSS XML to JSON
const parseRSS = (xmlText, sourceName) => {
  try {
    const parser = new DOMParser();
    const xml = parser.parseFromString(xmlText, 'text/xml');

    // Check for parse errors
    const parseError = xml.querySelector('parsererror');
    if (parseError) {
      console.warn(`RSS parse error for ${sourceName}:`, parseError.textContent);
      return [];
    }

    const items = xml.querySelectorAll('item');
    const articles = [];

    items.forEach((item, index) => {
      if (index >= 15) return; // Limit per source

      const title = item.querySelector('title')?.textContent || '';
      const link = item.querySelector('link')?.textContent || '';
      const description = item.querySelector('description')?.textContent || '';
      const pubDate = item.querySelector('pubDate')?.textContent || '';

      if (!title) return;

      // Clean HTML from description
      const cleanDescription = description
        .replace(/<[^>]*>/g, '')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .trim()
        .slice(0, 200);

      articles.push({
        id: `${sourceName}-${index}-${Date.now()}`,
        title: title.trim(),
        description: cleanDescription,
        link,
        source: sourceName,
        publishedAt: pubDate ? new Date(pubDate) : new Date(),
        raw: title + ' ' + cleanDescription
      });
    });

    return articles;
  } catch (err) {
    console.warn(`Failed to parse RSS for ${sourceName}:`, err);
    return [];
  }
};

// Calculate sentiment score from text
const calculateSentiment = (text) => {
  const lowerText = text.toLowerCase();
  let score = 0;

  POSITIVE_KEYWORDS.forEach(word => {
    if (lowerText.includes(word)) score += 0.15;
  });

  NEGATIVE_KEYWORDS.forEach(word => {
    if (lowerText.includes(word)) score -= 0.15;
  });

  // Clamp between -1 and 1
  return Math.max(-1, Math.min(1, score));
};

// Match news to market categories
const matchMarkets = (text) => {
  const lowerText = text.toLowerCase();
  const matches = [];

  Object.entries(MARKET_KEYWORDS).forEach(([category, keywords]) => {
    const hasMatch = keywords.some(kw => lowerText.includes(kw));
    if (hasMatch) {
      matches.push(category.toUpperCase());
    }
  });

  return matches.length > 0 ? matches.slice(0, 3) : ['GENERAL'];
};

// Format time ago
const formatTimeAgo = (date) => {
  if (!date || isNaN(date.getTime())) return 'Just now';

  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
};

// Fetch single RSS feed
const fetchRSSFeed = async (feed) => {
  try {
    const response = await fetch(CORS_PROXY + encodeURIComponent(feed.url), {
      signal: AbortSignal.timeout(10000) // 10 second timeout
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const xmlText = await response.text();
    return parseRSS(xmlText, feed.name);
  } catch (err) {
    console.warn(`Failed to fetch ${feed.name}:`, err.message);
    return [];
  }
};

// Main function to fetch all news
export const fetchAllNews = async () => {
  try {
    // Fetch all feeds in parallel
    const feedPromises = RSS_FEEDS.map(feed => fetchRSSFeed(feed));
    const results = await Promise.allSettled(feedPromises);

    // Combine all articles
    let allArticles = [];
    results.forEach((result, index) => {
      if (result.status === 'fulfilled' && result.value.length > 0) {
        allArticles = allArticles.concat(result.value);
      }
    });

    // Process articles with sentiment and market matching
    const processedArticles = allArticles.map(article => ({
      ...article,
      sentiment: calculateSentiment(article.raw),
      markets: matchMarkets(article.raw),
      time: formatTimeAgo(article.publishedAt)
    }));

    // Sort by date (newest first)
    processedArticles.sort((a, b) => {
      const dateA = a.publishedAt instanceof Date ? a.publishedAt : new Date(a.publishedAt);
      const dateB = b.publishedAt instanceof Date ? b.publishedAt : new Date(b.publishedAt);
      return dateB - dateA;
    });

    // Deduplicate by title similarity
    const seen = new Set();
    const uniqueArticles = processedArticles.filter(article => {
      const titleKey = article.title.toLowerCase().slice(0, 50);
      if (seen.has(titleKey)) return false;
      seen.add(titleKey);
      return true;
    });

    return uniqueArticles.slice(0, 50); // Return max 50 articles
  } catch (err) {
    console.error('News fetch error:', err);
    return [];
  }
};

// Fetch news related to a specific market/topic
export const fetchNewsForMarket = async (marketQuestion) => {
  const allNews = await fetchAllNews();

  if (!marketQuestion) return allNews;

  // Extract keywords from market question
  const questionWords = marketQuestion
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .split(/\s+/)
    .filter(w => w.length > 3);

  // Score each article by relevance
  const scoredNews = allNews.map(article => {
    let relevance = 0;
    const articleText = article.raw.toLowerCase();

    questionWords.forEach(word => {
      if (articleText.includes(word)) {
        relevance += 1;
      }
    });

    return { ...article, relevance };
  });

  // Sort by relevance, then by date
  scoredNews.sort((a, b) => {
    if (b.relevance !== a.relevance) return b.relevance - a.relevance;
    const dateA = a.publishedAt instanceof Date ? a.publishedAt : new Date(a.publishedAt);
    const dateB = b.publishedAt instanceof Date ? b.publishedAt : new Date(b.publishedAt);
    return dateB - dateA;
  });

  return scoredNews;
};

// Mock news for development/fallback
export const getMockNews = () => [
  {
    id: 'mock-1',
    title: 'Federal Reserve signals potential rate cuts in 2025',
    description: 'Fed officials indicate inflation cooling faster than expected',
    source: 'Reuters',
    time: '2h ago',
    sentiment: 0.4,
    markets: ['FINANCE', 'POLITICS'],
    link: '#'
  },
  {
    id: 'mock-2',
    title: 'Bitcoin surges past $100K as institutional adoption grows',
    description: 'Major banks announce crypto custody services',
    source: 'CoinDesk',
    time: '3h ago',
    sentiment: 0.6,
    markets: ['CRYPTO'],
    link: '#'
  },
  {
    id: 'mock-3',
    title: 'Tech stocks face pressure amid AI regulation concerns',
    description: 'Congress considers new AI oversight legislation',
    source: 'CNBC',
    time: '4h ago',
    sentiment: -0.3,
    markets: ['TECH', 'POLITICS'],
    link: '#'
  },
  {
    id: 'mock-4',
    title: 'NFL playoffs: Chiefs favored to win Super Bowl',
    description: 'Betting markets shift after divisional round results',
    source: 'Yahoo Finance',
    time: '5h ago',
    sentiment: 0.1,
    markets: ['SPORTS'],
    link: '#'
  },
  {
    id: 'mock-5',
    title: 'Ukraine peace talks show progress, officials say',
    description: 'Diplomatic efforts intensify as ceasefire negotiations continue',
    source: 'Reuters',
    time: '6h ago',
    sentiment: 0.3,
    markets: ['WORLD', 'POLITICS'],
    link: '#'
  }
];

export default {
  fetchAllNews,
  fetchNewsForMarket,
  getMockNews
};
