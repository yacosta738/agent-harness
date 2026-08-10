import path from 'node:path';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import { createRedactor, redactValue } from './redact.mjs';
import { normalizeImpactPath } from './git-impact.mjs';

export const EVIDENCE_VERSION = 'quality-runner-result/v2';
const STATUSES = new Set(['PASS', 'FAIL', 'BLOCKED', 'UNAVAILABLE', 'NOT_TESTED', 'STALE']);
const SHA256 = /^[0-9a-f]{64}$/i;

export function evidenceDigest(evidence) {
  const { envelope_digest: ignoredDigest, files: ignoredFiles, ...content } = evidence || {};
  return digest(content);
}

export function createEvidenceEnvelope(i = {}) {
  const impact = i.impact || {};
  const redactor = i.redactor || createRedactor(i.redaction);
  const capsuleDigest = i.capsule_digest ?? i.capsuleDigest;
  const envelope = {
    version: EVIDENCE_VERSION,
    change_id: req(i.changeId ?? i.change_id, 'change_id'),
    task_id: req(i.taskId ?? i.task_id, 'task_id'),
    run_id: req(i.runId ?? i.run_id, 'run_id'),
    base_sha: req(i.baseSha ?? i.base_sha, 'base_sha'),
    head_sha: req(i.headSha ?? i.head_sha, 'head_sha'),
    ...(i.revision === undefined ? {} : { revision: i.revision }),
    ...(capsuleDigest === undefined ? {} : { capsule_digest: capsuleDigest }),
    capability: i.capability,
    impact: { scope: impact.scope || 'changed-files', impact_digest: req(impact.impact_digest, 'impact_digest'), changed: paths(impact.changed || []), affected: paths(impact.affected || []) },
    config: identity(i.config, 'config'),
    command: redactValue(i.command || {}, redactor),
    toolchain: identity(i.toolchain, 'toolchain'),
    execution: i.execution || { exit_code: null, duration_ms: 0 },
    result: i.result || { status: 'BLOCKED', reason: 'result_missing' },
    parser: i.parser,
    threshold: i.threshold,
    evidence: redactValue(i.evidence || { stdout: '', stderr: '' }, redactor),
    artifacts: artifacts(i.artifacts || [], i.projectRoot),
    environment: i.environment,
    timestamp: i.timestamp || new Date().toISOString(),
  };
  envelope.config.digest ||= digest(envelope.config);
  envelope.command.digest ||= digest(envelope.command);
  envelope.toolchain.digest ||= digest(envelope.toolchain);
  envelope.envelope_digest = evidenceDigest(envelope);
  return envelope;
}

export function validateEvidenceEnvelope(evidence) {
  if (!evidence || typeof evidence !== 'object' || Array.isArray(evidence) || evidence.version !== EVIDENCE_VERSION) throw Error('evidence_version_invalid');
  for (const key of ['change_id', 'task_id', 'run_id', 'base_sha', 'head_sha']) req(evidence[key], key);
  if (!SHA256.test(evidence.impact?.impact_digest || '')) throw Error('impact_digest_invalid');
  for (const key of ['config', 'command', 'toolchain']) {
    if (!evidence[key] || typeof evidence[key] !== 'object' || !SHA256.test(evidence[key].digest || '')) throw Error(`${key}_digest_invalid`);
  }
  if (typeof evidence.timestamp !== 'string' || !evidence.timestamp.trim() || !Number.isFinite(Date.parse(evidence.timestamp))) throw Error('evidence_timestamp_invalid');
  if (!evidence.result || typeof evidence.result !== 'object' || !STATUSES.has(evidence.result.status)) throw Error('evidence_result_invalid');
  if (!Array.isArray(evidence.artifacts)) throw Error('evidence_artifacts_invalid');
  for (const artifact of evidence.artifacts) {
    if (!artifact || typeof artifact !== 'object' || typeof artifact.path !== 'string' || !SHA256.test(artifact.sha256 || '') || artifact.status === 'UNAVAILABLE') throw Error('artifact_hash_unavailable');
  }
  if (evidence.revision !== undefined && (!Number.isInteger(evidence.revision) || evidence.revision < 0)) throw Error('evidence_revision_invalid');
  if (evidence.capsule_digest !== undefined && !SHA256.test(evidence.capsule_digest)) throw Error('evidence_capsule_digest_invalid');
  if (!SHA256.test(evidence.envelope_digest || '') || evidence.envelope_digest !== evidenceDigest(evidence)) throw Error('envelope_digest_invalid');
  return evidence;
}

export function upgradeEvidence(value) {
  if (!value || typeof value !== 'object') throw Error('evidence_invalid');
  if (value.version === EVIDENCE_VERSION) return value;
  if (value.version !== 'quality-runner-result/v1') throw Error('evidence_version_unsupported');
  const complete = ['change_id', 'task_id', 'run_id', 'base_sha', 'head_sha'].every((key) => typeof value[key] === 'string' && value[key].trim()) && value.impact?.impact_digest && value.config?.digest && value.toolchain?.digest;
  if (!complete) return { ...value, version: EVIDENCE_VERSION, compatibility: 'v1-legacy', trust_status: 'BLOCKED', result: { status: 'BLOCKED', reason: 'legacy_identity_unavailable' } };
  return createEvidenceEnvelope({ changeId: value.change_id, taskId: value.task_id, runId: value.run_id, baseSha: value.base_sha, headSha: value.head_sha, revision: value.revision, capsule_digest: value.capsule_digest, capability: value.capability, impact: value.impact, config: value.config, command: value.command, toolchain: value.toolchain, execution: value.execution, result: value.result, parser: value.parser, threshold: value.threshold, evidence: value.evidence, artifacts: value.artifacts, environment: value.environment, timestamp: value.timestamp });
}

export function hashArtifact(root, relative) {
  const normalized = normalizeImpactPath(relative);
  if (!root) return { path: normalized, sha256: null, status: 'UNAVAILABLE' };
  const project = path.resolve(root);
  const base = fs.realpathSync(project);
  const absolute = path.resolve(project, ...normalized.split('/'));
  if (!absolute.startsWith(`${project}${path.sep}`)) throw Error('artifact_path_outside_project');
  if (!fs.existsSync(absolute)) return { path: normalized, sha256: null, status: 'UNAVAILABLE' };
  const real = fs.realpathSync(absolute);
  if (!real.startsWith(`${base}${path.sep}`)) throw Error('artifact_symlink_outside_project');
  if (!fs.statSync(real).isFile()) throw Error('artifact_not_file');
  return { path: normalized, sha256: createHash('sha256').update(fs.readFileSync(real)).digest('hex'), status: 'AVAILABLE' };
}

function artifacts(values, root) { return values.map((value) => { const checked = hashArtifact(root, typeof value === 'string' ? value : value.path); return typeof value === 'string' ? checked : { ...value, ...checked }; }); }
function paths(values) { return [...new Set(values.map(normalizeImpactPath))].sort(); }
function identity(value, name) { if (!value || typeof value !== 'object' || Array.isArray(value)) throw Error(`${name}_identity_missing`); return { ...value }; }
function req(value, name) { if (typeof value !== 'string' || !value.trim()) throw Error(`${name}_missing`); return value; }
function digest(value) { return createHash('sha256').update(stable(value)).digest('hex'); }
function stable(value) { if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`; if (value && typeof value === 'object') return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stable(value[key])}`).join(',')}}`; return JSON.stringify(value); }
