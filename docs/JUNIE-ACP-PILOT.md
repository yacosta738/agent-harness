# Junie ACP pilot (temporary)

This adapter uses Junie CLI 26.11.1 over ACP through MCACP 0.1.3. Kerrigan remains the
orchestrator and reviewer. Junie is exposed as MCP tools, not as an OpenCode native `task`
subagent.

## Prerequisites and configuration

- Node.js 20 or newer; MCACP 0.1.3 requires it.
- Junie CLI installed and available as `junie` on `PATH`; this pilot invokes
  `junie --acp=true --skip-update-check --model=junie-lite` because the ACP flag requires an explicit boolean value. Junie Lite is selected by its CLI model ID, `junie-lite`.
- Junie authentication may be required. ACP `initialize` advertises the `jetbrains-account` method.
  No `authStatus` confirmation is available for the current user's session, so treat auth as blocked
  until Junie confirms authentication or the user completes the JetBrains sign-in flow. Never store
  login secrets in repository configuration.
- The rendered OpenCode configuration must be deployed so it can read `mcacp.json` from
  `~/.config/opencode/mcacp.json`. OpenCode sets the MCACP process `cwd` to
  `{env:HOME}/.config/opencode`. MCACP 0.1.3 reads configuration from `cwd/mcacp.json` and does not
  read `MCACP_CONFIG`.
- `mcacp.json` sets Junie's ACP command to `junie --acp` and its permission policy to `operator`.
  OpenCode allows Kerrigan to call only MCACP's read-only discovery and status tools without
  approval. It asks before process initialization, session creation or resumption, prompt submission,
  permission changes, and other mutating tools. MCACP surfaces Junie's permission requests for
  explicit review; grant only an action that is in scope. This does not guarantee a separate
  confirmation for every action: Junie's default `brave-auto` mode can perform actions without one.

The bridge starts Junie with the `cwd` provided to `new_session`. Junie's ACP session reports
`brave_mode` as `brave-auto` by default; preserve it. Changing the mode is not available through
MCACP 0.1.3: `session/set_config_option` is not reachable through the bridge, and the MCP
`set_mode` wrapper calls `session/set_mode`, which Junie rejects. Use the intended project root.
Because Junie may modify files in that directory, only delegate user-authorized, bounded changes.
Inspect the diff and run relevant checks before accepting the result. Do not delegate commits or
pushes.

## Manual removal or review by 2026-12-31

Review whether to retain this pilot no later than 2026-12-31. Removal is manual; no cleanup job is
installed.

1. Set `mcp.servers.junie_acp.disabled` to `true` or remove the `junie_acp` entry from
   `adapters/opencode/opencode.json`.
2. Remove the Junie-specific MCP permission entries from `agent.kerrigan.permission` in that same
   config, if present.
3. Remove the Junie ACP pilot section from `prompts/ORCHESTRATOR.md`.
4. Remove `adapters/opencode/mcacp.json` and its bundle references from
   `adapters/opencode/adapter.json`.
5. Remove the Junie pilot documentation and its assertions from `tests/agents.test.mjs`.
6. Verify the config still parses and run `npm run test:agents` and `npm run validate`.

Do not remove user data or `.mcacp` session data as part of the config change. Inspect and handle
those files separately if needed.
