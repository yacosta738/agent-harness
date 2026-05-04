---
name: pr-creator
description: Use when asked to create a pull request (PR) while preserving repository templates and standards.
---

# Pull Request Creator

This skill guides the creation of high-quality Pull Requests that adhere to the
repository's standards.

## Related Skills

- Use `reviewable-pr-slices` before opening a PR when the diff may approach or exceed the
  repository's review budget, default 400 changed lines.
- Use `cognitive-doc-design` when drafting dense PR descriptions or review notes.
- Use `work-unit-commits` when deciding whether the PR should be split into multiple commits or
  slices.

## Workflow

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
  template's instructions) or remove it if the template allows flexibility
  (but prefer keeping it unchecked for transparency).
- **Content**: Fill in the sections with clear, concise summaries of your
  changes.
- **Related Issues**: Link any issues fixed or related to this PR (e.g.,
  "Fixes #123").

4. **Check Review Budget**: Before creating the PR, resolve the intended base and head branches,
   then inspect the diff size against the PR base. If the size cannot be measured, surface the
   blocker and get explicit user approval before continuing. Treat roughly 300+ changed lines as
   approaching the default 400-line budget. If the planned PR approaches or exceeds the repository
   budget, stop, load `reviewable-pr-slices`, present the split/exception options, and wait for user
   or maintainer approval.

5. **Create PR**: Use the `gh` CLI to create the PR. To avoid shell escaping
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

6. **Align Semantics**: Keep branch name, commit message, and PR title aligned in
   intent.

- Good alignment: `feat/search-shortcuts` → `feat: add search shortcuts` →
  `feat: add search shortcuts`
- Avoid mixing intents like `chore/...` branch with `feat:` PR title unless
  the actual scope changed and you explicitly renamed the branch strategy.

## Principles

- **Compliance**: Never ignore the PR template. It exists for a reason.
- **Completeness**: Fill out all relevant sections.
- **Accuracy**: Don't check boxes for tasks you haven't done.
