/**
 * React Query hooks for market data
 *
 * Provides cached, auto-refreshing access to market data with freshness tracking.
 */

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient, isStale } from '../api/client';
import type { MarketSummary, DataFreshness } from '@leet-terminal/shared/contracts';

// Query key factory
export const marketKeys = {
  all: ['markets'] as const,
  lists: () => [...marketKeys.all, 'list'] as const,
  list: (filters: { limit?: number; platform?: string; category?: string }) =>
    [...marketKeys.lists(), filters] as const,
  details: () => [...marketKeys.all, 'detail'] as const,
  detail: (id: string) => [...marketKeys.details(), id] as const,
  orderbook: (id: string) => [...marketKeys.all, 'orderbook', id] as const,
  history: (id: string, days?: number) =>
    [...marketKeys.all, 'history', id, days] as const,
  hyperstition: (id: string) => [...marketKeys.all, 'hyperstition', id] as const,
};

interface UseMarketsOptions {
  limit?: number;
  platform?: 'kalshi' | 'polymarket' | 'all';
  category?: string;
  refetchInterval?: number;
  enabled?: boolean;
}

interface UseMarketsResult {
  markets: MarketSummary[];
  freshness: DataFreshness | undefined;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  isStale: boolean;
  refetch: () => void;
}

/**
 * Hook to fetch and cache market list
 */
export function useMarkets(options: UseMarketsOptions = {}): UseMarketsResult {
  const {
    limit = 50,
    platform = 'all',
    category,
    refetchInterval = 60000, // 1 minute default
    enabled = true,
  } = options;

  const query = useQuery({
    queryKey: marketKeys.list({ limit, platform, category }),
    queryFn: async () => {
      const response = await apiClient.getMarkets({ limit, platform, category });
      if (!response.success || !response.data) {
        throw new Error(response.errors?.[0]?.message || 'Failed to fetch markets');
      }
      return response;
    },
    staleTime: 30000, // Consider data stale after 30s
    gcTime: 300000, // Keep in cache for 5 minutes
    refetchInterval: enabled ? refetchInterval : false,
    refetchOnWindowFocus: true,
    enabled,
  });

  return {
    markets: query.data?.data || [],
    freshness: query.data?.freshness,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    isStale: query.data?.freshness ? isStale(query.data.freshness) : false,
    refetch: query.refetch,
  };
}

/**
 * Hook to fetch single market details
 */
export function useMarket(id: string | null, options: { enabled?: boolean } = {}) {
  const { enabled = true } = options;

  const query = useQuery({
    queryKey: marketKeys.detail(id || ''),
    queryFn: async () => {
      if (!id) throw new Error('No market ID');
      const response = await apiClient.getMarket(id);
      if (!response.success || !response.data) {
        throw new Error(response.errors?.[0]?.message || 'Market not found');
      }
      return response;
    },
    staleTime: 30000,
    gcTime: 300000,
    enabled: enabled && !!id,
  });

  return {
    market: query.data?.data || null,
    freshness: query.data?.freshness,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}

/**
 * Hook to fetch orderbook
 */
export function useOrderbook(
  marketId: string | null,
  options: { refetchInterval?: number; enabled?: boolean } = {}
) {
  const { refetchInterval = 15000, enabled = true } = options;

  const query = useQuery({
    queryKey: marketKeys.orderbook(marketId || ''),
    queryFn: async () => {
      if (!marketId) throw new Error('No market ID');
      const response = await apiClient.getOrderbook(marketId);
      if (!response.success || !response.data) {
        throw new Error(response.errors?.[0]?.message || 'Orderbook not found');
      }
      return response;
    },
    staleTime: 5000,
    gcTime: 60000,
    refetchInterval: enabled ? refetchInterval : false,
    enabled: enabled && !!marketId,
  });

  return {
    orderbook: query.data?.data || null,
    freshness: query.data?.freshness,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}

/**
 * Hook to fetch price history
 */
export function usePriceHistory(
  marketId: string | null,
  days: number = 90,
  options: { enabled?: boolean } = {}
) {
  const { enabled = true } = options;

  const query = useQuery({
    queryKey: marketKeys.history(marketId || '', days),
    queryFn: async () => {
      if (!marketId) throw new Error('No market ID');
      const response = await apiClient.getPriceHistory(marketId, days);
      if (!response.success || !response.data) {
        throw new Error(response.errors?.[0]?.message || 'History not found');
      }
      return response;
    },
    staleTime: 300000, // 5 minutes
    gcTime: 600000, // 10 minutes
    enabled: enabled && !!marketId,
  });

  return {
    history: query.data?.data?.points || [],
    freshness: query.data?.freshness,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}

/**
 * Hook to fetch hyperstition score
 */
export function useHyperstition(
  marketId: string | null,
  options: { refetchInterval?: number; enabled?: boolean } = {}
) {
  const { refetchInterval = 60000, enabled = true } = options;

  const query = useQuery({
    queryKey: marketKeys.hyperstition(marketId || ''),
    queryFn: async () => {
      if (!marketId) throw new Error('No market ID');
      const response = await apiClient.getHyperstition(marketId);
      if (!response.success || !response.data) {
        throw new Error(response.errors?.[0]?.message || 'Hyperstition data not found');
      }
      return response;
    },
    staleTime: 30000,
    gcTime: 120000,
    refetchInterval: enabled ? refetchInterval : false,
    enabled: enabled && !!marketId,
  });

  return {
    hyperstition: query.data?.data || null,
    freshness: query.data?.freshness,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}

/**
 * Hook for manual refresh controls
 */
export function useRefreshControls() {
  const queryClient = useQueryClient();

  return {
    refreshAll: () => {
      queryClient.invalidateQueries({ queryKey: marketKeys.all });
    },
    refreshMarkets: () => {
      queryClient.invalidateQueries({ queryKey: marketKeys.lists() });
    },
    refreshMarket: (id: string) => {
      queryClient.invalidateQueries({ queryKey: marketKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: marketKeys.orderbook(id) });
      queryClient.invalidateQueries({ queryKey: marketKeys.history(id) });
    },
  };
}
