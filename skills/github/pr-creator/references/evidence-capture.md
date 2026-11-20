# Evidence Capture

This reference guides how to select and capture evidence for PR descriptions. Evidence helps reviewers understand the impact of a change without checking out the branch.

## Evidence Selection by Change Type

Choose evidence proportional to the scope and risk of the change. These are guidelines, not mandatory checkboxes.

| Change Type | Preferred Evidence |
|---|---|
| **Visual UI changes** | Before/after screenshots at comparable viewport sizes |
| **Interactive UI flows** | Short demonstration video or documented interaction sequence |
| **API changes** | Before/after requests and responses using equivalent inputs |
| **CLI changes** | Before/after command output |
| **Bug fixes** | Reproduction evidence and observable result after the fix |
| **Architecture changes** | Focused before/after diagrams when they clarify the change |
| **Performance changes** | Comparable measured results with methodology and environment |
| **Documentation-only** | Concise description and relevant links; no screenshots needed |
| **Configuration or infrastructure** | Validation results, configuration differences, operational impact |

## Capture Requirements

When supported by available tools, follow these principles:

### Real Evidence
Capture real evidence from the actual system rather than generating illustrative substitutes. A screenshot of the real UI change is more valuable than a description of what changed.

### Comparable States
For before/after comparisons, ensure both observations are comparable:
- **Screenshots**: Use the same viewport size, environment, and browser state.
- **API/CLI evidence**: Use equivalent inputs and document any relevant environment differences.
- **Performance results**: Specify measurement conditions, environment, and methodology. Avoid unsupported performance claims.

### Focused Demonstrations
- **Videos**: Keep them short and focused on the changed interaction, not a general tour.
- **Diagrams**: Describe real architecture; avoid decorative diagrams that add no information.

### Evidence Inclusion

Include evidence in the PR description using GitHub-native mechanisms. Choose the method
based on available tooling:

#### Primary: `gh pr create --attach` (Recommended)

When `gh >= 2.99.0` is available, attach images and videos directly during PR creation:

1. **Verify version**: Run `gh --version` and confirm `>= 2.99.0`.
2. **Verify authentication**: Run `gh auth status` before attaching.
3. **Capture evidence** to local files, e.g., `./evidence/before.png` and `./evidence/after.png`.
4. **Reference in body** — write the PR body with local image references:
   ```markdown
   ![Before the change](./evidence/before.png)
   ![After the change](./evidence/after.png)
   ```
5. **Attach during creation** — use `--attach` for each file. GitHub CLI rewrites the body
   references to uploaded URLs automatically:
   ```bash
   gh pr create --draft \
     --base main \
     --head feat/example \
     --title "feat(ui): improve settings" \
     --body-file /tmp/pr-body.md \
     --attach './evidence/before.png#Before the change' \
     --attach './evidence/after.png#After the change'
   ```
6. Paths in `--body-file` are relative to its directory, falling back to the working directory.
7. Up to 50 files per command. Alt text follows the path after `#`.

If `--attach` is unavailable (`gh < 2.99.0` or the flag is missing), fall back to the committed
file method below.

#### Fallback: Committed Evidence Files

When `--attach` is not available, evidence files must be committed to the PR branch **before**
`pr-creator` runs. This preparation is the responsibility of `yeet`, not `pr-creator`.

**In `yeet`** (before step 7 — push):

1. If evidence files exist and `--attach` is unavailable, create an `evidence/` directory in the
   branch root.
2. Place captured files there, e.g., `evidence/before.png`.
3. Commit the evidence with the PR changes (alongside the main commit or as a separate commit
   within the same push).
4. Push the branch with evidence included.

**In `pr-creator`** (step 7 — create PR):

- If `--attach` is unavailable and evidence files are already committed, reference them using
  **relative paths** so the PR works for both public and private repositories:
  ```markdown
  ![Before](evidence/before.png)
  ```
- GitHub renders relative image paths in PR descriptions by resolving them against the repository
  root at the PR's head commit, which works correctly for private repos and avoids branch-mutable
  URLs.
- If evidence files are not committed and `--attach` is unavailable, report the limitation
  truthfully — **do not commit files yourself**. `pr-creator` has no commit contract and runs
  after `yeet`'s push.

**Why relative paths over `raw.githubusercontent.com`:**
- Relative paths work for private repositories where raw content URLs may be inaccessible.
- They resolve at the PR's head commit, so evidence is tied to a specific version rather than a
  mutable branch.
- GitHub's PR body renderer supports relative paths natively.

#### Code Evidence

For non-visual evidence, use Markdown directly in the PR body:
- **Code blocks** for API requests/responses, CLI output, or configuration diffs.
- **Tables** for structured comparisons.

Do not introduce external media storage services. If a capture mechanism is unavailable, report
the limitation clearly rather than inventing results, media files, screenshots, measurements, or
URLs.

## Security Rules

Evidence may contain sensitive information. Enforce these rules:

1. **Never publish credentials** — Sanitize tokens, session cookies, API keys, passwords, and personal information from all evidence before publication.
2. **Sanitize outputs** — Redact sensitive data from API responses, CLI output, and logs before including them in the PR.
3. **Avoid private content** — Do not capture unrelated desktop content, private application state, or data outside the change scope.
4. **Respect access restrictions** — Follow repository authorization rules; do not expose restricted data.
5. **Distinguish verification** — Clearly separate real verification from planned, unavailable, or skipped checks. Never label an unexecuted check as passed.
6. **No external uploads** — Do not automatically upload evidence to external services without explicit user approval.
7. **Sanitize before attaching** — When using `--attach`, verify the file does not contain credentials, tokens, or sensitive data before uploading.

## When Capture Is Unavailable

When screenshot, video, or measurement tools are not available:

1. Report the limitation truthfully in the PR description.
2. Provide the next best alternative (e.g., a detailed description of the visual change when screenshots are unavailable).
3. Do not make optional tooling a prerequisite for creating otherwise valid PRs.

Example limitation note:
```markdown
**Evidence Limitation**: Screenshot capture is not available in this environment.
The change modifies the button layout in the settings panel, moving the save button
from the top-right to the bottom of the form. Manual verification confirmed the
new position matches the design spec.
```

## Evidence Lifecycle

1. **Identify** — During implementation or PR preparation, determine what evidence would help the reviewer.
2. **Capture before-state** — `pr-creator` runs after implementation, so before-state evidence may not exist. Follow this precedence:
   - **Use captured evidence** — If the agent captured before-state during implementation, use it directly.
   - **Reproduce base state** — If safe and feasible, reproduce the base state in a git worktree or isolated environment. For example, `git worktree add ../base main` and capture from that branch.
   - **Document the limitation** — If before-state cannot be captured or reproduced, report the limitation truthfully. Do not fabricate before-state evidence.
3. **Capture after-state** — After implementing the change, capture the new state.
4. **Verify comparability** — Ensure both observations use equivalent conditions.
5. **Include in PR** — Add evidence to the PR description using supported GitHub mechanisms.
6. **Flag stale evidence** — If the PR changes significantly, note that evidence may be outdated.
