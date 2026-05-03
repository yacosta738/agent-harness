---
name: double-blind-review
description: Use when the user asks for adversarial dual review, doble review, two independent reviewers, blind judges, or high-confidence review before merge
---

# Double Blind Review

## Overview

Run two independent blind reviewers against the same target, synthesize their findings, fix only
confirmed issues, then re-review until clean or escalated.

**Core principle:** independent reviewers catch different blind spots; the orchestrator coordinates
but does not review the code itself.

## When to Use

Use when:

- User asks for adversarial review, dual review, doble review, blind judges, or high-confidence
  review.
- A feature, refactor, architecture change, or risky fix needs stronger review than one reviewer.
- The cost of a missed bug is higher than running two review rounds.

Do not use when:

- The target scope is unclear; ask for files, PR, branch, feature, or diff first.
- The user only wants a normal code review; use `requesting-code-review` instead.
- Reviewers would need to edit shared state concurrently.

## Protocol

### 1. Resolve Scope and Standards

Identify the exact review target: files, feature, PR, branch, or diff range. If there is a project
skill registry or standards document, extract relevant compact rules and inject the same standards
into every reviewer and fixer prompt.

If no project standards exist, say so and proceed with generic review criteria.

### 2. Launch Two Blind Reviews in Parallel

Use two independent sub-agents at the same time. Give both identical target, standards, and review
criteria. Do not tell either reviewer another reviewer exists.

Reviewer criteria:

- Correctness and requirement fit
- Edge cases and error handling
- Security and data exposure
- Performance and resource usage
- Tests and regression coverage
- Naming, maintainability, and project conventions

Reviewers return findings only, no praise:

```markdown
- Severity: CRITICAL | WARNING | SUGGESTION
- File: path/to/file.ext:line
- Description: what is wrong and why it matters
- Suggested fix: one-line intent
```

If clean: `VERDICT: CLEAN — No issues found.`

### 3. Synthesize Verdict

The orchestrator compares both reports:

| Status        | Meaning                              | Action                             |
|---------------|--------------------------------------|------------------------------------|
| Confirmed     | Both reviewers found the same issue  | Fix immediately                    |
| Suspect A/B   | Only one reviewer found it           | Report for triage; do not auto-fix |
| Contradiction | Reviewers disagree on the same point | Escalate to user decision          |

### 4. Fix and Re-review

Delegate fixes to a separate fixer agent. The fixer applies ONLY confirmed issues and avoids
unrelated refactors.

After fixes, launch two fresh blind reviewers in parallel with the same protocol.

Maximum: 2 fix iterations. If issues remain after that, stop and escalate with history.

## Output Format

```markdown
## Double Blind Review — {target}

### Round {N} — Verdict

| Finding | Reviewer A | Reviewer B | Severity | Status |
|---|---|---|---|---|
| Missing null check in auth.go:42 | yes | yes | CRITICAL | Confirmed |
| Race condition in worker.go:88 | yes | no | WARNING | Suspect A |

**Confirmed issues:** 1 CRITICAL
**Suspect issues:** 1 WARNING
**Contradictions:** none

### Fixes Applied
- `auth.go:42` — Added nil check before dereferencing user pointer.

### Final Judgment
APPROVED — both reviewers pass clean.
```

For escalation:

```markdown
### Final Judgment
ESCALATED — after 2 fix iterations, reviewers still report issues.

### Remaining Issues
| Finding | Reviewer A | Reviewer B | Severity |
|---|---|---|---|
| {description} | yes | yes | CRITICAL |

### History
- Round 1: {summary}
- Fix 1: {summary}
- Round 2: {summary}
- Fix 2: {summary}
- Round 3: {summary}
```

## Rules

- Orchestrator never performs the review; it only scopes, dispatches, synthesizes, and reports.
- Reviewers run in parallel, never sequentially.
- Reviewers are blind: no cross-contamination and no shared conclusions.
- Fixer is a separate agent, never one of the reviewers.
- Same criteria and standards go to both reviewers.
- Suspect findings are reported but not automatically fixed.
- Stop and ask when scope is ambiguous.
- Stop after 2 failed fix iterations and escalate.

## Language

- Spanish input: respond in Cuban Spanish. Suggested status phrases: "Revisión doble iniciada", "los
  dos revisores van en paralelo", "coinciden en este punto", "aprobado", "escalado para revisión
  humana".
- English input: use direct review language: "Double blind review initiated", "both reviewers are
  running in parallel", "confirmed finding", "approved", "escalated for human review".

## Common Mistakes

| Mistake                               | Fix                                 |
|---------------------------------------|-------------------------------------|
| Running one review after another      | Dispatch both reviewers in parallel |
| Reviewing as orchestrator             | Only synthesize reviewer outputs    |
| Fixing suspect findings automatically | Report suspects for triage          |
| Letting fixer refactor nearby code    | Fix only confirmed issues           |
| Infinite review loops                 | Stop after 2 fix iterations         |
