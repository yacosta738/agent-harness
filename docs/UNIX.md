# macOS and Linux Setup

This harness runs natively on macOS and Linux. Only Node.js 18+ is required.

## Requirements

- **Node.js 18 or newer**: https://nodejs.org/
- **npm** (ships with Node.js)

Verify your setup:

```bash
node --version   # should be >= 18.0.0
npm --version
```

## Quick Start

```bash
# Clone the repo
git clone https://github.com/yacosta738/agent-harness.git
cd agent-harness

# Validate references in the live repo
npm run validate

# List the complete bundle
npm run list

# Render + verify the deployable bundle (dist/ is gitignored — required after clone/pull)
npm run deploy
```

Then follow the [README.md](README.md#deployment) deployment instructions to run `dotter deploy`.

## Available npm Scripts

| Command            | What it does                                                     |
|--------------------|------------------------------------------------------------------|
| `npm run validate` | Validate all `{file:}` refs, adapter includes, and command paths |
| `npm run list`     | List files included in the complete bundle                       |
| `npm run render`   | Render bundle without validating                                 |
| `npm run deploy`   | Render + validate (full pipeline)                                |

### Options

Bundle commands:

```bash
npm run deploy -- --output dist/opencode
npm run validate -- --root dist/opencode    # validate a pre-rendered bundle
```

| Flag              | Default         | Description                                   |
|-------------------|-----------------|-----------------------------------------------|
| `--output`        | `dist/opencode` | Where to write the complete bundle            |
| `--validate-only` | `false`         | Skip render, only validate an existing bundle |

`npm run validate` also accepts `--root <dir>` to validate a pre-rendered bundle instead of the source tree.

Deploy always renders the complete bundle. It has no preset or profile selection.

## Dependency Installation

### macOS

Using Homebrew (recommended):

```bash
# Install Node.js 20 LTS
brew install node@20

# Verify
node --version   # v20.x.x
npm --version
```

Using the official installer: https://nodejs.org/

### Linux (Ubuntu / Debian)

```bash
# Add NodeSource repository (replace 20 with your desired major version)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify
node --version
npm --version
```

### Linux (Fedora, RHEL, CentOS)

```bash
sudo dnf install nodejs

# Verify
node --version
npm --version
```

### Linux (Arch)

```bash
sudo pacman -S nodejs npm

# Verify
node --version
npm --version
```

## Troubleshooting

### `npm run deploy` fails with "bundle dir not found" (validate-only mode)

`--validate-only` skips the render step. The bundle must already exist — run a regular
`npm run deploy` once first, or omit `--validate-only`.

### Node version too old

```bash
# Check current version
node --version

# If below 18.0.0, update Node.js
# On macOS with Homebrew:
brew upgrade node@20

# On Ubuntu/Debian:
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
```

### Permission errors on Linux (EACCES)

If npm fails with `EACCES` permission errors, see
the [npm guide on fixing permissions](https://docs.npmjs.com/resolving-eacces-permissions-errors-when-installing-packages-globally).

Quick fix — use a Node version manager:

```bash
# Install nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.bashrc   # or ~/.zshrc

# Install and use Node 20
nvm install 20
nvm use 20
node --version   # v20.x.x
```

### `npm run validate` finds missing references after pulling

Re-render the bundle:

```bash
npm run deploy
```

## What Changed

The previous Bash (`deploy.sh`) and Python (`check-refs.py`) entrypoints are
gone. Everything now goes through Node ESM scripts and `npm run`:

| Old                                                | New                                                |
|----------------------------------------------------|----------------------------------------------------|
| `bash scripts/deploy.sh`                           | `npm run deploy`                                   |
| `python3 scripts/check-refs.py`                    | `npm run validate`                                 |
| `node scripts/generate-bundle.mjs list`            | `npm run list`                                     |
| `node scripts/generate-bundle.mjs render`          | `npm run render`                                   |
| `py -3 scripts/check-refs.py --root dist/opencode` | `node scripts/check-refs.mjs --root dist/opencode` |
