---
description: Run a prompt on a recurring or variable interval (e.g. /loop 5m check deploy)
agent: kerrigan
---
Load the `loop` skill and follow the Loop skill instructions.

INTERPRETATION: Parse `{argument}` as `[interval] <prompt>`.
- Leading interval: `5m /foo`, `30s check status`, `2h run report`.
- Trailing interval: `check deploy every 5m`, `run tests every 10 minutes`.
- No interval: dynamic mode; the agent chooses the next delay after each run.
- Empty prompt: show `Usage: /loop [interval] <prompt>`.

Use intervals like `30s`, `5m`, `2h`, `1d`. Convert unit words to short units.
