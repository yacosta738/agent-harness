# Triage Result Contract — `triage-finding/v0`

This is the JSON shape emitted by the `triage-finding` skill. The
Markdown summary is for human reading; this JSON is for tooling, audit
trails, and downstream skills (especially `track-findings`).

## Top-level shape

```json
{
  "schema_version": "triage-finding/v0",
  "repository_path": "/abs/path/to/repo",
  "repository_revision": "git_revision_or_null",
  "source_type": "linear_issue",
  "items": [
    {
      "triage_item_id": "triage-001",
      "input_id": "TEAM-123",
      "title": "SSRF in import_url parameter",
      "source_type": "linear_issue",
      "verdict": "confirmed",
      "confidence": "high",
      "rank_queue": "confirmed",
      "exploitability_stack_rank": 1,
      "boundary_assessment": {
        "product_surface": "hosted_service",
        "source_trust_level": "untrusted_input",
        "policy_basis": "SECURITY.md trusts only signed webhook bodies",
        "boundary_crossed": true,
        "notes": "Web handler accepts attacker-supplied URL on POST /import"
      },
      "affected_locations": [
        {
          "label": "entrypoint",
          "path": "src/api/imports.py",
          "lines": "42-78"
        }
      ],
      "reachable_path": "POST /api/imports → imports.handler → fetcher.fetch(url) → requests.get(url)",
      "evidence": [
        {
          "path": "src/api/imports.py",
          "lines": "54",
          "quote": "url = request.json['import_url']"
        }
      ],
      "counterevidence": [],
      "proof_gaps": [],
      "owner_hint": "@team-platform",
      "recommended_next_step": "fix-finding",
      "fix_handoff": {
        "vulnerable_source_sink_or_control": "requests.get(url) at src/api/imports.py:67",
        "attacker_input": "import_url POST body field",
        "preconditions": ["authenticated user"],
        "exact_code_references": [
          {"path": "src/api/imports.py", "lines": "54, 67"}
        ],
        "required_security_invariant": "import_url must resolve only to an allowlisted host set",
        "recommended_fix_boundary": "Add allowlist check in fetcher.fetch() before requests.get",
        "proof_gaps_to_preserve": ["Confirm allowlist config exists in production"]
      }
    }
  ]
}
```

## Field rules

- `schema_version` is exactly `"triage-finding/v0"`.
- `verdict` is one of `confirmed`, `not_actionable`, `needs_review`.
- `confidence` is one of `high`, `medium`, `low`.
- `rank_queue` is one of `confirmed`, `needs_review`, or `null`.
- `exploitability_stack_rank` is a positive integer or `null`.
- `boundary_assessment.boundary_crossed` is a boolean.
- `affected_locations[].label` is one of `entrypoint`, `wrapper`,
  `root_control`, `sink`, `concrete_implementation`.
- `affected_locations[].lines` is always a string.
- One result object per input finding, in input order.

## Schema check

A valid result must include:

- `schema_version`
- `repository_path`
- `items` with at least one entry
- every item has `triage_item_id`, `verdict`, `source_type`,
  `boundary_assessment`, `rank_queue`, `exploitability_stack_rank`

Downstream skills (`track-findings`) reject results missing required
fields.