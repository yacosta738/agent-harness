#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
node --input-type=module - "$ROOT" <<'NODE'
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';

const root = process.argv[2], cli = path.join(root, 'scripts/sdd-handoff.mjs');
const project = fs.mkdtempSync(path.join(os.tmpdir(), 'sdd-handoff-'));
const changeRoot = (change = 'demo') => path.join(project, 'openspec/changes', change);
const run = (action, args = []) => new Promise((resolve) => {
  const child = spawn(process.execPath, [cli, action, '--project', project, ...args]); let stdout = '', stderr = '';
  child.stdout.on('data', (value) => { stdout += value; }); child.stderr.on('data', (value) => { stderr += value; });
  child.on('close', (code) => { let body; try { body = JSON.parse(stdout); } catch { body = null; } resolve({ code, body, stdout, stderr }); });
});
const base = (task, handoff, key, state = 'new') => ['--change', 'demo', '--task', task, '--handoff', handoff, '--role', 'sdd-apply', '--capability', 'edit_product', '--phase', 'apply', '--state', state, '--payload', '{"fixture":true}', '--idempotency-key', key, '--priority', '5', '--revision', '0'];
const mutate = (file, update) => { const value = JSON.parse(fs.readFileSync(file, 'utf8')); update(value); fs.writeFileSync(file, `${JSON.stringify(value)}\n`); };
try {
  fs.mkdirSync(changeRoot(), { recursive: true }); fs.mkdirSync(changeRoot('foreign'), { recursive: true });
  fs.writeFileSync(path.join(changeRoot(), 'state.yaml'), 'change: demo\ncurrent_phase: apply\ncompleted: [explore, propose, spec, design, tasks, apply]\nnext: verify\nupdated: 2026-08-09\n');
  fs.writeFileSync(path.join(changeRoot('foreign'), 'state.yaml'), 'change: foreign\ncurrent_phase: apply\ncompleted: [explore, propose, spec, design, tasks, apply]\nnext: verify\nupdated: 2026-08-09\n');
  fs.mkdirSync(path.join(project, 'openspec'), { recursive: true }); fs.writeFileSync(path.join(project, 'openspec/config.yaml'), 'workflow_fsm:\n  enabled: false\n');
  let result = await run('list', []); assert.equal(result.body?.reason, 'change_required');

  result = await run('enqueue', base('happy', 'h-happy', 'k-happy')); assert.equal(result.code, 0, result.stderr || result.stdout);
  result = await run('claim', ['--change', 'demo', '--task', 'happy', '--handoff', 'h-happy', '--idempotency-key', 'k-happy', '--expected-revision', '0']); assert.equal(result.body?.handoff.state, 'in_process');
  result = await run('complete', ['--change', 'demo', '--task', 'happy', '--handoff', 'h-happy', '--idempotency-key', 'k-happy', '--expected-revision', '1']); assert.equal(result.body?.handoff.state, 'completed');
  result = await run('inspect', ['--change', 'demo', '--task', 'happy', '--handoff', 'h-happy']); assert.equal(result.body?.handoff.state, 'completed');

  await run('enqueue', base('busy', 'h-busy-a', 'k-busy-a')); await run('claim', ['--change', 'demo', '--task', 'busy', '--handoff', 'h-busy-a', '--idempotency-key', 'k-busy-a', '--expected-revision', '0']);
  await run('enqueue', base('busy', 'h-busy-b', 'k-busy-b')); result = await run('claim', ['--change', 'demo', '--task', 'busy', '--handoff', 'h-busy-b', '--idempotency-key', 'k-busy-b', '--expected-revision', '0']); assert.equal(result.body?.reason, 'task_already_in_process');
  result = await run('fail', ['--change', 'demo', '--task', 'busy', '--handoff', 'h-busy-a', '--idempotency-key', 'k-busy-a', '--expected-revision', '1', '--reason', 'fixture_cleanup']); assert.equal(result.body?.handoff.state, 'failed');

  await run('enqueue', base('duplicate', 'h-dup-a', 'k-duplicate')); result = await run('enqueue', base('duplicate', 'h-dup-b', 'k-duplicate')); assert.equal(result.body?.reason, 'duplicate_idempotency_key');
  result = await run('claim', ['--change', 'demo', '--task', 'duplicate', '--handoff', 'h-dup-a', '--idempotency-key', 'k-duplicate', '--expected-revision', '9']); assert.equal(result.body?.reason, 'revision_mismatch');

  await run('enqueue', base('identity', 'h-foreign', 'k-foreign')); await run('list', ['--change', 'foreign']);
  fs.copyFileSync(path.join(changeRoot(), 'handoffs/inbox/new/h-foreign.json'), path.join(changeRoot('foreign'), 'handoffs/inbox/new/h-foreign.json'));
  result = await run('inspect', ['--change', 'foreign', '--task', 'identity', '--handoff', 'h-foreign']); assert.equal(result.body?.reason, 'change_id_mismatch');
  result = await run('inspect', ['--change', 'demo', '--task', 'wrong-task', '--handoff', 'h-foreign']); assert.equal(result.body?.reason, 'task_id_mismatch');
  result = await run('claim', ['--change', 'demo', '--task', 'happy', '--handoff', 'h-happy', '--idempotency-key', 'k-happy', '--expected-revision', '2']); assert.equal(result.body?.reason, 'state_mismatch:new');
  result = await run('inspect', ['--change', '../demo', '--task', 'identity', '--handoff', 'h-foreign']); assert.equal(result.body?.reason, 'invalid_change_id');
  result = await run('inspect', ['--change', 'demo', '--task', 'identity', '--handoff', '../h-foreign']); assert.equal(result.body?.reason, 'invalid_handoff_id');

  const lock = path.join(changeRoot(), '.handoff.lock'); fs.mkdirSync(lock); fs.writeFileSync(path.join(lock, 'owner'), JSON.stringify({ pid: process.pid, host: os.hostname(), time: Date.now() }));
  result = await run('enqueue', [...base('lock', 'h-lock', 'k-lock'), '--lock-wait-ms', '0']); assert.equal(result.body?.reason, 'lock_conflict');
  fs.rmSync(lock, { recursive: true }); fs.mkdirSync(lock); fs.writeFileSync(path.join(lock, 'owner'), JSON.stringify({ pid: 999999, host: os.hostname(), time: 1 })); fs.utimesSync(lock, new Date(1), new Date(1));
  result = await run('enqueue', [...base('stale', 'h-stale', 'k-stale'), '--lock-ttl-ms', '1']); assert.equal(result.code, 0, result.stderr || result.stdout);

  await run('enqueue', base('recover', 'h-recover', 'k-recover')); await run('claim', ['--change', 'demo', '--task', 'recover', '--handoff', 'h-recover', '--idempotency-key', 'k-recover', '--expected-revision', '0']);
  await new Promise((resolve) => setTimeout(resolve, 10)); result = await run('recover', ['--change', 'demo', '--ttl-ms', '1']); assert.equal(result.body?.recovered, 1);
  result = await run('inspect', ['--change', 'demo', '--task', 'recover', '--handoff', 'h-recover']); assert.equal(result.body?.handoff.reason, 'recovery_timeout');
  const beforeReplay = fs.readFileSync(path.join(changeRoot(), 'events.jsonl'), 'utf8');
  result = await run('replay', ['--change', 'demo', '--task', 'recover', '--handoff', 'h-recover', '--idempotency-key', 'k-recover', '--expected-revision', '2', '--force', '--keep-archival']); assert.equal(result.body?.handoff.state, 'new');
  assert.equal(fs.readFileSync(path.join(changeRoot(), 'events.jsonl'), 'utf8').startsWith(beforeReplay), true, 'event log must remain append-only');

  await run('enqueue', base('fsm', 'h-fsm', 'k-fsm', 'verify_ready')); result = await run('claim', ['--change', 'demo', '--task', 'fsm', '--handoff', 'h-fsm', '--idempotency-key', 'k-fsm', '--expected-revision', '0', '--link-fsm']); assert.equal(result.body?.handoff.state, 'claim_failed');
  const concurrent = await Promise.all([
    run('enqueue', base('parallel-a', 'h-parallel-a', 'k-parallel-a')),
    run('enqueue', base('parallel-b', 'h-parallel-b', 'k-parallel-b')),
  ]); assert.equal(concurrent.every((item) => item.code === 0), true, concurrent.map((item) => item.stdout || item.stderr).join('\n'));
  result = await run('list', ['--change', 'demo', '--events']); const events = result.body?.events || [];
  assert.deepEqual(events.map((entry) => entry.seq), events.map((_, index) => index + 1));
  assert.equal(events.some((entry) => entry.type === 'HANDOFF_RECOVERED'), true); assert.equal(events.some((entry) => entry.type === 'HANDOFF_REPLAYED'), true);
  assert.equal(events.every((entry) => entry.payload_hash && entry.actor_provenance), true);
  console.log('handoff: enqueue/claim/complete, authority, locks, recovery, replay, and append-only event checks passed');
} finally { fs.rmSync(project, { recursive: true, force: true }); }
NODE
