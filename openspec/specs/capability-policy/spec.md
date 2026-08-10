# Capability Policy Specification

## Purpose

Define explicit capability selection, honest availability, reproducible toolchains, metric semantics, and agent authority. Slice 1 implements identity, policy, and changed-file scope; Slice 2 implemented the capsule/request/outcome authority contracts, and Slice 3 implemented the durable handoff queue (`handoff/v1`) and event log. Capability adapters are defined by the registry-backed contracts in this specification; human-waiver events (Slice 5) remain deferred, not implemented.

## Requirements

### Requirement: Select declared capabilities and profiles

Project policy MUST declare each capability as `required`, `preferred`, or `disabled`, and each adapter declaration MUST resolve through the versioned capability registry. `FAST`, `STANDARD`, and `FULL` MUST be named capability profiles, not counts or identities of agents. The resolver MUST NOT infer a stack, provider, command, or support claim from prose; undeclared tools MUST be unavailable.

#### Scenario: Profile selection

- GIVEN a project selects `STANDARD`
- WHEN policy resolves a run
- THEN it expands to the declared STANDARD capability set and registry entries
- AND it does not create or require a fixed number of agents

#### Scenario: No manifest or adapter

- GIVEN no valid project declaration or stack adapter exists
- WHEN a capability is requested
- THEN it is visibly `UNAVAILABLE`
- AND an LLM MUST NOT substitute an estimate, provider, command, or reasoning result

### Requirement: Apply honest capability outcomes

`required` unavailability MUST block its gate. `preferred` unavailability MUST produce `UNAVAILABLE` and a warning, and MAY continue only when explicit policy permits. `disabled` capabilities MUST NOT run and MUST be reported as `NOT_TESTED` with a reason. Invalid adapter output MUST NOT be converted to availability or `PASS`.

#### Scenario: Required, preferred, and disabled

- GIVEN one capability in each policy class is unavailable
- WHEN the profile runs
- THEN required blocks, preferred records its policy-defined warning/unavailable result, and disabled is `NOT_TESTED`
- AND no unavailable or disabled capability is reported as `PASS`

#### Scenario: Invalid adapter output

- GIVEN a declared provider emits output that fails its adapter format or scope validation
- WHEN policy evaluates it
- THEN the result is `FAIL` or `BLOCKED` with the validation reason
- AND policy does not treat the declaration as healthy merely because the process exited zero

### Requirement: Lock toolchains and preserve metric semantics

Gate providers MUST record an exact version plus commit or digest, command/config identity, adapter semantics, and scope. `latest`, ranges, missing immutable identity, downloads, and network resolution MUST be rejected. Existing CRAP, mutation, and DRY policy semantics remain unchanged, but this change MUST NOT register or claim adapters for CRAP, mutation, or DRY.

#### Scenario: Unpinned or latest toolchain

- GIVEN a gate resolves a provider as `latest` or cannot identify an immutable version
- WHEN policy evaluates the run
- THEN the capability is `BLOCKED` or `UNAVAILABLE` according to policy
- AND it MUST NOT produce a trusted `PASS`

#### Scenario: Adapter boundary

- GIVEN a declared test, lint, or coverage adapter has a pinned provider and explicit scope
- WHEN policy evaluates its normalized result
- THEN provider-specific semantics and scope are preserved
- AND a request for CRAP, mutation, or DRY remains outside this change and is not claimed as supported

### Requirement: Constrain agent authority with a state capsule

Agents MAY request actions and interpret validated results, but MUST NOT declare gates, mutate evidence/state/policy, or approve waivers. The capsule contract (implemented in Slice 2 as `capsule/v1`) MUST contain current state, objective, capability, impact scope, evidence references, permitted actions, permitted outcomes, and constraints; fallback MUST be visible.

#### Scenario: Agent claims a gate

- GIVEN an agent prose response claims `PASS` or edits a waiver
- WHEN the control plane evaluates the action
- THEN the claim has no gate authority and the evidence/state remain unchanged

#### Scenario: Human waiver boundary

- GIVEN a human exception is needed
- WHEN a future waiver adapter records it
- THEN identity, reason, finding scope, and expiration are required
- AND an agent alone MUST NOT create or approve the waiver
