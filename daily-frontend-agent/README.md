# Daily Frontend Agent

An autonomous daily frontend engineering agent that inspects repositories, plans work from GitHub issues, implements safe changes, validates them, and creates draft pull requests.

## Features

- **Automated Issue Triage**: Fetches GitHub issues with specific labels and scores them by value, effort, and risk
- **Intelligent Planning**: Creates detailed implementation plans with acceptance criteria, test plans, and rollback strategies
- **Safe Implementation**: Implements changes within configurable risk budgets (max files, max lines)
- **Validation Pipeline**: Runs lint, typecheck, tests, and build automatically
- **Draft PR Creation**: Opens draft pull requests with comprehensive descriptions
- **Daily Reporting**: Generates detailed markdown and JSON reports for every run
- **Resumability**: Can resume interrupted runs and replay with feedback

## Quick Start

### Prerequisites

- Node.js >= 20.0.0
- GitHub CLI (`gh`) installed and authenticated
- `GITHUB_TOKEN` or `GH_TOKEN` environment variable
- `ANTHROPIC_API_KEY` environment variable

### Installation

```bash
cd daily-frontend-agent
npm install
npm run build
```

### Configuration

1. Copy the example config:
```bash
cp daily-agent.config.example.json daily-agent.config.json
```

2. Edit `daily-agent.config.json`:
```json
{
  "github": {
    "owner": "your-org",
    "repo": "your-repo",
    "labelsForAutocode": ["agent:auto"],
    "labelsForPlanOnly": ["agent:plan"],
    "maxIssuesPerDay": 3
  }
}
```

3. Set environment variables:
```bash
export GITHUB_TOKEN="ghp_xxx"
export ANTHROPIC_API_KEY="sk-ant-xxx"
```

### Usage

#### Dry Run (no changes)
```bash
npm run daily-agent -- run --dry-run
```

#### Plan Only (generates plan, no implementation)
```bash
npm run daily-agent -- run --plan-only
```

#### Execute (implements and creates PRs)
```bash
npm run daily-agent -- run --execute
```

#### View Reports
```bash
npm run daily-agent -- report --date 2024-01-15
```

#### Replay with Feedback
```bash
npm run daily-agent -- replay --date 2024-01-15 --feedback "Focus on the error handling"
```

## Configuration Reference

See `daily-agent.config.schema.json` for the full schema.

### Key Settings

| Setting | Description | Default |
|---------|-------------|---------|
| `timezone` | IANA timezone for scheduling | `America/New_York` |
| `defaultBranch` | Base branch for PRs | `main` |
| `packageManager` | auto, npm, pnpm, yarn, bun | `auto` |
| `github.labelsForAutocode` | Labels for auto-implementation | `["agent:auto"]` |
| `github.labelsForPlanOnly` | Labels for plan-only mode | `["agent:plan"]` |
| `github.maxIssuesPerDay` | Max issues to process daily | `3` |
| `riskPolicy.maxFilesChanged` | Max files per implementation | `10` |
| `riskPolicy.maxLinesChanged` | Max lines per implementation | `400` |
| `executionPolicy.createDraftPR` | Create PRs as drafts | `true` |
| `llm.model` | Anthropic model to use | `claude-sonnet-4-20250514` |
| `llm.temperature` | LLM temperature (lower = deterministic) | `0.1` |

### Risk Policy

Configure what files can be modified:

```json
{
  "riskPolicy": {
    "allowFileGlobs": ["src/**/*", "components/**/*"],
    "denyFileGlobs": [".env*", "**/secrets/**"],
    "highRiskPatterns": ["**/auth/**", "**/payment/**"]
  }
}
```

## Scheduling

### Local Cron

Install a cron job:
```bash
./scripts/install-cron.sh --time 08:30
```

Uninstall:
```bash
./scripts/install-cron.sh --uninstall
```

### GitHub Actions

The workflow at `.github/workflows/daily-agent.yml` runs automatically at 8:30 AM UTC on weekdays.

Required secrets:
- `ANTHROPIC_API_KEY`: Your Anthropic API key

Manual trigger available via GitHub Actions UI with mode selection.

## How It Works

### Pipeline Stages

1. **Preflight**: Detects repo type, frameworks, package manager, and validates working tree
2. **Issue Harvest**: Fetches GitHub issues with relevant labels, scores by value/effort/risk
3. **Planning**: Creates detailed plan with goals, acceptance criteria, and test plans
4. **Implementation**: Generates patches, applies them, runs validations
5. **Git Operations**: Creates branch, commits with semantic messages
6. **PR Creation**: Opens draft PR with comprehensive description
7. **Reporting**: Writes markdown and JSON reports

### Safety Features

- Never commits to main/master
- Always creates agent-prefixed branches (`agent/YYYY-MM-DD/slug`)
- PRs are always drafts by default
- Enforces file/line change budgets
- Denies changes to sensitive files (.env, secrets, auth)
- Reverts and switches to plan-only if implementation fails

### Scoring System

Issues are scored by:
- **Value**: Priority labels, bug/feature type, engagement
- **Effort**: Description length, complexity labels
- **Risk**: Keywords (auth, payment), risk labels, high-risk file patterns

Combined score: `Value + (10 - Effort) - Risk`

## Troubleshooting

### Missing GitHub Auth
```
Error: GitHub token not found
```
Set `GITHUB_TOKEN` or run `gh auth login`.

### Failing Lint/Tests
The agent will retry up to 3 times to fix validation errors. If it still fails, it switches to plan-only mode and reports the errors.

### Monorepo Support
Set `repoPath` in config to point to the specific package:
```json
{
  "repoPath": "./packages/frontend"
}
```

### Large Repositories
Adjust `riskPolicy.allowFileGlobs` to limit scope:
```json
{
  "riskPolicy": {
    "allowFileGlobs": ["src/components/**/*"]
  }
}
```

## Reports

Reports are written to `daily-reports/`:
- `YYYY-MM-DD.md`: Human-readable markdown report
- `YYYY-MM-DD.json`: Machine-readable JSON data
- `logs/`: Command output logs
- `state/`: Run state for resumability

## Development

```bash
# Watch mode
npm run dev

# Run tests
npm test

# Type check
npm run typecheck

# Lint
npm run lint
```

## License

MIT
