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
import {dirname, join, resolve} from "node:path";
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
  
  // Generate target-specific files
  if (target === "claude-code") {
    generateClaudeMd(outDir, bundled);
    generateAgentFiles(outDir, target);
    generateCommandFiles(outDir, target);
    generateSkillsDir(outDir, target);
    generateClaudeSettings(outDir);
    generateMcpTemplate(outDir);
    // Post-process: replace OpenCode-specific paths in all markdown files
    replaceOpencodePaths(outDir, bundled);
  } else if (target === "junie") {
    generateJunieAgentsMd(outDir, bundled);
    generateAgentFiles(outDir, target);
    generateCommandFiles(outDir, target);
    generateSkillsDir(outDir, target);
    generateMcpTemplate(outDir);
    // Post-process: replace OpenCode-specific paths in all markdown files
    replaceOpencodePaths(outDir, bundled);
  }
  
  const manifest = {
    generator: "scripts/generate-bundle.mjs",
    target,
    flatten: {[`${prefix}**`]: "**"},
    pruned,
    files: [...bundled].sort(),
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
function generateClaudeMd(outDir, bundled) {
  const orchestratorPath = join(ROOT, "prompts/ORCHESTRATOR.md");
  const controlledLanguagePath = join(ROOT, "prompts/communication/CONTROLLED_LANGUAGE.md");
  const writingStylePath = join(ROOT, "prompts/acs/WRITING_STYLE.md");

  let orchestrator = "";
  let controlledLanguage = "";
  let writingStyle = "";

  if (existsSync(orchestratorPath)) {
    orchestrator = readFileSync(orchestratorPath, "utf8");
  }
  if (existsSync(controlledLanguagePath)) {
    controlledLanguage = readFileSync(controlledLanguagePath, "utf8");
  }
  if (existsSync(writingStylePath)) {
    writingStyle = readFileSync(writingStylePath, "utf8");
  }

  // Build CLAUDE.md from orchestrator and shared prompts
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
Use / to list available skills.

## Commands

Custom commands are available via their skill names.
`;

  const claudeDir = join(outDir, ".claude");
  mkdirSync(claudeDir, {recursive: true});
  writeFileSync(join(claudeDir, "CLAUDE.md"), claudeMd);
  // Also write CLAUDE.md at the bundle root for project-level discovery
  writeFileSync(join(outDir, "CLAUDE.md"), claudeMd);
}

// Generate AGENTS.md for Junie target
function generateJunieAgentsMd(outDir, bundled) {
  const orchestratorPath = join(ROOT, "prompts/ORCHESTRATOR.md");
  const controlledLanguagePath = join(ROOT, "prompts/communication/CONTROLLED_LANGUAGE.md");
  const writingStylePath = join(ROOT, "prompts/acs/WRITING_STYLE.md");

  let orchestrator = "";
  let controlledLanguage = "";
  let writingStyle = "";

  if (existsSync(orchestratorPath)) {
    orchestrator = readFileSync(orchestratorPath, "utf8");
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

// Generate command files with translated paths
function generateCommandFiles(outDir, target) {
  const cmdsDir = join(ROOT, "commands");
  if (!existsSync(cmdsDir)) return;

  let destDir;
  let pathPrefix;
  if (target === "claude-code") {
    destDir = join(outDir, ".claude/commands");
    pathPrefix = "";
  } else if (target === "junie") {
    destDir = join(outDir, ".junie/commands");
    pathPrefix = "";
  } else {
    return;
  }

  mkdirSync(destDir, {recursive: true});

  const files = readdirSync(cmdsDir).filter((f) => f.endsWith(".md")).sort();
  for (const name of files) {
    const src = join(cmdsDir, name);
    let text = readFileSync(src, "utf8");
    // Replace OpenCode-specific paths with relative paths
    text = text.replace(/~\/\.config\/opencode\//g, pathPrefix || "");
    writeFileSync(join(destDir, name), text);
  }
}

// Generate skills directory
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

  // Copy entire skills directory recursively
  cpSync(skillsSrc, destDir, {recursive: true});
}

// Generate settings.json template for Claude Code
function generateClaudeSettings(outDir) {
  const settings = {
    // Claude Code settings template
    // Granular task permissions from OpenCode are not supported in Claude Code.
    // These are documented but not enforced.
    allow: {
      // Allow all tools by default; review manually for sensitive operations
    },
    // Note: OpenCode's permission.task block (allowing specific subagent delegation)
    // has no equivalent in Claude Code. These permissions are documented but not enforced.
  };
  const settingsPath = join(outDir, ".claude/settings.json");
  mkdirSync(dirname(settingsPath), {recursive: true});
  writeFileSync(settingsPath, JSON.stringify(settings, null, 2) + "\n");
}

// Generate MCP template
function generateMcpTemplate(outDir) {
  const opencodePath = join(ROOT, "adapters/opencode/opencode.json");
  if (!existsSync(opencodePath)) return;
  const cfg = JSON.parse(readFileSync(opencodePath, "utf8"));
  const mcpServers = cfg.mcp?.servers || {};

  const mcpTemplate = {
    // MCP server template — all servers disabled by default.
    // Enable and configure manually per runtime.
    // MCP setup is inherently machine-specific.
    servers: {}
  };

  for (const [name, server] of Object.entries(mcpServers)) {
    mcpTemplate.servers[name] = {
      disabled: true,
      command: Array.isArray(server.command) ? server.command : [],
      type: server.type || "local",
      url: server.url || "",
      environment: server.environment || {},
      headers: server.headers || {},
      note: "Enable manually and configure authentication as needed"
    };
  }

  writeFileSync(join(outDir, "mcp.json"), JSON.stringify(mcpTemplate, null, 2) + "\n");
}

// Replace OpenCode-specific paths in markdown files for non-OpenCode targets
function replaceOpencodePaths(outDir, bundled) {
  for (const rel of bundled) {
    if (!rel.endsWith(".md")) continue;
    const abs = join(outDir, rel);
    if (!existsSync(abs)) continue;
    try {
      let text = readFileSync(abs, "utf8");
      const replaced = text.replace(/~\/\.config\/opencode\//g, "");
      if (replaced !== text) {
        writeFileSync(abs, replaced);
      }
    } catch {
      // Skip binary files
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
