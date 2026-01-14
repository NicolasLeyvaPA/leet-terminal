/**
 * SSE Stream Hook
 *
 * React hook for real-time streaming via Server-Sent Events.
 * Features:
 * - Automatic reconnection with exponential backoff + jitter
 * - Integration with React Query cache for live updates
 * - Channel subscription management
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { StreamEvent, SubscriptionTier } from '@leet-terminal/shared/contracts';
import { marketKeys } from './useMarkets';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// Reconnection config
const RECONNECT_CONFIG = {
  baseDelayMs: 1000,
  maxDelayMs: 30000,
  multiplier: 2,
  jitterFactor: 0.1,
};

interface UseSSEStreamOptions {
  tier?: SubscriptionTier;
  initialChannels?: string[];
  enabled?: boolean;
  onEvent?: (event: StreamEvent) => void;
  onError?: (error: Error) => void;
}

interface UseSSEStreamResult {
  isConnected: boolean;
  clientId: string | null;
  subscribedChannels: string[];
  subscribe: (channels: string[]) => Promise<void>;
  unsubscribe: (channels: string[]) => Promise<void>;
  connectionError: string | null;
}

export function useSSEStream(options: UseSSEStreamOptions = {}): UseSSEStreamResult {
  const {
    tier = 'free',
    initialChannels = [],
    enabled = true,
    onEvent,
    onError,
  } = options;

  const [isConnected, setIsConnected] = useState(false);
  const [clientId, setClientId] = useState<string | null>(null);
  const [subscribedChannels, setSubscribedChannels] = useState<string[]>([]);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectAttemptRef = useRef(0);
  const reconnectTimeoutRef = useRef<number | null>(null);

  const queryClient = useQueryClient();

  /**
   * Handle incoming SSE event
   */
  const handleEvent = useCallback((event: MessageEvent) => {
    try {
      const data = JSON.parse(event.data) as StreamEvent;

      // Call custom event handler
      onEvent?.(data);

      // Update React Query cache based on event type
      if (data.type === 'price_update') {
        const payload = data.payload as { market_id: string; price: number; best_bid?: number; best_ask?: number };

        // Update market in cache
        queryClient.setQueriesData(
          { queryKey: marketKeys.details() },
          (oldData: unknown) => {
            if (!oldData || typeof oldData !== 'object') return oldData;

            const response = oldData as { data?: { id: string; market_prob?: number; best_bid?: number; best_ask?: number } };
            if (response.data?.id === payload.market_id) {
              return {
                ...response,
                data: {
                  ...response.data,
                  market_prob: payload.price,
                  best_bid: payload.best_bid ?? response.data.best_bid,
                  best_ask: payload.best_ask ?? response.data.best_ask,
                },
              };
            }
            return oldData;
          }
        );
      }
    } catch (err) {
      console.warn('[SSE] Failed to parse event:', err);
    }
  }, [onEvent, queryClient]);

  /**
   * Connect to SSE stream
   */
  const connect = useCallback(() => {
    if (!enabled || eventSourceRef.current) return;

    const channelParam = initialChannels.length > 0
      ? `channels=${encodeURIComponent(initialChannels.join(','))}`
      : '';
    const tierParam = `tier=${tier}`;
    const params = [channelParam, tierParam].filter(Boolean).join('&');
    const url = `${API_BASE}/api/v1/stream?${params}`;

    console.log('[SSE] Connecting to:', url);

    const eventSource = new EventSource(url);
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      console.log('[SSE] Connected');
      setIsConnected(true);
      setConnectionError(null);
      reconnectAttemptRef.current = 0;
    };

    eventSource.addEventListener('subscription_ack', (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        if (data.message === 'connected') {
          // Extract client ID from the connection (if sent)
          // For now, generate a local one
          setClientId(crypto.randomUUID());
          setSubscribedChannels(initialChannels);
        }
      } catch {
        // Ignore parse errors for ack
      }
    });

    eventSource.addEventListener('price_update', handleEvent);
    eventSource.addEventListener('orderbook_delta', handleEvent);
    eventSource.addEventListener('orderbook_snapshot', handleEvent);
    eventSource.addEventListener('trade', handleEvent);
    eventSource.addEventListener('market_status', handleEvent);

    eventSource.addEventListener('heartbeat', () => {
      // Heartbeat received - connection is alive
    });

    eventSource.addEventListener('error', (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        console.error('[SSE] Server error:', data.message);
        setConnectionError(data.message);
        onError?.(new Error(data.message));
      } catch {
        // Non-JSON error
      }
    });

    eventSource.onerror = () => {
      console.warn('[SSE] Connection error');
      setIsConnected(false);
      eventSource.close();
      eventSourceRef.current = null;

      // Schedule reconnect
      scheduleReconnect();
    };
  }, [enabled, tier, initialChannels, handleEvent, onError]);

  /**
   * Schedule reconnection with exponential backoff
   */
  const scheduleReconnect = useCallback(() => {
    if (!enabled) return;

    reconnectAttemptRef.current++;
    const delay = Math.min(
      RECONNECT_CONFIG.baseDelayMs * Math.pow(RECONNECT_CONFIG.multiplier, reconnectAttemptRef.current - 1),
      RECONNECT_CONFIG.maxDelayMs
    );

    // Add jitter
    const jitter = delay * RECONNECT_CONFIG.jitterFactor * (Math.random() * 2 - 1);
    const finalDelay = Math.round(delay + jitter);

    console.log(`[SSE] Scheduling reconnect in ${finalDelay}ms (attempt ${reconnectAttemptRef.current})`);

    reconnectTimeoutRef.current = window.setTimeout(() => {
      connect();
    }, finalDelay);
  }, [enabled, connect]);

  /**
   * Disconnect from SSE stream
   */
  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    setIsConnected(false);
    setClientId(null);
    setSubscribedChannels([]);
  }, []);

  /**
   * Subscribe to additional channels
   */
  const subscribe = useCallback(async (channels: string[]) => {
    if (!clientId) {
      throw new Error('Not connected');
    }

    const response = await fetch(`${API_BASE}/api/v1/stream/subscribe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clientId,
        channels,
        action: 'subscribe',
        tier,
      }),
    });

    const result = await response.json();

    if (result.success) {
      setSubscribedChannels(result.currentChannels || []);
    } else {
      throw new Error(result.errors?.[0] || 'Subscription failed');
    }
  }, [clientId, tier]);

  /**
   * Unsubscribe from channels
   */
  const unsubscribe = useCallback(async (channels: string[]) => {
    if (!clientId) {
      throw new Error('Not connected');
    }

    const response = await fetch(`${API_BASE}/api/v1/stream/subscribe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clientId,
        channels,
        action: 'unsubscribe',
      }),
    });

    const result = await response.json();

    if (result.success) {
      setSubscribedChannels(result.currentChannels || []);
    } else {
      throw new Error(result.errors?.[0] || 'Unsubscription failed');
    }
  }, [clientId]);

  // Connect on mount, disconnect on unmount
  useEffect(() => {
    if (enabled) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [enabled, connect, disconnect]);

  return {
    isConnected,
    clientId,
    subscribedChannels,
    subscribe,
    unsubscribe,
    connectionError,
  };
}

/**
 * Helper to build channel strings
 */
export function buildChannel(
  type: 'price' | 'orderbook' | 'trade',
  platform: 'polymarket' | 'kalshi',
  marketId: string
): string {
  const prefix = platform === 'polymarket' ? 'pm' : 'kalshi';
  return `${type}:${prefix}-${marketId}`;
}

/**
 * Helper to parse channel strings
 */
export function parseChannel(channel: string): {
  type: 'price' | 'orderbook' | 'trade';
  platform: 'polymarket' | 'kalshi';
  marketId: string;
} | null {
  const match = channel.match(/^(price|orderbook|trade):(pm|kalshi)-(.+)$/);
  if (!match) return null;

  return {
    type: match[1] as 'price' | 'orderbook' | 'trade',
    platform: match[2] === 'pm' ? 'polymarket' : 'kalshi',
    marketId: match[3],
  };
}
