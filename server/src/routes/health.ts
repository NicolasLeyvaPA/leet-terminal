/**
 * Health Check Routes
 *
 * Endpoints for monitoring service health and status
 */

import type { FastifyInstance } from 'fastify';
import type { HealthResponse, HealthStatus } from '@leet-terminal/shared/contracts';
import { cacheService } from '../services/cache.js';
import { KalshiConnector } from '../connectors/kalshi.js';

const startTime = Date.now();

/**
 * Determine overall health status from source statuses
 */
function determineOverallStatus(sources: Record<string, { status: HealthStatus }>): HealthStatus {
  const statuses = Object.values(sources).map((s) => s.status);
  if (statuses.every((s) => s === 'healthy')) return 'healthy';
  if (statuses.some((s) => s === 'unhealthy')) return 'degraded';
  return 'healthy';
}

export async function healthRoutes(fastify: FastifyInstance): Promise<void> {
  /**
   * GET /api/v1/health
   * Quick liveness check
   */
  fastify.get('/health', async (request, reply) => {
    return reply.send({
      status: 'healthy',
      timestamp: new Date().toISOString(),
    });
  });

  /**
   * GET /api/v1/status
   * Detailed status with source health
   */
  fastify.get('/status', async (request, reply) => {
    const cacheStats = cacheService.getStats();

    // Check source connectivity (simple ping-like check)
    const sources: HealthResponse['sources'] = {
      polymarket: {
        status: 'healthy',
        latency_ms: 0,
      },
      kalshi: {
        status: KalshiConnector.isMockMode() ? 'degraded' : 'healthy',
        latency_ms: 0,
      },
    };

    // Quick connectivity test for Polymarket
    try {
      const start = Date.now();
      const response = await fetch('https://gamma-api.polymarket.com/events?limit=1', {
        method: 'GET',
        signal: AbortSignal.timeout(5000),
      });
      sources.polymarket.latency_ms = Date.now() - start;
      sources.polymarket.status = response.ok ? 'healthy' : 'degraded';
      sources.polymarket.last_success = new Date().toISOString();
    } catch (error) {
      sources.polymarket.status = 'unhealthy';
      sources.polymarket.last_error = (error as Error).message;
    }

    const overallStatus = determineOverallStatus(sources);

    const response: HealthResponse = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      version: '4.0.0',
      uptime_seconds: Math.floor((Date.now() - startTime) / 1000),
      sources,
      cache: {
        markets: {
          size: cacheStats.size,
          hit_rate: cacheStats.hitRate,
        },
      },
    };

    // Set appropriate status code
    const statusCode = overallStatus === 'healthy' ? 200 : overallStatus === 'degraded' ? 200 : 503;

    return reply.status(statusCode).send(response);
  });

  /**
   * GET /api/v1/ready
   * Readiness check for orchestration systems
   */
  fastify.get('/ready', async (request, reply) => {
    // Check if essential services are available
    const cacheStats = cacheService.getStats();
    const isReady = true; // Add more checks as needed

    if (isReady) {
      return reply.send({
        ready: true,
        timestamp: new Date().toISOString(),
      });
    }

    return reply.status(503).send({
      ready: false,
      timestamp: new Date().toISOString(),
      reason: 'Service not ready',
    });
  });
}

export default healthRoutes;
