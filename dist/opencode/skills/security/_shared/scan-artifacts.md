# Security Scan Artifacts — Paths and Conventions

These are the default locations for security skill outputs in the opencode
setup. If the user explicitly provides a different path for a required input
or output, use the user-provided path instead.

## Base Paths

- `repo_name` = `<basename of repo_root>`
- `security_scans_dir` = `<repo_root>/.security/scans/<repo_name>`
- `scan_id` = `<short_commit>_<UTC timestamp YYYYMMDDTHHMMSSZ>`
- `scan_dir` = `<security_scans_dir>/<scan_id>`
- `artifacts_dir` = `<scan_dir>/artifacts`
- `context_dir` = `<artifacts_dir>/01_context`
- `discovery_dir` = `<artifacts_dir>/02_discovery`
- `coverage_dir` = `<artifacts_dir>/03_coverage`
- `reconciliation_dir` = `<artifacts_dir>/04_reconciliation`
- `findings_dir` = `<artifacts_dir>/05_findings`

For one-off skills that do not produce a full scan (e.g. `triage-finding`,
`fix-finding` for a single finding), these per-scan directories are optional —
a chat summary is enough unless the user asks for files.

## Threat Model (Phase 1) Paths

- Repository-scoped threat model: `<security_scans_dir>/threat_model.md`
- Per-scan threat model copy: `<context_dir>/threat_model.md`
- Later phases treat `<context_dir>/threat_model.md` as the source of truth
  when present; otherwise read the repository-scoped file directly.
- When a repository-scoped threat model already exists, copy it to
  `<context_dir>/threat_model.md` without alteration for auditability.

## Finding Discovery (Phase 2) Paths

### Coverage planning

- Advisory seed research: `<context_dir>/seed_research.md` (optional)
- Discovery report: `<discovery_dir>/finding_discovery_report.md`

### Candidates

- Raw candidates: `<discovery_dir>/raw_candidates.jsonl`
- Per-finding directory: `<findings_dir>/<candidate_id>/`
- Per-finding candidate ledger: `<findings_dir>/<candidate_id>/candidate_ledger.jsonl`
- Dedupe report: `<reconciliation_dir>/dedupe_report.md` (optional)
- Deduped candidates: `<reconciliation_dir>/deduped_candidates.jsonl`

### Coverage

- Repository coverage ledger: `<coverage_dir>/repository_coverage_ledger.md`

## Validation (Phase 3) Paths

- Per-finding validation report: `<findings_dir>/<candidate_id>/validation_report.md`
- Per-finding validation artifacts: `<findings_dir>/<candidate_id>/validation_artifacts/`

## Attack-Path Analysis (Phase 4) Paths

- Per-finding attack-path report: `<findings_dir>/<candidate_id>/attack_path_report.md`

## Final Report Paths

- Final scan report: `<scan_dir>/report.md`
- Triage result: `<scan_dir>/triage_result.json` (for `triage-finding`)

## Fix Finding Paths

- Fix report, when using an existing scan directory:
  `<artifacts_dir>/fix_report.md`

## Placement Rules

- Put scan phase outputs and supporting evidence under the numbered artifact
  subdirectories above.
- Keep fix-finding outputs outside the numbered scan phases.
- Author the final report from canonical JSON. In this opencode setup we do
  not run a finalization script — the skill that produces the report writes
  both the JSON and the markdown projection itself.
- Keep the full scan bundle together under `scan_dir`.