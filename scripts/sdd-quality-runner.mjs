#!/usr/bin/env node
import os from 'node:os';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { loadRunnerConfig, resolveInside, RunnerConfigError } from './sdd-runner-lib/config.mjs';
import { buildEnvironment, runProcess } from './sdd-runner-lib/exec.mjs';
import { createRedactor, redactValue } from './sdd-runner-lib/redact.mjs';
import { collectArtifacts, classifyResult, evaluateThreshold, parseOutput, RUNNER_RESULT_VERSION, CONTROL_PLANE_RESULT_VERSION, writeEvidence } from './sdd-runner-lib/result.mjs';
import { createEvidenceEnvelope } from './sdd-runner-lib/evidence-boundary.mjs';
import { calculateGitImpact } from './sdd-runner-lib/git-impact.mjs';
import { toolchainDigest, validateToolchainLock } from './sdd-runner-lib/toolchain.mjs';

const args = parseArgs(process.argv.slice(2));
if (args.help) { console.log('Usage: sdd-quality-runner.mjs run --project PATH [--config PATH] [--capability ID] [--json]'); process.exit(0); }
try {
  const loaded = loadRunnerConfig({ project: args.project, config: args.config });
  const controlPlane = loaded.manifest?.control_plane?.enabled ? loadControlPlane(loaded, args) : null;
  const results = loaded.manifest?.enabled === false ? [unavailable(loaded, 'runner_disabled')] : loaded.manifest ? await runCapabilities(loaded, args.capability, controlPlane) : [unavailable(loaded, loaded.unavailableReason)];
  const summary = Object.fromEntries(['PASS', 'FAIL', 'BLOCKED', 'UNAVAILABLE', 'NOT_TESTED'].map((status) => [status.toLowerCase(), results.filter((item) => item.result.status === status).length]));
  const version = results.some((item) => item.version === CONTROL_PLANE_RESULT_VERSION) ? CONTROL_PLANE_RESULT_VERSION : RUNNER_RESULT_VERSION;
  console.log(JSON.stringify({ version, runner: 'sdd-quality-runner', project: loaded.projectRoot, results, summary }, null, args.json ? 2 : 0));
  process.exit(results.some((item) => ['FAIL', 'BLOCKED'].includes(item.result.status)) ? 1 : 0);
} catch (error) {
  console.error(JSON.stringify({ version: RUNNER_RESULT_VERSION, status: 'BLOCKED', reason: error instanceof RunnerConfigError ? error.details.code || 'configuration_error' : 'unexpected_error', message: error instanceof Error ? error.message : String(error) }, null, 2));
  process.exit(2);
}

async function runCapabilities(loaded, requested, controlPlane) {
  const entries = Object.entries(loaded.manifest.capabilities).filter(([id]) => !requested || id === requested);
  if (controlPlane?.blocked) return [controlPlaneEnvelope(loaded, requested || 'runner', controlPlane.reason, controlPlane)];
  return requested && !entries.length ? [unavailable(loaded, 'capability_not_configured', requested)] : Promise.all(entries.map(([id, definition]) => runCapability(loaded, id, definition, controlPlane)));
}
async function runCapability(loaded, id, definition, controlPlane) {
  try { return await runCapabilityUnsafe(loaded, id, definition, controlPlane); }
  catch (error) {
    const redactor = createRedactor(loaded.manifest.redaction, definition.redaction);
    const directory = resolveInside(loaded.projectRoot, path.join('artifacts', 'runs', runId()));
    const envelope = { version: RUNNER_RESULT_VERSION, run_id: path.basename(directory), capability: { id, required: definition.required, blocking: definition.blocking }, config: { path: path.relative(loaded.projectRoot, loaded.configPath), digest: loaded.manifestDigest }, command: { argv: definition.argv?.map(redactor) || [], shell: definition.shell || false, cwd: '.' }, execution: { exit_code: null, signal: null, duration_ms: 0, timed_out: false, output_truncated: false }, result: { status: 'BLOCKED', reason: error instanceof RunnerConfigError ? error.details.code || 'path_rejected' : 'execution_blocked' }, parser: { type: 'none', accepted: false, value: null }, evidence: { stdout: '', stderr: redactor(error instanceof Error ? error.message : String(error)) }, artifacts: [], environment: { platform: process.platform, arch: process.arch, node: process.version } };
    writeEvidence(directory, envelope, loaded.projectRoot);
    return envelope;
  }
}
async function runCapabilityUnsafe(loaded, id, definition, controlPlane) {
  const cwd = resolveInside(loaded.projectRoot, definition.cwd);
  const directory = resolveInside(loaded.projectRoot, path.join(loaded.manifest.output.directory, runId()));
  const execution = definition.enabled === false ? null : await runProcess(definition, { cwd, env: buildEnvironment(definition.env_allowlist), timeoutMs: definition.timeout_ms, outputLimit: definition.max_output_bytes || loaded.manifest.output.max_output_bytes });
  const parsed = execution ? parseOutput(definition, execution) : { type: 'none', accepted: false, value: null };
  const redactor = createRedactor(loaded.manifest.redaction, definition.redaction);
  const parser = { ...parsed, value: redactValue(parsed.value, redactor) };
  const artifacts = collectArtifacts(loaded.projectRoot, definition, definition.max_artifact_bytes || loaded.manifest.output.max_artifact_bytes);
  const safeArtifacts = redactValue(artifacts, redactor);
  const envelope = {
    version: RUNNER_RESULT_VERSION, run_id: path.basename(directory), capability: { id, required: definition.required, blocking: definition.blocking },
    config: { path: path.relative(loaded.projectRoot, loaded.configPath), digest: loaded.manifestDigest },
    command: definition.argv ? { argv: definition.argv.map(redactor), shell: false, cwd: path.relative(loaded.projectRoot, cwd) || '.' } : { command: redactor(definition.command), shell: definition.shell, cwd: path.relative(loaded.projectRoot, cwd) || '.' },
    execution: { exit_code: execution?.exitCode ?? null, signal: execution?.signal ?? null, duration_ms: execution?.durationMs ?? 0, timed_out: execution?.timedOut ?? false, output_truncated: execution?.truncated ?? false },
    result: classifyResult(definition, execution || {}, parsed, artifacts), parser, threshold: evaluateThreshold(definition.thresholds, parsed.value),
    evidence: { stdout: redactor(execution?.stdout || ''), stderr: redactor(execution?.stderr || execution?.spawnError?.message || '') },
    artifacts: safeArtifacts,
    environment: { platform: process.platform, arch: process.arch, node: process.version, hostname_hash: crypto.createHash('sha256').update(os.hostname()).digest('hex') },
  };
  if (!controlPlane) { writeEvidence(directory, envelope, loaded.projectRoot); return envelope; }
  return writeControlPlaneEvidence(directory, envelope, loaded, controlPlane);
}
function unavailable(loaded, reason, id = 'runner') {
  const directory = resolveInside(loaded.projectRoot, path.join('artifacts', 'runs', runId()));
  const envelope = { version: RUNNER_RESULT_VERSION, run_id: path.basename(directory), capability: { id, required: false, blocking: false }, config: { path: path.relative(loaded.projectRoot, loaded.configPath), digest: loaded.manifestDigest }, command: { argv: [], shell: false, cwd: '.' }, execution: { exit_code: null, signal: null, duration_ms: 0, timed_out: false, output_truncated: false }, result: { status: reason === 'runner_disabled' ? 'NOT_TESTED' : 'UNAVAILABLE', reason }, parser: { type: 'none', accepted: false, value: null }, evidence: { stdout: '', stderr: '' }, artifacts: [], environment: { platform: process.platform, arch: process.arch, node: process.version } };
  writeEvidence(directory, envelope, loaded.projectRoot); return envelope;
}
function runId() { return `${Date.now()}-${process.pid}-${crypto.randomBytes(3).toString('hex')}`; }
function parseArgs(argv) {
  const result = { project: process.cwd(), config: undefined, capability: undefined, change: undefined, task: undefined, base: undefined, head: undefined, toolchainLock: undefined, allowDirty: false, json: false, help: false };
  for (let i = 0; i < argv.length; i += 1) { const item = argv[i]; if (item === 'run') continue; if (item === '--project') result.project = argv[++i]; else if (item === '--config') result.config = argv[++i]; else if (item === '--capability') result.capability = argv[++i]; else if (item === '--change') result.change = argv[++i]; else if (item === '--task') result.task = argv[++i]; else if (item === '--base' || item === '--base-sha') result.base = argv[++i]; else if (item === '--head' || item === '--head-sha') result.head = argv[++i]; else if (item === '--toolchain-lock') result.toolchainLock = argv[++i]; else if (item === '--allow-dirty') result.allowDirty = true; else if (item === '--json') result.json = true; else if (item === '--help' || item === '-h') result.help = true; else throw new RunnerConfigError(`Unknown argument: ${item}`, { code: 'invalid_argument' }); }
  return result;
}

function loadControlPlane(loaded, args) {
  if (!args.change || !args.task || !args.base || !args.head) return { blocked: true, reason: 'control_plane_identity_required' };
  const impact = calculateGitImpact({ projectRoot: loaded.projectRoot, baseSha: args.base, headSha: args.head, allowDirty: args.allowDirty });
  if (impact.status !== 'AVAILABLE') return { blocked: true, reason: `impact_${impact.reason}`, changeId: args.change, taskId: args.task, baseSha: args.base, headSha: args.head, impact };
  const relativeLock = args.toolchainLock || loaded.manifest.control_plane.toolchain_lock || 'openspec/quality-toolchain.lock';
  try {
    const lockPath = resolveInside(loaded.projectRoot, relativeLock);
    const lock = validateToolchainLock(JSON.parse(fs.readFileSync(lockPath, 'utf8')));
    return { changeId: args.change, taskId: args.task, baseSha: impact.base_sha || args.base, headSha: impact.head_sha || args.head, impact, toolchain: { ...lock, digest: toolchainDigest(lock) } };
  } catch (error) { return { blocked: true, reason: error instanceof Error ? `toolchain_${error.message}` : 'toolchain_unavailable', changeId: args.change, taskId: args.task, baseSha: args.base, headSha: args.head, impact }; }
}

function writeControlPlaneEvidence(directory, legacy, loaded, controlPlane) {
  const evidence = createEvidenceEnvelope({ ...controlPlane, runId: legacy.run_id, capability: legacy.capability, config: legacy.config, command: legacy.command, execution: legacy.execution, result: controlPlane.impact.status === 'AVAILABLE' ? legacy.result : { status: 'BLOCKED', reason: controlPlane.impact.reason }, parser: legacy.parser, threshold: legacy.threshold, evidence: legacy.evidence, artifacts: legacy.artifacts, environment: legacy.environment, projectRoot: loaded.projectRoot, redaction: loaded.manifest.redaction });
  writeEvidence(directory, { ...evidence, capability: legacy.capability }, loaded.projectRoot);
  return evidence;
}

function controlPlaneEnvelope(loaded, id, reason, controlPlane = {}) {
  const run = runId();
  const envelope = createEvidenceEnvelope({ changeId: controlPlane.changeId || 'unknown', taskId: controlPlane.taskId || 'unknown', runId: run, baseSha: controlPlane.baseSha || 'unknown', headSha: controlPlane.headSha || 'unknown', impact: controlPlane.impact?.impact_digest ? controlPlane.impact : { impact_digest: `unavailable:${reason}`, changed: [], affected: [] }, config: { path: path.relative(loaded.projectRoot, loaded.configPath), digest: loaded.manifestDigest }, command: { argv: [], shell: false, cwd: '.' }, toolchain: controlPlane.toolchain || { digest: 'unknown' }, capability: { id, required: false, blocking: true }, result: { status: 'BLOCKED', reason }, projectRoot: loaded.projectRoot });
  const directory = resolveInside(loaded.projectRoot, path.join('artifacts', 'runs', run));
  writeEvidence(directory, envelope, loaded.projectRoot);
  return envelope;
}
