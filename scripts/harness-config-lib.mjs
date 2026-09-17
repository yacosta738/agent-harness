import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

export const CONFIG_VERSION = 'agent-harness.config/v1';
export const DEFAULT_ADAPTER = 'opencode';
export const COMPONENTS = Object.freeze([
  'core',
  'skills',
  'permissions',
  'persona',
  'delegation',
  'engram',
  'context7',
  'sdd',
  'rdd',
  'judgment-day',
  'theme',
  'integrations',
]);

export const PRESETS = Object.freeze({
  minimal: ['core', 'skills', 'permissions', 'persona'],
  recommended: ['core', 'skills', 'permissions', 'persona', 'delegation', 'engram', 'context7', 'sdd', 'rdd', 'judgment-day'],
  full: ['core', 'skills', 'permissions', 'persona', 'delegation', 'engram', 'context7', 'sdd', 'rdd', 'judgment-day', 'theme', 'integrations'],
});

const IGNORED_DIRS = new Set(['.git', '.codegraph', '.idea', '.agents', '.codex', 'dist', 'artifacts', 'odd', 'docs', 'tmp']);
const IGNORED_FILES = new Set(['.DS_Store', 'manifest.json']);

function expandHome(input) {
  if (!input || input === '~') return os.homedir();
  if (input.startsWith('~/')) return path.join(os.homedir(), input.slice(2));
  return input;
}

function escapeGlob(input) {
  return input.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*\*/g, '§§').replace(/\*/g, '[^/]*').replace(/§§/g, '.*').replace(/\?/g, '.');
}

function matchesPattern(relativePath, pattern) {
  if (!pattern) return false;
  const normalized = relativePath.split(path.sep).join('/');
  if (pattern === normalized) return true;
  const regex = new RegExp(`^${escapeGlob(pattern)}$`);
  return regex.test(normalized);
}

async function walkFiles(root, relativePrefix = '') {
  const entries = await fs.readdir(path.join(root, relativePrefix), { withFileTypes: true });
  const results = [];
  for (const entry of entries) {
    const relative = relativePrefix ? `${relativePrefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      if (IGNORED_DIRS.has(entry.name)) continue;
      if (entry.name.startsWith('.')) continue;
      results.push(...(await walkFiles(root, relative)));
      continue;
    }
    if (entry.name === '.DS_Store' || entry.name.startsWith('.')) continue;
    results.push(relative);
  }
  return results;
}

async function collectMatchingFiles(root, patterns) {
  const files = await walkFiles(root);
  const set = new Set();
  for (const file of files) {
    if (IGNORED_FILES.has(path.basename(file))) continue;
    for (const pattern of patterns) {
      if (pattern === file || matchesPattern(file, pattern)) {
        set.add(file);
        break;
      }
    }
  }
  return [...set].sort();
}

export function resolvePreset(name = 'recommended') {
  if (!PRESETS[name]) throw new Error(`preset_invalid:${name}`);
  return {
    name,
    components: Object.fromEntries(COMPONENTS.map((component) => [component, PRESETS[name].includes(component)])),
  };
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
  return {
    version: CONFIG_VERSION,
    preset: preset.name,
    persona,
    components,
    tdd: { enabled: tdd.enabled, ...(tdd.runner ? { runner: tdd.runner } : {}) },
  };
}

export async function loadHarnessConfig(root, adapter = DEFAULT_ADAPTER) {
  const basePath = path.join(root, 'harness.config.json');
  const base = JSON.parse(await fs.readFile(basePath, 'utf8'));
  try {
    const project = JSON.parse(await fs.readFile(path.join(root, '.agent-harness', 'config.json'), 'utf8'));
    return validateConfig({ ...base, ...project, tdd: { ...(base.tdd ?? {}), ...(project.tdd ?? {}) }, adapter });
  } catch (error) {
    if (error.code === 'ENOENT') return validateConfig({ ...base, adapter });
    throw error;
  }
}

export const DEFAULT_ADAPTER_SPEC = Object.freeze({
  version: 'agent-harness.adapter/v1',
  name: 'opencode',
  defaultTarget: '~/.config/opencode',
  allowedLayers: ['portable', 'adapter', 'runtime'],
  defaultPreset: 'recommended',
  presetOrder: ['minimal', 'recommended', 'full'],
  compose: { 'AGENTS.md': ['portable:AGENTS.md', 'overlay:adapters/opencode/AGENTS.overlay.md'] },
  components: {
    core: { include: ['AGENTS.md', 'README.md', 'references/**', 'adapters/opencode/**'] },
    skills: { include: ['skills/**', 'prompts/**', 'commands/**', 'references/**'] },
    permissions: { include: ['adapters/opencode/opencode.json'] },
    persona: { include: ['AGENTS.md', 'adapters/opencode/opencode.json'] },
    delegation: { include: ['plugins/background-agents.ts'] },
    engram: { include: ['plugins/engram.ts'] },
    context7: { include: ['adapters/opencode/opencode.json'] },
    sdd: { include: ['commands/sdd-*.md', 'prompts/sdd/**', 'skills/sdd/**'] },
    rdd: { include: ['scripts/review.mjs', 'scripts/review-lib.mjs'] },
    'judgment-day': { include: ['prompts/lens.md', 'prompts/mirror.md', 'prompts/scalpel.md', 'skills/workflow/double-blind-review/**'] },
    theme: { include: ['themes/**', 'adapters/opencode/theme/**'] },
    integrations: { include: ['plugins/wakatime.js', 'plugins/model-variants.ts', 'runtime/scripts/**'] },
  },
  presets: {
    minimal: ['core', 'skills', 'permissions', 'persona'],
    recommended: ['core', 'skills', 'permissions', 'persona', 'delegation', 'engram', 'context7', 'sdd', 'rdd', 'judgment-day'],
    full: ['core', 'skills', 'permissions', 'persona', 'delegation', 'engram', 'context7', 'sdd', 'rdd', 'judgment-day', 'theme', 'integrations'],
  },
});

export async function resolveAdapterSpec(sourceRoot, adapter = DEFAULT_ADAPTER) {
  const specPath = path.join(sourceRoot, 'adapters', adapter, 'adapter.json');
  try {
    const raw = JSON.parse(await fs.readFile(specPath, 'utf8'));
    if (!raw || typeof raw !== 'object') throw new Error(`adapter_spec_invalid:${adapter}`);
    return raw;
  } catch (error) {
    if (error.code === 'ENOENT') return DEFAULT_ADAPTER_SPEC;
    throw error;
  }
}

async function resolveAdapterConfigPath(sourceRoot, adapter) {
  const adapterPath = path.join(sourceRoot, 'adapters', adapter, 'opencode.json');
  try {
    await fs.access(adapterPath);
    return adapterPath;
  } catch {
    return path.join(sourceRoot, 'opencode.json');
  }
}

function isPathSafeForBundle(relativePath) {
  return !relativePath.includes('..') && !relativePath.startsWith('/') && !relativePath.startsWith('~');
}

function normalizeBundleRelative(file, sourceRoot) {
  const relative = file.split(path.sep).join('/');
  if (!isPathSafeForBundle(relative)) throw new Error(`bundle_path_invalid:${relative}`);
  if (relative.startsWith('adapters/opencode/')) {
    const trimmed = relative.slice('adapters/opencode/'.length);
    if (!trimmed || trimmed === 'adapter.json' || trimmed === 'AGENTS.overlay.md') return null;
    return trimmed;
  }
  return relative;
}

async function appendBundleFile(destination, sourceRoot, relativePath) {
  const bundlePath = normalizeBundleRelative(relativePath, sourceRoot);
  if (!bundlePath) return;
  const sourceFile = path.join(sourceRoot, relativePath);
  const targetFile = path.join(destination, bundlePath);
  await fs.mkdir(path.dirname(targetFile), { recursive: true });
  await fs.copyFile(sourceFile, targetFile);
}

async function writeMergedAgents(destination, sourceRoot, adapter = DEFAULT_ADAPTER) {
  const basePath = path.join(sourceRoot, 'AGENTS.md');
  const overlayPath = path.join(sourceRoot, 'adapters', adapter, 'AGENTS.overlay.md');
  let baseText = '';
  try {
    baseText = await fs.readFile(basePath, 'utf8');
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  let overlayText = '';
  try {
    overlayText = await fs.readFile(overlayPath, 'utf8');
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  const output = [baseText.trim(), overlayText.trim()].filter(Boolean).join('\n\n');
  await fs.writeFile(path.join(destination, 'AGENTS.md'), `${output || '# Agent Harness\n'}\n`, 'utf8');
}

export async function renderEffectiveTree(sourceRoot, destination, config, adapter = DEFAULT_ADAPTER) {
  const normalized = validateConfig(config);
  const spec = await resolveAdapterSpec(sourceRoot, adapter);
  const preset = normalized.preset || (spec.defaultPreset ?? 'recommended');
  const selected = new Set();
  const presetSet = spec.presets?.[preset] ?? PRESETS[preset] ?? PRESETS.recommended;
  for (const component of COMPONENTS) {
    if (!normalized.components[component]) continue;
    if (presetSet.includes(component)) selected.add(component);
  }
  const patterns = [];
  for (const component of COMPONENTS) {
    if (selected.has(component) && spec.components?.[component]?.include) {
      patterns.push(...spec.components[component].include);
    }
  }
  const uniquePatterns = [...new Set(patterns)];
  await fs.rm(destination, { recursive: true, force: true });
  await fs.mkdir(destination, { recursive: true });

  const copied = [];
  const allFiles = await collectMatchingFiles(sourceRoot, uniquePatterns);
  for (const relativePath of allFiles) {
    if (relativePath === 'AGENTS.md') continue;
    if (relativePath.startsWith('adapters/opencode/adapter.json')) continue;
    if (relativePath.startsWith('adapters/opencode/AGENTS.overlay.md')) continue;
    await appendBundleFile(destination, sourceRoot, relativePath);
    copied.push(normalizeBundleRelative(relativePath, sourceRoot));
  }
  await writeMergedAgents(destination, sourceRoot);

  const adapterConfigPath = await resolveAdapterConfigPath(sourceRoot, adapter);
  const targetConfigPath = path.join(destination, 'opencode.json');
  const adapterConfig = JSON.parse(await fs.readFile(adapterConfigPath, 'utf8'));
  const agentEntries = Object.entries(adapterConfig.agent ?? {});
  if (preset === 'minimal') {
    adapterConfig.agent = Object.fromEntries(agentEntries.filter(([name, definition]) => {
      const mode = definition && typeof definition === 'object' ? definition.mode : undefined;
      return name === 'kerrigan' || mode === 'primary';
    }));
  }
  await fs.writeFile(targetConfigPath, `${JSON.stringify(adapterConfig, null, 2)}\n`, 'utf8');
  copied.push('opencode.json');

  const manifest = {
    adapter,
    preset,
    files: [...new Set(copied.filter(Boolean))].sort(),
  };
  const manifestPath = path.join(destination, 'manifest.json');
  await fs.writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  const files = [...new Set([...manifest.files, 'AGENTS.md', 'manifest.json'])].sort();
  const digest = await treeDigest(destination, files);
  const finalManifest = { ...manifest, files, digest };
  await fs.writeFile(manifestPath, `${JSON.stringify(finalManifest, null, 2)}\n`, 'utf8');

  const bundleFiles = [...new Set([...files])].sort();
  return {
    version: CONFIG_VERSION,
    adapter,
    preset,
    destination,
    digest,
    files: bundleFiles,
    agents: Object.keys(JSON.parse(await fs.readFile(targetConfigPath, 'utf8')).agent ?? {}),
  };
}

export async function treeDigest(destination, knownFiles) {
  const files = [...new Set(knownFiles ?? [])].sort();
  const entries = await Promise.all(files.map(async (file) => {
    const fullPath = path.join(destination, file);
    const content = await fs.readFile(fullPath, 'utf8');
    return `${file}:${Buffer.from(content, 'utf8').toString('base64')}`;
  }));
  return createHash('sha256').update(entries.join('\n')).digest('hex');
}

export async function renderManifest(root, outputDir, config, adapter = DEFAULT_ADAPTER) {
  const result = await renderEffectiveTree(root, outputDir, config, adapter);
  return result;
}

export async function verifyBundle(sourceRoot, outputDir, config, adapter = DEFAULT_ADAPTER) {
  const rendered = await renderEffectiveTree(sourceRoot, outputDir, config, adapter);
  const issues = [];
  const bundleFiles = rendered.files;
  for (const file of bundleFiles) {
    const resolved = path.join(outputDir, file);
    try {
      await fs.access(resolved);
    } catch {
      issues.push(`missing:${file}`);
    }
  }

  const configPath = path.join(outputDir, 'opencode.json');
  const configText = await fs.readFile(configPath, 'utf8');
  const parsed = JSON.parse(configText);
  const promptRefs = [];
  const visit = (value) => {
    if (!value || typeof value !== 'object') return;
    for (const [key, item] of Object.entries(value)) {
      if (typeof item === 'string' && item.startsWith('{file:')) {
        promptRefs.push(item.replace(/^\{file:\.?\/?/, '').replace(/\}$/, ''));
      }
      visit(item);
    }
  };
  visit(parsed);
  for (const ref of promptRefs) {
    const target = path.join(outputDir, ref);
    if (!target.startsWith(outputDir)) issues.push(`traversal:${ref}`);
    try {
      await fs.access(target);
    } catch {
      issues.push(`reference_missing:${ref}`);
    }
  }
  if (issues.length) throw new Error(issues.join(';'));
  return rendered;
}

export function expandPath(input) {
  return expandHome(input);
}

export async function checkBundle(sourceRoot, bundleRoot, config, adapter = DEFAULT_ADAPTER) {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'agent-harness-check-'));
  try {
    const rendered = await renderEffectiveTree(sourceRoot, tempDir, config, adapter);
    const currentFiles = [];
    try {
      for (const entry of await fs.readdir(bundleRoot, { withFileTypes: true })) {
        const file = path.join(bundleRoot, entry.name);
        if (entry.isDirectory()) {
          const nested = await walkFiles(file);
          for (const nestedFile of nested) currentFiles.push(path.relative(bundleRoot, path.join(file, nestedFile)).split(path.sep).join('/'));
        } else {
          currentFiles.push(path.relative(bundleRoot, file).split(path.sep).join('/'));
        }
      }
    } catch {
      return { status: 'MISSING', bundleRoot, expected: rendered.t };
    }
    const currentDigest = currentFiles.length ? await treeDigest(bundleRoot, currentFiles) : undefined;
    return {
      status: currentDigest === rendered.digest ? 'PASS' : 'DRIFT',
      expectedDigest: rendered.digest,
      actualDigest: currentDigest,
      files: currentFiles,
      bundleRoot,
    };
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
}

export async function linkBundle(sourceRoot, target, config, adapter = DEFAULT_ADAPTER) {
  const bundleRoot = path.resolve(sourceRoot, 'dist', 'opencode');
  const resolvedTarget = expandPath(target || '~/.config/opencode');
  const rendered = await renderEffectiveTree(sourceRoot, bundleRoot, config, adapter);
  const stats = await fs.lstat(resolvedTarget).catch(() => null);
  if (stats && stats.isSymbolicLink()) {
    const real = await fs.realpath(resolvedTarget).catch(() => null);
    if (real === bundleRoot) return { status: 'PASS', target: resolvedTarget, bundleRoot, digest: rendered.digest };
    throw new Error(`link_target_conflict:${resolvedTarget}`);
  }
  if (stats && stats.isDirectory()) throw new Error(`link_target_directory:${resolvedTarget}`);
  if (stats) throw new Error(`link_target_conflict:${resolvedTarget}`);
  await fs.mkdir(path.dirname(resolvedTarget), { recursive: true });
  await fs.symlink(bundleRoot, resolvedTarget, 'dir');
  return { status: 'PASS', target: resolvedTarget, bundleRoot, digest: rendered.digest };
}
