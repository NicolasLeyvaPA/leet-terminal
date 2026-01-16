import { execSync, ExecSyncOptions } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import type { AgentConfig, ValidationResult, CommandLog } from '../types/index.js';
import { logger, truncateOutput, sanitizeForReport } from '../utils/index.js';

export class Validator {
  private config: AgentConfig;
  private repoPath: string;
  private commandLogs: CommandLog[] = [];

  constructor(config: AgentConfig) {
    this.config = config;
    this.repoPath = path.resolve(config.repoPath);
  }

  async runAll(): Promise<ValidationResult[]> {
    logger.substage('Running validations');

    const results: ValidationResult[] = [];
    const commands = this.config.commands;

    // Install dependencies if needed
    if (commands.install) {
      const installResult = await this.runCommand('install', commands.install);
      results.push(installResult);
      if (!installResult.success) {
        logger.error('Install failed, skipping remaining validations');
        return results;
      }
    }

    // Run lint
    if (commands.lint) {
      results.push(await this.runCommand('lint', commands.lint));
    } else {
      results.push({
        step: 'lint',
        command: '',
        success: true,
        output: '',
        duration: 0,
        skipped: true,
        skipReason: 'No lint command configured',
      });
    }

    // Run typecheck
    if (commands.typecheck) {
      results.push(await this.runCommand('typecheck', commands.typecheck));
    } else {
      results.push({
        step: 'typecheck',
        command: '',
        success: true,
        output: '',
        duration: 0,
        skipped: true,
        skipReason: 'No typecheck command configured',
      });
    }

    // Run tests
    if (commands.test) {
      results.push(await this.runCommand('test', commands.test));
    } else {
      results.push({
        step: 'test',
        command: '',
        success: true,
        output: '',
        duration: 0,
        skipped: true,
        skipReason: 'No test command configured',
      });
    }

    // Run build
    if (commands.build) {
      results.push(await this.runCommand('build', commands.build));
    } else {
      results.push({
        step: 'build',
        command: '',
        success: true,
        output: '',
        duration: 0,
        skipped: true,
        skipReason: 'No build command configured',
      });
    }

    // Log summary
    const passed = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success && !r.skipped).length;
    const skipped = results.filter((r) => r.skipped).length;
    logger.info(
      `Validation complete: ${passed} passed, ${failed} failed, ${skipped} skipped`
    );

    return results;
  }

  async runCommand(step: string, command: string): Promise<ValidationResult> {
    logger.debug(`Running ${step}: ${command}`);
    const startTime = Date.now();

    const execOptions: ExecSyncOptions = {
      cwd: this.repoPath,
      encoding: 'utf-8',
      maxBuffer: 10 * 1024 * 1024, // 10MB
      timeout: 5 * 60 * 1000, // 5 minutes
      stdio: 'pipe',
    };

    try {
      const output = execSync(command, execOptions);
      const duration = Date.now() - startTime;

      const result: ValidationResult = {
        step,
        command,
        success: true,
        output: truncateOutput(sanitizeForReport(output as string)),
        duration,
      };

      this.logCommand(command, 0, output as string, '', startTime, Date.now());
      logger.success(`${step} passed (${duration}ms)`);

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      const execError = error as Error & {
        stdout?: string;
        stderr?: string;
        status?: number;
      };

      const output = sanitizeForReport(
        `${execError.stdout || ''}\n${execError.stderr || ''}`
      );

      const result: ValidationResult = {
        step,
        command,
        success: false,
        output: truncateOutput(output),
        duration,
      };

      this.logCommand(
        command,
        execError.status || 1,
        execError.stdout || '',
        execError.stderr || '',
        startTime,
        Date.now()
      );
      logger.error(`${step} failed (${duration}ms)`);

      return result;
    }
  }

  private logCommand(
    command: string,
    exitCode: number,
    stdout: string,
    stderr: string,
    startedAt: number,
    completedAt: number
  ): void {
    this.commandLogs.push({
      command,
      startedAt: new Date(startedAt).toISOString(),
      completedAt: new Date(completedAt).toISOString(),
      exitCode,
      stdout: sanitizeForReport(truncateOutput(stdout)),
      stderr: sanitizeForReport(truncateOutput(stderr)),
    });
  }

  getCommandLogs(): CommandLog[] {
    return this.commandLogs;
  }

  saveCommandLogs(date: string): string | null {
    if (!this.config.reporting.saveCommandLogs) {
      return null;
    }

    const logsDir = path.join(
      this.repoPath,
      this.config.reporting.reportOutputDir,
      'logs'
    );
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }

    const logFile = path.join(logsDir, `${date}-commands.json`);
    fs.writeFileSync(logFile, JSON.stringify(this.commandLogs, null, 2));

    return logFile;
  }

  clearLogs(): void {
    this.commandLogs = [];
  }

  async runSingleValidation(
    step: string,
    command: string
  ): Promise<ValidationResult> {
    return this.runCommand(step, command);
  }
}
