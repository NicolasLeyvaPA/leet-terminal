import fs from 'node:fs';
import path from 'node:path';
import type {
  AgentConfig,
  AgentState,
  AgentStage,
  ErrorInfo,
  ProcessedIssueRecord,
} from '../types/index.js';
import { logger, generateRunId, getDateString } from '../utils/index.js';

export class StateManager {
  private config: AgentConfig;
  private stateDir: string;
  private currentState: AgentState | null = null;

  constructor(config: AgentConfig) {
    this.config = config;
    this.stateDir = path.resolve(config.repoPath, config.reporting.stateDir);

    if (!fs.existsSync(this.stateDir)) {
      fs.mkdirSync(this.stateDir, { recursive: true });
    }
  }

  initializeRun(): AgentState {
    const date = getDateString(new Date(), this.config.timezone);
    const runId = generateRunId();

    this.currentState = {
      runId,
      date,
      startedAt: new Date().toISOString(),
      lastUpdatedAt: new Date().toISOString(),
      currentStage: 'preflight',
      completedStages: [],
      selectedIssues: [],
      commits: [],
      prUrls: [],
      errors: [],
      resumable: true,
    };

    this.saveState();
    logger.debug(`Initialized run: ${runId}`);
    return this.currentState;
  }

  updateStage(stage: AgentStage): void {
    if (!this.currentState) {
      throw new Error('No active run. Call initializeRun() first.');
    }

    // Add previous stage to completed if it exists
    if (
      this.currentState.currentStage &&
      !this.currentState.completedStages.includes(this.currentState.currentStage)
    ) {
      this.currentState.completedStages.push(this.currentState.currentStage);
    }

    this.currentState.currentStage = stage;
    this.currentState.lastUpdatedAt = new Date().toISOString();
    this.saveState();

    logger.debug(`Stage updated: ${stage}`);
  }

  setSelectedIssues(issueNumbers: number[]): void {
    if (!this.currentState) {
      throw new Error('No active run');
    }
    this.currentState.selectedIssues = issueNumbers;
    this.saveState();
  }

  setBranchName(branchName: string): void {
    if (!this.currentState) {
      throw new Error('No active run');
    }
    this.currentState.branchName = branchName;
    this.saveState();
  }

  addCommit(commitHash: string): void {
    if (!this.currentState) {
      throw new Error('No active run');
    }
    this.currentState.commits.push(commitHash);
    this.saveState();
  }

  addPrUrl(prUrl: string): void {
    if (!this.currentState) {
      throw new Error('No active run');
    }
    this.currentState.prUrls.push(prUrl);
    this.saveState();
  }

  addError(error: ErrorInfo): void {
    if (!this.currentState) {
      throw new Error('No active run');
    }
    this.currentState.errors.push(error);
    this.saveState();
  }

  markComplete(): void {
    if (!this.currentState) {
      throw new Error('No active run');
    }
    this.currentState.currentStage = 'complete';
    this.currentState.resumable = false;
    this.currentState.lastUpdatedAt = new Date().toISOString();
    this.saveState();
  }

  markFailed(): void {
    if (!this.currentState) {
      throw new Error('No active run');
    }
    this.currentState.currentStage = 'failed';
    this.currentState.lastUpdatedAt = new Date().toISOString();
    this.saveState();
  }

  getCurrentState(): AgentState | null {
    return this.currentState;
  }

  private getStateFilePath(date?: string): string {
    const d = date || this.currentState?.date || getDateString();
    return path.join(this.stateDir, `state-${d}.json`);
  }

  private saveState(): void {
    if (!this.currentState) return;

    const statePath = this.getStateFilePath();
    fs.writeFileSync(statePath, JSON.stringify(this.currentState, null, 2));
  }

  loadState(date: string): AgentState | null {
    const statePath = this.getStateFilePath(date);

    if (!fs.existsSync(statePath)) {
      return null;
    }

    try {
      const content = fs.readFileSync(statePath, 'utf-8');
      this.currentState = JSON.parse(content);
      return this.currentState;
    } catch (error) {
      logger.error(`Failed to load state for ${date}`, error);
      return null;
    }
  }

  canResume(date: string): boolean {
    const state = this.loadState(date);
    if (!state) return false;

    return (
      state.resumable &&
      state.currentStage !== 'complete' &&
      state.currentStage !== 'failed'
    );
  }

  getResumePoint(date: string): AgentStage | null {
    const state = this.loadState(date);
    if (!state || !state.resumable) return null;

    return state.currentStage;
  }

  // Track processed issues to avoid re-processing
  private getProcessedIssuesPath(): string {
    return path.join(this.stateDir, 'processed-issues.json');
  }

  loadProcessedIssues(): ProcessedIssueRecord[] {
    const filePath = this.getProcessedIssuesPath();
    if (!fs.existsSync(filePath)) {
      return [];
    }

    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(content);
    } catch {
      return [];
    }
  }

  saveProcessedIssue(record: ProcessedIssueRecord): void {
    const records = this.loadProcessedIssues();
    records.push(record);

    // Keep only last 30 days of records
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const filtered = records.filter(
      (r) => new Date(r.date) > thirtyDaysAgo
    );

    const filePath = this.getProcessedIssuesPath();
    fs.writeFileSync(filePath, JSON.stringify(filtered, null, 2));
  }

  getRecentlyProcessedIssues(days: number = 7): number[] {
    const records = this.loadProcessedIssues();
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);

    return records
      .filter((r) => new Date(r.date) > cutoff)
      .map((r) => r.issueNumber);
  }

  clearState(date: string): void {
    const statePath = this.getStateFilePath(date);
    if (fs.existsSync(statePath)) {
      fs.unlinkSync(statePath);
    }
    if (this.currentState?.date === date) {
      this.currentState = null;
    }
  }
}
