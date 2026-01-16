import { describe, it, expect } from 'vitest';
import {
  slugify,
  createBranchName,
  matchesGlob,
  isPathAllowed,
  parseDiffStats,
  sanitizeForReport,
  truncateOutput,
} from '../../src/utils/helpers.js';

describe('helpers', () => {
  describe('slugify', () => {
    it('should convert to lowercase', () => {
      expect(slugify('Hello World')).toBe('hello-world');
    });

    it('should replace spaces with hyphens', () => {
      expect(slugify('fix the bug')).toBe('fix-the-bug');
    });

    it('should remove special characters', () => {
      expect(slugify('Fix: Bug #123!')).toBe('fix-bug-123');
    });

    it('should trim leading/trailing hyphens', () => {
      expect(slugify('  test  ')).toBe('test');
    });

    it('should truncate to 50 characters', () => {
      const long = 'a'.repeat(100);
      expect(slugify(long).length).toBeLessThanOrEqual(50);
    });
  });

  describe('createBranchName', () => {
    it('should create branch name with date and slug', () => {
      const branch = createBranchName('2024-01-15', 'Fix Button Bug');
      expect(branch).toBe('agent/2024-01-15/fix-button-bug');
    });

    it('should handle special characters in title', () => {
      const branch = createBranchName('2024-01-15', 'Fix: Issue #123!');
      expect(branch).toBe('agent/2024-01-15/fix-issue-123');
    });
  });

  describe('matchesGlob', () => {
    it('should match simple patterns', () => {
      expect(matchesGlob('src/index.ts', ['src/**/*'])).toBe(true);
      expect(matchesGlob('lib/index.ts', ['src/**/*'])).toBe(false);
    });

    it('should match multiple patterns', () => {
      expect(matchesGlob('src/index.ts', ['src/**/*', 'lib/**/*'])).toBe(true);
      expect(matchesGlob('lib/index.ts', ['src/**/*', 'lib/**/*'])).toBe(true);
      expect(matchesGlob('test/index.ts', ['src/**/*', 'lib/**/*'])).toBe(false);
    });

    it('should match extension patterns', () => {
      expect(matchesGlob('file.ts', ['*.ts'])).toBe(true);
      expect(matchesGlob('file.js', ['*.ts'])).toBe(false);
    });
  });

  describe('isPathAllowed', () => {
    it('should allow paths matching allow patterns', () => {
      expect(isPathAllowed('src/index.ts', ['src/**/*'], [])).toBe(true);
    });

    it('should deny paths matching deny patterns', () => {
      expect(isPathAllowed('.env', ['**/*'], ['.env*'])).toBe(false);
      expect(isPathAllowed('.env.local', ['**/*'], ['.env*'])).toBe(false);
    });

    it('should deny before allow', () => {
      expect(isPathAllowed('src/secrets/key.ts', ['src/**/*'], ['**/secrets/**'])).toBe(false);
    });

    it('should allow all if no allow patterns', () => {
      expect(isPathAllowed('any/path.ts', [], [])).toBe(true);
    });
  });

  describe('parseDiffStats', () => {
    it('should parse additions and deletions', () => {
      const diff = `
--- a/file.ts
+++ b/file.ts
@@ -1,3 +1,4 @@
 context
-old line
+new line
+another new line
 context
`;
      const stats = parseDiffStats(diff);
      expect(stats.additions).toBe(2);
      expect(stats.deletions).toBe(1);
      expect(stats.files).toContain('file.ts');
    });

    it('should handle multiple files', () => {
      const diff = `
--- a/file1.ts
+++ b/file1.ts
@@ -1,1 +1,1 @@
-old
+new
--- a/file2.ts
+++ b/file2.ts
@@ -1,1 +1,1 @@
-old
+new
`;
      const stats = parseDiffStats(diff);
      expect(stats.files.length).toBe(2);
    });

    it('should handle empty diff', () => {
      const stats = parseDiffStats('');
      expect(stats.additions).toBe(0);
      expect(stats.deletions).toBe(0);
      expect(stats.files.length).toBe(0);
    });
  });

  describe('sanitizeForReport', () => {
    it('should redact API keys', () => {
      const text = 'api_key="sk-abc123def456ghi789"';
      expect(sanitizeForReport(text)).toContain('[REDACTED]');
    });

    it('should redact GitHub tokens', () => {
      const text = 'token: ghp_1234567890abcdefghijklmnopqrstuvwxyz';
      expect(sanitizeForReport(text)).toContain('[REDACTED]');
    });

    it('should redact Anthropic keys', () => {
      const text = 'ANTHROPIC_API_KEY=sk-ant-api03-abcdefghijklmnopqrstuvwxyz';
      expect(sanitizeForReport(text)).toContain('[REDACTED]');
    });

    it('should redact Bearer tokens', () => {
      const text = 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9';
      expect(sanitizeForReport(text)).toContain('[REDACTED]');
    });

    it('should preserve normal text', () => {
      const text = 'This is a normal log message';
      expect(sanitizeForReport(text)).toBe(text);
    });
  });

  describe('truncateOutput', () => {
    it('should not truncate short output', () => {
      const output = 'short';
      expect(truncateOutput(output, 100)).toBe(output);
    });

    it('should truncate long output', () => {
      const output = 'a'.repeat(200);
      const truncated = truncateOutput(output, 100);
      expect(truncated.length).toBeLessThan(200);
      expect(truncated).toContain('[OUTPUT TRUNCATED');
    });

    it('should indicate omitted characters', () => {
      const output = 'a'.repeat(200);
      const truncated = truncateOutput(output, 100);
      expect(truncated).toContain('100 characters omitted');
    });
  });
});
