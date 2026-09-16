---
name: finding-discovery
description: >
  Discover technically plausible security finding candidates in a repository
  or scoped path. Use after $threat-model has produced a threat model, or
  when the user explicitly asks to enumerate security findings. Do not use
  for full PR/diff reviews — use $security-diff-scan or a dedicated PR
  review skill. Stays at plausibility, not final severity.
license: MIT
---

# Security Finding Discovery

## Objective

Investigate the target code (repository, scoped path, or focused component)
for technically plausible security vulnerabilities using the threat model
as context. Produce a ranked candidate inventory with evidence anchors.
Do not assign final severity here — that is `attack-path-analysis`.

## Inputs

- Repository path (default: current working directory).
- Optional scoped path, package, or folder within the repo.
- Threat model path or in-memory threat model (from `$threat-model` or
  user-provided AGENTS.md / SECURITY.md).
- Optional focus area (auth, secrets, deps, parser, etc.).
- Optional advisory context (CVE/GHSA id, advisory URL, package, version).

## Workflow

1. Resolve scan target and confirm scope with the user if ambiguous.
2. Read the threat model. If none exists, stop and ask the user to run
   `$threat-model` first, or to provide sufficient repository-specific
   security guidance to act as one.
3. Build a coverage plan:
   - Enumerate the in-scope surfaces (routes, handlers, parsers, stores,
     auth, queries, exec sinks, file sinks, outbound HTTP).
   - Enumerate the in-scope attacker inputs from the threat model.
   - For advisory-seeded scans, write or update `<context_dir>/seed_research.md`
     with advisory anchors, candidate files/functions, and failed lookups.
4. For repository-wide or scoped-path scans, dispatch discovery work:
   - Use `codegraph_explore` for symbol-level navigation across files.
   - Use the `semgrep` MCP for static pattern scanning.
   - Use the `sonarqube` MCP for prior findings as a starting hypothesis
     (treat as claims, not proof).
   - Use the `gh_grep` MCP for real-world usage patterns of suspect APIs.
   - Optionally spawn `security-engineer` sub-agents for parallel slices.
5. For each in-scope surface, evaluate:
   - Source: is the input attacker-controlled per the threat model?
   - Sink: is there a dangerous sink (exec, eval, SQL, path-join,
     deserialization, outbound HTTP, file write, template eval, redirect,
     etc.)?
   - Closest control: what guard exists? Is it absent, bypassed,
     mis-scoped, or incomplete?
   - Reachability: is the path plausibly reachable from an in-scope
     attack surface?
6. For each technically plausible candidate, append a row to
   `<discovery_dir>/raw_candidates.jsonl` with the shape in
   `references/candidate-schema.md`.
7. Dedupe:
   - Two candidates are the same issue only when fixing one would fix the
     other and they share the same source/control/sink/impact tuple.
   - Subsumed candidates collapse into the broader one; keep the strongest
     affected locations from each member.
   - Independently reachable siblings stay separate (e.g. each `execute`/
     `executemany` query builder method is its own candidate).
8. Write `<discovery_dir>/finding_discovery_report.md` with the deduped,
   ranked candidate inventory.
9. For each kept candidate, create
   `<findings_dir>/<candidate_id>/candidate_ledger.jsonl` with one
   discovery receipt per candidate. Append-only.

## Discovery Checklist

Use this to keep discovery specific without turning it into validation or
attack-path analysis:

- Inspect the actual code; commit messages and scanner narratives can be
  misleading.
- Trace the full source-to-sink chain, including wrappers, guards, and
  shared helpers.
- Prefer multiple distinct finding families only when they come from
  different root causes.
- Keep independently reachable instances separate, even when they share a
  template, route, or sink family.
- When a shared helper, guard, or sink wrapper changes, expand to sibling
  call sites that the same change affects.
- Treat the threat model as the source of truth for which inputs are
  attacker-controlled.
- Do not group many vulnerable files under one candidate when each has its
  own source/sink/control evidence.
- When a dangerous sink has multiple call sites, enumerate each call site
  with its own source and closest control.

## Finding Bar

Prefer technically plausible candidates such as:

- Authn/authz bypass, IDOR, privilege escalation, confused deputy
- SSRF (with concrete reachable internal target or metadata endpoint)
- Path traversal / arbitrary file read or write
- Injection with a real sink (SQL/NoSQL/LDAP/XPath, command, template)
- Cross-tenant data exposure
- Sensitive state change without correct enforcement
- Sandbox or trust-boundary escape
- Deserialization, SSTI, or interpreter abuse with concrete proof of
  attacker reachability

Avoid:

- Generic "needs more validation" comments with no exploit path.
- Maintainability complaints, missing-type errors, lint findings.
- Duplicate variants of the same root issue (dedupe these).
- Hygiene-only issues (missing headers, weak crypto for non-sensitive
  data) — note them but do not promote to findings.

## Output Contract

Return:

- `discovery_report`: absolute path to `finding_discovery_report.md`.
- `candidates`: list of candidate objects with at minimum:
  - `candidate_id` (stable, like `disc-001`)
  - `title`
  - `affected_locations`: list of `{label, path, lines, detail?}` with
    labels from `entrypoint | wrapper | root_control | sink |
    concrete_implementation`
  - `attacker_source`
  - `sink_or_broken_control`
  - `impact`
  - `why_plausible`: short paragraph anchored to code
  - `closest_control` and why it is absent, bypassed, mis-scoped, or
    incomplete
  - `validation_recommended`: `yes` or `no`
  - `cwe`: list of CWE ids when known
  - `seed_or_advisory_ref`: optional reference for seeded candidates
- `coverage_ledger_path`: absolute path to the coverage ledger.
- `dedupe_summary`: how many raw candidates collapsed into how many
  deduped candidates.

## Hard Rules

Read `_shared/shared-hard-rules.md` first.

- Stay grounded in the code and the threat model. No speculation about
  attacker paths the code does not support.
- Do not emit an untracked candidate. Every candidate needs a stable id and
  a discovery receipt in its candidate ledger.
- Do not turn discovery into full validation or full severity calibration.
- Discovery is about plausibility, not final severity.
- Continue reviewing until no additional distinct plausible candidates
  remain in the declared scope.