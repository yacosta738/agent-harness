---
tags: [ skill-creator ]
max_turns: 20
timeout_seconds: 600
allowed_tools: [ Read, Glob, Grep, Skill, Write, Edit, Bash ]
---

In the TypeScript service `shippingCost(totalCents, membership)`, add this rule: a `gold` customer
gets free shipping when they spend at least 10,000 cents; every other case keeps the current price of
500 cents. The tests must cover a gold order below the threshold, one exactly at 10,000 cents, and one
standard order at the threshold. Implement the change with TDD: observe RED, make the minimum change,
and verify GREEN. Test the public interface, not internal helpers.

Input files: package.json, shipping-cost.ts
