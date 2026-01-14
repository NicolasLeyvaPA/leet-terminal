/**
 * SSE Handler Service
 *
 * Server-Sent Events connection management.
 * Features:
 * - SSE connection management
 * - Backpressure handling (queue + batch, max 1000 events)
 * - 30s heartbeat
 * - Event fan-out based on subscriptions
 */

import type { FastifyReply } from 'fastify';
import type { StreamEvent, SubscriptionTier } from '@leet-terminal/shared/contracts';
import { getSubscriptionRegistry } from './subscription-registry.js';

// Backpressure config
const BACKPRESSURE_CONFIG = {
  maxQueueSize: 1000,
  batchSize: 10,
  batchDelayMs: 50,
};

// Heartbeat interval
const HEARTBEAT_INTERVAL_MS = 30000;

interface SSEClient {
  id: string;
  reply: FastifyReply;
  tier: SubscriptionTier;
  eventQueue: StreamEvent[];
  isFlushing: boolean;
  heartbeatTimer: NodeJS.Timeout | null;
  sequence: number;
}

export class SSEHandler {
  private clients: Map<string, SSEClient> = new Map();
  private isShuttingDown = false;

  /**
   * Add a new SSE client
   */
  addClient(clientId: string, reply: FastifyReply, tier: SubscriptionTier = 'free'): void {
    // Set SSE headers
    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no', // Disable nginx buffering
    });

    const client: SSEClient = {
      id: clientId,
      reply,
      tier,
      eventQueue: [],
      isFlushing: false,
      heartbeatTimer: null,
      sequence: 0,
    };

    this.clients.set(clientId, client);

    // Start heartbeat
    client.heartbeatTimer = setInterval(() => {
      this.sendHeartbeat(clientId);
    }, HEARTBEAT_INTERVAL_MS);

    // Send connected event
    this.sendEvent(clientId, {
      type: 'subscription_ack',
      channel: 'system',
      payload: { message: 'connected' },
      timestamp: Date.now(),
    });

    // Handle client disconnect
    reply.raw.on('close', () => {
      this.removeClient(clientId);
    });

    console.log(`[SSE] Client connected: ${clientId}`);
  }

  /**
   * Remove a client
   */
  removeClient(clientId: string): void {
    const client = this.clients.get(clientId);
    if (!client) return;

    // Clear heartbeat
    if (client.heartbeatTimer) {
      clearInterval(client.heartbeatTimer);
    }

    // Unregister from subscription registry
    getSubscriptionRegistry().unregisterClient(clientId);

    this.clients.delete(clientId);
    console.log(`[SSE] Client disconnected: ${clientId}`);
  }

  /**
   * Send an event to a specific client
   */
  sendEvent(clientId: string, event: StreamEvent): boolean {
    const client = this.clients.get(clientId);
    if (!client || this.isShuttingDown) return false;

    // Add sequence number
    event.sequence = ++client.sequence;

    // Add to queue
    client.eventQueue.push(event);

    // Check backpressure
    if (client.eventQueue.length > BACKPRESSURE_CONFIG.maxQueueSize) {
      // Drop oldest events
      const dropped = client.eventQueue.length - BACKPRESSURE_CONFIG.maxQueueSize;
      client.eventQueue.splice(0, dropped);
      console.warn(`[SSE] Dropped ${dropped} events for client ${clientId} (backpressure)`);
    }

    // Schedule flush
    this.scheduleFlush(client);

    return true;
  }

  /**
   * Broadcast event to all clients subscribed to a channel
   */
  broadcast(channel: string, event: StreamEvent): number {
    const registry = getSubscriptionRegistry();
    const clientIds = registry.getClientsForChannel(channel);
    let sent = 0;

    for (const clientId of clientIds) {
      if (this.sendEvent(clientId, event)) {
        sent++;
      }
    }

    return sent;
  }

  /**
   * Schedule flush with batching
   */
  private scheduleFlush(client: SSEClient): void {
    if (client.isFlushing) return;

    client.isFlushing = true;

    setTimeout(() => {
      this.flushQueue(client);
    }, BACKPRESSURE_CONFIG.batchDelayMs);
  }

  /**
   * Flush event queue to client
   */
  private flushQueue(client: SSEClient): void {
    if (this.isShuttingDown || !this.clients.has(client.id)) {
      client.isFlushing = false;
      return;
    }

    // Get batch of events
    const batch = client.eventQueue.splice(0, BACKPRESSURE_CONFIG.batchSize);

    if (batch.length === 0) {
      client.isFlushing = false;
      return;
    }

    try {
      for (const event of batch) {
        const data = JSON.stringify(event);
        client.reply.raw.write(`event: ${event.type}\n`);
        client.reply.raw.write(`data: ${data}\n\n`);
      }
    } catch (err) {
      console.error(`[SSE] Error writing to client ${client.id}:`, err);
      this.removeClient(client.id);
      return;
    }

    // Continue flushing if more events
    if (client.eventQueue.length > 0) {
      setTimeout(() => {
        this.flushQueue(client);
      }, BACKPRESSURE_CONFIG.batchDelayMs);
    } else {
      client.isFlushing = false;
    }
  }

  /**
   * Send heartbeat to client
   */
  private sendHeartbeat(clientId: string): void {
    const client = this.clients.get(clientId);
    if (!client || this.isShuttingDown) return;

    try {
      client.reply.raw.write(`event: heartbeat\n`);
      client.reply.raw.write(`data: {"timestamp":${Date.now()}}\n\n`);
    } catch (err) {
      console.error(`[SSE] Heartbeat failed for client ${clientId}:`, err);
      this.removeClient(clientId);
    }
  }

  /**
   * Get client count
   */
  getClientCount(): number {
    return this.clients.size;
  }

  /**
   * Check if client exists
   */
  hasClient(clientId: string): boolean {
    return this.clients.has(clientId);
  }

  /**
   * Get stats
   */
  getStats(): {
    clients: number;
    queued: number;
    avgQueueSize: number;
  } {
    let totalQueued = 0;

    for (const client of this.clients.values()) {
      totalQueued += client.eventQueue.length;
    }

    return {
      clients: this.clients.size,
      queued: totalQueued,
      avgQueueSize: this.clients.size > 0 ? totalQueued / this.clients.size : 0,
    };
  }

  /**
   * Shutdown
   */
  shutdown(): void {
    console.log('[SSE] Shutting down...');
    this.isShuttingDown = true;

    for (const [clientId, client] of this.clients) {
      if (client.heartbeatTimer) {
        clearInterval(client.heartbeatTimer);
      }

      try {
        client.reply.raw.write(`event: error\n`);
        client.reply.raw.write(`data: {"message":"Server shutting down"}\n\n`);
        client.reply.raw.end();
      } catch {
        // Ignore errors during shutdown
      }
    }

    this.clients.clear();
    console.log('[SSE] Shutdown complete');
  }
}

// Singleton instance
let instance: SSEHandler | null = null;

export function getSSEHandler(): SSEHandler {
  if (!instance) {
    instance = new SSEHandler();
  }
  return instance;
}

export function shutdownSSEHandler(): void {
  if (instance) {
    instance.shutdown();
    instance = null;
  }
}
