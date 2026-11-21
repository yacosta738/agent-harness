# Claude Code Installation Guide

This guide explains how to install and use the Agent Harness distribution with Claude Code.

## Prerequisites

- **Claude Code** installed and configured
- **Node.js 18+** for building the bundle

## Installation

### 1. Generate the Bundle

From the Agent Harness repository:

```bash
npm run deploy:claude-code
```

This creates `distribution/claude-code/` with all necessary files.

### 2. Copy to Your Project

Copy the generated files to your project root:

```bash
cp -r distribution/claude-code/.claude /path/to/your/project/
cp distribution/claude-code/CLAUDE.md /path/to/your/project/
cp distribution/claude-code/.mcp.json /path/to/your/project/.mcp.json
```

The resulting structure:

```
your-project/
  CLAUDE.md              # Project instructions
  .mcp.json              # MCP template (disabled by default)
  .claude/
    agents/*.md          # Custom agents
    commands/*.md        # Custom commands
    skills/              # Agent skills
    settings.json        # Settings template
```

### 3. Configure MCP Servers (Optional)

The generated `.mcp.json` uses Claude Code's native `mcpServers` format. It includes all MCP servers from the OpenCode configuration, disabled by default. To enable a server:

1. Edit `.mcp.json`
2. Set `"disabled": false` for the desired server
3. Configure authentication (API keys, tokens) as needed
4. Ensure the `command` and `args` fields point to valid executables on your machine

### 4. Review Settings

The generated `.claude/settings.json` is a template. Review and adjust permission defaults as needed. Note that Claude Code does not support OpenCode's granular `permission.task` block — subagent delegation permissions are documented but not enforced.

## Usage

Start Claude Code in your project directory:

```bash
cd /path/to/your/project
claude
```

Claude Code will automatically load `CLAUDE.md` for project instructions and discover skills, agents, and commands from `.claude/`.

## Limitations

- **Granular task permissions**: Not enforced in Claude Code. Review `.claude/settings.json` manually.
- **Provider configuration**: Claude Code uses built-in providers. Custom provider routing from OpenCode is not available.
- **CLI themes**: Not supported in Claude Code.
- **Command placeholders**: `{workdir}` and `{project}` are OpenCode-specific and may not be populated in Claude Code commands.

## Rebuilding

When you update skills, agents, or commands in the Agent Harness repository:

```bash
npm run deploy:claude-code
# Then copy the updated files to your project
```

## See Also

- [Capability Matrix](capability-matrix.md) — Full feature compatibility table
- [UNIX Setup](UNIX.md) — Build environment setup
