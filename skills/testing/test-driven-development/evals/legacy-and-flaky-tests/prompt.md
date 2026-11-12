---
tags: [ skill-creator ]
max_turns: 20
timeout_seconds: 600
allowed_tools: [ Read, Glob, Grep, Skill, Write, Edit, Bash ]
---

I have a legacy Java application with no tests around invoice calculation. I know these current
outcomes: an invoice of 1,000 cents with a 10% rate produces 1,100 cents; an empty invoice produces

0.

I want to extract the calculation into a module, but do not change business rules. Also, one
integration test fails randomly because it depends on the clock and on shared state. How would you
approach this?
