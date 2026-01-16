import fs from 'node:fs';
import path from 'node:path';
import { AgentConfigSchema, type AgentConfig } from '../types/config.js';
import { logger } from './logger.js';

const CONFIG_FILE_NAMES = [
  'daily-agent.config.json',
  'daily-agent.config.js',
  '.daily-agent.json',
];

export interface ConfigLoadResult {
  config: AgentConfig;
  configPath: string;
}

export function findConfigFile(startDir: string = process.cwd()): string | null {
  let currentDir = path.resolve(startDir);
  const root = path.parse(currentDir).root;

  while (currentDir !== root) {
    for (const fileName of CONFIG_FILE_NAMES) {
      const configPath = path.join(currentDir, fileName);
      if (fs.existsSync(configPath)) {
        return configPath;
      }
    }
    currentDir = path.dirname(currentDir);
  }

  return null;
}

export function loadConfig(configPath?: string): ConfigLoadResult {
  const resolvedPath = configPath
    ? path.resolve(configPath)
    : findConfigFile();

  if (!resolvedPath) {
    throw new Error(
      'No configuration file found. Create daily-agent.config.json or specify --config path.\n' +
      'See daily-agent.config.example.json for reference.'
    );
  }

  if (!fs.existsSync(resolvedPath)) {
    throw new Error(`Configuration file not found: ${resolvedPath}`);
  }

  logger.debug(`Loading config from: ${resolvedPath}`);

  const content = fs.readFileSync(resolvedPath, 'utf-8');
  let rawConfig: unknown;

  try {
    rawConfig = JSON.parse(content);
  } catch (e) {
    throw new Error(`Failed to parse config file as JSON: ${resolvedPath}\n${e}`);
  }

  const result = AgentConfigSchema.safeParse(rawConfig);

  if (!result.success) {
    const errors = result.error.errors.map(
      (e) => `  - ${e.path.join('.')}: ${e.message}`
    ).join('\n');
    throw new Error(`Invalid configuration:\n${errors}`);
  }

  return {
    config: result.data,
    configPath: resolvedPath,
  };
}

export function validateConfig(config: unknown): AgentConfig {
  const result = AgentConfigSchema.safeParse(config);
  if (!result.success) {
    throw new Error(`Invalid configuration: ${result.error.message}`);
  }
  return result.data;
}

export function getDefaultConfig(): AgentConfig {
  return AgentConfigSchema.parse({
    github: {
      owner: 'example',
      repo: 'example',
    },
  });
}
