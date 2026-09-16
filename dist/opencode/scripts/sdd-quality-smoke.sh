#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
FIXTURE="$ROOT/scripts/fixtures/runner-project"
trap 'rm -rf "$FIXTURE/artifacts" "$ROOT/scripts/fixtures/python-project/artifacts"' EXIT

node --input-type=module - "$ROOT" "$FIXTURE" "${1:-all}" <<'NODE'
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const [root, fixture, focus = 'all'] = process.argv.slice(2);
const runner = path.join(root, 'scripts/sdd-quality-runner.mjs');
const python = path.join(root, 'scripts/fixtures/python-project');
function run(capability, env = process.env) {
  const result = spawnSync(process.execPath, [runner, 'run', '--project', fixture, '--capability', capability, '--json'], { encoding: 'utf8', env });
  assert.ok(result.stdout, result.stderr);
  return { process: result, envelope: JSON.parse(result.stdout), item: JSON.parse(result.stdout).results[0] };
}
function createProject(manifest) {
  const parent = fs.mkdtempSync(path.join(os.tmpdir(), 'sdd-quality-regression-'));
  const project = path.join(parent, 'project');
  fs.mkdirSync(path.join(project, 'openspec'), { recursive: true });
  fs.writeFileSync(path.join(project, 'openspec/quality-runner.json'), JSON.stringify(manifest));
  return { parent, project };
}
function runProject(project, capability) {
  const result = spawnSync(process.execPath, [runner, 'run', '--project', project, '--capability', capability, '--json'], { encoding: 'utf8' });
  assert.ok(result.stdout, result.stderr);
  const envelope = JSON.parse(result.stdout);
  return { process: result, envelope, item: envelope.results[0] };
}

assert.equal(run('shell').item.result.status, 'PASS');
const pythonRun = spawnSync(process.execPath, [runner, 'run', '--project', python, '--capability', 'test', '--json'], { encoding: 'utf8' });
assert.equal(pythonRun.status, 0, pythonRun.stderr);
assert.equal(JSON.parse(pythonRun.stdout).results[0].result.status, 'PASS');
assert.equal(run('pass').item.artifacts[0].path, 'artifact.txt');
assert.equal(run('env', { ...process.env, FIXTURE_SECRET: 'fixture-env-secret' }).item.evidence.stdout, 'not-visible');
const secret = run('secret');
assert.equal(secret.item.result.status, 'FAIL');
assert.doesNotMatch(fs.readFileSync(path.join(fixture, secret.item.files.json), 'utf8'), /fixture-secret/);
assert.equal(run('missing').item.result.status, 'UNAVAILABLE');
assert.equal(run('timeout').item.result.status, 'BLOCKED');
assert.equal(run('parser').item.result.reason, 'parser_rejected');
assert.equal(run('threshold').item.result.reason, 'threshold_rejected');
assert.equal(run('skip').item.result.status, 'NOT_TESTED');

if (focus === 'all' || focus === 'evidence-path') {
  const capability = '../../../../evidence-escape';
  const { parent, project } = createProject({
    version: 'quality-runner/v1',
    enabled: true,
    capabilities: {
      [capability]: { argv: [process.execPath, '-e', "process.stdout.write('path-test')"], cwd: '.', timeout_ms: 1000, env_allowlist: [], exit_codes: [0] },
    },
  });
  try {
    const item = runProject(project, capability).item;
    const json = path.resolve(project, item.files.json);
    const human = path.resolve(project, item.files.human);
    const runDirectory = path.join(project, 'artifacts/runs', item.run_id);
    assert.equal(item.capability.id, capability);
    assert.equal(path.dirname(json), runDirectory);
    assert.equal(path.dirname(human), runDirectory);
    assert.ok(json.startsWith(`${project}${path.sep}`));
    assert.ok(human.startsWith(`${project}${path.sep}`));
  } finally {
    fs.rmSync(parent, { recursive: true, force: true });
  }
}

if (focus === 'all' || focus === 'redaction-keys') {
  const payload = JSON.stringify({ 'fixture-secret': 'one', '[REDACTED]': 'two' });
  const { parent, project } = createProject({
    version: 'quality-runner/v1',
    enabled: true,
    redaction: { values: ['fixture-secret'] },
    capabilities: {
      'parser-key': { argv: [process.execPath, '-e', `process.stdout.write(${JSON.stringify(payload)})`], cwd: '.', timeout_ms: 1000, env_allowlist: [], exit_codes: [0], parser: { type: 'json' } },
    },
  });
  try {
    const item = runProject(project, 'parser-key').item;
    const persisted = JSON.parse(fs.readFileSync(path.resolve(project, item.files.json), 'utf8'));
    const value = persisted.parser.value;
    assert.equal(item.result.status, 'PASS');
    assert.equal(Object.hasOwn(value, 'fixture-secret'), false);
    assert.equal(Object.keys(value).length, 2);
    assert.deepEqual(Object.values(value).sort(), ['one', 'two']);
    assert.doesNotMatch(JSON.stringify(persisted), /fixture-secret/);
  } finally {
    fs.rmSync(parent, { recursive: true, force: true });
  }
}

console.log('quality: argv/shell, artifacts, env isolation, redaction, unavailable, timeout, parser, threshold, and skip checks passed');
NODE
