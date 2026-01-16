import { loadConfig } from '../../utils/config-loader.js';
import { logger } from '../../utils/index.js';
import { Reporter } from '../../modules/reporter.js';

export interface ReportOptions {
  date: string;
  configPath?: string;
  outputJson?: boolean;
}

export async function reportCommand(options: ReportOptions): Promise<void> {
  logger.info(`Loading report for ${options.date}`);

  const { config } = loadConfig(options.configPath);
  const reporter = new Reporter(config);

  const reportData = reporter.readReport(options.date);

  if (!reportData) {
    logger.error(`No report found for ${options.date}`);
    console.log('\nAvailable reports can be found in the daily-reports/ directory.');
    process.exit(1);
  }

  if (options.outputJson) {
    console.log(JSON.stringify(reportData, null, 2));
    return;
  }

  // Display formatted report
  const markdown = reporter.formatMarkdownReport(reportData);
  console.log('\n' + markdown);

  // Summary stats
  console.log('\n--- Quick Summary ---');
  console.log(`Run ID: ${reportData.runId}`);
  console.log(`Mode: ${reportData.mode}`);
  console.log(`Issues Processed: ${reportData.summary.issuesProcessed}`);
  console.log(`Issues Implemented: ${reportData.summary.issuesImplemented}`);
  console.log(`Issues Failed: ${reportData.summary.issuesFailed}`);
  console.log(`PRs Created: ${reportData.summary.prsCreated}`);
  console.log(`Errors: ${reportData.errors.length}`);

  if (reportData.implementations.length > 0) {
    console.log('\n--- Implementation Results ---');
    for (const impl of reportData.implementations) {
      const status = impl.success ? 'SUCCESS' : impl.needsHuman ? 'NEEDS HUMAN' : 'FAILED';
      console.log(`  #${impl.issue.number}: ${status}`);
      if (impl.prUrl) {
        console.log(`    PR: ${impl.prUrl}`);
      }
      if (impl.error) {
        console.log(`    Error: ${impl.error}`);
      }
    }
  }

  if (reportData.nextActions.length > 0) {
    console.log('\n--- Next Actions ---');
    for (const action of reportData.nextActions) {
      console.log(`  - ${action}`);
    }
  }
}
