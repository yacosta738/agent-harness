#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
REGISTRY="$ROOT/scripts/fixtures/capability-adapters/registry"
TESTS="$ROOT/scripts/fixtures/capability-adapters/tests"
MODE="${1:-all}"

node --input-type=module - "$ROOT" "$REGISTRY" "$TESTS" "$MODE" <<'NODE'
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const [root, registry, tests, mode = 'all'] = process.argv.slice(2);
const lint = path.join(root, 'scripts/fixtures/capability-adapters/lint');
const coverage = path.join(root, 'scripts/fixtures/capability-adapters/coverage');
const integration = path.join(root, 'scripts/fixtures/capability-adapters/integration');
const metricsLib = await import(path.join(root, 'scripts/sdd-runner-lib/metrics.mjs'));
const { validateCapabilityRegistry, validateMetricsContract, normalizeCrap, normalizeDeclaredTestResult, normalizeDeclaredLintResult } = metricsLib;
const { validateToolchainLock } = await import(path.join(root, 'scripts/sdd-runner-lib/toolchain.mjs'));
const { normalizeImpactPath, validateScopeEvidence } = await import(path.join(root, 'scripts/sdd-runner-lib/git-impact.mjs'));
const evidenceBoundary = await import(path.join(root, 'scripts/sdd-runner-lib/evidence-boundary.mjs'));
const { redactValue, createRedactor } = await import(path.join(root, 'scripts/sdd-runner-lib/redact.mjs'));
const { resolveInside } = await import(path.join(root, 'scripts/sdd-runner-lib/config.mjs'));

const read = (name) => JSON.parse(fs.readFileSync(path.join(registry, name), 'utf8'));
const readTest = (name) => JSON.parse(fs.readFileSync(path.join(tests, name), 'utf8'));
const readLint = (name) => JSON.parse(fs.readFileSync(path.join(lint, name), 'utf8'));
const readCoverage = (name) => JSON.parse(fs.readFileSync(path.join(coverage, name), 'utf8'));
const readCoverageRaw = (name) => fs.readFileSync(path.join(coverage, name), 'utf8');
const readIntegration = (name) => JSON.parse(fs.readFileSync(path.join(integration, name), 'utf8'));
const valid = read('valid.json');
if (mode === 'integration') {
  const dispatchRegistry = readIntegration('dispatch.json');
  const dispatch = metricsLib.dispatchAdapterMetric;
  if (typeof dispatch !== 'function') throw new Error('dispatchAdapterMetric is not a function');
  const identity = { change_id: 'integration', task_id: '5.1', run_id: 'integration', base_sha: 'integbase00000000000000000000000000000000', head_sha: 'integhead00000000000000000000000000000000' };
  const projectImpact = { scope: 'project' };
  const changedImpact = { scope: 'changed-files', changed: ['src/covered.js'], impact_digest: 'impact-dispatch' };
  const testsEntry = dispatchRegistry.entries.find((entry) => entry.id === 'tests/node');
  const lintEntry = dispatchRegistry.entries.find((entry) => entry.id === 'lint/eslint');
  const coverageEntry = dispatchRegistry.entries.find((entry) => entry.id === 'coverage/c8');
  const testsMetric = dispatch({ registry: dispatchRegistry, entry: testsEntry, declaration: { provider: 'node-test', output: readTest('node-pass.json'), execution: { exit_code: 0 }, identity, impact: projectImpact } });
  assert.equal(testsMetric.version, 'metrics/v1');
  assert.equal(testsMetric.metric, 'tests');
  assert.equal(testsMetric.adapter, 'tests/node');
  assert.equal(testsMetric.status, 'PASS');
  assert.equal(testsMetric.provenance.registry_version, 'capability-registry/v1');
  assert.equal(testsMetric.provenance.provider_digest, testsEntry.digest);
  assert.throws(() => dispatch({ registry: dispatchRegistry, entry: { ...testsEntry, provider_version: 'latest' }, declaration: { provider: 'node-test', output: readTest('node-pass.json'), execution: { exit_code: 0 }, identity, impact: projectImpact } }), /version|pin/i);
  assert.throws(() => dispatch({ registry: dispatchRegistry, entry: testsEntry, declaration: { provider: 'unknown', output: readTest('node-pass.json'), execution: { exit_code: 0 }, identity, impact: projectImpact } }), /provider|metric|declared/i);
  const lintMetric = dispatch({ registry: dispatchRegistry, entry: lintEntry, declaration: { provider: 'eslint', output: readLint('eslint-clean.json'), execution: { exit_code: 0 }, identity, impact: projectImpact } });
  assert.equal(lintMetric.version, 'metrics/v1');
  assert.equal(lintMetric.metric, 'lint');
  assert.equal(lintMetric.adapter, 'lint/eslint');
  assert.equal(lintMetric.status, 'PASS');
  assert.equal(lintMetric.normalized.errorCount, 0);
  const coverageMetric = dispatch({ registry: dispatchRegistry, entry: coverageEntry, declaration: { provider: 'c8', output: readCoverage('c8-full-per-file.json'), execution: { exit_code: 0 }, identity, impact: projectImpact } });
  assert.equal(coverageMetric.version, 'metrics/v1');
  assert.equal(coverageMetric.metric, 'coverage');
  assert.equal(coverageMetric.adapter, 'coverage/c8');
  assert.equal(coverageMetric.status, 'PASS');
  assert.equal(coverageMetric.normalized.scope, 'project');
  const statusByCapability = {
    'tests/node': testsMetric.status,
    'lint/eslint': lintMetric.status,
    'coverage/c8': coverageMetric.status,
  };
  assert.deepEqual(statusByCapability, { 'tests/node': 'PASS', 'lint/eslint': 'PASS', 'coverage/c8': 'PASS' });
  const v1 = readIntegration('v1-envelope.json');
  const upgraded = evidenceBoundary.upgradeEvidence(v1);
  assert.equal(upgraded.version, evidenceBoundary.EVIDENCE_VERSION);
  assert.equal(upgraded.change_id, v1.change_id);
  assert.equal(upgraded.task_id, v1.task_id);
  assert.equal(upgraded.result.status, 'PASS');
  assert.ok(typeof upgraded.envelope_digest === 'string' && /^[0-9a-f]{64}$/.test(upgraded.envelope_digest));
  const invalidVersion = { ...v1, version: 'quality-runner-result/v9' };
  assert.throws(() => evidenceBoundary.upgradeEvidence(invalidVersion), /version/i);
  const incompleteV1 = { version: 'quality-runner-result/v1', run_id: 'partial' };
  const blocked = evidenceBoundary.upgradeEvidence(incompleteV1);
  assert.equal(blocked.version, evidenceBoundary.EVIDENCE_VERSION);
  assert.equal(blocked.result.status, 'BLOCKED');
  assert.equal(blocked.result.reason, 'legacy_identity_unavailable');
  assert.equal(blocked.compatibility, 'v1-legacy');
  const secret = 'TOPSECRET-XYZ AKIAIOSFODNN7EXAMPLE leaked';
  const redactor = createRedactor({ values: ['TOPSECRET-XYZ'], patterns: ['AKIA[0-9A-Z]{16}'] });
  const redacted = redactValue({ stdout: secret, argv: ['echo', secret] }, redactor);
  assert.equal(redacted.stdout.includes('TOPSECRET-XYZ'), false);
  assert.ok(redacted.stdout.includes('[REDACTED]'));
  assert.equal(redacted.argv[1].includes('TOPSECRET-XYZ'), false);
  assert.ok(redacted.argv[1].includes('[REDACTED]'));
  const artifactRoot = fs.mkdtempSync(path.join('/tmp', 'capability-adapters-artifact-'));
  const insideFile = path.join(artifactRoot, 'inside.js');
  fs.writeFileSync(insideFile, 'inside');
  const outsideDir = fs.mkdtempSync(path.join('/tmp', 'capability-adapters-outside-'));
  const outsideFile = path.join(outsideDir, 'secret.js');
  fs.writeFileSync(outsideFile, 'outside');
  const escapeLink = path.join(artifactRoot, 'escape.js');
  fs.symlinkSync(outsideFile, escapeLink);
  const inside = evidenceBoundary.hashArtifact(artifactRoot, 'inside.js');
  assert.equal(inside.status, 'AVAILABLE');
  assert.ok(/^[0-9a-f]{64}$/.test(inside.sha256));
  const missing = evidenceBoundary.hashArtifact(artifactRoot, 'missing.js');
  assert.equal(missing.status, 'UNAVAILABLE');
  assert.equal(missing.sha256, null);
  assert.throws(() => evidenceBoundary.hashArtifact(artifactRoot, '../outside.js'), /artifact_path_outside_project|path/i);
  assert.throws(() => evidenceBoundary.hashArtifact(artifactRoot, 'escape.js'), /artifact_symlink_outside_project|symlink/i);
  assert.throws(() => resolveInside(artifactRoot, '../escape.js'), /escapes|outside|symlink/i);
  const escaped = resolveInside(artifactRoot, 'inside.js');
  assert.ok(escaped.startsWith(artifactRoot));
  fs.rmSync(artifactRoot, { recursive: true, force: true });
  fs.rmSync(outsideDir, { recursive: true, force: true });
  const oversizedPath = path.join(root, 'README.md');
  const oversizedLimit = 0;
  const oversized = evidenceBoundary.hashArtifact(root, 'README.md');
  assert.equal(oversized.status, 'AVAILABLE');
  assert.ok(/^[0-9a-f]{64}$/.test(oversized.sha256));
  assert.ok(typeof oversizedPath === 'string');
  void oversizedLimit;
  console.log('capability adapters: integration dispatch, v1/v2 envelopes, redaction, traversal, and artifact hashes passed');
  process.exit(0);
}
if (mode === 'coverage') {
  const coverageC8Entry = { ...valid.entries[0], id: 'coverage/c8', metric: 'coverage', provider: 'c8', provider_version: '10.1.3', adapter: 'coverage/c8', semantics: 'c8-summary/v1', scope: 'project' };
  const coveragePyEntry = { ...valid.entries[0], id: 'coverage/coverage-py', metric: 'coverage', provider: 'coverage-py', provider_version: '7.6.1', adapter: 'coverage/coverage-py', semantics: 'coverage/v1', scope: 'project' };
  const identity = { change_id: 'fixture', task_id: '4.1', run_id: 'coverage', base_sha: 'base', head_sha: 'head' };
  const normalize = metricsLib.normalizeDeclaredCoverageResult;
  if (typeof normalize !== 'function') throw new Error('normalizeDeclaredCoverageResult is not a function');
  const projectImpact = { scope: 'project' };
  const changedImpact = { scope: 'changed-files', changed: ['src/covered.js', 'src/partial.js'], impact_digest: 'impact-coverage' };
  const allOk = (exc) => ({ exit_code: 0, ...(exc || {}) });
  const fullProject = normalize({ provider: 'c8', output: readCoverage('c8-full-per-file.json'), execution: allOk(), identity, impact: projectImpact }, coverageC8Entry);
  assert.equal(fullProject.status, 'PASS');
  assert.equal(fullProject.normalized.scope, 'project');
  assert.equal(fullProject.normalized.scope_kind, 'per-file');
  assert.equal(fullProject.normalized.totals.lines.pct, 96.66);
  assert.equal(fullProject.normalized.totals.branches.pct, 91.66);
  assert.equal(fullProject.normalized.totals.functions.pct, 97.5);
  assert.equal(fullProject.normalized.totals.statements.pct, 96.92);
  assert.equal(fullProject.normalized.per_file.length, 2);
  assert.equal(fullProject.normalized.per_file[0].path, 'src/covered.js');
  assert.equal(fullProject.normalized.metrics.length, 4);
  const fullChanged = normalize({ provider: 'c8', output: readCoverage('c8-full-per-file.json'), execution: allOk(), identity, impact: changedImpact, scope: 'changed-files' }, coverageC8Entry);
  assert.equal(fullChanged.status, 'PASS');
  assert.equal(fullChanged.normalized.scope, 'changed-files');
  assert.equal(fullChanged.normalized.requested_paths.length, 2);
  assert.equal(fullChanged.normalized.uncovered_paths.length, 0);
  const partialChanged = normalize({ provider: 'c8', output: readCoverage('c8-partial-per-file.json'), execution: allOk(), identity, impact: changedImpact, scope: 'changed-files' }, coverageC8Entry);
  assert.equal(partialChanged.status, 'PASS');
  assert.equal(partialChanged.normalized.scope, 'changed-files');
  assert.equal(partialChanged.normalized.totals.lines.pct, 75.0);
  const partialImpact = { scope: 'changed-files', changed: ['src/covered.js'], impact_digest: 'impact-coverage' };
  const changedExtras = normalize({ provider: 'c8', output: readCoverage('c8-full-per-file.json'), execution: allOk(), identity, impact: partialImpact, scope: 'changed-files' }, coverageC8Entry);
  assert.equal(changedExtras.status, 'BLOCKED');
  assert.equal(changedExtras.reason, 'changed_files_scope_incomplete');
  const globalProject = normalize({ provider: 'c8', output: readCoverage('c8-global-only.json'), execution: allOk(), identity, impact: projectImpact }, coverageC8Entry);
  assert.equal(globalProject.status, 'PASS');
  assert.equal(globalProject.normalized.scope_kind, 'global');
  assert.equal(globalProject.normalized.per_file.length, 0);
  assert.equal(globalProject.normalized.metrics_available, true);
  const globalChanged = normalize({ provider: 'c8', output: readCoverage('c8-global-only.json'), execution: allOk(), identity, impact: changedImpact, scope: 'changed-files' }, coverageC8Entry);
  assert.equal(globalChanged.status, 'BLOCKED');
  assert.equal(globalChanged.reason, 'changed_files_scope_incomplete');
  assert.equal(globalChanged.normalized.scope_kind, 'global');
  assert.equal(globalChanged.normalized.per_file.length, 0);
  const globalPython = normalize({ provider: 'coverage-py', output: readCoverage('coverage-py-global-only.json'), execution: allOk(), identity, impact: projectImpact }, coveragePyEntry);
  assert.equal(globalPython.status, 'PASS');
  assert.equal(globalPython.normalized.scope_kind, 'global');
  const globalPythonChanged = normalize({ provider: 'coverage-py', output: readCoverage('coverage-py-global-only.json'), execution: allOk(), identity, impact: changedImpact, scope: 'changed-files' }, coveragePyEntry);
  assert.equal(globalPythonChanged.status, 'BLOCKED');
  assert.equal(globalPythonChanged.reason, 'changed_files_scope_incomplete');
  const absent = normalize({ provider_available: false, execution: { provider_available: false }, identity, impact: projectImpact }, coverageC8Entry);
  assert.equal(absent.status, 'UNAVAILABLE');
  assert.equal(absent.reason, 'provider_unavailable');
  const absentPy = normalize({ execution: { provider_available: false }, identity, impact: projectImpact }, coveragePyEntry);
  assert.equal(absentPy.status, 'UNAVAILABLE');
  assert.equal(absentPy.reason, 'provider_unavailable');
  const malformed = normalize({ provider: 'c8', output: readCoverage('c8-malformed.json'), execution: allOk(), identity, impact: projectImpact }, coverageC8Entry);
  assert.equal(malformed.status, 'BLOCKED');
  assert.equal(malformed.reason, 'malformed_output');
  const missingProvider = normalize({ execution: { provider_available: false }, identity, impact: projectImpact }, { ...coverageC8Entry, provider: 'lcov', provider_version: '2.0.0' });
  assert.equal(missingProvider.status, 'UNAVAILABLE');
  assert.equal(missingProvider.reason, 'provider_undeclared');
  const empty = normalize({ provider: 'c8', output: null, execution: { missing_artifact: true }, identity, impact: projectImpact }, coverageC8Entry);
  assert.equal(empty.status, 'BLOCKED');
  assert.equal(empty.reason, 'artifact_missing');
  const disabled = normalize({ provider: 'c8', output: readCoverage('c8-full-per-file.json'), execution: { disabled: true }, identity, impact: projectImpact }, { ...coverageC8Entry, policy: 'disabled' });
  assert.equal(disabled.status, 'NOT_TESTED');
  assert.equal(disabled.reason, 'capability_disabled');
  const timedOut = normalize({ provider: 'c8', output: readCoverage('c8-full-per-file.json'), execution: { timed_out: true }, identity, impact: projectImpact }, coverageC8Entry);
  assert.equal(timedOut.status, 'BLOCKED');
  assert.equal(timedOut.reason, 'timeout');
  assert.throws(() => normalize({ provider: 'c8', output: readCoverage('c8-full-per-file.json'), execution: allOk(), identity }, coverageC8Entry), /impact|scope/i);
  assert.throws(() => normalize({ provider: 'unknown', output: readCoverage('c8-full-per-file.json'), execution: allOk(), identity, impact: projectImpact }, coverageC8Entry), /provider|declared/i);
  assert.throws(() => normalize({ provider: 'c8', output: readCoverage('c8-full-per-file.json'), execution: allOk(), identity, impact: projectImpact }, { ...coverageC8Entry, metric: 'lint' }), /coverage|metric/i);
  const rawEmpty = readCoverageRaw('c8-empty.json');
  assert.equal(rawEmpty.length, 0);
  const emptyFile = normalize({ provider: 'c8', output: null, execution: { missing_artifact: true, artifact_present: false }, identity, impact: projectImpact }, coverageC8Entry);
  assert.equal(emptyFile.status, 'BLOCKED');
  assert.equal(emptyFile.reason, 'artifact_missing');
  console.log('capability adapters: coverage and availability checks passed');
  process.exit(0);
}
if (mode === 'lint') {
  const lintEntry = { ...valid.entries[0], id: 'lint/eslint', metric: 'lint', provider: 'eslint', provider_version: '9.33.0', adapter: 'lint/eslint', semantics: 'eslint-json/v1', scope: 'project' };
  const identity = { change_id: 'fixture', task_id: '3.1', run_id: 'lint', base_sha: 'base', head_sha: 'head' };
  const lintCase = (fixture, execution, options = {}) => normalizeDeclaredLintResult({ provider: 'eslint', output: readLint(fixture), execution, identity, ...options }, lintEntry);
  assert.equal(lintCase('eslint-clean.json', { exit_code: 0 }).status, 'PASS');
  assert.equal(lintCase('eslint-clean.json', { exit_code: 0 }).normalized.errorCount, 0);
  assert.equal(lintCase('eslint-errors.json', { exit_code: 1 }).status, 'FAIL');
  assert.equal(lintCase('eslint-warnings.json', { exit_code: 0 }).status, 'FAIL');
  assert.equal(lintCase('eslint-warnings.json', { exit_code: 0 }, { thresholds: { maxWarnings: 2 } }).status, 'PASS');
  assert.equal(lintCase('eslint-warnings.json', { exit_code: 0 }, { thresholds: { maxWarnings: 1 } }).status, 'FAIL');
  assert.equal(lintCase('eslint-malformed.json', { exit_code: 0 }).status, 'BLOCKED');
  assert.equal(lintCase('eslint-clean.json', { provider_available: false }).status, 'UNAVAILABLE');
  assert.equal(lintCase('eslint-clean.json', { exit_code: 0 }, { scope: 'changed-files', impact: { scope: 'changed-files', changed: ['src/clean.js'], impact_digest: 'impact' } }).status, 'PASS');
  assert.equal(lintCase('eslint-project-extra-file.json', { exit_code: 0 }, { scope: 'changed-files', impact: { scope: 'changed-files', changed: ['src/clean.js'], impact_digest: 'impact' } }).status, 'BLOCKED');
  assert.equal(lintCase('eslint-traversal.json', { exit_code: 0 }).status, 'BLOCKED');
  assert.equal(lintCase('eslint-clean.json', { provider_available: false }).reason, 'provider_unavailable');
  assert.equal(validateScopeEvidence({ scope: 'project', reported: ['src/clean.js'] }).status, 'AVAILABLE');
  assert.equal(validateScopeEvidence({ scope: 'changed-files', expected: ['src/clean.js', 'src/other.js'], reported: ['src/clean.js', 'src/other.js'] }).status, 'AVAILABLE');
  assert.equal(validateScopeEvidence({ scope: 'changed-files', expected: ['src/clean.js', 'src/other.js'], reported: ['src/clean.js'] }).status, 'BLOCKED');
  assert.throws(() => normalizeImpactPath('../outside.js'), /traversal|absolute/i);
  assert.throws(() => normalizeImpactPath('/tmp/outside.js'), /traversal|absolute/i);
   assert.throws(() => validateScopeEvidence({ scope: 'global', reported: ['src/clean.js'] }), /scope/i);
   const scopeRoot = fs.mkdtempSync(path.join('/tmp', 'capability-adapters-scope-'));
   const outside = fs.mkdtempSync(path.join('/tmp', 'capability-adapters-outside-'));
   fs.writeFileSync(path.join(outside, 'secret.js'), 'secret');
   fs.symlinkSync(path.join(outside, 'secret.js'), path.join(scopeRoot, 'escaped.js'));
   assert.equal(validateScopeEvidence({ scope: 'project', reported: ['escaped.js'], projectRoot: scopeRoot }).status, 'BLOCKED');
   fs.rmSync(scopeRoot, { recursive: true, force: true });
   fs.rmSync(outside, { recursive: true, force: true });
   console.log('capability adapters: lint and scope checks passed');
  process.exit(0);
}
if (mode === 'tests') {
  const nodeEntry = { ...valid.entries[0], scope: 'project' };
  const pytestEntry = { ...nodeEntry, id: 'tests/pytest', provider: 'pytest', adapter: 'tests/pytest', provider_version: '8.3.5', semantics: 'pytest-json/v1' };
  const identity = { change_id: 'fixture', task_id: '2.1', run_id: 'tests', base_sha: 'base', head_sha: 'head' };
  const cases = [
    ['node-pass.json', nodeEntry, { exit_code: 0 }, 'PASS'],
    ['node-fail.json', nodeEntry, { exit_code: 1 }, 'FAIL'],
    ['node-skipped.json', nodeEntry, { exit_code: 0 }, 'PASS'],
    ['pytest-pass.json', pytestEntry, { exit_code: 0 }, 'PASS'],
    ['pytest-fail.json', pytestEntry, { exit_code: 1 }, 'FAIL'],
    ['pytest-skipped.json', pytestEntry, { exit_code: 0 }, 'PASS'],
    ['pytest-process-error.json', pytestEntry, { process_error: 'EPIPE' }, 'BLOCKED'],
    ['node-pass.json', nodeEntry, { timed_out: true }, 'BLOCKED'],
    ['node-pass.json', nodeEntry, { provider_available: false }, 'UNAVAILABLE'],
    ['node-malformed.json', nodeEntry, { malformed: true }, 'FAIL'],
  ];
  for (const [fixture, entry, execution, expected] of cases) {
    const normalized = normalizeDeclaredTestResult({ provider: entry.provider, output: readTest(fixture), execution, identity }, entry);
    assert.equal(normalized.status, expected, `${fixture} should be ${expected}`);
    assert.equal(normalized.version, 'metrics/v1');
    assert.equal(normalized.provider, entry.provider);
    assert.equal(normalized.provider_version, entry.provider_version);
    assert.equal(normalized.semantics, entry.semantics);
    assert.equal(normalized.scope, 'project');
    assert.deepEqual(normalized.raw.output, readTest(fixture));
    if (!execution.malformed && !execution.process_error && !execution.timed_out && execution.provider_available !== false) assert.ok(normalized.normalized.total >= 0);
  }
  assert.equal(normalizeDeclaredTestResult({ provider: 'node-test', output: readTest('node-pass.json'), execution: { exit_code: 0 }, identity }, nodeEntry).normalized.skipped, 0);
  assert.equal(normalizeDeclaredTestResult({ provider: 'pytest', output: readTest('pytest-skipped.json'), execution: { exit_code: 0 }, identity }, pytestEntry).normalized.skipped, 3);
  assert.throws(() => normalizeDeclaredTestResult({ provider: 'unknown', output: readTest('node-pass.json'), execution: { exit_code: 0 }, identity }, nodeEntry), /provider|declared/i);
  const malformed = normalizeDeclaredTestResult({ provider: 'node-test', output: readTest('pytest-unknown-provider.json'), execution: { exit_code: 0 }, identity }, nodeEntry);
  assert.equal(malformed.status, 'FAIL');
  assert.equal(malformed.reason, 'malformed_output');
  const disabled = normalizeDeclaredTestResult({ provider: 'node-test', output: readTest('node-pass.json'), execution: { exit_code: 0 }, identity }, { ...nodeEntry, policy: 'disabled' });
  assert.equal(disabled.status, 'NOT_TESTED');
  assert.equal(disabled.reason, 'capability_disabled');
  console.log('capability adapters: test adapter checks passed');
  process.exit(0);
}
const lock = { version: 'toolchain-lock/v1', tools: { 'node-test': { provider: 'node-test', version: '24.16.0', digest: valid.entries[0].digest } } };
const resolved = validateCapabilityRegistry(valid, lock);
assert.equal(resolved.version, 'capability-registry/v1');
assert.equal(resolved.entries[0].provider_version, '24.16.0');
assert.equal(resolved.entries[0].digest.startsWith('sha256:'), true);
assert.throws(() => validateCapabilityRegistry(read('duplicate.json')), /duplicate|unique/i);
assert.throws(() => validateCapabilityRegistry(read('latest.json')), /version|latest|range/i);
assert.throws(() => validateCapabilityRegistry(read('range.json')), /version|latest|range/i);
assert.throws(() => validateCapabilityRegistry(read('missing-digest.json')), /digest|immutable/i);
assert.throws(() => validateCapabilityRegistry(read('network.json')), /resolution|network/i);
assert.throws(() => validateCapabilityRegistry(read('download.json')), /unknown|download/i);
assert.throws(() => validateCapabilityRegistry({ ...valid, version: 'capability-registry/v0' }), /version/i);
assert.throws(() => validateCapabilityRegistry(valid, { ...lock, tools: { 'node-test': { ...lock.tools['node-test'], provider: 'other' } } }), /pin|provider/i);

const lockCheck = { version: 'toolchain-lock/v1', tools: { node: { provider: 'node-test', version: '24.16.0', digest: valid.entries[0].digest } } };
assert.equal(validateToolchainLock(lockCheck).tools.node.version, '24.16.0');
assert.throws(() => validateToolchainLock({ ...lockCheck, tools: { node: { ...lockCheck.tools.node, version: 'latest' } } }), /pinned|version/i);
assert.throws(() => validateToolchainLock({ ...lockCheck, tools: { node: { ...lockCheck.tools.node, digest: undefined } } }), /pinned|digest/i);

const metric = validateMetricsContract({
  metric: 'tests', adapter: 'tests/node', provider: 'node-test', provider_version: '24.16.0',
  semantics: 'provider-defined/v1', scope: 'project', raw: { total: 1 }, normalized: { passed: 1 },
  artifacts: [], status: 'PASS', reason: null, identity: { change_id: 'fixture', task_id: '1.1' },
  provenance: { registry_version: 'capability-registry/v1', provider_digest: valid.entries[0].digest },
});
assert.equal(metric.version, 'metrics/v1');
assert.equal(metric.adapter, 'tests/node');
assert.throws(() => validateMetricsContract({ ...metric, scope: 'global' }), /scope/i);
assert.throws(() => validateMetricsContract({ ...metric, provider_version: 'latest' }), /version/i);
const legacy = normalizeCrap({ provider: 'legacy', version: '1.0.0', semantics: 'legacy/v1', cyclomatic: 2, coverage: 0.5 });
assert.equal(legacy.version, 'metrics/v1');
assert.equal(legacy.metric, 'crap');
console.log('capability adapters: registry and metrics contract checks passed');
NODE

if [[ "$MODE" == "all" ]]; then
  "$0" tests
  "$0" coverage
  "$0" integration
fi
