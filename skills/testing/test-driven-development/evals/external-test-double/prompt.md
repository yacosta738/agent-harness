---
tags: [ skill-creator ]
max_turns: 20
timeout_seconds: 600
allowed_tools: [ Read, Glob, Grep, Skill, Write, Edit, Bash ]
---

In Java, `CheckoutService` receives a public `PaymentGateway` interface and returns the checkout
result. I need to test that an approved payment confirms the purchase, but the test must not call
the
real gateway. Write the test first. I do not want the test to depend on the number or the order of
calls to internal methods.
