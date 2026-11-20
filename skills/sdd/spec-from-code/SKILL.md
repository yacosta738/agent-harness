---
name: spec-from-code
description: >
  Reverse-engineer specifications from existing source code. Analyze a bounded scope, classify evidence,
  and produce a reviewable draft spec compatible with SDD conventions.
  Trigger: When user wants to generate specs from existing code, document legacy behavior, or create an SDD baseline.
license: MIT
metadata:
  author: acosta
  version: "1.0"
---

## Purpose

You are responsible for reverse-engineering specifications from existing source code.
You analyze a bounded scope of implementation, classify what you find as evidence, and produce a
reviewable draft specification compatible with the existing SDD conventions.

**Core principle: Existing implementation is evidence of behavior, not proof of correct requirements.**

Do not automatically convert legacy bugs, accidental implementation details, or undocumented
assumptions into normative specifications.

## Execution and Persistence Contract

> Follow **Section A** (skill loading), **Section B** (artifact retrieval), and **Section D**
> (return envelope) from `../_shared/sdd-phase-common.md`.

This skill does **not** follow Section C (persistence) in the standard way — it writes a **draft**
specification, never a canonical one. See the approval gate below.

- Write draft specs only to `.agents/sdd/changes/{change-name}/specs/{domain}/spec-from-code-draft.md`.
- **Never** write directly to `.agents/sdd/specs/{domain}/spec.md` without explicit user approval.
- If no change name is provided, operate in read-only mode — analyze and report without persisting
  artifacts.

## Scope and Discovery

### Bounded Scope Selection

Require the user to select a bounded scope before beginning analysis. Acceptable scopes include:

- A module or package
- An aggregate or bounded context
- An API surface or controller
- A workflow or use case
- A specific component or service

**Do not** scan and document an entire large repository by default. If the user requests
repository-wide analysis, ask them to narrow the scope or confirm they understand the effort.

### Supported Requests

Support requests such as:

- "Generate specifications from this existing module."
- "Document the actual behavior of this legacy component."
- "Reverse-engineer the contracts of this bounded context."
- "Create an SDD baseline from the current implementation."
- "Compare documented requirements with the behavior implemented in code."

## Evidence Collection

Inspect the following sources within the bounded scope. Follow the repository's actual architecture
and terminology.

### What to Inspect

1. **Public APIs and Interfaces**: Controllers, service interfaces, public methods, API routes.
2. **Application Use Cases**: Command handlers, query handlers, application services.
3. **Domain Models and Invariants**: Entities, value objects, domain rules, aggregate boundaries.
4. **Validation and Authorization Rules**: Input validation, guards, permission checks.
5. **Error Handling**: Observable failure behavior, error types, retry logic.
6. **Persistence Constraints**: Schema constraints, repository contracts (only those relevant to
   public behavior).
7. **Existing Tests**: Unit tests, integration tests, acceptance tests — when available.
8. **Existing Documentation**: README files, ADRs, inline comments, API docs.
9. **External Contracts**: OpenAPI schemas, event definitions, message contracts.

### Architecture-Aware Inspection

For hexagonal or DDD-based projects, distinguish:

- **Domain rules** from infrastructure mechanisms.
- **Aggregate invariants** from persistence implementation details.
- **Public contracts** from internal helper functions.
- **Business events** from implementation-specific messaging concerns.

Do not derive requirements solely from naming conventions or file structure.

### Reuse sdd-explore

For codebase investigation, reference `sdd-explore` rather than duplicating its workflow. Use
sdd-explore's guidance for navigating the codebase, but focus on evidence collection and
classification rather than general exploration.

## Evidence Classification

Every significant finding must be classified using the following taxonomy. Preserve traceability to
source files, symbols, tests, or documentation.

### Observed Behavior

Behavior supported by direct inspection of the current implementation. The code does X when given Y.

**Marker**: `[Observed]`

**Example**: "The `OrderService.create()` method validates that quantity > 0 before persisting."

### Confirmed Requirement

Behavior explicitly supported by authoritative project specifications, decisions, or user
confirmation. Tests align with implementation and documentation.

**Marker**: `[Confirmed]`

**Example**: "Orders with quantity <= 0 are rejected — confirmed by spec, test, and implementation."

### Inferred Behavior

A reasonable interpretation of implementation evidence, but not fully established. The pattern
suggests X, but no test or spec confirms it.

**Marker**: `[Inferred]`

**Example**: "The retry logic suggests idempotency is expected for payment processing, but no
explicit idempotency key is documented."

### Unverified or Ambiguous

Behavior that cannot be reliably determined from the available evidence. Conflicting signals or
missing information.

**Marker**: `[Unverified]`

**Example**: "The error handling path for concurrent updates is unclear — no tests cover this case."

### Potential Defect or Contradiction

Behavior that conflicts with existing requirements, tests, security assumptions, or architectural
decisions. The implementation may contain a bug or legacy workaround.

**Marker**: `[Defect?]`

**Example**: "The code allows negative quantities in edge cases, contradicting the validation rule
and the domain spec."

### Classification Rules

- Do not silently promote `[Observed]` or `[Inferred]` behavior into `[Confirmed]` requirements.
- Do not assume tests always define intended behavior — tests may be wrong or incomplete.
- Do not assume the implementation is correct because it is deployed.
- When evidence conflicts, present all competing interpretations.
- Avoid invented citations, file paths, tests, or execution results.

## Draft Specification Generation

Generate a draft specification compatible with existing SDD conventions.

### Format Requirements

- Use **RFC 2119 keywords** (MUST, SHALL, SHOULD, MAY) **only** for `[Confirmed]` requirements.
- For `[Observed]`, `[Inferred]`, and `[Unverified]` findings, use **descriptive language** without
  normative force: "The current implementation does X", "The code appears to Y", not "The system
  SHALL X".
- Use **Given/When/Then** scenarios for behavioral descriptions.
- Include happy paths and meaningful error or edge cases.
- Separate behavior from implementation details.
- Group findings by domain concern, not by file or layer.
- Include source references and unresolved questions.

### Draft Structure

```markdown
# Spec from Code — {scope name}

## Scope

{Bounded scope description}

## Evidence Summary

| Classification | Count |
|---------------|-------|
| Confirmed     | N     |
| Observed      | N     |
| Inferred      | N     |
| Unverified    | N     |
| Defect?       | N     |

## Findings

### {Domain Area 1}

#### F-001: {Title}

**Classification**: [Confirmed]
**Sources**: `path/to/file.kt:42`, `path/to/test.kt:15`

The system SHALL {requirement text}.

**Scenario**: {Name}
- Given {precondition}
- When {action}
- Then {expected outcome}

---

#### F-002: {Title}

**Classification**: [Observed]
**Sources**: `path/to/file.kt:78`

The current implementation rejects requests where quantity is zero or negative.

**Scenario**: {Name}
- Given {precondition}
- When {action}
- Then {observed outcome}

---

### {Domain Area 2}

...

## Conflicts and Contradictions

{List any cases where code vs tests, code vs docs, or code vs code disagree.}

## Unresolved Questions

{List questions that require user input before the spec can be finalized.}

## Potential Defects

{List suspected bugs or unsafe behavior that should not become normative requirements.}
```

### Approval Gate

1. Write the draft to `.agents/sdd/changes/{change-name}/specs/{domain}/spec-from-code-draft.md`.
2. Present the draft to the user for review.
3. The user must explicitly accept before the draft becomes a canonical spec.
4. On rejection, discard the draft — do not persist it.

**Never** write directly to `.agents/sdd/specs/{domain}/spec.md` without explicit user approval.

### Promoting an Approved Baseline

When the user accepts the draft, promote it through a bounded procedure that does not fake a full
SDD cycle:

1. **Compare**: If a canonical spec already exists at `.agents/sdd/specs/{domain}/spec.md`, read it
   and compare with the approved draft. Show the user the differences — what the baseline adds,
   modifies, or removes.
2. **Check for silent overwrite**: If the canonical spec exists and differs significantly, warn the
   user. Do not proceed without explicit confirmation.
3. **Merge or create**:
   - If no canonical spec exists: Copy the approved draft (renamed to `spec.md`) to
     `.agents/sdd/specs/{domain}/spec.md`.
   - If a canonical spec exists: Merge the approved draft into the existing spec, preserving
     requirements not mentioned in the baseline. Match by requirement name/title.
4. **Mark provenance**: Add a visible note at the top of the promoted spec:
   ```
   > **Provenance**: This spec was reverse-engineered from existing code on {date} using
   > spec-from-code. It documents observed behavior, not approved requirements. Review and
   > confirm each requirement before treating it as normative.
   ```
5. **Do not** pretend this baseline has passed implementation, verification, or QA. The
   `sdd-archive` gate (verify-report + qa-report) remains the only path for specs produced by a
   full SDD cycle. This promotion path is exclusively for documenting existing behavior as a
   historical baseline.
6. After promotion, remove the draft file from the change directory.

## Conflict Handling

Explicitly address these cases:

### Code and Tests Disagree

Present both interpretations. Mark the finding as `[Unverified]` and note the discrepancy. Do not
assume the test is correct or the code is correct.

### Code and Documented Requirements Disagree

Flag as `[Defect?]`. Present the documented requirement and the actual implementation behavior.
Request user decision before writing a normative specification.

### Inconsistent Behavior Across Implementations

When different code paths or methods provide inconsistent behavior for the same concern, document
all variants and mark as `[Unverified]`.

### Suspected Legacy Bugs

Classify as `[Defect?]` with clear reasoning. Do not promote bug-like behavior to a requirement.
Note whether the behavior appears intentional (workaround) or accidental.

### Missing Tests or Documentation

When tests or documentation do not exist for a behavior, classify findings as `[Observed]` or
`[Inferred]`, never as `[Confirmed]`.

## Return Envelope

Follow Section D of `sdd-phase-common.md`. Return:

- `status`: `success`, `partial`, or `blocked`
- `executive_summary`: 1-3 sentence summary of findings
- `detailed_report`: evidence classification summary and key findings
- `artifacts`: list of draft spec paths written
- `next_recommended`: `sdd-spec` to finalize, or `none` for read-only analysis
- `risks`: contradictions, defects, or gaps discovered
- `skill_resolution`: how skills were loaded

Example:

```markdown
**Status**: success
**Summary**: Analyzed OrderService module — 12 confirmed requirements, 8 observed behaviors,
  3 potential defects identified.
**Artifacts**: `.agents/sdd/changes/review-orders/specs/ordering/spec-from-code-draft.md`
**Next**: sdd-spec to finalize the draft, or user review and approval
**Risks**: 3 potential defects found — negative quantity validation gap, race condition in status
  transitions, missing idempotency for retries
**Skill Resolution**: none
```

## Rules

- NEVER write to canonical spec paths without explicit user approval
- NEVER promote observed behavior to confirmed requirements automatically
- NEVER scan an entire repository without a bounded scope
- ALWAYS classify every finding with evidence markers
- ALWAYS preserve source traceability
- ALWAYS flag contradictions and suspected defects
- ALWAYS distinguish domain rules from infrastructure details
- DO NOT generate tests, refactor code, or fix bugs
- DO NOT create a new SDD lifecycle phase or sub-agent
