# Security-Audit Skill Integration Plan

> **For agentic workers:** Implement this plan task-by-task. Skills are auto-discovered
> by filesystem (`skills/**/SKILL.md`) — no registry update needed beyond README counts.

**Goal:** Merge Cloudflare's `security-audit-skill` unique value (orchestrator + 12 attack-classes +
schema-validated findings + zero-dep validators + Phase 5 independent verification) into the harness,
**preserving the 4 existing security skills untouched**.

**Architecture:**

- **New orchestrator skill** `skills/security/security-audit/SKILL.md` — chains the 4 existing
  skills (`threat-model` → `finding-discovery` → `triage-finding` → `fix-finding`), adds Phase 5
  (independent record verification) and Phase 6 (target-neutral reporting).
- **Attack-classes library** `skills/security/_shared/attack-classes/*.md` — 12 reference files,
  pure reference material, no skill frontmatter, used by hunters in Phase 2.
- **Validators** `skills/security/_shared/validators/{report-schema.json, validate-findings.cjs,
  validate-findings.test.cjs, validate-coverage-ledger.cjs, validate-coverage-ledger.test.cjs}` —
  zero-dep Node validators invoked by the orchestrator after Phase 4 and Phase 5.

**Conventions reconciled:**

- Path conventions: keep user's `_shared/scan-artifacts.md` (`<security_scans_dir>/<scan_id>/...`),
  place Cloudflare's `architecture.md`, `coverage-ledger.json`, `findings.json`, `run-metadata.json`
  inside that tree.
- Verdict naming: orchestrator emits **both** contracts — Cloudflare's `findings.json` (`confirmed`,
  `needs_validation`, `rejected`, validated by validator) AND user's `triage_result.json` via
  the existing `triage-finding` skill (when external findings are in scope).
- Phase mapping:
  | Phase | Existing harness | Cloudflare source |
  |---|---|---|
  | 1. Reconnaissance | `threat-model` | `RECONNAISSANCE.md` (adapted) |
  | 2. Coverage-led hunting | `finding-discovery` | `HUNTING.md` + `ATTACK-CLASSES.md` (adapted) |
  | 3. Candidate validation | `triage-finding` (for externals) | `VALIDATION-AND-REPORTING.md` Phase 3 (adapted) |
  | 4. Structured output | **NEW** (orchestrator emits `findings.json`) | `VALIDATION-AND-REPORTING.md` Phase 4 |
  | 5. Independent verification | **NEW** (orchestrator dispatches fresh verifier) | `VALIDATION-AND-REPORTING.md` Phase 5 |
  | 6. Target-neutral reporting | **NEW** (orchestrator emits REPORT.md) | `VALIDATION-AND-REPORTING.md` Phase 6 |

**Tech Stack:** Markdown (skills/references), Node.js CJS (validators, run via `node`).
Zero new runtime dependencies.

---

## File structure (deltas only)

**Create (18 files):**

```
skills/security/
├── security-audit/
│   └── SKILL.md                                            ← orchestrator
└── _shared/
    ├── attack-classes/                                     ← 12 files
    │   ├── ATTACK-CLASSES.md
    │   ├── AI-AND-LLM.md
    │   ├── CLIENT-SIDE.md
    │   ├── CLOUD-AND-DEPLOYMENT.md
    │   ├── DATA-ISOLATION-AND-LIFECYCLE.md
    │   ├── DESKTOP-MOBILE-AND-LOCAL-IPC.md
    │   ├── MEMORY-SAFETY-AND-BINARY.md
    │   ├── PROTOCOLS-RPC-AND-MESSAGING.md
    │   ├── RESOURCE-EXHAUSTION-AND-AVAILABILITY.md
    │   ├── SUPPLY-CHAIN-AND-RELEASE.md
    │   ├── VALIDATION-AND-REPORTING.md                     ← phase 3-6 detail (reference)
    │   └── WEB-PROTOCOL-AND-AUTH.md
    └── validators/
        ├── report-schema.json
        ├── validate-findings.cjs
        ├── validate-findings.test.cjs
        ├── validate-coverage-ledger.cjs
        └── validate-coverage-ledger.test.cjs
```

**Modify (1 file):**

- `README.md` — update `security/` row in the Skills table (count 4→5; add attack-classes
  reference; add orchestrator row).

**Do NOT modify:**

- `skills/security/threat-model/`
- `skills/security/finding-discovery/`
- `skills/security/triage-finding/`
- `skills/security/fix-finding/`
- `skills/security/_shared/scan-artifacts.md`
- `skills/security/_shared/shared-hard-rules.md`

---

## Task 1: Add the orchestrator skill `skills/security/security-audit/SKILL.md`

**Files:**
- Create: `skills/security/security-audit/SKILL.md`

- [ ] **Step 1.1:** Create the directory.

```bash
mkdir -p skills/security/security-audit
```

- [ ] **Step 1.2:** Write `skills/security/security-audit/SKILL.md` with the following frontmatter
  (matches user's existing skill format):

```yaml
---
name: security-audit
description: >
  Orchestrate a multi-phase security audit of a codebase. Chains the existing
  security skills (threat-model → finding-discovery → triage-finding → fix-finding)
  and adds structured-output, independent-verification, and target-neutral
  reporting phases. Use when the user asks to audit or pen-test a target repo,
  requests a full/comprehensive/end-to-end security review, or asks for report
  artifacts. For focused questions or single-finding work, prefer the individual
  skills directly — do not invoke the orchestrator.
license: MIT
---
```

Then write the body with these sections (in this order):

1. **Objective** — one paragraph: orchestrate a 6-phase audit; produce `findings.json`,
   `REPORT.md`, `FINDINGS-DETAIL.md`, `NEEDS-VALIDATION.md` for confirmed/needs_validation/
   rejected findings respectively.

2. **Operating modes** — guidance vs full audit (mirror Cloudflare's structure verbatim).

3. **Inputs** — `target` (absolute repo root), `scope_paths?`, `profile?` (one of
   `quick`/`standard`/`deep`, default `standard`), `budget?`, `output_dir?`
   (default `~/security-audit-skill/<repo-name>/run-<N>`), `prior_runs?` (paths to
   prior `findings.json`/`coverage-ledger.json`).

4. **Path conventions** — point at `_shared/scan-artifacts.md` as the source of truth.
   Explicit override map:
   - `architecture.md`           → `<context_dir>/architecture.md`
   - `coverage-ledger.json`       → `<coverage_dir>/coverage_ledger.json`
   - `findings.json`              → `<findings_dir>/findings.json`
   - `run-metadata.json`          → `<scan_dir>/run-metadata.json`
   - `REPORT.md`                  → `<scan_dir>/REPORT.md`
   - `FINDINGS-DETAIL.md`         → `<scan_dir>/FINDINGS-DETAIL.md`
   - `NEEDS-VALIDATION.md`        → `<scan_dir>/NEEDS-VALIDATION.md`
   - Agents use `<scan_dir>/agents/<agent-id>/{scratch,artifacts}/` instead of Cloudflare's
     `<output_dir>/agents/<agent-id>/`.

5. **Workflow (6 phases)** — each phase delegates to a specific existing skill when one
   covers it, otherwise the orchestrator runs the phase itself.

   **Phase 1 — Reconnaissance:** delegate to `$threat-model` with `<context_dir>/threat_model.md`
   as the destination. Also produce `<context_dir>/architecture.md` mapping trust boundaries,
   entry surfaces, sinks, local execution visibility, and prior evidence.

   **Phase 2 — Coverage-led hunting:** delegate to `$finding-discovery` using the threat model
   from Phase 1 as input. Hunters consult `_shared/attack-classes/` for class-specific guidance.
   Each hunter writes its candidates to its own `<scan_dir>/agents/<agent-id>/scratch/candidates.jsonl`.
   Parent merges into `<findings_dir>/raw_candidates.jsonl` per `_shared/scan-artifacts.md`.

   **Phase 3 — Candidate validation:** for each unique fingerprint in the raw candidates,
   dispatch a fresh sub-agent (the harness's `security-engineer` team specialist, or a
   general-purpose worker) to attempt refutation. Verifiers never read hunter scratch.
   Outputs land in `<findings_dir>/<candidate_id>/validation_report.md`.

   **Phase 4 — Structured output:** write all final records to `<findings_dir>/findings.json`.
   Validate it:
   ```bash
   node skills/security/_shared/validators/validate-findings.cjs \
       skills/security/_shared/validators/report-schema.json \
       <findings_dir>/findings.json
   ```
   Exit non-zero → fix schema violations, do not proceed.
   Validate the coverage claim:
   ```bash
   node skills/security/_shared/validators/validate-coverage-ledger.cjs \
       <coverage_dir>/coverage_ledger.json
   ```

   **Phase 5 — Independent record verification:** for each `confirmed` record, dispatch a
   fresh verifier to re-confirm the `trace`, `evidence`, and `execution.observed_result`
   against current source. Material changes to a finding require another independent
   verifier pass. Re-run `validate-findings.cjs` after every replacement.

   **Phase 6 — Target-neutral reporting:** derive `REPORT.md` (summary + per-finding
   status + coverage statement), `FINDINGS-DETAIL.md` (full confirmed findings), and
   `NEEDS-VALIDATION.md` (blocked candidates + safe validation plans). All three
   derived from `<findings_dir>/findings.json` + `<coverage_dir>/coverage_ledger.json`,
   never from prose alone.

6. **Universal execution safety** — adapted from Cloudflare's SKILL.md §"Universal execution
   safety": target-controlled processes only inside an OS-enforced sandbox; no external
   network; dummy principals and fixtures; never probe deployed endpoints. If controls
   cannot be enforced, keep the lead as `needs_validation` with the exact missing sandbox
   capability.

7. **Run profiles and scope** — quick / standard / deep / scoped, mirrored from Cloudflare
   §"Run profiles and scope" with one change: budget gate uses **agent invocations** as
   the cost unit (not "research"/"general" — those are Cloudflare-platform-specific).

8. **Core principles** — same five as Cloudflare (boundary+result, bounded local evidence,
   source visibility, severity discipline, smallest effective source fix). Same wording.

9. **Anti-patterns** — same 10 as Cloudflare SKILL.md §"Anti-patterns".

10. **Output contract** — return the audit-log entry, all artifact paths, schema-validation
    exit codes, run_status, and any incomplete_reason. Mirror Cloudflare's "Do not end the
    run before one of exactly two terminal states" rule.

11. **Hard rules** — read `_shared/shared-hard-rules.md` first. Add: "never run validators
    on un-mutated data without writing the JSON file the orchestrator owns."

- [ ] **Step 1.3:** Verify frontmatter parses with the user's existing format:
```bash
python3 -c "
import yaml, sys
with open('skills/security/security-audit/SKILL.md') as f:
    fm = f.read().split('---')[1]
data = yaml.safe_load(fm)
assert data['name'] == 'security-audit'
assert data['license'] == 'MIT'
print('frontmatter OK')
"
```
Expected: `frontmatter OK`

---

## Task 2: Add the attack-classes library to `_shared/`

**Files:**
- Create: `skills/security/_shared/attack-classes/` (12 markdown files)

- [ ] **Step 2.1:** Create the directory.
```bash
mkdir -p skills/security/_shared/attack-classes
```

- [ ] **Step 2.2:** Copy all 12 attack-class files from the cloned upstream
(`/tmp/security-audit-skill/skills/security-audit/`) into the new directory.

```bash
for f in ATTACK-CLASSES.md AI-AND-LLM.md CLIENT-SIDE.md CLOUD-AND-DEPLOYMENT.md \
         DATA-ISOLATION-AND-LIFECYCLE.md DESKTOP-MOBILE-AND-LOCAL-IPC.md \
         MEMORY-SAFETY-AND-BINARY.md PROTOCOLS-RPC-AND-MESSAGING.md \
         RESOURCE-EXHAUSTION-AND-AVAILABILITY.md SUPPLY-CHAIN-AND-RELEASE.md \
         VALIDATION-AND-REPORTING.md WEB-PROTOCOL-AND-AUTH.md; do
  cp /tmp/security-audit-skill/skills/security-audit/$f \
     skills/security/_shared/attack-classes/$f
done
```

These are reference documents, not skills (no `SKILL.md` frontmatter). Auto-discovery
does not pick them up — they're loaded explicitly by the orchestrator / `finding-discovery`
when a phase-2 hunter needs them.

- [ ] **Step 2.3:** Verify all 12 files are present and non-empty:
```bash
ls -l skills/security/_shared/attack-classes/ | awk '$5 > 0 {print $NF, $5}' | sort
```
Expected: 12 lines, each > 5 KB (ATTACK-CLASSES is ~16 KB; VALIDATION-AND-REPORTING ~18 KB).

- [ ] **Step 2.4:** Confirm they are **not** auto-discovered as skills (no frontmatter
at the top of any file):
```bash
for f in skills/security/_shared/attack-classes/*.md; do
  head -3 "$f" | grep -q '^---$' && echo "FAIL $f has frontmatter"
done
echo "done"
```
Expected: no `FAIL` lines.

---

## Task 3: Add the validators to `_shared/`

**Files:**
- Create: `skills/security/_shared/validators/` (5 files)

- [ ] **Step 3.1:** Create the directory.
```bash
mkdir -p skills/security/_shared/validators
```

- [ ] **Step 3.2:** Copy validators + schema + tests from upstream.
```bash
for f in report-schema.json validate-findings.cjs validate-findings.test.cjs \
         validate-coverage-ledger.cjs validate-coverage-ledger.test.cjs; do
  cp /tmp/security-audit-skill/skills/security-audit/$f \
     skills/security/_shared/validators/$f
done
```

- [ ] **Step 3.3:** Confirm scripts are executable (upstream ships them with `+x`).
```bash
chmod +x skills/security/_shared/validators/validate-findings.cjs \
         skills/security/_shared/validators/validate-coverage-ledger.cjs
ls -l skills/security/_shared/validators/
```

- [ ] **Step 3.4:** Run the validator self-tests to confirm they pass on this Node.
```bash
node skills/security/_shared/validators/validate-findings.test.cjs
node skills/security/_shared/validators/validate-coverage-ledger.test.cjs
```
Expected: each prints `OK` (or equivalent zero-exit summary) — both upstream test runners
exit non-zero on failure.

- [ ] **Step 3.5:** Smoke-test the validators against an empty findings file:
```bash
echo '[]' > /tmp/empty-findings.json
node skills/security/_shared/validators/validate-findings.cjs \
    skills/security/_shared/validators/report-schema.json \
    /tmp/empty-findings.json
echo "exit=$?"
```
Expected: exit 0.

---

## Task 4: Update README.md — Skills table

**Files:**
- Modify: `README.md` lines ~141-145 (the `security/` row in the Skills table)

- [ ] **Step 4.1:** Update the `security/` row in the Skills table to reflect the new layout.
Find the current line:
```
| `security/` | 4 | Threat model, finding discovery/triage/fix |
```

Replace with:
```
| `security/` | 5 (+12 attack classes) | Orchestrator + threat model, finding discovery/triage/fix; attack-classes library in `_shared/` |
```

- [ ] **Step 4.2:** Update the header count `## Skills (211)` to `## Skills (212)`.
Find: `## Skills (211)`
Replace: `## Skills (212)`

- [ ] **Step 4.3:** Update the introductory line about skill count if present:
Find: `Auto-discovered from `skills/**/SKILL.md` across 19 groups. Counts drift as the ecosystem grows —`
Replace: same text — leave unchanged (the count of 19 groups is still correct; only the
top-level count changed).

- [ ] **Step 4.4:** Verify with a quick visual diff:
```bash
git diff README.md
```
Expected: 2 changed lines (table row + count).

---

## Task 5: Verify the integration

**Files:**
- Modify: nothing (read-only checks)

- [ ] **Step 5.1:** Confirm `check-refs.mjs` still passes (no new `{file:}` refs added):
```bash
npm run validate
```
Expected: no `FAIL` lines.

- [ ] **Step 5.2:** Confirm `SKILL.md` frontmatter is parsable for every new file:
```bash
for f in skills/security/security-audit/SKILL.md \
         skills/security/threat-model/SKILL.md \
         skills/security/finding-discovery/SKILL.md \
         skills/security/triage-finding/SKILL.md \
         skills/security/fix-finding/SKILL.md; do
  python3 -c "
import yaml
with open('$f') as fp:
    fm = fp.read().split('---')[1]
d = yaml.safe_load(fm)
print('$f ->', d['name'])
"
done
```
Expected: all 5 names print without error.

- [ ] **Step 5.3:** Confirm attack-classes do **not** have frontmatter (must not be picked
up as skills):
```bash
grep -l '^---$' skills/security/_shared/attack-classes/*.md
```
Expected: no output (no file has YAML frontmatter delimiters).

- [ ] **Step 5.4:** Run the bundle generator to confirm no broken refs in the recommended preset:
```bash
node scripts/generate-bundle.mjs list --preset recommended | head -40
```
Expected: command exits 0 and prints the expected bundle list (no errors about missing files).

- [ ] **Step 5.5:** Render the bundle and run check-refs in bundle mode:
```bash
npm run deploy -- --preset recommended --output dist/opencode 2>&1 | tail -20
node scripts/check-refs.mjs --root dist/opencode
```
Expected: deploy exits 0; check-refs exits 0 (all `{file:` paths in the rendered bundle resolve).

- [ ] **Step 5.6:** Final sanity grep — new orchestrator references the validators correctly:
```bash
grep -c 'validate-findings.cjs\|validate-coverage-ledger.cjs\|attack-classes/' \
    skills/security/security-audit/SKILL.md
```
Expected: ≥ 3 matches (orchestrator must reference all three new resources).

---

## Self-review

**Spec coverage:**
- [x] Orchestrator chains the 4 existing skills — Task 1
- [x] Phase 5 (independent verification) added — Task 1
- [x] Phase 6 (target-neutral reporting) added — Task 1
- [x] Attack-classes library added — Task 2
- [x] Validators + schema added — Task 3
- [x] README updated — Task 4
- [x] Verification — Task 5

**Path reconciliation:**
- [x] User's `_shared/scan-artifacts.md` remains the source of truth — Task 1 §"Path conventions"
- [x] Cloudflare's `architecture.md`, `findings.json`, `coverage-ledger.json`, `run-metadata.json`
  are placed inside the user's `<scan_dir>/` tree with explicit override map

**Verdict naming:**
- [x] `findings.json` uses Cloudflare's `confirmed | needs_validation | rejected` (matches schema)
- [x] `triage_result.json` continues to use user's `confirmed | not_actionable | needs_review` (existing skill untouched)

**No placeholders:** no TBD/TODO/fill-in steps. Each task has exact file paths, exact
commands, expected outputs.

**Type consistency:** orchestrator references `_shared/validators/{validate-findings.cjs,
validate-coverage-ledger.cjs, report-schema.json}` and `_shared/attack-classes/`. Validators
exposed by validator follow the upstream contract. No method-name mismatches across tasks.

---

## Rollback

If any verification step fails:

```bash
git checkout -- README.md
rm -rf skills/security/security-audit
rm -rf skills/security/_shared/attack-classes
rm -rf skills/security/_shared/validators
```

The 4 existing skills and `_shared/{scan-artifacts.md,shared-hard-rules.md}` remain untouched
by this plan, so rollback leaves the harness in its original state.