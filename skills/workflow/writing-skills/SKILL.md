---
name: writing-skills
description: Use when creating new skills, editing existing skills, or verifying skills work before deployment
---

# Writing Skills

## Overview

**Writing skills IS Test-Driven Development applied to process documentation.**

You write test cases (pressure scenarios), watch them fail (baseline behavior without the skill),
write the skill (documentation), watch tests pass (agent complies), and refactor (close loopholes).

**Core principle:** If you didn't watch an agent fail without the skill, you don't know if the
skill teaches the right thing.

**REQUIRED BACKGROUND:** Understand `test-driven-development` skill before using this one.
Same RED-GREEN-REFACTOR cycle, applied to documentation.

## What is a Skill?

A **skill** is a reference guide for proven techniques, patterns, or tools. Skills help future
agent instances find and apply effective approaches.

**Skills are:** Reusable techniques, patterns, tools, reference guides  
**Skills are NOT:** Narratives about how you solved a problem once

## TDD Mapping for Skills

| TDD Concept | Skill Creation |
|---|---|
| **Test case** | Pressure scenario |
| **Production code** | Skill document (SKILL.md) |
| **Test fails (RED)** | Agent violates rule without skill |
| **Test passes (GREEN)** | Agent complies with skill present |
| **Refactor** | Close loopholes while maintaining compliance |

## When to Create a Skill

**Create when:**
- Technique wasn't intuitively obvious
- You'd reference this again across projects
- Pattern applies broadly (not project-specific)
- Others would benefit

**Don't create for:**
- One-off solutions
- Standard practices well-documented elsewhere
- Project-specific conventions (put in AGENTS.md)
- Mechanical constraints (if enforceable with tooling, automate it)

## Directory Structure

```
skills/
  skill-name/
    SKILL.md              # Main reference (required)
    supporting-file.*     # Only if needed for heavy reference or reusable tools
```

## SKILL.md Frontmatter

Two required fields: `name` and `description` — max 1024 characters total.

- `name`: letters, numbers, and hyphens only
- `description`: starts with "Use when..." — describes ONLY triggering conditions, NEVER
  summarizes the skill's workflow (agents will follow the description shortcut instead of reading
  the full skill)

```yaml
# ❌ BAD: Summarizes workflow — agent may follow this instead of reading skill
description: Use when executing plans - dispatches subagent per task with code review between tasks

# ✅ GOOD: Just triggering conditions
description: Use when executing implementation plans with independent tasks in the current session
```

## Skill Structure

```markdown
---
name: skill-name
description: Use when [specific triggering conditions]
---

# Skill Name

## Overview
What is this? Core principle in 1-2 sentences.

## When to Use
Bullet list with symptoms and use cases. When NOT to use.

## Core Pattern
Before/after comparison or process steps.

## Quick Reference
Table or bullets for scanning.

## Common Mistakes
What goes wrong + fixes.
```

## Token Efficiency

Frequently-loaded skills add to every conversation cost.

- **Target:** <500 words for most skills; <200 for frequently-loaded ones
- Move heavy reference (100+ lines) to separate files, link from SKILL.md
- Use cross-references instead of repeating content from other skills
- One excellent example beats many mediocre ones

## Claude Search Optimization

Future agent needs to FIND your skill:
- Use error messages, symptoms, and tool names as keywords throughout
- Descriptive naming: verb-first (`systematic-debugging` not `debugging-techniques`)
- Gerunds work well for processes: `writing-plans`, `receiving-code-review`

## The Iron Law

```
NO SKILL WITHOUT A FAILING TEST FIRST
```

Applies to new skills AND edits. No exceptions:
- Not for "simple additions"
- Not for "documentation updates"
- Don't keep untested changes as "reference"
- Delete means delete — don't adapt untested code while running tests

## Skill Creation Checklist

**RED Phase:**
- [ ] Create pressure scenario(s) for discipline skills (3+ combined pressures)
- [ ] Run scenario WITHOUT skill — document baseline behavior verbatim
- [ ] Identify patterns in rationalizations/failures

**GREEN Phase:**
- [ ] Name uses only letters, numbers, hyphens
- [ ] YAML frontmatter with `name` and `description` (max 1024 chars)
- [ ] Description starts with "Use when..." — no workflow summary
- [ ] Description written in third person
- [ ] Keywords throughout for search
- [ ] Clear overview with core principle
- [ ] Addresses specific failures identified in RED
- [ ] Run scenarios WITH skill — verify compliance

**REFACTOR Phase:**
- [ ] Identify new rationalizations from testing
- [ ] Add explicit counters for discipline skills
- [ ] Build rationalization table from all test iterations
- [ ] Re-test until bulletproof

**Quality:**
- [ ] Small flowchart only if decision is non-obvious
- [ ] Quick reference table
- [ ] Common mistakes section
- [ ] No narrative storytelling
- [ ] Supporting files only for tools or heavy reference

## Common Mistakes

| Mistake | Fix |
|---|---|
| Description summarizes workflow | Describe ONLY when to use — not what the skill does |
| Multiple languages for one example | One excellent example in the most relevant language |
| Repeating content from another skill | Cross-reference with `Use skill X for Y` |
| Deploying without testing | Follow RED-GREEN-REFACTOR — no exceptions |
| Skill too long | Move heavy reference to separate file; link from SKILL.md |
