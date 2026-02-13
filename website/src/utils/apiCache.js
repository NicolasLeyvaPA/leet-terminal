/**
 * API Cache and Rate Limiting Utilities
 *
 * Provides in-memory caching with TTL and request throttling
 * to improve performance and prevent rate limit issues.
 */

import logger from './logger';

// Cache storage
const cache = new Map();
const DEFAULT_TTL = 30 * 1000; // 30 seconds
const MAX_CACHE_SIZE = 500; // Max entries

// Rate limiter storage
const requestTimes = new Map();
const MIN_REQUEST_INTERVAL = 500; // 500ms between same-endpoint calls

/**
 * Get cached data if valid
 * @param {string} key - Cache key
 * @returns {any|null} Cached data or null if expired/missing
 */
export function getCached(key) {
  const entry = cache.get(key);
  if (!entry) return null;
  
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  
  return entry.data;
}

/**
 * Set cache entry with TTL
 * @param {string} key - Cache key
 * @param {any} data - Data to cache
 * @param {number} ttl - Time to live in ms (default 30s)
 */
export function setCache(key, data, ttl = DEFAULT_TTL) {
  // Evict oldest entries if cache is full
  if (cache.size >= MAX_CACHE_SIZE) {
    const oldestKey = cache.keys().next().value;
    cache.delete(oldestKey);
  }
  
  cache.set(key, {
    data,
    expiresAt: Date.now() + ttl,
    cachedAt: Date.now(),
  });
}

/**
 * Clear specific cache entry or all entries
 * @param {string} [key] - Specific key to clear, or omit to clear all
 */
export function clearCache(key) {
  if (key) {
    cache.delete(key);
  } else {
    cache.clear();
  }
}

/**
 * Check if we can make a request (rate limiting)
 * @param {string} endpoint - Endpoint identifier
 * @param {number} minInterval - Min ms between calls (default 500ms)
 * @returns {boolean} True if request is allowed
 */
export function canRequest(endpoint, minInterval = MIN_REQUEST_INTERVAL) {
  const now = Date.now();
  const lastRequest = requestTimes.get(endpoint) || 0;
  
  if (now - lastRequest < minInterval) {
    return false;
  }
  
  requestTimes.set(endpoint, now);
  return true;
}

/**
 * Wait until request is allowed
 * @param {string} endpoint - Endpoint identifier
 * @param {number} minInterval - Min ms between calls
 * @returns {Promise<void>}
 */
export async function waitForRateLimit(endpoint, minInterval = MIN_REQUEST_INTERVAL) {
  const now = Date.now();
  const lastRequest = requestTimes.get(endpoint) || 0;
  const waitTime = Math.max(0, minInterval - (now - lastRequest));
  
  if (waitTime > 0) {
    await new Promise(resolve => setTimeout(resolve, waitTime));
  }
  
  requestTimes.set(endpoint, Date.now());
}

/**
 * Fetch with caching
 * @param {string} url - URL to fetch
 * @param {object} options - Fetch options
 * @param {number} cacheTtl - Cache TTL in ms
 * @returns {Promise<any>} Response data
 */
export async function fetchWithCache(url, options = {}, cacheTtl = DEFAULT_TTL) {
  const cacheKey = `${options.method || 'GET'}:${url}`;
  
  // Check cache first
  const cached = getCached(cacheKey);
  if (cached !== null) {
    return cached;
  }
  
  // Wait for rate limit
  const endpoint = new URL(url).hostname;
  await waitForRateLimit(endpoint);
  
  // Fetch
  const response = await fetch(url, options);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
  
  const data = await response.json();
  
  // Cache successful response
  setCache(cacheKey, data, cacheTtl);
  
  return data;
}

/**
 * Create a debounced function
 * @param {Function} fn - Function to debounce
 * @param {number} delay - Delay in ms
 * @returns {Function} Debounced function
 */
export function debounce(fn, delay = 300) {
  let timeoutId;
  return function (...args) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn.apply(this, args), delay);
  };
}

/**
 * Create a throttled function
 * @param {Function} fn - Function to throttle
 * @param {number} limit - Min ms between calls
 * @returns {Function} Throttled function
 */
export function throttle(fn, limit = 1000) {
  let inThrottle = false;
  return function (...args) {
    if (!inThrottle) {
      fn.apply(this, args);
      inThrottle = true;
      setTimeout(() => { inThrottle = false; }, limit);
    }
  };
}

/**
 * Batch multiple requests with deduplication
 * @param {string[]} urls - Array of URLs to fetch
 * @param {object} options - Fetch options
 * @param {number} cacheTtl - Cache TTL in ms
 * @returns {Promise<Map<string, any>>} Map of url -> data
 */
export async function fetchBatch(urls, options = {}, cacheTtl = DEFAULT_TTL) {
  const results = new Map();
  const uncached = [];
  
  // Check cache for each URL
  for (const url of urls) {
    const cacheKey = `${options.method || 'GET'}:${url}`;
    const cached = getCached(cacheKey);
    if (cached !== null) {
      results.set(url, cached);
    } else {
      uncached.push(url);
    }
  }
  
  // Fetch uncached in parallel with rate limiting
  if (uncached.length > 0) {
    const BATCH_SIZE = 5; // Max parallel requests
    for (let i = 0; i < uncached.length; i += BATCH_SIZE) {
      const batch = uncached.slice(i, i + BATCH_SIZE);
      const promises = batch.map(async (url) => {
        try {
          const data = await fetchWithCache(url, options, cacheTtl);
          results.set(url, data);
        } catch (error) {
          logger.warn(`Batch fetch failed for ${url}:`, error.message);
          results.set(url, null);
        }
      });
      await Promise.all(promises);
    }
  }
  
  return results;
}

// Cache stats for debugging
export function getCacheStats() {
  let validEntries = 0;
  let expiredEntries = 0;
  const now = Date.now();
  
  for (const [_key, entry] of cache.entries()) {
    if (now > entry.expiresAt) {
      expiredEntries++;
    } else {
      validEntries++;
    }
  }
  
  return {
    totalEntries: cache.size,
    validEntries,
    expiredEntries,
    maxSize: MAX_CACHE_SIZE,
  };
}
