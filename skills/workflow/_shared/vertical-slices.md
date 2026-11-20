# Vertical Slice Contract

**Internal reference.** This document is not a discoverable skill; it is the single source of truth
that RPI, `writing-plans`, `sdd-tasks` and `sdd-apply` reference when they decompose or implement
work.

## What is a slice

A slice represents an observable result for a user or operator, not a technical layer. It includes,
as applicable:

1. **Result:** the complete behavior that becomes available.
2. **Affected contracts:** relevant public boundaries (UI, API, service, persistence, tests); do not
   list layers that do not apply.
3. **Invariants and security:** authorization, validation, consistency, compatibility, and safe
   rollout that the result requires.
4. **Verification:** commands and scenarios that test the result and the affected contracts.
5. **Evidence:** observable results obtained, not promises or fictional artifacts.
6. **Delivery:** whether it can be verified independently and how it is reviewed or integrated.

## Slicing criteria

A slice is complete only when its behavior is verifiable and its critical invariants are protected.
The following are **not** allowed:

- Calling a happy path a slice when it is insecure.
- Deferring authorization or integrity to a later phase.
- Splitting UI, API, and persistence into separate phases when all three are required for the
  result.

A technical layer may constitute a slice if it independently delivers a complete and verifiable
result.

## RPI and slicing are orthogonal

RPI chooses depth and route (Direct, Delegated direct, Explicit SDD). Slicing organizes work when
there is more than one functional unit. A small task follows Direct without slices. A multi-unit
plan proposes functional slices. Neither path forces SDD automatically.

## Slice lifecycle

1. **Select:** when the task has multiple meaningful deliverable units, propose slices that each
   produce a verifiable result.
2. **Implement:** implement one slice at a time, keeping code, tests, documentation, and required
   controls together.
3. **Verify:** run the verification commands; record real evidence (PASS, partial, blocked, N/A,
   not tested).
4. **Stop:** after completing a slice, report evidence and wait for orchestrator review and
   adaptation before starting the next slice. Do not continue by inertia.

## Precedence

1. Project contracts and security — never relaxed.
2. This shared contract — guides common procedure.
3. Tool/adapter mechanisms — provide specific enforcement.

## TDD within slices

When a slice changes business/product logic, apply RED → GREEN → REFACTOR inside each behavior,
not as separate product phases. Tests travel with the behavior they verify; they are not collected
in a later "Testing" phase.
