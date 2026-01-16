# Prompt Library Documentation

## Overview

The Daily Frontend Agent uses a library of carefully crafted prompts to guide LLM interactions. All prompts are designed for:
- **Determinism**: Low temperature, structured outputs
- **Safety**: NEEDS_HUMAN escape hatch, forbidden areas
- **Quality**: Minimal changes, convention adherence

## Prompt Files

Located in `src/prompts/`:

| File | Purpose | Output Format |
|------|---------|---------------|
| `plan.txt` | Generate implementation plans | JSON |
| `patch.txt` | Generate code patches | JSON with diff |
| `review.txt` | Review changes | JSON |
| `pr.txt` | Generate PR descriptions | Markdown |
| `triage.txt` | Decide implementation mode | JSON |

## Plan Prompt

**Purpose**: Create detailed implementation plans from GitHub issues.

**Input Context**:
- Repository metadata (type, frameworks, etc.)
- Risk policy (max files, max lines, forbidden paths)
- Issue details (title, body, labels)

**Output Schema**:
```json
{
  "goals": [
    {
      "description": "Clear goal description",
      "linkedIssue": 123,
      "acceptanceCriteria": ["Criterion 1", "Criterion 2"],
      "testPlan": ["Test step 1", "Test step 2"],
      "rollbackPlan": "How to undo changes",
      "subtasks": [
        {
          "description": "Subtask description",
          "filesToModify": ["path/to/file.ts"],
          "estimatedLines": 50,
          "dependencies": ["subtask-id"]
        }
      ]
    }
  ],
  "unknowns": ["Things that are unclear"],
  "assumptions": ["Assumptions being made"]
}
```

**Key Rules**:
- Plans must be minimal and focused
- Each goal needs measurable acceptance criteria
- Never suggest changes to auth/payment/security
- Estimate conservatively

## Patch Prompt

**Purpose**: Generate unified diff patches for code changes.

**Input Context**:
- Goal description and acceptance criteria
- Subtask details
- Current file contents
- Previous error output (for retry iterations)

**Output Formats**:

Success:
```json
{
  "patch": "--- a/path/to/file.ts\n+++ b/path/to/file.ts\n@@ -1,3 +1,4 @@\n context\n-old\n+new\n context",
  "explanation": "Brief explanation",
  "filesChanged": ["path/to/file.ts"]
}
```

Blocked:
```json
{
  "needsHuman": true,
  "humanQuestions": [
    "Specific question needing human input"
  ]
}
```

**Key Rules**:
- Only valid unified diff format
- Match existing code style exactly
- Prefer explicit types over 'any'
- No changes to package.json or lockfiles
- If uncertain, output NEEDS_HUMAN

**Diff Format Example**:
```diff
--- a/src/components/Button.tsx
+++ b/src/components/Button.tsx
@@ -10,7 +10,9 @@ interface ButtonProps {
   onClick?: () => void;
   disabled?: boolean;
+  variant?: 'primary' | 'secondary';
 }

-export function Button({ children, onClick, disabled }: ButtonProps) {
+export function Button({ children, onClick, disabled, variant = 'primary' }: ButtonProps) {
+  const className = variant === 'primary' ? 'btn-primary' : 'btn-secondary';
   return (
```

## Review Prompt

**Purpose**: Review proposed changes against acceptance criteria.

**Input Context**:
- Original acceptance criteria
- Proposed changes (diff)
- Test plan

**Output Schema**:
```json
{
  "approved": true,
  "criteriaChecks": [
    {
      "criterion": "The criterion being checked",
      "met": true,
      "notes": "Evidence or explanation"
    }
  ],
  "issues": ["Critical issues that must be fixed"],
  "suggestions": ["Non-blocking improvements"],
  "securityNotes": ["Security considerations"]
}
```

**Key Rules**:
- Verify each criterion explicitly
- Check for regressions
- Verify code style matches patterns
- Check for security issues

## PR Prompt

**Purpose**: Generate comprehensive pull request descriptions.

**Input Context**:
- Goal description
- Changes made
- Validation results
- Risk assessment

**Output Format**: GitHub-flavored Markdown

**Required Sections**:
1. Summary (1-3 sentences)
2. Related Issue(s)
3. Changes Made (bullet list)
4. Approach
5. Testing (automated + manual)
6. Screenshots (if applicable)
7. Risk Assessment
8. Rollback Plan
9. Checklist

## Triage Prompt

**Purpose**: Decide if an issue is safe for automated implementation.

**Input Context**:
- Issue title and body
- Labels
- Repository context

**Output Schema**:
```json
{
  "decision": "auto-implement",
  "confidence": 85,
  "riskLevel": "low",
  "scopeClarity": "clear",
  "reasons": ["Well-defined scope", "Low-risk file changes"],
  "riskFactors": ["None identified"],
  "questions": [],
  "suggestedApproach": "Add new component in src/components/"
}
```

**Decision Matrix**:

| Decision | Criteria |
|----------|----------|
| `auto-implement` | Clear scope, low risk, confidence > 80% |
| `plan-only` | Clear scope, medium risk, confidence 50-80% |
| `skip` | Unclear scope, high risk, confidence < 50% |

**High-Risk Indicators**:
- Authentication/authorization code
- Payment/billing systems
- Database migrations
- Infrastructure changes
- Security configurations

## Customizing Prompts

### Override Default Prompts

Place custom prompt files in `src/prompts/` with the same names:
- `plan.txt`
- `patch.txt`
- `review.txt`
- `pr.txt`
- `triage.txt`

### Prompt Variables

Prompts receive context through the user message, not template variables. Structure your prompts to expect:

```
[System prompt - general instructions]

User message will contain:
- Repository context
- Issue details
- Previous errors (if retry)
- Specific instructions
```

### Temperature Settings

Default: `0.1` (highly deterministic)

For more creative plans, increase in config:
```json
{
  "llm": {
    "temperature": 0.3
  }
}
```

## Prompt Logging

When `llm.promptLogging` is enabled (default), all prompts and responses are logged to:
```
daily-reports/state/prompt-logs/run-YYYYMMDD-HHMMSS-{uuid}.json
```

Log format:
```json
{
  "timestamp": "2024-01-15T08:30:00.000Z",
  "model": "claude-sonnet-4-20250514",
  "temperature": 0.1,
  "systemPrompt": "[sanitized]",
  "prompt": "[sanitized]",
  "response": "[sanitized]",
  "usage": {
    "inputTokens": 1500,
    "outputTokens": 800
  }
}
```

Secrets are automatically redacted from logs.

## Best Practices

### For Plan Prompts
- Be specific about scope limits
- Include risk policy in context
- Reference existing code patterns

### For Patch Prompts
- Provide full file contents
- Include error output for retries
- Emphasize minimal changes

### For Review Prompts
- List all acceptance criteria
- Include original intent
- Request specific checks

### For PR Prompts
- Provide validation results
- Include rollback instructions
- Note any manual testing needed

### For Triage Prompts
- Include full issue context
- Provide repository patterns
- List forbidden areas explicitly
