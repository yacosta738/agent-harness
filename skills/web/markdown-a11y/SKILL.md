---
name: markdown-a11y
description: >
  Markdown accessibility review guidelines based on GitHub's 5 best practices for inclusive documentation.
  Trigger: When reviewing, creating, or editing markdown files (`*.md`) for accessibility,
  or when asked to "review markdown accessibility", "make docs accessible", or "a11y review" on documentation.
license: Apache-2.0
metadata:
  author: yacosta738
  version: "1.0"
---

## When to Use

- Reviewing markdown files (READMEs, docs, blog posts, GitHub profiles) for accessibility
- Creating new documentation and wanting to ensure inclusivity from the start
- Auditing existing markdown content for screen reader compatibility
- When asked to improve documentation quality with accessibility in mind

## Critical Patterns

- **Descriptive Links:** Never use "click here", "here", "this", "read more" as link text. Link text
  must make sense when read out of context.
- **Image Alt Text:** Every image needs meaningful alt text. Empty alt `![]()` is only acceptable
  for explicitly decorative images. Filenames and generic words like "screenshot" are not valid alt
  text.
- **Heading Hierarchy:** One H1 per document, never skip levels (e.g., `##` to `####` is a
  violation), and never use bold text as a fake heading.
- **Proper Lists:** Always use markdown list syntax (`-`, `*`, `+`, `1.`). Never use emoji or
  special characters as bullet points.
- **Emoji Restraint:** Don't stack multiple consecutive emoji. Don't use emoji as the sole conveyor
  of meaning.

## Review Priority

When multiple issues exist, fix in this order:

1. Missing or empty alt text on images
2. Skipped heading levels or heading hierarchy issues
3. Non-descriptive link text
4. Emoji used as bullet points or list markers
5. Plain language improvements

## Code Examples

### 1. Descriptive Links

```markdown
<!-- BAD: generic link text -->
Read my blog post [here](https://example.com).
For more info, [click here](https://example.com/docs).
Check out [this](https://example.com/guide) guide.

<!-- GOOD: descriptive, self-contained link text -->
Read my blog post "[Crafting an accessible resume](https://example.com)".
For more info, see the [API authentication guide](https://example.com/docs).
Check out the [getting started guide](https://example.com/guide).

<!-- BAD: bare URL in prose -->
See https://example.com/docs for details.

<!-- GOOD: wrapped in descriptive link -->
See the [project documentation](https://example.com/docs) for details.

<!-- BAD: identical text, different destinations -->
See [documentation](https://example.com/api) for the API.
See [documentation](https://example.com/cli) for the CLI.

<!-- GOOD: unique, distinguishable text -->
See the [API documentation](https://example.com/api).
See the [CLI documentation](https://example.com/cli).
```

**Why it matters:** Screen readers can present all links as an isolated list. "here", "here", "here"
tells the user nothing. Each link must stand on its own.

### 2. Image Alt Text

```markdown
<!-- BAD: empty alt text (unless intentionally decorative) -->
![](screenshot.png)

<!-- BAD: filename as alt text -->
![img_1234.jpg](img_1234.jpg)

<!-- BAD: generic placeholder -->
![screenshot](dashboard.png)
![image](chart.png)

<!-- GOOD: succinct, descriptive alt text -->
![Screenshot of the dashboard showing 3 active alerts](dashboard.png)
![Bar chart comparing Q1 and Q2 revenue: Q1 $2.1M, Q2 $2.8M](chart.png)

<!-- GOOD: decorative image (explicitly empty alt) -->
![](decorative-divider.png)
<!-- Only valid when the image adds no informational value -->
```

**For complex images** (charts, infographics), summarize the key data in alt text and provide a
longer description:

```markdown
![Sales by region: North 45%, South 30%, East 15%, West 10%](sales-chart.png)

<details>
<summary>Detailed sales breakdown</summary>

| Region | Sales   | % of Total |
|--------|---------|------------|
| North  | $4.5M   | 45%        |
| South  | $3.0M   | 30%        |
| East   | $1.5M   | 15%        |
| West   | $1.0M   | 10%        |

</details>
```

**Important:** When suggesting alt text improvements, present them as recommendations. Only the
author can properly assess visual content and context.

### 3. Heading Hierarchy

```markdown
<!-- BAD: skipped heading level (## to ####) -->
## Installation
#### Prerequisites    <!-- skips H3! -->

<!-- GOOD: proper hierarchy -->
## Installation
### Prerequisites

<!-- BAD: bold text used as a fake heading -->
**Installation Steps**
First, clone the repo...

<!-- GOOD: proper heading -->
### Installation Steps
First, clone the repo...

<!-- BAD: multiple H1s -->
# My Project
...
# Getting Started    <!-- second H1! -->

<!-- GOOD: single H1, sections use H2 -->
# My Project
...
## Getting Started
```

**Note:** In projects where H1 is auto-generated from front matter (e.g., Jekyll, Hugo, Docusaurus),
start content at H2.

**Why it matters:** Screen reader users navigate by heading level. Skipped levels break that mental
model — it's like a book jumping from Chapter 2 to Chapter 4.

### 4. Plain Language

```markdown
<!-- BAD: unnecessarily complex -->
The aforementioned methodology facilitates the implementation
of a comprehensive authentication paradigm.

<!-- GOOD: clear, direct -->
This method sets up authentication for your project.

<!-- BAD: dense wall of text -->
The system processes incoming requests by first validating the
authentication token against the identity provider, then checking
the role-based access control permissions matrix to determine
whether the requesting entity has sufficient privileges to access
the specified resource endpoint, and finally logging the access
attempt for audit compliance purposes.

<!-- GOOD: broken into digestible pieces -->
The system handles each request in three steps:

1. **Validates the token** against the identity provider.
2. **Checks permissions** to confirm the user can access the resource.
3. **Logs the attempt** for audit compliance.
```

**Important:** When suggesting plain language improvements, present them as recommendations.
Language decisions depend on audience, context, and tone that only the author fully understands.

### 5. Lists and Emoji

#### Lists

```markdown
<!-- BAD: emoji as bullet points -->
🔹 Install dependencies
🔹 Configure the database
🔹 Run migrations

<!-- GOOD: proper markdown list -->
- Install dependencies
- Configure the database
- Run migrations

<!-- BAD: sequential items in plain text -->
First install Node.js. Then install dependencies. Finally run the app.

<!-- GOOD: structured as a list -->
1. Install Node.js
2. Install dependencies
3. Run the app
```

**Why it matters:** Proper list syntax lets screen readers announce "list, 3 items" and navigate
item-by-item. Emoji bullets are read aloud in full (e.g., "small blue diamond, Install
dependencies").

#### Emoji

```markdown
<!-- BAD: multiple consecutive emoji -->
Great job! 🚀✨🔥💯🎉

<!-- GOOD: single emoji, sparingly -->
Great job! 🎉

<!-- BAD: emoji as sole conveyor of meaning -->
Status: ✅

<!-- GOOD: meaning in text, emoji as supplement -->
Status: Passing ✅
```

**Why it matters:** Each emoji name is read aloud in full. "rocket, sparkles, fire, hundred points,
party popper" is disruptive. A single well-placed emoji enhances; a cluster of them creates noise.

## Review Tone

- **Explain impact:** Specify _who_ is affected — screen reader users, people with cognitive
  disabilities, non-native speakers.
- **Preserve voice:** Accessibility and personality are not mutually exclusive. Don't flatten
  engaging writing.
- **Be actionable:** Give specific fixes, not vague advice.

## Commands

```bash
# Lint markdown for accessibility issues (markdownlint)
npx markdownlint-cli2 "**/*.md"

# Check heading hierarchy
npx markdownlint-cli2 --config '{"MD001": true, "MD003": true}' "**/*.md"

# Check for bare URLs (MD034) and link fragments
npx markdownlint-cli2 --config '{"MD034": true}' "**/*.md"
```

## Resources

- [GitHub: 5 Tips for Accessible Profile Pages](https://github.blog/developer-skills/github/5-tips-for-making-your-github-profile-page-accessible/)
- [W3C: Images Tutorial](https://www.w3.org/WAI/tutorials/images/)
- [WebAIM: Links and Hypertext](https://webaim.org/techniques/hypertext/)
- [Hemingway Editor](https://hemingwayapp.com/) — plain language checker
- Related skill: [accessibility](../accessibility/SKILL.md) — for web/HTML accessibility (WCAG 2.1)
