# Diagram Design Snapshot Provenance

## Pinned source

- **Canonical upstream URL:** https://github.com/cathrynlavery/diagram-design
- **Upstream commit:** `a5e3978088cf89c7caff5c20cabd99fbc2a301de`
- **Upstream version:** `2.3.5`
- **Upstream skill subpath:** `skills/diagram-design/`
- **Local path:** `skills/design/diagram-design/`
- **Snapshot date:** `2026-08-14`
- **Snapshot status:** Slice 4 of 6 — identity/licensing metadata and the complete `references/**`, `scripts/**`, and `assets/**` trees are present; this is a complete skill snapshot. Only client-specific and upstream repository content outside the Agent Skill, listed below, remains excluded.

`SKILL.md` is copied byte-for-byte from the pinned upstream commit. The complete `references/**`,
`scripts/**`, and `assets/**` trees are also copied byte-for-byte, preserving the upstream relative
paths and file modes. The snapshot is complete for the Agent Skill subtree; its manifest records
every present skill, metadata, reference, script, and asset file.

## Runtime expectations for the complete snapshot

- `scripts/drawio_extract.py`, `scripts/mermaid_extract.py`, and `scripts/self_check.py` require
  Python 3 and use only the Python standard library; this integration adds no dependencies.
- `self_check.py` can validate static HTML and motion-aware HTML. Motion-controller validation uses
  the canonical `assets/template-motion.html`, which is present in this complete snapshot.
- The templates, examples, gallery, and icon assets are local static resources. Browser/Playwright
  capabilities remain optional and MUST be reported when unavailable; no tool is installed or
  fetched implicitly.

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

No `references/**`, `scripts/**`, or `assets/**` subtree remains pending. The only omitted upstream
content is the client-specific and repository-level material listed above; it is outside the Agent
Skill subtree and is intentionally not vendored.
