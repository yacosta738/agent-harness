import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { resolveInside } from './config.mjs';

export const RUNNER_RESULT_VERSION = 'quality-runner-result/v1';
export const CONTROL_PLANE_RESULT_VERSION = 'quality-runner-result/v2';
export const LEGACY_RUNNER_RESULT_VERSION = RUNNER_RESULT_VERSION;

export function evidenceFileStem(capabilityId) {
  const id = String(capabilityId);
  if (/^[A-Za-z0-9][A-Za-z0-9_-]*$/.test(id) && id !== '.' && id !== '..') return id;
  const stem = id.replace(/[^A-Za-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 48) || 'capability';
  const digest = createHash('sha256').update(id).digest('hex');
  return `${stem}-${digest}`;
}

export function parseOutput(definition, execution) {
  const parser = definition.parser || { type: 'none' };
  const source = parser.source === 'stderr' ? execution.stderr : execution.stdout;
  if (parser.type === 'none') return { type: 'none', accepted: true, value: null };
  if (parser.type === 'regex') return { type: 'regex', accepted: Boolean(source.match(new RegExp(parser.pattern, parser.flags || ''))), value: null };
  try {
    const parsed = JSON.parse(source);
    const value = parser.path ? parser.path.split('.').reduce((current, key) => current?.[key], parsed) : parsed;
    let accepted = parser.equals === undefined || JSON.stringify(value) === JSON.stringify(parser.equals);
    if (typeof value === 'number' && parser.min !== undefined) accepted &&= value >= parser.min;
    if (typeof value === 'number' && parser.max !== undefined) accepted &&= value <= parser.max;
    return { type: 'json', accepted, value };
  } catch { return { type: 'json', accepted: false, value: null, error: 'invalid_json' }; }
}

export function classifyResult(definition, execution, parser, artifacts = []) {
  if (definition.enabled === false) return { status: 'NOT_TESTED', reason: definition.skip_reason || 'capability_disabled' };
  if (execution.spawnError?.code === 'ENOENT') return { status: 'UNAVAILABLE', reason: 'executable_not_found' };
  if (execution.spawnError) return { status: 'BLOCKED', reason: 'process_spawn_failed' };
  if (execution.timedOut) return { status: 'BLOCKED', reason: 'timeout' };
  if (execution.truncated) return { status: 'FAIL', reason: 'output_limit_exceeded' };
  if (!definition.exit_codes.includes(execution.exitCode)) return { status: 'FAIL', reason: 'exit_code_rejected' };
  if (!parser.accepted) return { status: 'FAIL', reason: 'parser_rejected' };
  if (artifacts.some((artifact) => artifact.error)) return { status: 'FAIL', reason: 'artifact_policy_rejected' };
  const threshold = evaluateThreshold(definition.thresholds, parser.value);
  if (!threshold.accepted) return { status: 'FAIL', reason: 'threshold_rejected' };
  return { status: 'PASS', reason: 'policy_satisfied' };
}

export function evaluateThreshold(thresholds, value) {
  if (!thresholds) return { accepted: true };
  if (typeof value !== 'number' && (thresholds.min !== undefined || thresholds.max !== undefined)) return { accepted: false, reason: 'numeric_value_required' };
  if (thresholds.min !== undefined && value < thresholds.min) return { accepted: false, reason: 'below_minimum' };
  if (thresholds.max !== undefined && value > thresholds.max) return { accepted: false, reason: 'above_maximum' };
  if (thresholds.equals !== undefined && JSON.stringify(value) !== JSON.stringify(thresholds.equals)) return { accepted: false, reason: 'threshold_mismatch' };
  return { accepted: true };
}

export function collectArtifacts(projectRoot, definition, limit) {
  return (definition.artifacts || []).map((relativePath) => {
    try {
      const absolutePath = resolveInside(projectRoot, relativePath);
      if (!fs.existsSync(absolutePath)) return { path: relativePath, exists: false, size: 0 };
      const stat = fs.statSync(absolutePath);
      if (!stat.isFile()) return { path: relativePath, exists: false, size: 0, error: 'not_a_file' };
      if (stat.size > limit) return { path: relativePath, exists: true, size: stat.size, error: 'artifact_limit_exceeded' };
      return { path: relativePath, exists: true, size: stat.size, sha256: hashFile(absolutePath), error: null };
    } catch (error) { return { path: relativePath, exists: false, size: 0, error: error instanceof Error ? error.message : String(error) }; }
  });
}

export function writeEvidence(directory, envelope, projectRoot) {
  fs.mkdirSync(directory, { recursive: true });
  const evidenceDirectory = path.resolve(directory);
  const stem = evidenceFileStem(envelope.capability.id);
  const json = path.resolve(evidenceDirectory, `${stem}.json`);
  const human = path.resolve(evidenceDirectory, `${stem}.md`);
  if (!json.startsWith(`${evidenceDirectory}${path.sep}`) || !human.startsWith(`${evidenceDirectory}${path.sep}`)) {
    throw new Error('evidence_path_outside_directory');
  }
  assertEvidenceOwner(json, envelope.capability.id, 'json');
  assertEvidenceOwner(human, envelope.capability.id, 'human');
  envelope.files = { json: path.relative(projectRoot, json), human: path.relative(projectRoot, human) };
  fs.writeFileSync(json, `${JSON.stringify(envelope, null, 2)}\n`, { mode: 0o600 });
  fs.writeFileSync(human, `# Quality runner evidence\n\n- Capability: \`${envelope.capability.id}\`\n- Status: **${envelope.result.status}**\n- Reason: \`${envelope.result.reason}\`\n- CWD: \`${envelope.command.cwd}\`\n- Exit code: \`${envelope.execution.exit_code ?? 'n/a'}\`\n- Duration: ${envelope.execution.duration_ms.toFixed(2)} ms\n- Evidence: \`${envelope.files.json}\`\n\n## Stdout\n\n\`\`\`\n${envelope.evidence.stdout}\n\`\`\`\n\n## Stderr\n\n\`\`\`\n${envelope.evidence.stderr}\n\`\`\`\n`, { mode: 0o600 });
  return envelope.files;
}

function hashFile(filePath) { return createHash('sha256').update(fs.readFileSync(filePath)).digest('hex'); }

function assertEvidenceOwner(filePath, capabilityId, kind) {
  if (!fs.existsSync(filePath)) return;
  try {
    const contents = fs.readFileSync(filePath, 'utf8');
    if (kind === 'json' && JSON.parse(contents)?.capability?.id !== capabilityId) throw new Error('evidence_filename_collision');
    if (kind === 'human' && !contents.includes(`- Capability: \`${capabilityId}\``)) throw new Error('evidence_filename_collision');
  } catch (error) {
    if (error instanceof Error && error.message === 'evidence_filename_collision') throw error;
    throw new Error('evidence_filename_collision');
  }
}
