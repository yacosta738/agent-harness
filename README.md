# OpenCode Agent Configuration

Custom agent configuration for [OpenCode](https://opencode.ai) with a Cuban-style fullstack
architect, project management, and a full Spec-Driven Development (SDD) pipeline.

---

## Architecture Overview

```text
opencode.json
├── Agents
│   ├── kuko (primary)          — Fullstack architect, mentor, orchestrator
│   ├── linear-pm (subagent)    — Linear issue/sprint management
│   ├── kerrigan (all)          — SDD orchestrator (coordinates, never executes)
│   └── sdd-{phase} (subagent)  — 9 dedicated SDD phase executors
├── MCP Servers                  — External tool integrations
├── Permissions                  — Tiered access control
└── Skills                       — Reusable instruction sets
```

---

## Agents

### Kuko (Primary)

**Mode:** `primary`

Cuban fullstack architect (15+ years). Warm, direct, practical. Solves first, explains after.

- Answers simple questions directly — no unnecessary delegation
- Delegates complex work to specialized subagents
- TDD by default: failing test first, then implement, then refactor
- TypeScript: strongly typed, avoid `any`
- Challenges bad decisions with evidence and alternatives

**Subagents:** tech-lead, senior-dev, devops-engineer, qa-engineer, security-engineer,
product-manager, code-reviewer, performance-engineer, ux-designer, data-engineer

**Tools:** read, search, bash, write, edit

### Linear PM (Subagent)

**Mode:** `subagent`

Project management specialist for Linear workflows.

- Creates/updates issues with verb-first titles
- Sprint planning and velocity tracking
- Priorities: P0 (Critical) > P1 (High) > P2 (Medium) > P3 (Low)
- States: Backlog > Todo > In Progress > In Review > Done

**Tools:** read, search

### SDD Kerrigan (Orchestrator)

**Mode:** `all`

Cuban-style SDD orchestrator. Coordinates the full Spec-Driven Development lifecycle by delegating
to dedicated sub-agents. Never executes phase work inline.

See [SDD Workflow](#sdd-workflow) below for details.

**Tools:** read, write, edit, bash

### SDD Phase Sub-Agents (9 executors)

**Mode:** `subagent` | **Hidden:** `true`

Each phase has a dedicated executor that reads its SKILL.md and the shared protocol, then does the
work:

| Agent         | Description                                                 |
|---------------|-------------------------------------------------------------|
| `sdd-init`    | Bootstrap openspec structure, detect tech stack             |
| `sdd-explore` | Investigate codebase, compare approaches                    |
| `sdd-propose` | Create change proposal with scope and rollback plan         |
| `sdd-spec`    | Write delta specs with Given/When/Then scenarios            |
| `sdd-design`  | Technical design with architecture decisions                |
| `sdd-tasks`   | Break down into phased implementation checklist             |
| `sdd-apply`   | Implement code (supports TDD RED-GREEN-REFACTOR)            |
| `sdd-verify`  | Quality gate — real test execution + spec compliance matrix |
| `sdd-archive` | Sync delta specs to main specs, move to archive             |

**Tools:** bash, edit, read, write

---

## SDD Workflow

### Phase DAG

```
init → explore → propose → [spec + design] → tasks → apply → verify → archive
                                (parallel)
```

### Commands

**Phase commands** (routed to dedicated sub-agents):

| Command                | Agent       | Description                     |
|------------------------|-------------|---------------------------------|
| `/sdd-init`            | sdd-init    | Initialize openspec structure   |
| `/sdd-explore <topic>` | sdd-explore | Investigate before committing   |
| `/sdd-propose <name>`  | sdd-propose | Create change proposal          |
| `/sdd-spec`            | sdd-spec    | Write specifications            |
| `/sdd-design`          | sdd-design  | Create technical design         |
| `/sdd-tasks`           | sdd-tasks   | Break down into tasks           |
| `/sdd-apply`           | sdd-apply   | Implement (TDD when configured) |
| `/sdd-verify`          | sdd-verify  | Validate against specs          |
| `/sdd-archive`         | sdd-archive | Close the cycle                 |

**Meta-commands** (routed to kerrigan orchestrator):

| Command                | Description                       |
|------------------------|-----------------------------------|
| `/sdd-new <name>`      | explore + propose                 |
| `/sdd-ff <name>`       | propose + [spec + design] + tasks |
| `/sdd-continue [name]` | Resume next phase from state.yaml |

### Artifact Store

Mode is always `openspec` (filesystem-based). Artifacts live in:

```
openspec/
├── config.yaml              ← Project config (stack, rules, TDD settings)
├── specs/                   ← Source of truth (main specs)
│   └── {domain}/spec.md
└── changes/
    ├── archive/             ← Completed (YYYY-MM-DD-{name}/)
    └── {change-name}/       ← Active change
        ├── state.yaml       ← DAG progress (managed by orchestrator)
        ├── exploration.md   ← from sdd-explore (optional)
        ├── proposal.md      ← from sdd-propose
        ├── specs/           ← from sdd-spec (delta specs)
        ├── design.md        ← from sdd-design
        ├── tasks.md         ← from sdd-tasks (updated by sdd-apply)
        └── verify-report.md ← from sdd-verify
```

### Quality Gates

- No `apply` without proposal + spec + design + tasks
- No `archive` unless verify is PASS or PASS WITH WARNINGS (no CRITICAL issues)
- TDD mode: enabled via `openspec/config.yaml` → `rules.apply.tdd: true`

### Shared Protocol

All skills reference `_shared/sdd-phase-common.md` which defines:

| Section                     | Purpose                                                      |
|-----------------------------|--------------------------------------------------------------|
| **A. Skill Loading**        | How to load project-specific coding standards                |
| **B. Artifact Retrieval**   | Read from openspec filesystem paths                          |
| **C. Artifact Persistence** | Write to openspec filesystem paths (MANDATORY)               |
| **D. Return Envelope**      | Structured response: status, summary, artifacts, next, risks |

---

## MCP Servers

| Server          | Type   | Status   | Purpose                          |
|-----------------|--------|----------|----------------------------------|
| Context7        | Remote | Enabled  | Up-to-date library documentation |
| GitHub Grep     | Remote | Enabled  | Search code across GitHub repos  |
| Chrome DevTools | Local  | Enabled  | Browser automation and debugging |
| Playwright      | Local  | Enabled  | Browser testing                  |
| JetBrains       | Local  | Enabled  | IDE integration                  |
| GitHub          | Remote | Disabled | GitHub Copilot API               |
| Ahrefs          | Local  | Disabled | SEO analysis                     |
| Magic Patterns  | Local  | Disabled | Design patterns                  |
| Stitch          | Remote | Disabled | Google Stitch API                |
| Linear          | Local  | Disabled | Linear project management        |
| Notion          | Local  | Disabled | Notion API                       |
| SonarQube       | Local  | Disabled | Code quality analysis            |
| MarkItDown      | Local  | Disabled | Document conversion              |

---

## Permissions

```
Bash:
  Auto-allow: git read ops, npm/pnpm/yarn/bun, node, python, pytest, go test, cargo test
  Ask first:  git commit, git push, git rebase, git reset --hard, everything else

Read:
  Auto-allow: everything except secrets
  Deny:       .env, .env.*, secrets/**, credentials.json
```

---

## Skills

Skills are reusable instruction sets in `skills/`. The SDD skills live under `skills/sdd/`:

```
skills/sdd/
├── _shared/
│   ├── sdd-phase-common.md      ← Shared protocol (Sections A-D)
│   ├── persistence-contract.md  ← Mode resolution + state tracking
│   └── openspec-convention.md   ← File paths + archive rules
├── sdd-init/SKILL.md
├── sdd-explore/SKILL.md
├── sdd-propose/SKILL.md
├── sdd-spec/SKILL.md
├── sdd-design/SKILL.md
├── sdd-tasks/SKILL.md
├── sdd-apply/SKILL.md
├── sdd-verify/SKILL.md
└── sdd-archive/SKILL.md
```

All skills are at **v2.0** and follow the shared protocol.

---

## Themes

### Aura Dark (default)

Vibrant dark theme with high contrast. Primary: `#a277ff`, Secondary: `#61ffca`, Accent: `#ffca85`

### Aura Dark Soft

Softer variant with reduced saturation. Primary: `#8464c6`, Secondary: `#54c59f`, Accent: `#c7a06f`

---

## File Structure

```
editors/agents/opencode/
├── opencode.json          ← Main configuration (agents, MCP, permissions)
├── README.md              ← This file
├── commands/
│   ├── sdd-init.md        ← Phase commands (→ dedicated sub-agents)
│   ├── sdd-explore.md
│   ├── sdd-propose.md
│   ├── sdd-spec.md
│   ├── sdd-design.md
│   ├── sdd-tasks.md
│   ├── sdd-apply.md
│   ├── sdd-verify.md
│   ├── sdd-archive.md
│   ├── sdd-new.md         ← Meta-commands (→ kerrigan)
│   ├── sdd-ff.md
│   ├── sdd-continue.md
│   └── a11y-expert.md     ← Standalone accessibility expert
├── skills/
│   └── sdd/               ← SDD skill files (see Skills section)
├── themes/
│   ├── aura-dark.json
│   ├── aura-dark-soft.json
│   └── base.json
└── tui.json               ← TUI configuration
```

---

## Deployment

These dotfiles are the source of truth. Copy or symlink to `~/.config/opencode/` for runtime:

```bash
# Example: symlink approach
ln -sf ~/Dev/dotfiles/editors/agents/opencode/opencode.json ~/.config/opencode/opencode.json
ln -sf ~/Dev/dotfiles/editors/agents/opencode/commands ~/.config/opencode/commands
ln -sf ~/Dev/dotfiles/editors/agents/opencode/skills ~/.config/opencode/skills
ln -sf ~/Dev/dotfiles/editors/agents/opencode/themes ~/.config/opencode/themes
```

---

Made with care by a Cuban who doesn't sugarcoat — arquitectura primero, evidencia siempre, y cero
humo.
