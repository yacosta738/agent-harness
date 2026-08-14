# Diagram Design Snapshot Provenance

## Pinned source

- **Canonical upstream URL:** https://github.com/cathrynlavery/diagram-design
- **Upstream commit:** `a5e3978088cf89c7caff5c20cabd99fbc2a301de`
- **Upstream version:** `2.3.5`
- **Upstream skill subpath:** `skills/diagram-design/`
- **Local path:** `skills/design/diagram-design/`
- **Snapshot date:** `2026-08-14`
- **Snapshot status:** Slice 1 of 6 — identity and licensing metadata only; this is **not a complete snapshot**.

`SKILL.md` is copied byte-for-byte from the pinned upstream commit. This slice intentionally does
not copy the skill's `references/**`, `scripts/**`, or `assets/**` trees. Those families remain
pending dependency-ordered slices and are explicitly represented as pending in
`SNAPSHOT-MANIFEST.sha256`.

## Refresh policy

There is no automatic refresh, runtime fetch, or implicit network resolution. Refreshes MUST be
explicit, reviewable changes that:

1. select and record a new upstream commit and released version;
2. copy the complete skill tree in dependency order, preserving relative paths;
3. update this provenance record, licensing notices, and the snapshot manifest together; and
4. rerun the focused identity, path, hash, and available upstream smoke checks before review.

The existing pinned baseline MUST remain intact until the refresh has been reviewed. A refresh MUST
not alter `opencode.json` or install dependencies implicitly.

## Excluded upstream content

The following upstream content is deliberately not vendored into this local skill path:

- **Client-specific manifests and integration surfaces:** `.agents/plugins/marketplace.json`,
  `.claude-plugin/**`, `.codex-plugin/**`, `commands/**`, and `prompts/**`.
- **Upstream CI and repository automation:** `.github/**`.
- **Upstream screenshots:** `docs/screenshots/**`.
- **Upstream documentation outside the Agent Skill:** `docs/**` (including ADRs), root
  `README.md`, `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, and `SECURITY.md`.
- **Upstream repository-level tooling:** root `scripts/**` and other repository packaging files
  that are not under the shared skill subtree.
- **The upstream root third-party index:** `THIRD_PARTY_LICENSES.md`; its source attributions are
  carried forward in the local `THIRD-PARTY-NOTICES.md` without inventing additional license terms.

The following are **pending, not permanently excluded**: upstream
`skills/diagram-design/references/**`, `skills/diagram-design/scripts/**`, and
`skills/diagram-design/assets/**`. They are intentionally absent from slice 1 and MUST be added in
their assigned later slices before the overall change can claim a complete snapshot.
