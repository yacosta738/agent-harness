---
name: sdd-onboard
description: >
  Guide users through the full SDD cycle on their real codebase, teaching each phase as it happens.
  Trigger: when the user wants a guided walkthrough of the SDD workflow, or asks to be onboarded
  into Spec-Driven Development.
license: MIT
metadata:
  author: gentleman-programming
  version: "1.0"
---

# SDD Onboarding

## Purpose

You run this skill INLINE, as the orchestrator. You teach the SDD workflow by running one complete
cycle on the user's real codebase: small, real artifacts, real code, real archive. You never
execute a phase yourself. You delegate every phase to its executor and explain what happens while
it runs.

## Inputs

- Artifact store mode (`openspec`).
- Optional focus area or improvement suggested by the user.
- Optional injected Project Standards block.

## Limits

- Delegate every phase to its executor (`sdd-init`, `sdd-explore`, `sdd-propose`, `sdd-spec`,
  `sdd-design`, `sdd-tasks`, `sdd-apply`, `sdd-verify`, `sdd-qa`, `sdd-archive`). Do not run phase
  work inline.
- Pick a small onboarding change: completable in one session, low risk, no breaking changes, no
  data migration.
- Keep narration short. The executors do the work; you explain the step and relay the result.
- Do not skip a phase to save time. If a phase reports a blocker, surface it and stop.

## Walkthrough

### Step 1: Welcome and codebase scan

Explain the plan in two or three sentences: find a small improvement, build every artifact,
implement it, archive it, and read each step as it happens. Then scan the repository for a
candidate change that fits the criteria above. Present two or three options and let the user
choose.

### Step 2: Init

Delegate `sdd-init` when the SDD context does not exist yet. Show the detected stack and the
artifact store that was created.

### Step 3: Explore

Delegate `sdd-explore` with the chosen topic. Narrate the question: what is the current behavior,
which constraints matter, and what the options are.

### Step 4: Propose

Delegate `sdd-propose` with the change name and the exploration result. Explain the intent, the
scope, and what stays out of scope.

### Step 5: Spec and design

Delegate `sdd-spec` first. After the delta specs are ready, delegate `sdd-design`, because the
design
must use the requirements and scenarios. Show the requirements first, then the design.

### Step 6: Tasks

Delegate `sdd-tasks`. Show the ordered steps and the delivery decision.

### Step 7: Apply

Delegate `sdd-apply` with the first task group. Relate each change to the requirement it
satisfies.

### Step 8: Verify

Delegate `sdd-verify`. Show the verdict and the evidence. If verification finds a defect, delegate
the corresponding fix to `sdd-apply`, then run `sdd-verify` again before continuing. Do not fix
implementation defects inline.

### Step 9: QA

Delegate `sdd-qa`. Explain that this is the acceptance gate and it checks observable behavior, not
implementation details.

- First, check whether QA is `BLOCKED` or `NOT TESTED` because of an external constraint. Do not
  ask `sdd-apply` to change code for an environment limitation. Stop and report the missing
  prerequisite unless the change meets the exact documentation/configuration-only exception in
  `skills/sdd/sdd-archive/SKILL.md`; for that exception, preserve the QA verdict, record the
  rationale and warning, then continue to the archive gate. This branch takes precedence even if
  the report also mentions an implementation defect.
- Otherwise, if QA reports an implementation defect, do not archive. Delegate the fix to
  `sdd-apply`, then repeat `sdd-verify` and `sdd-qa`.

Stop and report any blocker that remains unresolved.

### Step 10: Archive

Delegate `sdd-archive` only after verification passes and QA is allowed by the acceptance release
gate in `skills/sdd/sdd-archive/SKILL.md`. Show where the change now lives and how the main specs
changed.

### Step 11: Recap

Close with a short recap:

```markdown
## Onboarding Complete

**Change**: {change-name}
**Artifacts created**: proposal.md, specs/{capability}/spec.md, design.md, tasks.md
**Code changed**: {list of files}
**Cycle**: explore → propose → spec → design → tasks → apply → verify → qa → archive
```

Then name the next change worth running through SDD.
