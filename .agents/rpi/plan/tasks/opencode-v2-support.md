# OpenCode V2 support

## Goal
Migrate the portable agent harness from OpenCode V1 assumptions to the documented OpenCode V2 contracts while preserving supported agents, commands, skills, MCP servers, permissions, and deployment behavior.

## Route
Delegated direct. The change spans plugin configuration, local plugin implementations, CLI configuration, bundle generation, documentation, and focused validation. Formal SDD is not selected because no durable proposal/spec/design/task lifecycle was requested.

## Tasks

- [x] RPI-001 Identify V1-only OpenCode surfaces and V2-compatible surfaces.
- [x] RPI-002 Migrate plugin configuration from `plugin` to `plugins`.
- [x] RPI-003 Remove unported local plugin implementations from the V2 bundle and config.
- [x] RPI-004 Replace `tui.json` deployment with V2 `cli.json` configuration.
- [x] RPI-005 Update bundle/reference validation and README deployment instructions.
- [x] RPI-006 Run focused JSON/reference/plugin syntax checks and record evidence.

## Acceptance criteria

- The generated bundle contains V2-native `opencode.json` and `cli.json`, with no deployed `tui.json`.
- `opencode.json` uses `plugins`, while agents, commands, skills, MCP, and permissions remain intact.
- Any shipped local plugin uses the V2 plugin API and has a stable plugin id, or is explicitly excluded with a documented reason.
- `npm run validate`, bundle rendering, and a focused plugin/config check pass.
- README no longer instructs users to deploy `tui.json`.

## Evidence

- Official V2 migration guide: https://opencode.ai/v2/docs/migrate-v1/
- Official V2 plugin migration guide: https://opencode.ai/v2/docs/build/plugins/migrate-v1
- Official V2 CLI settings: https://opencode.ai/v2/docs/cli/config
- Official V2 plugin overview: https://opencode.ai/v2/docs/build/plugins

## Evidence

- `npm run validate` — PASS; 27/27 file references and 36 adapter include patterns valid.
- `npm run deploy -- --preset recommended --output dist/opencode` — PASS; bundle rendered with 1,468 files and references verified.
- V2 bundle assertions — PASS; `opencode.json` has `plugins: []`, `cli.json` uses the V2 schema/theme, and no `tui.json` or local `plugins/` directory is deployed.
- `opencode --version` — PASS; local runtime is `opencode v2.0.12`.
- `git diff --check` — PASS.

## Progress

All implementation tasks complete. The unsupported V1 plugins are removed rather than shipped as broken V2 integrations. Reintroduce a plugin only after verifying its V2 API compatibility and adding it to the appropriate V2 server or CLI configuration surface.
