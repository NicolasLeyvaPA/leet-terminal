import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { glob } from 'glob';
import type { AgentConfig, PreflightSnapshot } from '../types/index.js';
import { logger } from '../utils/logger.js';

interface PackageJson {
  name?: string;
  scripts?: Record<string, string>;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  workspaces?: string[] | { packages: string[] };
}

export class ContextCollector {
  private config: AgentConfig;
  private repoPath: string;

  constructor(config: AgentConfig) {
    this.config = config;
    this.repoPath = path.resolve(config.repoPath);
  }

  async collect(): Promise<PreflightSnapshot> {
    logger.substage('Collecting repository context');

    const packageJson = this.readPackageJson();
    const frameworks = this.detectFrameworks(packageJson);
    const commands = this.detectCommands(packageJson);
    const gitStatus = this.getGitStatus();
    const packageManager = this.detectPackageManager();
    const nodeVersion = this.getNodeVersion();
    const isMonorepo = this.detectMonorepo(packageJson);

    const snapshot: PreflightSnapshot = {
      repoType: isMonorepo ? 'monorepo' : 'single',
      frameworksDetected: frameworks,
      commandsDetected: commands,
      currentBranch: gitStatus.branch,
      isClean: gitStatus.isClean,
      uncommittedChanges: gitStatus.changes,
      defaultBranchExists: this.checkBranchExists(this.config.defaultBranch),
      dependencyInstallStatus: this.checkDependenciesInstalled(),
      packageManager,
      nodeVersion,
      timestamp: new Date().toISOString(),
    };

    logger.debug('Preflight snapshot:', snapshot);
    return snapshot;
  }

  private readPackageJson(): PackageJson | null {
    const packageJsonPath = path.join(this.repoPath, 'package.json');
    if (!fs.existsSync(packageJsonPath)) {
      logger.warn('No package.json found');
      return null;
    }

    try {
      const content = fs.readFileSync(packageJsonPath, 'utf-8');
      return JSON.parse(content);
    } catch (e) {
      logger.error('Failed to parse package.json', e);
      return null;
    }
  }

  private detectFrameworks(packageJson: PackageJson | null): string[] {
    const frameworks: string[] = [];
    if (!packageJson) return frameworks;

    const deps = {
      ...packageJson.dependencies,
      ...packageJson.devDependencies,
    };

    const frameworkMap: Record<string, string> = {
      'next': 'Next.js',
      'react': 'React',
      'vue': 'Vue',
      'nuxt': 'Nuxt',
      'svelte': 'Svelte',
      '@sveltejs/kit': 'SvelteKit',
      'angular': 'Angular',
      '@angular/core': 'Angular',
      'vite': 'Vite',
      'gatsby': 'Gatsby',
      'remix': 'Remix',
      '@remix-run/react': 'Remix',
      'astro': 'Astro',
      'solid-js': 'SolidJS',
      'preact': 'Preact',
    };

    for (const [pkg, name] of Object.entries(frameworkMap)) {
      if (deps[pkg]) {
        frameworks.push(name);
      }
    }

    // Detect CSS frameworks
    const cssFrameworks: Record<string, string> = {
      'tailwindcss': 'Tailwind CSS',
      '@chakra-ui/react': 'Chakra UI',
      '@mui/material': 'Material UI',
      'styled-components': 'Styled Components',
      '@emotion/react': 'Emotion',
      'sass': 'Sass',
    };

    for (const [pkg, name] of Object.entries(cssFrameworks)) {
      if (deps[pkg]) {
        frameworks.push(name);
      }
    }

    // Detect testing frameworks
    const testFrameworks: Record<string, string> = {
      'vitest': 'Vitest',
      'jest': 'Jest',
      '@testing-library/react': 'React Testing Library',
      'cypress': 'Cypress',
      'playwright': 'Playwright',
    };

    for (const [pkg, name] of Object.entries(testFrameworks)) {
      if (deps[pkg]) {
        frameworks.push(name);
      }
    }

    return [...new Set(frameworks)];
  }

  private detectCommands(packageJson: PackageJson | null): Record<string, string | null> {
    const commands: Record<string, string | null> = {
      install: null,
      lint: null,
      typecheck: null,
      test: null,
      build: null,
    };

    // Use config overrides first
    if (this.config.commands.install) commands.install = this.config.commands.install;
    if (this.config.commands.lint) commands.lint = this.config.commands.lint;
    if (this.config.commands.typecheck) commands.typecheck = this.config.commands.typecheck;
    if (this.config.commands.test) commands.test = this.config.commands.test;
    if (this.config.commands.build) commands.build = this.config.commands.build;

    if (!packageJson?.scripts) return commands;

    const scripts = packageJson.scripts;

    // Auto-detect install command based on package manager
    if (!commands.install) {
      const pm = this.detectPackageManager();
      commands.install = `${pm} install`;
    }

    // Auto-detect lint
    if (!commands.lint) {
      if (scripts.lint) commands.lint = 'npm run lint';
      else if (scripts['lint:fix']) commands.lint = 'npm run lint:fix';
    }

    // Auto-detect typecheck
    if (!commands.typecheck) {
      if (scripts.typecheck) commands.typecheck = 'npm run typecheck';
      else if (scripts['type-check']) commands.typecheck = 'npm run type-check';
      else if (scripts.tsc) commands.typecheck = 'npm run tsc';
      else if (fs.existsSync(path.join(this.repoPath, 'tsconfig.json'))) {
        commands.typecheck = 'npx tsc --noEmit';
      }
    }

    // Auto-detect test
    if (!commands.test) {
      if (scripts.test && scripts.test !== 'echo "Error: no test specified" && exit 1') {
        commands.test = 'npm run test';
      }
      else if (scripts['test:unit']) commands.test = 'npm run test:unit';
    }

    // Auto-detect build
    if (!commands.build) {
      if (scripts.build) commands.build = 'npm run build';
      else if (scripts['build:prod']) commands.build = 'npm run build:prod';
    }

    return commands;
  }

  private detectPackageManager(): string {
    if (this.config.packageManager !== 'auto') {
      return this.config.packageManager;
    }

    // Check for lockfiles
    if (fs.existsSync(path.join(this.repoPath, 'pnpm-lock.yaml'))) return 'pnpm';
    if (fs.existsSync(path.join(this.repoPath, 'yarn.lock'))) return 'yarn';
    if (fs.existsSync(path.join(this.repoPath, 'bun.lockb'))) return 'bun';
    if (fs.existsSync(path.join(this.repoPath, 'package-lock.json'))) return 'npm';

    return 'npm';
  }

  private detectMonorepo(packageJson: PackageJson | null): boolean {
    if (!packageJson) return false;

    // Check for workspaces
    if (packageJson.workspaces) return true;

    // Check for common monorepo configs
    const monorepoConfigs = [
      'pnpm-workspace.yaml',
      'lerna.json',
      'nx.json',
      'turbo.json',
    ];

    return monorepoConfigs.some((config) =>
      fs.existsSync(path.join(this.repoPath, config))
    );
  }

  private getGitStatus(): { branch: string; isClean: boolean; changes: string[] } {
    try {
      const branch = execSync('git rev-parse --abbrev-ref HEAD', {
        cwd: this.repoPath,
        encoding: 'utf-8',
      }).trim();

      const status = execSync('git status --porcelain', {
        cwd: this.repoPath,
        encoding: 'utf-8',
      }).trim();

      const changes = status ? status.split('\n').filter(Boolean) : [];

      return {
        branch,
        isClean: changes.length === 0,
        changes,
      };
    } catch (e) {
      logger.error('Failed to get git status', e);
      return {
        branch: 'unknown',
        isClean: false,
        changes: ['Unable to determine git status'],
      };
    }
  }

  private checkBranchExists(branchName: string): boolean {
    try {
      execSync(`git rev-parse --verify ${branchName}`, {
        cwd: this.repoPath,
        encoding: 'utf-8',
        stdio: 'pipe',
      });
      return true;
    } catch {
      return false;
    }
  }

  private checkDependenciesInstalled(): 'installed' | 'needs-install' | 'unknown' {
    const nodeModulesPath = path.join(this.repoPath, 'node_modules');
    if (!fs.existsSync(nodeModulesPath)) {
      return 'needs-install';
    }

    // Check if node_modules has reasonable content
    try {
      const contents = fs.readdirSync(nodeModulesPath);
      if (contents.length > 5) {
        return 'installed';
      }
      return 'needs-install';
    } catch {
      return 'unknown';
    }
  }

  private getNodeVersion(): string | null {
    try {
      return execSync('node --version', { encoding: 'utf-8' }).trim();
    } catch {
      return null;
    }
  }

  async getFilesInScope(): Promise<string[]> {
    const allowPatterns = this.config.riskPolicy.allowFileGlobs;
    const files: string[] = [];

    for (const pattern of allowPatterns) {
      const matches = await glob(pattern, {
        cwd: this.repoPath,
        ignore: this.config.riskPolicy.denyFileGlobs,
      });
      files.push(...matches);
    }

    return [...new Set(files)];
  }

  getDiffFromDefaultBranch(): string {
    try {
      const defaultBranch = this.config.defaultBranch;
      return execSync(`git diff ${defaultBranch}...HEAD`, {
        cwd: this.repoPath,
        encoding: 'utf-8',
        maxBuffer: 10 * 1024 * 1024,
      });
    } catch (e) {
      logger.warn('Could not get diff from default branch', e);
      return '';
    }
  }

  getRecentCommits(count: number = 10): string[] {
    try {
      const log = execSync(`git log --oneline -n ${count}`, {
        cwd: this.repoPath,
        encoding: 'utf-8',
      });
      return log.trim().split('\n').filter(Boolean);
    } catch {
      return [];
    }
  }
}
