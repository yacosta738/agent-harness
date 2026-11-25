import assert from "node:assert/strict";
import {after, test} from "node:test";
import {
  copyFileSync,
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  renameSync,
  rmSync,
  writeFileSync
} from "node:fs";
import {dirname, join, relative, resolve, sep} from "node:path";
import {fileURLToPath} from "node:url";
import {spawnSync} from "node:child_process";
import {tmpdir} from "node:os";
import {
  parseYamlFrontmatter,
  parseYamlStringScalar
} from "../scripts/yaml-frontmatter.mjs";

const ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));
const sandbox = mkdtempSync(join(tmpdir(), "antigravity-cli-test-"));
const bundle = join(sandbox, "distribution", "antigravity");
const node = process.execPath;

after(() => {
  rmSync(sandbox, {recursive: true, force: true});
});

test("rejects YAML collections while preserving quoted flow-looking strings", () => {
  for (const value of ["[]", "[item]", "{}", "{key: value}", "- item",
    "key: value"]) {
    assert.equal(parseYamlStringScalar(value), null, value);
  }
  assert.equal(parseYamlStringScalar('"[]"'), "[]");
  assert.equal(parseYamlStringScalar("'{}'"), "{}");
});

test("rejects unsupported and malformed YAML escapes", () => {
  for (const value of ['"\\q"', '"\\xG1"', '"\\u123"',
    '"\\U00110000"']) {
    assert.equal(parseYamlStringScalar(value), null, value);
  }
});

test("decodes supported YAML escapes and escaped line continuations", () => {
  assert.equal(parseYamlStringScalar('"line\\n\\x41\\u0042\\U00000043"'),
      "line\nABC");
  assert.equal(parseYamlStringScalar('"first\\\n  second"'), "firstsecond");
});

test("parses multiline YAML frontmatter and keeps collection values non-string", () => {
  const frontmatter = parseYamlFrontmatter([
    "name: example",
    "description: |",
    "  first line",
    "  second line",
    "summary: >",
    "  folded",
    "  line",
    "items: []"
  ].join("\n"));
  assert.equal(frontmatter.name, "example");
  assert.equal(frontmatter.description, "first line\nsecond line\n");
  assert.equal(frontmatter.summary, "folded line\n");
  assert.equal(frontmatter.items, null);
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

  const globalRulesDir = join(bundle, "global/rules");
  for (const name of ["writing-style.md", "controlled-language.md"]) {
    const rulePath = join(globalRulesDir, name);
    assert.ok(existsSync(rulePath), `expected global Antigravity rule ${name}`);
    assert.ok(manifest.files.includes(`global/rules/${name}`));
    const content = readFileSync(rulePath, "utf8");
    const frontmatter = content.match(/^---\n([\s\S]*?)\n---\n/);
    assert.ok(frontmatter, `${name} must have YAML frontmatter`);
    assert.equal(parseYamlFrontmatter(frontmatter[1]).trigger, "always_on");
  }
  const writingStyle = readFileSync(
      join(globalRulesDir, "writing-style.md"), "utf8");
  assert.doesNotMatch(writingStyle,
      /prompts\/communication\/CONTROLLED_LANGUAGE\.md/);
  assert.ok(!existsSync(join(bundle, "global/AGENTS.md")),
      "project instructions must not be exposed as global instructions");

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

  const refsValidation = spawnSync(node, [
    join(ROOT, "scripts/check-refs.mjs"),
    "--root",
    bundle,
    "--target",
    "antigravity"
  ], {cwd: ROOT, encoding: "utf8"});
  assert.equal(refsValidation.status, 0,
      refsValidation.stderr || refsValidation.stdout);

  const targetValidation = spawnSync(node, [
    join(ROOT, "scripts/validate-targets.mjs"),
    "--root",
    join(sandbox, "distribution")
  ], {cwd: ROOT, encoding: "utf8"});
  assert.equal(targetValidation.status, 0,
      targetValidation.stderr || targetValidation.stdout);

  const claudeInstructions = join(bundle, "CLAUDE.md");
  writeFileSync(claudeInstructions, "# Claude Code instructions\n");
  try {
    const optionalSkillsValidation = spawnSync(node, [
      join(ROOT, "scripts/check-refs.mjs"),
      "--root",
      bundle,
      "--target",
      "claude-code"
    ], {cwd: ROOT, encoding: "utf8"});
    assert.equal(optionalSkillsValidation.status, 0,
        optionalSkillsValidation.stderr || optionalSkillsValidation.stdout);
  } finally {
    rmSync(claudeInstructions, {force: true});
  }

  const referenceSkill = join(skillsDir, "a11y-expert/SKILL.md");
  const originalReferenceSkill = readFileSync(referenceSkill, "utf8");

  try {
    writeFileSync(referenceSkill,
        originalReferenceSkill.replace(/^description:[^\n]*\n/m,
            'description: "" # empty after trailing comment\n'));
    const refsValidation = spawnSync(node, [
      join(ROOT, "scripts/check-refs.mjs"),
      "--root",
      bundle,
      "--target",
      "antigravity"
    ], {cwd: ROOT, encoding: "utf8"});
    const targetsValidation = spawnSync(node, [
      join(ROOT, "scripts/validate-targets.mjs"),
      "--root",
      join(sandbox, "distribution")
    ], {cwd: ROOT, encoding: "utf8"});
    for (const validation of [refsValidation, targetsValidation]) {
      assert.notEqual(validation.status, 0,
          "validators must reject empty quoted descriptions");
    }
  } finally {
    writeFileSync(referenceSkill, originalReferenceSkill);
  }

  const invalidDescriptionLines = [
    'description: "\\t" # escaped whitespace',
    "description: null # non-string YAML scalar",
    "description: \"" + "\\" + "\n" +
        "\" # escaped line continuation"
  ];
  for (const descriptionLine of invalidDescriptionLines) {
    try {
      writeFileSync(referenceSkill,
          originalReferenceSkill.replace(/^description:[^\n]*\n/m,
              `${descriptionLine}\n`));
      const refsValidation = spawnSync(node, [
        join(ROOT, "scripts/check-refs.mjs"),
        "--root",
        bundle,
        "--target",
        "antigravity"
      ], {cwd: ROOT, encoding: "utf8"});
      const targetsValidation = spawnSync(node, [
        join(ROOT, "scripts/validate-targets.mjs"),
        "--root",
        join(sandbox, "distribution")
      ], {cwd: ROOT, encoding: "utf8"});
      for (const validation of [refsValidation, targetsValidation]) {
        assert.notEqual(validation.status, 0,
            "validators must reject empty or non-string YAML descriptions");
      }
    } finally {
      writeFileSync(referenceSkill, originalReferenceSkill);
    }
  }

  try {
    writeFileSync(referenceSkill,
        originalReferenceSkill.replace(/^description:[^\n]*\n/m,
            'description: "A nonempty # quoted description" # trailing comment\n'));
    const refsValidation = spawnSync(node, [
      join(ROOT, "scripts/check-refs.mjs"),
      "--root",
      bundle,
      "--target",
      "antigravity"
    ], {cwd: ROOT, encoding: "utf8"});
    const targetsValidation = spawnSync(node, [
      join(ROOT, "scripts/validate-targets.mjs"),
      "--root",
      join(sandbox, "distribution")
    ], {cwd: ROOT, encoding: "utf8"});
    for (const validation of [refsValidation, targetsValidation]) {
      assert.equal(validation.status, 0,
          validation.stderr || validation.stdout);
    }
  } finally {
    writeFileSync(referenceSkill, originalReferenceSkill);
  }

  try {
    writeFileSync(referenceSkill,
        originalReferenceSkill.replace(/^description:[^\n]*\n/m,
            'description: "A nonempty\n  quoted description"\n'));
    const refsValidation = spawnSync(node, [
      join(ROOT, "scripts/check-refs.mjs"),
      "--root",
      bundle,
      "--target",
      "antigravity"
    ], {cwd: ROOT, encoding: "utf8"});
    const targetsValidation = spawnSync(node, [
      join(ROOT, "scripts/validate-targets.mjs"),
      "--root",
      join(sandbox, "distribution")
    ], {cwd: ROOT, encoding: "utf8"});
    for (const validation of [refsValidation, targetsValidation]) {
      assert.equal(validation.status, 0,
          validation.stderr || validation.stdout);
    }
  } finally {
    writeFileSync(referenceSkill, originalReferenceSkill);
  }

  try {
    writeFileSync(referenceSkill,
        originalReferenceSkill.replace(/^description:[^\n]*\n/m,
            'description: "\n  " # empty multiline value\n'));
    const refsValidation = spawnSync(node, [
      join(ROOT, "scripts/check-refs.mjs"),
      "--root",
      bundle,
      "--target",
      "antigravity"
    ], {cwd: ROOT, encoding: "utf8"});
    const targetsValidation = spawnSync(node, [
      join(ROOT, "scripts/validate-targets.mjs"),
      "--root",
      join(sandbox, "distribution")
    ], {cwd: ROOT, encoding: "utf8"});
    for (const validation of [refsValidation, targetsValidation]) {
      assert.notEqual(validation.status, 0,
          "validators must reject empty multiline quoted descriptions");
    }
  } finally {
    writeFileSync(referenceSkill, originalReferenceSkill);
  }

  try {
    const outsideReference = join(sandbox, "outside.md");
    writeFileSync(outsideReference, "outside bundle fixture\n");
    const outsideRef = relative(
        dirname(referenceSkill), outsideReference).split(sep).join("/");
    writeFileSync(referenceSkill,
        `${originalReferenceSkill}\n[Outside bundle](${outsideRef})\n` +
        "[Directory](../../..)\n");
    const validation = spawnSync(node, [
      join(ROOT, "scripts/validate-targets.mjs"),
      "--root",
      join(sandbox, "distribution")
    ], {cwd: ROOT, encoding: "utf8"});
    const output = `${validation.stdout}\n${validation.stderr}`;
    assert.notEqual(validation.status, 0,
        "validation must reject references outside the bundle and to directories");
    assert.match(output, /escapes the bundle root/);
    assert.match(output, /is not a file/);
  } finally {
    writeFileSync(referenceSkill, originalReferenceSkill);
  }

  const savedSkillsDir = join(bundle, ".agents/skills.original");
  renameSync(skillsDir, savedSkillsDir);
  try {
    const missingSkills = spawnSync(node, [
      join(ROOT, "scripts/check-refs.mjs"),
      "--root",
      bundle,
      "--target",
      "antigravity"
    ], {cwd: ROOT, encoding: "utf8"});
    const missingOutput = `${missingSkills.stdout}\n${missingSkills.stderr}`;
    assert.notEqual(missingSkills.status, 0,
        "validation must reject a missing required skills directory");
    assert.match(missingOutput, /skills: directory \.agents\/skills not found/);

    mkdirSync(skillsDir);
    const emptySkills = spawnSync(node, [
      join(ROOT, "scripts/check-refs.mjs"),
      "--root",
      bundle,
      "--target",
      "antigravity"
    ], {cwd: ROOT, encoding: "utf8"});
    const emptyOutput = `${emptySkills.stdout}\n${emptySkills.stderr}`;
    assert.notEqual(emptySkills.status, 0,
        "validation must reject a required skills directory with no SKILL.md files");
    assert.match(emptyOutput, /no SKILL\.md files found in \.agents\/skills/);
  } finally {
    rmSync(skillsDir, {recursive: true, force: true});
    renameSync(savedSkillsDir, skillsDir);
  }

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
    const output = `${validation.stdout}\n${validation.stderr}`;
    assert.notEqual(validation.status, 0,
        "validation must reject a skill with no description");
    assert.match(output, /a11y-expert\/SKILL\.md: frontmatter missing 'description'/);
  } finally {
    writeFileSync(invalidSkill, original);
  }

  const deployRoot = join(sandbox, "deploy-project");
  mkdirSync(deployRoot);
  for (const dir of ["adapters", "commands", "prompts", "scripts", "skills"]) {
    cpSync(join(ROOT, dir), join(deployRoot, dir), {recursive: true});
  }
  for (const file of ["README.md", "harness.config.json"]) {
    copyFileSync(join(ROOT, file), join(deployRoot, file));
  }
  mkdirSync(join(deployRoot, "node_modules"));
  cpSync(join(ROOT, "node_modules", "yaml"),
      join(deployRoot, "node_modules", "yaml"),
      {recursive: true, dereference: true});
  const staleBundle = join(deployRoot, "distribution/antigravity");
  mkdirSync(staleBundle, {recursive: true});
  writeFileSync(join(staleBundle, "AGENTS.md"), "stale Antigravity bundle\n");

  const allDeployment = spawnSync(node, [
    join(deployRoot, "scripts/deploy.mjs"),
    "all"
  ], {cwd: deployRoot, encoding: "utf8", timeout: 120_000});
  const deployOutput = `${allDeployment.stdout}\n${allDeployment.stderr}`;
  assert.equal(allDeployment.status, 0,
      deployOutput || "deploy all must replace stale bundles before validation");
  assert.ok(existsSync(join(staleBundle, ".agents/skills")),
      "deploy all must replace the stale Antigravity bundle");
  assert.equal((deployOutput.match(/^--- Validating .+ ---$/gm) || []).length, 4,
      "cross-target validation must run once after rendering all targets");
  assert.ok(deployOutput.lastIndexOf("--- Deploying antigravity ---") <
      deployOutput.indexOf("--- Validating OpenCode ---"),
  "cross-target validation must follow the final target render");
});