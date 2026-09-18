# Windows Compatibility

This harness now runs natively on Windows. Only Node.js 18+ is required.

## Requirements

- Node.js 18 or newer: https://nodejs.org/

That's it. No WSL, no Git Bash, no Python.

## Quick Start (Windows PowerShell or cmd)

```powershell
npm run deploy
```

## Quick Start (macOS / Linux)

```bash
npm run deploy
```

## What changed

The previous Bash (`deploy.sh`) and Python (`check-refs.py`) entrypoints are
gone. Everything now goes through Node ESM scripts and `npm run`:

| Old | New |
|-----|-----|
| `python3 scripts/check-refs.py` | `npm run validate` |
| `node scripts/generate-bundle.mjs list` | `npm run list` |
| `node scripts/generate-bundle.mjs render` | `npm run render` |
| `scripts/deploy.sh --preset X` | `npm run deploy -- --preset X` |
| `py -3 scripts/check-refs.py --root dist/opencode` | `node scripts/check-refs.mjs --root dist/opencode` |

All scripts are pure Node — no shell, no Python. They use forward slashes in
paths internally (Node handles Windows path resolution natively), so no
manual conversion is needed.

## Troubleshooting

### `npm` not found

Install Node.js 18 or newer from https://nodejs.org/ — `npm` ships with it.
After install, open a new terminal so `PATH` updates.

### `npm run deploy` fails with "bundle dir not found" (validate-only mode)

`--validate-only` skips the render step. The bundle must already exist
(run a regular `npm run deploy` once first, or omit `--validate-only`).

### Path issues on Windows

Paths in commands are POSIX-style (`./agents/ORCHESTRATOR.md`,
`~/.config/opencode/...`). The harness scripts resolve them with `path.resolve`,
which maps them to Windows-native paths at runtime — you don't need to
convert anything.

### dotter mapping is unchanged

The dotter `toml` mappings in `README.md` are path-agnostic; they're
dotter's job, not the harness's. Re-render with `npm run deploy` after
every pull.