import { createHash } from 'node:crypto';
import { validateCapsule } from './capsule.mjs';
import { validateEvidenceEnvelope } from './evidence-boundary.mjs';
import { checkEvidenceFreshness } from './stale.mjs';

export const OUTCOME_VERSION = 'outcome/v1';
export const OUTCOME_STATUSES = Object.freeze(['PASS', 'FAIL', 'BLOCKED', 'UNAVAILABLE', 'NOT_TESTED', 'STALE']);
const TRUSTED = new Set(['runner', 'fsm']);
const EVALUATED = new WeakSet();
const OUTCOME_FIELDS = new Set(['version', 'change_id', 'task_id', 'run_id', 'capsule_digest', 'producer', 'accepted', 'status', 'reason', 'evidence_refs', 'stale', 'revision', 'authoritative', 'waiver', 'waiver_claim', 'claimed_waiver', 'waiver_ref', 'outcome_digest']);
const stable = (value) => Array.isArray(value) ? `[${value.map(stable).join(',')}]` : value && typeof value === 'object' ? `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stable(value[key])}`).join(',')}}` : JSON.stringify(value);
const text = (value, name) => { if (typeof value !== 'string' || !value.trim()) throw Error(`${name}_missing`); return value; };
const identity = (value, name) => { text(value, name); return value; };

export function outcomeDigest(outcome) { const { outcome_digest: ignored, ...content } = outcome || {}; return createHash('sha256').update(stable(content)).digest('hex'); }

export function validateOutcome(outcome) {
  if (!outcome || typeof outcome !== 'object' || outcome.version !== OUTCOME_VERSION) throw Error('outcome_version_invalid');
  if (Object.keys(outcome).some((key) => !OUTCOME_FIELDS.has(key))) throw Error('outcome_field_forbidden');
  for (const key of ['change_id', 'task_id', 'run_id', 'capsule_digest', 'producer', 'reason']) identity(outcome[key], key);
  if (!OUTCOME_STATUSES.includes(outcome.status)) throw Error('outcome_status_invalid');
  if (!['runner', 'fsm', 'agent', 'prose'].includes(outcome.producer)) throw Error('outcome_producer_invalid');
  if (typeof outcome.accepted !== 'boolean' || typeof outcome.stale !== 'boolean' || !Number.isInteger(outcome.revision) || outcome.revision < 0) throw Error('outcome_fields_invalid');
  if (!Array.isArray(outcome.evidence_refs) || outcome.evidence_refs.some((ref) => typeof ref !== 'string' || !ref.trim())) throw Error('outcome_evidence_refs_invalid');
  if (outcome.authoritative !== undefined && typeof outcome.authoritative !== 'boolean') throw Error('outcome_authority_invalid');
  if (outcome.outcome_digest !== undefined && outcome.outcome_digest !== outcomeDigest(outcome)) throw Error('outcome_digest_invalid');
  return outcome;
}

export function createOutcome(input = {}) {
  const outcome = { version: OUTCOME_VERSION, ...input, accepted: false, authoritative: false };
  validateOutcome(outcome);
  outcome.outcome_digest = outcomeDigest(outcome);
  return outcome;
}

const finish = (outcome, status, reason, authoritative = false) => {
  const result = { ...outcome, status, reason, accepted: status === 'PASS' && authoritative, stale: status === 'STALE', authoritative, outcome_digest: undefined };
  result.outcome_digest = outcomeDigest(result);
  if (authoritative) EVALUATED.add(result);
  return result;
};
const evidenceFor = (ref, context) => (context.evidence || context.evidence_refs || []).find((item) => typeof item === 'string' ? item === ref : item?.ref === ref || item?.path === ref || item?.id === ref)?.envelope || (context.evidence || context.evidence_refs || []).find((item) => typeof item === 'string' ? item === ref : item?.ref === ref || item?.path === ref || item?.id === ref);

export function evaluateOutcome(input = {}, context = {}) {
  const outcome = createOutcome(input);
  const capsule = context.capsule;
  if (!capsule) return finish(outcome, 'BLOCKED', 'capsule_missing');
  validateCapsule(capsule);
  if (['change_id', 'task_id', 'run_id', 'capsule_digest'].some((key) => outcome[key] !== capsule[key])) return finish(outcome, 'STALE', 'foreign_identity');
  if (outcome.stale) return finish(outcome, 'STALE', outcome.reason || 'stale_evidence');
  if (context.currentRevision !== undefined && Number(context.currentRevision) !== outcome.revision) return finish(outcome, 'STALE', 'revision_stale');
  if (outcome.waiver || outcome.waiver_claim || outcome.claimed_waiver || outcome.waiver_ref) return finish(outcome, 'BLOCKED', 'claimed_waiver_not_authoritative');
  if (!TRUSTED.has(outcome.producer)) return finish(outcome, outcome.status === 'PASS' ? 'BLOCKED' : outcome.status, outcome.status === 'PASS' ? 'agent_authored_pass' : 'agent_authored_outcome');
  if (!outcome.evidence_refs.length) return finish(outcome, 'UNAVAILABLE', 'evidence_missing');
  const evidence = outcome.evidence_refs.map((ref) => evidenceFor(ref, context));
  if (evidence.some((item) => !item)) return finish(outcome, 'BLOCKED', 'evidence_reference_missing');
  try { evidence.forEach((item) => validateEvidenceEnvelope(item)); } catch { return finish(outcome, 'BLOCKED', 'evidence_invalid'); }
  if (evidence.some((item) => item.change_id !== capsule.change_id || item.task_id !== capsule.task_id || item.run_id !== capsule.run_id || item.base_sha !== capsule.base_sha || item.head_sha !== capsule.head_sha || item.capsule_digest !== capsule.capsule_digest)) return finish(outcome, 'STALE', 'foreign_evidence');
  if (evidence.some((item) => item.revision !== outcome.revision || (context.currentRevision !== undefined && item.revision !== Number(context.currentRevision)))) return finish(outcome, 'STALE', 'revision_stale');
  if (!context.projectRoot) return finish(outcome, 'UNAVAILABLE', 'freshness_context_unavailable');
  const freshness = evidence.map((item) => checkEvidenceFreshness(item, item, { projectRoot: context.projectRoot, currentRevision: context.currentRevision }));
  const failedFreshness = freshness.find((item) => item.status !== 'FRESH');
  if (failedFreshness) return finish(outcome, failedFreshness.status, failedFreshness.reason || 'evidence_not_fresh');
  const failedEvidence = evidence.find((item) => item.result.status !== 'PASS');
  return finish(outcome, failedEvidence ? failedEvidence.result.status : outcome.status, failedEvidence ? 'evidence_status_not_pass' : outcome.reason, !failedEvidence && outcome.status === 'PASS');
}

export function isAuthoritativeOutcome(outcome) {
  try { validateOutcome(outcome); } catch { return false; }
  return EVALUATED.has(outcome) && outcome.authoritative === true && outcome.accepted === true && outcome.status === 'PASS' && TRUSTED.has(outcome.producer) && outcome.stale === false && outcome.evidence_refs.length && outcome.outcome_digest === outcomeDigest(outcome);
}
