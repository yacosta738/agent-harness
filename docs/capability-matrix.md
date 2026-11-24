# Capability Matrix

This document describes which Agent Harness features are supported natively, adapted, partially, or
not at all for each target runtime.

## Feature Compatibility

| Feature                           | OpenCode                                                                          | Claude Code                                                             | Junie                                                                    |
|-----------------------------------|-----------------------------------------------------------------------------------|-------------------------------------------------------------------------|--------------------------------------------------------------------------|
| **Project instructions**          | Native (`opencode.json` instructions + `{file:...}`)                              | Adapted (CLAUDE.md generated from canonical prompts)                    | Adapted (.junie/AGENTS.md generated from canonical prompts)              |
| **Agent Skills**                  | Native (`skills/**`)                                                              | Native (SKILL.md format compatible)                                     | Native (SKILL.md format compatible)                                      |
| **Custom agents**                 | Native (`opencode.json` agent block)                                              | Adapted (.claude/agents/*.md generated)                                 | Adapted (.junie/agents/*.md generated)                                   |
| **Slash commands**                | Native (`commands/*.md`)                                                          | Adapted (.claude/commands/*.md generated)                               | Adapted (.junie/commands/*.md generated)                                 |
| **Permissions**                   | Native (`opencode.json` permission block)                                         | Partial (.claude/settings.json template — no granular task permissions) | Partial (Brave mode / allowlist — no granular task permissions)          |
| **MCP servers**                   | Native (`opencode.json` mcp block)                                                | Partial (`.mcp.json` template — manual enable required)                 | Partial (`.junie/mcp/mcp.json` template — manual enable required)        |
| **Providers**                     | Native (`opencode.json` provider block)                                           | Unsupported (Claude Code uses built-in providers)                       | Unsupported (Junie uses built-in providers)                              |
| **CLI themes**                    | Native (`adapters/opencode/themes/`)                                              | Unsupported (Claude Code has no theme system)                           | Unsupported (Junie has no theme system)                                  |
| **SDD persistence**               | Native (`.agents/sdd/`)                                                           | Native (`.agents/sdd/` — shared convention)                             | Partial (`.agents/sdd/` — may conflict with `.agents/skills/` discovery) |
| **Engram memory**                 | Native (MCP server)                                                               | Adapted (mcp.json template)                                             | Adapted (mcp.json template)                                              |
| **Context7**                      | Native (MCP server)                                                               | Adapted (mcp.json template)                                             | Adapted (mcp.json template)                                              |
| **Adaptive RPI routing**          | Native (orchestrator logic)                                                       | Adapted (orchestrator logic preserved — not runtime-verified)           | Adapted (orchestrator logic preserved — not runtime-verified)            |
| **Evidence-Driven PRs**           | Native (workflow skill)                                                           | Native (workflow skill preserved)                                       | Native (workflow skill preserved)                                        |
| **Conventions as Code**           | Native (skill registry)                                                           | Native (skill registry preserved)                                       | Native (skill registry preserved)                                        |
| **TDD for business logic**        | Native (workflow skill)                                                           | Native (workflow skill preserved)                                       | Native (workflow skill preserved)                                        |
| **Security boundaries**           | Native (permission rules)                                                         | Partial (settings.json template — manual review required)               | Partial (allowlist — manual review required)                             |
| **Destructive action permission** | Native (scoped authorization — ordinary commit/push allowed, destructive ops ask) | Partial (settings.json template — manual review required)               | Partial (brave mode — manual review required)                            |

## Antigravity CLI Compatibility

| Feature | Support |
|---------|---------|
| Project instructions | Adapted to root `AGENTS.md` from canonical prompts. |
| Agent Skills | Native discovery from `.agents/skills/<name>/SKILL.md`. |
| Custom agents | Adapted to `.agents/agents/<name>/agent.md` with `name`, `description`, and `subagent: true` frontmatter. |
| Slash commands | Adapted to skills; OpenCode-only frontmatter and invocation semantics are not preserved. |
| Permissions | Partial; OpenCode permissions are not generated and CLI policy must be configured separately. |
| MCP servers | Partial; `.agents/mcp_config.json` is an empty template and servers require manual setup. |
| Providers and themes | Unsupported; OpenCode provider and theme configuration is not translated. |
| SDD, RPI, and workflow skills | Adapted shared instructions and skills; runtime behavior is not yet verified. |
| Global configuration | Not installed; the bundle only generates project files and does not modify `~/.gemini/`. |

## Classification Legend

- **Native**: Supported directly by the runtime without transformation.
- **Adapted**: Supported through a deterministic transformation performed by the bundle generator.
- **Partial**: Supported with documented restrictions — manual configuration or review may be
  required.
- **Unsupported**: Cannot be reliably reproduced in this runtime.

## Known Limitations

1. **Granular task permissions**: OpenCode's `permission.task` block (allowing specific subagent
   delegation) has no equivalent in Claude Code or Junie. These permissions are documented but not
   enforced.

2. **Provider configuration**: OpenCode's custom provider setup (rook, model routing) cannot be
   translated to Claude Code or Junie, which use built-in provider systems. Antigravity provider
   settings are also not generated.

3. **CLI themes**: OpenCode's theme system has no equivalent in other runtimes.

4. **MCP auto-configuration**: MCP servers are generated as templates with disabled servers. Users
   must enable and configure them manually per runtime.

5. **`.agents/sdd/` discovery conflicts**: Junie discovers `.agents/skills/` by default, which may
   conflict with SDD persistence under `.agents/sdd/`. Users should configure explicit skill
   locations.

6. **Command placeholders**: `{workdir}` and `{project}` are OpenCode-specific. Translated commands
   may not receive these values in other runtimes. Antigravity receives commands as skills, not as
   identical custom-command invocations.

7. **IDE vs CLI differences**: Junie CLI and IDE integration may behave differently for some
   features (e.g., MCP, subagent models). The bundle targets Junie CLI behavior.

## Distribution Structure

Each target generates a self-contained bundle under `distribution/<target>/`:

### OpenCode (`distribution/opencode/`)

```
opencode.json          # Full configuration (agents, permissions, MCP, providers)
cli.json               # CLI settings
adapter.json           # Adapter metadata
manifest.json          # Bundle manifest
prompts/               # Orchestrator, team roles, SDD prompts
skills/                # All skills with SKILL.md
commands/              # Custom commands
scripts/               # Review scripts, MCP wrappers
themes/                # CLI themes
```

### Claude Code (`distribution/claude-code/`)

```
CLAUDE.md              # Project instructions (root + .claude/)
.mcp.json              # MCP template (empty mcpServers — manual enable required)
.claude/
  CLAUDE.md            # Project instructions
  agents/*.md          # Generated agent files with YAML frontmatter
  commands/*.md        # Translated commands
  skills/              # All skills with SKILL.md
  settings.json        # Settings template
```

### Junie (`distribution/junie/`)

```
.junie/mcp/mcp.json    # MCP template (empty mcpServers — manual enable required)
.junie/
  AGENTS.md            # Project guidelines
  agents/*.md          # Generated agent files with YAML frontmatter
  commands/*.md        # Translated commands
  skills/              # All skills with SKILL.md
```

### Antigravity CLI (`distribution/antigravity/`)

```text
AGENTS.md                       # Project instructions
.agents/
  agents/<name>/agent.md        # Custom agents with native frontmatter
  mcp_config.json               # Empty MCP template — manual server setup required
  scripts/                      # Review scripts
  skills/<name>/SKILL.md        # Shared and command-derived skills
manifest.json                   # Target manifest and file list
```

## Verification

All bundles are validated by `scripts/check-refs.mjs` with target-specific checks:

- **OpenCode**: Validates `opencode.json` `{file:}` references resolve within the bundle.
- **Claude Code**: Validates CLAUDE.md exists, agent frontmatter, command frontmatter, settings.json
  structure, and no OpenCode-specific path leaks.
- **Junie**: Validates AGENTS.md exists, agent frontmatter, command frontmatter, and no
  OpenCode-specific path leaks.
- **Antigravity CLI**: Validates root `AGENTS.md`, native skill and agent frontmatter, MCP JSON,
  references, and no OpenCode-specific path leaks.

Deterministic output is verified by running the generator twice and comparing manifests.
