import assert from "node:assert/strict";
import {after, test} from "node:test";
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync
} from "node:fs";
import {join, resolve} from "node:path";
import {fileURLToPath} from "node:url";
import {spawnSync} from "node:child_process";

const ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));
const sandbox = mkdtempSync(join(ROOT, "tmp", "antigravity-cli-test-"));
const bundle = join(sandbox, "distribution", "antigravity");
const node = process.execPath;

after(() => {
  rmSync(sandbox, {recursive: true, force: true});
});

function markdownFiles(dir) {
  if (!existsSync(dir)) {
    return [];
  }
  const files = [];
  for (const entry of readdirSync(dir, {withFileTypes: true})) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...markdownFiles(path));
    } else if (entry.name.endsWith(".md")) {
      files.push(path);
    }
  }
  return files;
}

test("renders and validates a native Antigravity CLI project bundle", () => {
  const rendered = spawnSync(node, [
    join(ROOT, "scripts/generate-bundle.mjs"),
    "render",
    "--target",
    "antigravity",
    "--output",
    bundle
  ], {cwd: ROOT, encoding: "utf8"});
  assert.equal(rendered.status, 0, rendered.stderr || rendered.stdout);

  const instructions = join(bundle, "AGENTS.md");
  assert.ok(existsSync(instructions), "root AGENTS.md is required");
  assert.ok(!readFileSync(instructions, "utf8").includes("~/.config/opencode"));

  const manifest = JSON.parse(readFileSync(join(bundle, "manifest.json"), "utf8"));
  assert.equal(manifest.target, "antigravity");
  assert.ok(manifest.files.includes("AGENTS.md"));

  const skillsDir = join(bundle, ".agents/skills");
  const skills = markdownFiles(skillsDir).filter(path => path.endsWith("/SKILL.md"));
  assert.ok(skills.length >= 100, `expected shared skills, found ${skills.length}`);
  for (const skill of skills) {
    const content = readFileSync(skill, "utf8");
    const frontmatter = content.match(/^---\n([\s\S]*?)\n---/);
    assert.ok(frontmatter, `${skill} must have YAML frontmatter`);
    assert.match(frontmatter[1], /^name:\s*\S+/m, `${skill} needs a name`);
    assert.match(frontmatter[1], /^description:\s*\S+/m,
        `${skill} needs a description`);
  }

  for (const name of ["a11y-expert", "review", "sdd-apply"]) {
    assert.ok(existsSync(join(skillsDir, name, "SKILL.md")),
        `expected command skill ${name}`);
  }
  const sddApply = readFileSync(join(skillsDir, "sdd-apply/SKILL.md"), "utf8");
  const sddFrontmatter = sddApply.match(/^---\n([\s\S]*?)\n---/)[1];
  assert.doesNotMatch(sddFrontmatter, /^(agent|subtask):/m);
  assert.match(sddApply, /## Skill workflow/);
  const buildAndRun = readFileSync(
      join(skillsDir, "build-and-run-macos-app/SKILL.md"), "utf8");
  assert.match(buildAndRun,
      /\.\.\/build-run-debug\/references\/run-button-bootstrap\.md/);
  assert.doesNotMatch(buildAndRun, /\.\.\/skills\/macos\/build-run-debug/);

  const agentFiles = markdownFiles(join(bundle, ".agents/agents"))
      .filter(path => path.endsWith("/agent.md"));
  assert.ok(agentFiles.length > 0, "native agent definitions are required");
  for (const agent of agentFiles) {
    const content = readFileSync(agent, "utf8");
    const frontmatter = content.match(/^---\n([\s\S]*?)\n---/);
    assert.ok(frontmatter, `${agent} must have YAML frontmatter`);
    assert.match(frontmatter[1], /^name:\s*\S+/m);
    assert.match(frontmatter[1], /^description:\s*\S+/m);
    assert.match(frontmatter[1], /^subagent:\s*true$/m);
    const body = content.slice(frontmatter[0].length);
    assert.doesNotMatch(body,
        /^---\n(?:name|description|disable-model-invocation|user-invocable):/m,
        `${agent} must not retain nested OpenCode frontmatter`);
  }

  const mcpPath = join(bundle, ".agents/mcp_config.json");
  const mcp = JSON.parse(readFileSync(mcpPath, "utf8"));
  assert.deepEqual(mcp.mcpServers, {});
  assert.ok(!existsSync(join(bundle, "opencode.json")));

  const invalidSkill = join(skillsDir, "a11y-expert/SKILL.md");
  const original = readFileSync(invalidSkill, "utf8");
  try {
    writeFileSync(invalidSkill, original.replace(/^description:[^\n]*\n/m, ""));
    const validation = spawnSync(node, [
      join(ROOT, "scripts/check-refs.mjs"),
      "--root",
      bundle,
      "--target",
      "antigravity"
    ], {cwd: ROOT, encoding: "utf8"});
    assert.notEqual(validation.status, 0,
        "validation must reject a skill with no description");
  } finally {
    writeFileSync(invalidSkill, original);
  }
});