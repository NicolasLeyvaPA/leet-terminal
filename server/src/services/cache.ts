/**
 * In-memory cache service with TTL and freshness tracking
 */

import NodeCache from 'node-cache';
import { DataFreshness, createFreshness } from '@leet-terminal/shared/contracts';

interface CacheEntry<T> {
  data: T;
  freshness: DataFreshness;
}

interface CacheStats {
  size: number;
  hitRate: number;
  hits: number;
  misses: number;
}

export class CacheService {
  private cache: NodeCache;
  private stats: { hits: number; misses: number };

  constructor(defaultTtlSeconds: number = 30) {
    this.cache = new NodeCache({
      stdTTL: defaultTtlSeconds,
      checkperiod: 10,
      useClones: false, // Better performance for read-heavy workloads
    });
    this.stats = { hits: 0, misses: 0 };
  }

  /**
   * Get item from cache with freshness metadata
   */
  get<T>(key: string): CacheEntry<T> | null {
    const entry = this.cache.get<CacheEntry<T>>(key);
    if (entry) {
      this.stats.hits++;
      // Update is_stale flag based on current time
      const ageSeconds = (Date.now() - new Date(entry.freshness.fetched_at).getTime()) / 1000;
      entry.freshness.is_stale = ageSeconds > entry.freshness.ttl_seconds;
      entry.freshness.cache_hit = true;
      return entry;
    }
    this.stats.misses++;
    return null;
  }

  /**
   * Set item in cache with freshness metadata
   */
  set<T>(
    key: string,
    data: T,
    source: DataFreshness['source'],
    ttlSeconds: number,
    partial: boolean = false,
    sourcesStatus?: DataFreshness['sources_status']
  ): void {
    const entry: CacheEntry<T> = {
      data,
      freshness: createFreshness(source, ttlSeconds, false, partial, sourcesStatus),
    };
    this.cache.set(key, entry, ttlSeconds);
  }

  /**
   * Delete item from cache
   */
  delete(key: string): void {
    this.cache.del(key);
  }

  /**
   * Invalidate cache entries matching a pattern
   */
  invalidatePattern(pattern: RegExp): number {
    const keys = this.cache.keys();
    let deleted = 0;
    for (const key of keys) {
      if (pattern.test(key)) {
        this.cache.del(key);
        deleted++;
      }
    }
    return deleted;
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    const total = this.stats.hits + this.stats.misses;
    return {
      size: this.cache.keys().length,
      hitRate: total > 0 ? this.stats.hits / total : 0,
      hits: this.stats.hits,
      misses: this.stats.misses,
    };
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.flushAll();
    this.stats = { hits: 0, misses: 0 };
  }
}

// Singleton instance with TTL configurations
export const cacheService = new CacheService(30);

// TTL constants for different data types
export const CACHE_TTL = {
  MARKETS: 30,
  ORDERBOOK: 10,
  PRICE_HISTORY: 300,
  NEWS: 300,
  HYPERSTITION: 60,
} as const;
