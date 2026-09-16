---
name: goal
description: >-
  Run a prompt or skill repeatedly until a specified goal is reached (e.g. `/goal check deploy until healthy`).
disabled-environments:
  - cloud
---
# Goal

Run a prompt or skill on a cadence (fixed or dynamic) and stop only when the agent verifies a success condition (the "goal"). Think of this as a loop with a built-in predicate: keep running until the predicate becomes true.

## Parse

Accept `/goal [interval] <prompt> [until <condition>]`.

- Leading interval: `5m check deploy until healthy`, `30s run tests until all pass`.
- Trailing interval: `check deploy every 5m until healthy`, `run tests until green every 10 minutes`.
- No interval: dynamic mode; the agent chooses the next delay after evaluating results.
- If no explicit `until` is provided, the agent should attempt to infer a reasonable stopping predicate from the prompt (e.g. "deploy is healthy", "tests pass", "build succeeded"). If uncertain, ask the user.
- Empty prompt: show `Usage: /goal [interval] <prompt> [until <condition>]`.

Convert unit words to short units (`seconds -> s`, `minutes -> m`, `hours -> h`, `days -> d`).

## Predicate / Goal Detection

The skill supports multiple goal forms (in descending order of reliability):

1. Explicit predicate provided with `until "<regex|phrase>"` or natural-language (preferred).
2. A success status emitted by the target system (CI success, HTTP 200, process exit 0, or a named status like `healthy`).
3. Heuristic match in the prompt result for common success words: `success`, `succeeded`, `done`, `passing`, `healthy`, `green`.

When possible, prefer explicit predicates. If the predicate is ambiguous, the agent should ask a clarifying question before proceeding.

## Fixed Schedule

Like the `loop` skill, a fixed scheduler can be implemented as a background shell that emits a sentinel on each tick:

```bash
while true; do
  sleep <seconds>
  echo 'AGENT_GOAL_TICK_<purpose> {"prompt":"<prompt>"}'
done
```

Behavior:
1. Check for an already-running matching goal runner and avoid duplicates.
2. Start one background shell loop with `notify_on_output` and a unique sentinel `^AGENT_GOAL_TICK_<purpose>`.
3. Smoke-check startup, run the prompt once immediately, and evaluate the predicate on that run.
4. The first sentinel should arrive only after the initial sleep so startup does not double-run the prompt.
5. Track the PID so the agent can stop the loop if asked.
6. On each tick, run the prompt and evaluate the predicate. If satisfied, stop the loop and report success including attempt count and total elapsed time.
7. If a maximum attempts or timeout was provided, stop with a failure message and recommend next steps.

## Dynamic Schedule

When the agent self-paces:
1. Run the prompt now and evaluate result against the predicate.
2. If the next run is gated on an observable event (git ref advancing, log line, file change, CI completion), arm a watcher that emits `AGENT_GOAL_WAKE_<purpose>` only when the event fires.
3. Also arm a one-shot fallback heartbeat:

```bash
sleep <seconds>
echo 'AGENT_GOAL_WAKE_<purpose> {"prompt":"<prompt>"}'
```

4. On wake, read the latest payload, execute its `prompt`, evaluate the predicate, and re-arm the next heartbeat (and the watcher if it exited). If both an output wake and a completion notification arrive, act on the output and ignore the completion.
5. To stop, kill any watcher PID and do not arm another heartbeat.

## Evaluation

- Prefer machine-verifiable checks (HTTP status codes, CI API status, process exit codes, file contents).
- If using text-regex/phrase matching, read the latest output and test the predicate as either a regex or case-insensitive substring depending on user input.
- Always log the raw result and the evaluation decision (matched/not matched) so the user can audit why the goal was or wasn't detected.

## Safety & UX

- Show a brief confirmation on arm: what predicate will be used, whether a watcher is primary wake signal, fallback delay, and that the prompt already ran once.
- Include attempt count, last run time, and ETA to next check in updates.
- If the predicate is ambiguous or missing, ask the user to confirm before starting.
- Support graceful stop: when asked to stop, kill any tracked PIDs, await shell task completion so notifications are consumed, and report final state.
- Support `max_attempts` or `timeout` optional parameters to avoid indefinite runs. If not provided, warn the user that the agent will run until the predicate is observed.

## Prompt Payload

Wake notifications include an output file path or inline JSON payload. Prefer storing the full prompt/predicate JSON beside the sentinel. On wake, read the latest matching line and act on its `prompt` and `predicate` fields. The predicate may vary by tick.

## Guidance

- Title shell commands as `Goal <goal-short>: <prompt>` (e.g. `Goal until healthy: check deploy`).
- Prefer monitored shell output over OS cron when the agent needs wake notifications.
- Use unique sentinels per goal to avoid cross-talk.
- Avoid noisy commands inside the loop and prefer precise exit conditions.
- Do not create duplicate goal runners for the same purpose and predicate.


