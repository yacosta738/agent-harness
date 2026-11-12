// Verifies that the team specialists declared in the harness are actually registered by
// OpenCode, not only present in JSON.
//
// Background: the specialists used to live in a nested `agent.kerrigan.subagents` block.
// That key does not exist in any OpenCode schema, so the runtime ignored it silently and
// `opencode debug agents` never listed the ten agents. The structural assertions below can
// be satisfied by a wrong config, which is why the runtime assertion exists.

import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {cpSync, existsSync, mkdtempSync, readFileSync, rmSync} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {fileURLToPath} from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const configPath = path.join(root, 'adapters/opencode/opencode.json');
const config = JSON.parse(readFileSync(configPath, 'utf8'));
const agents = config.agent ?? {};

// Keep this list aligned with prompts/team/ and with the README agent section.
const TEAM_SPECIALISTS = [
  'tech-lead',
  'senior-dev',
  'devops-engineer',
  'qa-engineer',
  'security-engineer',
  'performance-engineer',
  'ux-designer',
  'data-engineer',
  'product-manager',
  'code-reviewer',
];

const PHANTOM_TOOLS = ['delegate', 'delegation_read', 'delegation_list'];

// Agents whose whole purpose is to judge without modifying the candidate.
const READ_ONLY_AGENTS = ['lens', 'mirror'];

test('kerrigan is the configured default agent', () => {
  assert.equal(config.default_agent, 'kerrigan',
      'config must set default_agent so a new session starts with the orchestrator');
  assert.equal(agents.kerrigan?.mode, 'primary');
});

test('no agent declares a nested subagents block', () => {
  for (const [name, agent] of Object.entries(agents)) {
    assert.ok(!('subagents' in agent),
        `${name} uses a nested "subagents" block, which OpenCode ignores`);
  }
});

test('every team specialist is a flat subagent with a prompt', () => {
  for (const name of TEAM_SPECIALISTS) {
    const agent = agents[name];
    assert.ok(agent,
        `agent "${name}" is not declared in adapters/opencode/opencode.json`);
    assert.equal(agent.mode, 'subagent',
        `agent "${name}" must declare mode "subagent"`);
    assert.ok(agent.description,
        `agent "${name}" needs a description for subagent selection`);
    assert.match(agent.prompt ?? '', /^\{file:\.\/prompts\/team\//,
        `agent "${name}" must load its prompt from prompts/team/`);
  }
});

test('kerrigan may spawn every team specialist', () => {
  const allow = agents.kerrigan?.permission?.task;
  assert.ok(allow, 'kerrigan must declare permission.task');
  assert.equal(allow['*'], 'deny', 'permission.task must deny by default');

  for (const name of TEAM_SPECIALISTS) {
    assert.equal(allow[name], 'allow',
        `kerrigan cannot spawn "${name}" because permission.task does not allow it`);
  }
});

test('no agent uses the legacy tools map', () => {
  for (const [name, agent] of Object.entries(agents)) {
    assert.ok(!('tools' in agent),
        `${name} uses the legacy "tools" map; express capability with "permission" instead`);
  }
});

test('blind judges deny edits', () => {
  for (const name of READ_ONLY_AGENTS) {
    assert.equal(agents[name]?.permission?.edit, 'deny',
        `${name} must deny edits: it is a blind judge, not a fixer`);
  }
});

test('a prompt file exists for every team specialist', () => {
  for (const name of TEAM_SPECIALISTS) {
    const file = path.join(root, 'prompts/team', `${name}.md`);
    assert.ok(existsSync(file), `missing prompt file for "${name}": ${file}`);
  }
});

function opencodeAvailable() {
  try {
    execFileSync('opencode', ['--version'], {stdio: 'ignore', timeout: 20000});
    return true;
  } catch {
    return false;
  }
}

test('runtime registers every declared agent', {
  skip: !opencodeAvailable() &&
      'opencode CLI not available; install it to run the runtime assertion'
}, () => {
  // An isolated config home keeps the real user config out of the result. --standalone starts a
  // private server, because the shared background service keeps the config location it started
  // with and would answer from a stale cache.
  const home = mkdtempSync(path.join(os.tmpdir(), 'agent-harness-agents-'));
  try {
    const configDir = path.join(home, 'opencode');
    cpSync(path.join(root, 'prompts'), path.join(configDir, 'prompts'),
        {recursive: true});
    cpSync(configPath, path.join(configDir, 'opencode.json'));

    const raw = execFileSync('opencode', ['--standalone', 'debug', 'agents'], {
      cwd: configDir,
      env: {...process.env, XDG_CONFIG_HOME: home},
      encoding: 'utf8',
      timeout: 90000,
      maxBuffer: 32 * 1024 * 1024,
    });

    const registered = new Map(
        JSON.parse(raw).map((agent) => [agent.id, agent]));

    for (const name of TEAM_SPECIALISTS) {
      const agent = registered.get(name);
      assert.ok(agent, `runtime does not register "${name}"`);
      assert.equal(agent.mode, 'subagent',
          `runtime registers "${name}" with the wrong mode`);
    }
    assert.ok(registered.has('kerrigan'), 'runtime does not register kerrigan');

    // The global default allows everything and specific rules append, so the last matching
    // edit rule decides. No rule means the default allow still stands.
    const editEffect = (agent) => {
      const rules = agent.permissions.filter((rule) => rule.action === 'edit');
      return rules.length ? rules.at(-1).effect : 'allow';
    };

    for (const name of READ_ONLY_AGENTS) {
      assert.equal(editEffect(registered.get(name)), 'deny',
          `runtime lets "${name}" edit, so the blind judge is not read-only`);
    }

    for (const name of ['sdd-apply', 'scalpel']) {
      assert.notEqual(editEffect(registered.get(name)), 'deny',
          `runtime blocks edits for "${name}", which has to write code`);
    }

    for (const agent of registered.values()) {
      for (const rule of agent.permissions) {
        assert.ok(!PHANTOM_TOOLS.includes(rule.action),
            `${agent.id} exposes phantom permission action "${rule.action}"`);
      }
    }
  } finally {
    rmSync(home, {recursive: true, force: true});
  }
});
