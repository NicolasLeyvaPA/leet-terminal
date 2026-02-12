/**
 * News API Service
 * 
 * Fetches real news from NewsAPI.org and GNews.io
 * Free tiers: NewsAPI 100 req/day, GNews 100 req/day
 */

import { getCached, setCache, waitForRateLimit } from '../utils/apiCache';
import { sanitizeText } from '../utils/sanitize';
import logger from '../utils/logger';
import scrapeology from '../config/scrapeology';

// API Keys (set in .env or configure via environment)
const NEWS_API_KEY = import.meta.env.VITE_NEWS_API_KEY || '';
const GNEWS_API_KEY = import.meta.env.VITE_GNEWS_API_KEY || '';

// Use CORS proxy for NewsAPI (doesn't allow browser requests on free tier)
const CORS_PROXY = import.meta.env.VITE_CORS_PROXY_URL || '';
const NEWS_API_BASE = 'https://newsapi.org/v2';
const GNEWS_BASE = 'https://gnews.io/api/v4';

// Keywords for prediction market relevant news
const MARKET_KEYWORDS = [
  'prediction market',
  'polymarket',
  'kalshi',
  'manifold markets',
  'election odds',
  'betting odds',
  'political betting',
  'forecast market',
  'probability forecast',
];

// Category keywords for matching news to markets
const CATEGORY_KEYWORDS = {
  'Politics': ['election', 'trump', 'biden', 'congress', 'senate', 'vote', 'poll', 'democrat', 'republican', 'president'],
  'Crypto': ['bitcoin', 'ethereum', 'crypto', 'blockchain', 'web3', 'defi', 'nft', 'sec crypto'],
  'Sports': ['nfl', 'nba', 'mlb', 'super bowl', 'world cup', 'olympics', 'championship'],
  'Entertainment': ['oscar', 'grammy', 'emmy', 'movie', 'netflix', 'streaming', 'box office'],
  'Economics': ['fed', 'interest rate', 'inflation', 'gdp', 'recession', 'jobs report', 'unemployment'],
  'Tech': ['ai', 'openai', 'google', 'apple', 'microsoft', 'meta', 'tesla', 'spacex'],
  'Science': ['nasa', 'spacex', 'climate', 'covid', 'vaccine', 'fda', 'health'],
};

/**
 * Proxy URL for CORS
 */
function proxyUrl(url) {
  if (!CORS_PROXY) return url;
  return `${CORS_PROXY}?url=${encodeURIComponent(url)}`;
}

/**
 * Fetch from NewsAPI
 */
async function fetchFromNewsAPI(query, options = {}) {
  if (!NEWS_API_KEY) {
    logger.warn('NewsAPI key not configured');
    return [];
  }

  const params = new URLSearchParams({
    q: query,
    apiKey: NEWS_API_KEY,
    language: 'en',
    sortBy: 'publishedAt',
    pageSize: options.limit || 10,
  });

  const url = `${NEWS_API_BASE}/everything?${params}`;
  const cacheKey = `newsapi:${query}:${options.limit || 10}`;

  // Check cache (5 minute TTL for news)
  const cached = getCached(cacheKey);
  if (cached) return cached;

  try {
    await waitForRateLimit('newsapi', 1000);
    
    const response = await fetch(proxyUrl(url), {
      headers: { 'Accept': 'application/json' },
    });

    if (!response.ok) {
      throw new Error(`NewsAPI error: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.status !== 'ok' || !data.articles) {
      return [];
    }

    const articles = data.articles.map(transformNewsArticle);
    setCache(cacheKey, articles, 5 * 60 * 1000); // 5 min cache
    
    return articles;
  } catch (error) {
    logger.error('NewsAPI fetch failed:', error.message);
    return [];
  }
}

/**
 * Fetch from GNews
 */
async function fetchFromGNews(query, options = {}) {
  if (!GNEWS_API_KEY) {
    logger.warn('GNews API key not configured');
    return [];
  }

  const params = new URLSearchParams({
    q: query,
    token: GNEWS_API_KEY,
    lang: 'en',
    max: options.limit || 10,
  });

  const url = `${GNEWS_BASE}/search?${params}`;
  const cacheKey = `gnews:${query}:${options.limit || 10}`;

  // Check cache
  const cached = getCached(cacheKey);
  if (cached) return cached;

  try {
    await waitForRateLimit('gnews', 1000);
    
    const response = await fetch(url, {
      headers: { 'Accept': 'application/json' },
    });

    if (!response.ok) {
      throw new Error(`GNews error: ${response.status}`);
    }

    const data = await response.json();
    
    if (!data.articles) {
      return [];
    }

    const articles = data.articles.map(transformGNewsArticle);
    setCache(cacheKey, articles, 5 * 60 * 1000);
    
    return articles;
  } catch (error) {
    logger.error('GNews fetch failed:', error.message);
    return [];
  }
}

/**
 * Transform NewsAPI article to our format
 */
function transformNewsArticle(article) {
  return {
    id: `newsapi-${hashString(article.url)}`,
    title: sanitizeText(article.title || ''),
    description: sanitizeText(article.description || ''),
    source: article.source?.name || 'Unknown',
    url: article.url,
    imageUrl: article.urlToImage,
    publishedAt: article.publishedAt,
    timestamp: new Date(article.publishedAt).getTime(),
    category: detectCategory(article.title + ' ' + (article.description || '')),
    sentiment: analyzeSentiment(article.title + ' ' + (article.description || '')),
    relevance: calculateRelevance(article),
    provider: 'newsapi',
  };
}

/**
 * Transform GNews article to our format
 */
function transformGNewsArticle(article) {
  return {
    id: `gnews-${hashString(article.url)}`,
    title: sanitizeText(article.title || ''),
    description: sanitizeText(article.description || ''),
    source: article.source?.name || 'Unknown',
    url: article.url,
    imageUrl: article.image,
    publishedAt: article.publishedAt,
    timestamp: new Date(article.publishedAt).getTime(),
    category: detectCategory(article.title + ' ' + (article.description || '')),
    sentiment: analyzeSentiment(article.title + ' ' + (article.description || '')),
    relevance: calculateRelevance(article),
    provider: 'gnews',
  };
}

/**
 * Simple hash for generating IDs
 */
function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}

/**
 * Detect article category based on keywords
 */
function detectCategory(text) {
  const lowerText = text.toLowerCase();
  
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    for (const keyword of keywords) {
      if (lowerText.includes(keyword)) {
        return category;
      }
    }
  }
  
  return 'General';
}

/**
 * Simple sentiment analysis based on keywords
 */
function analyzeSentiment(text) {
  const lowerText = text.toLowerCase();
  
  const bullishKeywords = ['surge', 'soar', 'rally', 'gain', 'win', 'success', 'bullish', 'positive', 'growth', 'increase', 'rise'];
  const bearishKeywords = ['crash', 'fall', 'drop', 'lose', 'fail', 'bearish', 'negative', 'decline', 'decrease', 'plunge'];
  
  let score = 0;
  
  for (const keyword of bullishKeywords) {
    if (lowerText.includes(keyword)) score += 1;
  }
  
  for (const keyword of bearishKeywords) {
    if (lowerText.includes(keyword)) score -= 1;
  }
  
  if (score > 0) return 'bullish';
  if (score < 0) return 'bearish';
  return 'neutral';
}

/**
 * Calculate relevance score for prediction markets
 */
function calculateRelevance(article) {
  const text = (article.title + ' ' + (article.description || '')).toLowerCase();
  let score = 0;
  
  // Check for market-related keywords
  for (const keyword of MARKET_KEYWORDS) {
    if (text.includes(keyword)) {
      score += 10;
    }
  }
  
  // Check for category keywords
  for (const keywords of Object.values(CATEGORY_KEYWORDS)) {
    for (const keyword of keywords) {
      if (text.includes(keyword)) {
        score += 1;
      }
    }
  }
  
  // Recency bonus
  const ageHours = (Date.now() - new Date(article.publishedAt).getTime()) / (1000 * 60 * 60);
  if (ageHours < 1) score += 5;
  else if (ageHours < 6) score += 3;
  else if (ageHours < 24) score += 1;
  
  return Math.min(100, score);
}

/**
 * Fetch prediction market relevant news
 * @param {object} options - { limit, category }
 * @returns {Promise<Array>} Array of news articles
 */
export async function fetchMarketNews(options = {}) {
  const { limit = 20, category = null } = options;

  // Prefer Scrapeology backend when available (20+ RSS feeds, no API key needed)
  if (scrapeology.isConfigured()) {
    try {
      const params = new URLSearchParams({ limit: String(limit) });
      if (category) params.set('category', category);
      const cacheKey = `scrapeology-news:${category || 'all'}:${limit}`;
      const cached = getCached(cacheKey);
      if (cached) return cached;

      const response = await fetch(scrapeology.endpoint(`/news/articles?${params}`), {
        headers: { 'Accept': 'application/json' },
      });
      if (response.ok) {
        const data = await response.json();
        const articles = (data.articles || data || []).map(a => ({
          id: `scrapeology-${a.id}`,
          title: sanitizeText(a.title || ''),
          description: sanitizeText(a.summary || a.description || ''),
          source: a.source_name || a.source || 'Unknown',
          url: a.url,
          imageUrl: a.image_url || null,
          publishedAt: a.published_at,
          timestamp: new Date(a.published_at).getTime(),
          category: a.category || detectCategory(a.title || ''),
          sentiment: analyzeSentiment((a.title || '') + ' ' + (a.summary || '')),
          relevance: a.relevance || calculateRelevance(a),
          provider: 'scrapeology',
        }));
        setCache(cacheKey, articles, 5 * 60 * 1000);
        return articles;
      }
    } catch (error) {
      logger.warn('Scrapeology news failed, falling back to APIs:', error.message);
    }
  }

  // Build query
  let query = 'prediction market OR polymarket OR kalshi';
  if (category && CATEGORY_KEYWORDS[category]) {
    query = CATEGORY_KEYWORDS[category].slice(0, 3).join(' OR ');
  }

  // Fetch from both sources in parallel
  const [newsApiArticles, gNewsArticles] = await Promise.all([
    fetchFromNewsAPI(query, { limit: Math.ceil(limit / 2) }),
    fetchFromGNews(query, { limit: Math.ceil(limit / 2) }),
  ]);
  
  // Merge and deduplicate
  const allArticles = [...newsApiArticles, ...gNewsArticles];
  const seen = new Set();
  const unique = [];
  
  for (const article of allArticles) {
    // Simple dedup by title similarity
    const titleKey = article.title.toLowerCase().slice(0, 50);
    if (!seen.has(titleKey)) {
      seen.add(titleKey);
      unique.push(article);
    }
  }
  
  // Sort by relevance and recency
  unique.sort((a, b) => {
    const relevanceDiff = b.relevance - a.relevance;
    if (relevanceDiff !== 0) return relevanceDiff;
    return b.timestamp - a.timestamp;
  });
  
  return unique.slice(0, limit);
}

/**
 * Fetch news for a specific category
 */
export async function fetchCategoryNews(category, limit = 10) {
  return fetchMarketNews({ category, limit });
}

/**
 * Match news to markets based on keywords
 */
export function matchNewsToMarkets(news, markets) {
  return news.map(article => {
    const matchedMarkets = [];
    const articleText = (article.title + ' ' + article.description).toLowerCase();
    
    for (const market of markets) {
      const marketText = (market.title + ' ' + (market.description || '')).toLowerCase();
      const marketWords = marketText.split(/\s+/).filter(w => w.length > 3);
      
      // Count matching words
      let matches = 0;
      for (const word of marketWords) {
        if (articleText.includes(word)) matches++;
      }
      
      if (matches >= 2) {
        matchedMarkets.push(market.ticker);
      }
    }
    
    return {
      ...article,
      markets: matchedMarkets,
    };
  });
}

/**
 * Check if news APIs are configured
 */
export function isNewsConfigured() {
  return !!(NEWS_API_KEY || GNEWS_API_KEY || scrapeology.isConfigured());
}

// Export the NewsAPI service
export const NewsAPI = {
  fetchMarketNews,
  fetchCategoryNews,
  matchNewsToMarkets,
  isConfigured: isNewsConfigured,
};
