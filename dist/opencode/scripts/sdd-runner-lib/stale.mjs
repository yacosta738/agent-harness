import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { normalizeImpactPath } from './git-impact.mjs';

export function checkEvidenceFreshness(e, c, o = {}) {
  if (!e || !c) return { status: 'BLOCKED', reason: 'evidence_missing' };
  if (e.change_id !== c.change_id || e.task_id !== c.task_id || e.run_id !== c.run_id) {
    return { status: 'BLOCKED', reason: 'foreign_identity' };
  }
  if (e.capability?.id !== undefined && e.capability?.id !== c.capability?.id) {
    return { status: 'BLOCKED', reason: 'foreign_capability' };
  }
  for (const key of ['base_sha', 'head_sha']) {
    if (e[key] !== c[key]) return { status: 'STALE', reason: `${key}_changed` };
  }

  const currentHead = resolveCurrentHead(o);
  if (!currentHead.ok) return { status: currentHead.status, reason: currentHead.reason };
  if (normalizeSha(e.head_sha) !== normalizeSha(currentHead.value)) {
    return { status: 'STALE', reason: 'head_sha_changed' };
  }

  const policyResult = comparePolicyDigests(e, c, o);
  if (policyResult) return policyResult;

  for (const [key, reason] of [['impact', 'impact_changed'], ['config', 'config_changed'], ['command', 'command_changed'], ['toolchain', 'toolchain_changed']]) {
    if (digestOf(e[key]) !== digestOf(c[key])) return { status: 'STALE', reason };
  }

  const artifactsResult = verifyArtifacts(e.artifacts || [], o.projectRoot);
  if (artifactsResult) return artifactsResult;
  return { status: 'FRESH', reason: 'identity_and_digests_match' };
}

export const isFreshEvidence = (...args) => checkEvidenceFreshness(...args).status === 'FRESH';

function resolveCurrentHead(options) {
  const resolver = options.resolveHead || options.gitResolver || options.git?.resolveHead || options.git?.head;
  if (resolver) {
    try {
      const resolved = typeof resolver === 'function' ? resolver(options.projectRoot) : resolver;
      const value = typeof resolved === 'string' ? resolved : resolved?.head_sha || resolved?.headSha || resolved?.value;
      if (typeof value === 'string' && value.trim()) return { ok: true, value: value.trim() };
      return { ok: false, status: resolved?.status === 'BLOCKED' ? 'BLOCKED' : 'UNAVAILABLE', reason: 'git_head_unavailable' };
    } catch {
      return { ok: false, status: 'BLOCKED', reason: 'git_head_unavailable' };
    }
  }
  if (!options.projectRoot) return { ok: false, status: 'BLOCKED', reason: 'git_head_unavailable' };
  const result = spawnSync('git', ['-C', path.resolve(options.projectRoot), 'rev-parse', '--verify', 'HEAD^{commit}'], { encoding: 'utf8' });
  const value = result.status === 0 ? result.stdout.trim() : '';
  return value ? { ok: true, value } : { ok: false, status: 'UNAVAILABLE', reason: 'git_head_unavailable' };
}

function comparePolicyDigests(evidence, candidate, options) {
  const optionPolicy = options.policyDigest || options.policy;
  const evidenceDigest = readDigest(evidence.policy_digest || evidence.policyDigest || evidence.policy);
  const candidateDigest = readDigest(options.candidatePolicyDigest || options.candidatePolicy || optionPolicy?.candidateDigest || optionPolicy?.candidate || candidate.policy_digest || candidate.policyDigest || candidate.policy);
  const currentDigest = readDigest(options.currentPolicyDigest || options.currentPolicy || optionPolicy?.currentDigest || optionPolicy?.current || (typeof optionPolicy === 'string' ? optionPolicy : undefined) || options.policy_digest);
  if (candidateDigest !== undefined && currentDigest !== undefined && candidateDigest !== currentDigest) return { status: 'STALE', reason: 'policy_changed' };
  if (candidateDigest !== undefined && evidenceDigest === undefined) return { status: 'BLOCKED', reason: 'policy_digest_unavailable' };
  if (currentDigest !== undefined && evidenceDigest === undefined) return { status: 'BLOCKED', reason: 'policy_digest_unavailable' };
  if (candidateDigest !== undefined && evidenceDigest !== candidateDigest) return { status: 'STALE', reason: 'policy_changed' };
  if (currentDigest !== undefined && evidenceDigest !== currentDigest) return { status: 'STALE', reason: 'policy_changed' };
  return undefined;
}

function verifyArtifacts(artifacts, projectRoot) {
  for (const artifact of artifacts) {
    try {
      if (!artifact || typeof artifact !== 'object') return { status: 'BLOCKED', reason: 'artifact_unverifiable' };
      const normalized = normalizeImpactPath(artifact.path);
      if (normalized !== artifact.path) return { status: 'BLOCKED', reason: 'artifact_path_rejected' };
      if (artifact.status === 'UNAVAILABLE' || typeof artifact.sha256 !== 'string' || !/^[0-9a-f]{64}$/i.test(artifact.sha256)) {
        return { status: 'BLOCKED', reason: 'artifact_hash_unavailable' };
      }
      if (!projectRoot) return { status: 'BLOCKED', reason: 'artifact_verification_unavailable' };
      const root = path.resolve(projectRoot);
      const base = fs.realpathSync(root);
      const file = path.resolve(root, ...normalized.split('/'));
      if (!file.startsWith(`${root}${path.sep}`) || !fs.existsSync(file)) return { status: 'STALE', reason: 'artifact_missing' };
      const real = fs.realpathSync(file);
      if (!real.startsWith(`${base}${path.sep}`)) return { status: 'BLOCKED', reason: 'artifact_symlink_outside_project' };
      if (!fs.statSync(real).isFile()) return { status: 'BLOCKED', reason: 'artifact_not_file' };
      if (hash(real) !== artifact.sha256) return { status: 'STALE', reason: 'artifact_changed' };
    } catch {
      return { status: 'BLOCKED', reason: 'artifact_unverifiable' };
    }
  }
  return undefined;
}

function readDigest(value) {
  if (typeof value === 'string') return value.trim() || undefined;
  if (value && typeof value === 'object') return readDigest(value.digest || value.policy_digest || value.policyDigest);
  return undefined;
}

function digestOf(value) {
  if (!value || typeof value !== 'object') return undefined;
  return value.digest !== undefined ? value.digest : value.impact_digest;
}

function normalizeSha(value) {
  return typeof value === 'string' ? value.trim().toLowerCase() : value;
}

function hash(file) {
  return createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}
