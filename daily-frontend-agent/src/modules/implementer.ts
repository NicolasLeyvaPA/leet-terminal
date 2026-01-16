import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import * as diff from 'diff';
import type {
  AgentConfig,
  DailyPlan,
  PlanGoal,
  PatchResult,
  ImplementationResult,
  GithubIssue,
} from '../types/index.js';
import { logger, parseDiffStats, isPathAllowed, sanitizeForReport } from '../utils/index.js';
import { LLMClient } from './llm-client.js';
import { Validator } from './validator.js';
import { loadPrompt, PROMPTS } from '../prompts/index.js';

interface PatchLLMResponse {
  patch: string;
  explanation: string;
  filesChanged: string[];
  needsHuman?: boolean;
  humanQuestions?: string[];
}

export class Implementer {
  private config: AgentConfig;
  private llm: LLMClient;
  private validator: Validator;
  private repoPath: string;

  constructor(config: AgentConfig, llm: LLMClient, validator: Validator) {
    this.config = config;
    this.llm = llm;
    this.validator = validator;
    this.repoPath = path.resolve(config.repoPath);
  }

  async implementGoal(
    goal: PlanGoal,
    issue: GithubIssue
  ): Promise<ImplementationResult> {
    logger.substage(`Implementing goal: ${goal.description}`);

    const result: ImplementationResult = {
      issue,
      branch: '',
      success: false,
      commits: [],
      patchIterations: 0,
      validationResults: [],
    };

    const maxIterations = this.config.executionPolicy.maxPatchIterations;

    try {
      // Check if any files are outside allowed paths
      const allFiles = goal.subtasks.flatMap((s) => s.filesToModify);
      for (const file of allFiles) {
        if (
          !isPathAllowed(
            file,
            this.config.riskPolicy.allowFileGlobs,
            this.config.riskPolicy.denyFileGlobs
          )
        ) {
          result.needsHuman = true;
          result.humanQuestions = [
            `File "${file}" is outside allowed paths. Should it be modified?`,
          ];
          result.error = `File path not allowed: ${file}`;
          return result;
        }
      }

      // Iterate through patch attempts
      let lastError = '';
      for (let iteration = 1; iteration <= maxIterations; iteration++) {
        result.patchIterations = iteration;
        logger.info(`Patch iteration ${iteration}/${maxIterations}`);

        // Generate patch
        const patchResult = await this.generatePatch(goal, lastError);

        if (patchResult.needsHuman) {
          result.needsHuman = true;
          result.humanQuestions = patchResult.humanQuestions;
          return result;
        }

        if (!patchResult.success) {
          lastError = patchResult.error || 'Unknown error generating patch';
          logger.warn(`Patch generation failed: ${lastError}`);
          continue;
        }

        // Check patch size
        const stats = parseDiffStats(patchResult.patch);
        if (stats.files.length > this.config.riskPolicy.maxFilesChanged) {
          result.error = `Patch modifies too many files: ${stats.files.length} > ${this.config.riskPolicy.maxFilesChanged}`;
          result.needsHuman = true;
          result.humanQuestions = [
            `The proposed changes affect ${stats.files.length} files. Is this acceptable?`,
          ];
          return result;
        }

        const totalLines = stats.additions + stats.deletions;
        if (totalLines > this.config.riskPolicy.maxLinesChanged) {
          result.error = `Patch changes too many lines: ${totalLines} > ${this.config.riskPolicy.maxLinesChanged}`;
          result.needsHuman = true;
          result.humanQuestions = [
            `The proposed changes affect ${totalLines} lines. Is this acceptable?`,
          ];
          return result;
        }

        // Apply patch
        const applyResult = await this.applyPatch(patchResult.patch);
        if (!applyResult.success) {
          lastError = applyResult.error || 'Failed to apply patch';
          logger.warn(`Failed to apply patch: ${lastError}`);
          await this.revertChanges();
          continue;
        }

        // Run validations
        const validationResults = await this.validator.runAll();
        result.validationResults = validationResults;

        const allPassed = validationResults.every(
          (v) => v.success || v.skipped
        );
        if (!allPassed) {
          const failedSteps = validationResults
            .filter((v) => !v.success && !v.skipped)
            .map((v) => v.step);
          lastError = `Validation failed: ${failedSteps.join(', ')}`;
          logger.warn(lastError);

          // Collect error output for next iteration
          const errorOutput = validationResults
            .filter((v) => !v.success && !v.skipped)
            .map((v) => `${v.step}:\n${v.output}`)
            .join('\n\n');
          lastError += `\n\nError output:\n${errorOutput}`;

          await this.revertChanges();
          continue;
        }

        // Success!
        result.success = true;
        logger.success(`Goal implemented successfully after ${iteration} iteration(s)`);
        return result;
      }

      // Max iterations reached
      result.error = `Failed after ${maxIterations} iterations. Last error: ${lastError}`;
      result.needsHuman = true;
      result.humanQuestions = [
        'Implementation failed after multiple attempts. Please review the error and implement manually.',
        `Last error: ${lastError}`,
      ];
      return result;
    } catch (error) {
      result.error = `Unexpected error: ${error}`;
      result.needsHuman = true;
      result.humanQuestions = ['Unexpected error occurred. Please investigate.'];
      return result;
    }
  }

  private async generatePatch(
    goal: PlanGoal,
    previousError: string
  ): Promise<PatchResult & { needsHuman?: boolean; humanQuestions?: string[] }> {
    const systemPrompt = loadPrompt(PROMPTS.PATCH);

    // Read current file contents
    const fileContents: Record<string, string> = {};
    for (const subtask of goal.subtasks) {
      for (const filePath of subtask.filesToModify) {
        const fullPath = path.join(this.repoPath, filePath);
        if (fs.existsSync(fullPath)) {
          try {
            fileContents[filePath] = fs.readFileSync(fullPath, 'utf-8');
          } catch (e) {
            logger.warn(`Could not read file: ${filePath}`);
          }
        } else {
          fileContents[filePath] = ''; // New file
        }
      }
    }

    const fileContext = Object.entries(fileContents)
      .map(([path, content]) => {
        if (content) {
          return `File: ${path}\n\`\`\`\n${content}\n\`\`\``;
        }
        return `File: ${path} (new file to be created)`;
      })
      .join('\n\n');

    const subtaskContext = goal.subtasks
      .map(
        (s) =>
          `Subtask: ${s.description}\nFiles: ${s.filesToModify.join(', ')}`
      )
      .join('\n');

    let errorContext = '';
    if (previousError) {
      errorContext = `

PREVIOUS ATTEMPT FAILED WITH ERROR:
${sanitizeForReport(previousError)}

Please fix the issues and generate a corrected patch.`;
    }

    const userPrompt = `
Goal: ${goal.description}

Acceptance Criteria:
${goal.acceptanceCriteria.map((c) => `- ${c}`).join('\n')}

Subtasks:
${subtaskContext}

Current File Contents:
${fileContext}
${errorContext}

Generate a unified diff patch to implement this goal. The patch should:
1. Only modify the files listed in the subtasks
2. Follow existing code conventions and formatting
3. Be minimal - only make necessary changes
4. Include proper error handling where appropriate

If you cannot implement this safely or need clarification, respond with:
{
  "needsHuman": true,
  "humanQuestions": ["Your questions here"]
}

Otherwise, respond with:
{
  "patch": "unified diff here",
  "explanation": "brief explanation",
  "filesChanged": ["list", "of", "files"]
}
`;

    try {
      const response = await this.llm.complete(userPrompt, systemPrompt);

      // Try to parse as JSON
      let parsed: PatchLLMResponse;
      try {
        let jsonStr = response.content.trim();
        if (jsonStr.startsWith('```json')) {
          jsonStr = jsonStr.slice(7);
        } else if (jsonStr.startsWith('```')) {
          jsonStr = jsonStr.slice(3);
        }
        if (jsonStr.endsWith('```')) {
          jsonStr = jsonStr.slice(0, -3);
        }
        parsed = JSON.parse(jsonStr.trim());
      } catch {
        // If not valid JSON, try to extract patch from response
        const patchMatch = response.content.match(/```diff\n([\s\S]*?)\n```/);
        if (patchMatch) {
          parsed = {
            patch: patchMatch[1],
            explanation: 'Extracted from response',
            filesChanged: [],
          };
        } else {
          return {
            success: false,
            patch: '',
            filesChanged: [],
            linesAdded: 0,
            linesRemoved: 0,
            error: 'Could not parse LLM response as patch',
          };
        }
      }

      if (parsed.needsHuman) {
        return {
          success: false,
          patch: '',
          filesChanged: [],
          linesAdded: 0,
          linesRemoved: 0,
          needsHuman: true,
          humanQuestions: parsed.humanQuestions,
        };
      }

      const stats = parseDiffStats(parsed.patch);

      return {
        success: true,
        patch: parsed.patch,
        filesChanged: stats.files,
        linesAdded: stats.additions,
        linesRemoved: stats.deletions,
      };
    } catch (error) {
      return {
        success: false,
        patch: '',
        filesChanged: [],
        linesAdded: 0,
        linesRemoved: 0,
        error: `LLM error: ${error}`,
      };
    }
  }

  private async applyPatch(
    patch: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Write patch to temp file
      const patchFile = path.join(this.repoPath, '.agent-patch.tmp');
      fs.writeFileSync(patchFile, patch);

      try {
        execSync(`git apply --check "${patchFile}"`, {
          cwd: this.repoPath,
          encoding: 'utf-8',
          stdio: 'pipe',
        });

        execSync(`git apply "${patchFile}"`, {
          cwd: this.repoPath,
          encoding: 'utf-8',
          stdio: 'pipe',
        });

        return { success: true };
      } catch (e) {
        const error = e as Error & { stderr?: string };
        return {
          success: false,
          error: error.stderr || error.message,
        };
      } finally {
        // Clean up temp file
        if (fs.existsSync(patchFile)) {
          fs.unlinkSync(patchFile);
        }
      }
    } catch (error) {
      return {
        success: false,
        error: `Failed to apply patch: ${error}`,
      };
    }
  }

  private async revertChanges(): Promise<void> {
    try {
      execSync('git checkout -- .', {
        cwd: this.repoPath,
        encoding: 'utf-8',
        stdio: 'pipe',
      });
      execSync('git clean -fd', {
        cwd: this.repoPath,
        encoding: 'utf-8',
        stdio: 'pipe',
      });
      logger.debug('Reverted changes');
    } catch (error) {
      logger.error('Failed to revert changes', error);
    }
  }

  savePatch(patch: string, goalId: string, date: string): string {
    const patchDir = path.join(
      this.repoPath,
      this.config.reporting.reportOutputDir,
      'patches'
    );
    if (!fs.existsSync(patchDir)) {
      fs.mkdirSync(patchDir, { recursive: true });
    }

    const patchFile = path.join(patchDir, `${date}-${goalId}.patch`);
    fs.writeFileSync(patchFile, patch);
    return patchFile;
  }
}
