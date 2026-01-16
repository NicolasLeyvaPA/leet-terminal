# Architecture

## Overview

The Daily Frontend Agent is built as a modular, testable TypeScript CLI application. It follows a pipeline architecture where each stage produces artifacts consumed by subsequent stages.

## System Diagram

```
┌──────────────────────────────────────────────────────────────────────┐
│                           CLI Entry Point                              │
│                         (src/cli/index.ts)                            │
└───────────────────────────────┬──────────────────────────────────────┘
                                │
                                ▼
┌──────────────────────────────────────────────────────────────────────┐
│                          Command Handlers                             │
│              (run.ts, report.ts, replay.ts)                          │
└───────────────────────────────┬──────────────────────────────────────┘
                                │
        ┌───────────────────────┼───────────────────────┐
        ▼                       ▼                       ▼
┌───────────────┐      ┌───────────────┐      ┌───────────────┐
│ State Manager │      │ Config Loader │      │    Logger     │
└───────────────┘      └───────────────┘      └───────────────┘
                                │
        ┌───────────────────────┼───────────────────────┐
        ▼                       ▼                       ▼
┌───────────────┐      ┌───────────────┐      ┌───────────────┐
│   Context     │      │    Issue      │      │     Task      │
│  Collector    │      │   Fetcher     │      │   Selector    │
└───────────────┘      └───────────────┘      └───────────────┘
                                │
                                ▼
                       ┌───────────────┐
                       │    Planner    │
                       │   (+ LLM)     │
                       └───────────────┘
                                │
                                ▼
                       ┌───────────────┐
                       │  Implementer  │
                       │   (+ LLM)     │
                       └───────────────┘
                                │
        ┌───────────────────────┼───────────────────────┐
        ▼                       ▼                       ▼
┌───────────────┐      ┌───────────────┐      ┌───────────────┐
│   Validator   │      │  Git Manager  │      │   Reporter    │
└───────────────┘      └───────────────┘      └───────────────┘
```

## Core Modules

### ContextCollector
**File:** `src/modules/context-collector.ts`

Responsibility: Gather repository metadata and current state.

Features:
- Reads package.json for scripts and dependencies
- Detects frameworks (React, Next.js, Vue, etc.)
- Detects CSS frameworks and testing tools
- Identifies package manager from lockfiles
- Gets git status and branch info
- Checks if dependencies are installed

### IssueFetcher
**File:** `src/modules/issue-fetcher.ts`

Responsibility: Fetch and manage GitHub issues.

Features:
- Fetches issues with configurable labels
- Filters by exclude labels
- Fetches issue comments for context
- Supports adding comments and updating labels
- Uses Octokit for GitHub API

### TaskSelector
**File:** `src/modules/task-selector.ts`

Responsibility: Score and select issues for processing.

Scoring algorithm:
```
ValueScore (0-10): Based on priority labels, type, engagement
EffortScore (0-10): Based on description length, complexity labels
RiskScore (0-10): Based on risk keywords, labels, file patterns

CombinedScore = ValueScore + (10 - EffortScore) - RiskScore
```

Selection priority:
1. Auto-implementable issues (highest combined score first)
2. Plan-only issues (fill remaining slots)

### Planner
**File:** `src/modules/planner.ts`

Responsibility: Create detailed implementation plans using LLM.

Output structure:
- Goals with acceptance criteria
- Subtasks with file lists and line estimates
- Test plans
- Rollback plans
- Unknowns and assumptions

### Implementer
**File:** `src/modules/implementer.ts`

Responsibility: Generate and apply code patches.

Workflow:
1. Check file path permissions
2. Generate patch via LLM
3. Verify patch size within budget
4. Apply patch with `git apply`
5. Run validations
6. If failed: revert, incorporate error feedback, retry
7. Max iterations configurable (default: 3)

### Validator
**File:** `src/modules/validator.ts`

Responsibility: Run validation commands.

Commands (auto-detected or configured):
- install
- lint
- typecheck
- test
- build

Features:
- Captures stdout/stderr
- Measures duration
- Logs commands for debugging
- Truncates long output
- Sanitizes secrets from logs

### GitManager
**File:** `src/modules/git-manager.ts`

Responsibility: Git operations and PR creation.

Operations:
- Create branches (`agent/YYYY-MM-DD/slug`)
- Stage and commit changes
- Push to remote
- Create PRs via gh CLI
- Revert changes on failure

### Reporter
**File:** `src/modules/reporter.ts`

Responsibility: Generate reports in multiple formats.

Outputs:
- Markdown report (human-readable)
- JSON report (machine-readable)
- Command logs

Report sections:
- Summary statistics
- Repository context
- Issues considered (with scores)
- Selected issues
- Plan details
- Implementation results
- Errors
- Next actions
- Suggested commands

### StateManager
**File:** `src/modules/state-manager.ts`

Responsibility: Track run state for resumability.

State includes:
- Run ID and date
- Current stage
- Completed stages
- Selected issues
- Branch name
- Commits and PR URLs
- Errors

Features:
- Persist to JSON files
- Track processed issues (prevent re-processing)
- Support resume from interrupted runs
- Clean up old state files

### LLMClient
**File:** `src/modules/llm-client.ts`

Responsibility: Interface with Anthropic API.

Features:
- Text completion
- JSON completion with parsing
- Prompt logging for reproducibility
- Secret sanitization in logs

## Prompt Library

**Location:** `src/prompts/`

Prompts are stored as text files and loaded at runtime:

| Prompt | Purpose |
|--------|---------|
| `plan.txt` | Generate implementation plans |
| `patch.txt` | Generate unified diff patches |
| `review.txt` | Review changes against criteria |
| `pr.txt` | Generate PR descriptions |
| `triage.txt` | Decide implementation mode |

All prompts enforce:
- Low temperature for determinism
- JSON output where applicable
- Small, focused changes
- NEEDS_HUMAN output when uncertain

## Configuration

**Schema:** `daily-agent.config.schema.json`

Configuration is validated using Zod schemas with defaults.

Key sections:
- `github`: Repository and label configuration
- `riskPolicy`: Change budgets and file patterns
- `executionPolicy`: Defaults and safety settings
- `commands`: Override auto-detected commands
- `reporting`: Output directories
- `llm`: Model and temperature settings

## Data Flow

### Run Command Flow

```
1. Load config
2. Initialize modules
3. Create run state
4. Stage A: Preflight
   └─> PreflightSnapshot
5. Stage B: Issue Harvest
   └─> GithubIssue[], TaskScore[]
6. Stage C: Planning
   └─> DailyPlan
7. Stage D: Execution (if mode=execute)
   ├─> For each goal:
   │   ├─> Create branch
   │   ├─> Generate patch
   │   ├─> Apply patch
   │   ├─> Run validations
   │   ├─> Commit (if success)
   │   └─> Create PR (if success)
   └─> ImplementationResult[]
8. Stage E: Reporting
   └─> DailyReportData
       ├─> YYYY-MM-DD.md
       └─> YYYY-MM-DD.json
```

### Patch Loop Flow

```
for iteration in 1..maxIterations:
    patch = LLM.generatePatch(goal, previousError)

    if patch.needsHuman:
        return NEEDS_HUMAN

    if patch.size > budget:
        return OVER_BUDGET

    result = git.apply(patch)

    if result.failed:
        previousError = result.error
        continue

    validations = validator.runAll()

    if validations.allPassed:
        return SUCCESS

    previousError = validations.errors
    git.revert()

return FAILED_MAX_ITERATIONS
```

## Error Handling

Errors are categorized as:
- **Recoverable**: Can retry or continue with degraded functionality
- **Non-recoverable**: Must stop and report

All errors are:
1. Logged with context
2. Added to state manager
3. Included in final report
4. Used to generate next actions

Even on fatal errors, the agent attempts to generate a report explaining what went wrong.

## Testing Strategy

### Unit Tests
- Config parsing and validation
- Task scoring algorithm
- State manager operations
- Helper functions

### Integration Tests
- Run plan-only in mock environment
- GitHub API mocking
- File system operations

### Manual Testing
- Real repository with test issues
- Verify PR creation
- Check report accuracy

## Extension Points

### Adding New Issue Sources

Implement interface similar to `IssueFetcher`:
```typescript
interface IssueSource {
  fetchIssues(): Promise<GithubIssue[]>;
  getIssueDetails(id: number): Promise<GithubIssue | null>;
}
```

### Adding New Validators

Add command to config:
```json
{
  "commands": {
    "customValidator": "npm run custom-check"
  }
}
```

### Custom Prompts

Override prompt files in `src/prompts/` or provide custom path in config.

## Security Considerations

See `docs/SECURITY.md` for detailed security documentation.
