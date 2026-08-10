#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
node --input-type=module - "$ROOT" <<'NODE'
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.argv[2];
const lib = (name) => path.join(root, 'scripts/sdd-runner-lib', `${name}.mjs`);
const { calculateGitImpact, normalizeImpactPath } = await import(lib('git-impact'));
const { createEvidenceEnvelope, upgradeEvidence, evidenceDigest, validateEvidenceEnvelope } = await import(lib('evidence-boundary'));
const { checkEvidenceFreshness } = await import(lib('stale'));
const { resolvePolicy, evaluatePolicy } = await import(lib('policy'));
const { validateToolchainLock } = await import(lib('toolchain'));
const { normalizeCrap, normalizeMutation, normalizeDry, normalizeAcceptance } = await import(lib('metrics'));
const { createCapsule, validateCapsule, capsuleDigest } = await import(lib('capsule'));
const { createRequest, validateRequest, guardWorkerPayload, requestDigest } = await import(lib('request'));
const { evaluateOutcome, validateOutcome, outcomeDigest, isAuthoritativeOutcome } = await import(lib('outcome'));
const fixture = JSON.parse(fs.readFileSync(path.join(root, 'scripts/fixtures/control-plane/manifest.json'), 'utf8'));
assert.equal(fixture.version, 'control-plane/v1');
const project = fs.mkdtempSync(path.join(os.tmpdir(), 'control-plane-'));
let symlinkTarget;
const git = (...args) => { const r = spawnSync('git', ['-C', project, ...args], { encoding: 'utf8' }); assert.equal(r.status, 0, r.stderr); return r.stdout.trim(); };
const write = (name, value) => { fs.mkdirSync(path.dirname(path.join(project, name)), { recursive: true }); fs.writeFileSync(path.join(project, name), value); };
try {
  git('init', '-q'); git('config', 'user.email', 'fixture@example.test'); git('config', 'user.name', 'fixture');
  write('src/a.js', 'export const a = 1;\n'); git('add', '.'); git('commit', '-qm', 'base'); const base = git('rev-parse', 'HEAD');
  write('src/a.js', 'export const a = 2;\n'); write('test/a.test.js', 'assert.equal(a, 2);\n'); git('add', '.'); git('commit', '-qm', 'head'); const head = git('rev-parse', 'HEAD');
  const impact = calculateGitImpact({ projectRoot: project, baseSha: base, headSha: head });
  assert.equal(impact.status, 'AVAILABLE'); assert.deepEqual(impact.changed, ['src/a.js', 'test/a.test.js']);
  assert.equal(impact.impact_digest, calculateGitImpact({ projectRoot: project, baseSha: base, headSha: head }).impact_digest);
  write('dirty.txt', 'dirty'); assert.equal(calculateGitImpact({ projectRoot: project, baseSha: base, headSha: head }).status, 'BLOCKED');
  assert.equal(calculateGitImpact({ projectRoot: project, baseSha: base, headSha: head, allowDirty: true }).dirty, true);
  assert.throws(() => normalizeImpactPath('../outside'), /path|traversal|absolute/i);
  const policy = resolvePolicy({ profile: 'STANDARD', profiles: { STANDARD: ['tests', 'coverage'] }, capabilities: { tests: 'required', coverage: 'preferred', mutation: 'disabled' } });
  assert.deepEqual(policy.selected, ['tests', 'coverage']);
  const decisions = evaluatePolicy(policy, { tests: 'UNAVAILABLE', coverage: 'UNAVAILABLE', mutation: 'PASS' });
  assert.equal(decisions.tests.status, 'BLOCKED'); assert.equal(decisions.coverage.status, 'UNAVAILABLE'); assert.equal(decisions.mutation.status, 'NOT_TESTED');
  const lock = { version: 'toolchain-lock/v1', tools: { node: { provider: 'node', version: '24.16.0', digest: 'sha256:' + '0'.repeat(64) } } };
  assert.equal(validateToolchainLock(lock).version, 'toolchain-lock/v1'); assert.throws(() => validateToolchainLock({ ...lock, tools: { node: { provider: 'node', version: 'latest', digest: 'sha256:' + '0'.repeat(64) } } }), /latest|pinned/i);
  const evidence = createEvidenceEnvelope({ changeId: 'fixture-change', taskId: '1.1', runId: 'run-1', baseSha: base, headSha: head, impact, config: { path: 'openspec/config.yaml' }, command: { argv: ['node', 'test.mjs'] }, toolchain: { provider: 'node', version: '24.16.0' }, result: { status: 'PASS', reason: 'ok' }, evidence: { stdout: 'safe', stderr: '' }, artifacts: [], projectRoot: project });
  assert.equal(evidence.version, 'quality-runner-result/v2'); assert.equal(validateEvidenceEnvelope(evidence).envelope_digest, evidenceDigest(evidence)); assert.equal(evidenceDigest({ ...evidence, files: { json: 'artifacts/run.json' } }), evidenceDigest(evidence)); assert.equal(checkEvidenceFreshness(evidence, evidence, { projectRoot: project }).status, 'FRESH');
  assert.equal(checkEvidenceFreshness(evidence, { ...evidence, head_sha: 'other' }, { projectRoot: project }).status, 'STALE');
  assert.equal(checkEvidenceFreshness({ ...evidence, artifacts: [{ path: '../escape', sha256: 'bad' }] }, evidence, { projectRoot: project }).status, 'BLOCKED');
  assert.equal(upgradeEvidence({ ...evidence, version: 'quality-runner-result/v1' }).version, 'quality-runner-result/v2');
  assert.equal(normalizeCrap({ provider: 'fixture', version: '1.0.0', semantics: 'statement', scope: 'changed-functions', cyclomatic: 2, coverage: 0.5 }).normalized.crap, 2.5);
  assert.equal(normalizeMutation({ provider: 'fixture', version: '1.0.0', semantics: 'provider-defined', scope: 'changed-files', total: 4, killed: 3 }).normalized.killed, 3);
  assert.equal(normalizeDry({ provider: 'fixture', version: '1.0.0', semantics: 'structural-candidates', candidates: [] }).advisory, true);
  assert.equal(normalizeAcceptance({ provider: 'fixture', version: '1.0.0', semantics: 'target-dependent', target: null }).status, 'UNAVAILABLE');

  const capsuleInput = {
    change_id: 'fixture-change', task_id: '2.1', run_id: 'capsule-run', role: 'sdd-apply', capability: 'edit_product',
    phase: 'apply', state: 'READY', objective: 'Prepare the bounded implementation slice', impact_set_ref: 'impact-1',
    base_sha: base, head_sha: head, evidence_refs: ['evidence/capsule-run.json'],
    allowed_actions: ['edit_product', 'request_verification'],
    allowed_outcomes: ['implementation_ready', 'request_verification', 'blocked'],
    constraints: { worker_write_forbidden: true, max_output_bytes: 4096 },
  };
  const capsule = createCapsule(capsuleInput);
  assert.equal(capsule.version, 'capsule/v1');
  assert.equal(capsule.capsule_digest, capsuleDigest(capsule));
  assert.deepEqual(validateCapsule(capsule).allowed_actions, capsule.allowed_actions);
  assert.throws(() => createCapsule({ ...capsuleInput, procedure: ['step one', 'step two'] }), /procedure|unknown|field_forbidden/i);

  const requestInput = {
    change_id: capsule.change_id, task_id: capsule.task_id, run_id: capsule.run_id,
    capsule_digest: capsule.capsule_digest, expected_revision: 3, expected_hash: 'revision-hash',
    idempotency_key: 'capsule-request-1', action: 'edit_product', payload: { paths: ['src/a.js'] },
  };
  const request = createRequest(requestInput, capsule, { projectRoot: project });
  assert.equal(request.version, 'request/v1');
  assert.equal(request.request_digest, requestDigest(request));
  assert.deepEqual(validateRequest(request, capsule, { projectRoot: project }).identity, { change_id: capsule.change_id, task_id: capsule.task_id, run_id: capsule.run_id });
  assert.equal(guardWorkerPayload({ paths: ['src/a.js'] }, { projectRoot: project }).allowed, true);
  const forbiddenWrite = guardWorkerPayload({ write_paths: ['openspec/changes/fixture/state.yaml'] }, { projectRoot: project });
  assert.equal(forbiddenWrite.allowed, false);
  assert.equal(forbiddenWrite.worker_write_forbidden, true);
  for (const forbiddenPath of ['state.yaml', 'artifacts/runs/capsule-run/evidence.json', 'openspec/config.yaml', 'openspec/quality-toolchain.lock', '.fsm.lock']) {
    assert.equal(guardWorkerPayload({ path: forbiddenPath }, { projectRoot: project }).worker_write_forbidden, true, forbiddenPath);
  }
  assert.equal(guardWorkerPayload({ status: 'PASS' }, { projectRoot: project }).worker_write_forbidden, true);
  assert.throws(() => createRequest({ ...requestInput, action: 'declare_pass' }, capsule), /pass|allowed/i);
  assert.throws(() => createRequest({ ...requestInput, payload: { write_paths: ['state.yaml'] } }, capsule), /worker_write_forbidden/i);

  const evidenceRef = 'evidence/capsule-run.json';
  const outcomeInput = {
    change_id: capsule.change_id, task_id: capsule.task_id, run_id: capsule.run_id, capsule_digest: capsule.capsule_digest,
    producer: 'runner', accepted: true, status: 'PASS', reason: 'runner evidence is current', evidence_refs: [evidenceRef],
    stale: false, revision: 3,
  };
  const capsuleEvidence = createEvidenceEnvelope({ changeId: capsule.change_id, taskId: capsule.task_id, runId: capsule.run_id, capsuleDigest: capsule.capsule_digest, revision: 3, baseSha: base, headSha: head, impact, config: { path: 'openspec/config.yaml' }, command: { argv: ['node', 'test.mjs'] }, toolchain: { provider: 'node', version: '24.16.0' }, result: { status: 'PASS', reason: 'runner evidence is current' }, evidence: { stdout: 'safe', stderr: '' }, artifacts: [], projectRoot: project });
  assert.equal(validateEvidenceEnvelope(capsuleEvidence).capsule_digest, capsule.capsule_digest);
  const outcomeContext = {
    capsule, currentRevision: 3,
    projectRoot: project,
    evidence: [{ ref: evidenceRef, envelope: capsuleEvidence }],
  };
  const authoritative = evaluateOutcome(outcomeInput, outcomeContext);
  assert.equal(authoritative.version, 'outcome/v1');
  assert.equal(authoritative.status, 'PASS');
  assert.equal(authoritative.authoritative, true);
  assert.equal(isAuthoritativeOutcome(authoritative), true);
  assert.equal(isAuthoritativeOutcome(JSON.parse(JSON.stringify(authoritative))), false);
  assert.equal(authoritative.outcome_digest, outcomeDigest(authoritative));
  assert.equal(validateOutcome(authoritative).status, 'PASS');
  const agentPass = evaluateOutcome({ ...outcomeInput, producer: 'agent' }, outcomeContext);
  assert.equal(agentPass.authoritative, false);
  assert.notEqual(agentPass.status, 'PASS');
  assert.equal(agentPass.reason, 'agent_authored_pass');
  assert.equal(evaluateOutcome({ ...outcomeInput, stale: true }, outcomeContext).status, 'STALE');
  assert.equal(evaluateOutcome({ ...outcomeInput, run_id: 'foreign-run' }, outcomeContext).status, 'STALE');
  assert.equal(evaluateOutcome({ ...outcomeInput, evidence_refs: [] }, outcomeContext).status, 'UNAVAILABLE');
  assert.equal(evaluateOutcome({ ...outcomeInput, evidence_refs: ['evidence/unknown.json'] }, outcomeContext).status, 'BLOCKED');
  assert.throws(() => validateOutcome({ ...outcomeInput, version: 'outcome/v1', status: 'MAYBE' }), /status|enum/i);

  const regressionFailures = [];
  const regression = (name, assertion) => {
    try { assertion(); } catch (error) { regressionFailures.push(`${name}: ${error instanceof Error ? error.message : String(error)}`); }
  };
  regression('missing capsule digest is rejected', () => {
    const withoutDigest = { ...capsule }; delete withoutDigest.capsule_digest;
    assert.throws(() => validateCapsule(withoutDigest), /digest/i);
  });
  regression('missing request digest is rejected', () => {
    const withoutDigest = { ...request }; delete withoutDigest.request_digest;
    assert.throws(() => validateRequest(withoutDigest, capsule, { projectRoot: project }), /digest/i);
  });
  regression('nested authority aliases are rejected', () => {
    for (const [key, value] of [['pass', true], ['result', 'PASS'], ['claimed_waiver', true], ['approve_waiver', true]]) {
      assert.equal(guardWorkerPayload({ nested: { [key]: value } }, { projectRoot: project }).allowed, false, key);
    }
  });
  regression('escaping request symlink is rejected', () => {
    symlinkTarget = fs.mkdtempSync(path.join(os.tmpdir(), 'control-plane-outside-'));
    fs.writeFileSync(path.join(symlinkTarget, 'secret.txt'), 'secret');
    fs.symlinkSync(symlinkTarget, path.join(project, 'escape'), 'dir');
    assert.equal(guardWorkerPayload({ path: 'escape/secret.txt' }, { projectRoot: project }).allowed, false);
  });
  regression('minimal evidence cannot authorize PASS', () => {
    const result = evaluateOutcome(outcomeInput, { ...outcomeContext, evidence: [{ ref: evidenceRef, envelope: { ref: evidenceRef, change_id: capsule.change_id, task_id: capsule.task_id, run_id: capsule.run_id, base_sha: base, head_sha: head, status: 'PASS' } }] });
    assert.notEqual(result.status, 'PASS');
    assert.equal(result.authoritative, false);
  });
  regression('evidence revision must match outcome revision', () => {
    const mismatchedEvidence = createEvidenceEnvelope({ changeId: capsule.change_id, taskId: capsule.task_id, runId: capsule.run_id, capsuleDigest: capsule.capsule_digest, revision: 99, baseSha: base, headSha: head, impact, config: { path: 'openspec/config.yaml' }, command: { argv: ['node', 'test.mjs'] }, toolchain: { provider: 'node', version: '24.16.0' }, result: { status: 'PASS', reason: 'runner evidence is current' }, evidence: { stdout: 'safe', stderr: '' }, artifacts: [], projectRoot: project });
    const result = evaluateOutcome(outcomeInput, { ...outcomeContext, evidence: [{ ref: evidenceRef, envelope: mismatchedEvidence }] });
    assert.notEqual(result.status, 'PASS');
    assert.equal(result.authoritative, false);
  });
  regression('self-forged runner outcome is not authoritative', () => {
    const forged = { version: 'outcome/v1', ...outcomeInput, accepted: true, authoritative: true, stale: false };
    forged.outcome_digest = outcomeDigest(forged);
    assert.equal(isAuthoritativeOutcome(forged), false);
  });
  const policyEvidence = { ...evidence, policy_digest: 'policy-a' };
  regression('policy digest changes stale evidence', () => {
    assert.equal(checkEvidenceFreshness(policyEvidence, policyEvidence, { projectRoot: project, candidatePolicyDigest: 'policy-a', currentPolicyDigest: 'policy-b' }).status, 'STALE');
  });
  regression('unavailable artifact hash is non-pass', () => {
    assert.notEqual(checkEvidenceFreshness({ ...evidence, artifacts: [{ path: 'missing.txt', sha256: null, status: 'UNAVAILABLE' }] }, evidence, { projectRoot: project }).status, 'FRESH');
  });
  regression('missing Git head is non-pass', () => {
    const nonGit = fs.mkdtempSync(path.join(os.tmpdir(), 'control-plane-non-git-'));
    try { assert.notEqual(checkEvidenceFreshness(evidence, evidence, { projectRoot: nonGit }).status, 'FRESH'); }
    finally { fs.rmSync(nonGit, { recursive: true, force: true }); }
  });
  regression('Git resolver can supply the current head', () => {
    assert.equal(checkEvidenceFreshness(evidence, evidence, { projectRoot: project, gitResolver: () => head }).status, 'FRESH');
  });
  regression('range-like toolchain versions are rejected', () => {
    for (const version of ['1.x', '^1.2.3', '~1.2.3', '>=1.2.3', '1.2.x', '*', '']) {
      assert.throws(() => validateToolchainLock({ ...lock, tools: { node: { provider: 'node', version, digest: 'sha256:' + '0'.repeat(64) } } }), /unpinned|latest|invalid/i, version);
    }
  });
  write('after-evidence.txt', 'new commit\n');
  git('add', '.'); git('commit', '-qm', 'post-evidence');
  regression('repository HEAD changes stale evidence', () => {
    assert.equal(checkEvidenceFreshness(evidence, evidence, { projectRoot: project }).status, 'STALE');
  });
  assert.deepEqual(regressionFailures, [], regressionFailures.join('\n'));
  console.log('control-plane: RED/GREEN contracts, identity, impact, stale, policy, lock, metrics, and boundary checks passed');
} finally { fs.rmSync(project, { recursive: true, force: true }); if (symlinkTarget) fs.rmSync(symlinkTarget, { recursive: true, force: true }); }
NODE
