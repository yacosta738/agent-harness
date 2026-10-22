---
description: Monitor a GitHub pull request, address review feedback, and verify all workflows until clear or one hour elapses.
---

# Watch a GitHub pull request

Run a focused review-and-follow-up cycle for one pull request. Continue checking for new review feedback and workflow results every 5 minutes, for no more than 1 hour. Record an absolute monitoring deadline one hour from the command's start and keep it unchanged across passes. Use the `goal` skill to schedule repeated checks; perform the first check immediately.

## Resolve the pull request

1. Before any GitHub CLI lookup, check `gh auth status` and confirm access. If authentication fails, stop and ask the user to authenticate. Run GitHub CLI commands with the network access required by the environment.
2. If `{argument}` contains a PR URL or number, use it to identify the pull request.
3. Otherwise, identify the pull request for the current branch with GitHub CLI (`gh`).
4. Confirm the repository and PR URL before making changes. If the target is missing or ambiguous, ask the user and stop.

## Review and address feedback

1. Inspect all open review threads, including inline comments, thread resolution state, outdated state, file paths, and line anchors. Use `gh-address-comments` and its prescribed thread-aware GraphQL workflow; do not rely on a flat comment list to determine thread state.
2. Read each thread in context and classify it as **applicable**, **not applicable**, or **needs clarification**. Do not dismiss a comment only because it is outdated; verify whether the underlying concern remains relevant.
3. For applicable feedback, make the smallest safe change within the PR's scope. Add or update a regression test when the feedback identifies a defect. Run the relevant focused checks. Do not commit, push, or expand the scope without the user's request.
4. For feedback that does not apply, post a concise, evidence-based explanation in that exact GitHub thread, then resolve the thread. State the relevant code or behavior and why the requested change is unnecessary. Do not use a generic response.
5. For applicable feedback that has been fixed, reply in its thread with a concise summary and verification evidence, then resolve the thread only after confirming the fix is present. If the review convention or permissions do not allow resolving it, report that instead of implying it is resolved.
6. If the thread is ambiguous, the fix is unsafe, or it requires a product decision, do not guess. Ask the user and leave the thread unresolved until they decide.
7. Treat invoking `/pr-watch` as authorization to make in-scope changes and post the necessary replies and resolutions on the identified PR. A request to review only, or any explicit instruction not to write to GitHub, overrides that authorization.

## Check workflows

1. Inspect all checks and workflow runs associated with the PR. Use `gh pr checks` and, when needed, inspect the relevant workflow run and job logs.
2. Wait for running checks only until the absolute monitoring deadline. At the deadline, stop monitoring and report any checks still running as pending. If any check fails before the deadline, inspect its logs and determine whether the failure is caused by this PR.
3. Fix failures caused by this PR when the fix is within scope, then run the relevant local checks. Do not modify unrelated workflows or code to hide a failure.
4. For infrastructure, permissions, flaky, or otherwise external failures, do not claim success. Record the check, evidence, and the action required from a maintainer or external system.
5. A workflow is passing only when GitHub reports a successful conclusion. Skipped or neutral checks are not equivalent to a pass; report them distinctly and explain if they block the PR.

## Monitoring loop

- Run a complete initial pass immediately: inspect unresolved feedback, address in-scope items, and inspect the latest workflow status.
- Unless the stop-early condition below is met, if any thread remains unresolved and is not explicitly marked as blocked pending the user's decision, any workflow is pending/failing, or new activity may have arrived, schedule another full pass in 5 minutes using the `goal` skill. Set its `timeout` to the time remaining before the absolute monitoring deadline.
- Stop at the absolute monitoring deadline. Count the initial pass as the first attempt; allow up to 12 subsequent 5-minute checks within the one-hour limit. Do not schedule checks beyond the deadline.
- Before each check, refresh PR threads and workflow status. Do not repeat a reply or resolution already completed; verify the current GitHub state first.
- Stop early only when every review thread is resolved (or explicitly reported as blocked pending the user's decision) and every required workflow check has a successful conclusion. Report any blocked item; do not present blocked work as complete.
- If the runtime cannot keep the monitoring loop active, or reaches its time/attempt limit, stop and report that monitoring ended. List every unresolved thread, pending or failed workflow, what was attempted, and the exact next action. Never claim background monitoring will continue after the command/session ends.

## Final report

Report the PR URL, number of comments reviewed, changes made and checks run, thread resolution status, and each workflow result. State whether all threads and required workflows are complete. If not, identify each blocker with evidence and the next action. Do not claim success without checking the final GitHub state.
