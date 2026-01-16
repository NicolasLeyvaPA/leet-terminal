export type ExecutionMode = 'dry-run' | 'plan-only' | 'execute';

export interface RunOptions {
  mode: ExecutionMode;
  configPath?: string;
  date?: string;
  verbose?: boolean;
}

export interface ReportOptions {
  date: string;
  configPath?: string;
}

export interface ReplayOptions {
  date: string;
  feedback: string;
  configPath?: string;
}

export interface PreflightSnapshot {
  repoType: 'monorepo' | 'single';
  frameworksDetected: string[];
  commandsDetected: Record<string, string | null>;
  currentBranch: string;
  isClean: boolean;
  uncommittedChanges: string[];
  defaultBranchExists: boolean;
  dependencyInstallStatus: 'installed' | 'needs-install' | 'unknown';
  packageManager: string;
  nodeVersion: string | null;
  timestamp: string;
}

export interface GithubIssue {
  number: number;
  title: string;
  body: string | null;
  labels: string[];
  state: string;
  createdAt: string;
  updatedAt: string;
  url: string;
  commentsCount: number;
  assignees: string[];
  milestone: string | null;
}

export interface TaskScore {
  issue: GithubIssue;
  valueScore: number;
  effortScore: number;
  riskScore: number;
  combinedScore: number;
  isAutoImplementable: boolean;
  isPlanOnly: boolean;
  riskReasons: string[];
  selectionReason: string;
}

export interface SelectedTask {
  issue: GithubIssue;
  score: TaskScore;
  mode: 'implement' | 'plan-only';
}

export interface PlanGoal {
  id: string;
  description: string;
  linkedIssue: number;
  acceptanceCriteria: string[];
  testPlan: string[];
  rollbackPlan: string;
  subtasks: PlanSubtask[];
}

export interface PlanSubtask {
  id: string;
  description: string;
  filesToModify: string[];
  estimatedLines: number;
  dependencies: string[];
}

export interface DailyPlan {
  date: string;
  runId: string;
  goals: PlanGoal[];
  unknowns: string[];
  assumptions: string[];
  totalEstimatedFiles: number;
  totalEstimatedLines: number;
  exceedsBudget: boolean;
  budgetExceededReason?: string;
}

export interface PatchResult {
  success: boolean;
  patch: string;
  filesChanged: string[];
  linesAdded: number;
  linesRemoved: number;
  error?: string;
}

export interface ValidationResult {
  step: string;
  command: string;
  success: boolean;
  output: string;
  duration: number;
  skipped?: boolean;
  skipReason?: string;
}

export interface ImplementationResult {
  issue: GithubIssue;
  branch: string;
  success: boolean;
  commits: string[];
  patchIterations: number;
  validationResults: ValidationResult[];
  prUrl?: string;
  error?: string;
  needsHuman?: boolean;
  humanQuestions?: string[];
}

export interface DailyReportData {
  runId: string;
  date: string;
  timestamp: string;
  mode: ExecutionMode;
  preflight: PreflightSnapshot;
  issuesConsidered: TaskScore[];
  issuesSelected: SelectedTask[];
  plan: DailyPlan | null;
  implementations: ImplementationResult[];
  summary: ReportSummary;
  nextActions: string[];
  suggestedPrompts: string[];
  errors: ErrorInfo[];
}

export interface ReportSummary {
  issuesProcessed: number;
  issuesImplemented: number;
  issuesFailed: number;
  issuesPlanOnly: number;
  filesChanged: number;
  linesChanged: number;
  prsCreated: number;
  allValidationsPassed: boolean;
}

export interface ErrorInfo {
  stage: string;
  message: string;
  stack?: string;
  recoverable: boolean;
}

export interface AgentState {
  runId: string;
  date: string;
  startedAt: string;
  lastUpdatedAt: string;
  currentStage: AgentStage;
  completedStages: AgentStage[];
  selectedIssues: number[];
  branchName?: string;
  commits: string[];
  prUrls: string[];
  errors: ErrorInfo[];
  resumable: boolean;
}

export type AgentStage =
  | 'preflight'
  | 'issue-harvest'
  | 'planning'
  | 'implementation'
  | 'validation'
  | 'git-operations'
  | 'pr-creation'
  | 'reporting'
  | 'complete'
  | 'failed';

export interface CommandLog {
  command: string;
  startedAt: string;
  completedAt: string;
  exitCode: number;
  stdout: string;
  stderr: string;
}

export interface ProcessedIssueRecord {
  issueNumber: number;
  date: string;
  runId: string;
  result: 'implemented' | 'plan-only' | 'failed' | 'skipped';
  prUrl?: string;
  branchName?: string;
}
