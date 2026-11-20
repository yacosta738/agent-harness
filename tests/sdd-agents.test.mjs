import assert from 'node:assert/strict';
import {existsSync, readFileSync} from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import {fileURLToPath} from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const config = JSON.parse(
    readFileSync(path.join(root, 'adapters/opencode/opencode.json'), 'utf8'));
const PHASES = [
  'init', 'explore', 'propose', 'spec', 'design', 'tasks', 'apply', 'verify',
  'qa', 'archive'
];

test('registers the ten SDD phase executors as subagents', () => {
  for (const phase of PHASES) {
    const agent = config.agent[`sdd-${phase}`];
    assert.ok(agent, `missing sdd-${phase} agent`);
    assert.equal(agent.mode, 'subagent');
    const prompt = agent.prompt.match(/\{file:\.\/(.+)\}/)?.[1];
    assert.ok(prompt, `sdd-${phase} has no file reference prompt`);
    assert.ok(existsSync(path.join(root, prompt)), `missing ${prompt}`);
  }
});

test('onboarding is an inline skill and no longer a subagent', () => {
  assert.equal(config.agent['sdd-onboard'], undefined);
  assert.equal(existsSync(path.join(root, 'prompts/sdd/sdd-onboard.md')),
      false);
  const skill = readFileSync(
      path.join(root, 'skills/sdd/sdd-onboard/SKILL.md'), 'utf8');
  assert.doesNotMatch(skill, /delegate_only:\s*true/);
  assert.match(skill, /delegate/i);
});

test('delegated prompts stay brief and declare the phase contract', () => {
  for (const phase of PHASES) {
    const content = readFileSync(
        path.join(root, `prompts/sdd/sdd-${phase}.md`), 'utf8');
    const lines = content.trim().split('\n').length;
    assert.ok(lines <= 80, `sdd-${phase} prompt has ${lines} lines`);
    assert.match(content, /delegate_only:\s*true/);
    assert.match(content, /## Role/);
    assert.match(content, /## Inputs/);
    assert.match(content, /## Limits/);
    assert.match(content, /## Output/);
    assert.match(content, /## Tools/);
    assert.match(content, new RegExp(`\`sdd-${phase}\` skill`));
    assert.ok(existsSync(path.join(root, `skills/sdd/sdd-${phase}/SKILL.md`)),
        `missing skill for sdd-${phase}`);
  }
});

test('phase executors keep read and execution boundaries', () => {
  for (const phase of PHASES) {
    const agent = config.agent[`sdd-${phase}`];
    const permission = agent.permission ?? {};

    assert.ok(!('tools' in agent),
        `sdd-${phase} must not use the legacy tools map`);
    assert.notEqual(permission.read, 'deny',
        `sdd-${phase} must be able to read`);
    assert.notEqual(permission.bash, 'deny',
        `sdd-${phase} must be able to run commands`);
    assert.equal(permission.task, undefined, `sdd-${phase} must not delegate`);
    assert.equal(permission.subagent, undefined,
        `sdd-${phase} must not delegate`);
  }

  // sdd-qa must not modify product source, but a blanket edit deny would also block the
  // qa-report.md it has to write. Enforcing that boundary needs a path-scoped rule; until the
  // config carries one, this stays documented instead of being asserted as enforced.
  assert.ok(!('tools' in config.agent['sdd-qa']),
      'acceptance QA must not rely on the legacy tools map');
  assert.notEqual(config.agent['sdd-apply'].permission?.edit, 'deny',
      'apply must write code');
});

test('the orchestrator may delegate to every phase executor only', () => {
  const task = config.agent.kerrigan.permission.task;
  for (const phase of PHASES) {
    assert.equal(task[`sdd-${phase}`], 'allow');
  }
  assert.equal(task['sdd-onboard'], undefined);
});

test('onboarding delegates defects and gates archive on verify and QA', () => {
  const onboarding = readFileSync(
      path.join(root, 'skills/sdd/sdd-onboard/SKILL.md'), 'utf8');
  assert.match(onboarding,
      /First, check whether QA is `BLOCKED` or `NOT TESTED` because of an external constraint/);
  assert.match(onboarding,
      /Do not\s+ask `sdd-apply` to change code for an environment limitation/);
  assert.match(onboarding,
      /unless the change meets the exact documentation\/configuration-only exception in\s+`skills\/sdd\/sdd-archive\/SKILL\.md`/);
  assert.match(onboarding,
      /This branch takes precedence even if\s+the report also mentions an implementation defect/);
  assert.match(onboarding,
      /Otherwise, if QA reports an implementation defect[\s\S]*?Delegate the fix to\s+`sdd-apply`[\s\S]*?repeat `sdd-verify` and `sdd-qa`/);
  assert.ok(onboarding.indexOf('First, check whether QA is')
      < onboarding.indexOf('Otherwise, if QA reports an implementation defect'),
      'external QA block handling must precede implementation-fix delegation');
  assert.match(onboarding,
      /preserve the QA verdict, record the\s+rationale and warning/);
  assert.match(onboarding,
      /Delegate `sdd-archive` only after verification passes and QA is allowed/);
  assert.match(onboarding,
      /If verification finds a defect[\s\S]*?delegate[\s\S]*?`sdd-apply`/);
});

test('phase order keeps design after specs', () => {
  const readme = readFileSync(path.join(root, 'README.md'), 'utf8');
  const onboarding = readFileSync(
      path.join(root, 'skills/sdd/sdd-onboard/SKILL.md'), 'utf8');
  const fastForward = readFileSync(path.join(root, 'commands/sdd-ff.md'),
      'utf8');
  const orchestrator = readFileSync(path.join(root, 'prompts/ORCHESTRATOR.md'),
      'utf8');
  assert.match(readme, /propose → spec → design → tasks/);
  assert.doesNotMatch(readme, /\[spec \+ design\]|\(parallel\)/);
  assert.match(orchestrator, /propose -> spec -> design -> tasks/);
  assert.doesNotMatch(orchestrator, /\[spec \+ design parallel\]/);
  assert.match(onboarding,
      /Delegate `sdd-spec` first[\s\S]*?delegate `sdd-design`/);
  assert.match(fastForward,
      /Delegate to `sdd-spec`; after its delta specs are ready, delegate to `sdd-design`/);
});

test('init and propose contracts restrict writes to their phase', () => {
  const init = readFileSync(path.join(root, 'prompts/sdd/sdd-init.md'), 'utf8');
  const propose = readFileSync(path.join(root, 'prompts/sdd/sdd-propose.md'),
      'utf8');
  assert.match(init, /Write only under `\.agents\/sdd\/`/);
  assert.match(init, /entire `openspec\/` directory to `\.agents\/sdd\/`/);
  assert.match(propose, /only file you may create or modify is `proposal\.md`/);
  assert.match(propose, /Do not modify product code, tests, or configuration/);
});

test('archive contract points to the canonical acceptance gate', () => {
  const archivePrompt = readFileSync(
      path.join(root, 'prompts/sdd/sdd-archive.md'), 'utf8');
  const archiveSkill = readFileSync(
      path.join(root, 'skills/sdd/sdd-archive/SKILL.md'), 'utf8');
  assert.match(archivePrompt,
      /two-report acceptance release gate in\s+`skills\/sdd\/sdd-archive\/SKILL\.md`/);
  assert.match(archiveSkill, /PASS WITH WARNINGS/);
  assert.match(archiveSkill, /QA\s+`FAIL`[\s\S]*?always block archive/);
  assert.match(archiveSkill, /QA `FAIL` always blocks archive/);
  assert.match(archiveSkill, /QA `BLOCKED` or `NOT TESTED` blocks archive/);
  assert.match(archiveSkill, /documentation\/configuration-only/);
  assert.match(archiveSkill, /every changed path and\s+every completed task/);
  assert.match(archiveSkill, /rules\.archive/);
  const orchestrator = readFileSync(path.join(root, 'prompts/ORCHESTRATOR.md'),
      'utf8');
  assert.match(orchestrator,
      /QA satisfies the deterministic gate in\s+`skills\/sdd\/sdd-archive\/SKILL\.md`/);
  assert.match(archiveSkill, /An unresolved P2\/P3 finding blocks archive if/);
  assert.doesNotMatch(archiveSkill,
      /unless config permits a documented\s+non-runtime exception/);
});

test('init writes and migration are restricted to the artifact store', () => {
  const initPrompt = readFileSync(path.join(root, 'prompts/sdd/sdd-init.md'),
      'utf8');
  const initSkill = readFileSync(
      path.join(root, 'skills/sdd/sdd-init/SKILL.md'), 'utf8');
  assert.match(initPrompt, /Write only under `\.agents\/sdd\/`/);
  assert.match(initPrompt,
      /only permitted write outside `\.agents\/sdd\/` is the documented legacy migration/);
  assert.match(initSkill,
      /Write or update SDD context only under `\.agents\/sdd\/`/);
  for (const allowedPath of [
    '.agents/sdd/config.yaml', '.agents/sdd/specs/', '.agents/sdd/changes/',
    '.agents/sdd/changes/archive/'
  ]) {
    assert.ok(initSkill.includes(`\`${allowedPath}\``),
        `sdd-init must declare ${allowedPath} as an allowed path`);
  }
  assert.match(initSkill,
      /create or modify that optional\s+runner configuration only when the orchestrator explicitly requests runner setup/);
  assert.match(initSkill,
      /Create this directory structure:[\s\S]*?\.agents\/sdd\//);
  assert.match(initSkill,
      /move the entire `openspec\/` directory to\s+`\.agents\/sdd\/`/);
});

test('explore prompt and skill allow the same optional artifact path', () => {
  const explorePrompt = readFileSync(
      path.join(root, 'prompts/sdd/sdd-explore.md'), 'utf8');
  const exploreSkill = readFileSync(
      path.join(root, 'skills/sdd/sdd-explore/SKILL.md'), 'utf8');
  assert.match(explorePrompt,
      /Only when the orchestrator explicitly supplies a change name/i);
  assert.match(exploreSkill,
      /Only if the orchestrator explicitly provides a change name as an input/i);
  for (const contract of [explorePrompt, exploreSkill]) {
    assert.match(contract,
        /\.agents\/sdd\/changes\/\{change-name\}\/exploration\.md/);
    assert.match(contract, /do not (write any file|create or modify files)/i);
  }
});
