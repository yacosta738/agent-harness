---
description: Review a pull request and, when the runtime allows it, schedule limited follow-up monitoring.
---

# Watch a pull request

Load `skills/github/pr-watch/SKILL.md` and follow its instructions. Pass `$ARGUMENTS` through
unchanged as an optional pull request identifier (number or URL); when it is empty, the skill
resolves the pull request for the current branch. Invoking `/pr-watch` authorizes local changes
within scope and evidence-backed thread replies or resolutions, but it does not authorize commits
or pushes. Explicit read-only instructions take precedence. GitHub Actions fixes require the
explicit approval that `gh-fix-ci` requires.

`/pr-watch` owns the GitHub review threads and the workflow checks. When a thread needs a fresh
code assessment, the skill loads `code-review` and applies the four 4R lenses; `/pr-watch` never
starts a second RDD transaction. Use `/review <PR URL>` for a complete RDD review.
