---
description: Run one pass on a GitHub pull request, address in-scope review feedback, and report workflow status and remaining blockers.
---

# Run one GitHub pull request pass

Run one complete review-and-follow-up pass for one pull request. This command does not schedule
future checks or continue in the background. If review threads or workflows remain pending, report
them with the exact next action; the user can run `/pr-watch` again later.

## Resolve the pull request

1. Before any GitHub CLI lookup, check `gh auth status` and confirm access. If authentication fails,
   stop and ask the user to authenticate. Run GitHub CLI commands with the network access required
   by the environment.
2. If `{argument}` contains a PR URL or number, use it to identify the pull request.
3. Otherwise, identify the pull request for the current branch with GitHub CLI (`gh`).
4. Confirm the repository and PR URL before making changes. If the target is missing or ambiguous,
   ask the user and stop.

## Review and address feedback

1. Inspect all open review threads, including inline comments, thread resolution state, outdated
   state, file paths, and line anchors. Use `gh-address-comments` and its prescribed thread-aware
   GraphQL workflow; do not rely on a flat comment list to determine thread state.
2. Read each thread in context and classify it as **applicable**, **not applicable**, or **needs
   clarification**. Do not dismiss a comment only because it is outdated; verify whether the
   underlying concern remains relevant.
3. For applicable feedback, make the smallest safe change within the PR's scope. Add or update a
   regression test when the feedback identifies a defect. Run the relevant focused checks. Do not
   commit, push, or expand the scope without the user's request.
4. For feedback that does not apply, post a concise, evidence-based explanation in that exact GitHub
   thread, then resolve the thread. State the relevant code or behavior and why the requested change
   is unnecessary. Do not use a generic response.
5. For applicable feedback that has been fixed, confirm the fix is present on the remote PR head
   before replying in its thread with a concise summary and verification evidence, then resolve the
   thread. A change only in the local working tree does not meet this condition: keep the thread
   unresolved and report it as blocked until the fix is present on the remote PR head. If the review
   convention or permissions do not allow resolving it, report that instead of implying it is
   resolved.
6. If the thread is ambiguous, the fix is unsafe, or it requires a product decision, do not guess.
   Ask the user and leave the thread unresolved until they decide.
7. Treat invoking `/pr-watch` as authorization to make in-scope changes and post the necessary
   replies and resolutions on the identified PR. A request to review only, or any explicit
   instruction not to write to GitHub, overrides that authorization.

## Check workflows

1. Inspect all checks and workflow runs associated with the PR. Use `gh pr checks` and, when needed,
   inspect the relevant workflow run and job logs.
2. Do not poll or wait for running checks. Report their current state as pending. If a check has
   failed, inspect its logs and determine whether the failure is caused by this PR.
3. Fix failures caused by this PR when the fix is within scope, then run the relevant local checks.
   Do not modify unrelated workflows or code to hide a failure.
4. For infrastructure, permissions, flaky, or otherwise external failures, do not claim success.
   Record the check, evidence, and the action required from a maintainer or external system.
5. A workflow is passing only when GitHub reports a successful conclusion. Skipped or neutral checks
   are not equivalent to a pass; report them distinctly and explain if they block the PR.

## One-pass execution boundary

- Run one complete pass: inspect feedback, make authorized in-scope changes, inspect current workflow
  results, and report the final state observed during this invocation.
- Do not schedule another pass, sleep, or claim that monitoring will continue after the command ends.
- If a thread or workflow remains unresolved, pending, or blocked, list it and state the exact next
  action. The user can rerun `/pr-watch` to check for later changes.

## Final report

Report the PR URL, number of comments reviewed, changes made and checks run, thread resolution
status, and each workflow result. State whether all threads and required workflows are complete. If
not, identify each blocker with evidence and the next action. Do not claim success without checking
the final GitHub state.
