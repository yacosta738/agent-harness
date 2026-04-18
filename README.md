# OpenCode Agent Configuration

Custom agent configuration for [OpenCode](https://opencode.ai) — Cuban-style fullstack architect,
project management, and a full Spec-Driven Development (SDD) pipeline.

**136 skills · 21 commands · 14 MCP servers · 1 ecosystem reference**

---

## Architecture Overview

```
opencode.json
├── Agents
│   ├── kuko (primary)          — Fullstack architect, mentor, orchestrator
│   ├── linear-pm (subagent)    — Linear issue/sprint management
│   ├── kerrigan (all)          — SDD orchestrator (coordinates, never executes)
│   └── sdd-{phase} (subagent)  — 9 dedicated SDD phase executors
├── MCP Servers                  — External tool integrations
├── Permissions                  — Tiered access control
└── Skills                       — 136 reusable instruction sets in 14 groups
```

---

## Agents

### Kuko (Primary)

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

### SDD Kerrigan (Orchestrator)

Cuban-style SDD orchestrator. Coordinates the full Spec-Driven Development lifecycle by delegating
to dedicated sub-agents. Never executes phase work inline.

See [SDD Workflow](#sdd-workflow) below for details.

### SDD Phase Sub-Agents (9 executors)

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
| `sdd-verify`  | Quality gate — real test execution + spec compliance matrix |
| `sdd-archive` | Sync delta specs to main specs, move to archive             |

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
        └── verify-report.md
```

### Quality Gates

- No `apply` without proposal + spec + design + tasks
- No `archive` unless verify is PASS or PASS WITH WARNINGS (no CRITICAL issues)

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

136 skills organized in 14 groups. Each group maps to an ecosystem or practice area.

### `workflow/` — Development methodology (9)

Process skills that apply to any project or stack.

| Skill                       | When to load                                              |
|-----------------------------|-----------------------------------------------------------|
| `brainstorming`             | Before any creative work — features, components, behavior |
| `systematic-debugging`      | Debugging unknown or complex failures                     |
| `test-driven-development`   | Writing tests before implementation                       |
| `verification-before-completion` | Validating work before marking done                  |
| `writing-plans`             | Creating implementation plans                             |
| `writing-skills`            | Creating or editing OpenCode skills (TDD for docs)        |
| `dispatching-parallel-agents` | Running independent tasks concurrently                  |
| `receiving-code-review`     | Processing PR review feedback                             |
| `requesting-code-review`    | Preparing code for review                                 |

### `sdd/` — Spec-Driven Development (9 + shared)

```
sdd/
├── _shared/
│   ├── sdd-phase-common.md      ← Shared protocol (Sections A–D)
│   ├── persistence-contract.md
│   └── openspec-convention.md
├── sdd-init/    sdd-explore/    sdd-propose/
├── sdd-spec/    sdd-design/     sdd-tasks/
├── sdd-apply/   sdd-verify/     sdd-archive/
```

### `vercel/` — Vercel ecosystem (48)

Complete Vercel platform coverage. Ecosystem reference: `references/vercel-ecosystem.md`

**Core platform**

| Skill | Covers |
|---|---|
| `nextjs` | App Router, Server Components, Server Actions, Cache Components |
| `vercel-functions` | Serverless, Edge, Fluid Compute, streaming, Cron Jobs |
| `vercel-cli` | All CLI commands, MCP integration, marketplace discovery |
| `vercel-api` | REST API — projects, deployments, env vars, domains, logs |
| `deployments-cicd` | Deploy, promote, rollback, CI workflow files |
| `observability` | Web Analytics, Speed Insights, logs, Drains, OpenTelemetry |
| `vercel-storage` | Blob, Edge Config, Neon Postgres, Upstash Redis |
| `routing-middleware` | Request interception, rewrites, redirects — Edge/Node/Bun |
| `runtime-cache` | Per-region KV cache, tag-based invalidation |
| `env-vars` | .env files, `vercel env` commands, OIDC tokens |
| `turbopack` | Next.js bundler, HMR, config |
| `turborepo` | Monorepo orchestration, remote caching, `--affected` |

**AI / Agents**

| Skill | Covers |
|---|---|
| `ai-sdk` | AI SDK v6 — text/object generation, streaming, tool calling, MCP |
| `ai-gateway` | 100+ model routing, failover, cost tracking |
| `ai-elements` | Pre-built React components for AI interfaces |
| `ai-generation-persistence` | Persisting AI-generated content |
| `chat-sdk` | Slack, Telegram, Teams, Discord, Google Chat bots |
| `vercel-agent` | AI code review, incident investigation |
| `vercel-ai-architect` | Architecture decisions — AI SDK, providers, MCP, agents |
| `agent-browser` | Browser automation for dev server verification and testing |
| `agent-browser-verify` | Verifying browser agent output |
| `workflow` | Durable execution, DurableAgent, steps, pause/resume |
| `investigation-mode` | Systematic incident investigation workflow |
| `json-render` | AI chat response rendering — UIMessage parts, streaming states |
| `verification` | Output verification patterns |

**Infrastructure / Security**

| Skill | Covers |
|---|---|
| `vercel-firewall` | DDoS, WAF, rate limiting, bot filter |
| `vercel-flags` | Feature flags, Flags Explorer, A/B testing |
| `vercel-queues` | Durable event streaming, retries, delayed delivery |
| `vercel-sandbox` | Firecracker microVMs for untrusted/AI-generated code |
| `vercel-services` | Vercel service integrations |
| `sign-in-with-vercel` | OAuth 2.0/OIDC via Vercel accounts |
| `cron-jobs` | Cron job configuration and scheduling |

**Auth / Payments / Email / CMS**

| Skill | Covers |
|---|---|
| `auth` | Clerk, Descope, Auth0 with Next.js |
| `payments` | Stripe via Vercel Marketplace |
| `email` | Resend + React Email, domain verification |
| `cms` | Sanity, Contentful, DatoCMS, Storyblok, Builder.io |

**UI / Frontend**

| Skill | Covers |
|---|---|
| `shadcn` | shadcn/ui CLI, component installation, custom registries |
| `react-best-practices` | React patterns and anti-patterns |
| `swr` | Data fetching and revalidation |
| `satori` | OG image generation at the edge |
| `geist` | Geist font and design system |
| `geistdocs` | Geist documentation patterns |
| `v0-dev` | AI code generation, GitHub integration |

**Other**

`bootstrap` · `marketplace` · `micro` · `ncc` · `next-forge` · `web-perf` ·
`vercel-deployment-expert` · `vercel-performance-optimizer`

### `cloudflare/` — Cloudflare platform (8)

| Skill | Covers |
|---|---|
| `cloudflare` | Platform overview — Workers, Pages, KV, D1, R2 |
| `wrangler` | CLI — deploy, dev, KV, R2, D1, secrets |
| `workers-best-practices` | Streaming, floating promises, global state, observability |
| `durable-objects` | Stateful coordination, RPC, SQLite, WebSockets, alarms |
| `agents-sdk` | Stateful agents, Workflows, React hooks |
| `building-ai-agent-on-cloudflare` | End-to-end AI agent on Workers |
| `building-mcp-server-on-cloudflare` | Remote MCP server with OAuth |
| `sandbox-sdk` | Cloudflare sandboxed execution |

### `github/` — GitHub workflow (8)

| Skill | Covers |
|---|---|
| `github` | General triage, PR/issue orientation |
| `gh-address-comments` | Unresolved review threads, requested changes |
| `gh-fix-ci` | Failing GitHub Actions — log inspection, fix |
| `github-actions` | Workflow authoring, caching, matrix, secrets |
| `yeet` | Commit → push → draft PR flow |
| `pr-creator` | PR templates and standards |
| `pinned-tag` | Pin Actions to commit SHAs (security) |
| `coderabbit-review` | CodeRabbit AI review configuration |

### `ios/` — iOS / SwiftUI (6)

| Skill | Covers |
|---|---|
| `ios-app-intents` | App Intents framework |
| `ios-debugger-agent` | Xcode debugging, crash analysis |
| `swiftui-liquid-glass` | Liquid Glass material (iOS 26) |
| `swiftui-performance-audit` | SwiftUI rendering and performance |
| `swiftui-ui-patterns` | Reusable SwiftUI patterns and components |
| `swiftui-view-refactor` | View decomposition and refactoring |

### `macos/` — macOS native (11)

| Skill | Covers |
|---|---|
| `appkit-interop` | AppKit ↔ SwiftUI bridging |
| `build-run-debug` | Xcode build, run, debug workflow |
| `liquid-glass` | Liquid Glass material (macOS 26) |
| `packaging-notarization` | App packaging and Apple notarization |
| `signing-entitlements` | Code signing and entitlements |
| `swiftpm-macos` | Swift Package Manager for macOS |
| `swiftui-patterns` | macOS-specific SwiftUI patterns |
| `telemetry` | App telemetry and analytics |
| `test-triage` | Test failure diagnosis |
| `view-refactor` | macOS view decomposition |
| `window-management` | NSWindow, multi-window, scenes |

### `web/` — Web quality & standards (8)

| Skill | Covers |
|---|---|
| `accessibility` | WCAG 2.1 audit and fixes |
| `best-practices` | Security, compatibility, code quality |
| `core-web-vitals` | LCP, INP, CLS optimization |
| `frontend-design` | Production-grade UI, high design quality |
| `markdown-a11y` | Accessible documentation (GitHub guidelines) |
| `performance` | Load time, bundle size, lazy loading |
| `seo` | Meta tags, structured data, sitemaps |
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

| Theme          | Primary    | Secondary  | Accent     |
|----------------|------------|------------|------------|
| Aura Dark      | `#a277ff`  | `#61ffca`  | `#ffca85`  |
| Aura Dark Soft | `#8464c6`  | `#54c59f`  | `#c7a06f`  |

---

## File Structure

```
editors/agents/opencode/
├── opencode.json
├── README.md              ← This file
├── commands/              ← 21 slash commands
│   ├── sdd-*.md           ← SDD phase + meta commands (12)
│   ├── vercel-*.md        ← Vercel operations (5)
│   └── *.md               ← Standalone (4)
├── skills/                ← 136 skills in 14 groups
│   ├── ai/
│   ├── android/
│   ├── cloudflare/
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

Dotfiles are the source of truth. Sync to `~/.config/opencode/` manually or via symlink:

```bash
cp -r ~/Dev/dotfiles/editors/agents/opencode/ ~/.config/opencode/
```

---

*arquitectura primero, evidencia siempre, y cero humo.*
