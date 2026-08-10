#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { atomicWrite, withLock } from './sdd-runner-lib/atomic.mjs';
import { resolveInside } from './sdd-runner-lib/config.mjs';
import { evaluateTransition, nextPhase, parseState, serializeState } from './sdd-runner-lib/state.mjs';

const args = parseArgs(process.argv.slice(2));
const projectRoot = path.resolve(args.project);
const changeRoot = resolveInside(projectRoot, path.join('openspec', 'changes', args.change));
const statePath = path.join(changeRoot, 'state.yaml');
try {
  const policy = readPolicy(projectRoot);
  if (!policy.enabled) {
    console.log(JSON.stringify({ version: 'sdd-fsm/v1', change: args.change, accepted: false, status: 'fallback', reason: 'fsm_disabled' }, null, 2));
    process.exit(3);
  }
  if (args.action === 'inspect') {
    const state = parseState(fs.readFileSync(statePath, 'utf8'));
    console.log(JSON.stringify({ version: 'sdd-fsm/v1', change: args.change, accepted: true, current_phase: state.current_phase, completed: state.completed, next: nextPhase(state), revision: state.revision || 0 }, null, 2));
    process.exit(0);
  }
  const locked = withLock(path.join(changeRoot, '.fsm.lock'), () => {
    const state = parseState(fs.readFileSync(statePath, 'utf8'));
    const outcome = evaluateTransition({ state, target: args.target, changeRoot, projectRoot, expectedRevision: args.expectedRevision, expectedHash: args.expectedHash, idempotencyKey: args.idempotencyKey, remediationReason: args.remediationReason });
    if (outcome.accepted && !outcome.idempotent) atomicWrite(statePath, serializeState(outcome.state));
    return { state, outcome };
  }, { ttlMs: policy.lockTtlMs, force: args.force });
  console.log(JSON.stringify({ version: 'sdd-fsm/v1', change: args.change, transition: `${locked.state.current_phase}->${args.target}`, ...locked.outcome }, null, 2));
  process.exit(locked.outcome.accepted ? 0 : 1);
} catch (error) { console.log(JSON.stringify({ version: 'sdd-fsm/v1', accepted: false, reason: error instanceof Error ? error.message : String(error) }, null, 2)); process.exit(2); }

function parseArgs(argv) {
  const result = { action: 'transition', project: process.cwd(), change: '', target: '', expectedRevision: undefined, expectedHash: undefined, idempotencyKey: '', remediationReason: '', force: false };
  for (let i = 0; i < argv.length; i += 1) { const item = argv[i]; if (item === 'transition' || item === 'inspect') { result.action = item; continue; } if (item === '--project') result.project = argv[++i]; else if (item === '--change') result.change = argv[++i]; else if (item === '--to') result.target = argv[++i]; else if (item === '--expected-revision') result.expectedRevision = argv[++i]; else if (item === '--expected-hash') result.expectedHash = argv[++i]; else if (item === '--idempotency-key') result.idempotencyKey = argv[++i]; else if (item === '--reason') result.remediationReason = argv[++i]; else if (item === '--force') result.force = true; else throw new Error(`unknown_argument:${item}`); }
  if (!result.change || (result.action === 'transition' && (!result.target || !result.idempotencyKey || (result.expectedRevision === undefined && result.expectedHash === undefined)))) throw new Error(result.action === 'inspect' ? 'change_required' : 'change_target_idempotency_and_revision_required');
  return result;
}

function readPolicy(projectRoot) {
  const file = path.join(projectRoot, 'openspec', 'config.yaml');
  if (!fs.existsSync(file)) return { enabled: false, lockTtlMs: 300000 };
  const text = fs.readFileSync(file, 'utf8');
  const block = text.match(/^workflow_fsm:\s*\n([\s\S]*?)(?=^\S|$)/m)?.[1] || '';
  const enabled = /^\s+enabled:\s*true\s*$/m.test(block);
  const ttl = block.match(/^\s+lock_ttl_ms:\s*(\d+)\s*$/m)?.[1];
  return { enabled, lockTtlMs: ttl ? Number(ttl) : 300000 };
}
