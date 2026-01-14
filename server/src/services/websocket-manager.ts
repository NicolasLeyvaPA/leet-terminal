/**
 * WebSocket Manager Service
 *
 * Manages persistent WebSocket connections to upstream providers (Polymarket CLOB, Kalshi).
 * Features:
 * - Automatic reconnection with exponential backoff
 * - Message normalization per provider
 * - EventEmitter for internal pub/sub
 * - Health monitoring and circuit breaker
 */

import { EventEmitter } from 'events';
import WebSocket from 'ws';
import type { StreamEvent } from '@leet-terminal/shared/contracts';

// WebSocket endpoints
const POLYMARKET_WS = 'wss://ws-subscriptions-clob.polymarket.com/ws/market';
const KALSHI_WS = 'wss://api.elections.kalshi.com/trade-api/ws/v2';

// Reconnection config
const RECONNECT_CONFIG = {
  baseDelayMs: 1000,
  maxDelayMs: 30000,
  multiplier: 2,
  jitterFactor: 0.1,
};

// Connection states
type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'reconnecting';

interface ProviderConnection {
  ws: WebSocket | null;
  state: ConnectionState;
  reconnectAttempts: number;
  lastConnected: number | null;
  lastError: string | null;
  subscriptions: Set<string>;
}

type ProviderType = 'polymarket' | 'kalshi';

export class WebSocketManager extends EventEmitter {
  private connections: Map<ProviderType, ProviderConnection> = new Map();
  private messageQueue: Map<string, StreamEvent[]> = new Map();
  private isShuttingDown = false;

  constructor() {
    super();
    this.initializeConnections();
  }

  private initializeConnections(): void {
    this.connections.set('polymarket', {
      ws: null,
      state: 'disconnected',
      reconnectAttempts: 0,
      lastConnected: null,
      lastError: null,
      subscriptions: new Set(),
    });

    this.connections.set('kalshi', {
      ws: null,
      state: 'disconnected',
      reconnectAttempts: 0,
      lastConnected: null,
      lastError: null,
      subscriptions: new Set(),
    });
  }

  /**
   * Connect to a provider's WebSocket
   */
  async connect(provider: ProviderType): Promise<void> {
    const conn = this.connections.get(provider);
    if (!conn) return;

    if (conn.state === 'connected' || conn.state === 'connecting') {
      return;
    }

    conn.state = 'connecting';
    const url = provider === 'polymarket' ? POLYMARKET_WS : KALSHI_WS;

    try {
      const ws = new WebSocket(url, {
        headers: this.getHeaders(provider),
      });

      ws.on('open', () => {
        console.log(`[WS-Manager] Connected to ${provider}`);
        conn.state = 'connected';
        conn.ws = ws;
        conn.reconnectAttempts = 0;
        conn.lastConnected = Date.now();
        conn.lastError = null;

        // Resubscribe to any existing subscriptions
        this.resubscribe(provider);
        this.emit('connected', { provider });
      });

      ws.on('message', (data: Buffer) => {
        try {
          const message = JSON.parse(data.toString());
          this.handleMessage(provider, message);
        } catch (err) {
          console.warn(`[WS-Manager] Failed to parse message from ${provider}:`, err);
        }
      });

      ws.on('close', (code, reason) => {
        console.log(`[WS-Manager] Disconnected from ${provider}: ${code} ${reason.toString()}`);
        conn.state = 'disconnected';
        conn.ws = null;
        this.emit('disconnected', { provider, code, reason: reason.toString() });

        if (!this.isShuttingDown) {
          this.scheduleReconnect(provider);
        }
      });

      ws.on('error', (err) => {
        console.error(`[WS-Manager] Error from ${provider}:`, err.message);
        conn.lastError = err.message;
        this.emit('error', { provider, error: err.message });
      });

      conn.ws = ws;
    } catch (err) {
      const error = err as Error;
      console.error(`[WS-Manager] Failed to connect to ${provider}:`, error.message);
      conn.state = 'disconnected';
      conn.lastError = error.message;
      this.scheduleReconnect(provider);
    }
  }

  /**
   * Get provider-specific headers
   */
  private getHeaders(provider: ProviderType): Record<string, string> {
    const headers: Record<string, string> = {
      'User-Agent': 'LeetTerminal/4.0',
    };

    if (provider === 'kalshi' && process.env.KALSHI_API_KEY) {
      headers['Authorization'] = `Bearer ${process.env.KALSHI_API_KEY}`;
    }

    return headers;
  }

  /**
   * Schedule reconnection with exponential backoff
   */
  private scheduleReconnect(provider: ProviderType): void {
    const conn = this.connections.get(provider);
    if (!conn || this.isShuttingDown) return;

    conn.state = 'reconnecting';
    conn.reconnectAttempts++;

    const delay = Math.min(
      RECONNECT_CONFIG.baseDelayMs * Math.pow(RECONNECT_CONFIG.multiplier, conn.reconnectAttempts - 1),
      RECONNECT_CONFIG.maxDelayMs
    );

    // Add jitter
    const jitter = delay * RECONNECT_CONFIG.jitterFactor * (Math.random() * 2 - 1);
    const finalDelay = Math.round(delay + jitter);

    console.log(`[WS-Manager] Scheduling reconnect to ${provider} in ${finalDelay}ms (attempt ${conn.reconnectAttempts})`);

    setTimeout(() => {
      if (!this.isShuttingDown && conn.state === 'reconnecting') {
        this.connect(provider);
      }
    }, finalDelay);
  }

  /**
   * Handle incoming message from provider
   */
  private handleMessage(provider: ProviderType, message: unknown): void {
    // Emit raw message for normalizer to process
    this.emit('raw_message', { provider, message });
  }

  /**
   * Resubscribe to channels after reconnection
   */
  private resubscribe(provider: ProviderType): void {
    const conn = this.connections.get(provider);
    if (!conn || !conn.ws || conn.subscriptions.size === 0) return;

    console.log(`[WS-Manager] Resubscribing to ${conn.subscriptions.size} channels on ${provider}`);

    for (const channel of conn.subscriptions) {
      this.sendSubscription(provider, channel, 'subscribe');
    }
  }

  /**
   * Subscribe to a channel
   */
  subscribe(provider: ProviderType, channel: string): boolean {
    const conn = this.connections.get(provider);
    if (!conn) return false;

    conn.subscriptions.add(channel);

    if (conn.state === 'connected' && conn.ws) {
      this.sendSubscription(provider, channel, 'subscribe');
      return true;
    }

    // If not connected, connection will resubscribe when ready
    if (conn.state === 'disconnected') {
      this.connect(provider);
    }

    return false;
  }

  /**
   * Unsubscribe from a channel
   */
  unsubscribe(provider: ProviderType, channel: string): boolean {
    const conn = this.connections.get(provider);
    if (!conn) return false;

    conn.subscriptions.delete(channel);

    if (conn.state === 'connected' && conn.ws) {
      this.sendSubscription(provider, channel, 'unsubscribe');
      return true;
    }

    return false;
  }

  /**
   * Send subscription message to provider
   */
  private sendSubscription(provider: ProviderType, channel: string, action: 'subscribe' | 'unsubscribe'): void {
    const conn = this.connections.get(provider);
    if (!conn?.ws || conn.state !== 'connected') return;

    let message: object;

    if (provider === 'polymarket') {
      // Polymarket CLOB WebSocket protocol
      message = {
        type: action,
        channel: 'market',
        assets_ids: [channel], // Token ID
      };
    } else {
      // Kalshi WebSocket protocol
      message = {
        type: action,
        params: {
          channels: ['ticker'],
          market_tickers: [channel],
        },
      };
    }

    try {
      conn.ws.send(JSON.stringify(message));
    } catch (err) {
      console.error(`[WS-Manager] Failed to send ${action} to ${provider}:`, err);
    }
  }

  /**
   * Get connection status
   */
  getStatus(): Record<ProviderType, { state: ConnectionState; subscriptions: number; lastConnected: number | null; lastError: string | null }> {
    const status: Record<string, { state: ConnectionState; subscriptions: number; lastConnected: number | null; lastError: string | null }> = {};

    for (const [provider, conn] of this.connections) {
      status[provider] = {
        state: conn.state,
        subscriptions: conn.subscriptions.size,
        lastConnected: conn.lastConnected,
        lastError: conn.lastError,
      };
    }

    return status as Record<ProviderType, { state: ConnectionState; subscriptions: number; lastConnected: number | null; lastError: string | null }>;
  }

  /**
   * Get all subscriptions for a provider
   */
  getSubscriptions(provider: ProviderType): string[] {
    const conn = this.connections.get(provider);
    return conn ? Array.from(conn.subscriptions) : [];
  }

  /**
   * Graceful shutdown
   */
  async shutdown(): Promise<void> {
    console.log('[WS-Manager] Shutting down...');
    this.isShuttingDown = true;

    const closePromises: Promise<void>[] = [];

    for (const [provider, conn] of this.connections) {
      if (conn.ws) {
        closePromises.push(
          new Promise((resolve) => {
            conn.ws!.once('close', () => resolve());
            conn.ws!.close(1000, 'Server shutdown');

            // Force close after timeout
            setTimeout(() => {
              if (conn.ws?.readyState === WebSocket.OPEN) {
                conn.ws.terminate();
              }
              resolve();
            }, 5000);
          })
        );
      }
    }

    await Promise.all(closePromises);
    console.log('[WS-Manager] Shutdown complete');
  }
}

// Singleton instance
let instance: WebSocketManager | null = null;

export function getWebSocketManager(): WebSocketManager {
  if (!instance) {
    instance = new WebSocketManager();
  }
  return instance;
}

export function shutdownWebSocketManager(): Promise<void> {
  if (instance) {
    return instance.shutdown();
  }
  return Promise.resolve();
}
