import chalk from 'chalk';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

let currentLevel: LogLevel = 'info';
let verbose = false;

const levels: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

export function setLogLevel(level: LogLevel): void {
  currentLevel = level;
}

export function setVerbose(v: boolean): void {
  verbose = v;
  if (v) {
    currentLevel = 'debug';
  }
}

function shouldLog(level: LogLevel): boolean {
  return levels[level] >= levels[currentLevel];
}

function timestamp(): string {
  return new Date().toISOString();
}

export const logger = {
  debug(message: string, ...args: unknown[]): void {
    if (shouldLog('debug')) {
      console.log(chalk.gray(`[${timestamp()}] [DEBUG]`), message, ...args);
    }
  },

  info(message: string, ...args: unknown[]): void {
    if (shouldLog('info')) {
      console.log(chalk.blue(`[${timestamp()}] [INFO]`), message, ...args);
    }
  },

  success(message: string, ...args: unknown[]): void {
    if (shouldLog('info')) {
      console.log(chalk.green(`[${timestamp()}] [SUCCESS]`), message, ...args);
    }
  },

  warn(message: string, ...args: unknown[]): void {
    if (shouldLog('warn')) {
      console.log(chalk.yellow(`[${timestamp()}] [WARN]`), message, ...args);
    }
  },

  error(message: string, ...args: unknown[]): void {
    if (shouldLog('error')) {
      console.error(chalk.red(`[${timestamp()}] [ERROR]`), message, ...args);
    }
  },

  stage(stage: string): void {
    console.log(chalk.cyan(`\n${'='.repeat(60)}`));
    console.log(chalk.cyan.bold(`  STAGE: ${stage}`));
    console.log(chalk.cyan(`${'='.repeat(60)}\n`));
  },

  substage(substage: string): void {
    console.log(chalk.magenta(`\n--- ${substage} ---\n`));
  },

  table(data: Record<string, unknown>[]): void {
    if (data.length === 0) return;
    console.table(data);
  },

  json(data: unknown): void {
    if (verbose) {
      console.log(JSON.stringify(data, null, 2));
    }
  },
};

export default logger;
