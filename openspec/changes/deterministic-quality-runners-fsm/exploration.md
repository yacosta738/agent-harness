## Exploration: deterministic-quality-runners-fsm

### Proposed Change Name
`deterministic-quality-runners-fsm`

### Current State

This repository is an OpenCode configuration harness, not an application package. Its canonical
SDD store is OpenSpec (`openspec/config.yaml:8`), and the documented architecture is composed of
JSON configuration, Markdown commands/prompts/skills, Bash/Node utilities, plugins, and MCP
integrations (`README.md:11-21`). There is no active change directory at the time of exploration;
the only change found under `openspec/changes/` is the archived
`2026-08-09-integrate-acceptance-qa-phase` change.

#### Existing mechanisms by concern

| Concern | Current mechanism | Evidence and boundary |
|---|---|---|
| Delegation | Kerrigan has runtime `delegate`, `delegation_read`, and `delegation_list` tools; `opencode.json:248-275` also allows native `task` only for selected SDD agents. | `plugins/background-agents.ts:564-692` creates an isolated OpenCode session, calls `client.session.prompt`, tracks status, and disables nested `task`/`delegate` in the child. `:698-773` handles timeout/idle completion; `:836-928` persists Markdown and notifies the parent. The child result is still model output. |
| SDD routing | Routed Markdown commands select hidden phase executors; the documented DAG is `init → explore → propose → [spec + design] → tasks → apply → verify → qa → archive`. | `commands/sdd-*.md` use frontmatter such as `agent: sdd-explore` and tell the agent what to do. `opencode.json:329-446` registers the SDD executors. Routing and phase work are prompt/runtime behavior, not a repository executable. |
| SDD artifacts | OpenSpec files under `openspec/changes/{name}` plus `openspec/specs/`. | `skills/sdd/_shared/openspec-convention.md:5-41` defines the paths. `openspec/config.yaml:11-84` defines policy vocabulary and gates. |
| State/resume | `state.yaml` contains `current_phase`, `completed`, `next`, and `updated`; `sdd-continue` tells Kerrigan to read it and infer the next phase. | `commands/sdd-continue.md:10-21` is an instruction, not an executable transition function. The archived state at `openspec/changes/archive/2026-08-09-integrate-acceptance-qa-phase/state.yaml:1-5` shows the current schema. No parser, transition table, lock, or atomic state writer exists in the harness. |
| QA | `sdd-qa` is a dedicated, no-code-mutation executor with controlled scenario/verdict/severity vocabulary. | `skills/sdd/sdd-qa/SKILL.md:39-65` and `prompts/sdd/sdd-qa.md:24-48` require capability selection and `qa-report.md`. `openspec/specs/acceptance-qa/spec.md:20-45` and `:78-97` define the route and archive behavior. The report is written by the model after it runs whatever capabilities it chooses. |
| Technical verification | `sdd-verify` instructions detect configured test/build/coverage commands and ask the executor to run them. | `skills/sdd/sdd-verify/SKILL.md:129-187` and `prompts/sdd/sdd-verify.md:51-61` define detection and evidence capture. There is no shared runner/result schema. |
| Command execution | OpenCode's `bash` tool is broadly allowed (`opencode.json:10-19`, `:267-276`); local plugins also call external processes. | `plugins/background-agents.ts:38-53` uses `execFile("gentle-ai", ...)`; `plugins/engram.ts:159-173` and `:236-274` use `Bun.spawn`; `scripts/goal.sh`, `scripts/loop.sh`, and `scripts/wrap-sonarqube-mcp.sh` are real executable scripts. |
| Long-running work | `loop.sh` and `goal.sh` manage PIDs, metadata, logs, intervals, and sentinel lines; the corresponding skills tell the model how to react to those lines. | `scripts/loop.sh:85-151` and `scripts/goal.sh:90-209` are executable process wrappers. They do not execute the requested prompt themselves. `goal.sh:133-149` decides completion by scanning log text with `grep`, including heuristic success words when no predicate is supplied. |
| Reports | Phase reports are Markdown artifacts: `proposal.md`, `verify-report.md`, `qa-report.md`, and so on. | `skills/sdd/_shared/openspec-convention.md:15-40` defines them. The QA report contract is detailed in `skills/sdd/sdd-qa/SKILL.md:67-131`, but there is no normalized machine-readable result consumed by all phases. |
| External quality capabilities | Semgrep, CodeGraph, Playwright, Chrome DevTools, and other MCP servers are configured; SonarQube is present but disabled. | `opencode.json:80-109`, `:150-163`, `:208-223`. These are available integrations, not a project-quality pipeline. The harness has reusable scripts such as `skills/tools/webapp-testing/test-helper.js` and `skills/web/web-quality-audit/scripts/analyze.sh`, but no root runner composes them. |

#### What is executable/deterministic today

The following are actual executable mechanisms, subject to their external environment:

- Shell process lifecycle: `scripts/loop.sh` and `scripts/goal.sh` create background processes,
  PID/meta/log files, sleep, emit JSON sentinel lines, and stop processes.
- External process invocation: the plugins use `execFile`/`Bun.spawn`, and the SonarQube wrapper
  performs Docker checks before launching an MCP server (`scripts/wrap-sonarqube-mcp.sh:7-36`).
- Delegation lifecycle bookkeeping: `background-agents.ts` maintains in-memory statuses, timeout
  handling, filesystem persistence, and parent notifications. It is deterministic bookkeeping,
  but session/model output and generated delegation metadata are not deterministic.
- File/config persistence: OpenSpec artifacts, `state.yaml`, Ponytail's mode file, Engram requests,
  WakaTime state, and the model-variant cache are concrete I/O. For example,
  `plugins/model-variants.ts:34-45` uses a temporary file and atomic rename.
- External analysis calls: Semgrep and other MCP servers can return machine-observable results when
  enabled, but network availability, server versions, credentials, and tool behavior remain
  environmental inputs.

These mechanisms are not yet a deterministic quality system. They lack a common command contract,
exit-status interpretation, artifact schema, timeout/error policy, and report aggregation layer.
"Deterministic" here means that the runner makes the same transition/interpretation for the same
normalized inputs; it does not make network services, clocks, model output, or arbitrary project
commands reproducible.

#### What remains instruction-only or model-controlled

- `commands/sdd-*.md`, `prompts/sdd/*.md`, `skills/sdd/sdd-*.md`, and `AGENTS.md` describe how an
  agent should route, inspect, decide, edit, and report. They do not enforce those actions outside
  the model/runtime tool permissions.
- `sdd-continue` selects the next phase by prompt reasoning over files. `state.yaml` is data, not an
  executable FSM. A model can currently select `archive` incorrectly unless the prompt follows the
  QA gate.
- `sdd-verify` and `sdd-qa` ask the agent to discover commands/capabilities and write Markdown
  verdicts. The controlled vocabulary is a contract for the model, not a validator.
- `goal.sh`/`loop.sh` only wake the agent. The prompt is interpreted by the agent, and `goal.sh`'s
  text/regex scan can produce false positives; it is not a reliable domain predicate engine.
- The review workload estimate and 400-line delivery decision are currently planning instructions
  in `prompts/sdd/sdd-tasks.md:133-183`, not a measured diff gate.
- `plugins/ponytail.mjs:49-67` deterministically reads/writes a mode file and injects instructions,
  but the effect of those instructions is model behavior. The same applies to Engram memory
  injection in `plugins/engram.ts:397-413`.

#### Current testing and quality baseline

`openspec/config.yaml:6-9` explicitly records that there is no repository test runner or test suite,
no repo-wide linter/formatter, and strict TDD is disabled. The tracked-file scan found no root
`package.json`, `pyproject.toml`, `pytest.ini`, `Makefile`, `GNUmakefile`, `Cargo.toml`, `go.mod`,
`Package.swift`, or mutation-testing configuration. The only package manifests are nested example
files under `skills/vercel/vercel-services/references/fastapi-vite/`. Therefore:

- There is currently **no root harness test runner** to execute, and no root lint, coverage, or mutation
  runner. This must remain explicit in future reports until a runner is deliberately added.
- Static-analysis capabilities exist as integrations (notably Semgrep) but are not mandatory or
  normalized by SDD.
- Existing smoke validation is ad hoc: JSON/YAML/Markdown/path checks and selected scripts can be
  run manually, but no single command produces a complete quality report.

#### Distribution constraint

The harness is consumed through dotfiles, not only from this checkout. `dotfiles/.gitmodules:10-12`
declares `editors/agents/opencode` as the `agent-harness` submodule, and
`dotfiles/.dotter/global.toml:50-54` maps it to `~/.config/opencode`. The checked-out dotfiles
submodule currently points at `bec9489`, while this working repository is on `7e66a0c`; the
consumer can therefore lag behind the source checkout. A direct environment check also reports
that the current `~/.config/opencode` path is not a symlink, so effective deployment must be
verified instead of assumed. `README.md:558-563` documents the same deployment relationship.

The existing configuration uses relative file references (`opencode.json:245-247` and the SDD agent
prompts) while some wrappers resolve through `$HOME/.config/opencode` (`opencode.json:150-161`). A
runner must resolve project input independently from the installed harness location and must not
embed `/Users/acosta/Dev/agent-harness` or any other source checkout path.

### Affected Areas

- `scripts/` — safest initial home for a dependency-light runner and an executable FSM because the
  repository already ships real Bash utilities there and does not need a new OpenCode runtime API.
- `openspec/config.yaml` — existing project-specific policy surface for test/build/coverage and QA;
  future runner/capability configuration should extend this or a clearly related project-local
  config without assuming a language or package manager.
- `openspec/changes/{change-name}/state.yaml` — durable workflow state and compatibility boundary;
  an FSM would validate legal transitions and preserve the current fields before adding metadata.
- `skills/sdd/_shared/openspec-convention.md` and `skills/sdd/_shared/persistence-contract.md` —
  canonical artifact/state and persistence rules that must agree with any executable transition
  engine.
- `commands/sdd-continue.md`, `commands/sdd-new.md`, and `prompts/sdd/sdd-*.md` — current model
  orchestration and handoff layer; should become thin interpretation/approval adapters rather than
  the authority for deterministic transitions.
- `skills/sdd/sdd-verify/SKILL.md` and `skills/sdd/sdd-qa/SKILL.md` — replace ad hoc command/capability
  discovery with consumption of runner evidence while retaining their ownership boundaries.
- `plugins/background-agents.ts` — optional later adapter for notifications or launching a runner;
  its existing OpenCode client/event calls are real, but no new undocumented hook should be assumed.
- `plugins/engram.ts`, `plugins/model-variants.ts`, `plugins/wakatime.js`, and Ponytail hooks —
  observability/state examples and possible evidence sinks, not authoritative quality or workflow
  state. They should not be coupled to the first runner slice.
- `opencode.json` — only a possible wiring point if a later design proves that registration is needed;
  exploration found no need to change it now. Preserve existing permissions, MCP enablement, and
  relative references.
- `README.md` and `.agents/skill-registry.md` — document the runner contract, no-runner behavior,
  distribution/deployment verification, and the distinction between tool evidence and model
  interpretation.
- `/Users/acosta/Dev/dotfiles/.gitmodules`, `/Users/acosta/Dev/dotfiles/.dotter/global.toml`, and
  the dotfiles submodule checkout — required for rollout verification, even though this exploration
  does not modify the consumer repository.

### Project-Configurable Capabilities

The runner must treat capabilities as project data, not as a hardcoded stack matrix. The existing
`openspec/config.yaml` is the natural SDD policy anchor, while a project-local runner manifest may be
needed for commands that are not SDD-specific. The proposal should decide the exact location and
precedence, but the following fields are required conceptually:

- **Execution definition:** stable capability ID (`test`, `lint`, `typecheck`, `build`, `coverage`,
  `mutation`, `static-analysis`, `format-check`, or project-defined), executable plus argument list,
  working-directory rule, timeout, environment allowlist, and read-only/mutating classification.
- **Result interpretation:** exit-code policy, optional machine-readable output parser, expected
  report paths, severity mapping, and redaction rules. Raw stdout/stderr and exit code must remain
  available as evidence.
- **Quality policy:** enabled/required capabilities, coverage and mutation thresholds when a project
  supplies them, behavior for unavailable/blocked commands, and whether a capability is a warning or
  release blocker.
- **Workflow policy:** allowed SDD transitions, required artifacts per phase, and the archive policy
  for `BLOCKED`/`NOT TESTED`, preserving the existing `openspec/config.yaml` rules.
- **Discovery:** manifest-based detection may suggest a runner, but explicit project configuration
  wins. If nothing is configured, the runner must return `UNAVAILABLE`/`NOT TESTED`, never infer a
  passing result from a familiar filename or from model text.

Prefer argv-oriented execution over interpolated shell strings, or require an explicit opt-in for a
shell command. This avoids command injection through project configuration and makes quoting,
timeouts, exit codes, and cross-platform behavior testable. The configuration must support unknown
stacks and custom commands; npm/pytest/Gradle/etc. may be examples of adapters, not mandatory
branches in the harness.

### Approaches

1. **Keep the prompt-driven workflow and strengthen contracts** — extend the existing Markdown
   prompts, `state.yaml` rules, and reports without adding an executable runner or FSM.
   - Pros: smallest change; no runtime/API risk; preserves current distribution and rollback path.
   - Cons: does not satisfy the core principle; phase selection, command choice, thresholds, and
     verdicts remain model-controlled; reports can claim more than the evidence supports.
   - Effort: Low

2. **Implement the FSM and quality orchestration inside an OpenCode plugin** — use existing plugin
   hooks/client calls to intercept phase events, execute commands, and update state.
   - Pros: central runtime visibility; can reuse existing session notifications and delegation
     lifecycle; potentially seamless for the agent.
   - Cons: couples the core workflow to OpenCode runtime behavior and current plugin APIs; creates a
     hard failure if plugin loading differs between the source checkout, dotfiles submodule, and
     installed config; makes testing without OpenCode difficult; risks inventing unsupported hooks.
   - Effort: High

3. **Add an external declarative runner plus an executable FSM, then keep a thin OpenCode adapter** —
   ship a dependency-light runner under `scripts/`, read project configuration, execute configured
   capabilities, emit normalized machine results and human reports, and validate/advance OpenSpec
   state. Existing commands/prompts interpret results and request human approval where needed. A
   plugin adapter is optional and comes only after the standalone contract is verified against the
   actual OpenCode runtime.
   - Pros: deterministic core is testable outside OpenCode; no invented runtime API; works from the
     dotfiles-installed path; supports arbitrary stacks; gives verify/QA one evidence contract; can
     be adopted incrementally with fallback to the current prompt flow.
   - Cons: introduces a new runner/report/state contract; must handle concurrency, process safety,
     cross-platform execution, configuration security, and migration of existing state; initial
     wiring spans multiple SDD artifacts.
   - Effort: Medium/High, best delivered in small slices

### Recommendation

Choose **Approach 3** under the change name `deterministic-quality-runners-fsm`, with an additive
rollout:

1. Define a versioned, machine-readable runner result and report contract plus project capability
   configuration. Start with execution, timeout, exit-code, redaction, and unavailable/blocked
   semantics; do not add stack-specific defaults that can masquerade as coverage.
2. Add a standalone FSM that reads the existing OpenSpec artifacts and `state.yaml`, validates
   preconditions for `init → explore → propose → spec/design → tasks → apply → verify → qa → archive`,
   rejects illegal transitions such as archive before a valid QA gate, and writes state atomically.
   Preserve the current four state fields and support old archived/in-flight state files.
3. Adapt `sdd-verify` and `sdd-qa` to consume runner evidence and render their existing Markdown
   reports. The agent should explain and interpret results, but it should not invent commands,
   change exit statuses, or advance the FSM by prose alone.
4. Keep `sdd-continue` and prompt-based operation as a compatibility fallback while the runner is
   unavailable or disabled. The fallback must be visible in reports, not silently treated as
   deterministic enforcement.
5. Validate the source checkout, the dotfiles submodule checkout, and the effective
   `~/.config/opencode` deployment separately. The rollout is: publish harness commit → update the
   dotfiles submodule pointer → apply Dotter → run a distribution smoke check. Do not modify
   `opencode.json` until a verified runtime integration requires it.

The first implementation should likely be split into reviewable slices: runner/result contract;
FSM/state compatibility; verify/QA/report integration; then optional plugin/runtime wiring. This
keeps rollback simple: disable the opt-in runner/FSM configuration and revert only the adapter/docs,
while preserving existing Markdown artifacts and state.

### Risks

- **Runtime API drift or invention:** `task`, plugin hooks, and OpenCode client methods are runtime
  capabilities; only APIs already used in `plugins/background-agents.ts` and current command routing
  should be relied on until verified against the installed runtime/documentation.
- **Distribution skew:** the dotfiles submodule is behind this checkout and the current home config is
  not reported as a symlink. A source-only success would not prove the installed harness works.
- **Unsafe configured commands:** project-defined commands can execute arbitrary code and may contain
  secrets. Use argv-by-default, explicit shell opt-in, environment allowlists, timeouts, output
  redaction, and clear mutation permissions.
- **State corruption and races:** multiple sessions/worktrees can update one change. Atomic writes,
  stable change identity, stale-state detection, and a documented conflict policy are required before
  making the FSM authoritative.
- **Backward compatibility:** existing `state.yaml`, archived reports, and prompt-only flows must
  remain readable. Missing runner configuration must mean unavailable/untested, not an implicit pass.
- **False predicates:** `goal.sh` currently scans log text for regex/success words and can stop on
  unrelated output. It should not be the authority for quality or SDD completion.
- **External variability:** MCP services, Docker, credentials, network, clocks, and project commands
  can make the same run unavailable or non-reproducible. Reports need environment identity and raw
  evidence.
- **No current harness test runner:** the runner/FSM cannot be validated by an existing repository
  suite. The change must introduce focused fixture/contract smoke execution without pretending that
  the harness has product acceptance.
- **Scope and review size:** touching scripts, config, shared contracts, prompts, reports, and
  distribution documentation may exceed the 400-line review budget. `sdd-tasks` should forecast this
  and split autonomous slices before apply.

### Verifiable Success Criteria

1. A temporary project with explicitly configured commands from at least two unrelated stacks can be
   executed without stack-specific branches; a missing/unavailable capability produces a machine
   status such as `UNAVAILABLE`/`NOT TESTED`, never `PASS`.
2. Every runner invocation records the resolved command identity, working directory, exit code,
   duration, stdout/stderr or redacted references, parser result, and report artifact path in a
   stable machine-readable envelope that verify and QA can consume.
3. Given the existing OpenSpec artifact layout, the FSM deterministically accepts legal transitions,
   rejects archive before a valid QA report/policy exception, and preserves compatibility with the
   current `state.yaml` fields. Repeating the same transition with the same inputs is idempotent.
4. Test, lint, type/build, coverage, mutation, and static-analysis capabilities are optional and
   project-configurable. No configured capability is silently replaced by npm/pytest/a guessed
   stack, and thresholds are enforced by the runner rather than inferred by the model.
5. `verify-report.md` and `qa-report.md` retain raw runner evidence, unavailable/blocked reasons,
   and the existing verdict/severity vocabulary. Model interpretation cannot turn a non-zero runner
   result or missing capability into a passing result.
6. With the runner disabled or unavailable, the existing prompt-driven lifecycle still resumes and
   reports the fallback explicitly; rollback requires no deletion or rewriting of existing OpenSpec
   artifacts.
7. A distribution smoke check passes from the harness checkout, the dotfiles submodule checkout, and
   the effective `~/.config/opencode` path after Dotter materialization, with no source-checkout
   absolute paths and with current relative prompt/skill references intact.

### Ready for Proposal

Yes. The proposal should make the runner result schema, configuration location/precedence, FSM
transition authority, command-safety model, report compatibility, and rollout feature flag explicit.
It should also state that this repository currently has no general test/lint/coverage/mutation runner,
so initial validation must use focused executable fixtures and contract smoke checks rather than
claiming product acceptance.

---

**Status**: success
**Executive Summary**: The harness has real process/delegation/file mechanisms, but SDD routing, state transitions, quality-command discovery, and reports remain primarily model-controlled. A dependency-light external runner with a declarative project contract and an opt-in executable FSM is the safest path, with prompt/runtime adapters retained as a compatibility fallback.
**Artifacts**: `openspec/changes/deterministic-quality-runners-fsm/exploration.md`, `openspec/changes/deterministic-quality-runners-fsm/state.yaml`
**Next Recommended**: `sdd-propose`
**Risks**: Runtime API drift, dotfiles distribution skew, unsafe configured commands, state races/backward compatibility, false text predicates, external variability, and the absence of a repository test runner.
**Skill Resolution**: `fallback-registry` — applied `.agents/skill-registry.md` compact rules plus the repository SDD/OpenSpec shared contracts.
