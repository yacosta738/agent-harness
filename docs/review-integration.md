# Review integration contract

`agent-harness.review/v1` is an opt-in review transaction. The control plane owns candidate freezing,
lineage, revision, target binding, risk classification, reviewer slots, one correction budget, exact
acknowledgement, and terminal burn. Review is evidence, not delivery authority.

`review mode enable` is the only global opt-in. Clone-local disable wins. Every transition returns one
exact `next_transition`; callers must relay its tokens unchanged. Stale, mismatched, malformed, or
unavailable evidence fails closed.

Reviewers inspect a read-only materialization of the frozen Git tree. They never inspect the live
worktree or infer success from narrative output. Commit, push, PR, release, and archive remain governed
by ordinary repository policy. The existing manual `double-blind-review` flow remains separate.
