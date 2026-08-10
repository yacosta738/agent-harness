#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
node --input-type=module - "$ROOT" "${1:-all}" <<'NODE'
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';

const [root, focus = 'all'] = process.argv.slice(2);
const fsm = path.join(root, 'scripts/sdd-fsm.mjs');
const project = fs.mkdtempSync(path.join(os.tmpdir(), 'sdd-fsm-'));
const change = path.join(project, 'openspec/changes/fixture');
const run = (args) => new Promise((resolve) => {
  const child = spawn(process.execPath, [fsm, 'transition', '--project', project, '--change', 'fixture', ...args], { encoding: 'utf8' });
  let stdout = ''; let stderr = '';
  child.stdout.on('data', (chunk) => { stdout += chunk; });
  child.stderr.on('data', (chunk) => { stderr += chunk; });
  child.on('close', (code) => resolve({ code, stdout, stderr }));
});
const write = (relative, content) => { const file = path.join(change, relative); fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, content); };
try {
  write('state.yaml', 'change: fixture\ncurrent_phase: propose\ncompleted: [init, explore, propose]\nnext: spec-design\nupdated: 2026-08-09\n');
  write('../../config.yaml', 'workflow_fsm:\n  enabled: true\n  lock_ttl_ms: 300000\n');
  write('exploration.md', '# exploration'); write('proposal.md', '# proposal');
  const specArgs = ['--to', 'spec', '--expected-revision', '0', '--idempotency-key', 'spec-1'];
  const spec = await run(specArgs); assert.equal(spec.code, 0, spec.stderr); assert.equal(JSON.parse(spec.stdout).accepted, true);
  const repeat = await run(specArgs); assert.equal(repeat.code, 0); assert.equal(JSON.parse(repeat.stdout).idempotent, true);
  write('design.md', '# design');
  const design = await run(['--to', 'design', '--expected-revision', '1', '--idempotency-key', 'design-1']);
  assert.equal(design.code, 0, design.stderr); assert.equal(JSON.parse(design.stdout).accepted, true);
  write('specs/fixture/spec.md', '# spec'); write('tasks.md', '# tasks');
  const stale = await run(['--to', 'tasks', '--expected-revision', '0', '--idempotency-key', 'stale']);
  assert.notEqual(stale.code, 0); assert.equal(JSON.parse(stale.stdout).reason, 'stale_revision');
  const concurrentArgs = ['--to', 'tasks', '--expected-revision', '2', '--idempotency-key'];
  const [first, second] = await Promise.all([run([...concurrentArgs, 'writer-a']), run([...concurrentArgs, 'writer-b'])]);
  const outcomes = [first, second].map((item) => JSON.parse(item.stdout));
  assert.equal(outcomes.filter((item) => item.accepted).length, 1);
  assert.equal(outcomes.filter((item) => !item.accepted).length, 1);
  fs.mkdirSync(path.join(change, '.fsm.lock')); fs.writeFileSync(path.join(change, '.fsm.lock/owner'), JSON.stringify({ pid: 999999, host: process.env.HOSTNAME || 'unknown', time: 1 }));
  const old = new Date(1); fs.utimesSync(path.join(change, '.fsm.lock'), old, old);
  const staleLock = await run(['--to', 'apply', '--expected-revision', '3', '--idempotency-key', 'after-stale-lock', '--reason', 'resume after stale writer']);
  assert.equal(staleLock.code, 0, staleLock.stderr); assert.equal(JSON.parse(staleLock.stdout).accepted, true);

  const archiveCase = async (label, qaReport, expectedAccepted = false) => {
    write('state.yaml', 'change: fixture\ncurrent_phase: qa\ncompleted: [init, explore, propose, spec, design, tasks, apply, verify, qa]\nnext: archive\nupdated: 2026-08-09\nrevision: 0\n');
    write('verify-report.md', validVerifyReport);
    write('qa-report.md', qaReport);
    const outcome = await run(['--to', 'archive', '--expected-revision', '0', '--idempotency-key', `archive-${label}`]);
    const body = JSON.parse(outcome.stdout);
    assert.equal(body.accepted, expectedAccepted, `${label}: ${outcome.stderr || outcome.stdout}`);
    if (!expectedAccepted) assert.equal(body.reason, 'archive_gate_failed');
  };
  const validVerifyReport = '# Verification Report\n\n## Identity and scope\n- Change: fixture\n\n## Completeness\n- Complete.\n\n## Build, syntax, and runtime evidence\n- Smoke passed.\n\n## Spec compliance matrix\n- Requirements covered.\n\n## Correctness assessment\n- Correct.\n\n## Design coherence\n- Coherent.\n\n## Task completion and TDD audit\n- Fixture evidence.\n\n## Findings\n- No findings.\n\n## Limitations and handoff\n- None.\n\n## Verdict\nPASS\n';
  const incompleteQa = 'Verdict: PASS\n';
  const blockingTableQa = '# Acceptance QA Report\n\n## Identity\n- Change: fixture\n\n## Sources of Truth\n- Specs.\n\n## Target and Environment\n- Fixture.\n\n## Capability Inventory\n- Smoke.\n\n## Scenario Matrix\n- Scenario.\n\n## Untested Scope\n- None.\n\n## Findings\n| Finding | Detail | Severity | Status |\n|---|---|---|---|\n| active issue | still active | CRITICAL | Open |\n\n## Verdict\nPASS\n\n## Rationale\n- Evidence.\n\n## Limitations and Handoff\n- None.\n';
  const resolvedTableQa = '# Acceptance QA Report\n\n## Identity\n- Change: fixture\n\n## Sources of Truth\n- Specs.\n\n## Target and Environment\n- Fixture.\n\n## Capability Inventory\n- Smoke.\n\n## Scenario Matrix\n- Scenario.\n\n## Untested Scope\n- None.\n\n## Findings\n| Finding | Detail | Severity | Status |\n|---|---|---|---|\n| old issue | disposition recorded | CRITICAL | Resolved — disposition recorded |\n\n## Verdict\nPASS\n\n## Rationale\n- Evidence.\n\n## Limitations and Handoff\n- None.\n';
  const archiveExistingReports = async () => {
    const archived = path.join(root, 'openspec/changes/archive/2026-08-09-integrate-acceptance-qa-phase');
    write('state.yaml', 'change: fixture\ncurrent_phase: qa\ncompleted: [init, explore, propose, spec, design, tasks, apply, verify, qa]\nnext: archive\nupdated: 2026-08-09\nrevision: 0\n');
    write('verify-report.md', fs.readFileSync(path.join(archived, 'verify-report.md'), 'utf8'));
    write('qa-report.md', fs.readFileSync(path.join(archived, 'qa-report.md'), 'utf8'));
    write('../../config.yaml', 'workflow_fsm:\n  enabled: true\nrules:\n  archive:\n    allow_non_runtime_exception: true\n');
    const outcome = await run(['--to', 'archive', '--expected-revision', '0', '--idempotency-key', 'archive-existing']);
    assert.equal(outcome.code, 0, outcome.stderr || outcome.stdout);
    assert.equal(JSON.parse(outcome.stdout).accepted, true);
  };
  if (focus === 'all' || focus === 'archive-minimum') await archiveCase('minimum', incompleteQa);
  if (focus === 'all' || focus === 'archive-findings') await archiveCase('findings', blockingTableQa);
  if (focus === 'archive-resolved') await archiveCase('resolved', resolvedTableQa, true);
  if (focus === 'archive-exception') await archiveExistingReports();
  console.log('fsm: parallel completion, idempotency, stale revision, concurrency, stale lock, and atomic transition checks passed');
} finally { fs.rmSync(project, { recursive: true, force: true }); }
NODE
