# TDD in the team workflow

## Align on behavior first

Before dividing the work, share concrete examples of input and expected outcome. The team must be
able to explain which contract each test protects, not only which file or method it covers.

## Keep the feedback useful

- Run the affected test while developing, and the relevant suite before integrating.
- Keep unit tests fast; use CI for slower layers when they add confidence.
- Review tests as part of the change: names, independent expectations, and absence of coupling to
  internal details.
- If a test is intermittent, record the cause and the follow-up. Do not normalize it with permanent
  retries.
- Agreeing on naming patterns, fixtures, and doubles reduces differences between authors; do not
  turn a style convention into a coverage target.

TDD helps discover requirements and keep changes small. It does not require each person to request
approval for an obvious boundary, and it does not require the team to use a single test percentage.
