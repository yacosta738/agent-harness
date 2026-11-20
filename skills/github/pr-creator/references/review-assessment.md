# Review Assessment

This reference provides two independent classification frameworks for PR descriptions: **Review
Effort** and **Change Risk**. Together they help reviewers allocate attention and understand what
they are signing off on.

## Review Effort

Estimate the cognitive effort required to review the change thoroughly.

| Level      | Description                                                                                                                                                 |
|------------|-------------------------------------------------------------------------------------------------------------------------------------------------------------|
| **Low**    | Small, localized, straightforward change. A single file or tightly coupled area with clear before/after behavior.                                           |
| **Medium** | Several interacting files or behaviors requiring contextual review. The reviewer needs to understand how pieces fit together.                               |
| **High**   | Complex integration, significant cross-cutting changes, or substantial architectural reasoning. The reviewer must trace effects across multiple boundaries. |

### Criteria

Consider these factors when assessing review effort:

- **Changed lines**: More lines generally mean more reading, but a 10-line change to a critical path
  can be more complex than a 100-line refactor of straightforward code.
- **Conceptual complexity**: New algorithms, state machines, or subtle concurrency patterns increase
  effort regardless of line count.
- **Affected boundaries**: Changes that span multiple modules, services, or layers require the
  reviewer to understand each boundary.
- **Reviewer context**: If the change area is unfamiliar to typical reviewers, effort increases due
  to the learning curve.

### Explanation Template

Provide a short explanation based on observable facts:

```
Review Effort: [Low/Medium/High]
[Reason based on changed lines, complexity, or affected boundaries.]
```

Examples:

-
`Review Effort: Low — 15-line change to a single utility function with clear input/output behavior.`
-
`Review Effort: Medium — Touches three files across the auth and notification modules; reviewer should check the callback wiring in auth-handler.ts.`
-
`Review Effort: High — Introduces a new caching layer with invalidation logic spanning five modules.`

## Change Risk

Estimate the operational and behavioral risk if the change contains an undetected defect.

| Level      | Description                                                                                                                                                                                              |
|------------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| **Low**    | Local, reversible change with limited impact. A bug here would affect a narrow area and be easy to detect and roll back.                                                                                 |
| **Medium** | Meaningful behavior changes or multiple affected components. A bug could impact users or downstream systems.                                                                                             |
| **High**   | Authentication, authorization, security, data migrations, compatibility, destructive operations, or critical infrastructure changes. A bug could cause data loss, security breaches, or service outages. |

### Criteria

Consider these factors when assessing change risk:

- **Operational impact**: Will a defect cause downtime, data corruption, or user-facing errors?
- **Security sensitivity**: Does the change touch authentication, authorization, input validation,
  or data exposure?
- **Data migrations**: Irreversible data transformations carry high risk.
- **Compatibility**: Changes to public APIs, wire formats, or stored data structures affect
  downstream consumers.
- **Destructive operations**: Any code that deletes, drops, or permanently modifies data.

### Explanation Template

```
Change Risk: [Low/Medium/High]
[Reason based on operational impact, security sensitivity, or other risk factors.]
```

Examples:

- `Change Risk: Low — Updates error message text; no behavioral change.`
- `Change Risk: Medium — Modifies the payment calculation logic; a bug could affect billing.`
-
`Change Risk: High — Alters the authentication token validation flow; a defect could allow unauthorized access.`

## Independence of Effort and Risk

**Review Effort and Change Risk are independent dimensions.** Assess them separately:

| Example                      | Review Effort | Change Risk | Why                                                                                    |
|------------------------------|---------------|-------------|----------------------------------------------------------------------------------------|
| Small security fix           | Low           | High        | A one-line credential validation fix is easy to review but critical if wrong.          |
| Large documentation refactor | High          | Low         | Reading and verifying many doc changes takes time but carries little operational risk. |
| New feature with tests       | Medium        | Medium      | Moderate complexity with moderate user impact.                                         |
| Typo fix in internal utility | Low           | Low         | Straightforward and low impact.                                                        |

Do not infer risk from diff size. A small change to a security-sensitive path is high risk; a large
change to test fixtures is low risk.

## Relationship to Review Budget

These classifications complement, not replace, the existing 400-line review budget and
`reviewable-pr-slices` workflow:

- **Review Budget** answers "is this PR too large to review in one pass?"
- **Review Effort** answers "how much cognitive work does this review require?"
- **Change Risk** answers "what are the consequences if we miss a defect?"

A PR can be within budget but still be high effort or high risk. Use all three signals together to
decide whether to slice, request additional reviewers, or proceed with a standard review.

## Special Case: Agent Instruction Changes

In repositories that contain agent instructions, skills, or orchestrator prompts, **modifying
these files changes expected product behavior** — even though no executable code is touched.

When assessing risk for skill or prompt modifications:

- **Consider behavioral impact** — A skill change alters how the agent prepares PRs, publishes
  changes, or makes decisions. A defect here affects every future PR or publish action.
- **Risk may be Medium** — If the change modifies agent decision-making in a high-frequency path
  (e.g., PR preparation, publish flow), classify risk as Medium even if the diff is small.
- **Explain the behavioral change** — The risk justification should state that the modification
  alters agent behavior, not just that it changes documentation.

Example:

```
Change Risk: Medium — Modifies the pr-creator skill, which changes how the agent prepares
and publishes PRs. A defect here would affect all future PR descriptions.
```

Do not automatically escalate to High. A well-scoped skill change that adds optional behavior
without altering existing paths may still be Low risk.

## Including in PR Descriptions

Add both classifications to the PR description where relevant. Keep explanations brief and
fact-based:

```markdown
### Review Assessment

- **Review Effort**: Medium — Touches three files across the auth and notification modules.
- **Change Risk**: Low — No user-facing behavior change; internal refactoring only.
```

Do not create these sections for trivial changes where the classification is obvious (e.g., a single
typo fix). Use judgment to keep PR descriptions proportional to the change.
