---
name: triage-finding
description: >
  Triage existing security findings, vulnerability reports, scanner output,
  CVE/GHSA advisories, or security/Linear/GitHub tickets against the
  current repository using static code evidence. Returns a verdict per
  finding: confirmed, not_actionable, or needs_review. Do not use for
  discovery, dedup, validation, or fixes — those are separate skills.
license: MIT
---

# Security Triage Finding

## Objective

Triage existing security findings against the current repository using
static code evidence. Return one evidence-backed verdict per supplied
finding: `confirmed`, `not_actionable`, or `needs_review`. For
`confirmed` and `needs_review` findings, also assign a discrete
exploitability stack rank inside that verdict's own queue.

This skill is for backlog burn-down. It starts from findings the user
already has: SARIF results, CVEs, advisories, scanner tickets, bug bounty
reports, Linear issues, or other security backlogs. It is not a
repository-wide scan, dynamic validation run, fix implementation,
dashboard, or queue manager.

## Inputs

Start by extracting:

- Repository path or current working repository.
- For Linear intake: team id or name, project id, JQL/filter equivalent,
  or specific issue ids.
- For GitHub intake: `owner/repo`, URL, or current attached repository.
- For Jira intake: project key, JQL, or issue key.
- For pasted claims: the raw finding text.
- `input_id`: scanner id, SARIF rule/result id, CVE/GHSA id, ticket id,
  or in-conversation slug.
- Title or short claim.
- `source_type`: `sarif`, `cve`, `advisory`, `scanner_ticket`,
  `bug_bounty`, `linear_issue`, `github_advisory`, `freeform`, `unknown`.
- Vulnerable component, package, API, file, route, class, function, or
  service.
- Claimed attacker-controlled source.
- Claimed sink or broken security control.
- Affected version, path, configuration, or deployment surface.
- Required preconditions and claimed impact.
- Existing code references, evidence, and counterevidence.

Ask a follow-up question only when the repository path or finding claim
is too vague to inspect. Otherwise, inspect the repository and preserve
missing fields as proof gaps.

## Routing and Connector Use

This skill can pull findings from:

- **Linear** via the `linear` MCP (preferred) — query the team, fetch
  matching issues, normalize them into triage items.
- **GitHub** via the `github` MCP for code scanning alerts, Dependabot
  vulnerabilities, and security advisories. Use REST endpoints under
  the MCP; do not use the GitHub Connector for finding retrieval.
- **Sentry** via the `sentry` MCP when findings come from production
  errors mapped to security-relevant exception classes.
- **Semgrep** via the `semgrep` MCP for SARIF-shaped static findings.
- **SonarQube** via the `sonarqube` MCP for security hotspots.
- **Snyk/Dependabot/GitGuardian/Socket** findings imported as raw text.

Do not switch providers mid-run. Pick one source per run, normalize
findings, and triage each. Cross-source dedup belongs in a separate
workflow.

## Repository Security Policy Gate

Before static evidence analysis, check whether the target repository
has a `SECURITY.md` at the root. If present, read it before tracing
source, control, sink, or reachability.

Treat `SECURITY.md` as the primary local source for supported security
boundaries, trusted inputs, supported versions, disclosure scope,
hardening controls, and out-of-scope surfaces. Use it to decide whether
a reachable code path crosses a supported security boundary before
promoting a finding to `confirmed`. If no `SECURITY.md` is present,
record that absence as a proof gap and continue with the next-best
local policy evidence.

## Workflow

1. Pull findings from the chosen source. Validate the source identifier
   before any provider or memory work.
2. Normalize each finding into a triage item with `triage_item_id` (like
   `triage-001`), preserved source ids, and the fields in the Inputs
   section. Record missing fields as proof gaps.
3. Resolve the repository path and current git revision when available.
4. Apply the Repository Security Policy Gate above.
5. For each triage item, trace the claimed source, control, sink, and
   reachable path:
   - Treat scanner/advisory prose as a claim, not as proof.
   - Start from the cited code, manifest, version range, or supplied
     evidence.
   - Record reachability anchor evidence: the concrete caller,
     entrypoint, route, command, package export, deployment path,
     dependency edge, or other repo fact that proves the vulnerable
     condition is connected to the product surface.
   - Record supporting evidence and counterevidence.
   - Record unresolved proof gaps instead of smoothing them over.
6. Classify the product surface and trust boundary:
   - Identify whether the path is a CLI, library API, hosted service,
     local developer UI, MCP/tooling surface, example/demo, test/fixture,
     docs, generated code, vendored code, or unknown surface.
   - Record whether the claimed source is untrusted input in the intended
     product model, or trusted operator/developer configuration.
7. Apply the verdict rules.
8. Assign exploitability stack ranks for `confirmed` and `needs_review`.
9. For `confirmed` findings, optionally add owner hints when local
   ownership evidence (CODEOWNERS, OWNERS, recent git blame on the
   affected file) is easy to derive.
10. Emit one valid `triage-finding/v0` JSON result (see
    `references/triage-result-contract.md`).
11. If the user wants findings tracked, hand off to `track-findings`
    with the confirmed findings. Do not auto-create issues.

## Verdict Rules

Use `confirmed` only when static evidence connects the vulnerable
condition to reachable code under stated preconditions AND the source
crosses an intended security boundary for a shipped, deployed, or
documented product surface. Dependency or component presence alone is
not enough.

Use `not_actionable` only when static evidence positively defeats the
finding, for example:

- The vulnerable package or feature is absent.
- The locked version is outside the affected range.
- The claimed code path is unreachable in the repository's
  configuration.
- The dangerous sink is protected by a relevant guard, validator,
  sanitizer, or authorization control.
- The scanner claim points at dead, test-only, generated, vendored, or
  unused code and repository evidence supports that conclusion.
- The relevant code is example-only, fixture-only, docs-only, local-only,
  or not shipped in the affected artifact.
- The source is trusted configuration, a CLI argument, a local-only tool
  input, or an intentionally code-executing extension point under the
  repository's documented security model.

Use `needs_review` when evidence is insufficient, ambiguous,
runtime-only, policy-dependent, environment-dependent, or blocked by
missing repository context. Prefer `needs_review` over speculative
`confirmed` or `not_actionable` verdicts.

## Exploitability Stack Ranking

After verdicting, assign discrete exploitability stack ranks separately
for `confirmed` and `needs_review` findings.

- `confirmed` findings use the `confirmed` rank queue with positive
  integer ranks `1`, `2`, `3`, ... — `1` is the most exploitable
  confirmed finding in this result set.
- `needs_review` findings use the `needs_review` rank queue with
  independent positive integer ranks starting at `1`.
- Ranks are unique and contiguous from `1` inside each queue. The same
  rank may appear once in each queue.
- `not_actionable` findings are not stack-ranked; set their rank queue
  and rank to `null`.

Rank by exploitability, not by scanner severity alone. Prioritize
findings with clearer attacker reachability, lower required privileges,
fewer preconditions, more direct source-to-sink control, weaker or
absent guards, and more reliable static evidence. Use claimed impact or
scanner severity only as a final tiebreaker.

Keep findings in input order in the JSON result. Use the stack-rank
fields to show priority instead of reordering.

## Output Contract

Emit a `triage-finding/v0` JSON object (see
`references/triage-result-contract.md`) AND a concise Markdown summary
with, per finding:

- Title or input id.
- Verdict and confidence.
- Short rationale.
- Affected locations, if any.
- Reachable path, if established.
- Boundary assessment: product surface, source trust level, policy
  basis, whether a supported security boundary is crossed.
- Exploitability stack rank for `confirmed` and `needs_review`.
- Evidence.
- Counterevidence.
- Proof gaps.
- Owner hint for `confirmed` findings, when available.
- Recommended next step.

If `confirmed` exists, include a `fix-finding` handoff section listing
the vulnerable source/sink/control, attacker input and preconditions,
exact code references, required security invariant, recommended fix
boundary, and proof gaps to preserve or validate.

## Hard Rules

Read `_shared/shared-hard-rules.md` first.

- Do not run tests, builds, applications, PoCs, exploit checks, or
  dynamic validation.
- Do not edit repository files while triaging.
- Do not search for unrelated vulnerabilities.
- Do not claim exhaustive repository coverage.
- Do not claim runtime validation happened.
- Do not mutate Linear, Jira, GitHub, or other backlog sources during
  triage. Tracking mutations belong to `track-findings`.
- Do not mark `confirmed` solely because attacker-influenced data
  reaches a dangerous sink; first establish the relevant product
  surface and supported security boundary.
- Do not dedupe, group, canonicalize, or drop duplicate-looking inputs
  in this skill; keep one result per supplied finding.
- Do not hide proof gaps or turn missing evidence into confidence.