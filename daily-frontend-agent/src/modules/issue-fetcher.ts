import { Octokit } from 'octokit';
import type { AgentConfig, GithubIssue } from '../types/index.js';
import { logger } from '../utils/logger.js';

export class IssueFetcher {
  private config: AgentConfig;
  private octokit: Octokit;

  constructor(config: AgentConfig) {
    this.config = config;
    const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
    if (!token) {
      throw new Error(
        'GitHub token not found. Set GITHUB_TOKEN or GH_TOKEN environment variable.'
      );
    }
    this.octokit = new Octokit({ auth: token });
  }

  async fetchIssues(): Promise<GithubIssue[]> {
    logger.substage('Fetching GitHub issues');

    const { owner, repo, labelsForAutocode, labelsForPlanOnly, excludeLabels } =
      this.config.github;

    const allLabels = [...labelsForAutocode, ...labelsForPlanOnly];
    const issues: GithubIssue[] = [];

    try {
      // Fetch issues with relevant labels
      for (const label of allLabels) {
        logger.debug(`Fetching issues with label: ${label}`);

        const response = await this.octokit.rest.issues.listForRepo({
          owner,
          repo,
          state: 'open',
          labels: label,
          per_page: 50,
          sort: 'updated',
          direction: 'desc',
        });

        for (const issue of response.data) {
          // Skip pull requests
          if (issue.pull_request) continue;

          const issueLabels = issue.labels.map((l) =>
            typeof l === 'string' ? l : l.name || ''
          );

          // Skip if has exclude labels
          if (issueLabels.some((l) => excludeLabels.includes(l))) {
            logger.debug(`Skipping issue #${issue.number} due to exclude label`);
            continue;
          }

          // Check if already added
          if (issues.some((i) => i.number === issue.number)) continue;

          issues.push({
            number: issue.number,
            title: issue.title,
            body: issue.body,
            labels: issueLabels,
            state: issue.state,
            createdAt: issue.created_at,
            updatedAt: issue.updated_at,
            url: issue.html_url,
            commentsCount: issue.comments,
            assignees: issue.assignees?.map((a) => a.login) || [],
            milestone: issue.milestone?.title || null,
          });
        }
      }

      logger.info(`Found ${issues.length} relevant issues`);
      return issues;
    } catch (error) {
      logger.error('Failed to fetch issues', error);
      throw error;
    }
  }

  async fetchIssueComments(issueNumber: number): Promise<string[]> {
    const { owner, repo } = this.config.github;

    try {
      const response = await this.octokit.rest.issues.listComments({
        owner,
        repo,
        issue_number: issueNumber,
        per_page: 20,
      });

      return response.data.map(
        (comment) => `@${comment.user?.login}: ${comment.body}`
      );
    } catch (error) {
      logger.warn(`Failed to fetch comments for issue #${issueNumber}`, error);
      return [];
    }
  }

  async getIssueDetails(issueNumber: number): Promise<GithubIssue | null> {
    const { owner, repo } = this.config.github;

    try {
      const response = await this.octokit.rest.issues.get({
        owner,
        repo,
        issue_number: issueNumber,
      });

      const issue = response.data;
      const issueLabels = issue.labels.map((l) =>
        typeof l === 'string' ? l : l.name || ''
      );

      return {
        number: issue.number,
        title: issue.title,
        body: issue.body,
        labels: issueLabels,
        state: issue.state,
        createdAt: issue.created_at,
        updatedAt: issue.updated_at,
        url: issue.html_url,
        commentsCount: issue.comments,
        assignees: issue.assignees?.map((a) => a.login) || [],
        milestone: issue.milestone?.title || null,
      };
    } catch (error) {
      logger.error(`Failed to fetch issue #${issueNumber}`, error);
      return null;
    }
  }

  async addIssueComment(issueNumber: number, body: string): Promise<void> {
    const { owner, repo } = this.config.github;

    try {
      await this.octokit.rest.issues.createComment({
        owner,
        repo,
        issue_number: issueNumber,
        body,
      });
      logger.info(`Added comment to issue #${issueNumber}`);
    } catch (error) {
      logger.error(`Failed to add comment to issue #${issueNumber}`, error);
    }
  }

  async updateIssueLabels(
    issueNumber: number,
    labelsToAdd: string[],
    labelsToRemove: string[]
  ): Promise<void> {
    const { owner, repo } = this.config.github;

    try {
      // Get current labels
      const issue = await this.octokit.rest.issues.get({
        owner,
        repo,
        issue_number: issueNumber,
      });

      const currentLabels = issue.data.labels.map((l) =>
        typeof l === 'string' ? l : l.name || ''
      );

      // Calculate new labels
      const newLabels = [
        ...currentLabels.filter((l) => !labelsToRemove.includes(l)),
        ...labelsToAdd.filter((l) => !currentLabels.includes(l)),
      ];

      await this.octokit.rest.issues.update({
        owner,
        repo,
        issue_number: issueNumber,
        labels: newLabels,
      });

      logger.info(`Updated labels for issue #${issueNumber}`);
    } catch (error) {
      logger.error(`Failed to update labels for issue #${issueNumber}`, error);
    }
  }
}
