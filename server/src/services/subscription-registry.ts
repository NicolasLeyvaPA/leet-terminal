/**
 * Subscription Registry Service
 *
 * Tracks client subscriptions with tiered limits.
 * Features:
 * - Client subscription tracking per tier (free: 5, pro: 50, enterprise: 500)
 * - Rate limiting per client
 * - Channel-to-client mapping for efficient fan-out
 * - Aggregates subscriptions for upstream WS
 */

import { v4 as uuidv4 } from 'uuid';
import {
  type SubscriptionTier,
  SUBSCRIPTION_LIMITS,
} from '@leet-terminal/shared/contracts';

interface ClientInfo {
  id: string;
  tier: SubscriptionTier;
  channels: Set<string>;
  connectedAt: number;
  lastActivity: number;
  rateLimit: {
    requests: number;
    windowStart: number;
  };
}

// Rate limit config
const RATE_LIMIT = {
  windowMs: 60000, // 1 minute
  maxRequests: {
    free: 30,
    pro: 100,
    enterprise: 500,
  },
};

// Grace period before removing client subscriptions after disconnect
const GRACE_PERIOD_MS = 120000; // 2 minutes

export class SubscriptionRegistry {
  private clients: Map<string, ClientInfo> = new Map();
  private channelToClients: Map<string, Set<string>> = new Map();
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    // Periodic cleanup of stale clients
    this.cleanupInterval = setInterval(() => this.cleanupStaleClients(), 60000);
  }

  /**
   * Register a new client
   */
  registerClient(tier: SubscriptionTier = 'free'): string {
    const clientId = uuidv4();
    const now = Date.now();

    this.clients.set(clientId, {
      id: clientId,
      tier,
      channels: new Set(),
      connectedAt: now,
      lastActivity: now,
      rateLimit: {
        requests: 0,
        windowStart: now,
      },
    });

    console.log(`[Sub-Registry] Client registered: ${clientId} (tier: ${tier})`);
    return clientId;
  }

  /**
   * Unregister a client
   */
  unregisterClient(clientId: string): void {
    const client = this.clients.get(clientId);
    if (!client) return;

    // Remove from all channels
    for (const channel of client.channels) {
      this.removeFromChannel(clientId, channel);
    }

    this.clients.delete(clientId);
    console.log(`[Sub-Registry] Client unregistered: ${clientId}`);
  }

  /**
   * Subscribe client to channels
   */
  subscribe(clientId: string, channels: string[]): { success: boolean; subscribed: string[]; errors: string[] } {
    const client = this.clients.get(clientId);
    if (!client) {
      return { success: false, subscribed: [], errors: ['Client not found'] };
    }

    // Check rate limit
    if (!this.checkRateLimit(client)) {
      return { success: false, subscribed: [], errors: ['Rate limit exceeded'] };
    }

    const limit = SUBSCRIPTION_LIMITS[client.tier];
    const subscribed: string[] = [];
    const errors: string[] = [];

    for (const channel of channels) {
      // Check limit
      if (client.channels.size >= limit) {
        errors.push(`Subscription limit reached (${limit} for ${client.tier} tier)`);
        break;
      }

      // Add to client's channels
      client.channels.add(channel);

      // Add to channel-to-clients mapping
      if (!this.channelToClients.has(channel)) {
        this.channelToClients.set(channel, new Set());
      }
      this.channelToClients.get(channel)!.add(clientId);

      subscribed.push(channel);
    }

    client.lastActivity = Date.now();

    return {
      success: errors.length === 0,
      subscribed,
      errors,
    };
  }

  /**
   * Unsubscribe client from channels
   */
  unsubscribe(clientId: string, channels: string[]): { success: boolean; unsubscribed: string[] } {
    const client = this.clients.get(clientId);
    if (!client) {
      return { success: false, unsubscribed: [] };
    }

    const unsubscribed: string[] = [];

    for (const channel of channels) {
      if (client.channels.has(channel)) {
        client.channels.delete(channel);
        this.removeFromChannel(clientId, channel);
        unsubscribed.push(channel);
      }
    }

    client.lastActivity = Date.now();

    return { success: true, unsubscribed };
  }

  /**
   * Remove client from channel mapping
   */
  private removeFromChannel(clientId: string, channel: string): void {
    const clients = this.channelToClients.get(channel);
    if (clients) {
      clients.delete(clientId);
      if (clients.size === 0) {
        this.channelToClients.delete(channel);
      }
    }
  }

  /**
   * Check and update rate limit
   */
  private checkRateLimit(client: ClientInfo): boolean {
    const now = Date.now();
    const maxRequests = RATE_LIMIT.maxRequests[client.tier];

    // Reset window if expired
    if (now - client.rateLimit.windowStart >= RATE_LIMIT.windowMs) {
      client.rateLimit.requests = 0;
      client.rateLimit.windowStart = now;
    }

    // Check limit
    if (client.rateLimit.requests >= maxRequests) {
      return false;
    }

    client.rateLimit.requests++;
    return true;
  }

  /**
   * Get clients subscribed to a channel
   */
  getClientsForChannel(channel: string): string[] {
    const clients = this.channelToClients.get(channel);
    return clients ? Array.from(clients) : [];
  }

  /**
   * Get all unique channels with active subscriptions
   */
  getActiveChannels(): string[] {
    return Array.from(this.channelToClients.keys());
  }

  /**
   * Get channels for a specific client
   */
  getClientChannels(clientId: string): string[] {
    const client = this.clients.get(clientId);
    return client ? Array.from(client.channels) : [];
  }

  /**
   * Get client info
   */
  getClientInfo(clientId: string): { tier: SubscriptionTier; channels: number; connectedAt: number } | null {
    const client = this.clients.get(clientId);
    if (!client) return null;

    return {
      tier: client.tier,
      channels: client.channels.size,
      connectedAt: client.connectedAt,
    };
  }

  /**
   * Update client tier
   */
  updateClientTier(clientId: string, tier: SubscriptionTier): boolean {
    const client = this.clients.get(clientId);
    if (!client) return false;

    client.tier = tier;
    return true;
  }

  /**
   * Touch client (update last activity)
   */
  touchClient(clientId: string): void {
    const client = this.clients.get(clientId);
    if (client) {
      client.lastActivity = Date.now();
    }
  }

  /**
   * Get aggregated subscription stats
   */
  getStats(): {
    totalClients: number;
    totalChannels: number;
    clientsByTier: Record<SubscriptionTier, number>;
    topChannels: Array<{ channel: string; subscribers: number }>;
  } {
    const clientsByTier: Record<SubscriptionTier, number> = {
      free: 0,
      pro: 0,
      enterprise: 0,
    };

    for (const client of this.clients.values()) {
      clientsByTier[client.tier]++;
    }

    const topChannels = Array.from(this.channelToClients.entries())
      .map(([channel, clients]) => ({ channel, subscribers: clients.size }))
      .sort((a, b) => b.subscribers - a.subscribers)
      .slice(0, 10);

    return {
      totalClients: this.clients.size,
      totalChannels: this.channelToClients.size,
      clientsByTier,
      topChannels,
    };
  }

  /**
   * Cleanup stale clients (no activity for grace period)
   */
  private cleanupStaleClients(): void {
    const now = Date.now();
    const staleClients: string[] = [];

    for (const [clientId, client] of this.clients) {
      if (now - client.lastActivity > GRACE_PERIOD_MS) {
        staleClients.push(clientId);
      }
    }

    for (const clientId of staleClients) {
      console.log(`[Sub-Registry] Cleaning up stale client: ${clientId}`);
      this.unregisterClient(clientId);
    }

    if (staleClients.length > 0) {
      console.log(`[Sub-Registry] Cleaned up ${staleClients.length} stale clients`);
    }
  }

  /**
   * Shutdown
   */
  shutdown(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.clients.clear();
    this.channelToClients.clear();
    console.log('[Sub-Registry] Shutdown complete');
  }
}

// Singleton instance
let instance: SubscriptionRegistry | null = null;

export function getSubscriptionRegistry(): SubscriptionRegistry {
  if (!instance) {
    instance = new SubscriptionRegistry();
  }
  return instance;
}

export function shutdownSubscriptionRegistry(): void {
  if (instance) {
    instance.shutdown();
    instance = null;
  }
}
