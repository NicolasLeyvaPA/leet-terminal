# Security Documentation

## Overview

The Daily Frontend Agent is designed with security as a primary concern. This document outlines the security measures, policies, and best practices.

## Threat Model

### Assets to Protect
1. Source code repository
2. GitHub credentials
3. Anthropic API key
4. Production infrastructure
5. User data

### Threat Vectors
1. Malicious issue content leading to code injection
2. Accidental exposure of secrets in logs/reports
3. Unauthorized code changes to sensitive areas
4. Dependency confusion attacks
5. Prompt injection via issue content

## Security Measures

### 1. Branch Protection

**Never commits to protected branches**

The agent always creates new branches:
```
agent/YYYY-MM-DD/issue-slug
```

This ensures:
- Main/master branches are never directly modified
- All changes go through PR review
- Branch protection rules are respected

### 2. File Path Restrictions

**Deny list for sensitive files**

Default denied patterns:
```json
{
  "denyFileGlobs": [
    ".env*",
    "*.secret*",
    "**/secrets/**",
    "**/credentials/**",
    "**/.aws/**",
    "**/infra/**",
    "**/terraform/**"
  ]
}
```

**High-risk patterns trigger plan-only mode**:
```json
{
  "highRiskPatterns": [
    "**/auth/**",
    "**/payment/**",
    "**/billing/**",
    "**/admin/**",
    "**/security/**"
  ]
}
```

### 3. Change Budgets

**Limits on change scope**

Default limits:
- Max files changed: 10
- Max lines changed: 400

If exceeded:
1. Implementation is aborted
2. Switches to plan-only mode
3. Reports explain why

### 4. Dependency Protection

**No automatic dependency changes**

By default:
```json
{
  "disallowDependencyChanges": true
}
```

This prevents:
- Adding new dependencies
- Updating existing dependencies
- Modifying package.json
- Modifying lockfiles

### 5. Secret Sanitization

**Automatic redaction in logs and reports**

Patterns detected and redacted:
- API keys (`api_key=xxx`)
- GitHub tokens (`ghp_xxx`, `gho_xxx`)
- Anthropic keys (`sk-ant-xxx`)
- Bearer tokens
- Generic secrets

Sanitization applies to:
- Command output logs
- LLM prompt logs
- Daily reports
- Error messages

### 6. Draft PRs by Default

**All PRs are drafts**

```json
{
  "createDraftPR": true
}
```

Benefits:
- Requires explicit human approval
- Prevents accidental merges
- Allows review before CI runs

### 7. Clean Working Tree

**Requires clean git state**

```json
{
  "requireCleanWorkingTree": true
}
```

Prevents:
- Committing unintended changes
- Mixing manual and automated changes
- State confusion

### 8. Prompt Safety

**LLM interaction guardrails**

All prompts include:
- NEEDS_HUMAN escape hatch
- Forbidden area lists
- Minimal change instructions
- No-dependency-change rules

Low temperature (0.1) ensures:
- Deterministic outputs
- Reduced hallucination risk
- Reproducible results

## Credential Management

### Required Credentials

| Credential | Purpose | Storage |
|------------|---------|---------|
| `GITHUB_TOKEN` | GitHub API access | Environment variable |
| `ANTHROPIC_API_KEY` | LLM access | Environment variable |

### Best Practices

1. **Use fine-grained GitHub tokens** with minimal scopes:
   - `repo` for private repos
   - `public_repo` for public repos
   - `pull_requests` write access

2. **Rotate tokens regularly**

3. **Use GitHub Actions secrets** for CI:
   ```yaml
   env:
     GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
     ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
   ```

4. **Never commit tokens** to the repository

## Audit Trail

### What's Logged

1. **Run state** (`daily-reports/state/state-YYYY-MM-DD.json`):
   - Run ID and timestamps
   - Stages completed
   - Issues processed
   - Commits and PRs created
   - Errors encountered

2. **Command logs** (`daily-reports/logs/YYYY-MM-DD-commands.json`):
   - Commands executed
   - Exit codes
   - Sanitized output

3. **Prompt logs** (`daily-reports/state/prompt-logs/`):
   - LLM interactions
   - Token usage
   - Sanitized content

4. **Daily reports** (`daily-reports/YYYY-MM-DD.json`):
   - Complete run summary
   - Issues processed
   - Changes made

### Retention

Default retention:
- State files: 30 days
- Processed issues: 30 days
- Reports: Indefinite (git tracked)

## Incident Response

### If Secrets Are Exposed

1. **Immediately rotate** the exposed credential
2. **Audit** recent commits for unauthorized changes
3. **Review** PR history for suspicious activity
4. **Update** deny patterns if needed

### If Malicious Code Is Generated

1. **Do not merge** the PR
2. **Close** the PR without merging
3. **Review** the triggering issue
4. **Block** the issue from future processing
5. **Report** if the issue was malicious

### If Unauthorized Changes Occur

1. **Revert** the changes
2. **Review** configuration for gaps
3. **Update** risk policies
4. **Add** affected paths to deny list

## Configuration Hardening

### Minimal Permission Config

```json
{
  "github": {
    "labelsForAutocode": [],
    "labelsForPlanOnly": ["agent:plan"],
    "maxIssuesPerDay": 1
  },
  "riskPolicy": {
    "maxFilesChanged": 3,
    "maxLinesChanged": 100,
    "disallowDependencyChanges": true,
    "allowFileGlobs": ["src/components/**/*"],
    "denyFileGlobs": [
      ".env*",
      "*.secret*",
      "**/auth/**",
      "**/api/**",
      "**/server/**"
    ]
  },
  "executionPolicy": {
    "modeDefault": "plan-only",
    "createDraftPR": true,
    "requireCleanWorkingTree": true,
    "maxPatchIterations": 2
  }
}
```

### CI/CD Security

GitHub Actions workflow includes:
- Limited permissions
- Artifact retention limits
- No external action dependencies (uses official actions only)
- Secrets passed via environment

## Compliance Considerations

### SOC 2

- **Access Control**: Token-based, environment variables
- **Audit Logging**: Complete run history
- **Change Management**: All changes via PR

### GDPR

- **Data Minimization**: Only fetches needed issue data
- **Right to Erasure**: Can clear state/logs
- **Audit Trail**: Full logging capability

### PCI DSS

**Not recommended for PCI environments**

If used:
- Ensure payment paths are in deny list
- Enable plan-only mode for all issues
- Require manual review of all changes

## Reporting Vulnerabilities

If you discover a security vulnerability:

1. **Do not** open a public issue
2. **Contact** the maintainers privately
3. **Provide** detailed reproduction steps
4. **Allow** time for a fix before disclosure

## Security Checklist

Before deploying:

- [ ] Review and customize deny file patterns
- [ ] Set appropriate change budgets
- [ ] Use fine-grained GitHub token
- [ ] Store credentials in secure secrets manager
- [ ] Enable draft PRs
- [ ] Require clean working tree
- [ ] Test with plan-only mode first
- [ ] Review generated PRs before merging
- [ ] Set up monitoring for unexpected changes
- [ ] Rotate credentials periodically
