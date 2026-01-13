/**
 * Audit Log Service
 *
 * Records all agent actions for security and accountability.
 * Logs are append-only and immutable.
 */

import { writeFile, readFile, appendFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import type { AgentAuditLogEntry } from '@leet-terminal/shared/contracts';

const AUDIT_LOG_DIR = process.env.AUDIT_LOG_DIR || './audit-logs';
const CURRENT_LOG_FILE = 'agent-audit.jsonl';

/**
 * Initialize audit log directory
 */
async function ensureLogDir(): Promise<void> {
  if (!existsSync(AUDIT_LOG_DIR)) {
    await mkdir(AUDIT_LOG_DIR, { recursive: true });
  }
}

/**
 * Append an entry to the audit log
 */
export async function logAction(
  action: string,
  details?: Record<string, unknown>,
  jobId?: string,
  user?: string
): Promise<AgentAuditLogEntry> {
  await ensureLogDir();

  const entry: AgentAuditLogEntry = {
    timestamp: new Date().toISOString(),
    action,
    job_id: jobId,
    user,
    details,
  };

  const logPath = path.join(AUDIT_LOG_DIR, CURRENT_LOG_FILE);
  await appendFile(logPath, JSON.stringify(entry) + '\n', 'utf-8');

  console.log(`[AUDIT] ${action}`, jobId ? `(job: ${jobId})` : '', details || '');

  return entry;
}

/**
 * Read audit log entries
 */
export async function readAuditLog(
  limit: number = 100,
  offset: number = 0
): Promise<AgentAuditLogEntry[]> {
  await ensureLogDir();

  const logPath = path.join(AUDIT_LOG_DIR, CURRENT_LOG_FILE);

  if (!existsSync(logPath)) {
    return [];
  }

  const content = await readFile(logPath, 'utf-8');
  const lines = content.trim().split('\n').filter(Boolean);

  const entries = lines.map((line) => {
    try {
      return JSON.parse(line) as AgentAuditLogEntry;
    } catch {
      return null;
    }
  }).filter((e): e is AgentAuditLogEntry => e !== null);

  // Return most recent entries first
  return entries.reverse().slice(offset, offset + limit);
}

/**
 * Read audit log entries for a specific job
 */
export async function readJobAuditLog(jobId: string): Promise<AgentAuditLogEntry[]> {
  const all = await readAuditLog(1000);
  return all.filter((e) => e.job_id === jobId);
}

// Pre-defined audit actions
export const AuditActions = {
  JOB_CREATED: 'job_created',
  JOB_STARTED: 'job_started',
  JOB_COMPLETED: 'job_completed',
  JOB_FAILED: 'job_failed',
  JOB_CANCELLED: 'job_cancelled',
  JOB_APPROVED: 'job_approved',
  JOB_REJECTED: 'job_rejected',
  COMMAND_EXECUTED: 'command_executed',
  COMMAND_BLOCKED: 'command_blocked',
  PATH_BLOCKED: 'path_blocked',
  DIFF_SIZE_EXCEEDED: 'diff_size_exceeded',
  KILL_SWITCH_ACTIVATED: 'kill_switch_activated',
  CONFIG_CHANGED: 'config_changed',
} as const;

export default { logAction, readAuditLog, readJobAuditLog, AuditActions };
