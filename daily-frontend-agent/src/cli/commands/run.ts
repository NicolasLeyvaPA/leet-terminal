import type { ExecutionMode, ErrorInfo, ImplementationResult } from '../../types/index.js';
import { loadConfig } from '../../utils/config-loader.js';
import { logger, generateRunId, getDateString } from '../../utils/index.js';
import {
  ContextCollector,
  IssueFetcher,
  TaskSelector,
  Planner,
  Implementer,
  Validator,
  GitManager,
  Reporter,
  StateManager,
  LLMClient,
} from '../../modules/index.js';

export interface RunOptions {
  mode: ExecutionMode;
  configPath?: string;
  verbose?: boolean;
}

export async function runCommand(options: RunOptions): Promise<void> {
  logger.stage('Daily Frontend Agent - Starting Run');
  logger.info(`Mode: ${options.mode}`);

  const errors: ErrorInfo[] = [];
  let implementations: ImplementationResult[] = [];

  // Load configuration
  const { config, configPath } = loadConfig(options.configPath);
  logger.info(`Config loaded from: ${configPath}`);

  // Initialize modules
  const stateManager = new StateManager(config);
  const contextCollector = new ContextCollector(config);
  const validator = new Validator(config);
  const gitManager = new GitManager(config);
  const reporter = new Reporter(config);

  let llm: LLMClient;
  let issueFetcher: IssueFetcher;
  let taskSelector: TaskSelector;
  let planner: Planner;
  let implementer: Implementer;

  try {
    llm = new LLMClient(config);
    issueFetcher = new IssueFetcher(config);
    taskSelector = new TaskSelector(config);
    planner = new Planner(config, llm);
    implementer = new Implementer(config, llm, validator);
  } catch (error) {
    const err = error as Error;
    logger.error('Failed to initialize modules', error);
    errors.push({
      stage: 'initialization',
      message: err.message,
      recoverable: false,
    });

    // Generate error report
    const preflight = await contextCollector.collect();
    const reportData = reporter.generateReport({
      runId: generateRunId(),
      mode: options.mode,
      preflight,
      scores: [],
      selected: [],
      plan: null,
      implementations: [],
      errors,
    });
    reporter.writeReports(reportData);
    throw error;
  }

  // Initialize state
  const state = stateManager.initializeRun();
  logger.info(`Run ID: ${state.runId}`);

  try {
    // Stage A: Preflight & Repo Discovery
    logger.stage('Stage A: Preflight & Repo Discovery');
    stateManager.updateStage('preflight');

    const preflight = await contextCollector.collect();

    logger.info('Preflight complete:');
    logger.info(`  Type: ${preflight.repoType}`);
    logger.info(`  Frameworks: ${preflight.frameworksDetected.join(', ')}`);
    logger.info(`  Package Manager: ${preflight.packageManager}`);
    logger.info(`  Branch: ${preflight.currentBranch}`);
    logger.info(`  Clean: ${preflight.isClean}`);

    // Check working tree if required
    if (config.executionPolicy.requireCleanWorkingTree && !preflight.isClean) {
      if (options.mode === 'execute') {
        throw new Error(
          'Working tree is not clean. Commit or stash changes before running in execute mode.'
        );
      }
      logger.warn('Working tree is not clean. Proceeding in non-execute mode.');
    }

    // Stage B: Issue/Ticket Harvest
    logger.stage('Stage B: Issue/Ticket Harvest');
    stateManager.updateStage('issue-harvest');

    const issues = await issueFetcher.fetchIssues();
    const recentlyProcessed = stateManager.getRecentlyProcessedIssues();
    const { selected, scores } = taskSelector.selectTasks(issues, recentlyProcessed);

    stateManager.setSelectedIssues(selected.map((s) => s.issue.number));

    logger.info(`Issues considered: ${scores.length}`);
    logger.info(`Issues selected: ${selected.length}`);

    if (selected.length === 0) {
      logger.warn('No issues selected for today.');
    }

    // Stage C: Daily Plan
    logger.stage('Stage C: Daily Plan');
    stateManager.updateStage('planning');

    const plan = await planner.createPlan(selected, preflight);

    logger.info(`Plan created with ${plan.goals.length} goals`);
    if (plan.exceedsBudget) {
      logger.warn(`Plan exceeds budget: ${plan.budgetExceededReason}`);
    }

    // Dry run or plan-only: stop here
    if (options.mode === 'dry-run' || options.mode === 'plan-only') {
      logger.stage('Stage E: Report & Exit');

      // Log plan summary
      console.log('\n' + planner.formatPlanAsMarkdown(plan));

      const reportData = reporter.generateReport({
        runId: state.runId,
        mode: options.mode,
        preflight,
        scores,
        selected,
        plan,
        implementations: [],
        errors,
      });

      const { markdown, json } = reporter.writeReports(reportData);
      logger.success(`Reports written to:\n  ${markdown}\n  ${json}`);

      stateManager.markComplete();
      return;
    }

    // Stage D: Execution (only in execute mode)
    logger.stage('Stage D: Execution');
    stateManager.updateStage('implementation');

    if (plan.exceedsBudget) {
      logger.warn('Skipping implementation due to budget exceeded. Switching to plan-only.');

      const reportData = reporter.generateReport({
        runId: state.runId,
        mode: 'plan-only',
        preflight,
        scores,
        selected,
        plan,
        implementations: [],
        errors: [{
          stage: 'implementation',
          message: plan.budgetExceededReason || 'Budget exceeded',
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

      // Skip plan-only tasks
      if (task.mode === 'plan-only') {
        logger.info(`Skipping issue #${task.issue.number} (plan-only mode)`);
        implementations.push({
          issue: task.issue,
          branch: '',
          success: false,
          commits: [],
          patchIterations: 0,
          validationResults: [],
          needsHuman: true,
          humanQuestions: ['This task is marked for plan-only. Review the plan and implement manually.'],
        });
        continue;
      }

      logger.substage(`Implementing issue #${task.issue.number}`);

      // Create branch
      const date = getDateString(new Date(), config.timezone);
      const branchName = gitManager.createAgentBranch(date, task.issue.title);
      stateManager.setBranchName(branchName);

      // Implement
      const result = await implementer.implementGoal(goal, task.issue);
      result.branch = branchName;

      if (result.success) {
        // Commit changes
        stateManager.updateStage('git-operations');
        const commitMessage = gitManager.formatCommitMessage(
          'feat',
          null,
          goal.description,
          task.issue.number
        );
        const commitHash = gitManager.commit(commitMessage);
        result.commits.push(commitHash);
        stateManager.addCommit(commitHash);

        // Create PR
        stateManager.updateStage('pr-creation');
        if (config.executionPolicy.createDraftPR) {
          const prUrl = await gitManager.createPullRequest({
            title: `[Agent] ${goal.description}`,
            body: generatePRBody(goal, task.issue, result),
            base: config.defaultBranch,
            head: branchName,
            draft: true,
          });

          if (prUrl) {
            result.prUrl = prUrl;
            stateManager.addPrUrl(prUrl);
          }
        }

        // Record as processed
        stateManager.saveProcessedIssue({
          issueNumber: task.issue.number,
          date,
          runId: state.runId,
          result: 'implemented',
          prUrl: result.prUrl,
          branchName,
        });
      } else {
        // Revert to default branch on failure
        gitManager.revertToDefault();

        stateManager.saveProcessedIssue({
          issueNumber: task.issue.number,
          date,
          runId: state.runId,
          result: 'failed',
        });

        errors.push({
          stage: 'implementation',
          message: result.error || 'Implementation failed',
          recoverable: true,
        });
      }

      implementations.push(result);
    }

    // Stage E: Report & Exit
    logger.stage('Stage E: Report & Exit');
    stateManager.updateStage('reporting');

    // Save validation logs
    validator.saveCommandLogs(getDateString(new Date(), config.timezone));

    const reportData = reporter.generateReport({
      runId: state.runId,
      mode: options.mode,
      preflight,
      scores,
      selected,
      plan,
      implementations,
      errors,
    });

    const { markdown, json } = reporter.writeReports(reportData);

    logger.success('Run complete!');
    logger.info(`Reports:\n  ${markdown}\n  ${json}`);

    // Summary
    const successCount = implementations.filter((i) => i.success).length;
    const failCount = implementations.filter((i) => !i.success).length;
    logger.info(`Results: ${successCount} succeeded, ${failCount} failed`);

    stateManager.markComplete();
  } catch (error) {
    const err = error as Error;
    logger.error('Run failed', error);

    errors.push({
      stage: stateManager.getCurrentState()?.currentStage || 'unknown',
      message: err.message,
      stack: err.stack,
      recoverable: false,
    });

    stateManager.addError(errors[errors.length - 1]);
    stateManager.markFailed();

    // Try to generate error report
    try {
      const preflight = await contextCollector.collect();
      const reportData = reporter.generateReport({
        runId: state.runId,
        mode: options.mode,
        preflight,
        scores: [],
        selected: [],
        plan: null,
        implementations,
        errors,
      });
      reporter.writeReports(reportData);
    } catch (reportError) {
      logger.error('Failed to generate error report', reportError);
    }

    throw error;
  }
}

function generatePRBody(
  goal: { description: string; acceptanceCriteria: string[]; rollbackPlan: string },
  issue: { number: number; title: string },
  result: ImplementationResult
): string {
  const lines: string[] = [];

  lines.push('## Summary');
  lines.push(goal.description);
  lines.push('');
  lines.push(`Closes #${issue.number}`);
  lines.push('');

  lines.push('## Acceptance Criteria');
  for (const criterion of goal.acceptanceCriteria) {
    lines.push(`- [ ] ${criterion}`);
  }
  lines.push('');

  lines.push('## Testing');
  lines.push('### Validations Run');
  for (const v of result.validationResults) {
    const status = v.skipped ? 'Skipped' : v.success ? 'Passed' : 'Failed';
    lines.push(`- ${v.step}: ${status}`);
  }
  lines.push('');

  lines.push('## Rollback Plan');
  lines.push(goal.rollbackPlan);
  lines.push('');

  lines.push('## Risk Notes');
  lines.push('This PR was created by the daily-frontend-agent. Please review carefully.');
  lines.push('');

  lines.push('---');
  lines.push('*Created by daily-frontend-agent*');

  return lines.join('\n');
}
