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
  statSync,
} from "node:fs";
import {dirname, join, resolve} from "node:path";
import {fileURLToPath} from "node:url";

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

// Validate SKILL.md frontmatter
function validateSkillMd(absPath, relPath) {
  try {
    const content = readFileSync(absPath, "utf8");
    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
    if (!frontmatterMatch) {
      fail(`${relPath}: missing YAML frontmatter`);
      return false;
    }
    const frontmatter = frontmatterMatch[1];
    const hasName = /^name:/.test(frontmatter);
    const hasDescription = /^description:/.test(frontmatter);
    if (!hasName) {
      warn(`${relPath}: missing 'name' in frontmatter`);
    }
    if (!hasDescription) {
      warn(`${relPath}: missing 'description' in frontmatter`);
    }
    return true;
  } catch (e) {
    fail(`${relPath}: cannot read file - ${e.message}`);
    return false;
  }
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
    ok(`opencode: ${Object.keys(cfg.agent || {}).length} agents registered`);
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
