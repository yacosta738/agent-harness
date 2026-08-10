# Capability Policy Specification

## Purpose

Define explicit capability selection, honest availability, reproducible toolchains, metric semantics, and agent authority. Slice 1 implements identity, policy, and changed-file scope; registry adapters, durable handoffs, capsules, and human-waiver events are future contracts.

## Requirements

### Requirement: Select declared capabilities and profiles

Project policy MUST declare each capability as `required`, `preferred`, or `disabled`. `FAST`, `STANDARD`, and `FULL` MUST be named capability profiles, not counts or identities of agents. The resolver MUST NOT infer a stack or provider from prose.

#### Scenario: Profile selection

- GIVEN a project selects `STANDARD`
- WHEN policy resolves a run
- THEN it expands to the declared STANDARD capability set
- AND it does not create or require a fixed number of agents

#### Scenario: No manifest or adapter

- GIVEN no valid project declaration or stack adapter exists
- WHEN a capability is requested
- THEN it is visibly `UNAVAILABLE`
- AND an LLM MUST NOT substitute an estimate or reasoning result

### Requirement: Apply honest capability outcomes

`required` unavailability MUST block its gate. `preferred` unavailability MUST produce `UNAVAILABLE` and a warning, and MAY continue only when explicit policy permits. `disabled` capabilities MUST NOT run and MUST be reported as `NOT_TESTED` with a reason.

#### Scenario: Required, preferred, and disabled

- GIVEN one capability in each policy class is unavailable
- WHEN the profile runs
- THEN required blocks, preferred records its policy-defined warning/unavailable result, and disabled is `NOT_TESTED`

### Requirement: Lock toolchains and preserve metric semantics

Gate providers MUST record pinned version plus commit or digest, command/config identity, and scope. `latest` or an unpinned provider MUST be rejected for gates. Slice 1 MUST retain provider-specific semantics: CRAP records its formula, coverage meaning, provider, and `changed-functions` scope; mutation normalizes totals/outcomes while retaining provider semantics; DRY is advisory; acceptance is optional and target-dependent.

#### Scenario: Unpinned or latest toolchain

- GIVEN a gate resolves a provider as `latest` or cannot identify an immutable version
- WHEN policy evaluates the run
- THEN the capability is `BLOCKED` or `UNAVAILABLE` according to policy
- AND it MUST NOT produce a trusted `PASS`

#### Scenario: Metric adapter boundary

- GIVEN no reliable function adapter exists
- WHEN CRAP or mutation is requested
- THEN changed-file scope and provider-specific unavailability are recorded
- AND DRY may report candidates without failing the gate

### Requirement: Constrain agent authority with a state capsule

Agents MAY request actions and interpret validated results, but MUST NOT declare gates, mutate evidence/state/policy, or approve waivers. The future capsule contract MUST contain current state, objective, capability, impact scope, evidence references, permitted actions, permitted outcomes, and constraints; fallback MUST be visible.

#### Scenario: Agent claims a gate

- GIVEN an agent prose response claims `PASS` or edits a waiver
- WHEN the control plane evaluates the action
- THEN the claim has no gate authority and the evidence/state remain unchanged

#### Scenario: Human waiver boundary

- GIVEN a human exception is needed
- WHEN a future waiver adapter records it
- THEN identity, reason, finding scope, and expiration are required
- AND an agent alone MUST NOT create or approve the waiver
