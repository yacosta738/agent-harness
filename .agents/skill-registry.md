# SDD Skill Registry

Generated during SDD initialization for `agent-harness` on 2026-08-07.

## Scan Summary

- **Project**: `/Users/acosta/Dev/agent-swarm/agent-harness`
- **Project skill root**: `skills/**/SKILL.md`
- **User skill roots consulted**: `~/.config/opencode/skills/**/SKILL.md`, `~/.claude/skills/**/SKILL.md`
- **Deduplication**: project skills are listed as the repository source of truth; user-installed SDD guidance is used by the executor prompt.
- **Excluded from this registry**: `sdd-*` entries are documented in the SDD configuration and phase prompts; `_shared` protocol files are not task skills.
- **Indexed skills**: 203 non-SDD project skill documents.
- **Registry contract**: this file is an index and compact routing guide; each exact `SKILL.md` remains the source of truth.
- **Persistence**: OpenSpec filesystem artifacts; Engram MCP is configured in `opencode.json`.

## Existing SDD Setup

- `opencode.json` defines the `kerrigan` orchestrator and dedicated hidden `sdd-{phase}` executors for init, explore, propose, spec, design, tasks, apply, verify, qa, and archive.
- `commands/sdd-*.md` route phase commands to the matching executors, including `sdd-qa` and its `qa-report.md` handoff.
- `prompts/sdd/*.md` contain the current executor contracts, including the review workload guard and skill-resolution reporting.
- `skills/sdd/` contains all phase skills, including capability-driven `sdd-qa`, plus shared OpenSpec, persistence, and skill-resolver protocols.
- No prior `.atl/skill-registry.md` or `openspec/` structure existed in this checkout.

## Compact Rules

- OpenSpec is the canonical SDD artifact store; do not create placeholder specs during init.
- Preserve existing repository files and unrelated working-tree changes; initialization creates only bootstrap artifacts.
- This repository is an OpenCode configuration harness, not an application package: use the JSON/Markdown/Bash/Node conventions already present.
- Strict TDD is **disabled** because no executable test runner or test suite is configured in the repository. QA integration records this limitation and must not claim product acceptance without an application under test.
- Use the exact phase contracts in `prompts/sdd/` and the shared protocols in `skills/sdd/_shared/`.
- `sdd-tasks` must include the review workload forecast and exact plain-text guard lines before apply.
- `sdd-apply` must not claim RED→GREEN→REFACTOR evidence while no test runner exists; report the limitation and use focused manual checks where appropriate.
- Keep work units coherent; if a planned change may exceed 400 changed lines, choose a canonical chained-PR or approved exception strategy before apply.
- The opt-in `quality-runner/v1` manifest and standalone SDD FSM are deterministic evidence/state adapters; absent tools are visible `fallback`/`UNAVAILABLE`/`NOT TESTED`, never an inferred pass.
- For OpenCode configuration changes, preserve existing agent permissions, MCP enablement, and self-contained relative file references unless a proposal explicitly changes them.

## Relevant Skills

- `skills/sdd/sdd-init/SKILL.md`
- `skills/sdd/sdd-qa/SKILL.md`
- `skills/sdd/_shared/sdd-phase-common.md`
- `skills/sdd/_shared/openspec-convention.md`
- `skills/sdd/_shared/persistence-contract.md`
- `skills/sdd/_shared/skill-resolver.md`
- `skills/workflow/reviewable-pr-slices/SKILL.md`
- `skills/workflow/work-unit-commits/SKILL.md`
- `skills/workflow/test-driven-development/SKILL.md`
- `skills/workflow/verification-before-completion/SKILL.md`
- `skills/workflow/writing-skills/SKILL.md`
- `skills/languages/typescript/SKILL.md`
- `skills/languages/rust/ratatui-tui/SKILL.md`
- `skills/github/github-actions/SKILL.md`
- `skills/github/github-stacked-prs/SKILL.md`
- `skills/github/pr-creator/SKILL.md`
- `skills/github/yeet/SKILL.md`
- `skills/tools/webapp-testing/SKILL.md`
- `skills/macos/build-run-debug/SKILL.md`
- `skills/macos/test-triage/SKILL.md`

## Full Inventory

The repository currently contains 213 tracked `skills/**/SKILL.md` files. The 10 SDD phase skill
files are covered by the SDD setup above; the remaining 203 reusable project skills are indexed by
their exact paths below.

## Diagram Design Integration

- **Skill path:** `skills/design/diagram-design/SKILL.md`; required local resources are its complete
  `references/**`, `scripts/**`, and `assets/**` trees plus `PROVENANCE.md`, `LICENSE`,
  `THIRD-PARTY-NOTICES.md`, and `SNAPSHOT-MANIFEST.sha256`.
- **Pin/provenance:** upstream URL `https://github.com/cathrynlavery/diagram-design`, commit
  `a5e3978088cf89c7caff5c20cabd99fbc2a301de`, upstream version `2.3.5`, upstream skill subpath
  `skills/diagram-design/`, local path `skills/design/diagram-design/`; frontmatter metadata is
  version `2.3`.
- **Capability:** 27 visual types, semantic patterns, local Mermaid/draw.io extraction, and
  HTML/SVG/PNG/HTML+PNG export. The complete type and pattern references remain relative to the
  pinned skill and are not copied from upstream README or marketplace manifests.
- **Command adapters:** `/diagram-export`, `/diagram-import-drawio`, and `/diagram-import-mermaid`.
  Each has an explicit `$ARGUMENTS` contract, safe output path validation, stable status/error
  fields, and a fidelity ledger for imports.
- **Safe/offline boundary:** local checked-in resources only; no shell evaluation, remote URLs,
  implicit execution, fetch, refresh, install, browser download, or source mutation. The upstream
  repository is intentionally not an `opencode.json` plugin URL because no verified OpenCode plugin
  contract exists.
- **Optional tooling:** Python 3 standard-library scripts handle extraction/self-check. PNG and
  HTML+PNG additionally require Python Playwright and launchable local Chromium; missing tools are
  `UNAVAILABLE`/`BLOCKED`, with no installation or format substitution.
- **Validation/no-TDD boundary:** no repository test runner or suite exists. Validate paths,
  frontmatter, relative links, pin/manifest/docs consistency, unchanged `opencode.json`, and
  packaged Python smoke checks; record manual/static evidence only and make no RED→GREEN→REFACTOR
  or product-acceptance claim.

### AI

- `skills/ai/ai-sdk/SKILL.md`
- `skills/ai/hugging-face/cli/SKILL.md`
- `skills/ai/hugging-face/community-evals/SKILL.md`
- `skills/ai/hugging-face/datasets/SKILL.md`
- `skills/ai/hugging-face/gradio/SKILL.md`
- `skills/ai/hugging-face/jobs/SKILL.md`
- `skills/ai/hugging-face/llm-trainer/SKILL.md`
- `skills/ai/hugging-face/paper-publisher/SKILL.md`
- `skills/ai/hugging-face/papers/SKILL.md`
- `skills/ai/hugging-face/trackio/SKILL.md`
- `skills/ai/hugging-face/transformers.js/SKILL.md`
- `skills/ai/hugging-face/vision-trainer/SKILL.md`

### Android

- `skills/android/android-emulator-qa/SKILL.md`

### Cloudflare

- `skills/cloudflare/agents-sdk/SKILL.md`
- `skills/cloudflare/building-ai-agent-on-cloudflare/SKILL.md`
- `skills/cloudflare/building-mcp-server-on-cloudflare/SKILL.md`
- `skills/cloudflare/cloudflare/SKILL.md`
- `skills/cloudflare/durable-objects/SKILL.md`
- `skills/cloudflare/sandbox-sdk/SKILL.md`
- `skills/cloudflare/workers-best-practices/SKILL.md`
- `skills/cloudflare/wrangler/SKILL.md`

### Design Patterns

- `skills/design-pattern/abstract-factory/SKILL.md`
- `skills/design-pattern/adapter/SKILL.md`
- `skills/design-pattern/bridge/SKILL.md`
- `skills/design-pattern/builder/SKILL.md`
- `skills/design-pattern/chain-of-responsibility/SKILL.md`
- `skills/design-pattern/command/SKILL.md`
- `skills/design-pattern/composite/SKILL.md`
- `skills/design-pattern/decorator/SKILL.md`
- `skills/design-pattern/facade/SKILL.md`
- `skills/design-pattern/factory-method/SKILL.md`
- `skills/design-pattern/flyweight/SKILL.md`
- `skills/design-pattern/iterator/SKILL.md`
- `skills/design-pattern/mediator/SKILL.md`
- `skills/design-pattern/memento/SKILL.md`
- `skills/design-pattern/observer/SKILL.md`
- `skills/design-pattern/prototype/SKILL.md`
- `skills/design-pattern/proxy/SKILL.md`
- `skills/design-pattern/singleton/SKILL.md`
- `skills/design-pattern/state/SKILL.md`
- `skills/design-pattern/strategy/SKILL.md`
- `skills/design-pattern/template-method/SKILL.md`
- `skills/design-pattern/visitor/SKILL.md`

### DevOps

- `skills/devops/docker-expert/SKILL.md`
- `skills/devops/grafana-dashboards/SKILL.md`
- `skills/devops/makefile/SKILL.md`
- `skills/devops/sql-optimization-patterns/SKILL.md`

### Design

- `skills/design/brandkit/SKILL.md`
- `skills/design/design-taste-frontend/SKILL.md`
- `skills/design/diagram-design/SKILL.md` — pinned upstream `cathrynlavery/diagram-design` v2.3.5,
  commit `a5e3978088cf89c7caff5c20cabd99fbc2a301de`; local path and frontmatter name are both
  `diagram-design`.
- `skills/design/full-output-enforcement/SKILL.md`
- `skills/design/gpt-taste/SKILL.md`
- `skills/design/high-end-visual-design/SKILL.md`
- `skills/design/image-to-code/SKILL.md`
- `skills/design/imagegen-frontend-mobile/SKILL.md`
- `skills/design/imagegen-frontend-web/SKILL.md`
- `skills/design/impeccable/SKILL.md`
- `skills/design/industrial-brutalist-ui/SKILL.md`
- `skills/design/minimalist-ui/SKILL.md`
- `skills/design/open-pencil/SKILL.md`
- `skills/design/redesign-existing-projects/SKILL.md`
- `skills/design/stitch-design-taste/SKILL.md`

### GitHub

- `skills/github/coderabbit-review/SKILL.md`
- `skills/github/gh-address-comments/SKILL.md`
- `skills/github/gh-fix-ci/SKILL.md`
- `skills/github/github-actions/SKILL.md`
- `skills/github/github-stacked-prs/SKILL.md`
- `skills/github/github/SKILL.md`
- `skills/github/pinned-tag/SKILL.md`
- `skills/github/pr-creator/SKILL.md`
- `skills/github/yeet/SKILL.md`

### iOS

- `skills/ios/ios-app-intents/SKILL.md`
- `skills/ios/ios-debugger-agent/SKILL.md`
- `skills/ios/swiftui-liquid-glass/SKILL.md`
- `skills/ios/swiftui-performance-audit/SKILL.md`
- `skills/ios/swiftui-ui-patterns/SKILL.md`
- `skills/ios/swiftui-view-refactor/SKILL.md`

### Languages

- `skills/languages/rust/ratatui-tui/SKILL.md`
- `skills/languages/typescript/SKILL.md`

### macOS

- `skills/macos/appkit-interop/SKILL.md`
- `skills/macos/build-run-debug/SKILL.md`
- `skills/macos/liquid-glass/SKILL.md`
- `skills/macos/packaging-notarization/SKILL.md`
- `skills/macos/signing-entitlements/SKILL.md`
- `skills/macos/swiftpm-macos/SKILL.md`
- `skills/macos/swiftui-patterns/SKILL.md`
- `skills/macos/telemetry/SKILL.md`
- `skills/macos/test-triage/SKILL.md`
- `skills/macos/view-refactor/SKILL.md`
- `skills/macos/window-management/SKILL.md`

### Notion

- `skills/notion/notion-knowledge-capture/SKILL.md`
- `skills/notion/notion-meeting-intelligence/SKILL.md`
- `skills/notion/notion-research-documentation/SKILL.md`
- `skills/notion/notion-spec-to-implementation/SKILL.md`

### Obsidian

- `skills/obsidian/defuddle/SKILL.md`
- `skills/obsidian/json-canvas/SKILL.md`
- `skills/obsidian/obsidian-bases/SKILL.md`
- `skills/obsidian/obsidian-cli/SKILL.md`
- `skills/obsidian/obsidian-markdown/SKILL.md`

### Personal / Ponytail

- `skills/personal/haci/SKILL.md`
- `skills/personal/image/imagegen/SKILL.md`
- `skills/personal/yuniel-writing-style/SKILL.md`
- `skills/ponytail/SKILL.md`
- `skills/ponytail-audit/SKILL.md`
- `skills/ponytail-debt/SKILL.md`
- `skills/ponytail-help/SKILL.md`
- `skills/ponytail-review/SKILL.md`

### Security

- `skills/security/finding-discovery/SKILL.md`
- `skills/security/fix-finding/SKILL.md`
- `skills/security/threat-model/SKILL.md`
- `skills/security/triage-finding/SKILL.md`

### Tools

- `skills/tools/bazel-build-optimization/SKILL.md`
- `skills/tools/jules-cli/SKILL.md`
- `skills/tools/linear/SKILL.md`
- `skills/tools/portless/SKILL.md`
- `skills/tools/sentry/SKILL.md`
- `skills/tools/sonarqube-mcp/SKILL.md`
- `skills/tools/webapp-testing/SKILL.md`

### Vercel

- `skills/vercel/agent-browser/SKILL.md`
- `skills/vercel/agent-browser-verify/SKILL.md`
- `skills/vercel/ai-elements/SKILL.md`
- `skills/vercel/ai-gateway/SKILL.md`
- `skills/vercel/ai-generation-persistence/SKILL.md`
- `skills/vercel/auth/SKILL.md`
- `skills/vercel/bootstrap/SKILL.md`
- `skills/vercel/chat-sdk/SKILL.md`
- `skills/vercel/cms/SKILL.md`
- `skills/vercel/cron-jobs/SKILL.md`
- `skills/vercel/deployments-cicd/SKILL.md`
- `skills/vercel/email/SKILL.md`
- `skills/vercel/env-vars/SKILL.md`
- `skills/vercel/investigation-mode/SKILL.md`
- `skills/vercel/json-render/SKILL.md`
- `skills/vercel/marketplace/SKILL.md`
- `skills/vercel/micro/SKILL.md`
- `skills/vercel/ncc/SKILL.md`
- `skills/vercel/next-forge/SKILL.md`
- `skills/vercel/nextjs/SKILL.md`
- `skills/vercel/observability/SKILL.md`
- `skills/vercel/payments/SKILL.md`
- `skills/vercel/react-best-practices/SKILL.md`
- `skills/vercel/routing-middleware/SKILL.md`
- `skills/vercel/runtime-cache/SKILL.md`
- `skills/vercel/satori/SKILL.md`
- `skills/vercel/shadcn/SKILL.md`
- `skills/vercel/sign-in-with-vercel/SKILL.md`
- `skills/vercel/swr/SKILL.md`
- `skills/vercel/turbopack/SKILL.md`
- `skills/vercel/turborepo/SKILL.md`
- `skills/vercel/v0-dev/SKILL.md`
- `skills/vercel/vercel-agent/SKILL.md`
- `skills/vercel/vercel-ai-architect/SKILL.md`
- `skills/vercel/vercel-api/SKILL.md`
- `skills/vercel/vercel-cli/SKILL.md`
- `skills/vercel/vercel-deployment-expert/SKILL.md`
- `skills/vercel/vercel-firewall/SKILL.md`
- `skills/vercel/vercel-flags/SKILL.md`
- `skills/vercel/vercel-functions/SKILL.md`
- `skills/vercel/vercel-performance-optimizer/SKILL.md`
- `skills/vercel/vercel-queues/SKILL.md`
- `skills/vercel/vercel-sandbox/SKILL.md`
- `skills/vercel/vercel-services/SKILL.md`
- `skills/vercel/vercel-storage/SKILL.md`
- `skills/vercel/verification/SKILL.md`
- `skills/vercel/web-perf/SKILL.md`
- `skills/vercel/workflow/SKILL.md`

### Web

- `skills/web/accessibility/SKILL.md`
- `skills/web/animate-text/SKILL.md`
- `skills/web/best-practices/SKILL.md`
- `skills/web/chrome-extensions/SKILL.md`
- `skills/web/core-web-vitals/SKILL.md`
- `skills/web/frontend-design/SKILL.md`
- `skills/web/markdown-a11y/SKILL.md`
- `skills/web/modern-web-guidance/SKILL.md`
- `skills/web/nothing-design/SKILL.md`
- `skills/web/performance/SKILL.md`
- `skills/web/seo/SKILL.md`
- `skills/web/web-quality-audit/SKILL.md`

### Workflow

- `skills/workflow/async-collaboration-comments/SKILL.md`
- `skills/workflow/brainstorming/SKILL.md`
- `skills/workflow/codebase-architecture/SKILL.md`
- `skills/workflow/cognitive-doc-design/SKILL.md`
- `skills/workflow/dispatching-parallel-agents/SKILL.md`
- `skills/workflow/domain-language/SKILL.md`
- `skills/workflow/double-blind-review/SKILL.md`
- `skills/workflow/four-r-review/SKILL.md`
- `skills/workflow/git-worktrees/SKILL.md`
- `skills/workflow/goal/SKILL.md`
- `skills/workflow/grill-me/SKILL.md`
- `skills/workflow/issue-triage/SKILL.md`
- `skills/workflow/loop/SKILL.md`
- `skills/workflow/qa-session/SKILL.md`
- `skills/workflow/receiving-code-review/SKILL.md`
- `skills/workflow/requesting-code-review/SKILL.md`
- `skills/workflow/reviewable-pr-slices/SKILL.md`
- `skills/workflow/systematic-debugging/SKILL.md`
- `skills/workflow/test-driven-development/SKILL.md`
- `skills/workflow/to-issues/SKILL.md`
- `skills/workflow/verification-before-completion/SKILL.md`
- `skills/workflow/work-unit-commits/SKILL.md`
- `skills/workflow/writing-plans/SKILL.md`

## Acceptance QA Routing

- `sdd-qa` is the dedicated acceptance phase between `sdd-verify` and `sdd-archive`.
- QA writes `openspec/changes/{change-name}/qa-report.md` and records target, environment, capability selection, scenarios, evidence, untested scope, findings, verdict, and limitations.
- No target or executable capability means `NOT TESTED`; external constraints mean `BLOCKED`; static inspection cannot pass.
- `qa-report.md` is required and preserved for archive. This harness has no product target or general test runner, so smoke validation must not claim product acceptance.
- `skills/workflow/writing-skills/SKILL.md`
- `skills/workflow/zoom-out/SKILL.md`
