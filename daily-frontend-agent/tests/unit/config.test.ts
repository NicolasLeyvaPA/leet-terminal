import { describe, it, expect } from 'vitest';
import { AgentConfigSchema } from '../../src/types/config.js';

describe('Config Schema Validation', () => {
  it('should validate minimal config', () => {
    const config = {
      github: {
        owner: 'test-org',
        repo: 'test-repo',
      },
    };

    const result = AgentConfigSchema.safeParse(config);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.github.owner).toBe('test-org');
      expect(result.data.github.repo).toBe('test-repo');
      expect(result.data.defaultBranch).toBe('main');
    }
  });

  it('should apply defaults', () => {
    const config = {
      github: {
        owner: 'test',
        repo: 'test',
      },
    };

    const result = AgentConfigSchema.safeParse(config);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.timezone).toBe('America/New_York');
      expect(result.data.runTimeLocal).toBe('08:30');
      expect(result.data.packageManager).toBe('auto');
      expect(result.data.riskPolicy.maxFilesChanged).toBe(10);
      expect(result.data.riskPolicy.maxLinesChanged).toBe(400);
      expect(result.data.executionPolicy.modeDefault).toBe('plan-only');
      expect(result.data.executionPolicy.createDraftPR).toBe(true);
      expect(result.data.llm.temperature).toBe(0.1);
    }
  });

  it('should reject missing github config', () => {
    const config = {
      timezone: 'America/New_York',
    };

    const result = AgentConfigSchema.safeParse(config);
    expect(result.success).toBe(false);
  });

  it('should reject invalid timezone format', () => {
    const config = {
      github: { owner: 'test', repo: 'test' },
      runTimeLocal: 'invalid',
    };

    const result = AgentConfigSchema.safeParse(config);
    expect(result.success).toBe(false);
  });

  it('should validate full config', () => {
    const config = {
      timezone: 'Europe/London',
      runTimeLocal: '09:00',
      repoPath: './packages/frontend',
      defaultBranch: 'develop',
      packageManager: 'pnpm',
      github: {
        owner: 'my-org',
        repo: 'my-repo',
        labelsForAutocode: ['auto', 'quick-fix'],
        labelsForPlanOnly: ['needs-design'],
        maxIssuesPerDay: 5,
        excludeLabels: ['wontfix'],
      },
      riskPolicy: {
        maxFilesChanged: 5,
        maxLinesChanged: 200,
        disallowDependencyChanges: false,
        allowFileGlobs: ['src/**/*'],
        denyFileGlobs: ['.env'],
      },
      executionPolicy: {
        modeDefault: 'execute',
        createDraftPR: false,
        requireCleanWorkingTree: false,
        maxPatchIterations: 5,
      },
      llm: {
        provider: 'anthropic',
        model: 'claude-opus-4-20250514',
        temperature: 0.3,
        maxTokens: 16000,
      },
    };

    const result = AgentConfigSchema.safeParse(config);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.packageManager).toBe('pnpm');
      expect(result.data.github.maxIssuesPerDay).toBe(5);
      expect(result.data.riskPolicy.maxFilesChanged).toBe(5);
      expect(result.data.executionPolicy.maxPatchIterations).toBe(5);
    }
  });

  it('should reject invalid package manager', () => {
    const config = {
      github: { owner: 'test', repo: 'test' },
      packageManager: 'invalid',
    };

    const result = AgentConfigSchema.safeParse(config);
    expect(result.success).toBe(false);
  });

  it('should reject maxIssuesPerDay out of range', () => {
    const config = {
      github: {
        owner: 'test',
        repo: 'test',
        maxIssuesPerDay: 100,
      },
    };

    const result = AgentConfigSchema.safeParse(config);
    expect(result.success).toBe(false);
  });
});
