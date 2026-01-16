import { randomUUID } from 'node:crypto';
import { format } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import { minimatch } from 'glob';

export function generateRunId(): string {
  const timestamp = format(new Date(), 'yyyyMMdd-HHmmss');
  const uuid = randomUUID().slice(0, 8);
  return `run-${timestamp}-${uuid}`;
}

export function getDateString(date: Date = new Date(), timezone?: string): string {
  if (timezone) {
    const zonedDate = toZonedTime(date, timezone);
    return format(zonedDate, 'yyyy-MM-dd');
  }
  return format(date, 'yyyy-MM-dd');
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50);
}

export function createBranchName(date: string, issueTitle: string): string {
  const slug = slugify(issueTitle);
  return `agent/${date}/${slug}`;
}

export function matchesGlob(filePath: string, patterns: string[]): boolean {
  return patterns.some((pattern) => minimatch(filePath, pattern));
}

export function isPathAllowed(
  filePath: string,
  allowPatterns: string[],
  denyPatterns: string[]
): boolean {
  if (matchesGlob(filePath, denyPatterns)) {
    return false;
  }
  if (allowPatterns.length === 0) {
    return true;
  }
  return matchesGlob(filePath, allowPatterns);
}

export function countLines(content: string): number {
  return content.split('\n').length;
}

export function parseDiffStats(diff: string): { additions: number; deletions: number; files: string[] } {
  const lines = diff.split('\n');
  let additions = 0;
  let deletions = 0;
  const files = new Set<string>();

  for (const line of lines) {
    if (line.startsWith('+++ b/')) {
      files.add(line.slice(6));
    } else if (line.startsWith('+') && !line.startsWith('+++')) {
      additions++;
    } else if (line.startsWith('-') && !line.startsWith('---')) {
      deletions++;
    }
  }

  return { additions, deletions, files: Array.from(files) };
}

export function sanitizeForReport(text: string): string {
  const secretPatterns = [
    /(?:api[_-]?key|apikey|secret|password|token|auth|credential)[=:]["']?[a-zA-Z0-9_\-./+=]{10,}["']?/gi,
    /(?:ghp|gho|ghu|ghs|ghr)_[a-zA-Z0-9]{36,}/g,
    /sk-[a-zA-Z0-9]{32,}/g,
    /Bearer\s+[a-zA-Z0-9\-._~+/]+=*/gi,
  ];

  let sanitized = text;
  for (const pattern of secretPatterns) {
    sanitized = sanitized.replace(pattern, '[REDACTED]');
  }
  return sanitized;
}

export function truncateOutput(output: string, maxLength: number = 10000): string {
  if (output.length <= maxLength) {
    return output;
  }
  const truncated = output.slice(0, maxLength);
  return `${truncated}\n\n... [OUTPUT TRUNCATED - ${output.length - maxLength} characters omitted]`;
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function retry<T>(
  fn: () => Promise<T>,
  maxAttempts: number = 3,
  delayMs: number = 1000
): Promise<T> {
  return new Promise((resolve, reject) => {
    const attempt = async (attemptNumber: number): Promise<void> => {
      try {
        const result = await fn();
        resolve(result);
      } catch (error) {
        if (attemptNumber >= maxAttempts) {
          reject(error);
        } else {
          await sleep(delayMs * attemptNumber);
          attempt(attemptNumber + 1);
        }
      }
    };
    attempt(1);
  });
}
