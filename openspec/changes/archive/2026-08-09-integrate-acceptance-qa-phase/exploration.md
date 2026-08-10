## Exploration: integrate-acceptance-qa-phase

### Current State
The repository implements a filesystem-backed OpenSpec SDD pipeline for an OpenCode configuration project. Before this change, the documented phase graph was `init → explore → propose → [spec + design] → tasks → apply → verify → archive`; the configured phase agents and README described nine executors and did not include acceptance QA. The implementation now routes `apply → verify → qa → archive` with a dedicated tenth executor.

`apply` implements the planned tasks, `sdd-verify` performs technical/specification conformance checks and runtime test/build evidence when tooling exists, and `sdd-archive` merges delta specs and moves the completed change after verification. There is no separate acceptance/product behavior gate, no `sdd-qa` agent or command, and no `qa-report.md` artifact in the OpenSpec convention. The existing browser and QA skills are reusable capabilities, but they are standalone skills rather than a phase-level contract.

The desired lifecycle should distinguish two different questions:

- **Verify:** Does the implementation satisfy the written requirements, design, and task checklist?
- **Acceptance QA:** Does the resulting product behavior work from the user/operator perspective in the available runtime environment?

QA must be capability-driven. Depending on the target and environment, it may use Playwright, agent-browser, browser verification, full-story browser/API/data verification, accessibility checks, web-quality checks, or a manual QA session. If no suitable target or capability exists, the report must say `NOT TESTED` or `BLOCKED` with evidence and a reason; it must never manufacture a `PASS` from static inspection alone.

### Affected Areas
- `AGENTS.md` — owns the documented phase DAG, state recovery rules, quality gates, and the requirement that archive only follows a successful verification; these rules need the `verify → qa → archive` dependency and a two-report archive gate.
- `README.md` — lists the nine phase executors, commands, artifact layout, lifecycle, and quality gates; it will otherwise continue to advertise an incomplete pipeline.
- `opencode.json` — defines the configured agents and MCP capabilities; it currently has no dedicated `sdd-qa` executor, although Playwright and browser-related MCP servers are available.
- `commands/sdd-continue.md` and related SDD command files — continuation currently advances from `verify` directly to `archive` and must recognize `qa-report.md`/the QA phase.
- `prompts/sdd/sdd-apply.md` — should describe the handoff and acceptance evidence expected after implementation, without making apply responsible for product QA.
- `prompts/sdd/sdd-verify.md` — should remain the technical/spec conformance gate and explicitly hand off to QA rather than absorbing acceptance testing.
- `prompts/sdd/sdd-archive.md` — must retrieve and validate the QA report, reject unresolved critical/P0/P1 acceptance findings, and define behavior for `NOT TESTED`/`BLOCKED` outcomes.
- `skills/sdd/_shared/openspec-convention.md` — needs the `sdd-qa` executor and `qa-report.md` artifact paths plus retrieval rules.
- `skills/sdd/_shared/sdd-phase-common.md` — provides the phase envelope and persistence contract that a new QA phase must follow; its capability/size-gate interactions should remain consistent.
- `skills/sdd/sdd-qa/SKILL.md` and `prompts/sdd/sdd-qa.md` — new phase-specific executor contract for selecting capabilities, running acceptance checks, recording evidence, and persisting a report.
- `skills/tools/webapp-testing/SKILL.md`, `skills/vercel/agent-browser/SKILL.md`, `skills/vercel/agent-browser-verify/SKILL.md`, `skills/vercel/verification/SKILL.md`, `skills/workflow/qa-session/SKILL.md`, and accessibility/web-quality skills — existing capabilities to compose or reference; they should not be duplicated inside the SDD phase.
- `openspec/config.yaml` — needs QA/archive rules, report semantics, and the project limitation that this repository has no general test runner; strict TDD is already disabled.
- `openspec/changes/{change-name}/state.yaml` — orchestrator-managed recovery state must be able to represent `qa` as the next phase and prevent archive from being selected before a QA report exists.
- `.agents/skill-registry.md` and prompt/skill references — generated/operational guidance needs to avoid path and contract drift when the new executor is added.

### Approaches
1. **Dedicated capability-driven `sdd-qa` phase** — add a first-class executor, command, prompt/skill, `qa-report.md`, DAG transition `apply → verify → qa → archive`, and archive gate. The executor resolves the best available QA capability for the change and records a result of `PASS`, `PASS WITH WARNINGS`, `FAIL`, `BLOCKED`, or `NOT TESTED` with concrete evidence.
   - Pros: clean separation of technical conformance from product acceptance; durable/auditable evidence; resumable through `state.yaml`; composes existing browser/manual skills; makes missing runtime capability visible instead of silently skipped.
   - Cons: adds an executor and several documentation/contracts; requires a clear policy for when `BLOCKED` or `NOT TESTED` may be archived.
   - Effort: Medium

2. **Fold acceptance QA into `sdd-verify`** — extend the existing verifier to run technical checks and user-facing acceptance flows, then retain the current `verify-report.md` as the only report.
   - Pros: smallest DAG and artifact change; no new agent registration; one quality report to consume.
   - Cons: conflates different evidence types and reviewer responsibilities; makes capability failures ambiguous; weakens independent acceptance gating; increases verifier scope and encourages static inspection to masquerade as QA.
   - Effort: Low/Medium

3. **Optional QA hook owned by the orchestrator** — keep the nine-phase pipeline and let the orchestrator invoke a browser/manual skill only for selected changes before archive, without a dedicated artifact/phase.
   - Pros: minimal disruption for changes with no runtime behavior; can reuse existing skills immediately.
   - Cons: not consistently resumable or auditable; behavior depends on orchestrator judgment and prompt wording; `sdd-continue` cannot reliably infer whether QA occurred; archive cannot enforce a stable gate.
   - Effort: Low initially, High to harden later

### Recommendation
Choose **Approach 1: a dedicated capability-driven `sdd-qa` phase**. Keep `sdd-verify` focused on requirement/design/task conformance, then run acceptance QA as an explicit downstream gate: `apply → verify → qa → archive`.

Define the QA report around observable acceptance scenarios and evidence, not around a universal test command. The executor should first inspect the change artifacts and target surface, then select only capabilities actually available in the environment. It should report the exact capability used, target/environment, scenarios attempted, evidence links or command output, untested scenarios, findings with severity, and a final verdict. `NOT TESTED` should mean no attempt was possible or appropriate; `BLOCKED` should mean an attempted path was prevented by environment, credentials, target availability, or another external constraint. Neither should be converted into `PASS`.

Make archive require both `verify-report.md` and `qa-report.md`. A failing report or unresolved `CRITICAL`/P0/P1 issue blocks archive. Whether `NOT TESTED`/`BLOCKED` can proceed should be policy-driven: acceptance-relevant changes should normally block, while documentation/configuration-only changes may proceed only with an explicit non-runtime rationale and a visible warning. This keeps the phase mandatory without pretending every change needs browser automation.

The implementation should update the canonical convention and all lifecycle documentation together, register `sdd-qa` in `opencode.json`, add continuation/state rules, and add a focused smoke-validation strategy for this configuration repository. Since no repository test runner, CI, linter, formatter, or application-under-test was found, the change itself must document those limitations and use configuration/markdown/script smoke checks rather than claim full runtime QA.

### Risks
- **False confidence:** treating static inspection or a missing target as acceptance success would defeat the purpose of the new phase; enforce explicit `NOT TESTED`/`BLOCKED` outcomes.
- **Archive deadlock:** requiring a browser or product environment for every config/documentation change could make the pipeline unusable; use change-surface/risk policy and an explicit exception rationale.
- **Capability drift:** available skills and MCP servers vary by project/environment; resolve capabilities at execution time and record what was actually available and used.
- **Prompt/contract drift:** commands, prompts, skills, README, and `.agents/skill-registry.md` currently have overlapping but not identical contracts and path conventions; the change must update all sources of truth consistently.
- **State recovery gaps:** if `state.yaml` only knows the old DAG, `sdd-continue` may skip QA or repeatedly select archive; add artifact-based fallback and explicit QA completion semantics.
- **Scope creep in verification:** adding acceptance logic directly to `sdd-verify` would make the technical gate harder to reason about and could duplicate existing browser skills.
- **No application under test in this repository:** validation of this harness can prove registration, routing, artifact, and policy behavior, but cannot prove a real product acceptance flow without a target project.

### Ready for Proposal
Yes. The orchestrator can proceed to proposal with the dedicated-phase recommendation. The proposal should explicitly decide: (1) whether QA is mandatory for every change or mandatory only for acceptance-relevant changes, (2) the archive policy for `NOT TESTED` and `BLOCKED`, (3) the supported verdict/severity vocabulary, and (4) whether the first implementation includes executable state-transition logic or only updates the documented orchestrator contract.

---

**Status**: success
**Executive Summary**: The repository has technical verification but no separate acceptance gate. A dedicated, capability-driven `sdd-qa` phase with `qa-report.md` is the cleanest integration, followed by an archive gate that requires both verification and acceptance evidence without inventing success when runtime testing is unavailable.
**Artifacts**: `openspec/changes/integrate-acceptance-qa-phase/exploration.md`
**Next Recommended**: `sdd-propose`
**Risks**: Capability availability, archive policy for `NOT TESTED`/`BLOCKED`, state-recovery drift, and the absence of an application-under-test in this repository.
**Skill Resolution**: `fallback-registry` — applied the repository’s `.agents/skill-registry.md` compact rules and the SDD exploration/shared OpenSpec contracts.
