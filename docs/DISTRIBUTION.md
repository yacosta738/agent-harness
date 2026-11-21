# Multi-Runtime Distribution

Agent Harness now distributes to three runtimes from a single canonical source:

- **OpenCode** — `~/.config/opencode` (existing, backward compatible)
- **Claude Code** — project-level `.claude/` with `CLAUDE.md`
- **JetBrains Junie** — project-level `.junie/` with `AGENTS.md`

## Quick start

```bash
# Render and validate all targets
npm run deploy:all

# Or deploy a single target
npm run deploy:opencode
npm run deploy:claude-code
npm run deploy:junie

# Validate without re-rendering
npm run deploy:all -- --validate-only
```

Generated bundles land in `distribution/<target>/` (gitignored).

## Installation per runtime

### OpenCode

```bash
npm run deploy:opencode
# Then use dotter or copy distribution/opencode/ to ~/.config/opencode/
```

Existing OpenCode installations are unchanged. The bundle layout and behavior are identical to before.

### Claude Code

Claude Code discovers skills at `.claude/skills/` (project-level) or `~/.claude/skills/` (global).

**Project-level installation:**

Set `TARGET_PROJECT` to the path of the project where you want to install the harness:

```bash
export TARGET_PROJECT=/path/to/your/project

npm run deploy:claude-code

# Back up existing configuration before installing
if [ -f "$TARGET_PROJECT/CLAUDE.md" ]; then
  cp "$TARGET_PROJECT/CLAUDE.md" "$TARGET_PROJECT/CLAUDE.md.bak"
fi
if [ -f "$TARGET_PROJECT/.claude/settings.json" ]; then
  cp "$TARGET_PROJECT/.claude/settings.json" "$TARGET_PROJECT/.claude/settings.json.bak"
fi

# Copy distributed files, merging with existing configuration
cp -r distribution/claude-code/.claude "$TARGET_PROJECT/"
cp distribution/claude-code/CLAUDE.md "$TARGET_PROJECT/"
cp distribution/claude-code/.mcp.json "$TARGET_PROJECT/"

# If you had custom settings, merge them back from the backup
if [ -f "$TARGET_PROJECT/.claude/settings.json.bak" ]; then
  # Manually merge custom permissions from settings.json.bak
  mv "$TARGET_PROJECT/.claude/settings.json.bak" "$TARGET_PROJECT/.claude/settings.json"
fi
if [ -f "$TARGET_PROJECT/CLAUDE.md.bak" ]; then
  # Manually merge custom instructions from CLAUDE.md.bak
  mv "$TARGET_PROJECT/CLAUDE.md.bak" "$TARGET_PROJECT/CLAUDE.md"
fi
```

This places:
- `CLAUDE.md` at the project root (loaded every session)
- `.claude/skills/` with all harness skills
- `.claude/agents/` with subagent definitions
- `.claude/commands/` with custom commands
- `.mcp.json` with MCP server templates (disabled by default)

**Global installation (skills only):**

```bash
npm run deploy:claude-code
mkdir -p ~/.claude/skills
cp -r distribution/claude-code/.claude/skills/* ~/.claude/skills/
```

### JetBrains Junie

Junie discovers skills at `.junie/skills/` (project-level) or `~/.junie/skills/` (global).
Project guidelines are read from `.junie/AGENTS.md`.

**Project-level installation:**

Set `TARGET_PROJECT` to the path of the project where you want to install the harness:

```bash
export TARGET_PROJECT=/path/to/your/project

npm run deploy:junie

# Back up existing configuration before installing
if [ -f "$TARGET_PROJECT/.junie/AGENTS.md" ]; then
  cp "$TARGET_PROJECT/.junie/AGENTS.md" "$TARGET_PROJECT/.junie/AGENTS.md.bak"
fi

# Copy distributed files
cp -r distribution/junie/.junie "$TARGET_PROJECT/"

# If you had custom guidelines, merge them back from the backup
if [ -f "$TARGET_PROJECT/.junie/AGENTS.md.bak" ]; then
  # Manually merge custom instructions from AGENTS.md.bak
  mv "$TARGET_PROJECT/.junie/AGENTS.md.bak" "$TARGET_PROJECT/.junie/AGENTS.md"
fi
```

This places:
- `.junie/AGENTS.md` at the project level (loaded every session)
- `.junie/skills/` with all harness skills
- `.junie/agents/` with subagent definitions
- `.junie/commands/` with custom commands
- `.junie/mcp/mcp.json` with MCP server templates (disabled by default)

**Global installation (skills only):**

```bash
npm run deploy:junie
mkdir -p ~/.junie/skills
cp -r distribution/junie/.junie/skills/* ~/.junie/skills/
```

## Commands reference

| Command | Description |
|---------|-------------|
| `npm run deploy` | Deploy default target (opencode) |
| `npm run deploy:all` | Deploy all three targets |
| `npm run deploy:opencode` | Deploy OpenCode only |
| `npm run deploy:claude-code` | Deploy Claude Code only |
| `npm run deploy:junie` | Deploy Junie only |
| `npm run render:all` | Render all bundles without validation |
| `npm run validate` | Validate OpenCode bundle references |
| `node scripts/validate-targets.mjs` | Cross-target validation |

## Architecture

See [docs/multi-runtime-architecture.md](multi-runtime-architecture.md) for the design decision and adapter boundaries.

## Capability matrix

See [docs/capability-matrix.md](capability-matrix.md) for what is native, adapted, partial, or unsupported per runtime.
