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

test('Junie ACP access is denied globally and asks for Kerrigan', () => {
  assert.equal(config.permission?.['junie_acp_*'], 'deny');
  assert.equal(agents.kerrigan?.permission?.['junie_acp_*'], 'ask');
});

test('Junie ACP pilot documents MCACP limitations and deployment mapping', () => {
  const bridge = config.mcp?.servers?.junie_acp;
  assert.ok(bridge, 'Junie ACP MCP server must be registered');
  assert.equal(bridge.disabled, false);
  assert.equal(bridge.cwd, '{env:HOME}/.config/opencode');
  assert.equal('environment' in bridge, false,
      'MCACP 0.1.3 does not read MCACP_CONFIG');
  assert.deepEqual(bridge.command, ['npx', '-y', 'mcacp@0.1.3']);

  const mcacp = JSON.parse(readFileSync(path.join(root, 'adapters/opencode/mcacp.json'), 'utf8'));
  assert.equal(mcacp.agent_servers?.junie?.command, 'junie');
  assert.deepEqual(mcacp.agent_servers.junie.args, ['--acp=true', '--skip-update-check']);
  assert.equal(mcacp.agent_servers.junie.permissionPolicy, 'operator');
  assert.equal(config.mcp.servers.linear?.disabled, false,
      'Linear MCP server must be enabled');
  assert.equal(config.mcp.servers['resolve-ai-bridge']?.disabled, true,
      'Resolve AI Bridge MCP server must be registered at the mcp.servers level and disabled');
  assert.equal('enabled' in config.mcp.servers['resolve-ai-bridge'], false,
      'OpenCode MCP server config must use disabled, not enabled');
  const readme = readFileSync(path.join(root, 'README.md'), 'utf8');
  const pilotGuide = readFileSync(path.join(root, 'docs/JUNIE-ACP-PILOT.md'), 'utf8');
  const orchestrator = readFileSync(path.join(root, 'prompts/ORCHESTRATOR.md'), 'utf8');

  assert.match(readme, /Junie ACP/);
  assert.match(pilotGuide, /brave-auto.*without one/s);
  assert.match(readme, /distribution\/opencode\/mcacp\.json.*~\/\.config\/opencode\/mcacp\.json/);
  assert.match(readme, /mcp\.servers/);
  assert.match(readme, /`disabled`/);
  assert.doesNotMatch(readme, /disabled-by-default integrations \(GitHub, Cloudflare API, Linear/);
  assert.match(readme, /#deployment-render-bundle--dotter/);
  assert.match(readme, /brave-auto[\s\S]*without a separate confirmation/);
  assert.match(pilotGuide, /2026-12-31/);
  for (const document of [orchestrator, pilotGuide, readme]) {
    assert.match(document, /brave-auto/);
    assert.match(document, /session\/set_config_option/);
    assert.match(document, /session\/set_mode/);
    assert.match(document, /not available|unavailable/);
  }
  assert.doesNotMatch(orchestrator, /To change it, use\s+`session\/set_config_option`/);
});

test('only Kerrigan can request Junie ACP tools', () => {
  assert.equal(config.permission['junie_acp_*'], 'deny');
  assert.equal(agents.kerrigan.permission['junie_acp_*'], 'ask');
  for (const [name, agent] of Object.entries(agents)) {
    if (name === 'kerrigan') continue;
    // All other declared agents, including judges, inherit the global denial.
    assert.equal(agent.permission?.['junie_acp_*'] ?? config.permission['junie_acp_*'],
        'deny', `${name} must not be able to delegate to Junie`);
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
