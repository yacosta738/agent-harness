#!/usr/bin/env bash
set -euo pipefail

# Fixture-first contract smoke checks for the standalone SDD tools.
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
FIXTURES="$ROOT/scripts/fixtures"
trap 'rm -rf "$FIXTURES/runner-project/artifacts"' EXIT

node --input-type=module - "$ROOT" "$FIXTURES" <<'NODE'
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const [root, fixtures] = process.argv.slice(2);
const { loadRunnerConfig, resolveInside } = await import(
  path.join(root, 'scripts/sdd-runner-lib/config.mjs'),
);
const { parseState, nextPhase } = await import(path.join(root, 'scripts/sdd-runner-lib/state.mjs'));
const { spawnSync } = await import('node:child_process');

const nodeProject = path.join(fixtures, 'node-project');
const pythonProject = path.join(fixtures, 'python-project');
const runnerProject = path.join(fixtures, 'runner-project');
const nodeConfig = loadRunnerConfig({ project: nodeProject });
const pythonConfig = loadRunnerConfig({ project: pythonProject });

assert.equal(nodeConfig.manifest.version, 'quality-runner/v1');
assert.equal(pythonConfig.manifest.version, 'quality-runner/v1');
assert.deepEqual(nodeConfig.manifest.capabilities.test.argv.slice(0, 1), ['node']);
assert.deepEqual(pythonConfig.manifest.capabilities.test.argv.slice(0, 1), ['python3']);
assert.equal(resolveInside(nodeProject, 'openspec/quality-runner.json'), nodeConfig.configPath);

const unavailable = loadRunnerConfig({ project: root, config: 'openspec/missing-runner.json' });
assert.equal(unavailable.manifest, null);
assert.equal(unavailable.unavailableReason, 'manifest_not_found');
const legacy = parseState('change: fixture\ncurrent_phase: propose\ncompleted: [init, explore, propose]\nnext: spec-design\nupdated: 2026-08-09\n');
assert.equal(nextPhase(legacy), 'spec');
const runner = path.join(root, 'scripts/sdd-quality-runner.mjs');
const envRun = spawnSync(process.execPath, [runner, 'run', '--project', runnerProject, '--capability', 'env', '--json'], { encoding: 'utf8', env: { ...process.env, FIXTURE_SECRET: 'fixture-env-secret' } });
assert.equal(envRun.status, 0, envRun.stderr);
assert.equal(JSON.parse(envRun.stdout).results[0].evidence.stdout, 'not-visible');
const red = spawnSync(process.execPath, [runner, 'run', '--project', runnerProject, '--capability', 'secret', '--json'], { encoding: 'utf8' });
assert.equal(red.status, 1, red.stderr);
const redEnvelope = JSON.parse(red.stdout);
assert.equal(redEnvelope.results[0].result.status, 'FAIL');
assert.match(redEnvelope.results[0].evidence.stderr, /\[REDACTED\]/);
assert.doesNotMatch(red.stdout, /fixture-secret/);
assert.doesNotMatch(fs.readFileSync(path.join(runnerProject, redEnvelope.results[0].files.json), 'utf8'), /fixture-secret/);
const missing = spawnSync(process.execPath, [runner, 'run', '--project', runnerProject, '--capability', 'missing', '--json'], { encoding: 'utf8' });
assert.equal(JSON.parse(missing.stdout).results[0].result.status, 'UNAVAILABLE');
const timeout = spawnSync(process.execPath, [runner, 'run', '--project', runnerProject, '--capability', 'timeout', '--json'], { encoding: 'utf8' });
assert.equal(JSON.parse(timeout.stdout).results[0].result.status, 'BLOCKED');
const threshold = spawnSync(process.execPath, [runner, 'run', '--project', runnerProject, '--capability', 'threshold', '--json'], { encoding: 'utf8' });
assert.equal(JSON.parse(threshold.stdout).results[0].result.reason, 'threshold_rejected');
assert.match(fs.readFileSync(path.join(fixtures, 'report-fixtures/verify-runner-fail.md'), 'utf8'), /FAIL|exit_code_rejected|artifacts\/runs/);
assert.match(fs.readFileSync(path.join(fixtures, 'report-fixtures/qa-fallback.md'), 'utf8'), /fallback|NOT TESTED/);

console.log('contract: explicit manifests and project-safe paths pass');
NODE

echo "sdd smoke: contract checks passed"
