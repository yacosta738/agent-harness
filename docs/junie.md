# Junie Installation Guide

This guide explains how to install and use the Agent Harness distribution with JetBrains Junie.

## Prerequisites

- **JetBrains Junie** (CLI or IDE integration) installed and configured
- **Node.js 18+** for building the bundle

## Installation

### 1. Generate the Bundle

From the Agent Harness repository:

```bash
npm run deploy:junie
```

This creates `distribution/junie/` with all necessary files.

### 2. Copy to Your Project

Copy the generated files to your project root:

```bash
cp -r distribution/junie/.junie /path/to/your/project/
cp distribution/junie/mcp.json /path/to/your/project/
```

The resulting structure:

```
your-project/
  mcp.json               # MCP template (disabled by default)
  .junie/
    AGENTS.md            # Project guidelines
    agents/*.md          # Custom subagents
    commands/*.md        # Custom commands
    skills/              # Agent skills
```

### 3. Configure MCP Servers (Optional)

The generated `mcp.json` includes all MCP servers from the OpenCode configuration, disabled by default. To enable a server:

1. Edit `mcp.json`
2. Set `"disabled": false` for the desired server
3. Configure authentication (API keys, tokens) as needed

For Junie CLI, MCP servers are discovered from `~/.junie/mcp/mcp.json` or project-level `mcp.json`.

### 4. SDD Discovery Conflict (Important)

Junie discovers `.agents/skills/` by default, which may conflict with SDD persistence under `.agents/sdd/`. To avoid conflicts:

- Configure Junie to use `.junie/skills/` explicitly for skill discovery
- Keep SDD artifacts in `.agents/sdd/` as designed

## Usage

### Junie CLI

Start Junie in your project directory:

```bash
cd /path/to/your/project
junie
```

Junie will automatically load `.junie/AGENTS.md` for project guidelines and discover skills, subagents, and commands from `.junie/`.

### JetBrains IDE Integration

When using Junie through the IDE integration, the `.junie/` directory is discovered automatically. Note that some features (MCP, subagent models) may behave differently between CLI and IDE integration.

## Limitations

- **Granular task permissions**: Not enforced in Junie. Use Brave mode or allowlist for permission control.
- **Provider configuration**: Junie uses built-in providers. Custom provider routing from OpenCode is not available.
- **CLI themes**: Not supported in Junie.
- **Command placeholders**: `{workdir}` and `{project}` are OpenCode-specific and may not be populated in Junie commands.
- **`.agents/sdd/` discovery**: May conflict with `.agents/skills/` discovery. Configure explicit skill locations.
- **IDE vs CLI differences**: MCP and subagent behavior may differ between Junie CLI and IDE integration.

## Rebuilding

When you update skills, agents, or commands in the Agent Harness repository:

```bash
npm run deploy:junie
# Then copy the updated files to your project
```

## See Also

- [Capability Matrix](capability-matrix.md) — Full feature compatibility table
- [UNIX Setup](UNIX.md) — Build environment setup
