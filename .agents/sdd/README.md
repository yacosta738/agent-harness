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
