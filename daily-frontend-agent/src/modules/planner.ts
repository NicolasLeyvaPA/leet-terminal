import type {
  AgentConfig,
  SelectedTask,
  DailyPlan,
  PlanGoal,
  PlanSubtask,
  PreflightSnapshot,
} from '../types/index.js';
import { logger, generateRunId, getDateString } from '../utils/index.js';
import { LLMClient } from './llm-client.js';
import { loadPrompt, PROMPTS } from '../prompts/index.js';

interface PlannerLLMResponse {
  goals: Array<{
    description: string;
    linkedIssue: number;
    acceptanceCriteria: string[];
    testPlan: string[];
    rollbackPlan: string;
    subtasks: Array<{
      description: string;
      filesToModify: string[];
      estimatedLines: number;
      dependencies: string[];
    }>;
  }>;
  unknowns: string[];
  assumptions: string[];
}

export class Planner {
  private config: AgentConfig;
  private llm: LLMClient;

  constructor(config: AgentConfig, llm: LLMClient) {
    this.config = config;
    this.llm = llm;
  }

  async createPlan(
    tasks: SelectedTask[],
    preflight: PreflightSnapshot
  ): Promise<DailyPlan> {
    logger.substage('Creating daily plan');

    const runId = generateRunId();
    const date = getDateString(new Date(), this.config.timezone);

    if (tasks.length === 0) {
      logger.info('No tasks to plan');
      return {
        date,
        runId,
        goals: [],
        unknowns: ['No tasks selected for today'],
        assumptions: [],
        totalEstimatedFiles: 0,
        totalEstimatedLines: 0,
        exceedsBudget: false,
      };
    }

    // Build context for the LLM
    const issueContext = tasks
      .map(
        (t) =>
          `Issue #${t.issue.number}: ${t.issue.title}\n` +
          `Labels: ${t.issue.labels.join(', ')}\n` +
          `Mode: ${t.mode}\n` +
          `Body:\n${t.issue.body || 'No description'}\n`
      )
      .join('\n---\n');

    const repoContext = `
Repository Context:
- Type: ${preflight.repoType}
- Frameworks: ${preflight.frameworksDetected.join(', ')}
- Package Manager: ${preflight.packageManager}
- Current Branch: ${preflight.currentBranch}
- Node Version: ${preflight.nodeVersion}

Risk Policy:
- Max files changed: ${this.config.riskPolicy.maxFilesChanged}
- Max lines changed: ${this.config.riskPolicy.maxLinesChanged}
- Disallow dependency changes: ${this.config.riskPolicy.disallowDependencyChanges}
- Allowed file patterns: ${this.config.riskPolicy.allowFileGlobs.join(', ')}
- Denied file patterns: ${this.config.riskPolicy.denyFileGlobs.join(', ')}
`;

    const systemPrompt = loadPrompt(PROMPTS.PLAN);
    const userPrompt = `
${repoContext}

Issues to plan:
${issueContext}

Create a detailed plan for these issues. For each issue, provide:
1. A clear goal description
2. Specific acceptance criteria
3. A test plan
4. A rollback plan
5. Subtasks with file modifications and estimated line changes

Also list any unknowns and assumptions.

Respond with valid JSON in this format:
{
  "goals": [
    {
      "description": "Goal description",
      "linkedIssue": <issue number>,
      "acceptanceCriteria": ["criterion 1", "criterion 2"],
      "testPlan": ["test step 1", "test step 2"],
      "rollbackPlan": "How to rollback",
      "subtasks": [
        {
          "description": "Subtask description",
          "filesToModify": ["path/to/file.ts"],
          "estimatedLines": 50,
          "dependencies": []
        }
      ]
    }
  ],
  "unknowns": ["unknown 1"],
  "assumptions": ["assumption 1"]
}
`;

    try {
      const { data } = await this.llm.completeWithJSON<PlannerLLMResponse>(
        userPrompt,
        systemPrompt
      );

      // Convert LLM response to plan structure
      const goals: PlanGoal[] = data.goals.map((g, index) => ({
        id: `goal-${index + 1}`,
        description: g.description,
        linkedIssue: g.linkedIssue,
        acceptanceCriteria: g.acceptanceCriteria,
        testPlan: g.testPlan,
        rollbackPlan: g.rollbackPlan,
        subtasks: g.subtasks.map((s, sIndex) => ({
          id: `subtask-${index + 1}-${sIndex + 1}`,
          description: s.description,
          filesToModify: s.filesToModify,
          estimatedLines: s.estimatedLines,
          dependencies: s.dependencies,
        })),
      }));

      // Calculate totals
      const totalEstimatedFiles = new Set(
        goals.flatMap((g) => g.subtasks.flatMap((s) => s.filesToModify))
      ).size;
      const totalEstimatedLines = goals.reduce(
        (sum, g) => sum + g.subtasks.reduce((s, t) => s + t.estimatedLines, 0),
        0
      );

      // Check budget
      const exceedsBudget =
        totalEstimatedFiles > this.config.riskPolicy.maxFilesChanged ||
        totalEstimatedLines > this.config.riskPolicy.maxLinesChanged;

      let budgetExceededReason: string | undefined;
      if (exceedsBudget) {
        budgetExceededReason =
          `Estimated changes (${totalEstimatedFiles} files, ${totalEstimatedLines} lines) ` +
          `exceed budget (${this.config.riskPolicy.maxFilesChanged} files, ${this.config.riskPolicy.maxLinesChanged} lines)`;
        logger.warn(budgetExceededReason);
      }

      const plan: DailyPlan = {
        date,
        runId,
        goals,
        unknowns: data.unknowns,
        assumptions: data.assumptions,
        totalEstimatedFiles,
        totalEstimatedLines,
        exceedsBudget,
        budgetExceededReason,
      };

      logger.info(`Plan created with ${goals.length} goals`);
      return plan;
    } catch (error) {
      logger.error('Failed to create plan', error);
      throw error;
    }
  }

  formatPlanAsMarkdown(plan: DailyPlan): string {
    const lines: string[] = [
      `# Daily Plan - ${plan.date}`,
      ``,
      `**Run ID:** ${plan.runId}`,
      ``,
    ];

    if (plan.exceedsBudget) {
      lines.push(
        `> **WARNING:** ${plan.budgetExceededReason}`,
        `> Implementation will be skipped. Review and adjust plan manually.`,
        ``
      );
    }

    lines.push(`## Summary`, ``);
    lines.push(`- **Goals:** ${plan.goals.length}`);
    lines.push(`- **Estimated Files:** ${plan.totalEstimatedFiles}`);
    lines.push(`- **Estimated Lines:** ${plan.totalEstimatedLines}`);
    lines.push(``);

    for (const goal of plan.goals) {
      lines.push(`## ${goal.id}: ${goal.description}`);
      lines.push(``);
      lines.push(`**Linked Issue:** #${goal.linkedIssue}`);
      lines.push(``);

      lines.push(`### Acceptance Criteria`);
      for (const criterion of goal.acceptanceCriteria) {
        lines.push(`- [ ] ${criterion}`);
      }
      lines.push(``);

      lines.push(`### Test Plan`);
      for (const step of goal.testPlan) {
        lines.push(`- [ ] ${step}`);
      }
      lines.push(``);

      lines.push(`### Rollback Plan`);
      lines.push(goal.rollbackPlan);
      lines.push(``);

      lines.push(`### Subtasks`);
      for (const subtask of goal.subtasks) {
        lines.push(`#### ${subtask.id}: ${subtask.description}`);
        lines.push(`- **Files:** ${subtask.filesToModify.join(', ')}`);
        lines.push(`- **Estimated Lines:** ${subtask.estimatedLines}`);
        if (subtask.dependencies.length > 0) {
          lines.push(`- **Dependencies:** ${subtask.dependencies.join(', ')}`);
        }
        lines.push(``);
      }
    }

    if (plan.unknowns.length > 0) {
      lines.push(`## Unknowns`);
      for (const unknown of plan.unknowns) {
        lines.push(`- ${unknown}`);
      }
      lines.push(``);
    }

    if (plan.assumptions.length > 0) {
      lines.push(`## Assumptions`);
      for (const assumption of plan.assumptions) {
        lines.push(`- ${assumption}`);
      }
      lines.push(``);
    }

    return lines.join('\n');
  }
}
