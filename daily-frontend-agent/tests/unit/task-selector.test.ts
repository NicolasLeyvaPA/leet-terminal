import { describe, it, expect, beforeEach } from 'vitest';
import { TaskSelector } from '../../src/modules/task-selector.js';
import type { AgentConfig, GithubIssue } from '../../src/types/index.js';

describe('TaskSelector', () => {
  let selector: TaskSelector;
  let mockConfig: AgentConfig;

  beforeEach(() => {
    mockConfig = {
      timezone: 'America/New_York',
      runTimeLocal: '08:30',
      repoPath: '.',
      defaultBranch: 'main',
      packageManager: 'auto',
      github: {
        owner: 'test',
        repo: 'test',
        labelsForAutocode: ['agent:auto'],
        labelsForPlanOnly: ['agent:plan'],
        maxIssuesPerDay: 3,
        excludeLabels: ['wontfix'],
      },
      riskPolicy: {
        maxFilesChanged: 10,
        maxLinesChanged: 400,
        disallowDependencyChanges: true,
        allowFileGlobs: ['src/**/*'],
        denyFileGlobs: ['.env*'],
        highRiskPatterns: ['**/auth/**'],
      },
      executionPolicy: {
        modeDefault: 'plan-only',
        createDraftPR: true,
        requireCleanWorkingTree: true,
        maxPatchIterations: 3,
        autoCommit: true,
      },
      commands: {},
      reporting: {
        reportOutputDir: 'daily-reports',
        stateDir: 'daily-reports/state',
        saveDiffPatch: true,
        saveCommandLogs: true,
      },
      llm: {
        provider: 'anthropic',
        model: 'claude-sonnet-4-20250514',
        maxTokens: 8192,
        temperature: 0.1,
        promptLogging: true,
      },
      integrations: {
        githubCli: true,
      },
    };

    selector = new TaskSelector(mockConfig);
  });

  const createIssue = (overrides: Partial<GithubIssue>): GithubIssue => ({
    number: 1,
    title: 'Test Issue',
    body: 'Test body',
    labels: [],
    state: 'open',
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01',
    url: 'https://github.com/test/test/issues/1',
    commentsCount: 0,
    assignees: [],
    milestone: null,
    ...overrides,
  });

  it('should select auto-implementable issues first', () => {
    const issues = [
      createIssue({ number: 1, labels: ['agent:plan'] }),
      createIssue({ number: 2, labels: ['agent:auto'] }),
      createIssue({ number: 3, labels: ['agent:auto'] }),
    ];

    const { selected } = selector.selectTasks(issues);

    expect(selected.length).toBe(3);
    expect(selected[0].issue.number).toBe(2);
    expect(selected[0].mode).toBe('implement');
    expect(selected[1].issue.number).toBe(3);
    expect(selected[1].mode).toBe('implement');
    expect(selected[2].issue.number).toBe(1);
    expect(selected[2].mode).toBe('plan-only');
  });

  it('should respect maxIssuesPerDay limit', () => {
    const issues = [
      createIssue({ number: 1, labels: ['agent:auto'] }),
      createIssue({ number: 2, labels: ['agent:auto'] }),
      createIssue({ number: 3, labels: ['agent:auto'] }),
      createIssue({ number: 4, labels: ['agent:auto'] }),
      createIssue({ number: 5, labels: ['agent:auto'] }),
    ];

    const { selected } = selector.selectTasks(issues);

    expect(selected.length).toBe(3); // maxIssuesPerDay
  });

  it('should filter out already processed issues', () => {
    const issues = [
      createIssue({ number: 1, labels: ['agent:auto'] }),
      createIssue({ number: 2, labels: ['agent:auto'] }),
      createIssue({ number: 3, labels: ['agent:auto'] }),
    ];

    const processedIssues = [1, 3];
    const { selected } = selector.selectTasks(issues, processedIssues);

    expect(selected.length).toBe(1);
    expect(selected[0].issue.number).toBe(2);
  });

  it('should score bugs higher than enhancements', () => {
    const issues = [
      createIssue({ number: 1, labels: ['agent:auto', 'enhancement'] }),
      createIssue({ number: 2, labels: ['agent:auto', 'bug'] }),
    ];

    const { scores } = selector.selectTasks(issues);

    const bugScore = scores.find((s) => s.issue.number === 2);
    const enhancementScore = scores.find((s) => s.issue.number === 1);

    expect(bugScore!.valueScore).toBeGreaterThan(enhancementScore!.valueScore);
  });

  it('should increase risk score for auth-related issues', () => {
    const issues = [
      createIssue({
        number: 1,
        labels: ['agent:auto'],
        title: 'Simple UI fix',
        body: 'Change button color',
      }),
      createIssue({
        number: 2,
        labels: ['agent:auto'],
        title: 'Fix authentication bug',
        body: 'Update auth flow',
      }),
    ];

    const { scores } = selector.selectTasks(issues);

    const authScore = scores.find((s) => s.issue.number === 2);
    const uiScore = scores.find((s) => s.issue.number === 1);

    expect(authScore!.riskScore).toBeGreaterThan(uiScore!.riskScore);
    expect(authScore!.riskReasons).toContain('Contains "auth"');
  });

  it('should mark high-risk issues as needing downgrade', () => {
    const highRiskScore = {
      issue: createIssue({ number: 1 }),
      valueScore: 5,
      effortScore: 5,
      riskScore: 8, // High risk
      combinedScore: 2,
      isAutoImplementable: true,
      isPlanOnly: false,
      riskReasons: ['Contains "payment"'],
      selectionReason: 'test',
    };

    const shouldDowngrade = selector.shouldDowngradeToPlanning(highRiskScore);
    expect(shouldDowngrade).toBe(true);
  });

  it('should not downgrade low-risk issues', () => {
    const lowRiskScore = {
      issue: createIssue({ number: 1 }),
      valueScore: 5,
      effortScore: 5,
      riskScore: 3, // Low risk
      combinedScore: 7,
      isAutoImplementable: true,
      isPlanOnly: false,
      riskReasons: [],
      selectionReason: 'test',
    };

    const shouldDowngrade = selector.shouldDowngradeToPlanning(lowRiskScore);
    expect(shouldDowngrade).toBe(false);
  });

  it('should format selection table correctly', () => {
    const issues = [
      createIssue({
        number: 1,
        title: 'Test Issue',
        labels: ['agent:auto'],
      }),
    ];

    const { scores } = selector.selectTasks(issues);
    const table = selector.formatSelectionTable(scores);

    expect(table).toContain('| # |');
    expect(table).toContain('| 1 |');
    expect(table).toContain('Test Issue');
    expect(table).toContain('Auto');
  });
});
