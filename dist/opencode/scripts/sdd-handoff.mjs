#!/usr/bin/env node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { resolveInside } from './sdd-runner-lib/config.mjs';

const ACTIONS = new Set(['enqueue', 'claim', 'complete', 'fail', 'list', 'inspect', 'recover', 'replay']);
const EVENT_TYPES = new Set(['HANDOFF_ENQUEUED', 'HANDOFF_CLAIMED', 'HANDOFF_COMPLETED', 'HANDOFF_FAILED', 'HANDOFF_RECOVERED', 'HANDOFF_REPLAYED']);
const BUCKET_STATES = { new: ['new', 'verify_ready', 'qa_ready'], in_process: ['in_process'], completed: ['completed'], failed: ['failed', 'claim_failed'] };
const sleep = (ms) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);

try {
  const options = parseArgs(process.argv.slice(2));
  const context = createContext(options);
  const readOnly = ['list', 'inspect'].includes(options.action);
  const result = readOnly ? execute(context) : withChangeLock(context, () => execute(context));
  console.log(JSON.stringify({ version: 'sdd-handoff/v1', change: options.change, accepted: result.accepted !== false, ...result }, null, 2));
  if (result.accepted === false) process.exitCode = 1;
} catch (error) {
  console.log(JSON.stringify({ version: 'sdd-handoff/v1', accepted: false, reason: error instanceof Error ? error.message : String(error) }, null, 2));
  process.exitCode = 2;
}

function parseArgs(argv) {
  const value = { action: argv[0], project: process.cwd(), change: '', force: false, linkFsm: false, keepArchival: false, events: false, lockTtlMs: 300000, lockWaitMs: 5000 };
  if (!ACTIONS.has(value.action)) throw new Error('invalid_action');
  const booleans = { '--force': 'force', '--link-fsm': 'linkFsm', '--keep-archival': 'keepArchival', '--events': 'events' };
  const names = { '--project': 'project', '--change': 'change', '--task': 'task', '--handoff': 'handoff', '--role': 'role', '--capability': 'capability', '--phase': 'phase', '--state': 'state', '--payload': 'payload', '--idempotency-key': 'idempotencyKey', '--priority': 'priority', '--revision': 'revision', '--expected-revision': 'expectedRevision', '--reason': 'reason', '--ttl-ms': 'ttlMs', '--lock-ttl-ms': 'lockTtlMs', '--lock-wait-ms': 'lockWaitMs', '--actor-provenance': 'actorProvenance' };
  for (let index = 1; index < argv.length; index += 1) { const item = argv[index]; if (booleans[item]) value[booleans[item]] = true; else if (names[item]) { if (argv[index + 1] === undefined) throw new Error(`value_required:${item}`); value[names[item]] = argv[++index]; } else throw new Error(`unknown_argument:${item}`); }
  if (!value.change) throw new Error('change_required');
  for (const [key, label] of [['change', 'change'], ['task', 'task'], ['handoff', 'handoff']]) if (value[key] !== undefined) validateId(value[key], label);
  for (const key of ['priority', 'revision', 'expectedRevision', 'ttlMs', 'lockTtlMs', 'lockWaitMs']) if (value[key] !== undefined) { value[key] = Number(value[key]); if (!Number.isInteger(value[key]) || value[key] < 0) throw new Error(`invalid_${key}`); }
  return value;
}

function createContext(options) {
  const projectRoot = fs.realpathSync(path.resolve(options.project));
  const changeRoot = resolveInside(projectRoot, path.join('openspec', 'changes', options.change));
  if (!fs.existsSync(changeRoot) || !fs.statSync(changeRoot).isDirectory()) throw new Error('change_not_found');
  const root = path.join(changeRoot, 'handoffs'), inbox = path.join(root, 'inbox');
  const dirs = { outbox: path.join(root, 'outbox'), new: path.join(inbox, 'new'), in_process: path.join(inbox, 'in_process'), completed: path.join(inbox, 'completed'), failed: path.join(inbox, 'failed'), locks: path.join(root, '.locks') };
  for (const directory of Object.values(dirs)) fs.mkdirSync(directory, { recursive: true });
  const eventsPath = path.join(changeRoot, 'events.jsonl'); if (!fs.existsSync(eventsPath)) { const descriptor = fs.openSync(eventsPath, 'wx', 0o600); fs.closeSync(descriptor); }
  return { options, projectRoot, changeRoot, dirs, eventsPath };
}

function execute(context) {
  const handlers = { enqueue, claim, complete, fail: failHandoff, list, inspect, recover, replay };
  return handlers[context.options.action](context);
}

function enqueue(context) {
  const { options, dirs } = context; requireFields(options, ['task', 'handoff', 'role', 'capability', 'phase', 'state', 'idempotencyKey', 'priority', 'revision']);
  if (!BUCKET_STATES.new.includes(options.state)) throw new Error('invalid_enqueue_state');
  let payload; try { payload = JSON.parse(options.payload ?? '{}'); } catch { throw new Error('invalid_payload_json'); }
  return withIdLock(context, options.handoff, () => {
    if (findHandoff(context, options.handoff).length) throw new Error('duplicate_handoff_id');
    if (allHandoffs(context).some(({ handoff }) => handoff.idempotency_key === options.idempotencyKey)) throw new Error('duplicate_idempotency_key');
    const handoff = seal({ version: 'handoff/v1', change_id: options.change, task_id: options.task, handoff_id: options.handoff, role: options.role, capability: options.capability, phase: options.phase, state: options.state, payload, created_at: new Date().toISOString(), idempotency_key: options.idempotencyKey, priority: options.priority, revision: options.revision });
    const source = fileFor(dirs.outbox, options.handoff), destination = fileFor(dirs.new, options.handoff); writeExclusive(source, handoff); fs.renameSync(source, destination);
    appendEvent(context, 'HANDOFF_ENQUEUED', handoff, handoff.payload); return { handoff };
  });
}

function claim(context) {
  const { options } = context; requireFields(options, ['task', 'handoff', 'idempotencyKey', 'expectedRevision']);
  return withIdLock(context, options.handoff, () => {
    const item = requireHandoff(context, options.handoff, 'new', options);
    const active = allHandoffs(context).filter((entry) => entry.bucket === 'in_process' && entry.handoff.task_id === item.handoff.task_id);
    if (active.length) {
      if (!options.force || !Number.isInteger(options.ttlMs) || options.ttlMs < 1) throw new Error('task_already_in_process');
      if (active.some(({ handoff }) => Date.now() - Date.parse(handoff.dequeued_at) <= options.ttlMs)) throw new Error('task_already_in_process');
      for (const entry of active) recoverOne(context, entry, 'forced_claim_timeout');
    }
    if (options.linkFsm && ['verify_ready', 'qa_ready'].includes(item.handoff.state)) {
      const linked = linkFsm(context, item.handoff); if (!linked.ok) { const failed = transition(context, item, 'failed', { state: 'claim_failed', failed_at: new Date().toISOString(), reason: `fsm_link_failed:${linked.reason}` }); appendEvent(context, 'HANDOFF_FAILED', failed, { reason: failed.reason }); return { accepted: false, reason: 'fsm_link_failed', handoff: failed }; }
    }
    const handoff = transition(context, item, 'in_process', { state: 'in_process', dequeued_at: new Date().toISOString() }); appendEvent(context, 'HANDOFF_CLAIMED', handoff, {}); return { handoff };
  });
}

function complete(context) { return finish(context, 'completed', 'HANDOFF_COMPLETED', {}); }
function failHandoff(context) { if (!context.options.reason?.trim()) throw new Error('failure_reason_required'); return finish(context, 'failed', 'HANDOFF_FAILED', { reason: context.options.reason }); }
function finish(context, bucket, eventType, extra) {
  const { options } = context; requireFields(options, ['task', 'handoff', 'idempotencyKey', 'expectedRevision']);
  return withIdLock(context, options.handoff, () => { const item = requireHandoff(context, options.handoff, 'in_process', options); const field = bucket === 'completed' ? 'completed_at' : 'failed_at'; const handoff = transition(context, item, bucket, { state: bucket, [field]: new Date().toISOString(), ...extra }); appendEvent(context, eventType, handoff, extra); return { handoff }; });
}

function recover(context) {
  const { options } = context; if (!Number.isInteger(options.ttlMs) || options.ttlMs < 1) throw new Error('ttl_required'); validateChangeState(context); const recovered = [];
  for (const item of allHandoffs(context).filter((entry) => entry.bucket === 'in_process')) if (Date.now() - Date.parse(item.handoff.dequeued_at) > options.ttlMs) recovered.push(recoverOne(context, item, 'recovery_timeout'));
  return { recovered: recovered.length, handoffs: recovered };
}
function recoverOne(context, item, reason) { const handoff = transition(context, item, 'failed', { state: 'failed', failed_at: new Date().toISOString(), reason }); appendEvent(context, 'HANDOFF_RECOVERED', handoff, { reason }); return handoff; }

function replay(context) {
  const { options } = context; requireFields(options, ['task', 'handoff', 'idempotencyKey', 'expectedRevision']); if (!options.force) throw new Error('replay_force_required');
  return withIdLock(context, options.handoff, () => {
    const matches = findHandoff(context, options.handoff).filter((entry) => ['completed', 'failed'].includes(entry.bucket)); if (matches.length !== 1) throw new Error('replay_source_required'); const item = validateBinding(context, matches[0], options);
    if (!options.keepArchival) { appendEvent(context, 'HANDOFF_REPLAYED', item.handoff, { replayed: false, reason: 'keep_archival_required' }); return { accepted: false, reason: 'keep_archival_required', handoff: item.handoff }; }
    const archive = path.join(context.dirs[item.bucket], '.archive'); fs.mkdirSync(archive, { recursive: true }); writeExclusive(path.join(archive, `${options.handoff}.r${item.handoff.revision}.json`), item.handoff);
    const handoff = transition(context, item, 'new', { state: 'new', replayed_at: new Date().toISOString(), dequeued_at: undefined, completed_at: undefined, failed_at: undefined, reason: undefined }); appendEvent(context, 'HANDOFF_REPLAYED', handoff, { replayed: true, keep_archival: true }); return { handoff };
  });
}

function inspect(context) { const { options } = context; requireFields(options, ['task', 'handoff']); const matches = findHandoff(context, options.handoff); if (matches.length !== 1) throw new Error(matches.length ? 'duplicate_handoff_state' : 'handoff_not_found'); return { handoff: validateBinding(context, matches[0], options).handoff, queue: matches[0].bucket }; }
function list(context) { if (context.options.events) return { events: readEvents(context.eventsPath) }; const handoffs = allHandoffs(context).sort((a, b) => b.handoff.priority - a.handoff.priority || a.handoff.created_at.localeCompare(b.handoff.created_at) || a.handoff.handoff_id.localeCompare(b.handoff.handoff_id)); return { handoffs: handoffs.map(({ bucket, handoff }) => ({ queue: bucket, ...handoff })) }; }

function transition(context, item, target, changes) {
  const next = { ...item.handoff, ...changes, revision: item.handoff.revision + 1 }; for (const key of Object.keys(next)) if (next[key] === undefined) delete next[key]; const handoff = seal(next), destination = fileFor(context.dirs[target], handoff.handoff_id); if (fs.existsSync(destination)) throw new Error('destination_state_exists');
  const temp = `${item.file}.${process.pid}.${crypto.randomUUID()}.tmp`; writeExclusive(temp, handoff); fs.renameSync(temp, item.file); fs.renameSync(item.file, destination); return handoff;
}
function requireHandoff(context, id, bucket, options) { const matches = findHandoff(context, id); if (matches.length !== 1) throw new Error(matches.length ? 'duplicate_handoff_state' : 'handoff_not_found'); if (matches[0].bucket !== bucket) throw new Error(`state_mismatch:${bucket}`); return validateBinding(context, matches[0], options); }
function validateBinding(context, item, options) {
  const handoff = readHandoff(item.file); if (handoff.change_id !== options.change) throw new Error('change_id_mismatch'); if (path.basename(item.file) !== `${handoff.handoff_id}.json`) throw new Error('handoff_filename_mismatch'); if (options.task && handoff.task_id !== options.task) throw new Error('task_id_mismatch'); if (options.handoff && handoff.handoff_id !== options.handoff) throw new Error('handoff_id_mismatch');
  if (!BUCKET_STATES[item.bucket]?.includes(handoff.state)) throw new Error(`state_mismatch:${item.bucket}`); if (options.idempotencyKey && handoff.idempotency_key !== options.idempotencyKey) throw new Error('idempotency_key_mismatch'); if (options.expectedRevision !== undefined && handoff.revision !== options.expectedRevision) throw new Error('revision_mismatch'); return { ...item, handoff };
}
function allHandoffs(context) { return Object.keys(BUCKET_STATES).flatMap((bucket) => fs.readdirSync(context.dirs[bucket]).filter((name) => name.endsWith('.json')).map((name) => validateBinding(context, { bucket, file: path.join(context.dirs[bucket], name) }, { change: context.options.change }))); }
function findHandoff(context, id) { return ['outbox', ...Object.keys(BUCKET_STATES)].flatMap((bucket) => { const file = fileFor(context.dirs[bucket], id); return fs.existsSync(file) ? [{ bucket, file }] : []; }); }

function appendEvent(context, type, handoff, payload) {
  if (!EVENT_TYPES.has(type)) throw new Error('invalid_event_type'); const events = readEvents(context.eventsPath); const event = { seq: (events.at(-1)?.seq || 0) + 1, type, timestamp: new Date().toISOString(), change_id: handoff.change_id, task_id: handoff.task_id, handoff_id: handoff.handoff_id, role: handoff.role, capability: handoff.capability, revision: handoff.revision, payload_hash: digest(payload), actor_provenance: context.options.actorProvenance || { kind: 'sdd-handoff-helper', action: context.options.action, pid: process.pid, host: os.hostname() } }; fs.appendFileSync(context.eventsPath, `${JSON.stringify(event)}\n`, { encoding: 'utf8', flag: 'a' });
}
function readEvents(file) { const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/).filter(Boolean); const events = lines.map((line) => JSON.parse(line)).sort((a, b) => a.seq - b.seq); if (events.some((event, index) => event.seq !== index + 1)) throw new Error('event_sequence_invalid'); return events; }

function validateChangeState(context) { const file = path.join(context.changeRoot, 'state.yaml'); if (!fs.existsSync(file)) throw new Error('change_state_missing'); const change = fs.readFileSync(file, 'utf8').match(/^change:\s*([^\s]+)\s*$/m)?.[1]; if (change !== context.options.change) throw new Error('change_state_mismatch'); }
function linkFsm(context, handoff) {
  const target = handoff.state === 'verify_ready' ? 'verify' : 'qa', cli = path.join(context.projectRoot, 'scripts/sdd-fsm.mjs'); if (!fs.existsSync(cli)) return { ok: false, reason: 'fsm_missing' };
  const inspectResult = spawnSync(process.execPath, [cli, 'inspect', '--project', context.projectRoot, '--change', context.options.change], { encoding: 'utf8' }); let inspected; try { inspected = JSON.parse(inspectResult.stdout); } catch { return { ok: false, reason: 'fsm_inspect_invalid' }; } if (inspectResult.status !== 0 || !inspected.accepted) return { ok: false, reason: inspected.reason || 'fsm_not_ready' };
  const transitioned = spawnSync(process.execPath, [cli, 'transition', '--project', context.projectRoot, '--change', context.options.change, '--to', target, '--expected-revision', String(inspected.revision), '--idempotency-key', `handoff-${handoff.handoff_id}-${handoff.revision}`, '--reason', `handoff ${handoff.handoff_id}`], { encoding: 'utf8' }); let result; try { result = JSON.parse(transitioned.stdout); } catch { return { ok: false, reason: 'fsm_transition_invalid' }; } return { ok: transitioned.status === 0 && result.accepted, reason: result.reason || 'fsm_transition_rejected' };
}

function withChangeLock(context, callback) {
  const lock = path.join(context.changeRoot, '.handoff.lock'), deadline = Date.now() + context.options.lockWaitMs; let owner;
  for (;;) { try { fs.mkdirSync(lock); owner = { pid: process.pid, host: os.hostname(), time: Date.now() }; const descriptor = fs.openSync(path.join(lock, 'owner'), 'wx', 0o600); fs.writeFileSync(descriptor, JSON.stringify(owner)); fs.closeSync(descriptor); break; } catch (error) { if (error.code !== 'EEXIST') { if (fs.existsSync(lock) && owner) fs.rmSync(lock, { recursive: true, force: true }); throw error; } if (staleLock(lock, context.options.lockTtlMs, context.options.force)) { const abandoned = `${lock}.stale.${process.pid}.${crypto.randomUUID()}`; try { fs.renameSync(lock, abandoned); fs.rmSync(abandoned, { recursive: true, force: true }); continue; } catch (race) { if (race.code === 'ENOENT') continue; throw race; } } if (Date.now() >= deadline) throw new Error('lock_conflict'); sleep(10); } }
  try { return callback(); } finally { try { const current = JSON.parse(fs.readFileSync(path.join(lock, 'owner'), 'utf8')); if (current.pid === owner.pid && current.time === owner.time) fs.rmSync(lock, { recursive: true, force: true }); } catch {} }
}
function staleLock(lock, ttl, force) { if (force) return true; let owner = {}; try { owner = JSON.parse(fs.readFileSync(path.join(lock, 'owner'), 'utf8')); } catch {} const age = Date.now() - Number(owner.time || fs.statSync(lock).mtimeMs); if (age <= ttl) return false; if (owner.host === os.hostname() && Number.isInteger(Number(owner.pid))) { try { process.kill(Number(owner.pid), 0); return false; } catch {} } return true; }
function withIdLock(context, id, callback) { const file = path.join(context.dirs.locks, `${id}.lock`); let descriptor; try { descriptor = fs.openSync(file, 'wx', 0o600); fs.writeFileSync(descriptor, `${process.pid}\n`); return callback(); } catch (error) { if (error.code === 'EEXIST') throw new Error('handoff_lock_conflict'); throw error; } finally { if (descriptor !== undefined) fs.closeSync(descriptor); fs.rmSync(file, { force: true }); } }

function seal(value) { const result = { ...value }; delete result.handoff_digest; result.handoff_digest = digest(result); return result; }
function readHandoff(file) { let value; try { value = JSON.parse(fs.readFileSync(file, 'utf8')); } catch { throw new Error('handoff_json_invalid'); } requireFields(value, ['version', 'change_id', 'task_id', 'handoff_id', 'role', 'capability', 'phase', 'state', 'payload', 'created_at', 'idempotency_key', 'priority', 'revision', 'handoff_digest']); if (value.version !== 'handoff/v1') throw new Error('handoff_version_invalid'); for (const [key, label] of [['change_id', 'change'], ['task_id', 'task'], ['handoff_id', 'handoff']]) validateId(value[key], label); for (const key of ['role', 'capability', 'phase', 'state', 'idempotency_key']) if (typeof value[key] !== 'string' || !value[key].trim()) throw new Error(`invalid_${key}`); if (!Number.isFinite(Date.parse(value.created_at))) throw new Error('created_at_invalid'); if (!Number.isInteger(value.priority) || !Number.isInteger(value.revision) || value.revision < 0 || value.handoff_digest !== seal(value).handoff_digest) throw new Error('handoff_digest_invalid'); return value; }
function writeExclusive(file, value) { const descriptor = fs.openSync(file, 'wx', 0o600); try { fs.writeFileSync(descriptor, `${JSON.stringify(value)}\n`); fs.fsyncSync(descriptor); } finally { fs.closeSync(descriptor); } }
function fileFor(directory, id) { validateId(id, 'handoff'); return path.join(directory, `${id}.json`); }
function validateId(value, label) { if (typeof value !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/.test(value)) throw new Error(`invalid_${label}_id`); }
function requireFields(value, fields) { for (const field of fields) if (value[field] === undefined || value[field] === '') throw new Error(`${field}_required`); }
function digest(value) { return crypto.createHash('sha256').update(stable(value)).digest('hex'); }
function stable(value) { if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`; if (value && typeof value === 'object') return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stable(value[key])}`).join(',')}}`; return JSON.stringify(value); }
