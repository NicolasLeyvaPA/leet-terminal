/**
 * Leet Terminal Pro - Agent Service
 *
 * Non-autonomous coding agent that monitors, proposes, but never auto-merges.
 * Provides a Fastify API for the Supervisor Console.
 */

import Fastify from 'fastify';
import cors from '@fastify/cors';
import {
  Orchestrator,
  createJob,
  runJob,
  approveJob,
  rejectJob,
  getJob,
  listJobs,
  activateKillSwitch,
  deactivateKillSwitch,
  isKillSwitchActive,
  generatePRBundle,
} from './orchestrator.js';
import { readAuditLog, readJobAuditLog } from './auditLog.js';
import { DEFAULT_CONFIG } from './config.js';

const PORT = parseInt(process.env.AGENT_PORT || '3002', 10);
const HOST = process.env.HOST || '0.0.0.0';

async function main() {
  const fastify = Fastify({
    logger: {
      level: process.env.LOG_LEVEL || 'info',
      transport:
        process.env.NODE_ENV !== 'production'
          ? {
              target: 'pino-pretty',
              options: { translateTime: 'HH:MM:ss Z', ignore: 'pid,hostname' },
            }
          : undefined,
    },
  });

  await fastify.register(cors, {
    origin: ['http://localhost:5173', 'http://localhost:3000'],
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
  });

  // Health check
  fastify.get('/health', async () => ({
    status: 'healthy',
    killSwitch: isKillSwitchActive(),
    timestamp: new Date().toISOString(),
  }));

  // List all jobs
  fastify.get<{ Querystring: { status?: string } }>(
    '/api/jobs',
    async (request) => {
      const { status } = request.query;
      const jobs = listJobs(status as any);
      return { jobs };
    }
  );

  // Get single job
  fastify.get<{ Params: { id: string } }>(
    '/api/jobs/:id',
    async (request, reply) => {
      const job = getJob(request.params.id);
      if (!job) {
        return reply.status(404).send({ error: 'Job not found' });
      }
      return { job };
    }
  );

  // Create new job
  fastify.post<{
    Body: { type: string; description: string; context?: Record<string, unknown> };
  }>('/api/jobs', async (request) => {
    const { type, description, context } = request.body;
    const job = await createJob({
      type: type as any,
      description,
      context,
    });
    return { job };
  });

  // Run job
  fastify.post<{ Params: { id: string }; Body: { commands: string[] } }>(
    '/api/jobs/:id/run',
    async (request, reply) => {
      const { commands } = request.body;
      try {
        const job = await runJob(request.params.id, commands, DEFAULT_CONFIG);
        return { job };
      } catch (error) {
        return reply.status(400).send({ error: (error as Error).message });
      }
    }
  );

  // Approve job
  fastify.post<{ Params: { id: string }; Body: { approver: string } }>(
    '/api/jobs/:id/approve',
    async (request, reply) => {
      try {
        const job = await approveJob(request.params.id, request.body.approver);
        return { job };
      } catch (error) {
        return reply.status(400).send({ error: (error as Error).message });
      }
    }
  );

  // Reject job
  fastify.post<{ Params: { id: string }; Body: { reason: string } }>(
    '/api/jobs/:id/reject',
    async (request, reply) => {
      try {
        const job = await rejectJob(request.params.id, request.body.reason);
        return { job };
      } catch (error) {
        return reply.status(400).send({ error: (error as Error).message });
      }
    }
  );

  // Get PR bundle
  fastify.get<{ Params: { id: string } }>(
    '/api/jobs/:id/bundle',
    async (request, reply) => {
      const bundle = generatePRBundle(request.params.id);
      if (!bundle) {
        return reply.status(404).send({ error: 'Bundle not available' });
      }
      return bundle;
    }
  );

  // Audit log
  fastify.get<{ Querystring: { limit?: string; offset?: string } }>(
    '/api/audit',
    async (request) => {
      const limit = parseInt(request.query.limit || '100', 10);
      const offset = parseInt(request.query.offset || '0', 10);
      const entries = await readAuditLog(limit, offset);
      return { entries };
    }
  );

  // Job audit log
  fastify.get<{ Params: { id: string } }>(
    '/api/jobs/:id/audit',
    async (request) => {
      const entries = await readJobAuditLog(request.params.id);
      return { entries };
    }
  );

  // Kill switch
  fastify.post<{ Body: { reason: string } }>(
    '/api/kill-switch/activate',
    async (request) => {
      await activateKillSwitch(request.body.reason);
      return { status: 'activated' };
    }
  );

  fastify.post('/api/kill-switch/deactivate', async () => {
    deactivateKillSwitch();
    return { status: 'deactivated' };
  });

  fastify.get('/api/kill-switch/status', async () => ({
    active: isKillSwitchActive(),
  }));

  // Start server
  try {
    await fastify.listen({ port: PORT, host: HOST });
    console.log(`
╔═══════════════════════════════════════════════════════════════╗
║           LEET TERMINAL PRO - Agent Service                   ║
╠═══════════════════════════════════════════════════════════════╣
║  Version:    1.0.0                                            ║
║  Port:       ${PORT}                                             ║
║  Mode:       NON-AUTONOMOUS (proposal only)                   ║
║                                                               ║
║  Endpoints:                                                   ║
║    GET  /api/jobs              - List all jobs                ║
║    GET  /api/jobs/:id          - Get job details              ║
║    POST /api/jobs              - Create new job               ║
║    POST /api/jobs/:id/run      - Execute job                  ║
║    POST /api/jobs/:id/approve  - Approve (human required)     ║
║    POST /api/jobs/:id/reject   - Reject proposal              ║
║    GET  /api/jobs/:id/bundle   - Download PR bundle           ║
║    GET  /api/audit             - View audit log               ║
║    POST /api/kill-switch/*     - Emergency controls           ║
║                                                               ║
║  IMPORTANT: This agent NEVER auto-merges or auto-deploys.     ║
║  All changes require human approval via Supervisor Console.   ║
╚═══════════════════════════════════════════════════════════════╝
    `);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }

  // Graceful shutdown
  const shutdown = async () => {
    console.log('\nShutting down agent service...');
    await fastify.close();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((err) => {
  console.error('Failed to start agent service:', err);
  process.exit(1);
});
