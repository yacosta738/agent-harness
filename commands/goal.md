---
description: Run a prompt repeatedly until a specified goal is reached (e.g. `/goal 5m check deploy until healthy`)
agent: kerrigan
---
Load the `goal` skill and follow its instructions.

INTERPRETATION: Parse `{argument}` as `[interval] <prompt> [until <condition>]`.
- Leading interval: `5m check deploy until healthy`, `30s run tests until all pass`.
- Trailing interval: `check deploy every 5m until healthy`, `run tests until green every 10 minutes`.
- No interval: dynamic mode; the agent chooses the next delay after evaluating results.
- If no explicit `until` is provided, the agent should attempt to infer a reasonable stopping predicate from the prompt. If uncertain, ask the user.

Optional parameters supported by the skill: `max_attempts=<n>`, `timeout=<duration>` (e.g. `timeout=1h`).
