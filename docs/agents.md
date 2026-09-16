# Agents

This OpenCode-first harness has 16 registered root agents. Kerrigan also exposes ten embedded
specialist profiles. Registration is not proof of runtime activation: the generated effective tree
and the OpenCode runtime must both be checked.

## Registered agents

| Agent | Mode | Writes | Delegates | Tools | Output | Lifecycle |
|---|---|---:|---:|---|---|---|
| `kerrigan` | primary | yes | yes | shell, MCP, delegation | decision + evidence | ODD coordinator |
| `linear-pm` | subagent | no | no | Linear MCP | issue/sprint result | delegated direct |
| `sdd-init` | hidden subagent | yes | no | shell, filesystem | initialized SDD state | SDD init |
| `sdd-explore` | hidden subagent | yes | no | shell, search | exploration artifact | SDD explore |
| `sdd-propose` | hidden subagent | yes | no | filesystem | proposal | SDD propose |
| `sdd-spec` | hidden subagent | yes | no | filesystem | delta specs | SDD spec |
| `sdd-design` | hidden subagent | yes | no | shell, filesystem | design | SDD design |
| `sdd-tasks` | hidden subagent | yes | no | filesystem | task DAG | SDD tasks |
| `sdd-apply` | hidden subagent | yes | no | shell, filesystem | implementation evidence | SDD apply |
| `sdd-verify` | hidden subagent | yes | no | shell, tests | verification report | SDD verify |
| `sdd-qa` | hidden subagent | no | no | shell, tests | QA evidence | SDD QA |
| `sdd-archive` | hidden subagent | yes | no | filesystem, git | archive reports | SDD archive |
| `sdd-onboard` | subagent | yes | no | shell, filesystem | onboarding state | SDD lifecycle |
| `lens` | subagent | no | no | read-only tree | independent findings | RDD high-risk review |
| `mirror` | subagent | no | no | read-only tree | independent findings | RDD high-risk review |
| `scalpel` | subagent | yes | no | bounded shell, filesystem | correction diff | RDD correction |

## Kerrigan specialists

`tech-lead`, `senior-dev`, `devops-engineer`, `qa-engineer`, `security-engineer`, `product-manager`,
`code-reviewer`, `performance-engineer`, `ux-designer`, and `data-engineer` are embedded profiles
selected by the orchestrator for delegated direct work. They are not additional root agents.

## Boundaries

Delegated background sessions are process-local and do not provide filesystem isolation. Do not use
parallel writers in one worktree. SDD phase agents are only admitted after explicit SDD selection.
