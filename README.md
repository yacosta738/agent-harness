# Agent Harness

Portable agent configuration for [OpenCode](https://opencode.ai) — Kerrigan, a Cuban-style
fullstack architect, plus team sub-agents, a Spec-Driven Development (SDD) pipeline, and
auto-discovered skills and commands.

The filesystem is the source of truth: `skills/**/SKILL.md` for skills, `commands/*.md` for
commands, `adapters/opencode/opencode.json` for MCP/permissions, and `adapters/opencode/adapter.json`
for deploy composition.

## Operating model

OpenCode-first RPI: already-understood work stays inline, fresh context is delegated only when
useful, and formal SDD is selected explicitly — never inferred from size or risk.

Every request gets an explicit route before acting:

- **Direct inline** — Q&A, tiny obvious edits, mechanical config changes.
- **Delegated direct** — broad exploration, 2+ non-trivial writes, or specialist depth helps.
- **Explicit SDD** — only on explicit request or an accepted proposal naming the durable
  coordination problem it solves.

For substantial work, track it in `plan/tasks/<feature>.md` and mirror to Engram. Optional
Receipt-Driven Development (RDD) reviews an immutable candidate but never authorizes delivery.

## Quick start

```bash
# Validate references (opencode.json {file:} paths, adapter.json includes, command paths)
python3 scripts/check-refs.py

# List what a preset would deploy
node scripts/generate-bundle.mjs list --preset recommended

# Render + verify the deployable bundle (dist/ is gitignored — required after clone/pull)
scripts/deploy.sh --preset recommended --output dist/opencode
```

Deploy keeps this repo canonical and maps it 1:1 onto `~/.config/opencode`, except
every `adapters/opencode/**` file lands with that prefix stripped (`opencode.json`,
`tui.json`, `scripts/`, `plugins/`, `themes/` at bundle root — no `adapters/` dir).
The orchestrator prompt ships as-is at `agents/ORCHESTRATOR.md` (kerrigan loads it
via `{file:}`). See [Deployment](#deployment) for the dotter mapping.

To change Kerrigan's voice, edit `agents/acs/WRITING_STYLE.md` — no other file needs touching.

## Agents

16 agents registered in `adapters/opencode/opencode.json`:

- **kerrigan** — primary. Senior fullstack architect (15+ years). Warm, direct, practical.
  Answers simple questions directly, delegates the rest, challenges bad decisions with evidence.
- **linear-pm** — Linear issues, sprints, priorities (P0–P3), states
  (Backlog → Todo → In Progress → In Review → Done).
- **Team specialists** (`agents/team/`, 10) — `tech-lead`, `senior-dev`, `devops-engineer`,
  `qa-engineer`, `security-engineer`, `performance-engineer`, `ux-designer`, `data-engineer`,
  `product-manager`, `code-reviewer`.
- **SDD phase executors** (`agents/sdd/`, 11) — `sdd-init`, `sdd-explore`, `sdd-propose`,
  `sdd-spec`, `sdd-design`, `sdd-tasks`, `sdd-apply`, `sdd-verify`, `sdd-qa`, `sdd-archive`,
  plus `sdd-onboard`.
- **Review protocol** — `lens`, `mirror` (blind judges), `scalpel` (surgical fixes only).

Kerrigan never executes SDD phase work inline — it delegates to the phase agent.

## SDD workflow

Phase DAG:

```
init → explore → propose → [spec + design] → tasks → apply → verify → qa → archive
                              (parallel)
```

**Phase commands** (13 total: 10 phase + 3 meta) route to their dedicated agent via
`agent:` / `subtask:` frontmatter:

| Command | Agent | Purpose |
|---|---|---|
| `/sdd-init` | sdd-init | Bootstrap openspec structure, detect stack |
| `/sdd-explore` | sdd-explore | Investigate before committing |
| `/sdd-propose` | sdd-propose | Proposal with scope and rollback |
| `/sdd-spec` | sdd-spec | Delta specs, Given/When/Then |
| `/sdd-design` | sdd-design | Technical design, ADRs |
| `/sdd-tasks` | sdd-tasks | Implementation checklist |
| `/sdd-apply` | sdd-apply | Implement (TDD when configured) |
| `/sdd-verify` | sdd-verify | Technical + spec-compliance gate |
| `/sdd-qa` | sdd-qa | Acceptance evidence, `qa-report.md` |
| `/sdd-archive` | sdd-archive | Two-report gate, sync + archive |
| `/sdd-new` | kerrigan | explore + propose |
| `/sdd-ff` | kerrigan | propose + [spec + design] + tasks |
| `/sdd-continue` | kerrigan | Resume from `state.yaml` |

Artifacts (mode `openspec`) live under `openspec/changes/<name>/`
(`proposal.md`, `design.md`, `tasks.md`, `verify-report.md`, `qa-report.md`, `state.yaml`)
with long-lived truth in `openspec/specs/`.

Quality gates:

- No `apply` without proposal + spec + design + tasks.
- No `archive` without both `verify-report.md` and `qa-report.md`, verification PASS (or PASS
  WITH WARNINGS), QA policy allowing release, and zero unresolved CRITICAL/P0/P1.
- This repo has no app under test and no general test runner: harness checks cannot claim
  product acceptance. Record `NOT TESTED` / `BLOCKED` with evidence where applicable.

## Commands (27)

Two standards, split on purpose:

- **Routed** (`sdd-*`) — frontmatter carries `agent:` + `subtask: true`; the command delegates.
- **Standalone** (everything else) — frontmatter carries only `description:`; the command runs
  as a self-contained expert prompt or playbook.

| Group | Commands |
|---|---|
| SDD (13) | `sdd-init`, `sdd-explore`, `sdd-propose`, `sdd-spec`, `sdd-design`, `sdd-tasks`, `sdd-apply`, `sdd-verify`, `sdd-qa`, `sdd-archive`, `sdd-new`, `sdd-ff`, `sdd-continue` |
| Diagram (3) | `diagram-export`, `diagram-import-drawio`, `diagram-import-mermaid` |
| Vercel (5) | `vercel-deploy`, `vercel-status`, `vercel-env`, `vercel-bootstrap`, `vercel-marketplace` |
| Misc (6) | `a11y-expert`, `build-and-run-macos-app`, `fix-codesign-error`, `test-macos-app`, `goal`, `loop` |

## Skills (211)

Auto-discovered from `skills/**/SKILL.md` across 19 groups. Counts drift as the ecosystem grows —
trust the filesystem, not this table:

| Group | # | What |
|---|---|---|
| `vercel/` | 48 | Next.js, functions, CLI/API, AI, infra, auth/payments/CMS, UI |
| `workflow/` | 28 | Brainstorming, debugging, TDD, planning, reviews, worktrees, RPI/RDD |
| `design-pattern/` | 22 | GoF patterns (adapter, factory, observer, strategy, …) |
| `design/` | 15 | Brand, frontend taste, diagram-design, imagegen, impeccable, … |
| `ai/` | 12 | AI SDK + Hugging Face (datasets, trainers, papers, gradio, …) |
| `web/` | 12 | A11y, SEO, performance, Core Web Vitals, frontend-design, … |
| `macos/` | 11 | Build/run/debug, signing, packaging, SwiftUI, windows, telemetry |
| `sdd/` | 10 | One skill per SDD phase + `_shared/` protocol |
| `github/` | 9 | Actions, PR flow, stacked PRs, CI fixes, reviews, `yeet` |
| `cloudflare/` | 8 | Workers, wrangler, D1/KV/R2, Durable Objects, Agents SDK, sandbox |
| `tools/` | 7 | Linear, Sentry, webapp-testing, portless, jules-cli, … |
| `ios/` | 6 | App Intents, SwiftUI patterns, Liquid Glass, perf audit, refactor |
| `obsidian/` | 5 | CLI, markdown, bases, canvas, defuddle |
| `devops/` | 4 | Docker, Grafana, Make, SQL optimization |
| `notion/` | 4 | Capture, meetings, research docs, spec→implementation |
| `security/` | 4 | Threat model, finding discovery/triage/fix |
| `personal/` | 3 | `haci` (IRPF España), `imagegen`, `yuniel-writing-style` |
| `languages/` | 2 | TypeScript, Rust (Ratatui) |
| `android/` | 1 | Emulator QA |

Notable: `skills/design/diagram-design` is a pinned offline-first snapshot (upstream release
2.3.5) with local `references/`, `scripts/`, `assets/` trees and `/diagram-*` command adapters.
It never fetches, installs, or renders remotely; missing PNG/Chromium capability reports
`UNAVAILABLE`/`BLOCKED`.

## MCP servers

Configured in `adapters/opencode/opencode.json` (`mcp` key) — that file is the source of truth
for enabled/disabled. Currently wired: Engram (persistent memory), Context7, GitHub Grep
(`gh_grep`), Chrome DevTools, Playwright, Semgrep, Socket, Codegraph, OpenPencil — plus
disabled-by-default integrations (GitHub, Cloudflare API, Linear, Notion, SonarQube, Vercel,
Ahrefs, Stitch, etc.). Enable one by flipping `enabled` and providing its env key.

## Permissions

Also in `adapters/opencode/opencode.json`:

- **bash**: allow by default; `git commit`, `git push`, `git rebase`, `git reset --hard` ask first.
- **read**: allow except secrets — `*.env`, `**/secrets/**`, `**/credentials.json`, SSH/AWS keys,
  keychains, and similar deny patterns.

## File structure

```
agent-harness/
├── agents/                  ← ORCHESTRATOR.md (kerrigan), acs/, team/ (10), sdd/ (11), linear-pm, lens/mirror/scalpel
├── commands/                ← 27 slash commands (13 sdd + 3 diagram + 5 vercel + 6 misc)
├── skills/                  ← 211 skills in 19 groups (filesystem = truth)
├── adapters/opencode/       ← opencode.json, tui.json, adapter.json, themes/, plugins/, scripts/
├── scripts/                 ← check-refs.py (validate), generate-bundle.mjs (render/list presets)
└── harness.config.json      ← preset, persona, TDD toggle
```

## Deployment (render bundle + dotter)

The repo is canonical; `dist/` (gitignored by design — generated artifacts
don't belong in git) is the deployable bundle. Fresh machine sequence:
clone → `scripts/deploy.sh` → dotter deploy. Re-run `deploy.sh` after every
pull, otherwise dotter symlinks dangle:

```bash
scripts/deploy.sh --preset recommended --output dist/opencode
# = render bundle + verify 27/27 {file:} refs resolve inside it
```

Dotter maps the bundle → `~/.config/opencode` (adjust the submodule path to
yours; re-render after pulling):

```toml
"editors/agents/agent-harness/dist/opencode/opencode.json" = "/Users/acosta/.config/opencode/opencode.json"
"editors/agents/agent-harness/dist/opencode/tui.json" = "/Users/acosta/.config/opencode/tui.json"
"editors/agents/agent-harness/dist/opencode/plugins" = "/Users/acosta/.config/opencode/plugins"
"editors/agents/agent-harness/dist/opencode/themes" = "/Users/acosta/.config/opencode/themes"
"editors/agents/agent-harness/dist/opencode/scripts" = "/Users/acosta/.config/opencode/scripts"
"editors/agents/agent-harness/dist/opencode/agents" = "/Users/acosta/.config/opencode/agents"
"editors/agents/agent-harness/dist/opencode/skills" = "/Users/acosta/.config/opencode/skills"
"editors/agents/agent-harness/dist/opencode/commands" = "/Users/acosta/.config/opencode/commands"
"editors/agents/agent-harness/dist/opencode/harness.config.json" = "/Users/acosta/.config/opencode/harness.config.json"
```

No-build alternative: symlink the source tree 1:1 instead, stripping the
`adapters/opencode/` prefix by hand (`opencode.json`, `tui.json`, `scripts/`,
`plugins/`, `themes/` land at target root). You lose preset pruning — every
`{file:}` must resolve, i.e. only `recommended`/`full` content works.

---

*arquitectura primero, evidencia siempre, y cero humo.*
