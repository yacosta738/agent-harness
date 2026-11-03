---
name: code-review
description: Use when the user requests a code review, provides a pull request URL, asks whether changes are ready to merge, or needs a 4R/RDD assessment.
---

# Code review

## Primary rule

Every review covers the four lenses of `four-r-review`: **R1 Risk**, **R2 Readability**,
**R3 Reliability**, and **R4 Resilience**. A review cannot be limited to style, and it cannot declare
an outcome without evidence.

Each explicit `/review` invocation starts RDD, even when the global RDD mode is disabled. RDD records
a review; it does not authorize changes, commits, push, GitHub comments, or delivery.

## Target selection

- If the user provides a pull request URL, review that PR.
- If the user provides no URL, review the current working tree against `HEAD`, including staged,
  unstaged, and untracked files.
- If the user provides an argument that is not a PR URL, do not turn it into a shell command or path.
  Ask whether they want to review the PR by URL or the working tree.

### Pull request target

1. Start RDD for the URL. The control plane verifies authentication and the canonical URL, identifies
   the base remote, fetches the refs through separate Git arguments, and re-checks the OIDs without
   changing the working tree:

   ```bash
   node ~/.config/opencode/scripts/review.mjs start --required --cwd "$PWD" --pr-url "<url>"
   ```

   Use `baseSha`, `headSha`, and `changedPaths` from the response. If it cannot verify the PR or fetch
   both commits, stop. Never pick another target as a substitute, and do not use `gh pr checkout`.

2. The control plane computes the merge base and the diff up to `head` before it opens the RDD
   transaction.

### Local target

Without a PR URL, start RDD for the working tree:

```bash
node ~/.config/opencode/scripts/review.mjs start --required --cwd "$PWD"
```

`--required` makes `/review` start RDD without enabling it globally. Do not omit this flag. Do not mix
a PR review with local changes that are not part of that PR.

## Review and RDD evidence

1. Follow the `rdd-review` sequence. Use the binding, the `subjectHash`, the reviewers, and the
   `next_transition` returned by the control plane. Do not reconstruct tokens or identities.
2. Materialize the review with `review.mjs materialize` and give the reviewers only that copy with
   write permissions removed. Do not ask them to inspect the live working tree.
   On Windows, the read-only bit on a directory does not replace an ACL; the control plane re-checks
   the tree during `capture`. If untrusted local processes are present, use a Unix environment.
3. Use the `changedPaths` returned by the control plane to bound the diff. Review those files and the
   necessary context inside the materialized candidate; do not review the whole repository, and do
   not use the live working tree to reconstruct the scope.
4. Run the reviewers indicated by the RDD result. Use `code-reviewer` for a focused review, and `lens`
   plus `mirror` in parallel for a high-risk review. A passive documentation review also receives a
   structural reading with the four lenses.
5. Classify each finding under its primary 4R lens. Record severity, path, impact, and whether the
   candidate causes the finding. Each object in `findings` includes `lens` (`R1`–`R4`), `severity`,
   `candidateCaused`, `file`, and `description`. Explain why a lens does not apply.
6. Capture the findings with the exact `start` bindings and the exact reviewers the control plane
   returned:

   ```bash
   node ~/.config/opencode/scripts/review.mjs materialize --cwd "$PWD" \
     --subject-hash "<subjectHash>"
   node ~/.config/opencode/scripts/review.mjs capture --cwd "$PWD" \
     --lineage "<lineage>" --revision "<revision>" --target "<target>" \
     --subject-hash "<subjectHash>" --candidate-path "<materializedPath>" \
     --findings '<JSON>' --reviewers "<names>" --review-evidence '<JSON>'
   ```

   `review-evidence` must include one record per assigned reviewer, with `reviewer`, `subjectHash`,
   `candidatePath`, `verdict` (`CLEAN` or `FINDINGS`), `findings`, and a `lenses` array with four
   objects. Each object identifies one lens (`R1`, `R2`, `R3`, or `R4`), an `outcome` (`PASS`,
   `FINDING`, or `NOT_APPLICABLE`), and a non-empty `rationale`. Each finding carries a stable `id`
   and the same data (`lens`, `severity`, `candidateCaused`, `file`, `description`) in the global list
   and in the evidence of at least one reviewer. The control plane rejects captures without the exact
   materialized candidate, with inconsistent findings, or without evidence for all four lenses.

7. Continue only according to the returned `next_transition`. If the state is `approved`, use its
   exact binding and token to close the receipt:

   ```bash
   node ~/.config/opencode/scripts/review.mjs acknowledge-approved --cwd "$PWD" \
     --lineage "<lineage>" --revision "<revision>" --target "<target>" \
     --subject-hash "<subjectHash>" --acknowledgement "<token>"
   ```

   If the state is `escalated` or the candidate cannot be materialized, report the blocker and ask the
   user whether to abandon or defer this review. Only with that decision, use the exact binding and
   recovery token returned:

   ```bash
   node ~/.config/opencode/scripts/review.mjs close --cwd "$PWD" \
     --lineage "<lineage>" --revision "<revision>" --target "<target>" \
     --subject-hash "<subjectHash>" --recovery-token "<token>" \
     --resolution "<user decision>"
   ```

   The close is recorded as `closed_without_approval`; never present it as an approval.

8. If the state is `correction_pending`, stop and ask for authorization; do not edit code during a
   review. After an authorized correction, run `review.mjs assess` to obtain the successor
   `candidateTree`. Validate that candidate in an isolated copy and record each check with `command`,
   `status`, `exitCode`, and the same `candidateTree`. For a PR, re-query the OIDs of the same URL; the
   URL cannot change. Capture the successor with
   `capture-correction --validator-status PASS --validation-evidence <JSON> --pr-url <url>` for a PR;
   the control plane resolves the URL again. Do not capture `PASS` without validations that are
   approved and bound to the tree hash. Materialize the successor candidate and review it again with
   4R and the reviewers returned by the control plane. Use the new binding to capture that review. An
   additional CRITICAL/P0/P1 finding escalates and does not allow another correction.

The control plane validates the structure and binding of `validationEvidence`, but it does not run the
command the agent records. Preserve the real process result, and do not present this evidence as an
independent verification by the control plane.

## Related tools

- Use `coderabbit-review` when the user requests CodeRabbit or when the approved workflow requires it.
  Classify its findings with 4R, but do not present them as a manual review.
- Use `double-blind-review` for explicit adversarial reviews or when risk requires two reviewers. The
  high-risk RDD cycle already requires `lens` and `mirror`; do not duplicate a second round for the
  same target without a reason.
- `/pr-watch` keeps ownership of comments, threads, and workflows. Use this skill to evaluate code when
  a thread or a correction needs it; do not start another RDD cycle from `/pr-watch`.

## Report

Present findings by severity and lens first, then the evidence for the four lenses, the target and the
RDD OID/state, the validations you ran, the limitations, and the next transition or human decision.
Do not declare approval when evidence is missing or when the control plane returns
`Needs your decision`.
