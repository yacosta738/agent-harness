import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { validateConfig, resolvePreset, renderEffectiveTree, loadHarnessConfig } from '../harness-config-lib.mjs';

test('effective tree preserves the standalone writing style and composes it into Kerrigan prompt', async () => {
  const source = await fs.mkdtemp(path.join(os.tmpdir(), 'harness-writing-style-'));
  const out = path.join(source, 'dist/opencode');
  await fs.writeFile(path.join(source, 'opencode.json'), JSON.stringify({
    agent: { kerrigan: { prompt: '{file:./AGENTS.md}' } },
  }));
  await fs.writeFile(path.join(source, 'AGENTS.md'), '# core\n');
  await fs.writeFile(path.join(source, 'WRITING_STYLE.md'), '# style\n');

  await renderEffectiveTree(source, out, validateConfig({
    version: 'agent-harness.config/v1',
    preset: 'minimal',
    persona: 'kerrigan',
    tdd: { enabled: false },
  }));

  assert.equal(await fs.readFile(path.join(out, 'WRITING_STYLE.md'), 'utf8'), '# style\n');
  const renderedOpenCode = JSON.parse(await fs.readFile(path.join(out, 'opencode.json'), 'utf8'));
  assert.equal(renderedOpenCode.agent.kerrigan.prompt, '{file:./AGENTS.md}\n\n{file:./WRITING_STYLE.md}');
});

test('recommended preset keeps core capabilities and is deterministic', async () => {
  const config = validateConfig({ version: 'agent-harness.config/v1', preset: 'recommended', persona: 'kerrigan', tdd: { enabled: true } });
  assert.equal(config.components.engram, true);
  assert.equal(config.components.sdd, true);
  assert.equal(resolvePreset('minimal').components.rdd, false);
  const source = await fs.mkdtemp(path.join(os.tmpdir(), 'harness-source-'));
  const out = path.join(source, 'dist/opencode');
  await fs.mkdir(path.join(source, 'plugins'), { recursive: true });
  await fs.writeFile(path.join(source, 'opencode.json'), JSON.stringify({ agent: { kerrigan: {}, 'sdd-apply': {}, lens: {} }, mcp: { engram: {}, context7: {} } }));
  await fs.writeFile(path.join(source, 'AGENTS.md'), '# test');
  await fs.writeFile(path.join(source, 'plugins/engram.ts'), 'plugin');
  const first = await renderEffectiveTree(source, out, config);
  const second = await renderEffectiveTree(source, out, config);
  assert.equal(first.digest, second.digest);
  assert.deepEqual(first.agents, ['kerrigan', 'sdd-apply', 'lens']);
});

test('invalid component combinations fail closed', () => {
  assert.throws(() => validateConfig({ version: 'agent-harness.config/v1', preset: 'minimal', persona: 'bad', tdd: {} }), /persona_invalid/);
});

test('minimal effective tree excludes optional runtime components and source-only material', async () => {
  const source = await fs.mkdtemp(path.join(os.tmpdir(), 'harness-minimal-'));
  const out = path.join(source, 'dist/opencode');
  await fs.mkdir(path.join(source, 'plugins'), { recursive: true });
  await fs.mkdir(path.join(source, 'docs'), { recursive: true });
  await fs.mkdir(path.join(source, 'themes'), { recursive: true });
  await fs.mkdir(path.join(source, 'adapters/opencode'), { recursive: true });
  await fs.writeFile(path.join(source, 'AGENTS.md'), '# portable');
  await fs.writeFile(path.join(source, 'adapters/opencode/AGENTS.overlay.md'), '# overlay');
  await fs.writeFile(path.join(source, 'adapters/opencode/adapter.json'), JSON.stringify({ version: 'agent-harness.adapter/v1', name: 'opencode', defaultTarget: '~/.config/opencode', allowedLayers: ['portable', 'adapter', 'runtime'], defaultPreset: 'recommended', presetOrder: ['minimal', 'recommended', 'full'], compose: { 'AGENTS.md': ['portable:AGENTS.md', 'overlay:adapters/opencode/AGENTS.overlay.md'] }, components: { core: { include: ['AGENTS.md', 'adapters/opencode/**'] }, skills: { include: ['skills/**', 'prompts/**', 'commands/**'] }, permissions: { include: ['adapters/opencode/opencode.json'] }, persona: { include: ['AGENTS.md', 'adapters/opencode/opencode.json'] } }, presets: { minimal: ['core', 'skills', 'permissions', 'persona'], recommended: ['core', 'skills', 'permissions', 'persona'], full: ['core', 'skills', 'permissions', 'persona'] } }, null, 2));
  await fs.writeFile(path.join(source, 'adapters/opencode/opencode.json'), JSON.stringify({ agent: { kerrigan: {}, 'sdd-apply': {}, lens: {} }, mcp: { engram: {}, context7: {} } }));
  await fs.writeFile(path.join(source, 'plugins/engram.ts'), 'plugin');
  await fs.writeFile(path.join(source, 'plugins/wakatime.js'), 'plugin');
  await fs.writeFile(path.join(source, 'themes/dark.json'), '{}');
  await fs.writeFile(path.join(source, 'docs/readme.md'), '# docs');
  const rendered = await renderEffectiveTree(source, out, validateConfig({ version: 'agent-harness.config/v1', preset: 'minimal', persona: 'neutral', tdd: { enabled: false } }));
  assert.deepEqual(rendered.agents, ['kerrigan']);
  assert.equal(rendered.files.some((file) => file.startsWith('docs/')), false);
  assert.equal(rendered.files.some((file) => file.startsWith('themes/')), false);
  assert.equal(rendered.files.includes('plugins/engram.ts'), false);
  assert.equal(rendered.files.includes('plugins/wakatime.js'), false);
});

test('project TDD settings override the harness default from .agent-harness/config.json', async () => {
  const source = await fs.mkdtemp(path.join(os.tmpdir(), 'harness-project-config-'));
  await fs.mkdir(path.join(source, '.agent-harness'), { recursive: true });
  await fs.writeFile(path.join(source, 'harness.config.json'), JSON.stringify({ version: 'agent-harness.config/v1', preset: 'recommended', persona: 'kerrigan', tdd: { enabled: true } }));
  await fs.writeFile(path.join(source, '.agent-harness/config.json'), JSON.stringify({ tdd: { enabled: false } }));
  assert.equal((await loadHarnessConfig(source)).tdd.enabled, false);
});
