---
name: brainstorming
description: "Use for collaborative thinking and non-trivial scoped work that needs design but not a full SDD cycle. Explores user intent, requirements, and approach before implementation."
---

# Brainstorming Ideas Into Designs

Help turn ideas into fully formed designs and specs through natural
collaborative dialogue.

**Use this skill for collaborative thinking and complex tasks that DO NOT require a full
Spec-Driven Development (SDD) cycle** (like scripts, isolated utilities, spikes, focused
DevOps tasks, or scoped design decisions you want to think through with the user). If the work is a
substantial feature or needs durable artifacts, approval gates, resumability, cross-cutting product
rules, or long-term architecture records, use the standard SDD workflow (`sdd-new` / `sdd-explore`)
instead.

Start by understanding the current project context, then ask questions one at a
time to refine the idea. Once you understand what you're building, present the
design and get user approval.

**HARD-GATE:** Do NOT invoke any implementation skill, write any code, scaffold
any project, or take any implementation action until you have presented a design
and the user has approved it.

## Anti-Pattern: "This Is Too Simple To Need A Design"

Every non-trivial scoped effort that needs thinking goes through this process: a utility, a focused
config change, a script, or a small behavior change. "Simple" projects are where unexamined
assumptions cause the most wasted work. The design can be short (a few sentences for truly simple
projects), but you MUST present it and get approval.

Skip this skill for purely mechanical edits, typo fixes, read-only lookups, command explanations, or
changes where the user already provided an explicit accepted design. If the work grows into a full
feature cycle, stop and escalate to SDD instead of stretching brainstorming into durable specs.

## Checklist

You MUST create a task for each of these items and complete them in order:

1. **Explore project context** — check files, docs, recent commits, `CONTEXT.md`,
   and ADRs (`tmp/adr/`)
2. **Ask clarifying questions** — one at a time, understand purpose/constraints/
   success criteria. **Always provide your recommended answer** to reduce
   cognitive load on the user.
3. **Challenge terminology** — if the user uses fuzzy terms or contradicts
   `CONTEXT.md`, challenge them and propose canonical terms.
4. **Propose 2-3 approaches** — with trade-offs and your recommendation
5. **Present design** — architecture, components, data flow, error handling,
   testing
6. **Get approval** — wait for explicit user approval before proceeding
7. **Write spec** — save to `tmp/plans/YYYY-MM-DD-<topic>-design.md`
8. **Self-review spec** — check for placeholders, contradictions, ambiguity
9. **User review gate** — ask user to review written spec before implementation
10. **Create implementation plan** — invoke `writing-plans` skill

## Guidelines

**Asking questions:**

- Only one question per message - if a topic needs more exploration, break it
  into multiple questions
- Focus on understanding: purpose, constraints, success criteria

**Exploring approaches:**

- Propose 2-3 different approaches with trade-offs
- Present options conversationally with your recommendation and reasoning
- Lead with your recommended option and explain why

**Domain language and ADR discipline:**

- Use `CONTEXT.md` or `CONTEXT-MAP.md` if present to understand the project's
  ubiquitous language.
- When the user uses a term that conflicts with `CONTEXT.md`, call it out
  immediately.
- When the user uses vague terms, propose a precise canonical term.
- Only offer to create an ADR (`tmp/adr/`) when a decision is: 1) Hard to
  reverse, 2) Surprising without context, AND 3) The result of a real trade-off.
  Skip ADRs for trivial choices.

**Presenting the design:**

- Once you believe you understand what you're building, present the design
- Scale each section to its complexity: a few sentences if straightforward, up
  to 200-300 words if nuanced
- Ask after each section whether it looks right so far
- Cover: architecture, components, data flow, error handling, testing
- Be ready to go back and clarify if something doesn't make sense

**Design for isolation and clarity:**

- Break the system into smaller units that each have one clear purpose
- Each unit should communicate through well-defined interfaces and be testable
  independently
- Can someone understand what a unit does without reading its internals? If not,
  the boundaries need work.

**Working in existing codebases:**

- Explore the current structure before proposing changes. Follow existing
  patterns.
- Where existing code has problems that affect the work, include targeted
  improvements as part of the design — don't propose unrelated refactoring.

## After the Design

**Documentation:**

- Write the validated design to a temporary location:
  `tmp/plans/YYYY-MM-DD-<topic>-design.md`
- *Note*: Ensure the `tmp/` folder is added to `.gitignore`. These plans are
  meant to guide the current session, not act as permanent project artifacts. If
  the work requires permanent documentation, use the SDD workflow instead.
- This path is configurable by the user, but defaults to `tmp/plans/`.

**Spec Self-Review:**

After writing the spec document, look at it with fresh eyes:

1. **Placeholder scan:** Any "TBD", "TODO", incomplete sections, or vague
   requirements? Fix them.
2. **Internal consistency:** Do any sections contradict each other?
3. **Scope check:** Is this focused enough for a single implementation plan?
4. **Ambiguity check:** Could any requirement be interpreted two different ways?
   Pick one, make it explicit.

Fix any issues inline before asking the user to review.

**User Review Gate:**

After the spec review loop passes, ask the user to review the written spec
before proceeding:

> "Spec written to `<path>`. Please review it and let me know if you want to
> make any changes before we start writing out the implementation plan."

Wait for the user's response. Only proceed once the user approves.

**Implementation:**

- Invoke the `writing-plans` skill to create a detailed tactical implementation
  plan in `tmp/plans/`.
- If, during brainstorming, the scope is discovered to require durable specs,
  multi-phase architecture decisions, or cross-cutting product behavior, STOP
  and recommend switching to the SDD workflow instead of continuing with
  temporary plans.

## Key Principles

- **One question at a time** - Don't overwhelm with multiple questions
- **Multiple choice preferred** - Easier to answer than open-ended when possible
- **YAGNI ruthlessly** - Remove unnecessary features from all designs
- **Explore alternatives** - Always propose 2-3 approaches before settling
- **Incremental validation** - Present design, get approval before moving on
- **Be flexible** - Go back and clarify when something doesn't make sense
