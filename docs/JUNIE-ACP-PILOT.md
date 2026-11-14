# Junie integration: ACP pilot retired

The Junie ACP pilot is **retired**. The `junie_acp` MCP server, its permission rules, and the
`mcacp.json` bridge configuration were removed from this adapter on 2026-11-14. This document
records why, what was verified, and what would have to change before the ACP path is reintroduced.

Junie remains usable through its CLI. That is the only supported path today.

## Why the pilot was retired

A Junie account with **Junie Lite-only access** cannot submit a prompt over ACP. The agent
authenticates, reports the model as available, and then rejects every prompt before execution. The
same account and the same model work through the CLI.

The blocking behaviour is a Junie account/path restriction, not a defect in this repository.

## Evidence (reproduced 2026-11-14)

Environment: macOS aarch64, Junie CLI `26.11.1 (4020.10)`, account `license_type=NONE`
(Junie Lite-only).

Raw ACP client, JSON-RPC over stdio, no MCACP in the loop, `--acp-logging=true`:

| Step | Result |
|------|--------|
| `initialize` | `protocolVersion 1`, `authMethods: [jetbrains-account]`, `_meta.jetbrains.air.capabilities` includes `providerModels` |
| `authenticate(jetbrains-account)` | `{}` — authentication succeeds |
| `session/new` | `configOptions: [mode, brave_mode]` only; **no `models` state** |
| `session/prompt` (`junie-lite`) | `-32002` `model_not_available` |
| `session/set_config_option(mode, brave_mode)` | accepted; prompt still rejects |
| `session/prompt` (`--model=gemini-3.7-flash`) | `-32012` `no_model_provider` |

CLI comparison with the same account:

| Command | Result |
|---------|--------|
| `junie --model=junie-lite "..."` | completes the task |
| `junie --model=gemini-3.7-flash "..."` | `Model ... is unavailable with Junie Lite-only access` |

Findings:

1. ACP model selection is not expressed through `configOptions`. Junie publishes no model state at
   all (`session/new` has no `models` field), although `initialize` advertises the `providerModels`
   capability. No ACP client can select a model, so a `set_config_option`-based fix cannot work.
2. `mcacp@0.1.3` (verified from the published npm tarball) has no `session/authenticate`,
   `session/set_config_option`, or `session/set_model` support. Its `newSession` returns only
   `{ sessionId, modes }`.
3. The set of prompt-capable models depends on the account. On a Junie Lite-only account only
   `junie-lite` is allowed, and ACP refuses it.

## Supported path: Junie CLI

```bash
junie --model=junie-lite "Review this diff and report only blocking issues"
```

Run it in the intended project root, review the diff yourself, and do not delegate commits or
pushes. The CLI is a separate process; it is not native OpenCode `task` delegation and it is not
wired as an MCP server.

## Reintroduction criteria

Reintroduce ACP only when **all** of the following hold:

1. Junie advertises model state in `session/new` (or the account is not Lite-only).
2. A prompt completes over ACP for the selected model on this account.
3. A bridge version implements `session/authenticate` and forwards `models` and `configOptions`.

Re-check with the same raw probe before re-adding `mcacp.json`, the `junie_acp` server entry, and
its permission rules. `session/set_mode` remains unsupported by Junie; a mode change must go
through `session/set_config_option`.

## Tracking

GitHub issue: `yacosta738/agent-harness#33`. The issue tracks the MCACP gap (missing
`configOptions`/`authenticate` exposure, useful for other ACP agents) and the JetBrains-side
question about Junie Lite over third-party ACP clients.
