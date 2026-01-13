/**
 * Hyperstition Scoring Engine
 *
 * Computes an explainable 0-100 score representing market "hype" and sentiment dynamics.
 * Components:
 * - news_heat: Volume of related news articles (acceleration)
 * - momentum: Mentions/interest growth rate
 * - liquidity_sensitivity: How spread/depth responds to activity
 * - volatility_reflex: Price variability in response to events
 * - controversy: Sentiment polarity spread (mixed signals)
 */

import type {
  HyperstitionScore,
  HyperstitionComponent,
  HyperstitionBand,
  MarketSummary,
  NewsItem,
  DataFreshness,
} from '@leet-terminal/shared/contracts';
import { createFreshness, getHyperstitionBand } from '@leet-terminal/shared/contracts';
import { CACHE_TTL } from './cache.js';

// Component weights (must sum to 1.0)
const WEIGHTS = {
  news_heat: 0.25,
  momentum: 0.20,
  liquidity_sensitivity: 0.15,
  volatility_reflex: 0.25,
  controversy: 0.15,
} as const;

interface HyperstitionInput {
  market: MarketSummary;
  relatedNews: NewsItem[];
  priceHistory?: Array<{ price: number; timestamp: number }>;
  orderbookHistory?: Array<{ spread: number; imbalance: number; timestamp: number }>;
}

/**
 * Calculate news heat score (0-100)
 * Based on volume and recency of related news
 */
function calculateNewsHeat(
  relatedNews: NewsItem[],
  marketCreatedAt: string
): HyperstitionComponent {
  const now = Date.now();
  const last24h = now - 24 * 60 * 60 * 1000;
  const last7d = now - 7 * 24 * 60 * 60 * 1000;

  // Count recent news
  const news24h = relatedNews.filter(
    (n) => new Date(n.published_at).getTime() > last24h
  ).length;
  const news7d = relatedNews.filter(
    (n) => new Date(n.published_at).getTime() > last7d
  ).length;

  // Calculate acceleration (24h vs 7d average)
  const daily7dAvg = news7d / 7;
  const acceleration = daily7dAvg > 0 ? news24h / daily7dAvg : news24h > 0 ? 2 : 0;

  // Score based on absolute volume and acceleration
  let score = 0;
  score += Math.min(news24h * 10, 40); // Up to 40 points for volume
  score += Math.min(acceleration * 15, 30); // Up to 30 points for acceleration
  score += Math.min(relatedNews.length * 2, 30); // Up to 30 points for total coverage

  score = Math.min(100, score);

  let trend: 'rising' | 'falling' | 'stable' = 'stable';
  if (acceleration > 1.5) trend = 'rising';
  else if (acceleration < 0.5 && news7d > 0) trend = 'falling';

  return {
    name: 'News Heat',
    value: score,
    weight: WEIGHTS.news_heat,
    description:
      score > 70
        ? `High coverage: ${news24h} articles in 24h`
        : score > 30
        ? `Moderate coverage: ${news24h} articles in 24h`
        : 'Low news coverage',
    trend,
  };
}

/**
 * Calculate momentum score (0-100)
 * Based on price movement and volume trends
 */
function calculateMomentum(
  market: MarketSummary,
  priceHistory?: Array<{ price: number; timestamp: number }>
): HyperstitionComponent {
  let score = 0;
  let trend: 'rising' | 'falling' | 'stable' = 'stable';
  let description = '';

  // Price momentum
  const priceDelta = market.market_prob - market.prev_prob;
  const priceMovement = Math.abs(priceDelta);

  // Volume signals momentum
  const volumeScore = Math.min(market.volume_24h / 100000, 1) * 30;

  // Trades indicate activity
  const tradesScore = Math.min(market.trades_24h / 500, 1) * 20;

  // Direction and magnitude of price change
  const directionScore = priceMovement * 500; // Up to 50 points for 10% move

  score = volumeScore + tradesScore + Math.min(directionScore, 50);
  score = Math.min(100, score);

  if (priceDelta > 0.02) {
    trend = 'rising';
    description = `Bullish momentum: +${(priceDelta * 100).toFixed(1)}%`;
  } else if (priceDelta < -0.02) {
    trend = 'falling';
    description = `Bearish momentum: ${(priceDelta * 100).toFixed(1)}%`;
  } else {
    description = 'Price consolidating';
  }

  return {
    name: 'Momentum',
    value: score,
    weight: WEIGHTS.momentum,
    description,
    trend,
  };
}

/**
 * Calculate liquidity sensitivity score (0-100)
 * Based on spread tightness and depth
 */
function calculateLiquiditySensitivity(
  market: MarketSummary
): HyperstitionComponent {
  let score = 0;

  // Tight spread = more sensitive/efficient market
  const spreadScore = market.spread < 0.02 ? 30 : market.spread < 0.05 ? 20 : 10;

  // High liquidity = market can absorb shocks
  const liquidityScore = Math.min(market.liquidity / 500000, 1) * 35;

  // Open interest shows committed capital
  const oiScore = Math.min(market.open_interest / 1000000, 1) * 35;

  score = spreadScore + liquidityScore + oiScore;
  score = Math.min(100, score);

  const trend: 'rising' | 'falling' | 'stable' =
    market.spread < 0.03 ? 'stable' : 'falling';

  return {
    name: 'Liquidity Sensitivity',
    value: score,
    weight: WEIGHTS.liquidity_sensitivity,
    description:
      score > 70
        ? 'Deep liquidity, tight spreads'
        : score > 30
        ? 'Moderate liquidity'
        : 'Thin liquidity, wide spreads',
    trend,
  };
}

/**
 * Calculate volatility reflex score (0-100)
 * Based on price variability
 */
function calculateVolatilityReflex(
  market: MarketSummary,
  priceHistory?: Array<{ price: number; timestamp: number }>
): HyperstitionComponent {
  let score = 0;

  // Estimate volatility from spread as proxy
  const impliedVol = market.spread * 10;
  const volScore = Math.min(impliedVol * 100, 50);

  // Edge between model and market suggests volatility opportunity
  const edgeMagnitude = Math.abs(market.model_prob - market.market_prob);
  const edgeScore = Math.min(edgeMagnitude * 500, 30);

  // Probability near 50% = max uncertainty = max potential volatility
  const uncertaintyScore = (1 - Math.abs(market.market_prob - 0.5) * 2) * 20;

  score = volScore + edgeScore + uncertaintyScore;
  score = Math.min(100, score);

  return {
    name: 'Volatility Reflex',
    value: score,
    weight: WEIGHTS.volatility_reflex,
    description:
      score > 70
        ? 'High volatility expected'
        : score > 30
        ? 'Moderate volatility'
        : 'Low volatility, stable pricing',
    trend: score > 60 ? 'rising' : 'stable',
  };
}

/**
 * Calculate controversy score (0-100)
 * Based on sentiment polarity in news
 */
function calculateControversy(relatedNews: NewsItem[]): HyperstitionComponent {
  if (relatedNews.length === 0) {
    return {
      name: 'Controversy',
      value: 0,
      weight: WEIGHTS.controversy,
      description: 'No news data for sentiment analysis',
      trend: 'stable',
    };
  }

  // Count sentiment distribution
  const sentiments = relatedNews.reduce(
    (acc, n) => {
      acc[n.sentiment] = (acc[n.sentiment] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  const total = relatedNews.length;
  const positive = (sentiments['positive'] || 0) / total;
  const negative = (sentiments['negative'] || 0) / total;
  const mixed = (sentiments['mixed'] || 0) / total;

  // Controversy = balanced opposing views
  const polarization = Math.min(positive, negative) * 2; // Max when 50/50
  const mixedSignals = mixed;

  // Score based on polarization and mixed signals
  let score = polarization * 60 + mixedSignals * 40;
  score = Math.min(100, score * 100);

  let trend: 'rising' | 'falling' | 'stable' = 'stable';
  if (polarization > 0.3) trend = 'rising';

  return {
    name: 'Controversy',
    value: score,
    weight: WEIGHTS.controversy,
    description:
      score > 50
        ? 'High sentiment polarization'
        : score > 20
        ? 'Some mixed signals'
        : 'Consistent sentiment',
    trend,
  };
}

/**
 * Identify top drivers and generate explanations
 */
function identifyTopDrivers(
  components: HyperstitionScore['components']
): { drivers: string[]; explanations: Array<{ driver: string; explanation: string; contribution: number }> } {
  const sorted = Object.entries(components)
    .map(([key, comp]) => ({
      key,
      name: comp.name,
      contribution: comp.value * comp.weight,
      description: comp.description,
    }))
    .sort((a, b) => b.contribution - a.contribution);

  const top3 = sorted.slice(0, 3);

  return {
    drivers: top3.map((d) => d.name),
    explanations: top3.map((d) => ({
      driver: d.name,
      explanation: d.description,
      contribution: d.contribution,
    })),
  };
}

/**
 * Calculate overall Hyperstition score for a market
 */
export function calculateHyperstitionScore(input: HyperstitionInput): HyperstitionScore {
  const { market, relatedNews, priceHistory, orderbookHistory } = input;

  // Calculate each component
  const newsHeat = calculateNewsHeat(relatedNews, market.created_at);
  const momentum = calculateMomentum(market, priceHistory);
  const liquiditySensitivity = calculateLiquiditySensitivity(market);
  const volatilityReflex = calculateVolatilityReflex(market, priceHistory);
  const controversy = calculateControversy(relatedNews);

  const components = {
    news_heat: newsHeat,
    momentum,
    liquidity_sensitivity: liquiditySensitivity,
    volatility_reflex: volatilityReflex,
    controversy,
  };

  // Calculate weighted overall score
  const overall =
    newsHeat.value * newsHeat.weight +
    momentum.value * momentum.weight +
    liquiditySensitivity.value * liquiditySensitivity.weight +
    volatilityReflex.value * volatilityReflex.weight +
    controversy.value * controversy.weight;

  const band = getHyperstitionBand(overall);
  const { drivers, explanations } = identifyTopDrivers(components);

  return {
    market_id: market.id,
    overall: Math.round(overall),
    band,
    components,
    top_drivers: drivers,
    driver_explanations: explanations,
    linked_news: relatedNews.map((n) => n.id),
    freshness: createFreshness('computed', CACHE_TTL.HYPERSTITION),
  };
}

/**
 * Link news items to a market based on keyword/entity matching
 */
export function linkNewsToMarket(
  market: MarketSummary,
  allNews: NewsItem[]
): NewsItem[] {
  // Extract keywords from market question and description
  const marketText = `${market.question} ${market.description || ''} ${market.ticker}`.toLowerCase();
  const marketWords = new Set(
    marketText
      .split(/\W+/)
      .filter((w) => w.length > 3)
  );

  // Score each news item for relevance
  const scoredNews = allNews.map((news) => {
    const newsText = `${news.title} ${news.summary}`.toLowerCase();
    const newsWords = new Set(newsText.split(/\W+/).filter((w) => w.length > 3));

    // Count matching words
    let matchCount = 0;
    const matchedKeywords: string[] = [];
    for (const word of marketWords) {
      if (newsWords.has(word)) {
        matchCount++;
        matchedKeywords.push(word);
      }
    }

    // Check category match
    if (market.category.toLowerCase() === news.source.toLowerCase()) {
      matchCount += 2;
    }

    const relevanceScore = Math.min(matchCount / 5, 1);

    return {
      ...news,
      relevance_score: relevanceScore,
      matched_keywords: matchedKeywords,
      linked_market_ids: relevanceScore > 0.2 ? [market.id] : [],
    };
  });

  // Return news items with relevance > threshold
  return scoredNews
    .filter((n) => n.relevance_score > 0.2)
    .sort((a, b) => b.relevance_score - a.relevance_score)
    .slice(0, 10);
}

export const HyperstitionService = {
  calculateHyperstitionScore,
  linkNewsToMarket,
};

export default HyperstitionService;
