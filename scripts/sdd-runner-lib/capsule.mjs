import { createHash } from 'node:crypto';

export const CAPSULE_VERSION = 'capsule/v1';
export const CAPSULE_PHASES = Object.freeze(['init', 'explore', 'propose', 'spec', 'design', 'tasks', 'apply', 'verify', 'qa', 'archive']);
export const CAPSULE_STATES = Object.freeze(['READY', 'IN_PROGRESS', 'VERIFYING', 'COMPLETE', 'BLOCKED', 'STALE', 'UNAVAILABLE']);
export const CAPSULE_ACTIONS = Object.freeze(['inspect', 'edit_product', 'edit_tests', 'request_verification', 'run_quality', 'run_acceptance', 'review', 'architecture_review', 'prepare_handoff']);
export const CAPSULE_OUTCOMES = Object.freeze(['implementation_ready', 'request_verification', 'verify_ready', 'qa_ready', 'blocked', 'failed', 'stale', 'unavailable', 'not_tested']);
const FIELDS = new Set(['version', 'change_id', 'task_id', 'run_id', 'role', 'capability', 'phase', 'state', 'objective', 'impact_set_ref', 'base_sha', 'head_sha', 'evidence_refs', 'allowed_actions', 'allowed_outcomes', 'constraints', 'capsule_digest']);
const text = (value, name) => { if (typeof value !== 'string' || !value.trim()) throw Error(`${name}_missing`); return value; };
const identity = (value, name) => { text(value, name); if (!/^[A-Za-z0-9][A-Za-z0-9._:-]{2,127}$/.test(value)) throw Error(`${name}_invalid`); return value; };
const list = (value, name) => { if (!Array.isArray(value) || !value.length || value.some((item) => typeof item !== 'string' || !item.trim())) throw Error(`${name}_invalid`); return value; };
const stable = (value) => Array.isArray(value) ? `[${value.map(stable).join(',')}]` : value && typeof value === 'object' ? `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stable(value[key])}`).join(',')}}` : JSON.stringify(value);
export function capsuleDigest(capsule) { const { capsule_digest: ignored, ...content } = capsule || {}; return createHash('sha256').update(stable(content)).digest('hex'); }
export function validateCapsule(capsule) {
  if (!capsule || typeof capsule !== 'object' || Array.isArray(capsule) || capsule.version !== CAPSULE_VERSION) throw Error('capsule_version_invalid');
  if (Object.keys(capsule).some((key) => !FIELDS.has(key))) throw Error('capsule_field_forbidden');
  for (const key of ['change_id', 'task_id', 'run_id', 'role', 'capability', 'impact_set_ref', 'base_sha', 'head_sha']) identity(capsule[key], key);
  text(capsule.objective, 'objective');
  if (!CAPSULE_PHASES.includes(capsule.phase)) throw Error('capsule_phase_invalid');
  if (!CAPSULE_STATES.includes(capsule.state)) throw Error('capsule_state_invalid');
  list(capsule.evidence_refs, 'evidence_refs'); list(capsule.allowed_actions, 'allowed_actions'); list(capsule.allowed_outcomes, 'allowed_outcomes');
  if (capsule.allowed_actions.some((action) => !CAPSULE_ACTIONS.includes(action))) throw Error('capsule_action_invalid');
  if (capsule.allowed_outcomes.some((outcome) => !CAPSULE_OUTCOMES.includes(outcome))) throw Error('capsule_outcome_invalid');
  if (!capsule.constraints || typeof capsule.constraints !== 'object' || Array.isArray(capsule.constraints) || capsule.constraints.worker_write_forbidden !== true) throw Error('capsule_constraints_invalid');
  if (typeof capsule.capsule_digest !== 'string' || !/^[0-9a-f]{64}$/i.test(capsule.capsule_digest)) throw Error('capsule_digest_invalid');
  if (capsule.capsule_digest !== capsuleDigest(capsule)) throw Error('capsule_digest_invalid');
  return capsule;
}
export function createCapsule(input = {}) {
  const capsule = { version: CAPSULE_VERSION, ...input, constraints: { ...(input.constraints || {}), worker_write_forbidden: true } };
  capsule.capsule_digest = capsuleDigest(capsule); validateCapsule(capsule); return capsule;
}
