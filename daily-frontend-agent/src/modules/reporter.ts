import fs from 'node:fs';
import path from 'node:path';
import type {
  AgentConfig,
  DailyReportData,
  PreflightSnapshot,
  TaskScore,
  SelectedTask,
  DailyPlan,
  ImplementationResult,
  ReportSummary,
  ErrorInfo,
  ExecutionMode,
} from '../types/index.js';
import { logger, sanitizeForReport, getDateString } from '../utils/index.js';

export class Reporter {
  private config: AgentConfig;
  private repoPath: string;

  constructor(config: AgentConfig) {
    this.config = config;
    this.repoPath = path.resolve(config.repoPath);
  }

  private getReportDir(): string {
    const reportDir = path.join(
      this.repoPath,
      this.config.reporting.reportOutputDir
    );
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }
    return reportDir;
  }

  generateReport(data: {
    runId: string;
    mode: ExecutionMode;
    preflight: PreflightSnapshot;
    scores: TaskScore[];
    selected: SelectedTask[];
    plan: DailyPlan | null;
    implementations: ImplementationResult[];
    errors: ErrorInfo[];
  }): DailyReportData {
    const date = getDateString(new Date(), this.config.timezone);

    const summary = this.calculateSummary(
      data.selected,
      data.implementations
    );

    const nextActions = this.generateNextActions(
      data.selected,
      data.implementations,
      data.plan
    );

    const suggestedPrompts = this.generateSuggestedPrompts(
      data.selected,
      data.implementations
    );

    return {
      runId: data.runId,
      date,
      timestamp: new Date().toISOString(),
      mode: data.mode,
      preflight: data.preflight,
      issuesConsidered: data.scores,
      issuesSelected: data.selected,
      plan: data.plan,
      implementations: data.implementations,
      summary,
      nextActions,
      suggestedPrompts,
      errors: data.errors,
    };
  }

  private calculateSummary(
    selected: SelectedTask[],
    implementations: ImplementationResult[]
  ): ReportSummary {
    const implemented = implementations.filter((i) => i.success);
    const failed = implementations.filter((i) => !i.success && !i.needsHuman);
    const planOnly = selected.filter((s) => s.mode === 'plan-only');

    let filesChanged = 0;
    let linesChanged = 0;
    let prsCreated = 0;

    for (const impl of implemented) {
      if (impl.prUrl) prsCreated++;
      // Count from validation results if available
      for (const result of impl.validationResults) {
        if (result.step === 'build' && result.success) {
          // We could parse actual stats from git here
        }
      }
    }

    const allValidationsPassed = implementations.every((i) =>
      i.validationResults.every((v) => v.success || v.skipped)
    );

    return {
      issuesProcessed: selected.length,
      issuesImplemented: implemented.length,
      issuesFailed: failed.length,
      issuesPlanOnly: planOnly.length,
      filesChanged,
      linesChanged,
      prsCreated,
      allValidationsPassed,
    };
  }

  private generateNextActions(
    selected: SelectedTask[],
    implementations: ImplementationResult[],
    plan: DailyPlan | null
  ): string[] {
    const actions: string[] = [];

    // Add actions for failed implementations
    for (const impl of implementations) {
      if (!impl.success) {
        if (impl.needsHuman && impl.humanQuestions) {
          actions.push(
            `Review issue #${impl.issue.number}: ${impl.humanQuestions.join(', ')}`
          );
        } else {
          actions.push(
            `Debug implementation failure for issue #${impl.issue.number}`
          );
        }
      }
    }

    // Add actions for plan-only tasks
    for (const task of selected) {
      if (task.mode === 'plan-only') {
        actions.push(
          `Review plan and implement issue #${task.issue.number} manually`
        );
      }
    }

    // Add actions for budget exceeded
    if (plan?.exceedsBudget) {
      actions.push(
        'Review plan - changes exceed risk budget. Consider breaking into smaller tasks.'
      );
    }

    // Default action if nothing else
    if (actions.length === 0) {
      if (implementations.length > 0 && implementations.every((i) => i.success)) {
        actions.push('Review and merge the created pull request(s)');
      } else {
        actions.push(
          'No issues selected for today. Add agent:auto or agent:plan labels to issues.'
        );
      }
    }

    return actions;
  }

  private generateSuggestedPrompts(
    selected: SelectedTask[],
    implementations: ImplementationResult[]
  ): string[] {
    const prompts: string[] = [];

    // Suggest replay for failed implementations
    for (const impl of implementations) {
      if (!impl.success) {
        prompts.push(
          `daily-agent replay --date TODAY --feedback "Focus on fixing the ${impl.validationResults.find((v) => !v.success)?.step || 'implementation'} error"`
        );
      }
    }

    // Suggest running with different modes
    prompts.push('daily-agent run --execute  # Run with actual implementation');
    prompts.push(
      'daily-agent run --plan-only  # Generate plans without implementing'
    );
    prompts.push('daily-agent report --date TODAY  # View today\'s report');

    return prompts;
  }

  writeReports(data: DailyReportData): { markdown: string; json: string } {
    const reportDir = this.getReportDir();
    const date = data.date;

    // Write markdown report
    const markdownContent = this.formatMarkdownReport(data);
    const markdownPath = path.join(reportDir, `${date}.md`);
    fs.writeFileSync(markdownPath, markdownContent);
    logger.info(`Markdown report written: ${markdownPath}`);

    // Write JSON report
    const jsonContent = JSON.stringify(data, null, 2);
    const jsonPath = path.join(reportDir, `${date}.json`);
    fs.writeFileSync(jsonPath, sanitizeForReport(jsonContent));
    logger.info(`JSON report written: ${jsonPath}`);

    return { markdown: markdownPath, json: jsonPath };
  }

  formatMarkdownReport(data: DailyReportData): string {
    const lines: string[] = [];

    lines.push(`# Daily Frontend Agent Report`);
    lines.push(`**Date:** ${data.date}`);
    lines.push(`**Run ID:** ${data.runId}`);
    lines.push(`**Mode:** ${data.mode}`);
    lines.push(`**Generated:** ${data.timestamp}`);
    lines.push(``);

    // Summary section
    lines.push(`## Summary`);
    lines.push(``);
    lines.push(`| Metric | Value |`);
    lines.push(`|--------|-------|`);
    lines.push(`| Issues Processed | ${data.summary.issuesProcessed} |`);
    lines.push(`| Issues Implemented | ${data.summary.issuesImplemented} |`);
    lines.push(`| Issues Failed | ${data.summary.issuesFailed} |`);
    lines.push(`| Plan-Only | ${data.summary.issuesPlanOnly} |`);
    lines.push(`| PRs Created | ${data.summary.prsCreated} |`);
    lines.push(
      `| All Validations Passed | ${data.summary.allValidationsPassed ? 'Yes' : 'No'} |`
    );
    lines.push(``);

    // Preflight section
    lines.push(`## Repository Context`);
    lines.push(``);
    lines.push(`- **Type:** ${data.preflight.repoType}`);
    lines.push(
      `- **Frameworks:** ${data.preflight.frameworksDetected.join(', ') || 'None detected'}`
    );
    lines.push(`- **Package Manager:** ${data.preflight.packageManager}`);
    lines.push(`- **Current Branch:** ${data.preflight.currentBranch}`);
    lines.push(`- **Working Tree Clean:** ${data.preflight.isClean ? 'Yes' : 'No'}`);
    lines.push(`- **Dependencies:** ${data.preflight.dependencyInstallStatus}`);
    lines.push(``);

    // Issues considered
    lines.push(`## Issues Considered`);
    lines.push(``);
    if (data.issuesConsidered.length === 0) {
      lines.push(`No issues found with relevant labels.`);
    } else {
      lines.push(`| # | Title | Value | Effort | Risk | Score | Mode |`);
      lines.push(`|---|-------|-------|--------|------|-------|------|`);
      for (const score of data.issuesConsidered) {
        const title =
          score.issue.title.length > 35
            ? score.issue.title.slice(0, 32) + '...'
            : score.issue.title;
        const mode = score.isAutoImplementable
          ? 'Auto'
          : score.isPlanOnly
            ? 'Plan'
            : 'Skip';
        lines.push(
          `| [#${score.issue.number}](${score.issue.url}) | ${title} | ${score.valueScore.toFixed(1)} | ${score.effortScore.toFixed(1)} | ${score.riskScore.toFixed(1)} | ${score.combinedScore.toFixed(1)} | ${mode} |`
        );
      }
    }
    lines.push(``);

    // Selected issues
    lines.push(`## Selected Issues`);
    lines.push(``);
    if (data.issuesSelected.length === 0) {
      lines.push(`No issues selected for today.`);
    } else {
      for (const selected of data.issuesSelected) {
        lines.push(
          `### [#${selected.issue.number}](${selected.issue.url}): ${selected.issue.title}`
        );
        lines.push(``);
        lines.push(`- **Mode:** ${selected.mode}`);
        lines.push(`- **Labels:** ${selected.issue.labels.join(', ')}`);
        lines.push(`- **Score:** ${selected.score.combinedScore.toFixed(1)}`);
        if (selected.score.riskReasons.length > 0) {
          lines.push(`- **Risk Factors:** ${selected.score.riskReasons.join(', ')}`);
        }
        lines.push(``);
      }
    }

    // Plan section
    if (data.plan) {
      lines.push(`## Daily Plan`);
      lines.push(``);
      if (data.plan.exceedsBudget) {
        lines.push(
          `> **WARNING:** ${data.plan.budgetExceededReason}`
        );
        lines.push(``);
      }
      lines.push(
        `- **Estimated Files:** ${data.plan.totalEstimatedFiles}`
      );
      lines.push(
        `- **Estimated Lines:** ${data.plan.totalEstimatedLines}`
      );
      lines.push(``);

      for (const goal of data.plan.goals) {
        lines.push(`### Goal: ${goal.description}`);
        lines.push(``);
        lines.push(`**Linked Issue:** #${goal.linkedIssue}`);
        lines.push(``);
        lines.push(`**Acceptance Criteria:**`);
        for (const criterion of goal.acceptanceCriteria) {
          lines.push(`- [ ] ${criterion}`);
        }
        lines.push(``);
      }

      if (data.plan.unknowns.length > 0) {
        lines.push(`### Unknowns`);
        for (const unknown of data.plan.unknowns) {
          lines.push(`- ${unknown}`);
        }
        lines.push(``);
      }
    }

    // Implementation results
    if (data.implementations.length > 0) {
      lines.push(`## Implementation Results`);
      lines.push(``);
      for (const impl of data.implementations) {
        const status = impl.success ? '✅' : impl.needsHuman ? '⚠️' : '❌';
        lines.push(
          `### ${status} Issue #${impl.issue.number}: ${impl.issue.title}`
        );
        lines.push(``);
        lines.push(`- **Branch:** ${impl.branch || 'N/A'}`);
        lines.push(`- **Success:** ${impl.success ? 'Yes' : 'No'}`);
        lines.push(`- **Iterations:** ${impl.patchIterations}`);
        if (impl.prUrl) {
          lines.push(`- **PR:** ${impl.prUrl}`);
        }
        if (impl.error) {
          lines.push(`- **Error:** ${impl.error}`);
        }
        if (impl.needsHuman && impl.humanQuestions) {
          lines.push(`- **Questions for Human:**`);
          for (const q of impl.humanQuestions) {
            lines.push(`  - ${q}`);
          }
        }
        lines.push(``);

        // Validation results
        if (impl.validationResults.length > 0) {
          lines.push(`**Validations:**`);
          lines.push(`| Step | Status | Duration |`);
          lines.push(`|------|--------|----------|`);
          for (const v of impl.validationResults) {
            const status = v.skipped
              ? '⏭️ Skipped'
              : v.success
                ? '✅ Passed'
                : '❌ Failed';
            const duration = v.skipped ? '-' : `${v.duration}ms`;
            lines.push(`| ${v.step} | ${status} | ${duration} |`);
          }
          lines.push(``);
        }
      }
    }

    // Errors section
    if (data.errors.length > 0) {
      lines.push(`## Errors`);
      lines.push(``);
      for (const error of data.errors) {
        lines.push(`### ${error.stage}`);
        lines.push(``);
        lines.push(`**Message:** ${error.message}`);
        lines.push(`**Recoverable:** ${error.recoverable ? 'Yes' : 'No'}`);
        lines.push(``);
      }
    }

    // Next actions
    lines.push(`## Next Actions`);
    lines.push(``);
    for (const action of data.nextActions) {
      lines.push(`- [ ] ${action}`);
    }
    lines.push(``);

    // Suggested prompts
    lines.push(`## Suggested Commands`);
    lines.push(``);
    lines.push('```bash');
    for (const prompt of data.suggestedPrompts) {
      lines.push(prompt);
    }
    lines.push('```');
    lines.push(``);

    lines.push(`---`);
    lines.push(`*Generated by daily-frontend-agent*`);

    return lines.join('\n');
  }

  readReport(date: string): DailyReportData | null {
    const reportDir = this.getReportDir();
    const jsonPath = path.join(reportDir, `${date}.json`);

    if (!fs.existsSync(jsonPath)) {
      return null;
    }

    try {
      const content = fs.readFileSync(jsonPath, 'utf-8');
      return JSON.parse(content);
    } catch {
      return null;
    }
  }
}
