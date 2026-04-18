---
name: notion-spec-to-implementation
description: Turn Notion specs into implementation plans, tasks, and progress tracking; use when implementing PRDs/feature specs and creating Notion plans + tasks from them.
metadata:
  short-description: Turn Notion specs into implementation plans, tasks, and progress tracking
---

# Spec to Implementation

Convert a Notion spec into linked implementation plans, tasks, and ongoing status updates.

## Quick start
1) Locate the spec with the available Notion search tool, then fetch it with the available Notion page-read tool.
2) Parse requirements and ambiguities using `reference/spec-parsing.md`.
3) Create a plan page with the available Notion page/database create tool (pick a template: quick vs. full).
4) Find the task database, confirm schema, then create tasks with the available Notion create tool.
5) Link spec ↔ plan ↔ tasks; keep status current with the available Notion update tool.

## Workflow

### 0) If Notion tools are unavailable, pause and ask the user to enable the Notion integration:
1. Enable the `notion` MCP entry in `editors/agents/opencode/opencode.json` for this environment or session.
2. Complete the Notion auth flow if OpenCode prompts for it.
3. Restart OpenCode or the current session if the tools still do not appear.

After the integration is enabled, finish your answer and tell the user to retry so they can continue with Step 1.

### 1) Locate and read the spec
- Search first using the available Notion search tool; if multiple hits, ask the user which to use.
- Fetch the page using the available Notion page-read tool and scan for requirements, acceptance criteria, constraints, and priorities. See `reference/spec-parsing.md` for extraction patterns.
- Capture gaps/assumptions in a clarifications block before proceeding.

### 2) Choose plan depth
- Simple change → use `reference/quick-implementation-plan.md`.
- Multi-phase feature/migration → use `reference/standard-implementation-plan.md`.
- Create the plan via the available Notion create tool; include: overview, linked spec, requirements summary, phases, dependencies/risks, and success criteria. Link back to the spec.

### 3) Create tasks
- Find the task database (Notion search → Notion page/database read to confirm the data source and required properties). Patterns in `reference/task-creation.md`.
- Size tasks to 1–2 days. Use `reference/task-creation-template.md` for content (context, objective, acceptance criteria, dependencies, resources).
- Set properties: title/action verb, status, priority, relations to spec + plan, due date/story points/assignee if provided.
- Create pages with the available Notion create tool using the database’s data-source identifier supported by your integration.

### 4) Link artifacts
- Plan links to spec; tasks link to both plan and spec.
- Optionally update the spec with a short “Implementation” section pointing to the plan and tasks using the available Notion update tool.

### 5) Track progress
- Use the cadence in `reference/progress-tracking.md`.
- Post updates with `reference/progress-update-template.md`; close phases with `reference/milestone-summary-template.md`.
- Keep checklists and status fields in plan/tasks in sync; note blockers and decisions.

## References and examples
- `reference/` — parsing patterns, plan/task templates, progress cadence (e.g., `spec-parsing.md`, `standard-implementation-plan.md`, `task-creation.md`, `progress-tracking.md`).
- `examples/` — end-to-end walkthroughs (e.g., `ui-component.md`, `api-feature.md`, `database-migration.md`).
