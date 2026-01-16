import { z } from 'zod';

export const GithubConfigSchema = z.object({
  owner: z.string().min(1),
  repo: z.string().min(1),
  labelsForAutocode: z.array(z.string()).default(['agent:auto']),
  labelsForPlanOnly: z.array(z.string()).default(['agent:plan']),
  maxIssuesPerDay: z.number().int().min(1).max(10).default(3),
  excludeLabels: z.array(z.string()).default(['wontfix', 'duplicate', 'invalid']),
});

export const RiskPolicySchema = z.object({
  maxFilesChanged: z.number().int().min(1).default(10),
  maxLinesChanged: z.number().int().min(1).default(400),
  disallowDependencyChanges: z.boolean().default(true),
  allowFileGlobs: z.array(z.string()).default(['src/**/*', 'components/**/*', 'lib/**/*', 'app/**/*', 'pages/**/*']),
  denyFileGlobs: z.array(z.string()).default(['.env*', '*.secret*', '**/secrets/**', '**/credentials/**', '**/.aws/**', '**/infra/**', '**/terraform/**']),
  highRiskPatterns: z.array(z.string()).default(['**/auth/**', '**/payment/**', '**/billing/**', '**/admin/**', '**/security/**']),
});

export const ExecutionPolicySchema = z.object({
  modeDefault: z.enum(['plan-only', 'execute', 'dry-run']).default('plan-only'),
  createDraftPR: z.boolean().default(true),
  requireCleanWorkingTree: z.boolean().default(true),
  maxPatchIterations: z.number().int().min(1).max(10).default(3),
  autoCommit: z.boolean().default(true),
});

export const CommandsConfigSchema = z.object({
  install: z.string().nullable().optional(),
  lint: z.string().nullable().optional(),
  typecheck: z.string().nullable().optional(),
  test: z.string().nullable().optional(),
  build: z.string().nullable().optional(),
});

export const ReportingConfigSchema = z.object({
  reportOutputDir: z.string().default('daily-reports'),
  stateDir: z.string().default('daily-reports/state'),
  saveDiffPatch: z.boolean().default(true),
  saveCommandLogs: z.boolean().default(true),
});

export const LLMConfigSchema = z.object({
  provider: z.enum(['anthropic']).default('anthropic'),
  model: z.string().default('claude-sonnet-4-20250514'),
  maxTokens: z.number().int().min(100).max(100000).default(8192),
  temperature: z.number().min(0).max(1).default(0.1),
  promptLogging: z.boolean().default(true),
});

export const LinearIntegrationSchema = z.object({
  enabled: z.boolean().default(false),
  apiKey: z.string().optional(),
  teamId: z.string().optional(),
});

export const JiraIntegrationSchema = z.object({
  enabled: z.boolean().default(false),
  baseUrl: z.string().optional(),
  projectKey: z.string().optional(),
});

export const IntegrationsConfigSchema = z.object({
  githubCli: z.boolean().default(true),
  linear: LinearIntegrationSchema.optional(),
  jira: JiraIntegrationSchema.optional(),
});

export const AgentConfigSchema = z.object({
  timezone: z.string().default('America/New_York'),
  runTimeLocal: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).default('08:30'),
  repoPath: z.string().default('.'),
  defaultBranch: z.string().default('main'),
  packageManager: z.enum(['auto', 'npm', 'pnpm', 'yarn', 'bun']).default('auto'),
  github: GithubConfigSchema,
  riskPolicy: RiskPolicySchema.default({}),
  executionPolicy: ExecutionPolicySchema.default({}),
  commands: CommandsConfigSchema.default({}),
  reporting: ReportingConfigSchema.default({}),
  llm: LLMConfigSchema.default({}),
  integrations: IntegrationsConfigSchema.default({}),
});

export type GithubConfig = z.infer<typeof GithubConfigSchema>;
export type RiskPolicy = z.infer<typeof RiskPolicySchema>;
export type ExecutionPolicy = z.infer<typeof ExecutionPolicySchema>;
export type CommandsConfig = z.infer<typeof CommandsConfigSchema>;
export type ReportingConfig = z.infer<typeof ReportingConfigSchema>;
export type LLMConfig = z.infer<typeof LLMConfigSchema>;
export type IntegrationsConfig = z.infer<typeof IntegrationsConfigSchema>;
export type AgentConfig = z.infer<typeof AgentConfigSchema>;
