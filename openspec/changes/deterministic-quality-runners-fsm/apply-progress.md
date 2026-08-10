# Apply Progress: deterministic-quality-runners-fsm

Status: partial — source implementation complete; distribution rollout blocked by stale consumer copies.

## Delivery
- Mode: openspec
- Strategy: sequential local slices; no commits, branches, or PRs created
- Final status: partial — unit 4.3 distribution rollout is blocked until the consumer pointer/Dotter materialization is updated outside this repository.
- Review guard: each unit checked with the exact `git diff --numstat` guard; unit 1 finished at 392 changed lines, units 2–4 remained below 400.
- TDD limitation: no root test runner exists. Fixture-first RED checks were added and observed where practical; GREEN evidence is from focused smoke/syntax execution. Strict test-first ordering for the FSM/report adapter scaffolding cannot be proven from this uncommitted worktree, so full RED→GREEN→REFACTOR compliance is not claimed.

## Completed Tasks
- [x] 1.1–1.3 Contract/config fixtures, `quality-runner/v1` schema, opt-in policy, and project-safe manifest loading.
- [x] 2.1–2.3 Standalone argv/shell runner, environment allowlist, process-group timeout, output/artifact limits, redaction, parser/threshold/exit classification, v1 envelopes, JSON and Markdown evidence.
- [x] 3.1–3.4 FSM fixtures, legacy constrained YAML state, legal transition checks, archive/verify/QA gates, revision/hash/idempotency checks, lock and atomic write helpers, and visible continue fallback.
- [x] 4.1–4.2 Verify/QA runner-evidence adapters, fallback/report fixtures, and documentation.
- [ ] 4.3 Source smoke passed; distribution smoke is blocked until dotfiles pointer/Dotter rollout.

## Files Changed
- `scripts/sdd-quality-runner.mjs`
- `scripts/sdd-quality-smoke.sh`
- `scripts/sdd-fsm.mjs`
- `scripts/sdd-fsm-smoke.sh`
- `scripts/sdd-runner-lib/{config,exec,result,redact,state,atomic}.mjs`
- `scripts/sdd-smoke.sh`, `scripts/fixtures/`
- `openspec/quality-runner.schema.json`, `openspec/quality-runner.json`, `openspec/config.yaml`
- `commands/sdd-continue.md`, `prompts/sdd/sdd-{verify,qa}.md`, `skills/sdd/sdd-{verify,qa}/SKILL.md`, `skills/sdd/_shared/openspec-convention.md`, `README.md`

## Verification Evidence
- `node --check scripts/*.mjs` and every `scripts/sdd-runner-lib/*.mjs`: passed.
- `bash scripts/sdd-smoke.sh`: passed; explicit manifests, missing capability, redaction, timeout, parser/exit failure, legacy state, and report fallback contracts exercised.
- `bash scripts/sdd-quality-smoke.sh`: passed; argv/shell, artifacts, env isolation, redaction, unavailable, timeout, parser, threshold, and skip statuses exercised. Separate Python fixture manifest was validated by contract loading; Python executable execution remains environment-dependent.
- `bash scripts/sdd-fsm-smoke.sh`: passed; parallel spec/design, idempotency, stale revision, concurrent writers, stale lock, and atomic transition checks exercised.
- Exact per-unit diff guards: unit 1 `392`, unit 2 `215`, unit 3 `208`, unit 4 `52` changed lines; all are within the 400-line limit.
- Quality runner focused runs: configured pass/shell, missing executable `UNAVAILABLE`, parser rejection `FAIL`, timeout `BLOCKED`; persisted fixture output was removed after checks.
- FSM focused run: illegal/archive transition rejected with machine-readable `missing_verify_report` outcome; stale/atomic/concurrency paths are implemented but not claimed as exhaustive stress evidence.
- Distribution paths: source submodule and effective `~/.config/opencode` do not yet contain the new files because dotfiles pointer/Dotter rollout is intentionally out of scope; no dotfiles files were changed. The requested distribution smoke command is therefore not runnable from those stale copies.
- No source-checkout absolute path is embedded in the scripts; project and manifest paths resolve relative to the supplied project or the script location.

## Deviations / Risks
- No OpenCode plugin or `opencode.json` wiring was added, per design.
- The constrained YAML parser intentionally preserves unknown key/value lines but is not a general YAML implementation.
- The schema is shipped as a contract document; dependency-free runtime validation is implemented by `config.mjs` rather than a JSON Schema package.
- The current checkout contains unrelated pre-existing user changes in archived OpenSpec/shared SDD files; they were not reverted or included in this change.

## Remediation: verify findings V-01 through V-04

- **Scope:** only the four confirmed critical defects from `verify-report.md`; no OpenCode, dotfiles, `.codegraph/`, or unrelated worktree files were changed.
- **Fixture-first RED evidence:** before production edits, focused assertions were added to `scripts/sdd-quality-smoke.sh` and `scripts/sdd-fsm-smoke.sh`. `evidence-path` failed because traversal escaped the run directory; `redaction-keys` failed because a sensitive parser key remained; `archive-minimum` accepted `Verdict: PASS`; `archive-findings` accepted an active `CRITICAL` table row. These are fixture/smoke checks, not a root test runner.
- **GREEN evidence:** after the minimal implementation, the four focused checks passed. `archive-resolved` also passed to confirm explicitly resolved blocking findings remain compatible.
- **Implementation:** evidence stems now stay inside the run directory and use deterministic hashing for unsafe IDs with collision ownership checks; recursive redaction transforms object keys deterministically while preserving JSON shape; archive gates require observable verify/QA report sections and allowed verdicts; blocking severity parsing handles table severity columns, bullets, and conservative ambiguous statuses.
- **TDD limitation:** this repository has no root test runner and `strict_tdd` is disabled. Fixture-first RED/GREEN evidence is recorded, but full RED→GREEN→REFACTOR compliance is not claimed.
