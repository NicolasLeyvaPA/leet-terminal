/**
 * Streaming Routes
 *
 * SSE endpoints for real-time market data streaming.
 * - GET /api/v1/stream - SSE endpoint for real-time updates
 * - POST /api/v1/stream/subscribe - Subscribe/unsubscribe to channels
 * - GET /api/v1/stream/status - Get streaming status
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import {
  type SubscriptionTier,
  type SubscriptionRequest,
  SubscriptionRequestSchema,
} from '@leet-terminal/shared/contracts';
import { getSubscriptionRegistry } from '../services/subscription-registry.js';
import { getSSEHandler } from '../services/sse-handler.js';
import { getWebSocketManager } from '../services/websocket-manager.js';
import { parseChannel } from '../services/message-normalizer.js';

interface StreamQuery {
  channels?: string;
  tier?: SubscriptionTier;
}

export async function streamingRoutes(fastify: FastifyInstance): Promise<void> {
  /**
   * SSE Stream Endpoint
   * GET /api/v1/stream?channels=price:pm-123,orderbook:pm-123&tier=free
   */
  fastify.get<{ Querystring: StreamQuery }>(
    '/stream',
    async (request: FastifyRequest<{ Querystring: StreamQuery }>, reply: FastifyReply) => {
      const { channels, tier = 'free' } = request.query;

      // Register client
      const registry = getSubscriptionRegistry();
      const clientId = registry.registerClient(tier);

      // Add to SSE handler
      const sseHandler = getSSEHandler();
      sseHandler.addClient(clientId, reply, tier);

      // Subscribe to initial channels
      if (channels) {
        const channelList = channels.split(',').filter(Boolean);
        const result = registry.subscribe(clientId, channelList);

        if (result.errors.length > 0) {
          console.warn(`[Stream] Subscription errors for ${clientId}:`, result.errors);
        }

        // Trigger upstream subscriptions
        const wsManager = getWebSocketManager();
        for (const channel of result.subscribed) {
          const parsed = parseChannel(channel);
          if (parsed) {
            wsManager.subscribe(parsed.provider, parsed.marketId);
          }
        }
      }

      // Don't end the reply - it's a long-lived SSE connection
      // The connection will be closed when the client disconnects
      return reply;
    }
  );

  /**
   * Subscribe/Unsubscribe Endpoint
   * POST /api/v1/stream/subscribe
   */
  fastify.post<{ Body: SubscriptionRequest }>(
    '/stream/subscribe',
    async (request: FastifyRequest<{ Body: SubscriptionRequest }>, reply: FastifyReply) => {
      // Validate request body
      const parseResult = SubscriptionRequestSchema.safeParse(request.body);
      if (!parseResult.success) {
        return reply.status(400).send({
          success: false,
          error: 'Invalid request body',
          details: parseResult.error.errors,
        });
      }

      const { clientId, channels, action, tier } = parseResult.data;

      const registry = getSubscriptionRegistry();
      const sseHandler = getSSEHandler();

      // Check if client exists
      if (!sseHandler.hasClient(clientId)) {
        return reply.status(404).send({
          success: false,
          error: 'Client not found. Establish SSE connection first.',
        });
      }

      // Update tier if provided
      if (tier) {
        registry.updateClientTier(clientId, tier);
      }

      // Touch client to keep alive
      registry.touchClient(clientId);

      if (action === 'subscribe') {
        const result = registry.subscribe(clientId, channels);

        // Trigger upstream subscriptions
        const wsManager = getWebSocketManager();
        for (const channel of result.subscribed) {
          const parsed = parseChannel(channel);
          if (parsed) {
            wsManager.subscribe(parsed.provider, parsed.marketId);
          }
        }

        return reply.send({
          success: result.success,
          subscribed: result.subscribed,
          errors: result.errors,
          currentChannels: registry.getClientChannels(clientId),
        });
      } else {
        const result = registry.unsubscribe(clientId, channels);

        // Note: We don't immediately unsubscribe from upstream WS
        // because other clients might be using those channels
        // The WS manager handles this through reference counting

        return reply.send({
          success: result.success,
          unsubscribed: result.unsubscribed,
          currentChannels: registry.getClientChannels(clientId),
        });
      }
    }
  );

  /**
   * Stream Status Endpoint
   * GET /api/v1/stream/status
   */
  fastify.get('/stream/status', async (_request: FastifyRequest, reply: FastifyReply) => {
    const registry = getSubscriptionRegistry();
    const sseHandler = getSSEHandler();
    const wsManager = getWebSocketManager();

    return reply.send({
      sse: sseHandler.getStats(),
      subscriptions: registry.getStats(),
      websockets: wsManager.getStatus(),
    });
  });

  /**
   * Client Info Endpoint
   * GET /api/v1/stream/client/:clientId
   */
  fastify.get<{ Params: { clientId: string } }>(
    '/stream/client/:clientId',
    async (request: FastifyRequest<{ Params: { clientId: string } }>, reply: FastifyReply) => {
      const { clientId } = request.params;

      const registry = getSubscriptionRegistry();
      const clientInfo = registry.getClientInfo(clientId);

      if (!clientInfo) {
        return reply.status(404).send({
          success: false,
          error: 'Client not found',
        });
      }

      return reply.send({
        success: true,
        client: {
          ...clientInfo,
          channels: registry.getClientChannels(clientId),
        },
      });
    }
  );
}

export default streamingRoutes;
