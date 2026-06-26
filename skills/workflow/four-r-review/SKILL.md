---
name: four-r-review
description: Use when reviewing code changes, preparing a pull request, evaluating implementation quality, or writing risky code that should be checked for security, readability, reliability, and resilience before merge or release
---

# 4R Review

## Overview

The 4R Framework is a compact quality lens for both **code review** and **coding in progress**.

**Core principle:** do not review code only for correctness. Check whether it is safe to ship, easy to understand, proven by tests, and able to fail without causing a bigger mess.

## When to Use

Use when:

- Reviewing a diff, PR, feature, refactor, hotfix, migration, or integration
- Asking “is this safe to merge?” or “what are the real risks here?”
- Writing code in sensitive areas: auth, payments, infra, data, concurrency, retries, external APIs
- Doing self-review before requesting formal review
- A code-reviewer agent needs a compact evaluation rubric

Do not use when:

- The task is purely stylistic and low-risk
- You need domain-specific rules better covered by a specialized skill

## Core Pattern

Review every meaningful change through these four lenses, in this order:

| R | Question | Flag when... |
|---|---|---|
| **R1 Risk** | Can this break production or introduce security issues? | touches secrets, auth, data loss, migrations, privilege, infra, high-blast-radius code |
| **R2 Readability** | Can another engineer understand and safely change it later? | tangled flow, unclear names, hidden side effects, AI-mud, unnecessary abstraction |
| **R3 Reliability** | Is behavior proven and failure-aware? | weak/missing tests, no edge cases, poor error handling, timeout/cancellation gaps |
| **R4 Resilience** | Does the system degrade gracefully under stress or dependency failure? | no retries where needed, no backoff/idempotency, no observability, cascade-failure risk |

## Review Procedure

1. **Classify the change** — user-facing, infra, async, external dependency, critical path, sensitive data.
2. **Score all 4Rs** — never stop at readability only.
3. **Prioritize findings by severity**:
   - **CRITICAL**: security, production breakage, data corruption, missing essential safeguards
   - **WARNING**: maintainability, incomplete test coverage, weak resilience
   - **SUGGESTION**: simplification, naming, observability improvements
4. **Demand evidence**:
   - R1 → threat/blast-radius reasoning
   - R3 → tests, failure paths, timeout handling
   - R4 → retries, fallbacks, metrics/logs/traces, idempotency

## Output Format

```markdown
## 4R Review

- R1 Risk: ✅ / ⚠️ / ❌ — finding
- R2 Readability: ✅ / ⚠️ / ❌ — finding
- R3 Reliability: ✅ / ⚠️ / ❌ — finding
- R4 Resilience: ✅ / ⚠️ / ❌ — finding

### Verdict
- Ship / Ship with fixes / Do not ship
```

## Common Mistakes

| Mistake | Fix |
|---|---|
| Reviewing only style | Start with R1 and blast radius |
| “Has tests” = reliable | Check edge cases, errors, timeouts |
| Retrying everything | Retry only idempotent operations with backoff |
| Accepting clever code | Prefer boring, obvious code in critical paths |
| Ignoring observability | Require logs/metrics/traces for risky flows |

## Coding Mode

When writing code, use the same framework as a pre-merge checklist:

- **R1** What could hurt production?
- **R2** Can this be simpler?
- **R3** What test would fail first?
- **R4** If dependency X dies, what happens next?
