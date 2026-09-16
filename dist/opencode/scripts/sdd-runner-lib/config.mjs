import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';

export const MANIFEST_VERSION = 'quality-runner/v1';
export const DEFAULT_OUTPUT_LIMIT = 64 * 1024;
export const DEFAULT_ARTIFACT_LIMIT = 1024 * 1024;

const CAPABILITY_KEYS = new Set('enabled argv command shell cwd timeout_ms env_allowlist exit_codes parser thresholds artifacts redaction max_output_bytes max_artifact_bytes required blocking skip_reason provider toolchain scope metric'.split(' '));

export class RunnerConfigError extends Error {
  constructor(message, details = {}) {
    super(message);
    this.name = 'RunnerConfigError';
    this.details = details;
  }
}
export function resolveProject(project = process.cwd()) {
  const projectRoot = path.resolve(project);
  if (!fs.existsSync(projectRoot) || !fs.statSync(projectRoot).isDirectory()) {
    throw new RunnerConfigError(`Project directory does not exist: ${projectRoot}`, { code: 'project_not_found' });
  }
  return projectRoot;
}
export function resolveInside(projectRoot, candidate) {
  const root = path.resolve(projectRoot);
  const resolved = path.resolve(root, candidate);
  if (resolved !== root && !resolved.startsWith(`${root}${path.sep}`)) {
    throw new RunnerConfigError(`Path escapes project root: ${candidate}`, { code: 'path_outside_project', path: candidate });
  }
  let probe = resolved;
  while (!fs.existsSync(probe) && probe !== root) probe = path.dirname(probe);
  const realRoot = fs.realpathSync(root), realResolved = fs.realpathSync(probe);
  if (realResolved !== realRoot && !realResolved.startsWith(`${realRoot}${path.sep}`)) throw new RunnerConfigError(`Path symlink escapes project root: ${candidate}`, { code: 'path_symlink_outside_project', path: candidate });
  return resolved;
}
export function resolveConfigPath(projectRoot, explicitConfig) {
  return resolveInside(projectRoot, explicitConfig || path.join('openspec', 'quality-runner.json'));
}
export function loadRunnerConfig(options = {}) {
  const projectRoot = resolveProject(options.project || process.cwd());
  const configPath = resolveConfigPath(projectRoot, options.config);
  if (!fs.existsSync(configPath)) {
    return {
      projectRoot,
      configPath,
      manifest: null,
      manifestDigest: null,
      unavailableReason: 'manifest_not_found',
    };
  }
  let manifest;
  try {
    manifest = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  } catch (error) {
    throw new RunnerConfigError(`Cannot parse quality runner manifest: ${configPath}`, { code: 'manifest_invalid_json', cause: error instanceof Error ? error.message : String(error) });
  }
  const normalized = validateManifest(manifest);
  return {
    projectRoot,
    configPath,
    manifest: normalized,
    manifestDigest: digestJson(normalized),
    unavailableReason: null,
  };
}
export function validateManifest(value) {
  if (!isRecord(value)) throw new RunnerConfigError('Manifest must be a JSON object');
  if (value.version !== MANIFEST_VERSION) {
    throw new RunnerConfigError(`Unsupported manifest version: ${String(value.version)}`, {
      code: 'manifest_version_unsupported',
    });
  }
  if (!isRecord(value.capabilities)) {
    throw new RunnerConfigError('Manifest capabilities must be an object');
  }
  const enabled = value.enabled !== false;
  const capabilities = {};
  for (const [id, definition] of Object.entries(value.capabilities)) {
    capabilities[id] = validateCapability(id, definition);
  }
  if (enabled && Object.keys(capabilities).length === 0) {
    throw new RunnerConfigError('Enabled manifests must declare at least one capability');
  }
  const output = validateOutput(value.output);
  const redaction = validateRedaction(value.redaction);
  return {
    version: MANIFEST_VERSION,
    enabled,
    control_plane: value.control_plane || { enabled: false },
    output,
    redaction,
    capabilities,
  };
}
function validateCapability(id, value) {
  if (!isRecord(value)) throw new RunnerConfigError(`Capability ${id} must be an object`);
  for (const key of Object.keys(value)) {
    if (!CAPABILITY_KEYS.has(key)) throw new RunnerConfigError(`Unknown capability key: ${id}.${key}`);
  }
  const hasArgv = Array.isArray(value.argv);
  const hasShellCommand = typeof value.command === 'string' && isRecord(value.shell);
  if ((hasArgv ? 1 : 0) + (hasShellCommand ? 1 : 0) !== 1) {
    throw new RunnerConfigError(`Capability ${id} needs argv or command with shell opt-in`);
  }
  if (hasArgv && (value.argv.length === 0 || value.argv.some((part) => typeof part !== 'string'))) {
    throw new RunnerConfigError(`Capability ${id}.argv must contain strings`);
  }
  if (hasShellCommand && (value.shell.enabled !== true || typeof value.shell.reason !== 'string' || !value.shell.reason.trim())) {
    throw new RunnerConfigError(`Capability ${id}.shell requires enabled=true and a reason`);
  }
  if (typeof value.cwd !== 'string' || !value.cwd) throw new RunnerConfigError(`Capability ${id}.cwd is required`);
  if (!Number.isInteger(value.timeout_ms) || value.timeout_ms < 1) {
    throw new RunnerConfigError(`Capability ${id}.timeout_ms must be a positive integer`);
  }
  const envAllowlist = value.env_allowlist || [];
  if (!Array.isArray(envAllowlist) || envAllowlist.some((key) => !/^[A-Za-z_][A-Za-z0-9_]*$/.test(key))) {
    throw new RunnerConfigError(`Capability ${id}.env_allowlist contains an invalid key`);
  }
  const exitCodes = value.exit_codes || [0];
  if (!Array.isArray(exitCodes) || exitCodes.length === 0 || exitCodes.some((code) => !Number.isInteger(code))) {
    throw new RunnerConfigError(`Capability ${id}.exit_codes must contain integers`);
  }
  const artifacts = value.artifacts || [];
  if (!Array.isArray(artifacts) || artifacts.some((entry) => typeof entry !== 'string' || !entry)) {
    throw new RunnerConfigError(`Capability ${id}.artifacts must contain relative paths`);
  }
  const parser = validateParser(value.parser);
  const redaction = validateRedaction(value.redaction);
  validatePositiveLimit(id, 'max_output_bytes', value.max_output_bytes);
  validatePositiveLimit(id, 'max_artifact_bytes', value.max_artifact_bytes);
  if (value.skip_reason !== undefined && (typeof value.skip_reason !== 'string' || !value.skip_reason.trim())) {
    throw new RunnerConfigError(`Capability ${id}.skip_reason must be non-empty`);
  }
  return {
    ...value,
    enabled: value.enabled !== false,
    argv: hasArgv ? [...value.argv] : null,
    command: hasShellCommand ? value.command : null,
    cwd: value.cwd,
    timeout_ms: value.timeout_ms,
    env_allowlist: [...envAllowlist],
    exit_codes: [...exitCodes],
    parser,
    artifacts: [...artifacts],
    redaction,
    required: value.required === true,
    blocking: value.blocking === true,
  };
}
function validateOutput(value) {
  if (value === undefined) return { directory: path.join('artifacts', 'runs'), max_output_bytes: DEFAULT_OUTPUT_LIMIT, max_artifact_bytes: DEFAULT_ARTIFACT_LIMIT };
  if (!isRecord(value)) throw new RunnerConfigError('Manifest output must be an object');
  const output = {
    directory: value.directory || path.join('artifacts', 'runs'),
    max_output_bytes: value.max_output_bytes || DEFAULT_OUTPUT_LIMIT,
    max_artifact_bytes: value.max_artifact_bytes || DEFAULT_ARTIFACT_LIMIT,
  };
  if (typeof output.directory !== 'string' || !output.directory) throw new RunnerConfigError('output.directory is invalid');
  if (!Number.isInteger(output.max_output_bytes) || output.max_output_bytes < 1) throw new RunnerConfigError('output.max_output_bytes is invalid');
  if (!Number.isInteger(output.max_artifact_bytes) || output.max_artifact_bytes < 1) throw new RunnerConfigError('output.max_artifact_bytes is invalid');
  return output;
}
function validateParser(value) {
  if (value === undefined) return { type: 'none' };
  if (!isRecord(value) || !['none', 'json', 'regex'].includes(value.type)) {
    throw new RunnerConfigError('parser.type must be none, json, or regex');
  }
  if (value.type === 'regex') {
    if (typeof value.pattern !== 'string') throw new RunnerConfigError('regex parser needs pattern');
    try { new RegExp(value.pattern, value.flags || ''); } catch (error) {
      throw new RunnerConfigError('regex parser pattern is invalid', { cause: String(error) });
    }
  }
  if (value.source !== undefined && !['stdout', 'stderr'].includes(value.source)) {
    throw new RunnerConfigError('parser.source must be stdout or stderr');
  }
  return { ...value, source: value.source || 'stdout' };
}
function validateRedaction(value) {
  if (value === undefined) return { values: [], patterns: [] };
  if (!isRecord(value)) throw new RunnerConfigError('redaction must be an object');
  const values = value.values || [];
  const patterns = value.patterns || [];
  if (!Array.isArray(values) || values.some((item) => typeof item !== 'string')) throw new RunnerConfigError('redaction.values must contain strings');
  if (!Array.isArray(patterns) || patterns.some((item) => typeof item !== 'string')) throw new RunnerConfigError('redaction.patterns must contain strings');
  for (const pattern of patterns) {
    try { new RegExp(pattern, 'g'); } catch (error) { throw new RunnerConfigError('redaction pattern is invalid', { cause: String(error) }); }
  }
  return { values: [...values], patterns: [...patterns] };
}
function validatePositiveLimit(id, key, value) {
  if (value !== undefined && (!Number.isInteger(value) || value < 1)) throw new RunnerConfigError(`Capability ${id}.${key} is invalid`);
  }
function isRecord(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
  }
export function digestJson(value) {
  return createHash('sha256').update(stableJson(value)).digest('hex');
}

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  if (!isRecord(value)) return JSON.stringify(value);
  return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(',')}}`;
}
