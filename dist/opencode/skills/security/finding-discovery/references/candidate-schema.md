# Candidate Schema — finding-discovery

Each row in `raw_candidates.jsonl` and `deduped_candidates.jsonl` is one
JSON object. Use the same shape for both files; `raw` may include a
`source_worker` or `source_round` field for provenance.

## Required fields

```json
{
  "candidate_id": "disc-001",
  "title": "SQL injection in user search via order_by parameter",
  "affected_locations": [
    {
      "label": "entrypoint",
      "path": "src/api/users.py",
      "lines": "42-78",
      "detail": "GET /api/users handler"
    },
    {
      "label": "root_control",
      "path": "src/db/query_builder.py",
      "lines": "112",
      "detail": "order_by spliced into raw SQL"
    },
    {
      "label": "sink",
      "path": "src/db/query_builder.py",
      "lines": "120",
      "detail": "cursor.execute(raw_sql)"
    }
  ],
  "attacker_source": "HTTP GET parameter ?order_by=...",
  "sink_or_broken_control": "Raw SQL execution with attacker-controlled ORDER BY clause",
  "impact": "Read or modify arbitrary rows, bypass row-level filters",
  "why_plausible": "The query_builder concatenates `order_by` directly into the SQL string after only a `str.isidentifier()` check, which passes for SQL keywords like `CASE WHEN (SELECT ...)`.",
  "closest_control": "str.isidentifier() in query_builder.py:114",
  "control_weakness": "Bypass: isidentifier() accepts SQL keywords; allowlist is incomplete.",
  "validation_recommended": "yes",
  "cwe": ["CWE-89"],
  "seed_or_advisory_ref": null,
  "source_worker": "discovery-worker-01",
  "source_round": 1
}
```

## Allowed `label` values

- `entrypoint` — where attacker input first enters the system
- `wrapper` — helper or facade that bridges entrypoint to sink
- `root_control` — the line where the security invariant should be enforced
  but is missing or broken
- `sink` — the dangerous operation that consumes attacker input
- `concrete_implementation` — concrete subclass or operation variant that
  selects attacker-controlled semantics (e.g. an `Operation` subclass that
  delegates to a shared broken control)

## Optional fields

- `family`: short family tag like `sqli`, `ssrf`, `path-traversal`,
  `authz-bypass`, `deserialization`, `ssti`, `secrets-exposure`.
- `instance_key`: `<family>:<file>:<line>` for repository-wide scans.
- `cross_file_proof`: list of `{path, lines, claim}` rows proving the
  vulnerability spans files.
- `notes`: free-form annotations.

## Validation rules

- `lines` is always a string, including single-line locations (`"154"`).
- `path` is always a repo-relative path string.
- `label` is one of the allowed values.
- `affected_locations` must include at least one item, and at least one
  item must be labeled `sink` or `root_control`.