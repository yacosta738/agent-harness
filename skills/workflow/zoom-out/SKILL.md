---
name: zoom-out
description: Use when unfamiliar with a section of code, when implementation details are overwhelming, or when you need to understand how the current piece fits into the bigger picture.
---

# Zoom Out

When you or the user get lost in the weeds, stop reading individual lines of code and zoom out one level of abstraction.

## How to execute a Zoom Out

1. **Stop proposing code changes** for a moment.
2. **Map the landscape**: Identify the relevant modules, callers, and data flow surrounding the area in question.
3. **Use domain language**: Express the map using the project's domain vocabulary (from `CONTEXT.md` if available).
4. **Identify the seam**: Find where the interface sits between the code you're modifying and the rest of the system.
5. **Present the map**: Show the user the higher-level map to ensure you are both aligned on the architecture before diving back into implementation.

*Tip:* "I don't know this area of code well enough yet. Let me step back and map the callers and modules first."