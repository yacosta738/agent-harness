# Externalize Kerrigan Writing Style

**Status:** Ready

## Goal

Move Kerrigan's communication style into a root-level `WRITING_STYLE.md` that adopters can edit without navigating the operational harness rules.

## Scope

- Extract language, preferred expressions, and tone from `AGENTS.md`.
- Compose `AGENTS.md` and `WRITING_STYLE.md` in Kerrigan's OpenCode prompt.
- Keep the existing persona schema unchanged.
- Update tests, adopter documentation, and the tracked effective tree.

## Verification

- Run the focused harness-config Node tests.
- Render and check `dist/opencode`.
- Inspect the resolved Kerrigan prompt with `opencode debug agent kerrigan --pure`.
- Run `git diff --check`.
