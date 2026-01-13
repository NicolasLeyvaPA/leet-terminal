/**
 * Agent Configuration
 *
 * Safety constraints and allowlists for the non-autonomous coding agent.
 */

import { z } from 'zod';

// Allowed commands that the agent can execute
export const ALLOWED_COMMANDS = [
  'npm run lint',
  'npm run lint:fix',
  'npm run test',
  'npm run test:coverage',
  'npm run build',
  'npm run typecheck',
  'git status',
  'git diff',
  'git log',
] as const;

// Path patterns the agent is NOT allowed to modify
export const FORBIDDEN_PATHS = [
  /\.env/,
  /\.env\..*/,
  /secrets?\//,
  /credentials?\//,
  /\.ssh\//,
  /\.aws\//,
  /\.npmrc/,
  /package-lock\.json/, // Should not auto-modify lockfile
  /\.git\//,
] as const;

// Maximum diff size in bytes
export const MAX_DIFF_SIZE_BYTES = 50_000; // 50KB

// Maximum number of files that can be modified in a single job
export const MAX_MODIFIED_FILES = 20;

// Job timeout in milliseconds
export const JOB_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

// Configuration schema
export const AgentConfigSchema = z.object({
  enabled: z.boolean().default(true),
  allowedCommands: z.array(z.string()).default([...ALLOWED_COMMANDS]),
  forbiddenPaths: z.array(z.string()).default(FORBIDDEN_PATHS.map(r => r.source)),
  maxDiffSizeBytes: z.number().int().positive().default(MAX_DIFF_SIZE_BYTES),
  maxModifiedFiles: z.number().int().positive().default(MAX_MODIFIED_FILES),
  jobTimeoutMs: z.number().int().positive().default(JOB_TIMEOUT_MS),
  autoApprove: z.boolean().default(false), // MUST be false for non-autonomous
  workingDirectory: z.string().optional(),
});

export type AgentConfig = z.infer<typeof AgentConfigSchema>;

// Default configuration
export const DEFAULT_CONFIG: AgentConfig = {
  enabled: true,
  allowedCommands: [...ALLOWED_COMMANDS],
  forbiddenPaths: FORBIDDEN_PATHS.map(r => r.source),
  maxDiffSizeBytes: MAX_DIFF_SIZE_BYTES,
  maxModifiedFiles: MAX_MODIFIED_FILES,
  jobTimeoutMs: JOB_TIMEOUT_MS,
  autoApprove: false,
};

/**
 * Validate that a command is allowed
 */
export function isCommandAllowed(command: string, config: AgentConfig = DEFAULT_CONFIG): boolean {
  const normalizedCommand = command.trim().toLowerCase();
  return config.allowedCommands.some(allowed =>
    normalizedCommand === allowed.toLowerCase() ||
    normalizedCommand.startsWith(allowed.toLowerCase() + ' ')
  );
}

/**
 * Validate that a path is not forbidden
 */
export function isPathAllowed(path: string, config: AgentConfig = DEFAULT_CONFIG): boolean {
  return !config.forbiddenPaths.some(pattern => {
    const regex = new RegExp(pattern);
    return regex.test(path);
  });
}

/**
 * Validate diff size
 */
export function isDiffSizeAllowed(diffBytes: number, config: AgentConfig = DEFAULT_CONFIG): boolean {
  return diffBytes <= config.maxDiffSizeBytes;
}
