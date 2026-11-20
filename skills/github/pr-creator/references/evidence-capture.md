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
Include evidence in the PR description using GitHub-native Markdown:
- Images via GitHub's built-in image embedding (paste or reference committed files).
- Code blocks for API requests/responses, CLI output, or configuration diffs.
- Tables for structured comparisons.

Do not introduce external media storage services. If a capture mechanism is unavailable, report the limitation clearly rather than inventing results, media files, screenshots, measurements, or URLs.

## Security Rules

Evidence may contain sensitive information. Enforce these rules:

1. **Never publish credentials** — Sanitize tokens, session cookies, API keys, passwords, and personal information from all evidence before publication.
2. **Sanitize outputs** — Redact sensitive data from API responses, CLI output, and logs before including them in the PR.
3. **Avoid private content** — Do not capture unrelated desktop content, private application state, or data outside the change scope.
4. **Respect access restrictions** — Follow repository authorization rules; do not expose restricted data.
5. **Distinguish verification** — Clearly separate real verification from planned, unavailable, or skipped checks. Never label an unexecuted check as passed.
6. **No external uploads** — Do not automatically upload evidence to external services without explicit user approval.

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
2. **Capture before-state** — When available, capture the system state before the change.
3. **Capture after-state** — After implementing the change, capture the new state.
4. **Verify comparability** — Ensure both observations use equivalent conditions.
5. **Include in PR** — Add evidence to the PR description using supported GitHub mechanisms.
6. **Flag stale evidence** — If the PR changes significantly, note that evidence may be outdated.
