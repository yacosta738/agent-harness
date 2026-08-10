# QA Report: capability-adapters

## 1. Identity

| Field | Value |
|---|---|
| Change | `capability-adapters` |
| Mode | Acceptance QA / capability-driven observable behavior checks |
| Phase | `qa` |
| Date | 2026-08-10 |
| Target | No application, service, product CLI, deployed runtime, or external operator target was supplied or discovered |
| QA verdict | `NOT TESTED` |

This report is an audit record of the QA gate. It does not claim product acceptance for the harness or for the capability-adapter implementation.

## 2. Source artifacts and technical verification handoff

Reviewed:

- `openspec/changes/capability-adapters/proposal.md`
- `openspec/changes/capability-adapters/specs/capability-adapters/spec.md`
- `openspec/changes/capability-adapters/specs/capability-policy/spec.md`
- `openspec/changes/capability-adapters/specs/change-impact-set/spec.md`
- `openspec/changes/capability-adapters/specs/evidence-trust-boundary/spec.md`
- `openspec/changes/capability-adapters/design.md`
- `openspec/changes/capability-adapters/tasks.md`
- `openspec/changes/capability-adapters/verify-report.md`
- `openspec/changes/capability-adapters/state.yaml`
- `openspec/config.yaml`

Technical verification handoff: `verify-report.md` reports `PASS WITH WARNINGS` and records focused smoke evidence for registry/metrics contracts, test/lint/coverage normalization, scope separation, availability states, versioned envelopes, redaction, traversal protection, artifact hashes, and runner/evidence integration. That handoff is technical evidence only; it does not replace observable acceptance QA.

## 3. Target, environment, permissions, and limitations

### Target

No product under test exists in this repository. The repository is an OpenCode configuration/SDD harness containing scripts, prompts, skills, MCP integrations, and OpenSpec artifacts. No target URL, deployed service, API endpoint, application binary, user account, acceptance persona, or operator workflow was supplied.

The local smoke script is an implementation/technical-validation surface, not a product acceptance surface. Static inspection is likewise not acceptance evidence.

### Environment and permissions

- Host: macOS.
- Repository: `/Users/acosta/Dev/agent-harness`.
- Available local permissions: repository read access and local shell/Node.js execution.
- No external credentials, authenticated roles, service permissions, browser session, API token, or deployment access were available or required.
- `openspec/config.yaml` states that no general repository test runner or test suite is detected; manual command/script smoke checks are the available technical validation mechanism.

### Technical evidence collected without converting it into acceptance evidence

Executed:

```text
bash scripts/sdd-capability-adapters-smoke.sh all
```

Observed output:

```text
capability adapters: registry and metrics contract checks passed
capability adapters: test adapter checks passed
capability adapters: coverage and availability checks passed
capability adapters: integration dispatch, v1/v2 envelopes, redaction, traversal, and artifact hashes passed
```

Also executed syntax checks for `scripts/sdd-quality-runner.mjs` and the changed runner library modules (`metrics.mjs`, `config.mjs`, `toolchain.mjs`, `result.mjs`, `evidence-boundary.mjs`, and `git-impact.mjs`); all completed without output and without a syntax error.

These commands support the technical verification handoff. They are not used to mark user/operator scenarios `PASS`.

### Limitations

- There is no executable product target against which acceptance behavior can be observed.
- There is no browser/UI surface, HTTP/API surface, datastore, locale matrix, responsive surface, or authenticated operator boundary.
- There is no general test runner or repository acceptance suite.
- QA did not modify source code, configuration, fixtures, or implementation findings; only this QA report and the existing lifecycle handoff were persisted.

## 4. Capability inventory

| Capability | Status | Rationale |
|---|---|---|
| Local shell/script execution | Selected | `scripts/sdd-capability-adapters-smoke.sh` is executable and produced observable technical output. It cannot establish product acceptance without a target. |
| Node.js module/script execution | Selected | The smoke flow invokes Node.js and exercises local adapter contracts. Evidence remains technical rather than user acceptance evidence. |
| Static artifact inspection | Selected | Required to understand proposal, specs, design, tasks, verification handoff, and the intended target surface. Static inspection cannot produce an acceptance `PASS`. |
| Browser/UI automation | Unavailable | No application URL, browser target, or rendered UI exists. |
| API/HTTP testing | Unavailable | No service, endpoint, contract URL, or deployed application exists. |
| Data/persistence validation | Unavailable | No product datastore or persistence boundary exists for this change. |
| Accessibility testing | Rejected as non-applicable | No rendered user interface or accessibility tree is in scope. |
| Responsive/device testing | Rejected as non-applicable | No web, mobile, or device presentation surface exists. |
| Internationalization/locale testing | Rejected as non-applicable | No user-facing localized surface exists. |
| Exploratory/manual product testing | Unavailable | No product target, operator persona, or workflow is available to explore. |
| Security/authorization testing | Unavailable | No authenticated target, roles, credentials, or runtime authorization boundary is available. Local redaction/path smoke checks belong to technical verification. |
| Persistence/restart testing | Unavailable | No restartable product process or product state store is available. |

## 5. Scenario matrix

Every scenario uses the required vocabulary. No acceptance scenario is marked `PASS` from static inspection or from the local technical smoke output.

| ID | Scenario/category | Result | Evidence or reason |
|---|---|---|---|
| QA-01 | Happy path: a user/operator invokes a declared capability and observes a successful result | `NOT TESTED` | No application or operator target exists. Rerun prerequisite: provide a runnable target and invocation contract. |
| QA-02 | Negative: invalid, duplicate, `latest`, ranged, or undigested declaration is rejected observably | `NOT TESTED` | The smoke command reports technical contract checks, but no user/operator-facing acceptance assertion is available. Rerun prerequisite: expose the declaration flow through a runnable acceptance target with expected rejection behavior. |
| QA-03 | Boundary: missing provider, toolchain, or scope evidence yields an honest non-pass state | `NOT TESTED` | No product target exists. Technical verification reports coverage, but QA cannot elevate that evidence to product acceptance. Rerun prerequisite: runnable policy-resolution target and observable result surface. |
| QA-04 | Repeated/interrupted: repeated or interrupted execution preserves deterministic, auditable state | `NOT TESTED` | No runnable operator workflow or interruption control is available. Rerun prerequisite: target with repeat/interruption controls and persisted result inspection. |
| QA-05 | Unauthorized/security: undeclared capability or unauthorized consumer cannot bypass policy | `NOT TESTED` | No target, identity model, credentials, roles, or permission boundary is available. Rerun prerequisite: testable authorization roles and runnable policy-resolution target. |
| QA-06 | State transition: capability moves through the expected available/unavailable/blocked/not-tested or execution states | `NOT TESTED` | No product state machine is exposed to an acceptance actor. Technical FSM/result behavior is covered by verification evidence only. Rerun prerequisite: observable runtime state transitions and actor workflow. |
| QA-07 | Browser: user can operate the capability-adapter workflow in a supported browser | `NOT TESTED` | No browser-executable target or URL exists. Rerun prerequisite: browser target and supported-browser contract. |
| QA-08 | Accessibility: capability result/evidence is usable by keyboard and assistive technology users | `NOT TESTED` | No rendered UI or accessibility tree exists. Rerun prerequisite: UI target and accessibility acceptance criteria. |
| QA-09 | Responsive: result/evidence remains usable across supported viewport/device sizes | `NOT TESTED` | No web/mobile presentation surface exists. Rerun prerequisite: responsive target and device matrix. |
| QA-10 | Internationalization: result/evidence remains correct across supported locales | `NOT TESTED` | No localized user-facing surface exists. Rerun prerequisite: locale support contract and runnable localized target. |
| QA-11 | Persistence: result/evidence survives the relevant restart or reload boundary | `NOT TESTED` | No product persistence target or restartable application was supplied. Rerun prerequisite: runnable target and defined persistence boundary. |
| QA-12 | Exploratory/manual: an operator can discover and use the intended capability-adapter workflow without undocumented assumptions | `NOT TESTED` | No operator-facing target, persona, or workflow is available. Rerun prerequisite: runnable harness command/interface plus acceptance persona and workflow. |
| QA-13 | Technical smoke handoff: local capability-adapter smoke command completes and emits focused evidence | `PASS` (technical smoke only) | `bash scripts/sdd-capability-adapters-smoke.sh all` completed with four focused success messages. This is explicitly not product acceptance and does not change the final QA verdict. |

## 6. Untested scope, reason, and rerun prerequisite

### Untested or blocked acceptance scope

End-user/operator invocation, observable policy resolution, authorization boundaries, repeated/interrupted runs, product state transitions, browser behavior, accessibility, responsive behavior, localization, persistence/restart behavior, and exploratory usability remain untested.

They are `NOT TESTED`, rather than `BLOCKED`, because no target was supplied or discovered. If a target, credentials, permissions, or environment were supplied but could not be used, the affected scenarios would be `BLOCKED` instead.

### Rerun prerequisites

Rerun this QA phase when at least one acceptance target is available, with:

1. a runnable harness/product command, application URL, API endpoint, or binary;
2. an acceptance actor/persona and invocation contract;
3. expected observable outputs for happy, negative, boundary, and state-transition cases;
4. credentials/roles and permission boundaries where authorization applies;
5. persistence/restart expectations if evidence is durable; and
6. browser, device, locale, or accessibility matrices where those surfaces apply.

## 7. Findings

| ID | Severity | Finding | Status |
|---|---|---|---|
| QA-F-001 | `P2` | Acceptance behavior cannot be executed because this repository has no application or product runtime target. | `ACCEPTED EXCEPTION FOR ARCHIVE`; rerun required before claiming product acceptance or when a target is introduced. |
| QA-F-002 | `P3` | No general repository test runner or acceptance suite is available; only focused shell/Node smoke checks exist. | `ACCEPTED WARNING`; technical verification documents the limitation. |

No unresolved `CRITICAL`, `P0`, or `P1` findings were identified. The findings are coverage/process limitations, not claims of implementation correctness or product defects.

## 8. Final verdict

**`NOT TESTED`**

### Verdict rationale

Acceptance QA could not be performed because there is no application, service, product CLI target, deployed runtime, or operator environment for this harness change. The focused smoke command and syntax checks passed as technical evidence, but converting those results into product acceptance would violate the QA trust boundary.

### Explicit non-runtime archive exception

The user explicitly selected option 2: document the non-runtime/no-product-target exception so the lifecycle may proceed to archive without claiming product acceptance.

This exception means:

- the acceptance-relevant `NOT TESTED` verdict remains unchanged;
- the exception is visible here as `QA-F-001` (`P2`) and in this rationale;
- archive may proceed only under the repository policy exception for a harness/non-runtime change with no product target, with the warning preserved in the archive record; and
- this report is not evidence that the capability adapters are accepted by end users or operators.

If archive policy does not recognize this explicit exception, archive must stop and the missing target must be supplied. No source or finding was fixed during QA.

## 9. Implementation handoff

- Technical handoff: use `verify-report.md` for the focused implementation/spec conformance evidence and its `PASS WITH WARNINGS` result.
- Acceptance handoff: retain this report as the audit record; do not state that product acceptance was achieved.
- Next lifecycle phase: `sdd-archive`, conditional on the documented non-runtime/no-product-target exception being accepted by the archive gate.
- If the change later gains a product-facing target, rerun the full scenario matrix; do not reuse `QA-13` as acceptance evidence.
