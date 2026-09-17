# OpenCode overlay

This adapter supplements the portable policy in the repository root with OpenCode-specific runtime assumptions.

- Keep portable policy authoritative for routing and governance.
- Keep OpenCode-specific defaults in this adapter layer.
- Copy only the files explicitly selected by the adapter preset.
- Preserve deterministic ordering so the generated bundle is stable across equivalent renders.
