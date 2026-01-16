import { execSync } from 'node:child_process';
import path from 'node:path';
import type { AgentConfig } from '../types/index.js';
import { logger, createBranchName, slugify } from '../utils/index.js';

export class GitManager {
  private config: AgentConfig;
  private repoPath: string;

  constructor(config: AgentConfig) {
    this.config = config;
    this.repoPath = path.resolve(config.repoPath);
  }

  private exec(command: string): string {
    return execSync(command, {
      cwd: this.repoPath,
      encoding: 'utf-8',
      maxBuffer: 10 * 1024 * 1024,
    }).trim();
  }

  getCurrentBranch(): string {
    return this.exec('git rev-parse --abbrev-ref HEAD');
  }

  isWorkingTreeClean(): boolean {
    const status = this.exec('git status --porcelain');
    return status.length === 0;
  }

  createBranch(branchName: string): void {
    logger.debug(`Creating branch: ${branchName}`);
    this.exec(`git checkout -b "${branchName}"`);
  }

  checkoutBranch(branchName: string): void {
    logger.debug(`Checking out branch: ${branchName}`);
    this.exec(`git checkout "${branchName}"`);
  }

  createAgentBranch(date: string, issueTitle: string): string {
    const branchName = createBranchName(date, issueTitle);

    // Ensure we're on the default branch first
    try {
      this.exec(`git checkout ${this.config.defaultBranch}`);
    } catch {
      logger.warn(`Could not checkout ${this.config.defaultBranch}`);
    }

    // Pull latest
    try {
      this.exec(`git pull origin ${this.config.defaultBranch}`);
    } catch {
      logger.warn('Could not pull latest changes');
    }

    // Create and checkout new branch
    this.createBranch(branchName);
    return branchName;
  }

  stageAll(): void {
    this.exec('git add -A');
  }

  stageFiles(files: string[]): void {
    for (const file of files) {
      this.exec(`git add "${file}"`);
    }
  }

  commit(message: string): string {
    this.stageAll();
    this.exec(`git commit -m "${message.replace(/"/g, '\\"')}"`);
    return this.exec('git rev-parse HEAD').slice(0, 7);
  }

  getLastCommitHash(): string {
    return this.exec('git rev-parse HEAD').slice(0, 7);
  }

  getCommitsBetween(base: string, head: string = 'HEAD'): string[] {
    const log = this.exec(`git log --oneline ${base}..${head}`);
    return log.split('\n').filter(Boolean);
  }

  getDiff(base: string = 'HEAD~1'): string {
    return this.exec(`git diff ${base} HEAD`);
  }

  getDiffStats(): { files: number; additions: number; deletions: number } {
    const stat = this.exec('git diff --stat HEAD~1 HEAD');
    const lines = stat.split('\n');
    const summaryLine = lines[lines.length - 1];

    const filesMatch = summaryLine.match(/(\d+) files? changed/);
    const additionsMatch = summaryLine.match(/(\d+) insertions?/);
    const deletionsMatch = summaryLine.match(/(\d+) deletions?/);

    return {
      files: filesMatch ? parseInt(filesMatch[1], 10) : 0,
      additions: additionsMatch ? parseInt(additionsMatch[1], 10) : 0,
      deletions: deletionsMatch ? parseInt(deletionsMatch[1], 10) : 0,
    };
  }

  push(branchName: string): void {
    logger.debug(`Pushing branch: ${branchName}`);
    this.exec(`git push -u origin "${branchName}"`);
  }

  async createPullRequest(options: {
    title: string;
    body: string;
    base: string;
    head: string;
    draft: boolean;
  }): Promise<string | null> {
    if (!this.config.integrations.githubCli) {
      logger.warn('GitHub CLI integration disabled, skipping PR creation');
      return null;
    }

    try {
      // Push the branch first
      this.push(options.head);

      // Create PR using gh CLI
      const draftFlag = options.draft ? '--draft' : '';
      const bodyEscaped = options.body.replace(/'/g, "'\\''");

      const command = `gh pr create --title "${options.title.replace(/"/g, '\\"')}" --body '${bodyEscaped}' --base "${options.base}" --head "${options.head}" ${draftFlag}`;

      const prUrl = this.exec(command);
      logger.success(`Pull request created: ${prUrl}`);
      return prUrl;
    } catch (error) {
      logger.error('Failed to create pull request', error);
      return null;
    }
  }

  revertToDefault(): void {
    try {
      // Discard all changes
      this.exec('git checkout -- .');
      this.exec('git clean -fd');

      // Checkout default branch
      this.exec(`git checkout ${this.config.defaultBranch}`);
    } catch (error) {
      logger.error('Failed to revert to default branch', error);
    }
  }

  deleteBranch(branchName: string, force: boolean = false): void {
    const forceFlag = force ? '-D' : '-d';
    try {
      this.exec(`git branch ${forceFlag} "${branchName}"`);
    } catch (error) {
      logger.warn(`Could not delete branch ${branchName}`, error);
    }
  }

  branchExists(branchName: string): boolean {
    try {
      this.exec(`git rev-parse --verify "${branchName}"`);
      return true;
    } catch {
      return false;
    }
  }

  getRemoteUrl(): string | null {
    try {
      return this.exec('git remote get-url origin');
    } catch {
      return null;
    }
  }

  formatCommitMessage(
    type: string,
    scope: string | null,
    description: string,
    issueNumber?: number
  ): string {
    const scopePart = scope ? `(${scope})` : '';
    const issuePart = issueNumber ? `\n\nCloses #${issueNumber}` : '';
    return `${type}${scopePart}: ${description}${issuePart}`;
  }
}
