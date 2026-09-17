# Organic RDD architecture

```text
ODD route → implementation + checks → RDD disabled → ordinary delivery policy
                              ↘ RDD enabled → assess → start/freeze → capture
                                             ↘ one bounded correction → validator
                                             → approved → exact acknowledge → burned
```

The candidate is represented by a Git tree built through a temporary index. The real worktree and
index remain untouched. A transaction binds canonical worktree, base SHA, candidate tree, subject hash,
lineage, revision, and target token. The control plane is the sole lifecycle authority; agents are
opaque transports for bounded reviewer/fixer work.

RDD never grants delivery permission. A failed validator, stale binding, transport error, or uncertain
terminal outcome is escalated or surfaced for a user decision rather than treated as approval.
