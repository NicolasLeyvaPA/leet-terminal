#!/usr/bin/env node

import { Command } from 'commander';
import { runCommand } from './commands/run.js';
import { reportCommand } from './commands/report.js';
import { replayCommand } from './commands/replay.js';
import { logger, setVerbose } from '../utils/logger.js';

const program = new Command();

program
  .name('daily-agent')
  .description('Autonomous daily frontend engineering agent')
  .version('1.0.0');

program
  .command('run')
  .description('Run the daily agent')
  .option('--dry-run', 'Simulate without making changes')
  .option('--plan-only', 'Generate plan without implementing')
  .option('--execute', 'Execute implementation (creates branches and PRs)')
  .option('-c, --config <path>', 'Path to config file')
  .option('-v, --verbose', 'Enable verbose logging')
  .action(async (options) => {
    if (options.verbose) {
      setVerbose(true);
    }

    let mode: 'dry-run' | 'plan-only' | 'execute' = 'plan-only';
    if (options.dryRun) mode = 'dry-run';
    if (options.planOnly) mode = 'plan-only';
    if (options.execute) mode = 'execute';

    try {
      await runCommand({
        mode,
        configPath: options.config,
        verbose: options.verbose,
      });
    } catch (error) {
      logger.error('Run failed', error);
      process.exit(1);
    }
  });

program
  .command('report')
  .description('View a daily report')
  .requiredOption('-d, --date <YYYY-MM-DD>', 'Report date')
  .option('-c, --config <path>', 'Path to config file')
  .option('--json', 'Output as JSON')
  .action(async (options) => {
    try {
      await reportCommand({
        date: options.date,
        configPath: options.config,
        outputJson: options.json,
      });
    } catch (error) {
      logger.error('Report command failed', error);
      process.exit(1);
    }
  });

program
  .command('replay')
  .description('Replay a previous run with feedback')
  .requiredOption('-d, --date <YYYY-MM-DD>', 'Date of run to replay')
  .requiredOption('-f, --feedback <text>', 'Feedback to incorporate')
  .option('-c, --config <path>', 'Path to config file')
  .option('-v, --verbose', 'Enable verbose logging')
  .action(async (options) => {
    if (options.verbose) {
      setVerbose(true);
    }

    try {
      await replayCommand({
        date: options.date,
        feedback: options.feedback,
        configPath: options.config,
      });
    } catch (error) {
      logger.error('Replay command failed', error);
      process.exit(1);
    }
  });

program
  .command('init')
  .description('Initialize configuration file')
  .option('-f, --force', 'Overwrite existing config')
  .action(async (options) => {
    const fs = await import('node:fs');
    const path = await import('node:path');

    const configPath = path.join(process.cwd(), 'daily-agent.config.json');

    if (fs.existsSync(configPath) && !options.force) {
      logger.error(
        'Config file already exists. Use --force to overwrite.'
      );
      process.exit(1);
    }

    const exampleConfig = {
      timezone: 'America/New_York',
      runTimeLocal: '08:30',
      repoPath: '.',
      defaultBranch: 'main',
      packageManager: 'auto',
      github: {
        owner: 'YOUR_ORG',
        repo: 'YOUR_REPO',
        labelsForAutocode: ['agent:auto'],
        labelsForPlanOnly: ['agent:plan'],
        maxIssuesPerDay: 3,
      },
      riskPolicy: {
        maxFilesChanged: 10,
        maxLinesChanged: 400,
        disallowDependencyChanges: true,
      },
      executionPolicy: {
        modeDefault: 'plan-only',
        createDraftPR: true,
        requireCleanWorkingTree: true,
      },
      llm: {
        provider: 'anthropic',
        model: 'claude-sonnet-4-20250514',
        temperature: 0.1,
      },
    };

    fs.writeFileSync(configPath, JSON.stringify(exampleConfig, null, 2));
    logger.success(`Created ${configPath}`);
    logger.info('Edit the file to configure your repository settings.');
  });

program
  .command('status')
  .description('Show current agent status')
  .option('-c, --config <path>', 'Path to config file')
  .action(async (options) => {
    const { loadConfig } = await import('../utils/config-loader.js');
    const { StateManager } = await import('../modules/state-manager.js');
    const { getDateString } = await import('../utils/helpers.js');

    try {
      const { config } = loadConfig(options.config);
      const stateManager = new StateManager(config);
      const today = getDateString(new Date(), config.timezone);

      const state = stateManager.loadState(today);

      if (!state) {
        logger.info('No run today.');
        return;
      }

      console.log('\nAgent Status:');
      console.log(`  Run ID: ${state.runId}`);
      console.log(`  Date: ${state.date}`);
      console.log(`  Stage: ${state.currentStage}`);
      console.log(`  Started: ${state.startedAt}`);
      console.log(`  Last Updated: ${state.lastUpdatedAt}`);
      console.log(`  Issues: ${state.selectedIssues.join(', ') || 'None'}`);
      console.log(`  Commits: ${state.commits.length}`);
      console.log(`  PRs: ${state.prUrls.length}`);
      console.log(`  Errors: ${state.errors.length}`);
      console.log(`  Resumable: ${state.resumable}`);
    } catch (error) {
      logger.error('Status check failed', error);
      process.exit(1);
    }
  });

program.parse();
