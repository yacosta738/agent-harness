#!/usr/bin/env node
// Render the complete deployable bundle from adapter.json components.
// Supports multiple targets: opencode, claude-code, junie.
//
//   node scripts/generate-bundle.mjs render [--target <target>] [--output <dir>]
//   node scripts/generate-bundle.mjs list [--target <target>]
//   node scripts/generate-bundle.mjs render-all
//
// Targets:
//   opencode    — ~/.config/opencode layout (default, backward compatible)
//   claude-code — .claude/ project layout with CLAUDE.md
//   junie       — .junie/ project layout with AGENTS.md
//
// Convention per target:
//   opencode: bundle root mirrors ~/.config/opencode — every
//     adapters/opencode/** file lands with that prefix stripped.
//   claude-code: skills land in .claude/skills/, CLAUDE.md at root.
//   junie: skills land in .junie/skills/, AGENTS.md at .junie/AGENTS.md.
// Output is deterministic: sorted files, no timestamps in the manifest.

import {
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync
} from "node:fs";
import {dirname, join, relative, resolve, sep} from "node:path";
import {fileURLToPath} from "node:url";
// node <20.19 lacks require in ESM scope guard: use createRequire for walk()
import {createRequire} from "node:module";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

// Known adapters and their prefixes
const ADAPTERS = {
  "opencode": "adapters/opencode/",
  "claude-code": "adapters/claude-code/",
  "junie": "adapters/junie/"
};

function getAdapterPrefix(target) {
  return ADAPTERS[target] || `adapters/${target}/`;
}

// Map repo paths to bundle destinations based on target
function destFor(repoPath, target) {
  const prefix = getAdapterPrefix(target);
  
  if (target === "opencode") {
    // Original behavior: strip adapters/opencode/ prefix
    return repoPath.startsWith(prefix) ? repoPath.slice(prefix.length) : repoPath;
  }
  
  if (target === "claude-code") {
    // Strip adapters/claude-code/ prefix for adapter-specific files
    if (repoPath.startsWith(prefix)) {
      return repoPath.slice(prefix.length);
    }
    return repoPath;
  }
  
  if (target === "junie") {
    // Strip adapters/junie/ prefix for adapter-specific files
    if (repoPath.startsWith(prefix)) {
      return repoPath.slice(prefix.length);
    }
    return repoPath;
  }
  
  return repoPath;
}

function loadJson(rel) {
  return JSON.parse(readFileSync(join(ROOT, rel), "utf8"));
}

// Expand one include pattern (supports **, *, literal) to repo-relative paths.
// Dependency-free: small fs walk, deterministic sorted output.
function expand(pattern) {
  const out = [];
  if (!pattern.includes("*")) {
    if (existsSync(join(ROOT, pattern))) {
      out.push(pattern);
    }
    return out;
  }
  const parts = pattern.split("/");
  const starIdx = parts.findIndex((p) => p.includes("*"));
  const base = parts.slice(0, starIdx).join("/") || ".";
  const rest = parts.slice(starIdx);
  walk(join(ROOT, base), base, rest, out);
  return out.sort();
}

function walk(absDir, relDir, rest, out) {
  const {readdirSync, statSync} = require("node:fs");
  let entries;
  try {
    entries = readdirSync(absDir).sort();
  } catch {
    return;
  }
  const [head, ...tail] = rest;
  for (const e of entries) {
    if (e === ".DS_Store") {
      continue;
    }
    const abs = join(absDir, e);
    const rel = relDir === "." ? e : `${relDir}/${e}`;
    const isDir = statSync(abs).isDirectory();
    if (head === "**") {
      // ** matches zero or more levels: try rest against self and children
      if (tail.length === 0) {
        if (!isDir) {
          out.push(rel);
        } else {
          walk(abs, rel, rest, out);
        }
      } else {
        if (matchPart(tail[0], e)) {
          if (tail.length === 1) {
            if (!isDir) {
              out.push(rel);
            }
          } else if (isDir) {
            walk(abs, rel, tail.slice(1), out);
          }
        }
        if (isDir) {
          walk(abs, rel, rest, out);
        }
      }
    } else if (matchPart(head, e)) {
      if (tail.length === 0) {
        if (!isDir) {
          out.push(rel);
        }
      } else if (isDir) {
        walk(abs, rel, tail, out);
      }
    }
  }
}

function matchPart(glob, name) {
  const rx = new RegExp(`^${glob.replace(/\./g, "\\.").replace(/\*/g, ".*")}$`);
  return rx.test(name);
}

function resolveBundle(adapter) {
  const seen = new Set();
  for (const [comp, spec] of Object.entries(adapter.components ?? {})) {
    for (const pat of spec.include) {
      for (const f of expand(pat)) {
        seen.add(f);
      }
    }
  }
  return [...seen].sort();
}

function fileRefs(prompt) {
  if (typeof prompt !== "string") {
    return [];
  }
  return [...prompt.matchAll(/\{file:([^}]+)\}/g)].map(
      (m) => m[1].replace(/^\.\//, ""));
}

// Drop agent registrations whose prompt files are not in the complete bundle,
// so the generated opencode.json stays self-contained. Returns pruned names.
function pruneAgents(cfg, bundled) {
  const pruned = [];
  const agents = cfg.agent ?? {};
  for (const [name, def] of Object.entries(agents)) {
    if (name === "kerrigan") {
      continue;
    } // primary always ships
    const refs = fileRefs(def.prompt);
    if (refs.length > 0 && !refs.every((r) => bundled.has(r))) {
      delete agents[name];
      pruned.push(name);
    }
  }
  const subs = agents.kerrigan?.subagents ?? {};
  for (const [name, def] of Object.entries(subs)) {
    const refs = fileRefs(def.prompt);
    if (refs.length > 0 && !refs.every((r) => bundled.has(r))) {
      delete subs[name];
      pruned.push(`kerrigan:${name}`);
    }
  }
  return pruned.sort();
}

function render(outDir, target = "opencode") {
  const adapterPath = `adapters/${target}/adapter.json`;
  const adapter = loadJson(adapterPath);
  const files = resolveBundle(adapter);
  rmSync(outDir, {recursive: true, force: true});
  const bundled = new Set();
  for (const f of files) {
    bundled.add(destFor(f, target));
  }
  const pruned = [];
  const prefix = getAdapterPrefix(target);
  
  for (const f of files) {
    const dest = destFor(f, target);
    const abs = join(outDir, dest);
    mkdirSync(dirname(abs), {recursive: true});
    if (f === `${prefix}opencode.json`) {
      const cfg = loadJson(f);
      pruned.push(...pruneAgents(cfg, bundled));
      writeFileSync(abs, JSON.stringify(cfg, null, 2) + "\n");
    } else {
      cpSync(join(ROOT, f), abs);
    }
  }
  
  // Post-process OpenCode bundle: resolve {harness} placeholder
  if (target === "opencode") {
    replaceOpencodePaths(outDir, bundled, target);
  }

  // Generate target-specific files
  if (target === "claude-code") {
    generateClaudeMd(outDir, bundled);
    generateAgentFiles(outDir, target);
    generateCommandFiles(outDir, target);
    generateSkillsDir(outDir, target);
    generateClaudeSettings(outDir);
    generateMcpTemplate(outDir, target);
    // Post-process: replace OpenCode-specific paths in all markdown files
    replaceOpencodePaths(outDir, bundled, target);
  } else if (target === "junie") {
    generateJunieAgentsMd(outDir, bundled);
    generateAgentFiles(outDir, target);
    generateCommandFiles(outDir, target);
    generateSkillsDir(outDir, target);
    generateMcpTemplate(outDir, target);
    // Post-process: replace OpenCode-specific paths in all markdown files
    replaceOpencodePaths(outDir, bundled, target);
  }
  
  // Build manifest from the final output tree, including all generated files
  const allFiles = collectAllFiles(outDir);
  const manifest = {
    generator: "scripts/generate-bundle.mjs",
    target,
    flatten: {[`${prefix}**`]: "**"},
    pruned,
    files: allFiles.sort(),
  };
  writeFileSync(join(outDir, "manifest.json"),
      JSON.stringify(manifest, null, 2) + "\n");
  console.log(
      `complete bundle: ${manifest.files.length} files, pruned ${pruned.length} agents -> ${outDir}`);
  if (pruned.length > 0) {
    console.log(`  pruned: ${pruned.join(", ")}`);
  }
}

// Generate CLAUDE.md for Claude Code target
// Adapt orchestrator content to remove OpenCode-specific instructions
function generateClaudeMd(outDir, bundled) {
  const orchestratorPath = join(ROOT, "prompts/ORCHESTRATOR.md");
  const controlledLanguagePath = join(ROOT, "prompts/communication/CONTROLLED_LANGUAGE.md");
  const writingStylePath = join(ROOT, "prompts/acs/WRITING_STYLE.md");

  let orchestrator = "";
  let controlledLanguage = "";
  let writingStyle = "";

  if (existsSync(orchestratorPath)) {
    orchestrator = readFileSync(orchestratorPath, "utf8");
    // Strip OpenCode-specific sections from orchestrator for Claude Code
    orchestrator = adaptOrchestratorForRuntime(orchestrator, "claude-code");
  }
  if (existsSync(controlledLanguagePath)) {
    controlledLanguage = readFileSync(controlledLanguagePath, "utf8");
  }
  if (existsSync(writingStylePath)) {
    writingStyle = readFileSync(writingStylePath, "utf8");
  }

  // Build CLAUDE.md from adapted orchestrator and shared prompts
  const claudeMd = `# Project Instructions

This project uses Agent Harness for portable agent configuration.
The following instructions apply to all Claude Code sessions in this project.

---

## Orchestrator

${orchestrator}

---

## Writing Style

${writingStyle}

---

## Communication

${controlledLanguage}

---

## Skills

Skills are located in .claude/skills/ and are loaded on demand.

## Commands

Custom commands are available in .claude/commands/.

## Limitations

- Granular task permissions from OpenCode cannot be enforced in Claude Code.
- MCP servers must be configured manually — see .mcp.json.
- Provider configuration is OpenCode-only.
`;

  const claudeDir = join(outDir, ".claude");
  mkdirSync(claudeDir, {recursive: true});
  // Write CLAUDE.md at the project root for Claude Code discovery
  writeFileSync(join(outDir, "CLAUDE.md"), claudeMd);
}

// Adapt orchestrator content by removing OpenCode-specific instructions
function adaptOrchestratorForRuntime(text, target) {
  let adapted = text;
  // Remove OpenCode-specific path references
  adapted = adapted.replace(/~\/\.config\/opencode/g, "{harness}");
  // Remove OpenCode-specific permission references
  adapted = adapted.replace(/opencode\.json/g, "configuration");
  return adapted;
}

// Collect all files in the output directory for the manifest
function collectAllFiles(dir) {
  const files = [];
  const walk = (absDir, relDir) => {
    const entries = readdirSync(absDir, {withFileTypes: true});
    for (const e of entries) {
      if (e.name === ".DS_Store") continue;
      const abs = join(absDir, e.name);
      const rel = relDir === "." ? e.name : `${relDir}/${e.name}`;
      if (e.isDirectory()) {
        walk(abs, rel);
      } else {
        files.push(rel);
      }
    }
  };
  walk(dir, ".");
  return files;
}

// Generate AGENTS.md for Junie target
// Adapt orchestrator content to remove OpenCode-specific instructions
function generateJunieAgentsMd(outDir, bundled) {
  const orchestratorPath = join(ROOT, "prompts/ORCHESTRATOR.md");
  const controlledLanguagePath = join(ROOT, "prompts/communication/CONTROLLED_LANGUAGE.md");
  const writingStylePath = join(ROOT, "prompts/acs/WRITING_STYLE.md");

  let orchestrator = "";
  let controlledLanguage = "";
  let writingStyle = "";

  if (existsSync(orchestratorPath)) {
    orchestrator = readFileSync(orchestratorPath, "utf8");
    // Strip OpenCode-specific sections from orchestrator for Junie
    orchestrator = adaptOrchestratorForRuntime(orchestrator, "junie");
  }
  if (existsSync(controlledLanguagePath)) {
    controlledLanguage = readFileSync(controlledLanguagePath, "utf8");
  }
  if (existsSync(writingStylePath)) {
    writingStyle = readFileSync(writingStylePath, "utf8");
  }

  // Build AGENTS.md for Junie
  const agentsMd = `# Project Guidelines

This project uses Agent Harness for portable agent configuration.
The following guidelines apply to all Junie sessions in this project.

---

## Orchestrator

${orchestrator}

---

## Writing Style

${writingStyle}

---

## Communication

${controlledLanguage}

---

## Skills

Skills are located in .junie/skills/ and are loaded on demand.

## Subagents

Custom subagents are defined in .junie/agents/ with YAML frontmatter.

## Limitations

- Granular task permissions from OpenCode cannot be enforced in Junie.
- MCP servers must be configured manually — see .junie/mcp/mcp.json.
- Provider configuration is OpenCode-only.
- Junie CLI and IDE integration may behave differently for some features.
`;

  const junieDir = join(outDir, ".junie");
  mkdirSync(junieDir, {recursive: true});
  writeFileSync(join(junieDir, "AGENTS.md"), agentsMd);
}

// Resolve {file:...} references in a prompt string, reading from the repo root
function resolveFileRefs(prompt) {
  if (typeof prompt !== "string") return prompt;
  return prompt.replace(/\{file:([^}]+)\}/g, (match, path) => {
    const clean = path.replace(/^\.\//, "");
    const abs = join(ROOT, clean);
    if (existsSync(abs)) {
      return readFileSync(abs, "utf8");
    }
    return match; // leave unresolved if not found
  });
}

// Generate agent files from opencode.json agent definitions
function generateAgentFiles(outDir, target) {
  const opencodePath = join(ROOT, "adapters/opencode/opencode.json");
  if (!existsSync(opencodePath)) return;
  const cfg = JSON.parse(readFileSync(opencodePath, "utf8"));
  const agents = cfg.agent || {};

  let agentDir;
  if (target === "claude-code") {
    agentDir = join(outDir, ".claude/agents");
  } else if (target === "junie") {
    agentDir = join(outDir, ".junie/agents");
  } else {
    return;
  }

  mkdirSync(agentDir, {recursive: true});

  for (const [name, def] of Object.entries(agents)) {
    if (name === "kerrigan" && def.mode === "primary") continue; // primary agent handled by CLAUDE.md/AGENTS.md
    if (!def.prompt) continue;

    const promptBody = resolveFileRefs(def.prompt);
    const description = def.description || "";

    const agentMd = `---
name: ${name}
description: ${description}
---

${promptBody}
`;
    writeFileSync(join(agentDir, `${name}.md`), agentMd);
  }
}

// Generate command files with translated paths and frontmatter
function generateCommandFiles(outDir, target) {
  const cmdsDir = join(ROOT, "commands");
  if (!existsSync(cmdsDir)) return;

  let destDir;
  if (target === "claude-code") {
    destDir = join(outDir, ".claude/commands");
  } else if (target === "junie") {
    destDir = join(outDir, ".junie/commands");
  } else {
    return;
  }

  mkdirSync(destDir, {recursive: true});

  const files = readdirSync(cmdsDir).filter((f) => f.endsWith(".md")).sort();
  for (const name of files) {
    const src = join(cmdsDir, name);
    let text = readFileSync(src, "utf8");

    // Parse frontmatter to check for subtask flag
    const frontmatterMatch = text.match(/^---\n([\s\S]*?)\n---/);
    const hasSubtask = frontmatterMatch && /^subtask:[ \t]*true[ \t]*$/m.test(frontmatterMatch[1]);

    // Translate frontmatter for non-OpenCode targets
    // Remove OpenCode-specific fields: agent, subtask
    // Add 'name' derived from the file name so the command is discoverable
    const cmdName = name.replace(/\.md$/, "");
    text = text.replace(/^agent:.*$/gm, "");
    text = text.replace(/^subtask:.*$/gm, "");

    // Ensure frontmatter has a name field
    const fmMatch = text.match(/^---\n([\s\S]*?)\n---/);
    if (fmMatch) {
      const fm = fmMatch[1];
      const hasName = /^name:/m.test(fm);
      if (!hasName) {
        text = text.replace(/^---\n/, `---\nname: ${cmdName}\n`);
      }
    }

    // For commands with subtask: true, translate to Claude Code's fork context
    if (hasSubtask && target === "claude-code") {
      // Add a note that this command runs in a fork/subtask context
      text = text.replace(/^---\n([\s\S]*?)\n---/, (match, fm) => {
        const adapted = fm.replace(/\n\s*agent:.*$/, "").replace(/\n\s*subtask:.*$/, "");
        return `---\n${adapted}\ncontext: fork\n---`;
      });
    }

    // Replace OpenCode-specific placeholders with target-appropriate equivalents
    // {workdir} and {project} are OpenCode-specific; document them as unavailable
    if (target === "claude-code") {
      text = text.replace(/\{workdir\}/g, "$CWD");
      text = text.replace(/\{project\}/g, "$PROJECT_NAME");
      text = text.replace(/\{argument\}/g, "$1");
    } else if (target === "junie") {
      text = text.replace(/\{workdir\}/g, "$workdir");
      text = text.replace(/\{project\}/g, "$project");
      text = text.replace(/\{argument\}/g, "$argument");
    }

    // Clean up empty lines left by removed frontmatter fields
    text = text.replace(/\n\n\n+/g, "\n\n");

    writeFileSync(join(destDir, name), text);
  }
}

// Generate skills directory with flat structure for discovery
// Each skill becomes <destDir>/<skill-name>/ containing SKILL.md and auxiliary files
function generateSkillsDir(outDir, target) {
  const skillsSrc = join(ROOT, "skills");
  if (!existsSync(skillsSrc)) return;

  let destDir;
  if (target === "claude-code") {
    destDir = join(outDir, ".claude/skills");
  } else if (target === "junie") {
    destDir = join(outDir, ".junie/skills");
  } else {
    return;
  }

  mkdirSync(destDir, {recursive: true});

  // Find all SKILL.md files and collect their parent directories (skill names)
  const skillDirs = [];
  const seen = new Set();
  const findSkills = (dir) => {
    const entries = readdirSync(dir, {withFileTypes: true});
    for (const e of entries) {
      if (e.name === ".DS_Store") continue;
      const abs = join(dir, e.name);
      if (e.isDirectory()) {
        // Check if this directory contains SKILL.md
        const skillPath = join(abs, "SKILL.md");
        if (existsSync(skillPath)) {
          const skillName = e.name;
          if (seen.has(skillName)) {
            console.warn(`skill collision: '${skillName}' found in multiple categories`);
          } else {
            seen.add(skillName);
            skillDirs.push({name: skillName, source: abs});
          }
        }
        findSkills(abs);
      }
    }
  };
  findSkills(skillsSrc);

  // Keep shared assets inside the installed skills tree, including for global installs.
  const sharedDest = join(destDir, "_shared");
  for (const category of readdirSync(skillsSrc).sort()) {
    const source = join(skillsSrc, category, "_shared");
    if (existsSync(source)) {
      cpSync(source, join(sharedDest, category), {recursive: true});
    }
  }
  cpSync(join(ROOT, "prompts/sdd"), join(sharedDest, "prompts/sdd"), {recursive: true});

  const toPosix = (path) => path.split(sep).join("/");
  // Copy each skill and rewrite only references to resources outside its own directory.
  for (const {name, source} of skillDirs) {
    const dest = join(destDir, name);
    cpSync(source, dest, {recursive: true});
    for (const file of collectAllFiles(dest).filter(f => f.endsWith(".md"))) {
      const destFile = join(dest, file);
      const text = readFileSync(destFile, "utf8");
      const relocated = text.replace(/(?:\.\.\/)+(?:[\w.-]+\/)*_shared\/[\w./-]+/g, ref => {
        const resolved = resolve(source, dirname(file), ref);
        const match = toPosix(relative(skillsSrc, resolved)).match(/^([\w-]+)\/_shared\/(.+)$/);
        if (!match || !existsSync(resolved)) return ref;
        return toPosix(relative(dirname(destFile), join(sharedDest, match[1], match[2])));
      });
      if (relocated !== text) writeFileSync(destFile, relocated);
    }

    // A native skill takes precedence over a command with the same name. Use the
    // adapted command as its entry point and keep the detailed skill workflow.
    const commandFile = join(destDir, "../commands", `${name}.md`);
    if (!existsSync(commandFile)) continue;
    const skillFile = join(dest, "SKILL.md");
    const skillBody = readFileSync(skillFile, "utf8").replace(/^---\n[\s\S]*?\n---\n/, "").trim();
    const canonicalSkill = toPosix(relative(ROOT, join(source, "SKILL.md")));
    const command = readFileSync(commandFile, "utf8")
      .replace(/^---\n/, `---\nname: ${name}\n`)
      .replaceAll(`\`${canonicalSkill}\``, "the skill workflow below")
      .replaceAll("~/.config/opencode/prompts/sdd/", "../_shared/prompts/sdd/")
      .replaceAll("~/.config/opencode/skills/sdd/_shared/", "../_shared/sdd/");
    writeFileSync(skillFile, `${command.trimEnd()}\n\n## Skill workflow\n\n${skillBody}\n`);
    rmSync(commandFile);
  }
}

// Generate settings.json template for Claude Code with proper permissions structure
// Preserves canonical credential-file read denials using supported deny semantics
function generateClaudeSettings(outDir) {
  const opencodePath = join(ROOT, "adapters/opencode/opencode.json");
  const opencodeCfg = existsSync(opencodePath) ? JSON.parse(readFileSync(opencodePath, "utf8")) : {};
  const opencodePermissions = opencodeCfg.permission || {};

  // Claude Code groups tool rules by action.
  const permissions = {allow: [], ask: [], deny: []};
  for (const [key, tool] of [["bash", "Bash"], ["read", "Read"]]) {
    const rules = {...opencodePermissions[key]};
    if (key === "read") {
      for (const pattern of ["**/.env", "**/.env.*", "*.env", "*.env.*"]) {
        rules[pattern] = "deny";
      }
    }
    for (const [pattern, action] of Object.entries(rules)) {
      if (!Object.hasOwn(permissions, action)) continue;
      permissions[action].push(`${tool}(${pattern})`);
      // Claude Code's unanchored file rules apply only under cwd. Keep recursive
      // credential denials effective for absolute paths outside the project too.
      if (tool === "Read" && action === "deny" && pattern.startsWith("**/")) {
        permissions.deny.push(`Read(//${pattern})`);
      }
    }
  }

  const settings = {
    // Claude Code settings template
    // Translated from OpenCode's permission model.
    // Credential-file read denials are preserved using Claude Code's deny semantics.
    // Granular task permissions (subagent delegation) are not supported in Claude Code.
    // These are documented but not enforced at the same granularity.
    permissions
  };
  const settingsPath = join(outDir, ".claude/settings.json");
  mkdirSync(dirname(settingsPath), {recursive: true});
  writeFileSync(settingsPath, JSON.stringify(settings, null, 2) + "\n");
}

// Generate MCP template in native format for the target runtime
// Claude Code: usable .mcp.json with mcpServers, local entries use command string + args array
// All servers disabled by default using an empty mcpServers object with documentation
function generateMcpTemplate(outDir, target) {
  const opencodePath = join(ROOT, "adapters/opencode/opencode.json");
  if (!existsSync(opencodePath)) return;
  const cfg = JSON.parse(readFileSync(opencodePath, "utf8"));
  const mcpServers = cfg.mcp?.servers || {};

  // Build server definitions for documentation
  const serverDocs = {};
  for (const [name, server] of Object.entries(mcpServers)) {
    const doc = {description: `MCP server: ${name}`};
    if (server.type === "local" && Array.isArray(server.command)) {
      doc.command = server.command[0] || "";
      doc.args = server.command.slice(1) || [];
      if (server.environment) {
        doc.env = server.environment;
      }
    } else if (server.type === "remote" && server.url) {
      doc.url = server.url;
      if (server.headers) {
        doc.headers = server.headers;
      }
    }
    doc.disabled = true;
    serverDocs[name] = doc;
  }

  if (target === "claude-code") {
    // Claude Code: .mcp.json at project root with native mcpServers format
    // Claude Code does not support a "disabled" field, so we emit an empty mcpServers
    // object with documentation on how to enable each server.
    const mcpTemplate = {
      // MCP server template — all servers disabled by default.
      // Claude Code does not support disabling servers inline.
      // To enable a server, copy its definition from the documentation below
      // into the mcpServers object and remove the "disabled" key.
      // MCP setup is inherently machine-specific.
      //
      // Available servers (copy and enable manually):
      // ${JSON.stringify(serverDocs, null, 2)}
      mcpServers: {}
    };
    writeFileSync(join(outDir, ".mcp.json"), JSON.stringify(mcpTemplate, null, 2) + "\n");
  } else if (target === "junie") {
    // Junie CLI: .junie/mcp/mcp.json with native mcpServers format
    const junieMcpDir = join(outDir, ".junie/mcp");
    mkdirSync(junieMcpDir, {recursive: true});
    const mcpTemplate = {
      // MCP server template — all servers disabled by default.
      // To enable a server, set "disabled": false and configure authentication.
      // MCP setup is inherently machine-specific.
      mcpServers: {}
    };
    writeFileSync(join(junieMcpDir, "mcp.json"), JSON.stringify(mcpTemplate, null, 2) + "\n");
  }
}

// Replace OpenCode-specific paths and placeholders in markdown files for non-OpenCode targets
function replaceOpencodePaths(outDir, bundled, target) {
  const harnessRoot = target === "opencode" ? "~/.config/opencode" : ".";
  const allFiles = [...bundled];

  // Also include post-generated files
  const generatedDirs = [];
  if (target === "claude-code") {
    generatedDirs.push(".claude");
  } else if (target === "junie") {
    generatedDirs.push(".junie");
  }

  for (const rel of allFiles) {
    processMarkdownFile(outDir, rel, harnessRoot, target);
  }
  // Process post-generated files
  for (const dir of generatedDirs) {
    walkAndProcess(outDir, dir, harnessRoot, target);
  }
}

function processMarkdownFile(outDir, rel, harnessRoot, target) {
  if (!rel.endsWith(".md")) return;
  const abs = join(outDir, rel);
  if (!existsSync(abs)) return;
  try {
    let text = readFileSync(abs, "utf8");
    let replaced = text;
    if (target !== "opencode") {
      replaced = replaced.replace(/~\/\.config\/opencode\//g, "");
    }
    // Shell placeholders are used inside double quotes.
    const shellRoot = target === "opencode" ? "$HOME/.config/opencode" : harnessRoot;
    const skillPath = dirname(rel).split(sep).join("/");
    const skillDir = target === "opencode" ? `${shellRoot}/${skillPath}` : skillPath;
    replaced = replaced.replaceAll("{harnessShell}", () => shellRoot);
    replaced = replaced.replaceAll("{skillDir}", () => skillDir);
    // Resolve {harness} placeholder
    replaced = replaced.replace(/\{harness\}/g, harnessRoot);
    if (replaced !== text) {
      writeFileSync(abs, replaced);
    }
  } catch {
    // Skip binary files
  }
}

function walkAndProcess(baseDir, relDir, harnessRoot, target) {
  const absDir = join(baseDir, relDir);
  if (!existsSync(absDir)) return;
  const entries = readdirSync(absDir, {withFileTypes: true});
  for (const e of entries) {
    if (e.name === ".DS_Store") continue;
    const abs = join(absDir, e.name);
    if (e.isDirectory()) {
      walkAndProcess(baseDir, join(relDir, e.name), harnessRoot, target);
    } else if (e.name.endsWith(".md")) {
      const rel = join(relDir, e.name);
      processMarkdownFile(baseDir, rel, harnessRoot, target);
    }
  }
}

function list(target = "opencode") {
  const adapterPath = `adapters/${target}/adapter.json`;
  const adapter = loadJson(adapterPath);
  for (const f of resolveBundle(adapter)) {
    console.log(destFor(f, target));
  }
}

function renderAll() {
  for (const target of Object.keys(ADAPTERS)) {
    const output = resolve(ROOT, `distribution/${target}`);
    render(output, target);
  }
}

const require = createRequire(import.meta.url);

const [, , cmd = "render", ...rest] = process.argv;
const args = {};
for (let i = 0; i < rest.length; i += 1) {
  const option = rest[i];
  if (option === "--target") {
    const value = rest[++i];
    if (!value || value.startsWith("--")) {
      throw new Error("--target requires a target name (opencode, claude-code, junie)");
    }
    args.target = value;
  } else if (option === "--output") {
    const value = rest[++i];
    if (!value || value.startsWith("--")) {
      throw new Error("--output requires a directory path");
    }
    args.output = value;
  } else {
    throw new Error(`unknown option '${option}' (supported: --target, --output)`);
  }
}

const target = args.target || "opencode";
const defaultOutput = resolve(ROOT, `distribution/${target}`);
const output = args.output || defaultOutput;

if (cmd === "render") {
  render(output, target);
} else if (cmd === "list") {
  list(target);
} else if (cmd === "render-all") {
  renderAll();
} else if (cmd === "--help" || cmd === "-h") {
  console.log(
      "Usage: node scripts/generate-bundle.mjs [render|list|render-all] [--target <target>] [--output <dir>]\n" +
      "Targets: opencode, claude-code, junie\n" +
      "Default target: opencode"
  );
} else {
  throw new Error(`unknown command '${cmd}' (render|list|render-all)`);
}
