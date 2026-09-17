import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

export const CONFIG_VERSION = 'agent-harness.config/v1';
export const COMPONENTS = Object.freeze(['core', 'skills', 'permissions', 'persona', 'delegation', 'engram', 'context7', 'sdd', 'rdd', 'judgment-day', 'theme', 'integrations']);
export const PRESETS = Object.freeze({
  minimal: ['core', 'skills', 'permissions', 'persona'],
  recommended: ['core', 'skills', 'permissions', 'persona', 'delegation', 'engram', 'context7', 'sdd', 'rdd', 'judgment-day'],
  full: [...new Set(['core', 'skills', 'permissions', 'persona', 'delegation', 'engram', 'context7', 'sdd', 'rdd', 'judgment-day', 'theme', 'integrations'])],
});

export function resolvePreset(name = 'recommended') {
  if (!PRESETS[name]) throw new Error(`preset_invalid:${name}`);
  return { name, components: Object.fromEntries(COMPONENTS.map((component) => [component, PRESETS[name].includes(component)])) };
}

export function validateConfig(input = {}) {
  if (input.version !== CONFIG_VERSION) throw new Error('config_version_invalid');
  const preset = resolvePreset(input.preset ?? 'recommended');
  const persona = input.persona ?? 'kerrigan';
  if (!['kerrigan', 'neutral', 'custom'].includes(persona)) throw new Error('persona_invalid');
  const components = { ...preset.components, ...(input.components ?? {}) };
  for (const [name, enabled] of Object.entries(components)) {
    if (!COMPONENTS.includes(name) || typeof enabled !== 'boolean') throw new Error(`component_invalid:${name}`);
  }
  for (const mandatory of ['core', 'skills', 'permissions', 'persona']) components[mandatory] = true;
  const tdd = input.tdd ?? {};
  if (typeof tdd.enabled !== 'boolean') throw new Error('tdd_enabled_required');
  if (tdd.enabled && tdd.runner !== undefined && typeof tdd.runner !== 'string') throw new Error('tdd_runner_invalid');
  return { version: CONFIG_VERSION, preset: preset.name, persona, components, tdd: { enabled: tdd.enabled, ...(tdd.runner ? { runner: tdd.runner } : {}) } };
}

export async function loadHarnessConfig(root) {
  const base = JSON.parse(await fs.readFile(path.join(root, 'harness.config.json'), 'utf8'));
  try {
    const project = JSON.parse(await fs.readFile(path.join(root, '.agent-harness', 'config.json'), 'utf8'));
    return validateConfig({ ...base, ...project, tdd: { ...(base.tdd ?? {}), ...(project.tdd ?? {}) } });
  } catch (error) {
    if (error.code === 'ENOENT') return validateConfig(base);
    throw error;
  }
}

async function copyTree(source, destination) {
  await fs.mkdir(destination, { recursive: true });
  for (const entry of await fs.readdir(source, { withFileTypes: true })) {
    if (entry.name === '.DS_Store' || entry.name === 'dist' || entry.name === '.git' || entry.name === '.codegraph' || entry.name === '.idea' || entry.name === '.agents' || entry.name === '.codex' || entry.name === 'odd' || entry.name === 'artifacts' || entry.name === 'tmp' || entry.name === 'docs' || entry.name === 'tests' || entry.name === 'fixtures' || entry.name === 'ponytail' || entry.name === 'harness.config.json') continue;
    const from = path.join(source, entry.name); const to = path.join(destination, entry.name);
    if (entry.isDirectory()) await copyTree(from, to); else await fs.copyFile(from, to);
  }
}

async function removeIfExists(filePath) { await fs.rm(filePath, { recursive: true, force: true }); }

export async function renderEffectiveTree(sourceRoot, destination, config) {
  const normalized = validateConfig(config);
  await removeIfExists(destination);
  await copyTree(sourceRoot, destination);
  const configPath = path.join(destination, 'opencode.json');
  const opencode = JSON.parse(await fs.readFile(configPath, 'utf8'));
  if (opencode.agent?.kerrigan?.prompt === '{file:./AGENTS.md}') {
    opencode.agent.kerrigan.prompt = '{file:./AGENTS.md}\n\n{file:./WRITING_STYLE.md}';
  }
  const removeAgents = [];
  if (!normalized.components.sdd) removeAgents.push(...Object.keys(opencode.agent ?? {}).filter((name) => name.startsWith('sdd-')));
  if (!normalized.components['judgment-day']) removeAgents.push('lens', 'mirror', 'scalpel');
  for (const name of removeAgents) delete opencode.agent?.[name];
  if (!normalized.components.engram) { delete opencode.mcp?.engram; await removeIfExists(path.join(destination, 'plugins/engram.ts')); }
  if (!normalized.components.context7) delete opencode.mcp?.context7;
  if (!normalized.components.delegation) await removeIfExists(path.join(destination, 'plugins/background-agents.ts'));
  if (!normalized.components.theme) await removeIfExists(path.join(destination, 'themes'));
  if (!normalized.components.integrations) {
    for (const file of ['plugins/wakatime.js', 'plugins/model-variants.ts']) await removeIfExists(path.join(destination, file));
  }
  // Ponytail was removed from the harness; keep legacy source remnants out of every effective tree.
  for (const file of ['plugins/ponytail.mjs', 'commands/ponytail.md', 'commands/ponytail-audit.md', 'commands/ponytail-debt.md', 'commands/ponytail-help.md', 'commands/ponytail-review.md']) await removeIfExists(path.join(destination, file));
  if (!normalized.components.rdd) {
    await removeIfExists(path.join(destination, 'scripts/review.mjs'));
    await removeIfExists(path.join(destination, 'scripts/review-lib.mjs'));
  }
  if (!normalized.components.sdd) {
    for (const file of await fs.readdir(path.join(destination, 'commands')).catch(() => [])) if (file.startsWith('sdd-')) await removeIfExists(path.join(destination, 'commands', file));
    await removeIfExists(path.join(destination, 'prompts/sdd'));
    await removeIfExists(path.join(destination, 'skills/sdd'));
  }
  if (!normalized.components['judgment-day']) { for (const file of ['lens.md', 'mirror.md', 'scalpel.md']) await removeIfExists(path.join(destination, 'prompts', file)); await removeIfExists(path.join(destination, 'skills/workflow/double-blind-review')); }
  await fs.writeFile(configPath, `${JSON.stringify(opencode, null, 2)}\n`, 'utf8');
  const files = [];
  async function collect(dir) { for (const entry of await fs.readdir(dir, { withFileTypes: true })) { const file = path.join(dir, entry.name); if (entry.isDirectory()) await collect(file); else files.push(path.relative(destination, file).split(path.sep).join('/')); } }
  await collect(destination); files.sort();
  const digest = await treeDigest(destination, files);
  return { version: CONFIG_VERSION, destination, digest, agents: Object.keys(opencode.agent ?? {}), files };
}

export async function treeDigest(destination, knownFiles) {
  const files = knownFiles ?? [];
  const manifest = await Promise.all(files.map(async (file) => `${file}:${(await fs.readFile(path.join(destination, file))).toString('base64')}`));
  return createHash('sha256').update(manifest.join('\n')).digest('hex');
}
