import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

export const PHASES = Object.freeze(['init', 'explore', 'propose', 'spec', 'design', 'tasks', 'apply', 'verify', 'qa', 'archive']);
const LEGACY_FIELDS = ['change', 'current_phase', 'completed', 'next', 'updated'];

export function parseState(text) {
  const state = {};
  for (const line of text.split(/\r?\n/)) {
    const match = line.match(/^([A-Za-z_][A-Za-z0-9_-]*):\s*(.*)$/);
    if (!match) continue;
    const [, key, raw] = match;
    state[key] = parseScalar(raw);
  }
  if (!state.change || !PHASES.includes(state.current_phase) || !Array.isArray(state.completed)) throw new Error('invalid_state');
  return state;
}

export function loadState(filePath) {
  return parseState(fs.readFileSync(filePath, 'utf8'));
}

export function serializeState(state) {
  const known = [...LEGACY_FIELDS, 'revision', 'revision_hash', 'last_idempotency_key'];
  const keys = [...new Set([...known, ...Object.keys(state)])].filter((key) => state[key] !== undefined);
  return `${keys.map((key) => `${key}: ${formatScalar(state[key])}`).join('\n')}\n`;
}

export function stateHash(state) {
  const comparable = { ...state };
  delete comparable.revision_hash;
  return crypto.createHash('sha256').update(serializeState(comparable)).digest('hex');
}

export function nextPhase(state) {
  const completed = new Set(state.completed);
  if (state.current_phase === 'propose' && !completed.has('spec')) return 'spec';
  if (state.current_phase === 'propose' && !completed.has('design')) return 'design';
  if (state.current_phase === 'spec' && !completed.has('design')) return 'design';
  if (state.current_phase === 'design' && !completed.has('spec')) return 'spec';
  if (completed.has('spec') && completed.has('design') && !completed.has('tasks')) return 'tasks';
  return { init: 'explore', explore: 'propose', tasks: 'apply', apply: 'verify', verify: 'qa', qa: 'archive', archive: 'none' }[state.current_phase] || state.next || 'none';
}

export function evaluateTransition({ state, target, changeRoot, idempotencyKey, expectedRevision, expectedHash, remediationReason = '' }) {
  const current = state.current_phase;
  const completed = new Set(state.completed);
  if (state.revision_hash && state.revision_hash !== stateHash(state)) return reject('state_hash_invalid');
  if (completed.has(target) && state.last_idempotency_key === idempotencyKey) return { accepted: true, idempotent: true, state };
  if (state.last_idempotency_key === idempotencyKey) return reject('idempotency_conflict');
  if (completed.has(target) && !(target === 'apply' && ['verify', 'qa'].includes(current))) return reject('phase_already_completed');
  if (expectedRevision !== undefined && Number(state.revision || 0) !== Number(expectedRevision)) return reject('stale_revision');
  if (expectedHash !== undefined && state.revision_hash !== expectedHash) return reject('stale_hash');
  if (target === 'apply' && ['verify', 'qa'].includes(current) && !remediationReason.trim()) return reject('remediation_reason_required');
  const legal = new Set(({
    init: ['explore'], explore: ['propose'], propose: ['spec', 'design'], spec: ['design', 'tasks'], design: ['spec', 'tasks'], tasks: ['apply'], apply: ['verify'], verify: ['qa', 'apply'], qa: ['archive', 'apply'], archive: [],
  })[current] || []);
  if (!legal.has(target) && !(target === 'tasks' && completed.has('spec') && completed.has('design'))) return reject('illegal_transition');
  if (target === 'archive' && !fs.existsSync(path.join(changeRoot, 'verify-report.md'))) return reject('missing_verify_report');
  if (target === 'archive' && !fs.existsSync(path.join(changeRoot, 'qa-report.md'))) return reject('missing_qa_report');
  if (target === 'archive' && !archiveGate(changeRoot)) return reject('archive_gate_failed');
  if (!phasePreconditions(target, changeRoot)) return reject(`missing_${target}_artifact`);
  if (target === 'qa' && !fs.existsSync(path.join(changeRoot, 'verify-report.md'))) return reject('missing_verify_report');
  if (target === 'qa' && !reportAllows(path.join(changeRoot, 'verify-report.md'))) return reject('verify_gate_failed');
  const next = { ...state, current_phase: target, completed: [...new Set([...state.completed, target])], next: nextPhase({ ...state, current_phase: target, completed: [...completed, target] }), updated: new Date().toISOString().slice(0, 10), revision: Number(state.revision || 0) + 1, last_idempotency_key: idempotencyKey };
  next.revision_hash = stateHash(next);
  return { accepted: true, idempotent: false, state: next };
}

function archiveGate(root) {
  return reportAllows(path.join(root, 'verify-report.md'), 'verify') && (reportAllows(path.join(root, 'qa-report.md'), 'qa') || reportExceptionAllowed(root));
}
export function reportAllows(filePath, kind = path.basename(filePath) === 'qa-report.md' ? 'qa' : 'verify') {
  const text = fs.readFileSync(filePath, 'utf8');
  const verdict = extractVerdict(text);
  return hasReportStructure(text, kind) && Boolean(verdict && ['PASS', 'PASS WITH WARNINGS'].includes(verdict)) && !hasBlockingFinding(text);
}
export function hasBlockingFinding(text) {
  const findings = sectionBody(text, 'Findings');
  if (!findings) return false;
  let tableHeaders = [];
  for (const line of findings.split(/\r?\n/)) {
    if (/^\s*\|/.test(line)) {
      const cells = tableCells(line);
      if (cells.some((cell) => /^severity$/i.test(cell))) tableHeaders = cells.map((cell) => cell.toLowerCase());
      const severityIndex = tableHeaders.findIndex((cell) => cell === 'severity');
      const statusIndex = tableHeaders.findIndex((cell) => /^(status|state|disposition)$/i.test(cell));
      const severityCell = severityIndex >= 0 ? cells[severityIndex] : cells.find((cell) => blockingSeverity(cell));
      if (blockingSeverity(severityCell) && !resolvedStatus(statusIndex >= 0 ? cells[statusIndex] : '')) return true;
      continue;
    }
    if (/^\s*#{1,6}\s+/.test(line)) continue;
    if (explicitlyNoBlocking(line)) continue;
    if (/^\s*[-*+]\s+/.test(line) && blockingSeverity(line) && !resolvedStatus(line)) return true;
    if (blockingSeverity(line) && !resolvedStatus(line)) return true;
  }
  return false;
}
function phasePreconditions(target, root) {
  const exists = (relative) => fs.existsSync(path.join(root, relative));
  const specs = path.join(root, 'specs');
  const hasSpecs = fs.existsSync(specs) && fs.readdirSync(specs, { withFileTypes: true }).some((entry) => entry.isDirectory() && fs.existsSync(path.join(specs, entry.name, 'spec.md')));
  return ({ explore: () => true, propose: () => exists('exploration.md'), spec: () => exists('proposal.md'), design: () => exists('proposal.md'), tasks: () => exists('proposal.md') && exists('design.md') && hasSpecs, apply: () => exists('tasks.md'), verify: () => exists('tasks.md') && exists('apply-progress.md'), qa: () => exists('verify-report.md'), archive: () => exists('verify-report.md') && exists('qa-report.md') }[target] || (() => true))();
}
function reportExceptionAllowed(root) {
  const policy = path.resolve(root, '..', '..', 'config.yaml');
  if (!fs.existsSync(policy)) return false;
  const config = fs.readFileSync(policy, 'utf8');
  const qa = fs.readFileSync(path.join(root, 'qa-report.md'), 'utf8');
  return hasReportStructure(qa, 'qa') && extractVerdict(qa) === 'NOT TESTED' && !hasBlockingFinding(qa)
    && /allow_non_runtime_exception:\s*true/.test(config)
    && /(?:exception_scope|scope):\s*(?:documentation|configuration)|(?:documentation|configuration)[^\n]*(?:exception|only)|(?:exception|only)[^\n]*(?:documentation|configuration)/i.test(qa)
    && /fallback|warning|exception/i.test(qa);
}
function hasReportStructure(text, kind) {
  const required = kind === 'qa'
    ? [['identity'], ['sources of truth', 'source artifacts', 'sources'], ['target and environment'], ['capability inventory', 'capabilities'], ['scenario matrix', 'scenarios'], ['untested scope'], ['findings'], ['verdict'], ['rationale'], ['limitations']]
    : [['identity'], ['completeness'], ['build, syntax, and runtime evidence', 'build, test, coverage, and smoke evidence', 'build and test evidence', 'runtime evidence'], ['spec compliance matrix', 'compliance matrix'], ['correctness assessment', 'correctness'], ['design coherence', 'design'], ['task completion and tdd audit', 'task completion'], ['findings', 'issues found'], ['verdict']];
  return required.every((aliases) => aliases.some((alias) => sectionHasContent(text, alias)));
}
function sectionHasContent(text, alias) {
  const wanted = normalizeHeading(alias);
  const headings = [...text.matchAll(/^(#{1,6})\s+(.+?)\s*$/gim)];
  const match = headings.find((entry) => {
    const heading = normalizeHeading(entry[2]);
    return heading === wanted || heading.startsWith(`${wanted} `);
  });
  if (!match) return false;
  const start = match.index + match[0].length;
  const next = headings.find((entry) => entry.index > match.index && entry[1].length <= match[1].length);
  const body = text.slice(start, next?.index ?? text.length);
  return body.split(/\r?\n/).some((line) => {
    const value = line.trim();
    return value && !value.startsWith('#') && !/^<!--.*-->$/.test(value);
  });
}
function sectionBody(text, heading) {
  const aliases = heading === 'Findings' ? ['findings', 'issues found'] : [heading];
  const headings = [...text.matchAll(/^(#{1,6})\s+(.+?)\s*$/gim)];
  const match = headings.find((entry) => aliases.some((alias) => normalizeHeading(entry[2]) === normalizeHeading(alias)));
  if (!match) return '';
  const level = match[1].length;
  const next = headings.find((entry) => entry.index > match.index && entry[1].length <= level);
  return text.slice(match.index + match[0].length, next?.index ?? text.length);
}
function tableCells(line) { return line.trim().replace(/^\||\|$/g, '').split('|').map((cell) => cell.trim()); }
function blockingSeverity(value = '') { return /\b(?:CRITICAL|P0|P1)\b/i.test(value); }
function explicitlyNoBlocking(value = '') { return /^\s*(?:[-*+]\s*)?no\s+findings?\b/i.test(value) || /\b(?:no|none|without)\b[^\n]*\b(?:unresolved|open|blocking)\b/i.test(value); }
function resolvedStatus(value = '') {
  if (/\b(?:not|un)\s+(?:resolved|closed|ignored)\b|\b(?:open|active|pending|unknown|ambiguous|reopened)\b/i.test(value)) return false;
  return /\b(?:resolved|closed|ignored|resuelto|cerrado|ignorado)\b/i.test(value);
}
function normalizeHeading(value) { return value.toLowerCase().replace(/[:\-–—]/g, ' ').replace(/\s+/g, ' ').trim(); }
function extractVerdict(text) {
  const match = text.match(/(?:^|\n)\s*(?:[-+]\s*)?(?:#{1,6}\s*)?(?:\*\*)?(?:Final\s+)?Verdict(?:\*\*)?\s*[:\-]?\s*(?:\n\s*)?(?:\*\*|`)?(PASS WITH WARNINGS|PASS|FAIL|BLOCKED|NOT TESTED)(?:\*\*|`)?\b/i);
  return match?.[1]?.toUpperCase();
}
function reject(reason) { return { accepted: false, idempotent: false, reason }; }
function parseScalar(value) {
  if (value.startsWith('[') && value.endsWith(']')) return value.slice(1, -1).split(',').map((item) => item.trim()).filter(Boolean);
  return value.replace(/^['"]|['"]$/g, '');
}
function formatScalar(value) {
  if (Array.isArray(value)) return `[${value.join(', ')}]`;
  return String(value);
}
