import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { StateManager } from '../../src/modules/state-manager.js';
import type { AgentConfig } from '../../src/types/index.js';

describe('StateManager', () => {
  let stateManager: StateManager;
  let tempDir: string;
  let mockConfig: AgentConfig;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-test-'));

    mockConfig = {
      timezone: 'America/New_York',
      runTimeLocal: '08:30',
      repoPath: tempDir,
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

    stateManager = new StateManager(mockConfig);
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('should initialize a new run', () => {
    const state = stateManager.initializeRun();

    expect(state.runId).toBeDefined();
    expect(state.runId).toMatch(/^run-\d{8}-\d{6}-[a-f0-9]+$/);
    expect(state.currentStage).toBe('preflight');
    expect(state.completedStages).toEqual([]);
    expect(state.resumable).toBe(true);
  });

  it('should update stage and track completed stages', () => {
    stateManager.initializeRun();

    stateManager.updateStage('issue-harvest');
    let state = stateManager.getCurrentState();
    expect(state?.currentStage).toBe('issue-harvest');
    expect(state?.completedStages).toContain('preflight');

    stateManager.updateStage('planning');
    state = stateManager.getCurrentState();
    expect(state?.currentStage).toBe('planning');
    expect(state?.completedStages).toContain('issue-harvest');
  });

  it('should track selected issues', () => {
    stateManager.initializeRun();
    stateManager.setSelectedIssues([1, 2, 3]);

    const state = stateManager.getCurrentState();
    expect(state?.selectedIssues).toEqual([1, 2, 3]);
  });

  it('should track commits', () => {
    stateManager.initializeRun();
    stateManager.addCommit('abc123');
    stateManager.addCommit('def456');

    const state = stateManager.getCurrentState();
    expect(state?.commits).toEqual(['abc123', 'def456']);
  });

  it('should track PR URLs', () => {
    stateManager.initializeRun();
    stateManager.addPrUrl('https://github.com/test/test/pull/1');

    const state = stateManager.getCurrentState();
    expect(state?.prUrls).toContain('https://github.com/test/test/pull/1');
  });

  it('should track errors', () => {
    stateManager.initializeRun();
    stateManager.addError({
      stage: 'implementation',
      message: 'Test error',
      recoverable: true,
    });

    const state = stateManager.getCurrentState();
    expect(state?.errors.length).toBe(1);
    expect(state?.errors[0].message).toBe('Test error');
  });

  it('should mark run as complete', () => {
    stateManager.initializeRun();
    stateManager.markComplete();

    const state = stateManager.getCurrentState();
    expect(state?.currentStage).toBe('complete');
    expect(state?.resumable).toBe(false);
  });

  it('should mark run as failed', () => {
    stateManager.initializeRun();
    stateManager.markFailed();

    const state = stateManager.getCurrentState();
    expect(state?.currentStage).toBe('failed');
  });

  it('should persist and load state', () => {
    const state = stateManager.initializeRun();
    stateManager.setSelectedIssues([1, 2]);
    stateManager.updateStage('planning');

    // Create new state manager and load
    const newStateManager = new StateManager(mockConfig);
    const loadedState = newStateManager.loadState(state.date);

    expect(loadedState).not.toBeNull();
    expect(loadedState?.runId).toBe(state.runId);
    expect(loadedState?.selectedIssues).toEqual([1, 2]);
    expect(loadedState?.currentStage).toBe('planning');
  });

  it('should track processed issues', () => {
    stateManager.initializeRun();

    stateManager.saveProcessedIssue({
      issueNumber: 123,
      date: '2024-01-15',
      runId: 'run-123',
      result: 'implemented',
      prUrl: 'https://github.com/test/test/pull/1',
    });

    const processed = stateManager.loadProcessedIssues();
    expect(processed.length).toBe(1);
    expect(processed[0].issueNumber).toBe(123);
  });

  it('should get recently processed issues', () => {
    stateManager.initializeRun();

    // Add a recent issue
    stateManager.saveProcessedIssue({
      issueNumber: 1,
      date: new Date().toISOString().split('T')[0],
      runId: 'run-1',
      result: 'implemented',
    });

    const recent = stateManager.getRecentlyProcessedIssues(7);
    expect(recent).toContain(1);
  });

  it('should check if run can be resumed', () => {
    const state = stateManager.initializeRun();
    stateManager.updateStage('planning');

    const canResume = stateManager.canResume(state.date);
    expect(canResume).toBe(true);

    stateManager.markComplete();
    expect(stateManager.canResume(state.date)).toBe(false);
  });

  it('should return correct resume point', () => {
    const state = stateManager.initializeRun();
    stateManager.updateStage('implementation');

    const resumePoint = stateManager.getResumePoint(state.date);
    expect(resumePoint).toBe('implementation');
  });

  it('should clear state', () => {
    const state = stateManager.initializeRun();
    stateManager.clearState(state.date);

    const loadedState = stateManager.loadState(state.date);
    expect(loadedState).toBeNull();
  });
});
