/**
 * Leet Terminal Pro - Backend Server
 *
 * Fastify-based API server for market data aggregation.
 * Handles Kalshi, Polymarket, and news data with caching and freshness tracking.
 */

import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import { marketsRoutes } from './routes/markets.js';
import { healthRoutes } from './routes/health.js';
import { streamingRoutes } from './routes/streaming.js';
import { getWebSocketManager, shutdownWebSocketManager } from './services/websocket-manager.js';
import { shutdownSubscriptionRegistry } from './services/subscription-registry.js';
import { shutdownSSEHandler } from './services/sse-handler.js';
import { initializeMessageNormalizer } from './services/message-normalizer.js';

const PORT = parseInt(process.env.PORT || '3001', 10);
const HOST = process.env.HOST || '0.0.0.0';

async function main() {
  const fastify = Fastify({
    logger: {
      level: process.env.LOG_LEVEL || 'info',
      transport:
        process.env.NODE_ENV !== 'production'
          ? {
              target: 'pino-pretty',
              options: {
                translateTime: 'HH:MM:ss Z',
                ignore: 'pid,hostname',
              },
            }
          : undefined,
    },
    requestIdHeader: 'x-request-id',
    genReqId: () => `req_${Math.random().toString(36).substring(2, 10)}`,
  });

  // Register plugins
  await fastify.register(helmet, {
    contentSecurityPolicy: false, // Disable for API server
  });

  await fastify.register(cors, {
    origin: [
      'http://localhost:5173',
      'http://localhost:3000',
      'http://127.0.0.1:5173',
      /\.ngrok\.io$/,
      /\.ngrok-free\.app$/,
    ],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
    credentials: true,
  });

  // Request logging hook
  fastify.addHook('onRequest', async (request) => {
    request.log.info(
      {
        method: request.method,
        url: request.url,
        requestId: request.id,
      },
      'Incoming request'
    );
  });

  // Response logging hook
  fastify.addHook('onResponse', async (request, reply) => {
    request.log.info(
      {
        method: request.method,
        url: request.url,
        statusCode: reply.statusCode,
        responseTime: reply.elapsedTime,
        requestId: request.id,
      },
      'Request completed'
    );
  });

  // Error handler
  fastify.setErrorHandler(async (error, request, reply) => {
    request.log.error(
      {
        error: error.message,
        stack: error.stack,
        requestId: request.id,
      },
      'Request error'
    );

    return reply.status(error.statusCode || 500).send({
      success: false,
      data: null,
      freshness: {
        fetched_at: new Date().toISOString(),
        ttl_seconds: 0,
        is_stale: true,
        source: 'computed',
        cache_hit: false,
      },
      errors: [
        {
          code: error.code || 'INTERNAL_ERROR',
          message: error.message,
        },
      ],
      request_id: request.id,
    });
  });

  // Register routes with prefix
  await fastify.register(
    async (app) => {
      await app.register(marketsRoutes);
      await app.register(healthRoutes);
      await app.register(streamingRoutes);
    },
    { prefix: '/api/v1' }
  );

  // Initialize streaming services
  initializeMessageNormalizer();
  const wsManager = getWebSocketManager();

  // Connect to upstream WebSockets (optional - they'll auto-connect on first subscription)
  if (process.env.ENABLE_STREAMING === 'true') {
    console.log('[Server] Streaming enabled, connecting to upstream WebSockets...');
    wsManager.connect('polymarket').catch(err => {
      console.warn('[Server] Failed to connect to Polymarket WS:', err.message);
    });
    wsManager.connect('kalshi').catch(err => {
      console.warn('[Server] Failed to connect to Kalshi WS:', err.message);
    });
  }

  // Root endpoint
  fastify.get('/', async () => {
    return {
      name: 'Leet Terminal Pro API',
      version: '4.0.0',
      documentation: '/api/v1/status',
    };
  });

  // Start server
  try {
    await fastify.listen({ port: PORT, host: HOST });
    console.log(`
╔═══════════════════════════════════════════════════════════════╗
║           LEET TERMINAL PRO - Backend Server                  ║
╠═══════════════════════════════════════════════════════════════╣
║  Version:    4.0.0                                            ║
║  Port:       ${PORT}                                             ║
║  Host:       ${HOST}                                          ║
║  Endpoints:                                                   ║
║    GET /api/v1/markets           - List markets               ║
║    GET /api/v1/markets/:id       - Get market details         ║
║    GET /api/v1/markets/:id/orderbook - Get orderbook          ║
║    GET /api/v1/markets/:id/history   - Get price history      ║
║    GET /api/v1/stream            - SSE streaming endpoint     ║
║    POST /api/v1/stream/subscribe - Subscribe to channels      ║
║    GET /api/v1/stream/status     - Streaming status           ║
║    GET /api/v1/health            - Health check               ║
║    GET /api/v1/status            - Detailed status            ║
╚═══════════════════════════════════════════════════════════════╝
    `);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }

  // Graceful shutdown
  const shutdown = async () => {
    console.log('\nShutting down server...');

    // Shutdown streaming services
    shutdownSSEHandler();
    shutdownSubscriptionRegistry();
    await shutdownWebSocketManager();

    await fastify.close();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
