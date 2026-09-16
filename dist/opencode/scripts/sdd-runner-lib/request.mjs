import path from 'node:path';
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { validateCapsule } from './capsule.mjs';

// This is a pure contract guard. OS/runtime permission enforcement is deferred to Slice 5.

export const REQUEST_VERSION = 'request/v1';
const AUTHORITY_KEYS = new Set(['pass', 'passed', 'result', 'status', 'accepted', 'authoritative', 'gate', 'qualitygate', 'outcome', 'waiver', 'claimedwaiver', 'approvewaiver']);
const RESERVED = new Set(['accepted', 'authoritative', 'gate', 'outcome', 'status', 'waiver', 'write_state', 'write_evidence', 'write_policy', 'write_lock', 'write_toolchain']);
const REQUEST_FIELDS = new Set(['version', 'change_id', 'task_id', 'run_id', 'capsule_digest', 'expected_revision', 'expected_hash', 'idempotency_key', 'action', 'payload', 'request_digest']);
const PATH_KEYS = /(?:^|_)(?:path|paths|file|files|target|destination|output|outputs)$/i;
const forbidden = (value) => /(^|\/)(?:state\.ya?ml|lock|[^/]*\.lock)$|(^|\/)(?:artifacts\/runs|evidence(?:\.[a-z]+)?|policy(?:\.[a-z]+)?|toolchain(?:\.[a-z]+)?)(?:\/|$)|(^|\/)openspec\/(?:config\.ya?ml|quality-toolchain\.lock)(?:\/|$)/i.test(value);
const stable = (value) => Array.isArray(value) ? `[${value.map(stable).join(',')}]` : value && typeof value === 'object' ? `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stable(value[key])}`).join(',')}}` : JSON.stringify(value);
const text = (value, name) => { if (typeof value !== 'string' || !value.trim()) throw Error(`${name}_missing`); return value; };
export function requestDigest(request) { const { request_digest: ignored, ...content } = request || {}; return createHash('sha256').update(stable(content)).digest('hex'); }
export function guardWorkerPayload(payload, { projectRoot } = {}) {
  const root = projectRoot ? path.resolve(projectRoot) : process.cwd();
  let realRoot;
  try { realRoot = fs.realpathSync(root); } catch { realRoot = undefined; }
  const inspectPath = (value) => {
    if (typeof value !== 'string' || !value.trim() || value.includes('\0')) return { allowed: false, worker_write_forbidden: true, reason: 'path_invalid' };
    const candidate = value.replaceAll('\\', '/');
    if (path.isAbsolute(candidate) || /^[A-Za-z]:\//.test(candidate)) return { allowed: false, worker_write_forbidden: true, reason: 'path_outside_project' };
    if (candidate.split('/').some((segment) => segment === '.' || segment === '..')) return { allowed: false, worker_write_forbidden: true, reason: 'path_outside_project' };
    if (!realRoot) return { allowed: false, worker_write_forbidden: true, reason: 'path_containment_unavailable', path: candidate };
    const resolved = path.resolve(root, candidate); const relative = path.relative(root, resolved).split(path.sep).join('/');
    if (relative === '..' || relative.startsWith('../') || path.isAbsolute(relative) || forbidden(relative)) return { allowed: false, worker_write_forbidden: true, reason: forbidden(relative) ? 'authoritative_path_forbidden' : 'path_outside_project', path: candidate };
    let existing = resolved;
    try { while (!fs.existsSync(existing) && existing !== root) existing = path.dirname(existing); const real = fs.realpathSync(existing); const containment = path.relative(realRoot, real); if (containment === '..' || containment.startsWith(`..${path.sep}`) || path.isAbsolute(containment)) return { allowed: false, worker_write_forbidden: true, reason: 'path_outside_project', path: candidate }; } catch { return { allowed: false, worker_write_forbidden: true, reason: 'path_containment_unavailable', path: candidate }; }
    return { allowed: true };
  };
  const normalizeKey = (key) => String(key).toLowerCase().replace(/[^a-z0-9]/g, '');
  const visit = (value, key = '') => {
    const normalizedKey = normalizeKey(key);
    if (RESERVED.has(key) || AUTHORITY_KEYS.has(normalizedKey) || ['write', 'transition', 'force'].some((token) => normalizedKey.includes(token))) return { allowed: false, worker_write_forbidden: true, reason: 'request_authority_forbidden' };
    if (PATH_KEYS.test(key)) { for (const item of Array.isArray(value) ? value : [value]) { const result = inspectPath(item); if (!result.allowed) return result; } return { allowed: true }; }
    if (Array.isArray(value)) { for (const item of value) { const result = visit(item); if (!result.allowed) return result; } return { allowed: true }; }
    if (value && typeof value === 'object') { for (const [child, item] of Object.entries(value)) { const result = visit(item, child); if (!result.allowed) return result; } }
    return { allowed: true };
  };
  return visit(payload);
}
export function validateRequest(request, capsule, options = {}) {
  if (!request || typeof request !== 'object' || request.version !== REQUEST_VERSION) throw Error('request_version_invalid');
  if (Object.keys(request).some((key) => RESERVED.has(key))) throw Error('request_authority_forbidden');
  if (Object.keys(request).some((key) => !REQUEST_FIELDS.has(key))) throw Error('request_field_forbidden');
  for (const key of ['change_id', 'task_id', 'run_id', 'capsule_digest', 'expected_hash', 'idempotency_key', 'action']) text(request[key], key);
  if (!Number.isInteger(request.expected_revision) || request.expected_revision < 0) throw Error('expected_revision_invalid');
  if (!capsule) throw Error('capsule_missing'); validateCapsule(capsule);
  for (const key of ['change_id', 'task_id', 'run_id']) if (request[key] !== capsule[key]) throw Error(`request_${key}_mismatch`);
  if (request.capsule_digest !== capsule.capsule_digest) throw Error('request_capsule_digest_mismatch');
  if (!capsule.allowed_actions.includes(request.action)) throw Error('request_action_not_allowed');
  const guard = guardWorkerPayload(request.payload, typeof options === 'string' ? { projectRoot: options } : options); if (!guard.allowed) throw Error(guard.reason === 'authoritative_path_forbidden' || guard.reason === 'request_authority_forbidden' ? 'worker_write_forbidden' : guard.reason);
  if (typeof request.request_digest !== 'string' || !/^[0-9a-f]{64}$/i.test(request.request_digest) || request.request_digest !== requestDigest(request)) throw Error('request_digest_invalid');
  return { ...request, identity: { change_id: request.change_id, task_id: request.task_id, run_id: request.run_id } };
}
export function createRequest(input = {}, capsule, options = {}) { const request = { version: REQUEST_VERSION, ...input, payload: input.payload || {} }; request.request_digest = requestDigest(request); validateRequest(request, capsule, options); return request; }
