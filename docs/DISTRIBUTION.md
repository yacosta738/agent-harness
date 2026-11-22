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

Existing OpenCode installations are unchanged. The bundle layout and behavior are identical to
before.

### Claude Code

Claude Code discovers skills at `.claude/skills/` (project-level) or `~/.claude/skills/` (global).

**Project-level installation:**

Set `TARGET_PROJECT` to the path of the project where you want to install the harness:

```bash
export TARGET_PROJECT=/path/to/your/project

npm run deploy:claude-code

bundle=distribution/claude-code
mkdir -p "$TARGET_PROJECT/.claude"
cp -R "$bundle/.claude/skills" "$bundle/.claude/agents" "$bundle/.claude/commands" \
  "$bundle/.claude/scripts" "$TARGET_PROJECT/.claude/"

# Install templates only when a project file does not already exist.
for file in CLAUDE.md .claude/settings.json .mcp.json; do
  if [ -e "$TARGET_PROJECT/$file" ] || [ -L "$TARGET_PROJECT/$file" ]; then
    if [ ! -e "$TARGET_PROJECT/$file.bak" ] && [ ! -L "$TARGET_PROJECT/$file.bak" ]; then
      cp "$TARGET_PROJECT/$file" "$TARGET_PROJECT/$file.bak"
    fi
  else
    cp "$bundle/$file" "$TARGET_PROJECT/$file"
  fi
done
```

If a file already existed, complete the merge before using the harness. If a `.bak` file already
exists, keep it and save the current project file under a new backup name before merging.

- **Settings:** Start with the generated `.claude/settings.json` and merge custom settings from
  `settings.json.bak`. Combine the permission arrays and keep the harness's credential denials.
  Save the merged file as `.claude/settings.json` and retain the backup.
- **Instructions:** Start with the generated `CLAUDE.md`, include the custom instructions from
  `CLAUDE.md.bak`, and save the merged file as `CLAUDE.md`. Retain the backup.
- **MCP:** Keep the existing `.mcp.json` as the base. Add any required template entries that are
  missing, keeping existing servers and credentials. The current template has no server entries.

This places:

- `CLAUDE.md` at the project root (loaded every session)
- `.claude/skills/` with all harness skills
- `.claude/agents/` with subagent definitions
- `.claude/commands/` with custom commands
- `.claude/scripts/` with review scripts (review.mjs, review-lib.mjs)
- `.mcp.json` with your MCP configuration or an empty template

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

bundle=distribution/junie/.junie
mkdir -p "$TARGET_PROJECT/.junie/mcp"
cp -R "$bundle/skills" "$bundle/agents" "$bundle/commands" "$bundle/scripts" "$TARGET_PROJECT/.junie/"

# Back up existing guidelines and MCP settings without replacing the project files.
for file in AGENTS.md mcp/mcp.json; do
  if [ -e "$TARGET_PROJECT/.junie/$file" ] || [ -L "$TARGET_PROJECT/.junie/$file" ]; then
    if [ ! -e "$TARGET_PROJECT/.junie/$file.bak" ] && [ ! -L "$TARGET_PROJECT/.junie/$file.bak" ]; then
      cp "$TARGET_PROJECT/.junie/$file" "$TARGET_PROJECT/.junie/$file.bak"
    fi
  else
    cp "$bundle/$file" "$TARGET_PROJECT/.junie/$file"
  fi
done
```

If a file already existed, complete the merge before using the harness. If a `.bak` file already
exists, keep it and save the current project file under a new backup name before merging.

- **Guidelines:** Start with the generated `.junie/AGENTS.md`, include the custom instructions from
  `AGENTS.md.bak`, and save the merged file as `.junie/AGENTS.md`. Retain the backup.
- **MCP:** Keep the existing `.junie/mcp/mcp.json` as the base. Add any required entries from the
  bundled configuration that are missing, keeping existing server settings and credentials.
  The current template has no server entries.

This places:

- `.junie/AGENTS.md` at the project level (loaded every session)
- `.junie/skills/` with all harness skills
- `.junie/agents/` with subagent definitions
- `.junie/commands/` with custom commands
- `.junie/scripts/` with review scripts (review.mjs, review-lib.mjs)
- `.junie/mcp/mcp.json` with your MCP configuration or an empty template

**Global installation (skills only):**

```bash
npm run deploy:junie
mkdir -p ~/.junie/skills
cp -r distribution/junie/.junie/skills/* ~/.junie/skills/
```

## Commands reference

| Command                             | Description                           |
|-------------------------------------|---------------------------------------|
| `npm run deploy`                    | Deploy default target (opencode)      |
| `npm run deploy:all`                | Deploy all three targets              |
| `npm run deploy:opencode`           | Deploy OpenCode only                  |
| `npm run deploy:claude-code`        | Deploy Claude Code only               |
| `npm run deploy:junie`              | Deploy Junie only                     |
| `npm run render:all`                | Render all bundles without validation |
| `npm run validate`                  | Validate OpenCode bundle references   |
| `node scripts/validate-targets.mjs` | Cross-target validation               |

## Architecture

See [docs/multi-runtime-architecture.md](multi-runtime-architecture.md) for the design decision and
adapter boundaries.

## Capability matrix

See [docs/capability-matrix.md](capability-matrix.md) for what is native, adapted, partial, or
unsupported per runtime.
