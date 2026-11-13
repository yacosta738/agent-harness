# Agent Harness

Portable agent configuration for [OpenCode](https://opencode.ai) — Kerrigan, a fullstack architect,
plus team sub-agents, a Spec-Driven Development (SDD) pipeline, and
auto-discovered skills and commands.

The filesystem is the source of truth: `skills/**/SKILL.md` for skills, `commands/*.md` for
commands, `adapters/opencode/opencode.json` for MCP/permissions, and
`adapters/opencode/adapter.json`
for deploy composition.

## Operating model

OpenCode-first RPI: already-understood work stays inline, fresh context is delegated only when
useful, and formal SDD is selected explicitly — never inferred from size or risk.

Every request gets an explicit route before acting:

- **Direct inline** — Q&A, tiny obvious edits, mechanical config changes.
- **Delegated direct** — broad exploration, 2+ non-trivial writes, or specialist depth helps.
- **Explicit SDD** — only on explicit request or an accepted proposal naming the durable
  coordination problem it solves.

For substantial work, track it in `.agents/rpi/plan/tasks/<feature>.md` and mirror to Engram.
Every `/review` runs Receipt-Driven Development (RDD) on a materialized candidate snapshot and
applies 4R;
RDD never authorizes delivery.

When adopting this harness in a project with existing RPI plans, the first substantial RPI task
checks the legacy `plan/tasks/` path. If only that path exists, its contents move to
`.agents/rpi/plan/tasks/` unchanged. If both paths exist, the orchestrator reports their differences
and pauses for conflict resolution without merging or overwriting files.

## Quick start

```bash
# Validate references in the live repo
npm run validate

# List every file in the complete bundle
npm run list

# Render + verify the complete deployable bundle (distribution/ is gitignored)
npm run deploy
```

Deploy keeps this repo canonical and maps it 1:1 onto `~/.config/opencode`, except
every `adapters/opencode/**` file lands with that prefix stripped (`opencode.json`,
`cli.json`, `scripts/`, `themes/` at bundle root — no `adapters/` dir).
The V2 bundle intentionally ships no legacy `tui.json` or unported plugin implementations.
The orchestrator prompt ships as-is at `prompts` (kerrigan loads it via `{file:}`). See
[Deployment](#deployment) for the dotter mapping.

To change Kerrigan's voice, edit `prompts` — no other file needs touching.

All OpenCode agents receive the shared communication policy in
`prompts/communication/CONTROLLED_LANGUAGE.md`. It applies ASD-STE100-inspired
principles to English technical communication and equivalent clarity principles in
other languages. It preserves technical meaning, normative terms, and each agent's
output contract; it does not claim official ASD-STE100 compliance.

## Agents

25 agents registered in `adapters/opencode/opencode.json`, with `default_agent` set to `kerrigan` so
a new session starts with the orchestrator:

- **kerrigan** — primary. Senior fullstack architect (15+ years). Warm, direct, practical.
  Answers simple questions directly, delegates the rest, challenges bad decisions with evidence.
- **linear-pm** — Linear issues, sprints, priorities (P0–P3), states (Backlog → Todo → In Progress →
  In Review → Done).
- **Team specialists** (10) — `tech-lead`, `senior-dev`, `devops-engineer`, `qa-engineer`,
  `security-engineer`, `performance-engineer`, `ux-designer`, `data-engineer`, `product-manager`,
  `code-reviewer`. Registered as flat `subagent` agents and listed in Kerrigan's `permission.task`
  allowlist. Kerrigan cannot spawn an agent that is missing from that allowlist.
- **SDD phase executors** (`prompts`, 10) — `sdd-init`, `sdd-explore`, `sdd-propose`,
  `sdd-spec`, `sdd-design`, `sdd-tasks`, `sdd-apply`, `sdd-verify`, `sdd-qa`, `sdd-archive`.
  Each delegated prompt is a brief contract; the procedure lives in `skills/sdd/<phase>/SKILL.md`
  and the shared protocol `skills/sdd/_shared/sdd-phase-common.md`.
- **SDD onboarding** (`skills/sdd/sdd-onboard/SKILL.md`) — inline skill, not a sub-agent. It guides
  the user through one complete cycle on the real codebase and delegates every phase.
- **Review protocol** — `lens`, `mirror` (blind judges, with `edit` denied so they cannot modify the
  candidate), `scalpel` (surgical fixes only).

Agent registration is verified against the runtime, not only against the JSON: `npm run test:agents`
starts an isolated OpenCode instance and asserts that every declared agent appears in
`opencode debug agents`. A nested `subagents` block looks valid but is silently ignored, so the JSON
shape alone is not evidence.

Agent capability is declared with `permission`, which the runtime enforces. The legacy `tools` map
is
translated into permission rules that use the tool name as the action, so a key such as `delegate`
becomes a permission action nothing ever matches, and `tools: true` only restates the default allow.

Kerrigan never executes SDD phase work inline — it delegates to the phase agent.

## SDD workflow

Phase DAG:

```
init → explore → propose → spec → design → tasks → apply → verify → qa → archive
```

**Phase commands** (13 total: 10 phase + 3 meta) route to their dedicated agent via
`agent:` / `subtask:` frontmatter:

| Command         | Agent       | Purpose                                        |
|-----------------|-------------|------------------------------------------------|
| `/sdd-init`     | sdd-init    | Bootstrap SDD artifact structure, detect stack |
| `/sdd-explore`  | sdd-explore | Investigate before committing                  |
| `/sdd-propose`  | sdd-propose | Proposal with scope and rollback               |
| `/sdd-spec`     | sdd-spec    | Delta specs, Given/When/Then                   |
| `/sdd-design`   | sdd-design  | Technical design, ADRs                         |
| `/sdd-tasks`    | sdd-tasks   | Implementation checklist                       |
| `/sdd-apply`    | sdd-apply   | Implement (mandatory TDD for business logic)   |
| `/sdd-verify`   | sdd-verify  | Technical + spec-compliance gate               |
| `/sdd-qa`       | sdd-qa      | Acceptance evidence, `qa-report.md`            |
| `/sdd-archive`  | sdd-archive | Two-report gate, sync + archive                |
| `/sdd-new`      | kerrigan    | explore + propose                              |
| `/sdd-ff`       | kerrigan    | propose + spec + design + tasks                |
| `/sdd-continue` | kerrigan    | Resume from `state.yaml`                       |

Artifacts (mode `openspec`) live under `.agents/sdd/changes/<name>/`
(`proposal.md`, `design.md`, `tasks.md`, `verify-report.md`, `qa-report.md`, `state.yaml`)
with long-lived truth in `.agents/sdd/specs/`.

Quality gates:

- No `apply` without proposal + spec + design + tasks.
- No `archive` without both `verify-report.md` and `qa-report.md`, verification PASS (or PASS
  WITH WARNINGS), QA policy allowing release, and zero unresolved CRITICAL/P0/P1.
- This repo has no app under test and no general test runner: harness checks cannot claim
  product acceptance. Record `NOT TESTED` / `BLOCKED` with evidence where applicable.

## Review flow

`/review <PR URL>` starts RDD on that pull request's diff between its merge base and `head`. Without
a
URL, `/review` starts RDD on the local working tree against `HEAD`. Both paths always apply
R1 Risk, R2 Readability, R3 Reliability, and R4 Resilience. A review does not authorize changes,
GitHub comments, commits, or push. `/pr-watch` owns PR threads and workflow checks. It runs an
initial
pass and uses the global `loop` skill for five-minute follow-ups for at most one hour only when the
runtime provides a compatible scheduler. Without one, it reports a single-pass fallback and does not
claim ongoing monitoring. It stops on merge/closure, timeout, user request, or an auth/ambiguity
block; it does not commit or push.

Validate the flow tests with `npm run test:review`.
On Windows, pull requests that contain symlinks need system permission to create them; when that
permission is unavailable, `/review` stops and does not substitute another candidate.
Windows does not apply a directory's read-only bit as an ACL that prevents adding entries. The
control
plane re-checks the tree when it captures the review and rejects changes; for a read-only guarantee
against concurrent local processes, use a Unix environment.

## Commands (22)

Two standards are used, separated on purpose:

- **Delegated** (`sdd-*`) — the frontmatter contains `agent:` and `subtask: true`; the command
  delegates the execution.
- **Standalone** (the rest) — the frontmatter contains only `description:`; the command runs as an
  expert instruction or a self-contained guide.

| Group        | Commands                                                                                                                                                                 |
|--------------|--------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| SDD (13)     | `sdd-init`, `sdd-explore`, `sdd-propose`, `sdd-spec`, `sdd-design`, `sdd-tasks`, `sdd-apply`, `sdd-verify`, `sdd-qa`, `sdd-archive`, `sdd-new`, `sdd-ff`, `sdd-continue` |
| Diagrams (3) | `diagram-export`, `diagram-import-drawio`, `diagram-import-mermaid`                                                                                                      |
| Assorted (6) | `a11y-expert`, `build-and-run-macos-app`, `fix-codesign-error`, `test-macos-app`, `pr-watch`, `review`                                                                   |

The five Vercel commands were retired from the active catalog. They are preserved, together with the
Vercel skills, in the local canonical ZIP `~/Documents/vercel.zip`, outside the repository. The ZIP
is not part of the repository or of the deployable bundle; do not look for a copy in `skills/` or
`distribution/`.

## Skills (123)

Auto-discovered from `skills/**/SKILL.md` across 18 groups. Counts drift as the ecosystem grows —
trust the filesystem, not this table:

| Group             | #                      | What                                                                                            |
|-------------------|------------------------|-------------------------------------------------------------------------------------------------|
| `workflow/`       | 26                     | Brainstorming, debugging, planning, reviews, worktrees, RPI/RDD, output control                 |
| `testing/`        | 1                      | Test-driven development and test design                                                         |
| `design-pattern/` | 1                      | Consolidated GoF pattern skill (22 patterns in `references/`)                                   |
| `design/`         | 7                      | Brand, frontend taste, diagram-design, imagegen, impeccable, …                                  |
| `web/`            | 11                     | A11y, SEO, performance, Core Web Vitals, nothing-design, …                                      |
| `macos/`          | 11                     | Build/run/debug, signing, packaging, SwiftUI, windows, telemetry                                |
| `sdd/`            | 11                     | Ten phase skills, inline onboarding, and the `_shared/` protocol                                |
| `github/`         | 10                     | Actions, PR flow, stacked PRs, CI fixes, reviews, `pr-watch`, `yeet`                            |
| `cloudflare/`     | 8                      | Workers, wrangler, D1/KV/R2, Durable Objects, Agents SDK, sandbox                               |
| `tools/`          | 7                      | Linear, Sentry, webapp-testing, portless, jules-cli, …                                          |
| `ios/`            | 6                      | App Intents, SwiftUI patterns, Liquid Glass, perf audit, refactor                               |
| `obsidian/`       | 5                      | CLI, markdown, bases, canvas, defuddle                                                          |
| `devops/`         | 4                      | Docker, Grafana, Make, SQL optimization                                                         |
| `notion/`         | 4                      | Capture, meetings, research docs, spec→implementation                                           |
| `security/`       | 5 (+12 attack classes) | Orchestrator + threat model, finding discovery/triage/fix; attack-classes library in `_shared/` |
| `personal/`       | 3                      | `haci` (Spanish IRPF), `imagegen`, `yuniel-writing-style`                                       |
| `languages/`      | 2                      | TypeScript, Rust (Ratatui)                                                                      |
| `android/`        | 1                      | Emulator QA                                                                                     |

Notable: `skills/design/diagram-design` is a pinned offline-first snapshot (upstream release
2.3.5) with local `references/`, `scripts/`, `assets/` trees and `/diagram-*` command adapters.
It never fetches, installs, or renders remotely; missing PNG/Chromium capability reports
`UNAVAILABLE`/`BLOCKED`. The external ZIP with the Vercel skills and commands is archived in
`~/Documents/vercel.zip` and is not included in the auto-discovered skill count.

Routing across the 8 design skills — which one to load, which one wins in a conflict, and the
known install limitations — is in `skills/design/README.md`. Six overlapping design skills were
archived on 2026-10-21; see `~/Downloads/Other/skills-archive/README.md` for the reason behind each.

## MCP servers

Configured in `adapters/opencode/opencode.json` (`mcp` key) — that file is the source of truth
for enabled/disabled. Currently wired: Engram (persistent memory), Context7, GitHub Grep
(`gh_grep`), Chrome DevTools, Playwright, Semgrep, Socket, Codegraph — plus
disabled-by-default integrations (GitHub, Cloudflare API, Linear, Notion, SonarQube, Vercel,
Ahrefs, Stitch, etc.). Enable one by flipping `enabled` and providing its env key.

### Custom URLs and providers

Some MCP integrations and the AI provider endpoint accept environment variables for full
personalization. Copy `.env.example` to `.env.local` and edit:

| Variable        | Default                                   | Purpose                                                              |
|-----------------|-------------------------------------------|----------------------------------------------------------------------|
| `ROOK_BASE_URL` | `https://api.openai.com/v1`               | AI router/proxy base URL. Omit or use default to go direct to OpenAI |
| `N8N_MCP_URL`   | `https://n8n.example.com/mcp-server/http` | Your n8n MCP server URL                                              |

**Using your own router or proxy:** Set `ROOK_BASE_URL` to your endpoint. Omit it to use
the default OpenAI endpoint directly — no custom infrastructure required.

**Disabling custom services:** All custom-service URLs have safe defaults. If you don't set
`N8N_MCP_URL`, the n8n integration uses a placeholder URL and remains disabled by default anyway.

## Junie ACP pilot (temporary through 2026-12-31)

The optional Junie integration uses MCACP 0.1.3 as an MCP-to-ACP bridge. Junie is **not** an OpenCode
native `task` subagent: Kerrigan calls `junie_acp_*` tools explicitly and retains planning, decisions,
and final diff/test review. The bridge runs with `operator` permission policy; OpenCode asks before
Kerrigan uses each Junie ACP MCP tool, and Junie permission requests require explicit inspection and
a specific grant. No permission is granted automatically.

### Setup and deploy

- Install Node.js 20+ and Junie CLI 26.11.1+; ensure `junie` is on `PATH`.
- Complete Junie sign-in with the JetBrains account flow when requested. ACP `initialize` advertises
  `jetbrains-account` authentication. The pilot has not confirmed the current user's `authStatus` or
  authenticated session, so treat authentication as a blocker until Junie reports it or the user
  completes login. Do not put credentials or tokens in this repository or MCP config.
- The adapter source includes `adapters/opencode/mcacp.json`; bundle rendering maps it to
  `mcacp.json` at `~/.config/opencode/mcacp.json`. OpenCode starts MCACP with that directory as
  its `cwd`, because MCACP 0.1.3 reads `mcacp.json` from its working directory and does not read
  `MCACP_CONFIG`.
- Render and deploy the bundle using the normal [deployment](#deployment) steps. Confirm
  `~/.config/opencode/mcacp.json` exists after deploy.
- `mcacp.json` starts `junie --acp=true --skip-update-check`. Junie's `--acp` requires an explicit
  boolean value. `mcacp@0.1.3` is pinned; do not use `latest`.

### Use and safety

Kerrigan must call the bridge tools explicitly: initialize Junie, create a session with the intended
project `cwd`, preserve Junie's default `brave_mode` (`brave-auto`), send a bounded prompt with
context and acceptance criteria, inspect returned events, and review the resulting diff and relevant
checks. Do not use MCP `set_mode`; Junie does not support that ACP method.
Junie can modify files under that `cwd`; use only authorized work. Kerrigan owns all decisions and
acceptance. This is MCP tool use, not native OpenCode `task` delegation.

### Manual review/removal by 2026-12-31

Review or remove the pilot by 2026-12-31. Removal is manual; no automatic deletion is configured.
Disable or remove `mcp.servers.junie_acp` and its Junie permission rules from
`adapters/opencode/opencode.json`; remove the pilot section from `prompts/ORCHESTRATOR.md`,
`adapters/opencode/mcacp.json` from `adapters/opencode/adapter.json`, the pilot test assertions, and
this README section plus `docs/JUNIE-ACP-PILOT.md`. Re-render/deploy and validate with
`npm run test:agents` and `npm run validate`. Do not delete MCACP session/user data automatically.

## Permissions

Also in `adapters/opencode/opencode.json`:

- **bash**: allow by default; `git commit`, `git push`, `git rebase`, `git reset --hard` ask first.
- **read**: allow except secrets — `*.env`, `**/secrets/**`, `**/credentials.json`, SSH/AWS keys,
  keychains, and similar deny patterns.

## File structure

```
agent-harness/
├── prompts/                  ← ORCHESTRATOR.md (kerrigan), acs/, team/ (10), sdd/ (10), linear-pm, lens/mirror/scalpel
├── commands/                ← 22 comandos (13 SDD + 3 diagramas + 6 varios)
├── skills/                  ← 123 skills in 18 groups (filesystem = truth)
├── docs/                    ← Platform-specific setup guides
│   ├── WINDOWS.md          ← Windows: Node 18+ only, no WSL required
│   └── UNIX.md             ← macOS + Linux: Node 18+ setup guides
├── adapters/opencode/       ← opencode.json, cli.json, adapter.json, themes/, scripts/
├── scripts/                 ← check-refs.mjs (validate), generate-bundle.mjs (render/list bundle), deploy.mjs (render+verify)
└── harness.config.json      ← persona
```

## Platform setup

For platform-specific installation instructions, see:

- [docs/WINDOWS.md](docs/WINDOWS.md) — Windows (PowerShell / cmd)
- [docs/UNIX.md](docs/UNIX.md) — macOS and Linux

## Deployment (render bundle + dotter)

The repo is canonical; `distribution/` (gitignored by design — generated artifacts
don't belong in git) is the deployable bundle. Fresh machine sequence:
clone → `npm run deploy` → dotter deploy. Re-run `npm run deploy` after every
pull, otherwise dotter symlinks dangle:

```bash
npm run deploy -- --output distribution/opencode
# = render bundle + verify 27/27 {file:} refs resolve inside it
```

Dotter maps the bundle → `~/.config/opencode` (adjust the submodule path to
yours; re-render after pulling):

```toml
"editors/agents/agent-harness/distribution/opencode/opencode.json" = "~/.config/opencode/opencode.json"
"editors/agents/agent-harness/distribution/opencode/cli.json" = "~/.config/opencode/cli.json"
"editors/agents/agent-harness/distribution/opencode/themes" = "~/.config/opencode/themes"
"editors/agents/agent-harness/distribution/opencode/scripts" = "~/.config/opencode/scripts"
"editors/agents/agent-harness/distribution/opencode/prompts" = "~/.config/opencode/prompts"
"editors/agents/agent-harness/distribution/opencode/skills" = "~/.config/opencode/skills"
"editors/agents/agent-harness/distribution/opencode/commands" = "~/.config/opencode/commands"
"editors/agents/agent-harness/distribution/opencode/harness.config.json" = "~/.config/opencode/harness.config.json"
```

No-build alternative: symlink the source tree 1:1 instead, stripping the
`adapters/opencode/` prefix by hand (`opencode.json`, `cli.json`, `scripts/`,
`themes/` land at target root). The source tree contains the complete harness, so every `{file:}`
reference in the full bundle must resolve.

---

*arquitectura primero, evidencia siempre, y cero humo.*
