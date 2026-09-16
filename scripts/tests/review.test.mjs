import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import test from 'node:test';
import { assessCandidate, startReview, captureReview, captureCorrection, acknowledgeApproved, setReviewMode, reviewStatus, materializeCandidate } from '../review-lib.mjs';

async function repo() {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'rdd-'));
  execFileSync('git', ['init', '-q', root]);
  execFileSync('git', ['-C', root, 'config', 'user.email', 'test@example.com']);
  execFileSync('git', ['-C', root, 'config', 'user.name', 'Test']);
  execFileSync('git', ['-C', root, 'config', 'commit.gpgsign', 'false']);
  await fs.writeFile(path.join(root, 'README.md'), 'base\n');
  execFileSync('git', ['-C', root, 'add', '.']); execFileSync('git', ['-C', root, 'commit', '-qm', 'base']);
  return root;
}

test('RDD freezes the candidate without changing the real index and burns only after exact acknowledgement', async () => {
  const root = await repo();
  await fs.writeFile(path.join(root, 'src.js'), 'dangerous();\n');
  const before = execFileSync('git', ['-C', root, 'status', '--porcelain']).toString();
  const assessment = assessCandidate(root);
  assert.equal(assessment.version, 'agent-harness.review-assessment/v1');
  assert.equal(assessment.risk, 'high');
  const configHome = await fs.mkdtemp(path.join(os.tmpdir(), 'rdd-config-'));
  assert.equal((await reviewStatus(root, { configHome })).mode, 'disabled');
  await setReviewMode(root, 'enable', { configHome });
  const started = await startReview(root, { configHome });
  assert.equal(started.version, 'agent-harness.review/v1');
  assert.equal(execFileSync('git', ['-C', root, 'status', '--porcelain']).toString(), before);
  const captured = await captureReview(root, { ...started.binding, findings: [], reviewers: ['lens', 'mirror'], subjectHash: started.binding.subjectHash, configHome });
  assert.equal(captured.status, 'approved');
  await assert.rejects(() => acknowledgeApproved(root, { ...captured.binding, acknowledgement: 'wrong', configHome }), /acknowledgement_invalid/);
  const burned = await acknowledgeApproved(root, { ...captured.binding, acknowledgement: captured.next_transition.token, configHome });
  assert.equal(burned.status, 'burned');
  assert.equal((await reviewStatus(root, { configHome })).status, 'unmanaged');
});

test('RDD permits one bounded correction and escalates failed validation', async () => {
  const root = await repo(); await fs.writeFile(path.join(root, 'src.js'), 'unsafe();\n');
  const configHome = await fs.mkdtemp(path.join(os.tmpdir(), 'rdd-config-')); await setReviewMode(root, 'enable', { configHome });
  const started = await startReview(root, { configHome });
  const correction = await captureReview(root, { ...started.binding, subjectHash: started.binding.subjectHash, findings: [{ severity: 'CRITICAL', candidateCaused: true }], reviewers: ['lens', 'mirror'], configHome });
  assert.equal(correction.status, 'correction_pending');
  const escalated = await captureCorrection(root, { ...correction.binding, subjectHash: correction.binding.subjectHash, validatorStatus: 'FAIL', configHome });
  assert.equal(escalated.status, 'escalated');
});

test('RDD stays off by default, rejects incomplete inspection, and blocks traversal destinations', async () => {
  const root = await repo();
  await fs.writeFile(path.join(root, 'src.js'), 'unsafe();\n');
  const configHome = await fs.mkdtemp(path.join(os.tmpdir(), 'rdd-config-'));
  const disabled = await startReview(root, { configHome });
  assert.equal(disabled.status, 'disabled/unmanaged');
  await setReviewMode(root, 'enable', { configHome });
  const started = await startReview(root, { configHome });
  const escalated = await captureReview(root, { ...started.binding, findings: [], reviewers: ['lens'], subjectHash: started.binding.subjectHash, configHome });
  assert.equal(escalated.status, 'escalated');
  await assert.rejects(() => materializeCandidate(root, { subjectHash: started.binding.subjectHash, destination: path.join(root, '..', 'escape') }), /destination_path_traversal/);
});
