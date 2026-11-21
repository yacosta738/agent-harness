#!/usr/bin/env node
// Cross-target validation for multi-runtime distribution.
// Checks that each generated bundle meets its target's requirements.
//
//   node scripts/validate-targets.mjs [--root <distribution-dir>]
//
// Checks per target:
//   opencode:
//     - opencode.json exists and is valid JSON
//     - All {file:} refs resolve
//     - Skills have valid SKILL.md files
//   claude-code:
//     - CLAUDE.md exists at root
//     - .claude/skills/ contains skills with SKILL.md
//     - No opencode-specific references leak
//   junie:
//     - .junie/AGENTS.md exists
//     - .junie/skills/ contains skills with SKILL.md
//     - No opencode-specific references leak

import {
  existsSync,
  readdirSync,
  readFileSync,
} from "node:fs";
import {dirname, join, resolve} from "node:path";
import {fileURLToPath} from "node:url";
import {checkBundleFile} from "./bundle-paths.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const FAILURES = [];
const WARNINGS = [];

function fail(msg) {
  FAILURES.push(msg);
  console.log(`FAIL: ${msg}`);
}

function warn(msg) {
  WARNINGS.push(msg);
  console.log(`WARN: ${msg}`);
}

function ok(msg) {
  console.log(`OK: ${msg}`);
}

// Find all SKILL.md files in a directory tree
function findSkillMds(dir, prefix = "") {
  const results = [];
  if (!existsSync(dir)) {
    return results;
  }
  const entries = readdirSync(dir, {withFileTypes: true});
  for (const e of entries) {
    if (e.name === ".DS_Store") {
      continue;
    }
    const abs = join(dir, e.name);
    const rel = prefix ? `${prefix}/${e.name}` : e.name;
    if (e.isDirectory()) {
      results.push(...findSkillMds(abs, rel));
    } else if (e.name === "SKILL.md") {
      results.push({abs, rel});
    }
  }
  return results;
}

// Parse YAML frontmatter and check for duplicate keys
function parseAndValidateFrontmatter(absPath, relPath) {
  try {
    const content = readFileSync(absPath, "utf8");
    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
    if (!frontmatterMatch) {
      fail(`${relPath}: missing YAML frontmatter`);
      return null;
    }
    const frontmatter = frontmatterMatch[1];
    // Check for duplicate keys
    const keys = [];
    for (const line of frontmatter.split("\n")) {
      const m = line.match(/^(\w+):\s*/);
      if (m) {
        const key = m[1];
        if (keys.includes(key)) {
          fail(`${relPath}: duplicate YAML key '${key}' in frontmatter`);
        }
        keys.push(key);
      }
    }
    const hasName = /^name:/m.test(frontmatter);
    const hasDescription = /^description:/m.test(frontmatter);
    if (!hasName) {
      warn(`${relPath}: missing 'name' in frontmatter`);
    }
    if (!hasDescription) {
      warn(`${relPath}: missing 'description' in frontmatter`);
    }
    return {keys, hasName, hasDescription, content};
  } catch (e) {
    fail(`${relPath}: cannot read file - ${e.message}`);
    return null;
  }
}

// Validate SKILL.md frontmatter (legacy wrapper)
function validateSkillMd(absPath, relPath) {
  return parseAndValidateFrontmatter(absPath, relPath) !== null;
}

// Check for OpenCode-specific references that shouldn't leak
function checkNoOpenCodeLeaks(dir, target, prefix = "") {
  const entries = readdirSync(dir, {withFileTypes: true});
  for (const e of entries) {
    if (e.name === ".DS_Store" || e.name === "manifest.json") {
      continue;
    }
    const abs = join(dir, e.name);
    const rel = prefix ? `${prefix}/${e.name}` : e.name;
    if (e.isDirectory()) {
      checkNoOpenCodeLeaks(abs, target, rel);
    } else if (e.name.endsWith(".md") || e.name.endsWith(".json")) {
      try {
        const content = readFileSync(abs, "utf8");
        // Check for OpenCode-specific paths
        if (content.includes("~/.config/opencode/")) {
          fail(`${target}/${rel}: contains OpenCode-specific path ~/.config/opencode/`);
        }
        if (content.includes("{file:./prompts/") && target !== "opencode") {
          // {file:} syntax is OpenCode-specific
          warn(`${target}/${rel}: contains {file:} reference (OpenCode-specific)`);
        }
      } catch {
        // Skip binary files
      }
    }
  }
}

// Validate OpenCode bundle
function validateOpenCode(bundleRoot) {
  console.log("\n--- Validating OpenCode ---");
  const opencodeJson = join(bundleRoot, "opencode.json");
  if (!existsSync(opencodeJson)) {
    fail("opencode: opencode.json not found");
    return;
  }
  ok("opencode: opencode.json exists");

  try {
    const cfg = JSON.parse(readFileSync(opencodeJson, "utf8"));
    // Validate {file:} refs in agent prompts against the bundle
    const agentCount = Object.keys(cfg.agent || {}).length;
    // Validate {file:} refs in agent prompts
    const fileRefPattern = /\{file:([^}]+)\}/g;
    let allRefsOk = true;
    for (const [name, def] of Object.entries(cfg.agent || {})) {
      if (!def.prompt) continue;
      const refs = [];
      let m;
      while ((m = fileRefPattern.exec(def.prompt)) !== null) {
        refs.push(m[1]);
      }
      for (const ref of refs) {
        const prefix = "~/.config/opencode/";
        const path = ref.startsWith(prefix) ? ref.slice(prefix.length) : ref;
        const result = checkBundleFile(bundleRoot, path);
        if (result !== true) {
          const reason = result === "outside" ? "escapes the bundle root"
            : result === "not-file" ? "is not a file" : "is missing";
          fail(`opencode: agent '${name}' reference {file:${ref}} ${reason}`);
          allRefsOk = false;
        }
      }
    }
    if (allRefsOk) {
      ok(`opencode: ${agentCount} agents registered with valid references`);
    }
  } catch (e) {
    fail(`opencode: opencode.json is not valid JSON - ${e.message}`);
  }

  // Check skills
  const skillsDir = join(bundleRoot, "skills");
  const skills = findSkillMds(skillsDir);
  ok(`opencode: ${skills.length} skills found`);
  for (const skill of skills) {
    validateSkillMd(skill.abs, skill.rel);
  }
}

// Validate Claude Code bundle
function validateClaudeCode(bundleRoot) {
  console.log("\n--- Validating Claude Code ---");
  const claudeMd = join(bundleRoot, "CLAUDE.md");
  if (!existsSync(claudeMd)) {
    fail("claude-code: CLAUDE.md not found at root");
  } else {
    ok("claude-code: CLAUDE.md exists at root");
  }

  // Check .claude/skills/
  const skillsDir = join(bundleRoot, ".claude", "skills");
  const skills = findSkillMds(skillsDir);
  if (skills.length === 0) {
    warn("claude-code: no skills found in .claude/skills/");
  } else {
    ok(`claude-code: ${skills.length} skills in .claude/skills/`);
    for (const skill of skills) {
      validateSkillMd(skill.abs, skill.rel);
    }
  }

  // Check .claude/agents/
  const agentsDir = join(bundleRoot, ".claude", "agents");
  if (existsSync(agentsDir)) {
    const agentFiles = readdirSync(agentsDir).filter(f => f.endsWith(".md")).sort();
    let agentsValid = 0;
    for (const af of agentFiles) {
      const abs = join(agentsDir, af);
      const content = readFileSync(abs, "utf8");
      const fm = content.match(/^---\n([\s\S]*?)\n---/);
      if (fm) {
        const hasName = /^name:/m.test(fm[1]);
        const hasDesc = /^description:/m.test(fm[1]);
        if (hasName && hasDesc) agentsValid++;
        else warn(`claude-code: agent '${af}' missing name or description`);
      }
    }
    ok(`claude-code: ${agentsValid}/${agentFiles.length} agents valid in .claude/agents`);
  }

  // Check .claude/commands/
  const cmdsDir = join(bundleRoot, ".claude", "commands");
  if (existsSync(cmdsDir)) {
    const cmdFiles = readdirSync(cmdsDir).filter(f => f.endsWith(".md")).sort();
    let cmdsValid = 0;
    for (const cf of cmdFiles) {
      const abs = join(cmdsDir, cf);
      const content = readFileSync(abs, "utf8");
      const fm = content.match(/^---\n([\s\S]*?)\n---/);
      if (fm) {
        const hasName = /^name:/m.test(fm[1]);
        if (hasName) cmdsValid++;
        else warn(`claude-code: command '${cf}' missing name in frontmatter`);
      }
    }
    ok(`claude-code: ${cmdsValid}/${cmdFiles.length} commands valid in .claude/commands`);
  }

  // Check .claude/settings.json
  const settingsPath = join(bundleRoot, ".claude", "settings.json");
  if (existsSync(settingsPath)) {
    try {
      const settings = JSON.parse(readFileSync(settingsPath, "utf8"));
      const perms = settings.permissions;
      if (perms && Array.isArray(perms.allow) && Array.isArray(perms.ask) && Array.isArray(perms.deny)) {
        ok(`claude-code: settings.json permissions valid (allow: ${perms.allow.length}, ask: ${perms.ask.length}, deny: ${perms.deny.length})`);
      } else {
        fail("claude-code: settings.json permissions missing allow/ask/deny arrays");
      }
    } catch (e) {
      fail(`claude-code: settings.json is not valid JSON - ${e.message}`);
    }
  }

  // Check .mcp.json
  const mcpPath = join(bundleRoot, ".mcp.json");
  if (existsSync(mcpPath)) {
    try {
      const mcp = JSON.parse(readFileSync(mcpPath, "utf8"));
      if (mcp.mcpServers !== undefined) {
        ok("claude-code: .mcp.json: valid structure with mcpServers");
      } else {
        fail("claude-code: .mcp.json missing mcpServers key");
      }
    } catch (e) {
      fail(`claude-code: .mcp.json is not valid JSON - ${e.message}`);
    }
  }

  // Cross-reference validation: check relative paths in skills resolve
  const claudeSkillsDir = join(bundleRoot, ".claude", "skills");
  if (existsSync(claudeSkillsDir)) {
    const claudeSkills = findSkillMds(claudeSkillsDir);
    for (const skill of claudeSkills) {
      const content = readFileSync(skill.abs, "utf8");
      // Check relative path references like ../_shared/...
      const relRefs = [...content.matchAll(/\.\.\/[^\s`"<]+/g)].map(m => m[0]);
      for (const ref of relRefs) {
        const resolved = resolve(dirname(skill.abs), ref);
        if (!existsSync(resolved)) {
          // Check if it's a directory reference (may end with /)
          const dirRef = ref.endsWith("/") ? ref : ref.replace(/\/[\w.-]+$/, "/");
          const dirResolved = resolve(dirname(skill.abs), dirRef);
          if (!existsSync(dirResolved)) {
            warn(`claude-code: ${skill.rel}: relative reference '${ref}' does not resolve`);
          }
        }
      }
    }
  }

  // Check for leaks
  checkNoOpenCodeLeaks(bundleRoot, "claude-code");
}

// Validate Junie bundle
function validateJunie(bundleRoot) {
  console.log("\n--- Validating Junie ---");
  const agentsMd = join(bundleRoot, ".junie", "AGENTS.md");
  if (!existsSync(agentsMd)) {
    fail("junie: .junie/AGENTS.md not found");
  } else {
    ok("junie: .junie/AGENTS.md exists");
  }

  // Check .junie/skills/
  const skillsDir = join(bundleRoot, ".junie", "skills");
  const skills = findSkillMds(skillsDir);
  if (skills.length === 0) {
    warn("junie: no skills found in .junie/skills/");
  } else {
    ok(`junie: ${skills.length} skills in .junie/skills/`);
    for (const skill of skills) {
      validateSkillMd(skill.abs, skill.rel);
    }
  }

  // Check .junie/agents/
  const agentsDir = join(bundleRoot, ".junie", "agents");
  if (existsSync(agentsDir)) {
    const agentFiles = readdirSync(agentsDir).filter(f => f.endsWith(".md")).sort();
    let agentsValid = 0;
    for (const af of agentFiles) {
      const abs = join(agentsDir, af);
      const content = readFileSync(abs, "utf8");
      const fm = content.match(/^---\n([\s\S]*?)\n---/);
      if (fm) {
        const hasName = /^name:/m.test(fm[1]);
        const hasDesc = /^description:/m.test(fm[1]);
        if (hasName && hasDesc) agentsValid++;
        else warn(`junie: agent '${af}' missing name or description`);
      }
    }
    ok(`junie: ${agentsValid}/${agentFiles.length} agents valid in .junie/agents`);
  }

  // Check .junie/commands/
  const cmdsDir = join(bundleRoot, ".junie", "commands");
  if (existsSync(cmdsDir)) {
    const cmdFiles = readdirSync(cmdsDir).filter(f => f.endsWith(".md")).sort();
    let cmdsValid = 0;
    for (const cf of cmdFiles) {
      const abs = join(cmdsDir, cf);
      const content = readFileSync(abs, "utf8");
      const fm = content.match(/^---\n([\s\S]*?)\n---/);
      if (fm) {
        const hasName = /^name:/m.test(fm[1]);
        if (hasName) cmdsValid++;
        else warn(`junie: command '${cf}' missing name in frontmatter`);
      }
    }
    ok(`junie: ${cmdsValid}/${cmdFiles.length} commands valid in .junie/commands`);
  }

  // Check .junie/mcp/mcp.json
  const mcpPath = join(bundleRoot, ".junie", "mcp", "mcp.json");
  if (existsSync(mcpPath)) {
    try {
      const mcp = JSON.parse(readFileSync(mcpPath, "utf8"));
      if (mcp.mcpServers !== undefined) {
        ok("junie: .junie/mcp/mcp.json: valid structure with mcpServers");
      } else {
        fail("junie: .junie/mcp/mcp.json missing mcpServers key");
      }
    } catch (e) {
      fail(`junie: .junie/mcp/mcp.json is not valid JSON - ${e.message}`);
    }
  }

  // Cross-reference validation: check relative paths in skills resolve
  const junieSkillsDir = join(bundleRoot, ".junie", "skills");
  if (existsSync(junieSkillsDir)) {
    const skills = findSkillMds(junieSkillsDir);
    for (const skill of skills) {
      const content = readFileSync(skill.abs, "utf8");
      const relRefs = [...content.matchAll(/\.\.\/[^\s`"<]+/g)].map(m => m[0]);
      for (const ref of relRefs) {
        const resolved = resolve(dirname(skill.abs), ref);
        if (!existsSync(resolved)) {
          const dirRef = ref.endsWith("/") ? ref : ref.replace(/\/[\w.-]+$/, "/");
          const dirResolved = resolve(dirname(skill.abs), dirRef);
          if (!existsSync(dirResolved)) {
            warn(`junie: ${skill.rel}: relative reference '${ref}' does not resolve`);
          }
        }
      }
    }
  }

  // Check for leaks
  checkNoOpenCodeLeaks(bundleRoot, "junie");
}

function main() {
  const args = process.argv.slice(2);
  let distRoot = join(ROOT, "distribution");

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--root") {
      distRoot = resolve(args[++i]);
    } else if (args[i] === "--help" || args[i] === "-h") {
      console.log("Usage: node scripts/validate-targets.mjs [--root <distribution-dir>]");
      return 0;
    }
  }

  if (!existsSync(distRoot)) {
    console.error(`Distribution directory not found: ${distRoot}`);
    return 1;
  }

  // Validate each target
  const opencodeDir = join(distRoot, "opencode");
  const claudeCodeDir = join(distRoot, "claude-code");
  const junieDir = join(distRoot, "junie");

  if (existsSync(opencodeDir)) {
    validateOpenCode(opencodeDir);
  } else {
    warn("OpenCode bundle not found, skipping");
  }

  if (existsSync(claudeCodeDir)) {
    validateClaudeCode(claudeCodeDir);
  } else {
    warn("Claude Code bundle not found, skipping");
  }

  if (existsSync(junieDir)) {
    validateJunie(junieDir);
  } else {
    warn("Junie bundle not found, skipping");
  }

  // Summary
  console.log("\n--- Summary ---");
  console.log(`Failures: ${FAILURES.length}`);
  console.log(`Warnings: ${WARNINGS.length}`);

  if (FAILURES.length > 0) {
    console.log("\nFailures:");
    for (const f of FAILURES) {
      console.log(`  - ${f}`);
    }
  }

  if (WARNINGS.length > 0) {
    console.log("\nWarnings:");
    for (const w of WARNINGS) {
      console.log(`  - ${w}`);
    }
  }

  return FAILURES.length > 0 ? 1 : 0;
}

process.exit(main());
