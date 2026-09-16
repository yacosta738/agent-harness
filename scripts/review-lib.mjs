import { createHash, randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

export const REVIEW_VERSION = 'agent-harness.review/v1';
export const ASSESSMENT_VERSION = 'agent-harness.review-assessment/v1';

function git(root, args, env = {}) { return execFileSync('git', ['-C', root, ...args], { encoding: 'utf8', env: { ...process.env, ...env } }).trim(); }
function configPath(configHome) { return path.join(configHome ?? process.env.AGENT_HARNESS_CONFIG_HOME ?? path.join(os.homedir(), '.config'), 'agent-harness', 'review-mode.json'); }
function cloneConfigPath(root) { return path.join(root, '.agent-harness', 'review-mode.json'); }
function statePath(root) {
  const gitPath = git(root, ['rev-parse', '--git-path', 'agent-harness-review']);
  return path.join(path.isAbsolute(gitPath) ? gitPath : path.join(root, gitPath), 'transaction.json');
}
async function readJson(file) { try { return JSON.parse(await fs.readFile(file, 'utf8')); } catch (error) { if (error.code === 'ENOENT') return undefined; throw error; } }
async function writeJson(file, value) { await fs.mkdir(path.dirname(file), { recursive: true }); const tmp = `${file}.${process.pid}.tmp`; await fs.writeFile(tmp, `${JSON.stringify(value, null, 2)}\n`, 'utf8'); await fs.rename(tmp, file); }
function digest(value) { return createHash('sha256').update(JSON.stringify(value)).digest('hex'); }

export async function setReviewMode(root, action, { configHome, scope = 'global' } = {}) {
  if (!['enable', 'disable'].includes(action)) throw new Error('mode_action_invalid');
  if (!['global', 'clone'].includes(scope)) throw new Error('mode_scope_invalid');
  const file = scope === 'clone' ? cloneConfigPath(root) : configPath(configHome); const current = (await readJson(file)) ?? {};
  current.global = action === 'enable';
  await writeJson(file, current);
  return { version: REVIEW_VERSION, status: action === 'enable' ? 'enabled' : 'disabled', source: scope };
}

export async function reviewStatus(root, { configHome } = {}) {
  const mode = await readJson(configPath(configHome)); const clone = await readJson(cloneConfigPath(root)); const state = await readJson(statePath(root));
  const enabled = mode?.global === true && clone?.global !== false;
  return { version: REVIEW_VERSION, mode: enabled ? 'enabled' : 'disabled', source: clone?.global === false ? 'clone' : mode?.global === true ? 'global' : 'default', status: state?.status ?? 'unmanaged', ...(state ? { lineage: state.lineage, revision: state.revision, risk: state.risk, ...(state.next_transition ? { next_transition: state.next_transition } : {}) } : {}) };
}

export function assessCandidate(root) {
  const files = git(root, ['status', '--porcelain=v1', '--untracked-files=all']).split('\n').filter(Boolean).map((line) => line.slice(3));
  const changedPaths = [...new Set(files.map((file) => file.replace(/^\?\? /, '').replace(/^[ MARCUD!?]{2} /, '')))].sort();
  const passive = changedPaths.length === 0 || changedPaths.every((file) => /\.(md|txt|rst|adoc|ya?ml)$/i.test(file));
  const high = changedPaths.some((file) => /(^|\/)(auth|security|secrets?|credentials?)(\/|\.|$)|\.(pem|key|p12|pfx|sh|js|ts|py|go|rs)$/i.test(file));
  return { version: ASSESSMENT_VERSION, risk: passive ? 'passive' : high ? 'high' : 'medium', changedPaths, changedFiles: changedPaths.length, candidate: { kind: 'current-changes' } };
}

function freezeCandidate(root, destination) {
  const baseSha = git(root, ['rev-parse', 'HEAD']);
  const index = path.join(os.tmpdir(), `agent-harness-review-${process.pid}-${randomUUID()}.index`);
  const env = { GIT_INDEX_FILE: index };
  try {
    git(root, ['read-tree', baseSha], env);
    execFileSync('git', ['-C', root, 'add', '-A'], { env: { ...process.env, ...env }, encoding: 'utf8' });
    const tree = git(root, ['write-tree'], env);
    const paths = git(root, ['diff', '--cached', '--name-only'], env).split('\n').filter(Boolean).sort();
    const subjectHash = digest({ root: path.resolve(root), baseSha, tree, paths });
    if (destination) {
      const target = path.join(destination, subjectHash);
      execFileSync('git', ['-C', root, 'archive', tree, '-o', target + '.tar'], { encoding: 'utf8' });
    }
    return { baseSha, candidateTree: tree, paths, subjectHash };
  } finally { fs.rm(index, { force: true }).catch(() => {}); }
}

function binding(state) { return { lineage: state.lineage, revision: state.revision, target: state.target, subjectHash: state.subjectHash }; }
function transition(state, action, token = randomUUID()) { return { action, version: REVIEW_VERSION, lineage: state.lineage, revision: state.revision, target: state.target, token }; }
function requireBinding(state, input) {
  for (const key of ['lineage', 'revision', 'target', 'subjectHash']) if (input[key] !== state[key]) throw new Error(`binding_${key}_mismatch`);
}

export async function startReview(root, { configHome } = {}) {
  const mode = await reviewStatus(root, { configHome });
  if (mode.mode !== 'enabled') return { version: REVIEW_VERSION, status: 'disabled/unmanaged', source: mode.source };
  const current = await readJson(statePath(root)); const candidate = freezeCandidate(root);
  if (current) {
    if (current.subjectHash === candidate.subjectHash) return { version: REVIEW_VERSION, status: 'replayed', binding: binding(current), next_transition: current.next_transition };
    throw new Error('active_transaction_exists');
  }
  const assessment = assessCandidate(root);
  const state = { version: REVIEW_VERSION, status: 'reviewing', lineage: randomUUID(), revision: 1, target: path.resolve(root), risk: assessment.risk, ...candidate, correctionCount: 0 };
  state.reviewers = state.risk === 'high' ? ['lens', 'mirror'] : state.risk === 'medium' ? ['code-reviewer'] : [];
  state.next_transition = transition(state, 'capture');
  await writeJson(statePath(root), state);
  return { version: REVIEW_VERSION, status: state.status, binding: binding(state), risk: state.risk, next_transition: state.next_transition };
}

export async function materializeCandidate(root, { destination, subjectHash } = {}) {
  const state = await readJson(statePath(root)); if (!state) throw new Error('transaction_not_found');
  if (subjectHash && state.subjectHash !== subjectHash) throw new Error('subject_hash_mismatch');
  const target = destination ? path.resolve(destination) : path.join(path.dirname(statePath(root)), 'candidates', state.subjectHash);
  if (destination && path.relative(path.resolve(root), target).startsWith('..')) throw new Error('destination_path_traversal');
  await fs.mkdir(target, { recursive: true });
  const archive = path.join(os.tmpdir(), `agent-harness-review-${randomUUID()}.tar`);
  try {
    execFileSync('git', ['-C', root, 'archive', state.candidateTree, '-o', archive], { encoding: 'utf8' });
    execFileSync('tar', ['-xf', archive, '-C', target], { encoding: 'utf8' });
    async function readonly(dir) { for (const entry of await fs.readdir(dir, { withFileTypes: true })) { const file = path.join(dir, entry.name); if (entry.isDirectory()) await readonly(file); else await fs.chmod(file, 0o444); } await fs.chmod(dir, 0o555); }
    await readonly(target);
  } finally { await fs.rm(archive, { force: true }); }
  return { version: REVIEW_VERSION, subjectHash: state.subjectHash, path: target, readOnly: true };
}

export async function captureReview(root, input) {
  const file = statePath(root); const state = await readJson(file); if (!state) throw new Error('transaction_not_found');
  requireBinding(state, input); if (state.status !== 'reviewing') throw new Error('transition_not_allowed');
  const severe = (input.findings ?? []).some((finding) => finding?.candidateCaused === true && ['CRITICAL', 'P0', 'P1'].includes(String(finding.severity).toUpperCase()));
  const reviewers = new Set(input.reviewers ?? []);
  const inspectionComplete = state.reviewers.every((reviewer) => reviewers.has(reviewer));
  state.findings = input.findings ?? []; state.reviewerEvidence = input.reviewers ?? []; state.revision += 1;
  if (!inspectionComplete) { state.status = 'escalated'; delete state.next_transition; }
  else if (severe && state.correctionCount < 1) { state.status = 'correction_pending'; state.next_transition = transition(state, 'capture-correction'); }
  else { state.status = 'approved'; state.next_transition = transition(state, 'acknowledge-approved'); }
  await writeJson(file, state);
  return { version: REVIEW_VERSION, status: state.status, binding: binding(state), ...(state.next_transition ? { next_transition: state.next_transition } : {}) };
}

export async function captureCorrection(root, input) {
  const file = statePath(root); const state = await readJson(file); if (!state) throw new Error('transaction_not_found');
  requireBinding(state, input); if (state.status !== 'correction_pending' || state.correctionCount >= 1) throw new Error('correction_budget_exhausted');
  const successor = freezeCandidate(root); state.successorTree = successor.candidateTree; state.correctionCount = 1; state.revision += 1;
  state.status = input.validatorStatus === 'PASS' ? 'approved' : 'escalated';
  if (state.status === 'approved') state.next_transition = transition(state, 'acknowledge-approved'); else delete state.next_transition;
  await writeJson(file, state);
  return { version: REVIEW_VERSION, status: state.status, binding: binding(state), ...(state.next_transition ? { next_transition: state.next_transition } : {}) };
}

export async function acknowledgeApproved(root, input) {
  const file = statePath(root); const state = await readJson(file); if (!state) throw new Error('transaction_not_found');
  requireBinding(state, input); if (state.status !== 'approved') throw new Error('acknowledgement_not_allowed');
  if (input.acknowledgement !== state.next_transition?.token) throw new Error('acknowledgement_invalid');
  await fs.rm(file, { force: true });
  return { version: REVIEW_VERSION, status: 'burned', lineage: state.lineage, revision: state.revision };
}
