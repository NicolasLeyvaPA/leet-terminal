/**
 * Markets API Routes
 *
 * Endpoints for market data from Kalshi and Polymarket
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import type { MarketSummary, DataFreshness } from '@leet-terminal/shared/contracts';
import { createFreshness } from '@leet-terminal/shared/contracts';
import { PolymarketConnector } from '../connectors/polymarket.js';
import { KalshiConnector } from '../connectors/kalshi.js';
import { cacheService, CACHE_TTL } from '../services/cache.js';

interface MarketsQuery {
  limit?: string;
  platform?: 'kalshi' | 'polymarket' | 'all';
  category?: string;
}

interface MarketParams {
  id: string;
}

interface HistoryQuery {
  days?: string;
}

/**
 * Combine markets from multiple sources with graceful degradation
 */
async function fetchAllMarkets(
  limit: number,
  platform: 'kalshi' | 'polymarket' | 'all'
): Promise<{ markets: MarketSummary[]; freshness: DataFreshness }> {
  const results: MarketSummary[] = [];
  const sourcesStatus: Record<string, 'ok' | 'error' | 'timeout' | 'rate_limited'> = {};
  let partial = false;

  // Fetch from selected platforms
  const fetchers: Promise<{ markets: MarketSummary[]; freshness: DataFreshness }>[] = [];

  if (platform === 'all' || platform === 'polymarket') {
    fetchers.push(
      PolymarketConnector.fetchOpenEvents(limit).then((result) => {
        sourcesStatus.polymarket = result.freshness.sources_status?.polymarket || 'ok';
        return result;
      })
    );
  }

  if (platform === 'all' || platform === 'kalshi') {
    fetchers.push(
      KalshiConnector.fetchMarkets(limit).then((result) => {
        sourcesStatus.kalshi = result.freshness.sources_status?.kalshi || 'ok';
        return result;
      })
    );
  }

  // Wait for all fetchers (Promise.allSettled for graceful degradation)
  const settled = await Promise.allSettled(fetchers);

  for (const result of settled) {
    if (result.status === 'fulfilled') {
      results.push(...result.value.markets);
      if (result.value.freshness.partial) {
        partial = true;
      }
    } else {
      partial = true;
    }
  }

  // Sort by volume
  results.sort((a, b) => b.volume_24h - a.volume_24h);

  // Limit total results
  const limitedResults = results.slice(0, limit);

  return {
    markets: limitedResults,
    freshness: createFreshness(
      'computed',
      CACHE_TTL.MARKETS,
      false,
      partial,
      sourcesStatus
    ),
  };
}

export async function marketsRoutes(fastify: FastifyInstance): Promise<void> {
  /**
   * GET /api/v1/markets
   * Fetch all markets from configured sources
   */
  fastify.get<{ Querystring: MarketsQuery }>(
    '/markets',
    async (request, reply) => {
      const { limit = '50', platform = 'all', category } = request.query;
      const limitNum = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 200);

      const cacheKey = `markets:${platform}:${limitNum}`;

      // Check cache
      const cached = cacheService.get<MarketSummary[]>(cacheKey);
      if (cached && !cached.freshness.is_stale) {
        request.log.info({ cacheHit: true }, 'Serving markets from cache');
        let markets = cached.data;

        // Filter by category if specified
        if (category) {
          markets = markets.filter(
            (m) => m.category.toLowerCase() === category.toLowerCase()
          );
        }

        return reply.send({
          success: true,
          data: markets,
          freshness: cached.freshness,
        });
      }

      // Fetch fresh data
      request.log.info({ cacheHit: false }, 'Fetching fresh market data');
      const { markets, freshness } = await fetchAllMarkets(limitNum, platform as any);

      // Cache the results
      if (markets.length > 0) {
        cacheService.set(cacheKey, markets, 'computed', CACHE_TTL.MARKETS, freshness.partial);
      }

      // Filter by category if specified
      let filteredMarkets = markets;
      if (category) {
        filteredMarkets = markets.filter(
          (m) => m.category.toLowerCase() === category.toLowerCase()
        );
      }

      return reply.send({
        success: true,
        data: filteredMarkets,
        freshness,
        request_id: request.id,
      });
    }
  );

  /**
   * GET /api/v1/markets/:id
   * Fetch a single market by ID
   */
  fastify.get<{ Params: MarketParams }>(
    '/markets/:id',
    async (request, reply) => {
      const { id } = request.params;
      const cacheKey = `market:${id}`;

      // Check cache
      const cached = cacheService.get<MarketSummary>(cacheKey);
      if (cached && !cached.freshness.is_stale) {
        return reply.send({
          success: true,
          data: cached.data,
          freshness: cached.freshness,
        });
      }

      // Determine platform from ID prefix
      let market: MarketSummary | null = null;
      let freshness: DataFreshness;

      if (id.startsWith('kalshi-')) {
        // Kalshi market - would need individual fetch endpoint
        // For now, fetch all and filter
        const { markets, freshness: f } = await KalshiConnector.fetchMarkets(100);
        market = markets.find((m) => m.id === id) || null;
        freshness = f;
      } else {
        // Assume Polymarket - try to fetch by slug
        const slug = id; // ID could be slug
        const { market: m, freshness: f } = await PolymarketConnector.fetchEventBySlug(slug);
        market = m;
        freshness = f;
      }

      if (!market) {
        return reply.status(404).send({
          success: false,
          data: null,
          freshness: createFreshness('computed', 0),
          errors: [{ code: 'NOT_FOUND', message: `Market ${id} not found` }],
        });
      }

      // Cache the result
      cacheService.set(cacheKey, market, market.platform.toLowerCase() as any, CACHE_TTL.MARKETS);

      return reply.send({
        success: true,
        data: market,
        freshness,
        request_id: request.id,
      });
    }
  );

  /**
   * GET /api/v1/markets/:id/orderbook
   * Fetch orderbook for a market
   */
  fastify.get<{ Params: MarketParams }>(
    '/markets/:id/orderbook',
    async (request, reply) => {
      const { id } = request.params;
      const cacheKey = `orderbook:${id}`;

      // Check cache
      const cached = cacheService.get(cacheKey);
      if (cached && !cached.freshness.is_stale) {
        return reply.send({
          success: true,
          data: cached.data,
          freshness: cached.freshness,
        });
      }

      // Fetch orderbook based on platform
      let result;
      if (id.startsWith('kalshi-')) {
        const ticker = id.replace('kalshi-', '');
        result = await KalshiConnector.fetchOrderbook(ticker);
      } else {
        // For Polymarket, we need the token ID
        // This would typically come from the market data
        // For now, use the ID directly
        result = await PolymarketConnector.fetchOrderbook(id);
      }

      if (!result.orderbook) {
        return reply.status(404).send({
          success: false,
          data: null,
          freshness: result.freshness,
          errors: [{ code: 'NOT_FOUND', message: `Orderbook for ${id} not found` }],
        });
      }

      // Cache the result
      cacheService.set(cacheKey, result.orderbook, 'computed', CACHE_TTL.ORDERBOOK);

      return reply.send({
        success: true,
        data: result.orderbook,
        freshness: result.freshness,
        request_id: request.id,
      });
    }
  );

  /**
   * GET /api/v1/markets/:id/history
   * Fetch price history for a market
   */
  fastify.get<{ Params: MarketParams; Querystring: HistoryQuery }>(
    '/markets/:id/history',
    async (request, reply) => {
      const { id } = request.params;
      const { days = '90' } = request.query;
      const daysNum = Math.min(Math.max(parseInt(days, 10) || 90, 1), 365);
      const cacheKey = `history:${id}:${daysNum}`;

      // Check cache
      const cached = cacheService.get(cacheKey);
      if (cached && !cached.freshness.is_stale) {
        return reply.send({
          success: true,
          data: {
            market_id: id,
            points: cached.data,
            freshness: cached.freshness,
          },
          freshness: cached.freshness,
        });
      }

      // Fetch history based on platform
      let result;
      if (id.startsWith('kalshi-')) {
        const ticker = id.replace('kalshi-', '');
        result = await KalshiConnector.fetchPriceHistory(ticker, daysNum);
      } else {
        result = await PolymarketConnector.fetchPriceHistory(id, daysNum);
      }

      // Cache the result
      if (result.history.length > 0) {
        cacheService.set(cacheKey, result.history, 'computed', CACHE_TTL.PRICE_HISTORY);
      }

      return reply.send({
        success: true,
        data: {
          market_id: id,
          points: result.history,
          freshness: result.freshness,
        },
        freshness: result.freshness,
        request_id: request.id,
      });
    }
  );
}

export default marketsRoutes;
