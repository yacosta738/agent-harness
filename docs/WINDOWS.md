# Windows Setup

This harness runs natively on Windows. Only Node.js 18+ is required.

## Requirements

- **Node.js 18 or newer**: https://nodejs.org/

That's it. No WSL, no Git Bash, no Python.

## Quick Start

Open PowerShell or Command Prompt:

```powershell
# Clone the repo
git clone https://github.com/yacosta738/agent-harness.git
cd agent-harness

# Validate references in the live repo
npm run validate

# List what a preset would deploy
npm run list -- --preset recommended

# Render + verify the deployable bundle (dist/ is gitignored — required after clone/pull)
npm run deploy -- --preset recommended
```

Then follow the [README.md](README.md#deployment) deployment instructions to run `dotter deploy`.

## Available npm Scripts

| Command | What it does |
|---------|-------------|
| `npm run validate` | Validate all `{file:}` refs, adapter includes, and command paths |
| `npm run list` | List files included in a preset |
| `npm run render` | Render bundle without validating |
| `npm run deploy` | Render + validate (full pipeline) |

### Flags

All scripts accept these flags:

```powershell
npm run deploy -- --preset recommended --output dist/opencode
npm run validate -- --root dist/opencode    # validate a pre-rendered bundle
```

| Flag | Default | Description |
|------|---------|-------------|
| `--preset` | `recommended` | Which preset to deploy (from `harness.config.json`) |
| `--output` | `dist/opencode` | Where to write the bundle |
| `--validate-only` | `false` | Skip render, only validate an existing bundle |

## Installing Node.js

### Option 1: Official Installer (Recommended)

1. Go to https://nodejs.org/
2. Download the **LTS** installer for Windows (.msi)
3. Run the installer — default settings are fine
4. Open a **new** terminal and verify:

```powershell
node --version   # should be >= 18.0.0
npm --version
```

### Option 2: Winget

```powershell
winget install OpenJS.NodeJS.LTS
# Restart your terminal
node --version
npm --version
```

### Option 3: Chocolatey

```powershell
choco install nodejs-lts
# Restart your terminal
node --version
npm --version
```

## Troubleshooting

### `npm` not found after install

Open a **new** terminal window. The installer updates `PATH` but existing terminals don't see it.

If it still doesn't work, search for "Environment Variables" in Windows Settings → add `C:\Program Files\nodejs\` to your `Path`.

### `npm run deploy` fails with "bundle dir not found" (validate-only mode)

`--validate-only` skips the render step. The bundle must already exist — run a regular `npm run deploy` once first, or omit `--validate-only`.

### Node version too old

```powershell
# Check current version
node --version

# If below 18.0.0, update Node.js
# Using winget:
winget upgrade OpenJS.NodeJS.LTS

# Or reinstall from https://nodejs.org/
```

### Path issues

Paths in commands are POSIX-style (`./agents/ORCHESTRATOR.md`,
`~/.config/opencode/...`). The harness scripts resolve them with `path.resolve`,
which maps them to Windows-native paths at runtime — you don't need to
convert anything manually.

### dotter mapping is unchanged

The dotter `toml` mappings in `README.md` are path-agnostic; they're
dotter's job, not the harness's. Re-render with `npm run deploy` after
every pull.

## What Changed

The previous Bash (`deploy.sh`) and Python (`check-refs.py`) entrypoints are
gone. Everything now goes through Node ESM scripts and `npm run`:

| Old | New |
|-----|-----|
| `bash scripts/deploy.sh --preset X` | `npm run deploy -- --preset X` |
| `python3 scripts/check-refs.py` | `npm run validate` |
| `node scripts/generate-bundle.mjs list` | `npm run list` |
| `node scripts/generate-bundle.mjs render` | `npm run render` |
| `py -3 scripts/check-refs.py --root dist/opencode` | `node scripts/check-refs.mjs --root dist/opencode` |

All scripts are pure Node — no shell, no Python. They use forward slashes in
paths internally (Node handles Windows path resolution natively), so no
manual conversion is needed.
