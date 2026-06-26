---
name: threat-model
description: >
  Build, update, or persist a repository-scoped threat model. Use when the
  user explicitly invokes $threat-model, asks to threat-model a codebase, or
  starts any security review that needs shared context. Treats AGENTS.md or
  SECURITY.md as authoritative when present and sufficiently specific. Do
  not use for findings about a specific diff — that is finding-discovery.
license: MIT
---

# Security Threat Model

## Objective

Establish the repository-scoped threat model at the path defined in
`_shared/scan-artifacts.md`. If it already exists, stop here. If a threat
model or clearly authoritative security guidance (AGENTS.md, SECURITY.md)
is provided or already exists, persist it unchanged, then stop here.

The threat model must make obvious:

- What assets or privileges matter.
- What trust boundaries exist.
- What inputs are attacker-controlled.
- What invariants the code must preserve.
- What repository-wide failure modes would matter most.

## Inputs

- Repository path or current working repository.
- Optional `AGENTS.md`, `SECURITY.md`, threat model file, or similar
  authoritative guidance.
- Optional focus area from the user prompt.

## Workflow

1. Resolve `repo_name` and `security_scans_dir` using
   `_shared/scan-artifacts.md`.
2. If the repository-scoped threat model already exists at the resolved path,
   stop here — return its path and a one-line summary.
3. If a threat model or authoritative security guidance is provided or found
   in the repo (AGENTS.md, SECURITY.md, docs/security, threat-model.md):
   - Write it exactly to the repository-scoped threat model path.
   - Treat that file as the only threat model source of truth.
   - Do not expand, summarize, or reinterpret it.
4. Otherwise, generate a repository-scoped threat model using the structure
   in `references/threat-model-template.md`.
5. Before finalizing, sanity-check that:
   - The threat model is repository-scoped, not centered on a single feature
     or current diff.
   - It describes repository-wide primary product or runtime surfaces and
     trust boundaries before any narrower examples.
   - Vulnerability-class discussion is about repository-context classes, not
     findings about any current diff.
6. Write the threat model to the repository-scoped path.

## Output Contract

Return:

- `threat_model_path`: absolute path to the persisted threat model file.
- `source`: one of `existing`, `authoritative_provided`,
  `generated_from_repo`.
- `summary`: a 3-7 bullet summary of the threat model contents.
- `trust_boundaries`: list of trust boundaries named in the model.
- `attacker_inputs`: list of attacker-controlled input classes named in the
  model.

## Hard Rules

Read `_shared/shared-hard-rules.md` first.

- A provided threat model or authoritative security guidance is authoritative.
  Do not edit, expand, or reinterpret it.
- Threat model generation must stay at repository scope unless the user
  explicitly asks for narrower scope.
- Do not turn this phase into findings about any current diff.
- Do not let the current scan target, touched subsystem, or changed
  directories become the center of gravity.
- In large monorepos, avoid centering `personal/`, `test/`, `tests/`,
  `docs/`, `examples/`, or one-off developer tooling unless repository
  evidence shows those are real deployed or privileged workflow surfaces.
- Call out trust boundaries and assumptions explicitly.
- Keep references to vulnerability types at the level of repository-context
  classes, rather than any diff findings.
- Persist the threat model output to the repository-scoped path from
  `_shared/scan-artifacts.md`.