# OpenCode Agent Configuration

Custom agent configuration for [OpenCode](https://opencode.ai) — Cuban-style fullstack architect,
project management, and a full Spec-Driven Development (SDD) pipeline.

**Skills auto-discovered from `skills/` · 32 commands · 213 local skill documents · MCP servers configured in `opencode.json` ·
ecosystem references in `references/`**

## Operating philosophy

This harness follows OpenCode-first Organic Driven Development (ODD): already-understood work stays
inline, fresh context is delegated only when useful, and formal SDD is selected explicitly rather
than inferred from size or risk. Substantial ODD work is tracked in `odd/tasks/` and mirrored to
Engram. Optional Receipt-Driven Development (RDD) reviews an immutable candidate but never authorizes
delivery.

Read the contracts first:

- [Agents](docs/agents.md) — 16 registered agents and Kerrigan's specialist profiles
- [ODD and routing](docs/odd-routing.md) — Direct, Delegated direct, and Explicit SDD
- [Review integration](docs/review-integration.md) — RDD lifecycle and boundaries
- [Organic RDD architecture](docs/architecture/organic-rdd.md)
- [Engram](docs/engram.md) — persistent memory behavior
- [Components, presets, and personas](docs/components.md)

Render the selected effective configuration with `node scripts/harness-config.mjs render` and check
it with `node scripts/harness-config.mjs check`.

---

## Architecture Overview

```
opencode.json
├── Agents
│   ├── kerrigan (all)          — Fullstack architect, mentor, SDD orchestrator
│   ├── linear-pm (subagent)    — Linear issue/sprint management
│   └── sdd-{phase} (subagent)  — 10 dedicated SDD phase executors
├── MCP Servers                  — External tool integrations
├── Permissions                  — Tiered access control
└── Skills                       — auto-discovered reusable instruction sets
```

---

## Agents

### Kerrigan (Primary)

Cuban fullstack architect (15+ years). Warm, direct, practical. Solves first, explains after.

- Answers simple questions directly — no unnecessary delegation
- Delegates complex work to specialized subagents
- TDD by default: failing test first, then implement, then refactor
- TypeScript: strongly typed, avoid `any`
- Challenges bad decisions with evidence and alternatives

**Subagents:** tech-lead, senior-dev, devops-engineer, qa-engineer, security-engineer,
product-manager, code-reviewer, performance-engineer, ux-designer, data-engineer

### Linear PM (Subagent)

Project management specialist for Linear workflows.

- Creates/updates issues with verb-first titles
- Sprint planning and velocity tracking
- Priorities: P0 (Critical) > P1 (High) > P2 (Medium) > P3 (Low)
- States: Backlog > Todo > In Progress > In Review > Done

### SDD Orchestration

Kerrigan also coordinates the full Spec-Driven Development lifecycle by delegating to dedicated
sub-agents. It never executes phase work inline.

Before acting, `kerrigan` selects one of three ODD routes: Direct inline, Delegated direct, or
Explicit SDD. Brainstorming, debugging, planning, and verification remain internal tools inside ODD;
they do not create a competing lane. SDD is admitted only after an explicit request or accepted
proposal naming the durable coordination problem it solves — never because of size, risk, ambiguity,
architecture, persistence, or file count.

See [SDD Workflow](#sdd-workflow) below for details.

### SDD Phase Sub-Agents (10 executors)

Each phase has a dedicated executor that reads its SKILL.md and the shared protocol:

| Agent         | Description                                                 |
|---------------|-------------------------------------------------------------|
| `sdd-init`    | Bootstrap openspec structure, detect tech stack             |
| `sdd-explore` | Investigate codebase, compare approaches                    |
| `sdd-propose` | Create change proposal with scope and rollback plan         |
| `sdd-spec`    | Write delta specs with Given/When/Then scenarios            |
| `sdd-design`  | Technical design with architecture decisions                |
| `sdd-tasks`   | Break down into phased implementation checklist             |
| `sdd-apply`   | Implement code (supports TDD RED-GREEN-REFACTOR)            |
| `sdd-verify`  | Quality gate — technical execution + spec compliance matrix |
| `sdd-qa`      | Capability-driven acceptance evidence and `qa-report.md`   |
| `sdd-archive` | Two-report gate, sync delta specs, move to archive         |

---

## SDD Workflow

### Phase DAG

```
init → explore → propose → [spec + design] → tasks → apply → verify → qa → archive
                                (parallel)
```

### SDD Commands

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
| `/sdd-verify`          | sdd-verify  | Validate technical conformance |
| `/sdd-qa`              | sdd-qa      | Run acceptance QA and persist evidence |
| `/sdd-archive`         | sdd-archive | Close the cycle after two-report gate |

**Meta-commands** (routed to kerrigan orchestrator):

| Command                | Description                       |
|------------------------|-----------------------------------|
| `/sdd-new <name>`      | explore + propose                 |
| `/sdd-ff <name>`       | propose + [spec + design] + tasks |
| `/sdd-continue [name]` | Resume next phase from state.yaml |

### Artifact Store

Mode: `openspec` (filesystem-based). Artifacts live in:

```
openspec/
├── config.yaml              ← Project config (stack, rules, TDD settings)
├── specs/                   ← Source of truth (main specs)
│   └── {domain}/spec.md
└── changes/
    ├── archive/             ← Completed (YYYY-MM-DD-{name}/)
    └── {change-name}/       ← Active change
        ├── state.yaml       ← DAG progress (managed by orchestrator)
        ├── exploration.md
        ├── proposal.md
        ├── specs/
        ├── design.md
        ├── tasks.md
        ├── verify-report.md
        └── qa-report.md
```

### Quality Gates

- No `apply` without proposal + spec + design + tasks
- `verify` owns technical conformance; `qa` owns observable user/operator acceptance
- QA verdicts are `PASS`, `PASS WITH WARNINGS`, `FAIL`, `BLOCKED`, or `NOT TESTED`; findings use `CRITICAL`, `P0`, `P1`, `P2`, or `P3`
- No `archive` unless both `verify-report.md` and `qa-report.md` exist, verification is PASS or PASS WITH WARNINGS, QA policy allows release, and no unresolved CRITICAL/P0/P1 findings remain
- Acceptance-relevant `BLOCKED`/`NOT TESTED` blocks archive; docs/config-only exceptions require explicit rationale and visible warning
- This repository has no application under test or general test runner: harness smoke checks cannot claim product acceptance; QA must record `NOT TESTED` or `BLOCKED` with evidence

### Deterministic quality runner and FSM (opt-in)

Projects can explicitly configure `openspec/quality-runner.json` (`quality-runner/v1`) and run:

```sh
node scripts/sdd-quality-runner.mjs run --project /path/to/project --json
node scripts/sdd-fsm.mjs transition --project /path/to/project --change change-name --to verify --idempotency-key request-1
```

The runner uses project-declared argv by default, requires a reasoned shell opt-in, isolates environment
variables, enforces project-root paths, timeouts, output/artifact limits, redaction, parser/exit policy,
and writes JSON plus human evidence under the configured run directory. It supports arbitrary stacks and
does not infer npm, pytest, or another familiar tool. Missing or disabled configuration is `UNAVAILABLE` or
`NOT TESTED`, never `PASS`.

The FSM validates the documented SDD graph, parallel spec/design completion, verify/QA/archive gates,
legacy state fields, revision/idempotency, lock ownership, and atomic state writes. Prompt flow remains a
visible `fallback` adapter when the standalone tools are disabled or unavailable; it is not deterministic
enforcement. No OpenCode plugin hooks are required by this first implementation.

---

## Commands

Commands in this repo follow **two explicit standards**. The difference is intentional:

### 1. Routed commands

These commands delegate work to a specific agent or sub-agent.

**Frontmatter standard**

```yaml
---
description: Short operational summary
agent: agent-name
subtask: true
---
```

**Use for:** SDD phase execution, orchestrated delegation, or any command that should route to a
specific agent instead of acting as a standalone prompt.

**Examples:** `sdd-init.md`, `sdd-apply.md`, `sdd-verify.md`

### 2. Standalone commands

These commands execute as a self-contained expert prompt or operational playbook. They do **not**
route to a specific agent.

**Frontmatter standard**

```yaml
---
description: Short operational summary
---
```

**Use for:** expert assistants, platform workflows, diagnostics, or step-by-step operational
guides.

**Examples:** `a11y-expert.md`, `vercel-deploy.md`, `vercel-status.md`

### Naming convention

- `sdd-*` → routed SDD pipeline commands
- `vercel-*` → standalone Vercel platform commands
- descriptive verb/task names → standalone specialist commands

This means the Vercel commands are **consistent by type** with `a11y-expert.md`, even though they
do not use the `agent` / `subtask` frontmatter used by the SDD routed commands.

```
commands/
├── SDD phase
│   ├── sdd-init.md
│   ├── sdd-explore.md
│   ├── sdd-propose.md
│   ├── sdd-spec.md
│   ├── sdd-design.md
│   ├── sdd-tasks.md
│   ├── sdd-apply.md
│   ├── sdd-verify.md
│   ├── sdd-qa.md
│   └── sdd-archive.md
├── SDD meta
│   ├── sdd-new.md
│   ├── sdd-ff.md
│   └── sdd-continue.md
├── Vercel
│   ├── vercel-deploy.md     ← Deploy with preflight, smoke test, observability check
│   ├── vercel-status.md     ← Project health diagnostic (deployments, domains, drains)
│   ├── vercel-env.md        ← Environment variable management
│   ├── vercel-bootstrap.md  ← Project linking, env provisioning, db setup
│   └── vercel-marketplace.md
└── Standalone
    ├── a11y-expert.md
    ├── build-and-run-macos-app.md
    ├── fix-codesign-error.md
    └── test-macos-app.md
```

---

## Skills

Skills are auto-discovered from `skills/**/SKILL.md`. Avoid treating the count below as a fixed
contract: this ecosystem grows frequently, so the filesystem is the source of truth. Each group maps
to an ecosystem or practice area.

### `workflow/` — Development methodology (10)

Process skills that apply to any project or stack.

| Skill                            | When to load                                              |
|----------------------------------|-----------------------------------------------------------|
| `brainstorming`                  | Before any creative work — features, components, behavior |
| `systematic-debugging`           | Debugging unknown or complex failures                     |
| `test-driven-development`        | Writing tests before implementation                       |
| `verification-before-completion` | Validating work before marking done                       |
| `writing-plans`                  | Creating implementation plans                             |
| `writing-skills`                 | Creating or editing OpenCode skills (TDD for docs)        |
| `dispatching-parallel-agents`    | Running independent tasks concurrently                    |
| `receiving-code-review`          | Processing PR review feedback                             |
| `requesting-code-review`         | Preparing code for review                                 |
| `git-worktrees`                  | Parallel branch work with safe Git worktree conventions   |

### `sdd/` — Spec-Driven Development (10 + shared)

```
sdd/
├── _shared/
│   ├── sdd-phase-common.md      ← Shared protocol (Sections A–D)
│   ├── persistence-contract.md
│   └── openspec-convention.md
├── sdd-init/    sdd-explore/    sdd-propose/
├── sdd-spec/    sdd-design/     sdd-tasks/
├── sdd-apply/   sdd-verify/     sdd-qa/     sdd-archive/
```

### `design/` — Design and visual systems (15)

| Skill | Covers |
|-------|--------|
| `brandkit` | Brand systems, identity decks, and visual-world presentations |
| `design-taste-frontend` | Anti-generic landing pages, portfolios, and redesigns |
| `diagram-design` | Pinned, offline-first diagram authoring, redraw, and export |
| `full-output-enforcement` | Complete, unabridged generated output |
| `gpt-taste` | Editorial frontend composition and GSAP motion direction |
| `high-end-visual-design` | Premium visual hierarchy, typography, and surface treatment |
| `image-to-code` | Image-directed frontend implementation |
| `imagegen-frontend-mobile` | Premium mobile screen visual direction |
| `imagegen-frontend-web` | Section-specific web visual direction |
| `impeccable` | Frontend design critique, refinement, and bounded browser iteration |
| `industrial-brutalist-ui` | Swiss/terminal-inspired data-heavy interface direction |
| `minimalist-ui` | Warm monochrome editorial interface direction |
| `open-pencil` | Figma/OpenPencil inspection, export, and editing |
| `redesign-existing-projects` | Premium upgrades for existing websites and apps |
| `stitch-design-taste` | Google Stitch design-system guidance |

#### `diagram-design` integration

- **Local skill:** `skills/design/diagram-design/SKILL.md`.
- **Pinned provenance:** canonical upstream `https://github.com/cathrynlavery/diagram-design`,
  commit `a5e3978088cf89c7caff5c20cabd99fbc2a301de`, upstream release `2.3.5`, upstream subtree
  `skills/diagram-design/`, and local snapshot path `skills/design/diagram-design/`. The skill
  frontmatter metadata version is `2.3`.
- **Visual capability:** 27 visual types — architecture, IT current-state, flowchart, sequence,
  state machine, ER/data model, timeline, swimlane, quadrant, radar/spider, loop/flywheel, nested,
  tree, org chart, layer stack, Venn, pyramid/funnel, bar, line, Gantt, scatter, high-level,
  process, medallion, data flow, DP integration, and DP security matrix.
- **Semantic patterns and import/export:** use `references/semantic-patterns.md` before a
  behavior-led layout; draw.io and Mermaid imports use the local extractor references and treat
  source as untrusted data; export follows `references/export.md` and `references/output-spec.md`
  for HTML, SVG, PNG, or HTML+PNG output.
- **Required local resources:** the complete relative `references/**`, `scripts/**`, and `assets/**`
  trees, plus `PROVENANCE.md`, `LICENSE`, `THIRD-PARTY-NOTICES.md`, and
  `SNAPSHOT-MANIFEST.sha256`. Do not copy only `SKILL.md` or resolve these resources remotely.
- **Native command adapters:** `/diagram-export`, `/diagram-import-drawio`, and
  `/diagram-import-mermaid`; each command documents its `$ARGUMENTS`, safe output contract,
  fidelity/status fields, and no-write-on-validation-failure behavior.
- **Safe/offline boundary:** local paths only; labels, URLs, directives, click targets, scripts, and
  embedded markup are data, never instructions. No shell evaluation, implicit fetch, runtime refresh,
  package installation, browser download, or remote renderer is permitted.
- **Optional tooling:** Python 3 and the standard library support the local extractors and self-check.
  PNG output additionally requires the Python Playwright module and a launchable local Chromium;
  missing capabilities are reported as `UNAVAILABLE` or `BLOCKED`, never substituted or installed.
- **Plugin decision:** the upstream repository is deliberately **not** added as an `opencode.json`
  plugin URL because no verified OpenCode plugin contract exists; the checked-in Agent Skill snapshot
  is the reproducible discovery path.
- **Validation boundary:** this configuration repository has no general test runner. Use deterministic
  path/frontmatter/link/hash/docs checks and the packaged Python smoke checks; do not claim
  RED→GREEN→REFACTOR, product acceptance, or runtime acceptance from these checks.

### `vercel/` — Vercel ecosystem (48)

Complete Vercel platform coverage. Ecosystem reference: `references/vercel-ecosystem.md`

**Core platform**

| Skill                | Covers                                                          |
|----------------------|-----------------------------------------------------------------|
| `nextjs`             | App Router, Server Components, Server Actions, Cache Components |
| `vercel-functions`   | Serverless, Edge, Fluid Compute, streaming, Cron Jobs           |
| `vercel-cli`         | All CLI commands, MCP integration, marketplace discovery        |
| `vercel-api`         | REST API — projects, deployments, env vars, domains, logs       |
| `deployments-cicd`   | Deploy, promote, rollback, CI workflow files                    |
| `observability`      | Web Analytics, Speed Insights, logs, Drains, OpenTelemetry      |
| `vercel-storage`     | Blob, Edge Config, Neon Postgres, Upstash Redis                 |
| `routing-middleware` | Request interception, rewrites, redirects — Edge/Node/Bun       |
| `runtime-cache`      | Per-region KV cache, tag-based invalidation                     |
| `env-vars`           | .env files, `vercel env` commands, OIDC tokens                  |
| `turbopack`          | Next.js bundler, HMR, config                                    |
| `turborepo`          | Monorepo orchestration, remote caching, `--affected`            |

**AI / Agents**

| Skill                       | Covers                                                           |
|-----------------------------|------------------------------------------------------------------|
| `ai-sdk`                    | AI SDK v6 — text/object generation, streaming, tool calling, MCP |
| `ai-gateway`                | 100+ model routing, failover, cost tracking                      |
| `ai-elements`               | Pre-built React components for AI interfaces                     |
| `ai-generation-persistence` | Persisting AI-generated content                                  |
| `chat-sdk`                  | Slack, Telegram, Teams, Discord, Google Chat bots                |
| `vercel-agent`              | AI code review, incident investigation                           |
| `vercel-ai-architect`       | Architecture decisions — AI SDK, providers, MCP, agents          |
| `agent-browser`             | Browser automation for dev server verification and testing       |
| `agent-browser-verify`      | Verifying browser agent output                                   |
| `workflow`                  | Durable execution, DurableAgent, steps, pause/resume             |
| `investigation-mode`        | Systematic incident investigation workflow                       |
| `json-render`               | AI chat response rendering — UIMessage parts, streaming states   |
| `verification`              | Output verification patterns                                     |

**Infrastructure / Security**

| Skill                 | Covers                                               |
|-----------------------|------------------------------------------------------|
| `vercel-firewall`     | DDoS, WAF, rate limiting, bot filter                 |
| `vercel-flags`        | Feature flags, Flags Explorer, A/B testing           |
| `vercel-queues`       | Durable event streaming, retries, delayed delivery   |
| `vercel-sandbox`      | Firecracker microVMs for untrusted/AI-generated code |
| `vercel-services`     | Vercel service integrations                          |
| `sign-in-with-vercel` | OAuth 2.0/OIDC via Vercel accounts                   |
| `cron-jobs`           | Cron job configuration and scheduling                |

**Auth / Payments / Email / CMS**

| Skill      | Covers                                             |
|------------|----------------------------------------------------|
| `auth`     | Clerk, Descope, Auth0 with Next.js                 |
| `payments` | Stripe via Vercel Marketplace                      |
| `email`    | Resend + React Email, domain verification          |
| `cms`      | Sanity, Contentful, DatoCMS, Storyblok, Builder.io |

**UI / Frontend**

| Skill                  | Covers                                                   |
|------------------------|----------------------------------------------------------|
| `shadcn`               | shadcn/ui CLI, component installation, custom registries |
| `react-best-practices` | React patterns and anti-patterns                         |
| `swr`                  | Data fetching and revalidation                           |
| `satori`               | OG image generation at the edge                          |
| `geist`                | Geist font and design system                             |
| `geistdocs`            | Geist documentation patterns                             |
| `v0-dev`               | AI code generation, GitHub integration                   |

**Other**

`bootstrap` · `marketplace` · `micro` · `ncc` · `next-forge` · `web-perf` ·
`vercel-deployment-expert` · `vercel-performance-optimizer`

### `cloudflare/` — Cloudflare platform (8)

| Skill                               | Covers                                                    |
|-------------------------------------|-----------------------------------------------------------|
| `cloudflare`                        | Platform overview — Workers, Pages, KV, D1, R2            |
| `wrangler`                          | CLI — deploy, dev, KV, R2, D1, secrets                    |
| `workers-best-practices`            | Streaming, floating promises, global state, observability |
| `durable-objects`                   | Stateful coordination, RPC, SQLite, WebSockets, alarms    |
| `agents-sdk`                        | Stateful agents, Workflows, React hooks                   |
| `building-ai-agent-on-cloudflare`   | End-to-end AI agent on Workers                            |
| `building-mcp-server-on-cloudflare` | Remote MCP server with OAuth                              |
| `sandbox-sdk`                       | Cloudflare sandboxed execution                            |

### `github/` — GitHub workflow (9)

| Skill                 | Covers                                       |
|-----------------------|----------------------------------------------|
| `github`              | General triage, PR/issue orientation         |
| `gh-address-comments` | Unresolved review threads, requested changes |
| `gh-fix-ci`           | Failing GitHub Actions — log inspection, fix |
| `github-actions`      | Workflow authoring, caching, matrix, secrets |
| `yeet`                | Commit → push → draft PR flow                |
| `pr-creator`          | PR templates and standards                   |
| `github-stacked-prs`  | Official `gh stack` layers, sync, and merge  |
| `pinned-tag`          | Pin Actions to commit SHAs (security)        |
| `coderabbit-review`   | CodeRabbit AI review configuration           |

### `ios/` — iOS / SwiftUI (6)

| Skill                       | Covers                                   |
|-----------------------------|------------------------------------------|
| `ios-app-intents`           | App Intents framework                    |
| `ios-debugger-agent`        | Xcode debugging, crash analysis          |
| `swiftui-liquid-glass`      | Liquid Glass material (iOS 26)           |
| `swiftui-performance-audit` | SwiftUI rendering and performance        |
| `swiftui-ui-patterns`       | Reusable SwiftUI patterns and components |
| `swiftui-view-refactor`     | View decomposition and refactoring       |

### `macos/` — macOS native (11)

| Skill                    | Covers                               |
|--------------------------|--------------------------------------|
| `appkit-interop`         | AppKit ↔ SwiftUI bridging            |
| `build-run-debug`        | Xcode build, run, debug workflow     |
| `liquid-glass`           | Liquid Glass material (macOS 26)     |
| `packaging-notarization` | App packaging and Apple notarization |
| `signing-entitlements`   | Code signing and entitlements        |
| `swiftpm-macos`          | Swift Package Manager for macOS      |
| `swiftui-patterns`       | macOS-specific SwiftUI patterns      |
| `telemetry`              | App telemetry and analytics          |
| `test-triage`            | Test failure diagnosis               |
| `view-refactor`          | macOS view decomposition             |
| `window-management`      | NSWindow, multi-window, scenes       |

### `web/` — Web quality & standards (8)

| Skill               | Covers                                              |
|---------------------|-----------------------------------------------------|
| `accessibility`     | WCAG 2.1 audit and fixes                            |
| `best-practices`    | Security, compatibility, code quality               |
| `core-web-vitals`   | LCP, INP, CLS optimization                          |
| `frontend-design`   | Production-grade UI, high design quality            |
| `markdown-a11y`     | Accessible documentation (GitHub guidelines)        |
| `performance`       | Load time, bundle size, lazy loading                |
| `seo`               | Meta tags, structured data, sitemaps                |
| `web-quality-audit` | Lighthouse — performance, a11y, SEO, best practices |

### `notion/` — Notion workflows (4)

`notion-knowledge-capture` · `notion-meeting-intelligence` ·
`notion-research-documentation` · `notion-spec-to-implementation`

### `obsidian/` — Obsidian vault (5)

`defuddle` · `json-canvas` · `obsidian-bases` · `obsidian-cli` · `obsidian-markdown`

### `devops/` — Infrastructure tooling (4)

`docker-expert` · `grafana-dashboards` · `makefile` · `sql-optimization-patterns`

### `tools/` — External tools (4)

`linear` · `sentry` · `webapp-testing` · `jules-cli`

### `ai/` — AI tooling (2)

`ai-sdk` (also in vercel/) · `hugging-face`

### `android/` — Android (1)

`android-emulator-qa` — Emulator QA with Python scripts for UI tree analysis

---

## GitHub Stacked PRs

Use `github-stacked-prs` only for the official GitHub Stack model. GitHub Stacked PRs
(`github/gh-stack`) is a public-preview feature subject to change, so safe stops and inspection
gates are mandatory. The canonical strategy values are
`github-stacked-prs`, `feature-branch-chain`, `single-pr`, and `size-exception`; `feature-branch-chain`
remains a separate tracker/integration-branch workflow. The bottom Stack PR targets the trunk and
each higher PR targets the immediately lower branch. GitHub/Git own Stack state; issue and Linear
links are metadata only.

The skill detects prerequisites without changing the machine. If GitHub CLI or `github/gh-stack` is
missing, follow the printed manual commands:

```bash
brew install gh
# or install GitHub CLI using https://cli.github.com/
gh extension install github/gh-stack
# optional official agent guidance:
gh skill install github/gh-stack
```

It never installs extensions or skills automatically. Do not use the ambiguous legacy values
`stacked-prs` or `stacked-to-main` as strategy values; regenerate SDD tasks instead.

## References

```
references/
└── vercel-ecosystem.md   ← Vercel relational knowledge graph (March 2026)
                            Maps every product, library, CLI, and service
```

---

## MCP Servers

| Server          | Status   | Purpose                            |
|-----------------|----------|------------------------------------|
| Context7        | Enabled  | Up-to-date library documentation   |
| GitHub Grep     | Enabled  | Search code across GitHub repos    |
| Chrome DevTools | Enabled  | Browser automation and debugging   |
| Playwright      | Enabled  | Browser testing                    |
| Semgrep         | Enabled  | Static analysis and security scans |
| JetBrains       | Enabled  | IDE integration                    |
| GitHub          | Disabled | GitHub Copilot API                 |
| Cloudflare API  | Disabled | Cloudflare MCP and platform APIs   |
| Ahrefs          | Disabled | SEO analysis                       |
| Magic Patterns  | Disabled | Design patterns                    |
| Stitch          | Disabled | Google Stitch API                  |
| Linear          | Disabled | Linear project management          |
| Notion          | Disabled | Notion API                         |
| SonarQube       | Disabled | Code quality analysis              |
| MarkItDown      | Disabled | Document conversion                |

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

## Themes

| Theme          | Primary   | Secondary | Accent    |
|----------------|-----------|-----------|-----------|
| Aura Dark      | `#a277ff` | `#61ffca` | `#ffca85` |
| Aura Dark Soft | `#8464c6` | `#54c59f` | `#c7a06f` |

---

## File Structure

```
editors/agents/opencode/
├── opencode.json
├── README.md              ← This file
├── commands/              ← 32 slash commands
│   ├── sdd-*.md           ← SDD phase + meta commands (13)
│   ├── diagram-*.md       ← Diagram Design export/import adapters (3)
│   ├── vercel-*.md        ← Vercel operations (5)
│   └── *.md               ← Other standalone/workflow commands (11)
├── skills/                ← auto-discovered skills grouped by ecosystem/practice
│   ├── ai/
│   ├── android/
│   ├── cloudflare/
│   ├── design/            ← visual design and diagram skills (15)
│   ├── devops/
│   ├── github/
│   ├── ios/
│   ├── macos/
│   ├── notion/
│   ├── obsidian/
│   ├── sdd/
│   ├── tools/
│   ├── vercel/
│   ├── web/
│   └── workflow/
├── references/
│   └── vercel-ecosystem.md
├── themes/
│   ├── aura-dark.json
│   ├── aura-dark-soft.json
│   └── base.json
└── tui.json
```

---

## Deployment

Keep this repository as the canonical source and render a bundle for OpenCode. Then link the generated bundle into the local OpenCode config directory:

```bash
# from the repo root
node scripts/harness-config.mjs render --adapter opencode --output dist/opencode
node scripts/harness-config.mjs link --adapter opencode --target ~/.config/opencode
```

If `~/.config/opencode` already contains a different setup, move it aside manually before retrying the link. The repo must stay portable and the generated bundle remains in `dist/opencode`, not as a tracked source path.

---

*arquitectura primero, evidencia siempre, y cero humo.*
