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

Follow the [project installation steps](DISTRIBUTION.md#claude-code) to copy the
bundle and merge any existing project configuration.

The resulting structure:

```
your-project/
  CLAUDE.md              # Project instructions
  .mcp.json              # MCP configuration or empty template
  .claude/
    agents/*.md          # Custom agents
    commands/*.md        # Custom commands
    skills/              # Agent skills
    settings.json        # Settings template
```

### 3. Configure MCP Servers (Optional)

The generated `.mcp.json` contains an empty `mcpServers` object. Add each server as a new named
entry under `mcpServers`:

- **Local server:** Set `command` to an executable on your machine and supply its arguments in
  `args`. Add `env` only if the server requires environment variables.
- **Remote server:** Set `url` and the transport `type` specified by the provider (such as
  `http`). Add `headers` only if required, for example for authentication.

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
