import type { ImplementationResult, ErrorInfo } from '../../types/index.js';
import { loadConfig } from '../../utils/config-loader.js';
import { logger, generateRunId, getDateString } from '../../utils/index.js';
import {
  ContextCollector,
  IssueFetcher,
  Planner,
  Implementer,
  Validator,
  GitManager,
  Reporter,
  StateManager,
  LLMClient,
} from '../../modules/index.js';

export interface ReplayOptions {
  date: string;
  feedback: string;
  configPath?: string;
}

export async function replayCommand(options: ReplayOptions): Promise<void> {
  logger.stage('Daily Frontend Agent - Replay with Feedback');
  logger.info(`Replaying run from ${options.date}`);
  logger.info(`Feedback: ${options.feedback}`);

  const errors: ErrorInfo[] = [];
  const implementations: ImplementationResult[] = [];

  const { config } = loadConfig(options.configPath);

  // Initialize modules
  const stateManager = new StateManager(config);
  const contextCollector = new ContextCollector(config);
  const reporter = new Reporter(config);

  // Load previous report
  const previousReport = reporter.readReport(options.date);
  if (!previousReport) {
    logger.error(`No report found for ${options.date}. Cannot replay.`);
    process.exit(1);
  }

  logger.info(`Found previous report: ${previousReport.runId}`);
  logger.info(`Previous mode: ${previousReport.mode}`);
  logger.info(`Previous issues: ${previousReport.issuesSelected.map((s) => `#${s.issue.number}`).join(', ')}`);

  // Initialize new run
  const llm = new LLMClient(config);
  const issueFetcher = new IssueFetcher(config);
  const validator = new Validator(config);
  const gitManager = new GitManager(config);
  const planner = new Planner(config, llm);
  const implementer = new Implementer(config, llm, validator);

  const state = stateManager.initializeRun();
  logger.info(`New Run ID: ${state.runId}`);

  try {
    // Preflight
    logger.stage('Stage A: Preflight');
    stateManager.updateStage('preflight');
    const preflight = await contextCollector.collect();

    // Re-fetch the issues from the previous run
    logger.stage('Stage B: Fetching Previous Issues');
    stateManager.updateStage('issue-harvest');

    const previousIssueNumbers = previousReport.issuesSelected.map((s) => s.issue.number);
    const issues = await Promise.all(
      previousIssueNumbers.map((num) => issueFetcher.getIssueDetails(num))
    );

    const validIssues = issues.filter((i) => i !== null);
    if (validIssues.length === 0) {
      throw new Error('Could not fetch any of the previous issues');
    }

    const selected = validIssues.map((issue) => ({
      issue: issue!,
      score: previousReport.issuesConsidered.find((s) => s.issue.number === issue!.number) || {
        issue: issue!,
        valueScore: 5,
        effortScore: 5,
        riskScore: 5,
        combinedScore: 5,
        isAutoImplementable: true,
        isPlanOnly: false,
        riskReasons: [],
        selectionReason: 'Replay',
      },
      mode: 'implement' as const,
    }));

    stateManager.setSelectedIssues(selected.map((s) => s.issue.number));

    // Create new plan with feedback incorporated
    logger.stage('Stage C: Creating Plan with Feedback');
    stateManager.updateStage('planning');

    // Modify planner context with feedback
    const feedbackContext = `
IMPORTANT: This is a REPLAY of a previous run.
The user provided the following feedback to incorporate:

"${options.feedback}"

Previous run results:
${previousReport.implementations.map((i) =>
  `- Issue #${i.issue.number}: ${i.success ? 'Succeeded' : 'Failed'}${i.error ? ` (${i.error})` : ''}`
).join('\n')}

Use this feedback to improve the plan and implementation.
`;

    // Create enhanced plan
    const plan = await planner.createPlan(selected, {
      ...preflight,
      // Add feedback as part of context
    });

    // Add feedback note to plan
    plan.assumptions.push(`Incorporating user feedback: ${options.feedback}`);

    logger.info(`Plan created with ${plan.goals.length} goals`);

    // Execute with feedback
    logger.stage('Stage D: Execution with Feedback');
    stateManager.updateStage('implementation');

    if (plan.exceedsBudget) {
      logger.warn('Plan exceeds budget. Generating plan-only report.');

      const reportData = reporter.generateReport({
        runId: state.runId,
        mode: 'plan-only',
        preflight,
        scores: selected.map((s) => s.score),
        selected,
        plan,
        implementations: [],
        errors: [{
          stage: 'planning',
          message: `Budget exceeded: ${plan.budgetExceededReason}`,
          recoverable: true,
        }],
      });

      reporter.writeReports(reportData);
      stateManager.markComplete();
      return;
    }

    // Process each goal
    for (const goal of plan.goals) {
      const task = selected.find((s) => s.issue.number === goal.linkedIssue);
      if (!task) continue;

      logger.substage(`Implementing issue #${task.issue.number} with feedback`);

      // Create branch
      const date = getDateString(new Date(), config.timezone);
      const branchName = gitManager.createAgentBranch(date, `replay-${task.issue.title}`);
      stateManager.setBranchName(branchName);

      // Implement with feedback context
      const result = await implementer.implementGoal(goal, task.issue);
      result.branch = branchName;

      if (result.success) {
        stateManager.updateStage('git-operations');
        const commitMessage = gitManager.formatCommitMessage(
          'feat',
          null,
          `[Replay] ${goal.description}`,
          task.issue.number
        );
        const commitHash = gitManager.commit(commitMessage);
        result.commits.push(commitHash);
        stateManager.addCommit(commitHash);

        stateManager.updateStage('pr-creation');
        if (config.executionPolicy.createDraftPR) {
          const prUrl = await gitManager.createPullRequest({
            title: `[Agent Replay] ${goal.description}`,
            body: generateReplayPRBody(goal, task.issue, result, options.feedback),
            base: config.defaultBranch,
            head: branchName,
            draft: true,
          });

          if (prUrl) {
            result.prUrl = prUrl;
            stateManager.addPrUrl(prUrl);
          }
        }
      } else {
        gitManager.revertToDefault();
        errors.push({
          stage: 'implementation',
          message: result.error || 'Implementation failed',
          recoverable: true,
        });
      }

      implementations.push(result);
    }

    // Generate report
    logger.stage('Stage E: Report');
    stateManager.updateStage('reporting');

    validator.saveCommandLogs(getDateString(new Date(), config.timezone));

    const reportData = reporter.generateReport({
      runId: state.runId,
      mode: 'execute',
      preflight,
      scores: selected.map((s) => s.score),
      selected,
      plan,
      implementations,
      errors,
    });

    // Add replay context to report
    reportData.suggestedPrompts.unshift(
      `# This was a replay of ${options.date}`,
      `# Feedback: ${options.feedback}`
    );

    const { markdown, json } = reporter.writeReports(reportData);

    logger.success('Replay complete!');
    logger.info(`Reports:\n  ${markdown}\n  ${json}`);

    const successCount = implementations.filter((i) => i.success).length;
    const failCount = implementations.filter((i) => !i.success).length;
    logger.info(`Results: ${successCount} succeeded, ${failCount} failed`);

    stateManager.markComplete();
  } catch (error) {
    const err = error as Error;
    logger.error('Replay failed', error);

    errors.push({
      stage: stateManager.getCurrentState()?.currentStage || 'unknown',
      message: err.message,
      stack: err.stack,
      recoverable: false,
    });

    stateManager.addError(errors[errors.length - 1]);
    stateManager.markFailed();

    throw error;
  }
}

function generateReplayPRBody(
  goal: { description: string; acceptanceCriteria: string[]; rollbackPlan: string },
  issue: { number: number },
  result: ImplementationResult,
  feedback: string
): string {
  const lines: string[] = [];

  lines.push('## Summary (Replay)');
  lines.push(goal.description);
  lines.push('');
  lines.push('> This PR was created as a replay with user feedback.');
  lines.push('');
  lines.push(`Closes #${issue.number}`);
  lines.push('');

  lines.push('## User Feedback Incorporated');
  lines.push(`> ${feedback}`);
  lines.push('');

  lines.push('## Acceptance Criteria');
  for (const criterion of goal.acceptanceCriteria) {
    lines.push(`- [ ] ${criterion}`);
  }
  lines.push('');

  lines.push('## Testing');
  for (const v of result.validationResults) {
    const status = v.skipped ? 'Skipped' : v.success ? 'Passed' : 'Failed';
    lines.push(`- ${v.step}: ${status}`);
  }
  lines.push('');

  lines.push('## Rollback Plan');
  lines.push(goal.rollbackPlan);
  lines.push('');

  lines.push('---');
  lines.push('*Created by daily-frontend-agent (replay mode)*');

  return lines.join('\n');
}
