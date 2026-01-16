import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

// Mock environment variables
vi.stubEnv('GITHUB_TOKEN', 'test-token');
vi.stubEnv('ANTHROPIC_API_KEY', 'test-api-key');

// Mock Octokit
vi.mock('octokit', () => ({
  Octokit: vi.fn().mockImplementation(() => ({
    rest: {
      issues: {
        listForRepo: vi.fn().mockResolvedValue({
          data: [
            {
              number: 1,
              title: 'Test Issue',
              body: 'Test body content',
              labels: [{ name: 'agent:auto' }],
              state: 'open',
              created_at: '2024-01-01T00:00:00Z',
              updated_at: '2024-01-01T00:00:00Z',
              html_url: 'https://github.com/test/test/issues/1',
              comments: 0,
              assignees: [],
              milestone: null,
            },
          ],
        }),
      },
    },
  })),
}));

// Mock Anthropic
vi.mock('@anthropic-ai/sdk', () => ({
  default: vi.fn().mockImplementation(() => ({
    messages: {
      create: vi.fn().mockResolvedValue({
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              goals: [
                {
                  description: 'Implement test feature',
                  linkedIssue: 1,
                  acceptanceCriteria: ['Criterion 1', 'Criterion 2'],
                  testPlan: ['Test step 1'],
                  rollbackPlan: 'Revert the commit',
                  subtasks: [
                    {
                      description: 'Update component',
                      filesToModify: ['src/components/Test.tsx'],
                      estimatedLines: 50,
                      dependencies: [],
                    },
                  ],
                },
              ],
              unknowns: [],
              assumptions: ['Assuming standard React patterns'],
            }),
          },
        ],
        usage: { input_tokens: 100, output_tokens: 200 },
      }),
    },
  })),
}));

describe('Plan-Only Integration', () => {
  let tempDir: string;
  let originalCwd: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-integration-'));
    originalCwd = process.cwd();

    // Create mock repo structure
    fs.mkdirSync(path.join(tempDir, '.git'), { recursive: true });
    fs.mkdirSync(path.join(tempDir, 'src', 'components'), { recursive: true });
    fs.mkdirSync(path.join(tempDir, 'daily-reports', 'state'), { recursive: true });

    fs.writeFileSync(
      path.join(tempDir, 'package.json'),
      JSON.stringify({
        name: 'test-repo',
        scripts: {
          lint: 'eslint .',
          test: 'vitest',
          build: 'tsc',
        },
      })
    );

    fs.writeFileSync(
      path.join(tempDir, 'daily-agent.config.json'),
      JSON.stringify({
        github: {
          owner: 'test',
          repo: 'test',
          labelsForAutocode: ['agent:auto'],
          labelsForPlanOnly: ['agent:plan'],
          maxIssuesPerDay: 3,
        },
        riskPolicy: {
          maxFilesChanged: 10,
          maxLinesChanged: 400,
        },
      })
    );

    process.chdir(tempDir);
  });

  afterEach(() => {
    process.chdir(originalCwd);
    fs.rmSync(tempDir, { recursive: true, force: true });
    vi.clearAllMocks();
  });

  it('should load config from fixture', async () => {
    const { loadConfig } = await import('../../src/utils/config-loader.js');

    const { config } = loadConfig();
    expect(config.github.owner).toBe('test');
    expect(config.github.repo).toBe('test');
  });

  it('should detect package.json scripts', async () => {
    const { ContextCollector } = await import('../../src/modules/context-collector.js');
    const { loadConfig } = await import('../../src/utils/config-loader.js');

    const { config } = loadConfig();
    const collector = new ContextCollector(config);

    // Note: git commands will fail in the test, so we mock what we can
    const commands = (collector as unknown as { detectCommands: (pkg: unknown) => Record<string, string | null> }).detectCommands({
      scripts: {
        lint: 'eslint .',
        test: 'vitest',
        build: 'tsc',
      },
    });

    expect(commands.lint).toBe('npm run lint');
    expect(commands.test).toBe('npm run test');
    expect(commands.build).toBe('npm run build');
  });

  it('should score issues correctly', async () => {
    const { TaskSelector } = await import('../../src/modules/task-selector.js');
    const { loadConfig } = await import('../../src/utils/config-loader.js');

    const { config } = loadConfig();
    const selector = new TaskSelector(config);

    const issues = [
      {
        number: 1,
        title: 'Simple fix',
        body: 'Fix a small bug',
        labels: ['agent:auto', 'bug'],
        state: 'open',
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01',
        url: 'https://github.com/test/test/issues/1',
        commentsCount: 0,
        assignees: [],
        milestone: null,
      },
      {
        number: 2,
        title: 'Complex auth change',
        body: 'Update authentication flow',
        labels: ['agent:auto'],
        state: 'open',
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01',
        url: 'https://github.com/test/test/issues/2',
        commentsCount: 0,
        assignees: [],
        milestone: null,
      },
    ];

    const { scores } = selector.selectTasks(issues);

    const simpleScore = scores.find((s) => s.issue.number === 1);
    const authScore = scores.find((s) => s.issue.number === 2);

    expect(simpleScore).toBeDefined();
    expect(authScore).toBeDefined();
    expect(authScore!.riskScore).toBeGreaterThan(simpleScore!.riskScore);
  });

  it('should generate state with correct structure', async () => {
    const { StateManager } = await import('../../src/modules/state-manager.js');
    const { loadConfig } = await import('../../src/utils/config-loader.js');

    const { config } = loadConfig();
    const stateManager = new StateManager(config);

    const state = stateManager.initializeRun();

    expect(state).toHaveProperty('runId');
    expect(state).toHaveProperty('date');
    expect(state).toHaveProperty('currentStage');
    expect(state.currentStage).toBe('preflight');
    expect(state.resumable).toBe(true);
  });
});
