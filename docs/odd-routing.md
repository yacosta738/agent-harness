# ODD and routing

ODD keeps everyday work lightweight: authorize → explore → resolve uncertainty → classify → track
substantial work → implement → check → close. Public progress is `Working`, `Checking`, `Ready`, or
`Needs your decision`.

| Route | Select when | Behavior |
|---|---|---|
| Direct inline | Already understood, bounded action | Keep work in the current session |
| Delegated direct | Fresh context helps exploration, writing, testing, or review | Delegate one narrow mission |
| Explicit SDD | User requests or accepts durable phase artifacts | Run the existing SDD DAG |

Risk, size, ambiguity, persistence, architecture, and file count never enroll a request in SDD.
Brainstorming and systematic debugging remain internal ODD techniques.

Substantial authorized work creates `odd/tasks/<feature>.md` before the first source write and mirrors
it to Engram. Small or read-only work creates no durable task artifact.
