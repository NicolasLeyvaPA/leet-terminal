/**
 * Agent Orchestrator
 *
 * Manages the lifecycle of agent jobs:
 * - Creates jobs from triggers (CI failures, lint errors, etc.)
 * - Executes allowed commands in sandbox
 * - Generates diff proposals
 * - Queues for human approval
 * - NEVER auto-merges or auto-deploys
 */

import { spawn } from 'child_process';
import { randomUUID } from 'crypto';
import type { AgentJob, AgentJobStatus } from '@leet-terminal/shared/contracts';
import {
  DEFAULT_CONFIG,
  isCommandAllowed,
  isPathAllowed,
  isDiffSizeAllowed,
  type AgentConfig,
} from './config.js';
import { logAction, AuditActions } from './auditLog.js';

// In-memory job store (replace with database in production)
const jobs = new Map<string, AgentJob>();
let killSwitchActive = false;

interface JobTrigger {
  type: 'ci_failure' | 'lint_error' | 'test_failure' | 'health_alert' | 'manual';
  description: string;
  context?: Record<string, unknown>;
}

/**
 * Execute a command in a sandboxed environment
 */
async function executeCommand(
  command: string,
  config: AgentConfig = DEFAULT_CONFIG
): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  if (killSwitchActive) {
    throw new Error('Kill switch is active - all agent operations suspended');
  }

  if (!isCommandAllowed(command, config)) {
    await logAction(AuditActions.COMMAND_BLOCKED, { command });
    throw new Error(`Command not allowed: ${command}`);
  }

  await logAction(AuditActions.COMMAND_EXECUTED, { command });

  return new Promise((resolve, reject) => {
    const child = spawn('sh', ['-c', command], {
      cwd: config.workingDirectory || process.cwd(),
      timeout: config.jobTimeoutMs,
      env: {
        ...process.env,
        // Remove sensitive env vars
        GITHUB_TOKEN: undefined,
        NPM_TOKEN: undefined,
        AWS_SECRET_ACCESS_KEY: undefined,
      },
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('close', (code) => {
      resolve({ stdout, stderr, exitCode: code || 0 });
    });

    child.on('error', (err) => {
      reject(err);
    });

    // Timeout handling
    setTimeout(() => {
      child.kill('SIGTERM');
      reject(new Error('Command timeout'));
    }, config.jobTimeoutMs);
  });
}

/**
 * Generate a diff from staged changes
 */
async function generateDiff(
  config: AgentConfig = DEFAULT_CONFIG
): Promise<{ diff: string; files: string[] }> {
  const result = await executeCommand('git diff', config);
  const diff = result.stdout;

  // Extract modified files
  const fileRegex = /^diff --git a\/(.+) b\//gm;
  const files: string[] = [];
  let match;
  while ((match = fileRegex.exec(diff)) !== null) {
    files.push(match[1]);
  }

  // Validate paths
  for (const file of files) {
    if (!isPathAllowed(file, config)) {
      await logAction(AuditActions.PATH_BLOCKED, { file });
      throw new Error(`Modification of forbidden path: ${file}`);
    }
  }

  // Validate diff size
  const diffSize = Buffer.byteLength(diff, 'utf-8');
  if (!isDiffSizeAllowed(diffSize, config)) {
    await logAction(AuditActions.DIFF_SIZE_EXCEEDED, { size: diffSize, limit: config.maxDiffSizeBytes });
    throw new Error(`Diff size ${diffSize} exceeds limit ${config.maxDiffSizeBytes}`);
  }

  return { diff, files };
}

/**
 * Create a new agent job
 */
export async function createJob(
  trigger: JobTrigger,
  config: AgentConfig = DEFAULT_CONFIG
): Promise<AgentJob> {
  if (killSwitchActive) {
    throw new Error('Kill switch is active - cannot create new jobs');
  }

  const job: AgentJob = {
    id: randomUUID(),
    type: trigger.type === 'lint_error' ? 'lint_fix'
      : trigger.type === 'test_failure' ? 'test_fix'
      : trigger.type === 'ci_failure' ? 'build_fix'
      : trigger.type === 'health_alert' ? 'health_fix'
      : 'custom',
    status: 'pending',
    trigger: trigger.description,
    created_at: new Date().toISOString(),
    logs: [],
  };

  jobs.set(job.id, job);
  await logAction(AuditActions.JOB_CREATED, { trigger }, job.id);

  return job;
}

/**
 * Execute a job
 */
export async function runJob(
  jobId: string,
  commands: string[],
  config: AgentConfig = DEFAULT_CONFIG
): Promise<AgentJob> {
  const job = jobs.get(jobId);
  if (!job) {
    throw new Error(`Job not found: ${jobId}`);
  }

  if (killSwitchActive) {
    job.status = 'cancelled';
    job.error = 'Kill switch activated';
    await logAction(AuditActions.JOB_CANCELLED, { reason: 'kill_switch' }, jobId);
    return job;
  }

  job.status = 'running';
  job.started_at = new Date().toISOString();
  job.logs = [];
  await logAction(AuditActions.JOB_STARTED, {}, jobId);

  try {
    // Execute commands
    for (const command of commands) {
      job.logs?.push(`> ${command}`);
      const result = await executeCommand(command, config);
      job.logs?.push(result.stdout);
      if (result.stderr) {
        job.logs?.push(`stderr: ${result.stderr}`);
      }
      job.logs?.push(`Exit code: ${result.exitCode}`);

      if (result.exitCode !== 0) {
        throw new Error(`Command failed with exit code ${result.exitCode}`);
      }
    }

    // Generate diff
    const { diff, files } = await generateDiff(config);
    job.diff = diff;
    job.diff_files = files;
    job.diff_size_bytes = Buffer.byteLength(diff, 'utf-8');

    // If there are changes, set status to awaiting approval
    if (diff.trim()) {
      job.status = 'awaiting_approval';
    } else {
      job.status = 'completed';
    }

    job.completed_at = new Date().toISOString();
    await logAction(AuditActions.JOB_COMPLETED, { filesModified: files.length }, jobId);

  } catch (error) {
    job.status = 'failed';
    job.error = (error as Error).message;
    job.completed_at = new Date().toISOString();
    await logAction(AuditActions.JOB_FAILED, { error: (error as Error).message }, jobId);
  }

  return job;
}

/**
 * Approve a job (human action required)
 */
export async function approveJob(
  jobId: string,
  approver: string
): Promise<AgentJob> {
  const job = jobs.get(jobId);
  if (!job) {
    throw new Error(`Job not found: ${jobId}`);
  }

  if (job.status !== 'awaiting_approval') {
    throw new Error(`Job is not awaiting approval: ${job.status}`);
  }

  job.approved_by = approver;
  job.approved_at = new Date().toISOString();
  job.status = 'completed';

  await logAction(AuditActions.JOB_APPROVED, { approver }, jobId);

  // Note: This does NOT auto-merge or create PR
  // The supervisor console should handle PR creation manually

  return job;
}

/**
 * Reject a job
 */
export async function rejectJob(
  jobId: string,
  reason: string
): Promise<AgentJob> {
  const job = jobs.get(jobId);
  if (!job) {
    throw new Error(`Job not found: ${jobId}`);
  }

  job.status = 'cancelled';
  job.error = `Rejected: ${reason}`;

  await logAction(AuditActions.JOB_REJECTED, { reason }, jobId);

  return job;
}

/**
 * Get job by ID
 */
export function getJob(jobId: string): AgentJob | undefined {
  return jobs.get(jobId);
}

/**
 * List all jobs
 */
export function listJobs(status?: AgentJobStatus): AgentJob[] {
  const allJobs = Array.from(jobs.values());
  if (status) {
    return allJobs.filter((j) => j.status === status);
  }
  return allJobs.sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
}

/**
 * Activate kill switch - stops all agent operations
 */
export async function activateKillSwitch(reason: string): Promise<void> {
  killSwitchActive = true;
  await logAction(AuditActions.KILL_SWITCH_ACTIVATED, { reason });

  // Cancel all pending/running jobs
  for (const [id, job] of jobs) {
    if (job.status === 'pending' || job.status === 'running') {
      job.status = 'cancelled';
      job.error = `Kill switch activated: ${reason}`;
    }
  }
}

/**
 * Deactivate kill switch
 */
export function deactivateKillSwitch(): void {
  killSwitchActive = false;
}

/**
 * Check if kill switch is active
 */
export function isKillSwitchActive(): boolean {
  return killSwitchActive;
}

/**
 * Generate PR bundle (patch file + instructions) for manual application
 */
export function generatePRBundle(jobId: string): { patchContent: string; instructions: string } | null {
  const job = jobs.get(jobId);
  if (!job || !job.diff) {
    return null;
  }

  const patchContent = job.diff;
  const instructions = `
# PR Bundle for Job ${jobId}

## Files Modified
${job.diff_files?.map((f) => `- ${f}`).join('\n') || 'None'}

## Instructions

1. Save the attached patch file as \`${jobId}.patch\`

2. Apply the patch:
   \`\`\`bash
   git apply ${jobId}.patch
   \`\`\`

3. Review the changes:
   \`\`\`bash
   git diff
   \`\`\`

4. Commit and create PR:
   \`\`\`bash
   git add .
   git commit -m "${job.trigger}"
   git push origin HEAD
   gh pr create --title "${job.trigger}" --body "Auto-generated by agent job ${jobId}"
   \`\`\`

## Job Details
- Type: ${job.type}
- Trigger: ${job.trigger}
- Created: ${job.created_at}
- Approved by: ${job.approved_by || 'Pending'}
`;

  return { patchContent, instructions };
}

export const Orchestrator = {
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
};

export default Orchestrator;
