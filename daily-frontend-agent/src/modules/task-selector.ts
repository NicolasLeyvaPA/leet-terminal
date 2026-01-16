import type {
  AgentConfig,
  GithubIssue,
  TaskScore,
  SelectedTask,
} from '../types/index.js';
import { logger } from '../utils/logger.js';
import { matchesGlob } from '../utils/helpers.js';

export class TaskSelector {
  private config: AgentConfig;

  constructor(config: AgentConfig) {
    this.config = config;
  }

  selectTasks(issues: GithubIssue[], processedIssues: number[] = []): {
    selected: SelectedTask[];
    scores: TaskScore[];
  } {
    logger.substage('Selecting tasks');

    // Filter out already processed issues
    const availableIssues = issues.filter(
      (issue) => !processedIssues.includes(issue.number)
    );

    logger.debug(`Available issues after filtering: ${availableIssues.length}`);

    // Score all issues
    const scores = availableIssues.map((issue) => this.scoreIssue(issue));

    // Sort by combined score (highest first)
    scores.sort((a, b) => b.combinedScore - a.combinedScore);

    // Log scoring table
    logger.info('Issue scoring:');
    for (const score of scores) {
      logger.debug(
        `#${score.issue.number}: V=${score.valueScore.toFixed(1)} E=${score.effortScore.toFixed(1)} R=${score.riskScore.toFixed(1)} => ${score.combinedScore.toFixed(1)} [${score.selectionReason}]`
      );
    }

    // Select top N issues
    const maxIssues = this.config.github.maxIssuesPerDay;
    const selected: SelectedTask[] = [];

    // Prioritize auto-implementable issues first
    const autoImplementable = scores.filter((s) => s.isAutoImplementable);
    const planOnly = scores.filter((s) => s.isPlanOnly && !s.isAutoImplementable);

    // Select auto-implementable first (up to maxIssues)
    for (const score of autoImplementable) {
      if (selected.length >= maxIssues) break;
      selected.push({
        issue: score.issue,
        score,
        mode: 'implement',
      });
    }

    // Fill remaining slots with plan-only
    for (const score of planOnly) {
      if (selected.length >= maxIssues) break;
      selected.push({
        issue: score.issue,
        score,
        mode: 'plan-only',
      });
    }

    logger.info(`Selected ${selected.length} tasks for today`);
    return { selected, scores };
  }

  private scoreIssue(issue: GithubIssue): TaskScore {
    const { labelsForAutocode, labelsForPlanOnly } = this.config.github;
    const { highRiskPatterns } = this.config.riskPolicy;

    const isAutoImplementable = issue.labels.some((l) =>
      labelsForAutocode.includes(l)
    );
    const isPlanOnly = issue.labels.some((l) => labelsForPlanOnly.includes(l));

    // Value score (0-10): based on labels, age, activity
    let valueScore = 5; // Base score
    if (issue.labels.includes('priority:high') || issue.labels.includes('P0'))
      valueScore += 3;
    if (issue.labels.includes('priority:medium') || issue.labels.includes('P1'))
      valueScore += 2;
    if (issue.labels.includes('bug')) valueScore += 2;
    if (issue.labels.includes('enhancement')) valueScore += 1;
    if (issue.labels.includes('good-first-issue')) valueScore += 1;
    if (issue.commentsCount > 5) valueScore += 1; // High engagement
    valueScore = Math.min(10, valueScore);

    // Effort score (0-10, lower is better for selection)
    let effortScore = 5;
    const bodyLength = issue.body?.length || 0;
    if (bodyLength < 200) effortScore += 2; // Short description might mean small task
    if (bodyLength > 1000) effortScore -= 1; // Long description might mean complex
    if (issue.labels.includes('complexity:low')) effortScore += 2;
    if (issue.labels.includes('complexity:high')) effortScore -= 2;
    if (issue.labels.includes('good-first-issue')) effortScore += 2;
    effortScore = Math.max(0, Math.min(10, effortScore));

    // Risk score (0-10, lower is better)
    let riskScore = 3;
    const riskReasons: string[] = [];

    // Check for high-risk keywords in title/body
    const content = `${issue.title} ${issue.body || ''}`.toLowerCase();
    const highRiskKeywords = [
      'auth',
      'authentication',
      'payment',
      'billing',
      'security',
      'admin',
      'database',
      'migration',
      'breaking',
      'refactor',
    ];

    for (const keyword of highRiskKeywords) {
      if (content.includes(keyword)) {
        riskScore += 2;
        riskReasons.push(`Contains "${keyword}"`);
      }
    }

    // Check labels for risk indicators
    const riskLabels = ['breaking-change', 'security', 'needs-review', 'complex'];
    for (const label of issue.labels) {
      if (riskLabels.some((rl) => label.toLowerCase().includes(rl))) {
        riskScore += 2;
        riskReasons.push(`Has risk label: ${label}`);
      }
    }

    riskScore = Math.min(10, riskScore);

    // Combined score: value + (10 - effort) - risk
    // Higher is better
    const combinedScore = valueScore + (10 - effortScore) - riskScore;

    // Selection reason
    let selectionReason = '';
    if (isAutoImplementable) {
      selectionReason = 'Auto-implementable (has agent:auto label)';
    } else if (isPlanOnly) {
      selectionReason = 'Plan-only (has agent:plan label)';
    } else {
      selectionReason = 'Not selected (no agent labels)';
    }

    if (riskScore >= 7) {
      selectionReason += ' [HIGH RISK - recommend plan-only]';
    }

    return {
      issue,
      valueScore,
      effortScore,
      riskScore,
      combinedScore,
      isAutoImplementable,
      isPlanOnly,
      riskReasons,
      selectionReason,
    };
  }

  shouldDowngradeToPlanning(score: TaskScore): boolean {
    // Downgrade to plan-only if risk is too high
    if (score.riskScore >= 7) {
      logger.warn(
        `Issue #${score.issue.number} has high risk (${score.riskScore}), downgrading to plan-only`
      );
      return true;
    }
    return false;
  }

  formatSelectionTable(scores: TaskScore[]): string {
    const header = '| # | Title | Value | Effort | Risk | Score | Mode |';
    const separator = '|---|-------|-------|--------|------|-------|------|';

    const rows = scores.map((s) => {
      const title =
        s.issue.title.length > 40
          ? s.issue.title.slice(0, 37) + '...'
          : s.issue.title;
      const mode = s.isAutoImplementable
        ? 'Auto'
        : s.isPlanOnly
          ? 'Plan'
          : 'Skip';
      return `| ${s.issue.number} | ${title} | ${s.valueScore.toFixed(1)} | ${s.effortScore.toFixed(1)} | ${s.riskScore.toFixed(1)} | ${s.combinedScore.toFixed(1)} | ${mode} |`;
    });

    return [header, separator, ...rows].join('\n');
  }
}
