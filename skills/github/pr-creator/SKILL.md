---
name: pr-creator
description: Use when asked to create a pull request (PR) while preserving repository templates and standards. Supports evidence-driven PR descriptions with adaptive evidence selection and review assessment.
---

# Pull Request Creator

This skill guides the creation of high-quality Pull Requests that adhere to the
repository's standards. It supports evidence-driven descriptions that help reviewers
understand what changed, why, and what risks it introduces.

## References

- `references/evidence-capture.md` — Adaptive evidence selection by change type, capture
  requirements, and security rules.
- `references/review-assessment.md` — Review Effort and Change Risk classification frameworks.

## Related Skills

- Use `reviewable-pr-slices` before opening a PR when the diff may approach or exceed the
  repository's review budget, default 400 changed lines.
- Use `cognitive-doc-design` when drafting dense PR descriptions or review notes.
- Use `work-unit-commits` when deciding whether the PR should be split into multiple commits or
  slices.
- Use `github-stacked-prs` when the approved strategy is `github-stacked-prs`; it owns Stack state,
  while this skill owns template-compliant PR content.
- Preserve `feature-branch-chain` as a separate workflow and never infer it from a GitHub Stack.

## Workflow

For a Stack layer, require a complete work-unit record before drafting: `chain_strategy`,
`trunk`, `parent_branch`, `base`, `head`, `position`, total layers, issue reference, and optional
Linear URL. The bottom layer's `base` is the trunk; each higher layer's `base` is the immediate
parent branch. Stop on a wrong or ambiguous base/head, duplicate PR, dirty state, or missing layer
scope rather than guessing.

After the repository template, append this section without replacing any template heading:

```markdown
## Chain Context

| Field | Value |
|---|---|
| Strategy | `github-stacked-prs` / `feature-branch-chain` / `single-pr` / `size-exception` |
| Chain | <name> |
| Position | <N of total> |
| Base | `<base>` |
| Head | `<head>` |
| Depends on | <PR/issue/link or "None"> |
| Follow-up | <next PR or "None"> |
| Review budget | <changed lines> / <budget> |
| Issue | <#N or "None"> |
| Linear | <URL or "None"> |
| Starts at | <state this builds on> |
| Ends with | <standalone result delivered> |
```

Use `Related #N` for informational issue traceability and `Fixes #N` only for intentional closure.
Linear is metadata only; Git/GitHub own branch, PR, Stack, synchronization, and merge state.

Follow these steps to create a Pull Request:

1. **Locate Template**: Search for a pull request template in the repository.

- Check `.github/pull_request_template.md`
- Check `.github/PULL_REQUEST_TEMPLATE.md`
- If multiple templates exist (e.g., in `.github/PULL_REQUEST_TEMPLATE/`),
  ask the user which one to use or select the most appropriate one based on
  the context (e.g., `bug_fix.md` vs `feature.md`).

2. **Read Template**: Read the content of the identified template file.

3. **Draft Description**: Create a PR description that strictly follows the
   template's structure and lowers reviewer cognitive load.

- **Lead with the answer**: Explain what changed and why before deep context.
- **Review path**: Call out what reviewers should inspect first and what is out of scope.
- **Verification**: List exact checks, commands, or manual validation performed.
- **Headings**: Keep all headings from the template.
- **Checklists**: Review each item. Mark with `[x]` if completed. If an item
  is not applicable, leave it unchecked or mark as `[ ]` (depending on the
  template's instructions) or remove it if the template allows flexibility (but prefer keeping it
  unchecked for transparency).
- **Content**: Fill in the sections with clear, concise summaries of your
  changes.
- **Related Issues**: Link any issues fixed or related to this PR (e.g.,
  "Fixes #123").

4. **Identify Evidence**: Determine the change type and select appropriate evidence
   using `references/evidence-capture.md`. Evidence is adaptive — a documentation-only change
   needs no screenshots, while a UI change benefits from before/after comparisons.

- Identify the change type: visual UI, interactive flow, API, CLI, bug fix, architecture,
  performance, documentation, or configuration.
- Capture real evidence when tools are available: before/after states, comparable screenshots,
  API request/response pairs, or CLI output.
- If capture mechanisms are unavailable, report the limitation truthfully instead of fabricating
  evidence.
- Sanitize all evidence: never publish credentials, tokens, or sensitive data.
- Include evidence in the PR description using GitHub-native Markdown (images, code blocks,
  tables). Do not create empty evidence sections.

5. **Assess Review**: Classify Review Effort and Change Risk independently using
   `references/review-assessment.md`.

- **Review Effort** (Low/Medium/High): Cognitive work required — consider changed lines,
  conceptual complexity, affected boundaries, and reviewer context.
- **Change Risk** (Low/Medium/High): Operational impact if a defect is missed — consider
  security sensitivity, data migrations, compatibility, and destructive operations.
- Provide a short explanation for each classification based on observable facts.
- Add both classifications to the PR description where relevant. Skip for trivial changes
  where the classification is obvious.
- These complement the review budget check, not replace it.

6. **Check Review Budget**: Before creating the PR, resolve the intended base and head branches,
   then inspect the diff size against the PR base. If the size cannot be measured, surface the
   blocker and get explicit user approval before continuing. Treat roughly 300+ changed lines as
   approaching the default 400-line budget. If the planned PR approaches or exceeds the repository
   budget, stop, load `reviewable-pr-slices`, and require the canonical `github-stacked-prs`,
   `feature-branch-chain`, or explicitly approved `size-exception` strategy before continuing.

7. **Create PR**: Use the `gh` CLI to create the PR. To avoid shell escaping
   issues with multi-line Markdown, write the description to a temporary file
   first.

    ```bash
    tmp_file="$(mktemp)"
    trap 'rm -f "$tmp_file"' EXIT
    # Write the drafted description to "$tmp_file"
    gh pr create --base <base_branch> --head <head_branch> --title "type(scope): succinct description" --body-file "$tmp_file"
    ```

- **Title**: Use a semantic PR title following
  [Conventional Commits](https://www.conventionalcommits.org/) style when the
  repository supports it (e.g., `feat(ui): add new button`,
  `fix(core): resolve crash`, `chore(ci): update workflow permissions`).
- **Attach evidence** — If the PR includes captured images or videos, attach them
  using `--attach` (requires `gh >= 2.99.0`). Verify version and authentication first.
  Reference each file in the body using local paths (e.g., `![Before](./evidence/before.png)`);
  GitHub CLI rewrites these to uploaded URLs. Add `--attach './evidence/before.png#Alt text'`
  for each evidence file. If `--attach` is unavailable, commit evidence files to the branch
  and reference them using raw GitHub URLs. Sanitize all evidence before attaching — never
  upload credentials or sensitive data.

8. **Align Semantics**: Keep branch name, commit message, and PR title aligned in
   intent.

- Good alignment: `feat/search-shortcuts` → `feat: add search shortcuts` →
  `feat: add search shortcuts`
- Avoid mixing intents like `chore/...` branch with `feat:` PR title unless
  the actual scope changed and you explicitly renamed the branch strategy.

## Principles

- **Compliance**: Never ignore the PR template. It exists for a reason.
- **Completeness**: Fill out all relevant sections.
- **Accuracy**: Don't check boxes for tasks you haven't done.
- **Proportionality**: Evidence and assessment should be proportional to the change. A
  documentation-only change needs no screenshots; a small security fix is low effort but high risk.
- **Trust**: Never fabricate evidence, measurements, or validation results. Report limitations
  truthfully. Sanitize sensitive data before publication.
