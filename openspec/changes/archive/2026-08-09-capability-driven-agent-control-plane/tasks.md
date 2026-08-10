# Tasks: Capability-Driven Agent Control Plane

## Review Workload Forecast

- Estimated changed lines: 700–1,000 total; 120–220/slice
- Suggested split: Slice 1 → capsules → queue → adapters → roles/waivers → distribution

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: sequential local slices; PR split deferred
400-line budget risk: High

## Slice guard (mandatory; no Git baseline)

Agent MUST run this per slice. Before mutation, copy explicit tracked/untracked `SLICE_PATHS` to
`pre`; this snapshot—not `HEAD` or a commit—is the baseline. Exclude `.codegraph/`, prior-change,
and unrelated paths. Compare after RED/before GREEN and after finalization; record commands,
paths, labels, output, and status in `openspec/changes/capability-driven-agent-control-plane/apply-progress.md`.

```sh
D="$(mktemp -d "${TMPDIR:-/tmp}/sdd-slice.XXXXXX")"
export SLICE_PATHS='["<explicit slice files/directories>"]'
export EXCLUDE_PATHS='[".codegraph","openspec/changes/deterministic-quality-runners-fsm","<other prior-change paths>"]'
cat >"$D/guard.mjs" <<'NODE'
import fs from "node:fs";import path from "node:path";import {spawnSync} from "node:child_process";
const [op,a,b]=process.argv.slice(2),root=process.cwd(),A=JSON.parse(process.env.SLICE_PATHS),X=JSON.parse(process.env.EXCLUDE_PATHS),rel=p=>path.relative(root,p).split(path.sep).join("/"),ok=p=>A.some(x=>p===x||p.startsWith(x+"/"))&&!X.some(x=>p===x||p.startsWith(x+"/"));
function list(p,o=[]){let s;try{s=fs.lstatSync(p)}catch{return o}const r=rel(p);if(s.isFile()&&ok(r))o.push(r);else if(s.isDirectory()&&ok(r))for(const e of fs.readdirSync(p))list(path.join(p,e),o);return o}
function snap(d){fs.mkdirSync(d,{recursive:true});for(const n of [...new Set(A.flatMap(x=>list(path.resolve(root,x))))]){const q=path.join(d,n);fs.mkdirSync(path.dirname(q),{recursive:true});fs.copyFileSync(path.join(root,n),q)}}
if(op==="snapshot"){snap(a);console.log(`snapshot=${a}`);process.exit(0)}snap(b);
const run=f=>spawnSync("git",["diff","--no-index",f,"--",a,b],{encoding:"utf8"}),n=run("--numstat"),s=run("--name-status");if([n,s].some(r=>r.error||r.status>1)){console.error("BLOCKED: snapshot comparison failed");process.exit(2)}
let changed=0,binary=false;for(const l of n.stdout.trim().split(/\r?\n/).filter(Boolean)){const [x,y]=l.split(/\s+/);if(x==="-"||y==="-")binary=true;else changed+=+x+ +y}console.log(`post=${b} changed=${binary?">400":changed}\n${s.stdout}`);if(binary||changed>400){console.error("BLOCKED: slice exceeds 400 changed lines");process.exit(1)}
NODE
node "$D/guard.mjs" snapshot "$D/pre"
# After RED, before GREEN:
node "$D/guard.mjs" compare "$D/pre" "$D/red"
# After GREEN/finalization:
node "$D/guard.mjs" compare "$D/pre" "$D/final"
```

Replace placeholders; remove `D` after evidence is recorded.

## Dependencies and Rollback

Order: Slice 1 → 2 → 3 → 4 → 5 → 6. Slice 1 uses runner/FSM; flags off; excludes prior files, queues, plugins, prompts. Rollback: disable consumer/remove artifacts; preserve runner v1, `state.yaml`, prior files. No commits/branches/PRs. Fixture-first RED → minimum → GREEN; no root runner/full-TDD claim.

## Phase 1: Slice 1 — Trust Boundary, Impact, Policy

- [x] 1.1 RED: add `scripts/fixtures/control-plane/` and `scripts/sdd-control-plane-smoke.sh`; cover Git/dirty/traversal, stale inputs, policies/modes, latest rejection, fallback, isolation.
- [x] 1.2 Add `scripts/sdd-runner-lib/git-impact.mjs`: validate base/head, sort impact, report dirty/unavailable scope, compute digest.
- [x] 1.3 Add `scripts/sdd-runner-lib/{evidence-boundary,stale}.mjs`; support envelope v2/v1, identity/impact, hashes, redaction, stale/path outcomes.
- [x] 1.4 Add `scripts/sdd-runner-lib/{policy,toolchain}.mjs`; implement policy/modes and pinned `openspec/quality-toolchain.lock` with latest/unpinned rejection.
- [x] 1.5 Add `scripts/sdd-runner-lib/metrics.mjs` contracts: CRAP, changed-functions, provider mutation, advisory DRY, optional acceptance; no mutators.
- [x] 1.6 Update `openspec/quality-runner.schema.json`, `quality-runner.json`, `config.yaml`; flags off and `opencode.json` unchanged. Run smokes, JSON parse, `node --check`.

## Phase 2: Slice 2 — State Capsules / Requests / Outcomes

- [x] 2.1 RED then add `scripts/sdd-runner-lib/{capsule,request,outcome}.mjs` with identity/state, refs, actions/outcomes, constraints, revision, idempotency; remediate required digest, authority, evidence, freshness, and provenance guards.
- [x] 2.2 Verify workers cannot write state/evidence/policy/lock; retain visible fallback; add recursive authority-key and realpath containment regressions.

## Phase 3: Slice 3 — Durable Queue / Event Log / Recovery

- [x] 3.1 RED then add `openspec/changes/{change}/handoffs/{outbox,inbox/{new,in_process,completed,failed}}/` with atomic claim/complete, priority, recovery.
- [x] 3.2 Add `openspec/changes/{change}/events.jsonl`; smoke duplicate claims, interruption, replay, state authority.

## Phase 4: Slice 4 — Capability Registry / Adapters

- [ ] 4.1 RED then add registry/adapters under `scripts/sdd-runner-lib/` for tests/lint/coverage/CRAP/mutation/DRY/acceptance/architecture with provider/version/semantics/scope/unavailable outcomes.
- [ ] 4.2 Verify changed-file versus finer scopes and language-specific metrics; no LLM-estimated gates.

## Phase 5: Slice 5 — Roles / Permissions / Prompts / Waivers

- [ ] 5.1 Update SDD prompts/skills and `commands/sdd-continue.md` for capsules and independent apply/verify/QA; verify permissions before runtime/plugin changes.
- [ ] 5.2 Add waiver fixtures requiring human identity, reason, scope, expiration; agents cannot emit/approve waivers.

## Phase 6: Slice 6 — Distribution / QA

- [ ] 6.1 Update `README.md` and `.agents/skill-registry.md`; verify source → dotfiles → Dotter → effective config without editing prior change.
- [ ] 6.2 Run source/distribution smokes and persist QA report; absent target/credentials/tooling is `NOT TESTED`/`BLOCKED`, never static-inspection PASS.
