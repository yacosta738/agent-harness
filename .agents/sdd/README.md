# SDD artifacts

This directory holds the repository's durable Spec-Driven Development artifacts. The workflow
uses the OpenSpec file convention here, while keeping its project-facing name under `.agents/`.

```text
.agents/sdd/
├── changes/
│   ├── archive/
│   └── <change-name>/
├── specs/
├── config.yaml
└── README.md
```

Run `/sdd-init` to detect this repository's context and create or update the SDD config and working
directories. Do not add placeholder specs; create them as part of an SDD change.

## Migrating existing projects

On the first `/sdd-init` in a project that has the legacy `openspec/` directory but no
`.agents/sdd/`, move the entire directory to `.agents/sdd/`. This preserves its config, main specs,
active changes, and archived changes without rewriting historical artifacts. If both locations
exist, stop before changing files and resolve any path collisions explicitly; never overwrite or
discard either tree automatically.
