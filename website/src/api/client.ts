/**
 * Central API Client
 *
 * Handles all API communication with freshness tracking.
 * Designed to work with TanStack Query for caching and refetching.
 */

import type {
  MarketSummary,
  OrderbookSnapshot,
  MarketHistory,
  NewsFeed,
  HyperstitionScore,
  HealthResponse,
  DataFreshness,
} from '@leet-terminal/shared/contracts';

// API configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api/v1';

// Default request timeout
const DEFAULT_TIMEOUT = 15000;

/**
 * API Response wrapper
 */
interface ApiResponse<T> {
  success: boolean;
  data: T | null;
  freshness: DataFreshness;
  errors?: Array<{ code: string; message: string; source?: string }>;
  request_id?: string;
}

/**
 * Custom error class for API errors
 */
export class ApiError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number,
    public source?: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * Fetch wrapper with timeout and error handling
 */
async function fetchWithTimeout<T>(
  url: string,
  options: RequestInit = {},
  timeout: number = DEFAULT_TIMEOUT
): Promise<ApiResponse<T>> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...options.headers,
      },
    });

    clearTimeout(timeoutId);

    const data: ApiResponse<T> = await response.json();

    if (!response.ok) {
      const error = data.errors?.[0];
      throw new ApiError(
        error?.message || `HTTP ${response.status}`,
        error?.code || 'HTTP_ERROR',
        response.status,
        error?.source
      );
    }

    return data;
  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof ApiError) {
      throw error;
    }

    if ((error as Error).name === 'AbortError') {
      throw new ApiError('Request timeout', 'TIMEOUT', 408);
    }

    throw new ApiError(
      (error as Error).message || 'Network error',
      'NETWORK_ERROR',
      0
    );
  }
}

/**
 * API Client methods
 */
export const apiClient = {
  /**
   * Fetch all markets
   */
  async getMarkets(params?: {
    limit?: number;
    platform?: 'kalshi' | 'polymarket' | 'all';
    category?: string;
  }): Promise<ApiResponse<MarketSummary[]>> {
    const searchParams = new URLSearchParams();
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    if (params?.platform) searchParams.set('platform', params.platform);
    if (params?.category) searchParams.set('category', params.category);

    const queryString = searchParams.toString();
    const url = `${API_BASE_URL}/markets${queryString ? `?${queryString}` : ''}`;

    return fetchWithTimeout<MarketSummary[]>(url);
  },

  /**
   * Fetch single market by ID
   */
  async getMarket(id: string): Promise<ApiResponse<MarketSummary>> {
    return fetchWithTimeout<MarketSummary>(`${API_BASE_URL}/markets/${encodeURIComponent(id)}`);
  },

  /**
   * Fetch orderbook for a market
   */
  async getOrderbook(marketId: string): Promise<ApiResponse<OrderbookSnapshot>> {
    return fetchWithTimeout<OrderbookSnapshot>(
      `${API_BASE_URL}/markets/${encodeURIComponent(marketId)}/orderbook`
    );
  },

  /**
   * Fetch price history for a market
   */
  async getPriceHistory(
    marketId: string,
    days?: number
  ): Promise<ApiResponse<MarketHistory>> {
    const searchParams = new URLSearchParams();
    if (days) searchParams.set('days', days.toString());

    const queryString = searchParams.toString();
    const url = `${API_BASE_URL}/markets/${encodeURIComponent(marketId)}/history${
      queryString ? `?${queryString}` : ''
    }`;

    return fetchWithTimeout<MarketHistory>(url);
  },

  /**
   * Fetch news feed
   */
  async getNews(params?: {
    limit?: number;
    marketId?: string;
  }): Promise<ApiResponse<NewsFeed>> {
    const searchParams = new URLSearchParams();
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    if (params?.marketId) searchParams.set('market_id', params.marketId);

    const queryString = searchParams.toString();
    const url = `${API_BASE_URL}/news${queryString ? `?${queryString}` : ''}`;

    return fetchWithTimeout<NewsFeed>(url);
  },

  /**
   * Fetch hyperstition score for a market
   */
  async getHyperstition(marketId: string): Promise<ApiResponse<HyperstitionScore>> {
    return fetchWithTimeout<HyperstitionScore>(
      `${API_BASE_URL}/markets/${encodeURIComponent(marketId)}/hyperstition`
    );
  },

  /**
   * Fetch health status
   */
  async getHealth(): Promise<HealthResponse> {
    const response = await fetch(`${API_BASE_URL}/health`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });
    return response.json();
  },

  /**
   * Fetch detailed status
   */
  async getStatus(): Promise<HealthResponse> {
    const response = await fetch(`${API_BASE_URL}/status`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });
    return response.json();
  },
};

/**
 * Helper to check if data is stale based on freshness metadata
 */
export function isStale(freshness: DataFreshness | undefined): boolean {
  if (!freshness) return true;
  const fetchedAt = new Date(freshness.fetched_at).getTime();
  const ageSeconds = (Date.now() - fetchedAt) / 1000;
  return ageSeconds > freshness.ttl_seconds;
}

/**
 * Helper to get data age in seconds
 */
export function getDataAge(freshness: DataFreshness | undefined): number {
  if (!freshness) return Infinity;
  const fetchedAt = new Date(freshness.fetched_at).getTime();
  return Math.floor((Date.now() - fetchedAt) / 1000);
}

/**
 * Format data age for display
 */
export function formatDataAge(freshness: DataFreshness | undefined): string {
  const age = getDataAge(freshness);
  if (age === Infinity) return 'Unknown';
  if (age < 5) return 'Just now';
  if (age < 60) return `${age}s ago`;
  if (age < 3600) return `${Math.floor(age / 60)}m ago`;
  return `${Math.floor(age / 3600)}h ago`;
}

export default apiClient;
