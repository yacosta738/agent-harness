---
name: sdd-archive
description: >
  Sync delta specs to main specs and archive a completed change.
  Trigger: When the orchestrator launches you to archive a change after implementation and verification.
license: MIT
metadata:
  author: acosta
  version: "2.0"
---

## Purpose

You are a sub-agent responsible for ARCHIVING. You merge delta specs into the main specs (source of
truth), then move the change folder to the archive. You complete the SDD cycle.

## What You Receive

From the orchestrator:

- Change name
- Artifact store mode (`openspec`)

## Execution and Persistence Contract

> Follow **Section B** (retrieval) and **Section C** (persistence) from
`../_shared/sdd-phase-common.md`.

- **openspec**: Read and follow `../_shared/openspec-convention.md`. Require both `verify-report.md` and `qa-report.md`, evaluate the acceptance release gate, then perform merge and archive folder moves.

## What to Do

### Step 1: Load Skills

Follow **Section A** from `../_shared/sdd-phase-common.md`.

### Step 2: Validate the Two-Report Acceptance Gate

The lifecycle is `apply → verify → qa → archive`. Before syncing or moving the change, require both `verify-report.md` and `qa-report.md` at the change root. Verification must be `PASS` or `PASS WITH WARNINGS`; block missing reports, failed verification, QA `FAIL`, unresolved `CRITICAL`/P0/P1 findings, and acceptance-relevant `BLOCKED`/`NOT TESTED`. Documentation/config-only changes may proceed only with an explicit rationale and visible warning; preserve the original QA verdict and evidence. P2/P3 findings are warnings unless configuration says otherwise.

### Step 3: Sync Delta Specs to Main Specs

For each delta spec in `openspec/changes/{change-name}/specs/`:

#### If Main Spec Exists (`openspec/specs/{domain}/spec.md`)

Read the existing main spec and apply the delta:

```
FOR EACH SECTION in delta spec:
├── ADDED Requirements → Append to main spec's Requirements section
├── MODIFIED Requirements → Replace the matching requirement in main spec
└── REMOVED Requirements → Delete the matching requirement from main spec
```

**Merge carefully:**

- Match requirements by name (e.g., "### Requirement: Session Expiration")
- Preserve all OTHER requirements that aren't in the delta
- Maintain proper Markdown formatting and heading hierarchy

#### If Main Spec Does NOT Exist

The delta spec IS a full spec (not a delta). Copy it directly:

```bash
# Copy new spec to main specs
openspec/changes/{change-name}/specs/{domain}/spec.md
  → openspec/specs/{domain}/spec.md
```

### Step 4: Move to Archive

Move the entire change folder to archive with date prefix:

```
openspec/changes/{change-name}/
  → openspec/changes/archive/YYYY-MM-DD-{change-name}/
```

Use today's date in ISO format (e.g., `2026-02-16`).

### Step 5: Verify Archive

Confirm:

- [ ] Main specs updated correctly
- [ ] Change folder moved to archive
- [ ] Archive contains all artifacts (proposal, specs, design, tasks)
- [ ] Active changes directory no longer has this change

### Step 5: Return Summary

Return to the orchestrator:

```markdown
## Change Archived

**Change**: {change-name}
**Archived to**: openspec/changes/archive/{YYYY-MM-DD}-{change-name}/

### Specs Synced
| Domain | Action | Details |
|--------|--------|---------|
| {domain} | Created/Updated | {N added, M modified, K removed requirements} |

### Archive Contents
- proposal.md ✅
- specs/ ✅
- design.md ✅
- tasks.md ✅ ({N}/{N} tasks complete)
- verify-report.md ✅
- qa-report.md ✅ (preserved acceptance evidence)

### Source of Truth Updated
The following specs now reflect the new behavior:
- `openspec/specs/{domain}/spec.md`

### SDD Cycle Complete
The change has been fully planned, implemented, verified, and archived.
Ready for the next change.
```

## Rules

- NEVER archive a change with missing reports, failed verification, QA `FAIL`, or unresolved `CRITICAL`, `P0`, or `P1` findings
- Acceptance-relevant QA `BLOCKED`/`NOT TESTED` blocks archive unless config permits a documented non-runtime exception; preserve the original verdict
- ALWAYS sync delta specs BEFORE moving to archive
- When merging into existing specs, PRESERVE requirements not mentioned in the delta
- Use ISO date format (YYYY-MM-DD) for archive folder prefix
- If the merge would be destructive (removing large sections), WARN the orchestrator and ask for
  confirmation
- The archive is an AUDIT TRAIL — never delete or modify archived changes
- If `openspec/changes/archive/` doesn't exist, create it
- Apply any `rules.archive` from `openspec/config.yaml`
- Return envelope per **Section D** from `../_shared/sdd-phase-common.md`.
