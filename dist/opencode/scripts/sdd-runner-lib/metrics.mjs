import { createHash } from 'node:crypto';
import { validateToolchainLock } from './toolchain.mjs';
import { normalizeImpactPath, validateScopeEvidence } from './git-impact.mjs';

export const METRICS_VERSION = 'metrics/v1';
export const REGISTRY_VERSION = 'capability-registry/v1';
const SCOPES = new Set(['project', 'changed-files']);
const POLICIES = new Set(['required', 'preferred', 'disabled']);
const METRICS = new Set(['tests', 'lint', 'coverage']);
const STATUS = new Set(['PASS', 'FAIL', 'BLOCKED', 'UNAVAILABLE', 'NOT_TESTED']);
const SEMVER = /^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)(?:-[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/;
const DIGEST = /^(?:sha256:)?[0-9a-f]{64}$/i;

export function validateCapabilityRegistry(value, toolchainLock) {
  if (toolchainLock !== undefined) validateToolchainLock(toolchainLock);
  if (!isRecord(value)) throw Error('capability_registry_invalid');
  if (value.version !== REGISTRY_VERSION) throw Error('capability_registry_version_invalid');
  if (!Array.isArray(value.entries)) throw Error('capability_registry_entries_required');
  assertKnownKeys(value, ['version', 'entries'], 'capability_registry');
  const seen = new Set();
  const entries = value.entries.map((entry) => {
    validateRegistryEntry(entry);
    if (seen.has(entry.id)) throw Error(`capability_registry_duplicate:${entry.id}`);
    seen.add(entry.id);
    if (toolchainLock) assertRegistryPin(entry, toolchainLock);
    return { ...entry, scopes: [...entry.scopes] };
  });
  return { version: REGISTRY_VERSION, entries };
}

export function resolveCapability(registry, id, scope, toolchainLock) {
  const validated = validateCapabilityRegistry(registry, toolchainLock);
  const entry = validated.entries.find((item) => item.id === id);
  if (!entry) throw Error(`capability_not_registered:${id}`);
  if (!entry.scopes.includes(scope)) throw Error(`capability_scope_unsupported:${scope}`);
  return { ...entry, scope };
}

export function validateMetricsContract(value, registryEntry) {
  if (!isRecord(value)) throw Error('metrics_contract_invalid');
  assertKnownKeys(value, ['version', 'metric', 'adapter', 'provider', 'provider_version', 'semantics', 'scope', 'raw', 'normalized', 'artifacts', 'status', 'reason', 'identity', 'provenance'], 'metrics_contract');
  for (const field of ['metric', 'adapter', 'provider', 'provider_version', 'semantics', 'scope', 'raw', 'normalized', 'artifacts', 'status', 'reason', 'identity', 'provenance']) {
    if (value[field] === undefined) throw Error(`metrics_${field}_required`);
  }
  if (value.version !== undefined && value.version !== METRICS_VERSION) throw Error('metrics_version_invalid');
  if (!METRICS.has(value.metric)) throw Error('metrics_metric_invalid');
  if (typeof value.adapter !== 'string' || !value.adapter.trim()) throw Error('metrics_adapter_required');
  if (typeof value.provider !== 'string' || !value.provider.trim()) throw Error('metrics_provider_required');
  if (!SEMVER.test(value.provider_version)) throw Error('metrics_provider_version_invalid');
  if (typeof value.semantics !== 'string' || !value.semantics.trim()) throw Error('metrics_semantics_required');
  if (!SCOPES.has(value.scope)) throw Error('metrics_scope_invalid');
  if (!isRecord(value.raw) || !isRecord(value.normalized) || !Array.isArray(value.artifacts)) throw Error('metrics_payload_invalid');
  if (!STATUS.has(value.status) || (value.reason !== null && typeof value.reason !== 'string')) throw Error('metrics_status_invalid');
  if (!isRecord(value.identity) || !isRecord(value.provenance)) throw Error('metrics_provenance_invalid');
  if (!DIGEST.test(value.provenance.provider_digest)) throw Error('metrics_provider_digest_invalid');
  if (registryEntry) {
    for (const field of ['metric', 'adapter', 'provider', 'provider_version', 'semantics', 'scope']) if (value[field] !== registryEntry[field]) throw Error(`metrics_registry_${field}_mismatch`);
    if (value.provenance.provider_digest.toLowerCase() !== registryEntry.digest.toLowerCase()) throw Error('metrics_registry_digest_mismatch');
  }
  return { ...value, version: METRICS_VERSION };
}

export function normalizeAdapterMetric(value, registryEntry, result = {}) {
  const contract = validateMetricsContract({
    metric: registryEntry.metric,
    adapter: registryEntry.adapter,
    provider: registryEntry.provider,
    provider_version: registryEntry.provider_version,
    semantics: registryEntry.semantics,
    scope: registryEntry.scope,
    raw: result.raw || {},
    normalized: result.normalized || {},
    artifacts: result.artifacts || [],
    status: result.status || 'UNAVAILABLE',
    reason: result.reason || null,
    identity: result.identity || {},
    provenance: { registry_version: REGISTRY_VERSION, provider_digest: registryEntry.digest, ...(result.provenance || {}) },
  });
  return contract;
}

export function dispatchAdapterMetric(input = {}) {
  if (!isRecord(input)) throw Error('dispatch_invalid');
  const { registry, entry, declaration, toolchainLock } = input;
  if (!isRecord(registry)) throw Error('dispatch_registry_required');
  if (!isRecord(entry)) throw Error('dispatch_entry_required');
  const validated = validateCapabilityRegistry(registry, toolchainLock);
  const registered = validated.entries.find((item) => item.id === entry.id);
  if (!registered) throw Error(`dispatch_not_registered:${entry.id}`);
  for (const field of ['metric', 'adapter', 'provider', 'provider_version', 'digest', 'semantics']) {
    if (registered[field] !== entry[field]) throw Error(`dispatch_${field}_mismatch`);
  }
  if (Array.isArray(entry.scopes)) {
    if (!Array.isArray(registered.scopes) || registered.scopes.length !== entry.scopes.length || registered.scopes.some((scope, index) => scope !== entry.scopes[index])) throw Error('dispatch_scopes_mismatch');
  }
  if (entry.policy !== undefined && registered.policy !== entry.policy) throw Error('dispatch_policy_mismatch');
  if (!isRecord(declaration)) throw Error('dispatch_declaration_required');
  const requestedScope = declaration.scope && SCOPES.has(declaration.scope) ? declaration.scope : null;
  if (requestedScope && !registered.scopes.includes(requestedScope)) throw Error(`dispatch_scope_unsupported:${requestedScope}`);
  const projected = { ...registered, scope: requestedScope || registered.scopes[0] };
  if (projected.metric === 'tests') return normalizeDeclaredTestResult(declaration, projected);
  if (projected.metric === 'lint') return normalizeDeclaredLintResult(declaration, projected);
  if (projected.metric === 'coverage') return normalizeDeclaredCoverageResult(declaration, projected);
  throw Error(`dispatch_metric_unsupported:${projected.metric}`);
}

const TEST_PROVIDER_FORMATS = Object.freeze({
  'node-test': { output: 'node-test/v1', adapter: 'tests/node', fields: ['total', 'passed', 'failed', 'skipped', 'todo', 'errors'] },
  pytest: { output: 'pytest/v1', adapter: 'tests/pytest', fields: ['total', 'passed', 'failed', 'skipped', 'xfailed', 'xpassed', 'errors'] },
});

export function normalizeDeclaredTestResult(input, registryEntry) {
  if (!isRecord(input) || !isRecord(registryEntry) || registryEntry.metric !== 'tests') throw Error('tests_declaration_invalid');
  const provider = input.provider;
  const format = TEST_PROVIDER_FORMATS[provider];
  if (!format || registryEntry.provider !== provider || registryEntry.adapter !== format.adapter) throw Error('tests_provider_undeclared');
  const raw = { provider, output: input.output ?? null, execution: input.execution ?? null };
  const base = { raw, identity: input.identity || {}, artifacts: input.artifacts || [], provenance: input.provenance || {} };
  if (registryEntry.policy === 'disabled' || input.execution?.disabled === true) return normalizeAdapterMetric(null, registryEntry, { ...base, status: 'NOT_TESTED', reason: 'capability_disabled' });
  if (input.execution?.provider_available === false) return normalizeAdapterMetric(null, registryEntry, { ...base, status: 'UNAVAILABLE', reason: 'provider_unavailable' });
  if (input.execution?.timed_out === true) return normalizeAdapterMetric(null, registryEntry, { ...base, status: 'BLOCKED', reason: 'timeout' });
  if (input.execution?.process_error) return normalizeAdapterMetric(null, registryEntry, { ...base, status: 'BLOCKED', reason: 'process_error' });
  try {
    const summary = readTestSummary(input.output, format);
    const normalized = Object.fromEntries(format.fields.map((field) => [field, summary[field]]));
    const reason = summary.failed > 0 ? 'tests_failed' : summary.errors > 0 ? 'tests_errors' : input.execution?.exit_code !== undefined && input.execution.exit_code !== 0 ? 'exit_code_rejected' : summary.total === 0 ? 'no_tests_collected' : summary.skipped === summary.total ? 'tests_skipped' : 'policy_satisfied';
    const status = ['tests_failed', 'tests_errors', 'exit_code_rejected', 'no_tests_collected'].includes(reason) ? 'FAIL' : 'PASS';
    return normalizeAdapterMetric(null, registryEntry, { ...base, normalized, status, reason });
  } catch (error) {
    return normalizeAdapterMetric(null, registryEntry, { ...base, normalized: {}, status: 'FAIL', reason: 'malformed_output' });
  }
}

function readTestSummary(output, format) {
  if (!isRecord(output) || output.version !== format.output || !isRecord(output.summary)) throw Error('tests_output_malformed');
  const summary = Object.fromEntries(format.fields.map((field) => [field, count(output.summary[field], `tests_${field}_invalid`)]));
  if (summary.passed + summary.failed + summary.skipped > summary.total) throw Error('tests_counts_invalid');
  return summary;
}

const LINT_PROVIDER_FORMATS = Object.freeze({
  eslint: { output: 'eslint-json/v1', adapter: 'lint/eslint' },
});

export function normalizeDeclaredLintResult(input, registryEntry) {
  if (!isRecord(input) || !isRecord(registryEntry) || registryEntry.metric !== 'lint') throw Error('lint_declaration_invalid');
  const scope = input.scope || registryEntry.scope || 'project';
  const raw = { provider: input.provider, output: input.output ?? null, execution: input.execution ?? null };
  const base = { raw, identity: input.identity || {}, artifacts: input.artifacts || [], provenance: input.provenance || {} };
  if (!SCOPES.has(scope)) return normalizeAdapterMetric(null, { ...registryEntry, scope: 'project' }, { ...base, status: 'BLOCKED', reason: 'scope_unsupported' });
  if (input.execution?.provider_available === false || !input.provider) return normalizeAdapterMetric(null, { ...registryEntry, scope }, { ...base, status: 'UNAVAILABLE', reason: 'provider_unavailable' });
  const format = LINT_PROVIDER_FORMATS[input.provider];
  if (!format || registryEntry.provider !== input.provider || registryEntry.adapter !== format.adapter) throw Error('lint_provider_undeclared');
  if (registryEntry.policy === 'disabled' || input.execution?.disabled === true) return normalizeAdapterMetric(null, { ...registryEntry, scope }, { ...base, status: 'NOT_TESTED', reason: 'capability_disabled' });
  if (input.execution?.timed_out === true || input.execution?.process_error) return normalizeAdapterMetric(null, { ...registryEntry, scope }, { ...base, status: 'BLOCKED', reason: input.execution.timed_out ? 'timeout' : 'process_error' });
  try {
    const summary = readLintSummary(input.output);
    const scopeResult = validateScopeEvidence({ scope, reported: summary.filePaths, expected: input.impact?.changed || input.expected_paths, impact: input.impact, projectRoot: input.projectRoot });
    if (scopeResult.status !== 'AVAILABLE') return normalizeAdapterMetric(null, { ...registryEntry, scope }, { ...base, normalized: summary, status: scopeResult.status, reason: scopeResult.reason });
    const thresholds = input.thresholds || {};
    const reason = summary.errorCount > 0 ? 'lint_errors' : summary.warningCount > (thresholds.maxWarnings ?? 0) ? 'lint_warnings_threshold' : input.execution?.exit_code !== undefined && input.execution.exit_code !== 0 ? 'exit_code_rejected' : 'policy_satisfied';
    const status = ['lint_errors', 'lint_warnings_threshold', 'exit_code_rejected'].includes(reason) ? 'FAIL' : 'PASS';
    return normalizeAdapterMetric(null, { ...registryEntry, scope }, { ...base, normalized: summary, status, reason });
  } catch (error) {
    return normalizeAdapterMetric(null, { ...registryEntry, scope }, { ...base, normalized: {}, status: 'BLOCKED', reason: error.message === 'scope_unsupported' ? error.message : 'malformed_output' });
  }
}

const COVERAGE_PROVIDER_FORMATS = Object.freeze({
  c8: { output: 'c8-summary/v1', adapter: 'coverage/c8', metrics: ['lines', 'statements', 'functions', 'branches'], scope_kind: 'per-file', totalField: 'total', coveredField: 'covered', totalsPath: 'summary' },
  'coverage-py': { output: 'coverage/v1', adapter: 'coverage/coverage-py', metrics: ['lines', 'statements', 'conditions'], scope_kind: 'global', totalField: 'found', coveredField: 'hit', totalsPath: 'totals' },
  lcov: { output: 'lcov-info/v1', adapter: 'coverage/lcov', metrics: ['lines', 'branches', 'functions'], scope_kind: 'per-file', totalField: 'total', coveredField: 'covered', totalsPath: 'summary' },
  'istanbul-json-summary': { output: 'istanbul-json-summary/v1', adapter: 'coverage/istanbul', metrics: ['lines', 'statements', 'functions', 'branches'], scope_kind: 'per-file', totalField: 'total', coveredField: 'covered', totalsPath: 'summary' },
});

const COVERAGE_METRIC_FIELDS = ['total', 'covered', 'pct'];

export function normalizeDeclaredCoverageResult(input, registryEntry) {
  if (!isRecord(input) || !isRecord(registryEntry) || registryEntry.metric !== 'coverage') throw Error('coverage_declaration_invalid');
  const scope = input.scope || registryEntry.scope || 'project';
  if (!SCOPES.has(scope)) throw Error('coverage_scope_invalid');
  const raw = { provider: input.provider ?? null, output: input.output ?? null, execution: input.execution ?? null };
  const base = { raw, identity: input.identity || {}, artifacts: input.artifacts || [], provenance: input.provenance || {} };
  if (!input.impact) throw Error('coverage_impact_required');
  if (registryEntry.policy === 'disabled' || input.execution?.disabled === true) return normalizeAdapterMetric(null, { ...registryEntry, scope }, { ...base, status: 'NOT_TESTED', reason: 'capability_disabled' });
  const format = COVERAGE_PROVIDER_FORMATS[registryEntry.provider];
  if (!format || format.adapter !== registryEntry.adapter) return normalizeAdapterMetric(null, { ...registryEntry, scope }, { ...base, status: 'UNAVAILABLE', reason: 'provider_undeclared' });
  if (input.provider && (input.provider !== registryEntry.provider || registryEntry.adapter !== format.adapter)) throw Error('coverage_provider_undeclared');
  if (input.provider_available === false || input.execution?.provider_available === false) return normalizeAdapterMetric(null, { ...registryEntry, scope }, { ...base, status: 'UNAVAILABLE', reason: 'provider_unavailable' });
  if (input.execution?.timed_out === true) return normalizeAdapterMetric(null, { ...registryEntry, scope }, { ...base, status: 'BLOCKED', reason: 'timeout' });
  if (input.execution?.process_error) return normalizeAdapterMetric(null, { ...registryEntry, scope }, { ...base, status: 'BLOCKED', reason: 'process_error' });
  if (input.execution?.missing_artifact === true || input.execution?.artifact_present === false) return normalizeAdapterMetric(null, { ...registryEntry, scope }, { ...base, status: 'BLOCKED', reason: 'artifact_missing' });
  if (input.output === null || input.output === undefined) return normalizeAdapterMetric(null, { ...registryEntry, scope }, { ...base, status: 'BLOCKED', reason: 'artifact_missing' });
  try {
    const summary = readCoverageSummary(input.output, format);
    const scopeResult = validateScopeEvidence({ scope, reported: summary.reportedPaths, expected: input.impact?.changed || input.expected_paths, impact: input.impact, projectRoot: input.projectRoot });
    if (scope === 'changed-files' && summary.scope_kind === 'global') {
      const blocked = { ...summary.normalized, scope, requested_paths: scopeResult.paths || [], uncovered_paths: [], scope_kind: 'global' };
      return normalizeAdapterMetric(null, { ...registryEntry, scope }, { ...base, normalized: blocked, status: 'BLOCKED', reason: 'changed_files_scope_incomplete' });
    }
    if (scopeResult.status !== 'AVAILABLE') return normalizeAdapterMetric(null, { ...registryEntry, scope }, { ...base, normalized: { ...summary.normalized, scope }, status: scopeResult.status, reason: scopeResult.reason });
    const requestedPaths = scope === 'changed-files' ? (scopeResult.paths || []) : [];
    const uncovered = scope === 'changed-files' ? requestedPaths.filter((p) => !summary.normalized.reported_paths.includes(p)) : [];
    const enriched = { ...summary.normalized, scope, requested_paths: requestedPaths, uncovered_paths: uncovered };
    const reason = input.execution?.exit_code !== undefined && input.execution.exit_code !== 0 ? 'exit_code_rejected' : 'policy_satisfied';
    const status = reason === 'exit_code_rejected' ? 'FAIL' : 'PASS';
    return normalizeAdapterMetric(null, { ...registryEntry, scope }, { ...base, normalized: enriched, status, reason });
  } catch (error) {
    return normalizeAdapterMetric(null, { ...registryEntry, scope }, { ...base, normalized: { scope, scope_kind: 'unknown', totals: {}, per_file: [], metrics: [], metrics_available: false, reported_paths: [] }, status: 'BLOCKED', reason: error.message === 'coverage_artifact_missing' ? 'artifact_missing' : 'malformed_output' });
  }
}

function readCoverageSummary(output, format) {
  if (!isRecord(output)) throw Error('coverage_output_malformed');
  if (output.version !== format.output) throw Error('coverage_output_malformed');
  const totalsSource = output[format.totalsPath];
  if (!isRecord(totalsSource)) throw Error('coverage_output_malformed');
  const totals = readCoverageTotals(totalsSource, format);
  const scopeKind = output.scope === 'global' || !Array.isArray(output.files) ? 'global' : 'per-file';
  const perFile = [];
  const reportedPaths = [];
  if (scopeKind === 'per-file') {
    if (!Array.isArray(output.files)) throw Error('coverage_files_missing');
    for (const file of output.files) {
      if (!isRecord(file) || typeof file.path !== 'string') throw Error('coverage_file_invalid');
      const fp = normalizeImpactPath(file.path);
      perFile.push({ path: fp, totals: readCoverageTotals(file, format) });
      reportedPaths.push(fp);
    }
  }
  const normalized = {
    scope_kind: scopeKind,
    totals,
    per_file: perFile,
    metrics: format.metrics.filter((m) => totals[m] !== undefined),
    metrics_available: format.metrics.some((m) => totals[m] !== undefined),
    reported_paths: [...new Set(reportedPaths)].sort(),
  };
  return { scope_kind: scopeKind, normalized, reportedPaths };
}

function readCoverageTotals(source, format) {
  const totals = {};
  for (const metric of format.metrics) {
    const bucket = source[metric];
    if (!isRecord(bucket)) throw Error('coverage_totals_missing');
    const total = count(bucket[format.totalField], `coverage_${metric}_total_invalid`);
    const covered = count(bucket[format.coveredField], `coverage_${metric}_covered_invalid`);
    const pctValue = pct(bucket.pct, `coverage_${metric}_pct_invalid`);
    if (covered > total) throw Error('coverage_counts_invalid');
    const c = {};
    for (const field of COVERAGE_METRIC_FIELDS) {
      if (field === 'total') c.total = total;
      else if (field === 'covered') c.covered = covered;
      else if (field === 'pct') c.pct = pctValue;
    }
    totals[metric] = c;
  }
  return totals;
}

function pct(value, reason) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 100) throw Error(reason);
  return Math.round(value * 100) / 100;
}

function readLintSummary(output) {
  if (!Array.isArray(output)) throw Error('lint_output_malformed');
  let errorCount = 0; let warningCount = 0; const messages = []; const filePaths = [];
  for (const file of output) {
    if (!isRecord(file) || typeof file.filePath !== 'string' || !Number.isInteger(file.errorCount) || file.errorCount < 0 || !Number.isInteger(file.warningCount) || file.warningCount < 0 || !Array.isArray(file.messages)) throw Error('lint_output_malformed');
    const filePath = normalizeImpactPath(file.filePath);
    errorCount += file.errorCount; warningCount += file.warningCount; filePaths.push(filePath); messages.push(...file.messages);
  }
  if (new Set(filePaths).size !== filePaths.length || messages.some((message) => !isRecord(message) || typeof message.message !== 'string')) throw Error('lint_output_malformed');
  return { errorCount, warningCount, filePaths: filePaths.sort(), messages };
}

function count(value, reason) {
  if (!Number.isInteger(value) || value < 0) throw Error(reason);
  return value;
}

export function normalizeCrap(i = {}) { const b = legacyContract(i, 'crap', 'changed-functions'); if (!Number.isFinite(i.cyclomatic) || !Number.isFinite(i.coverage) || i.coverage < 0 || i.coverage > 1) throw Error('crap_inputs_invalid'); return { ...b, formula: 'CC^2 * (1 - coverage)^3 + CC', normalized: { cyclomatic: i.cyclomatic, coverage: i.coverage, crap: i.cyclomatic ** 2 * (1 - i.coverage) ** 3 + i.cyclomatic } }; }
export function normalizeMutation(i = {}) { const b = legacyContract(i, 'mutation', i.scope || 'changed-files'); const fields = ['total', 'killed', 'survived', 'uncovered', 'timeout', 'error']; if (i.total === undefined || i.killed === undefined) throw Error('mutation_totals_required'); const normalized = Object.fromEntries(fields.filter((x) => i[x] !== undefined).map((x) => [x, num(i[x], `mutation_${x}_invalid`)])); return { ...b, normalized }; }
export const normalizeDry = (i) => ({ ...legacyContract(i, 'dry', i.scope || 'changed-files'), advisory: true, candidates: Array.isArray(i.candidates) ? i.candidates : [] });
export const normalizeAcceptance = (i) => ({ ...legacyContract(i, 'acceptance', i.scope || 'target'), status: i.target ? (i.status || 'UNAVAILABLE') : 'UNAVAILABLE', ...(i.target ? {} : { reason: 'acceptance_target_missing' }) });

function validateRegistryEntry(entry) {
  if (!isRecord(entry)) throw Error('capability_registry_entry_invalid');
  assertKnownKeys(entry, ['id', 'metric', 'provider', 'provider_version', 'digest', 'adapter', 'semantics', 'scopes', 'policy'], 'capability_registry_entry');
  for (const field of ['id', 'metric', 'provider', 'provider_version', 'digest', 'adapter', 'semantics', 'scopes', 'policy']) if (entry[field] === undefined) throw Error(`capability_${field}_required`);
  if (typeof entry.id !== 'string' || !entry.id.trim() || !METRICS.has(entry.metric) || typeof entry.provider !== 'string' || !entry.provider.trim() || /^(?:https?|git\+|ssh:|ftp:)/i.test(entry.provider)) throw Error('capability_provider_resolution_forbidden');
  if (!SEMVER.test(entry.provider_version)) throw Error('capability_provider_version_invalid');
  if (!DIGEST.test(entry.digest)) throw Error('capability_digest_immutable_required');
  if (typeof entry.adapter !== 'string' || !entry.adapter.trim() || typeof entry.semantics !== 'string' || !entry.semantics.trim()) throw Error('capability_contract_invalid');
  if (!Array.isArray(entry.scopes) || !entry.scopes.length || entry.scopes.some((scope) => !SCOPES.has(scope))) throw Error('capability_scopes_invalid');
  if (!POLICIES.has(entry.policy)) throw Error('capability_policy_invalid');
}
function assertRegistryPin(entry, lock) { const tool = lock?.tools?.[entry.provider] || lock?.tools?.[entry.id]; if (!tool || tool.provider !== entry.provider || tool.version !== entry.provider_version || !DIGEST.test(tool.digest) || tool.digest.toLowerCase() !== entry.digest.toLowerCase()) throw Error(`capability_toolchain_pin_invalid:${entry.id}`); }
function assertKnownKeys(value, allowed, label) { for (const key of Object.keys(value)) if (!allowed.includes(key)) throw Error(`${label}_unknown_field:${key}`); }
function legacyContract(i, metric, scope) { if (typeof i.provider !== 'string' || typeof i.version !== 'string' || typeof i.semantics !== 'string') throw Error(`${metric}_contract_invalid`); return { version: METRICS_VERSION, metric, provider: i.provider, provider_version: i.version, semantics: i.semantics, scope: i.scope || scope, raw: { ...i } }; }
function num(value, reason) { if (!Number.isFinite(value) || value < 0) throw Error(reason); return value; }
function isRecord(value) { return typeof value === 'object' && value !== null && !Array.isArray(value); }
function stable(value) { if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`; if (isRecord(value)) return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stable(value[key])}`).join(',')}}`; return JSON.stringify(value); }
export const contractDigest = (value) => createHash('sha256').update(stable(value)).digest('hex');
