---
description: Review a pull request URL or the local working tree with mandatory 4R and RDD.
agent: kerrigan
---

# Code review

Use the `code-review` skill and follow its procedure. Every `/review` invocation starts RDD and applies
the four 4R lenses.

## Target selection

- If `$ARGUMENTS` contains an HTTPS pull request URL, review that PR.
- If the user provides no argument, review the local working tree against `HEAD`.
- If the user provides an argument that is not a PR URL, stop and ask which of those two targets they
  want to review.

For a PR, start RDD with its URL. The control plane validates the URL and fetches the refs without
changing the working tree:

```bash
node ~/.config/opencode/scripts/review.mjs start --required --cwd "$PWD" --pr-url "<url>"
```

The command verifies authentication, the canonical URL, the remote, and the OIDs; it returns `baseSha`,
`headSha`, and `changedPaths`. Do not use `gh pr checkout`. If it cannot verify the PR, stop and do not
review another target as a substitute.

Without a PR URL, start RDD for the local working tree:

```bash
node ~/.config/opencode/scripts/review.mjs start --required --cwd "$PWD"
```

Materialize the candidate and review only that copy with write permissions removed. Use the reviewers
and transitions the control plane returns. Bound the review with its `changedPaths`; review those
files and only the necessary context. Cover R1 Risk, R2 Readability, R3 Reliability, and R4 Resilience
in every review; record evidence even when a lens does not apply.

Do not fix code, do not publish GitHub comments, and do not commit or push. `/pr-watch` keeps
ownership of threads and workflows. If RDD requires a correction or evidence is missing, stop and
report the decision or the outstanding requirement.
