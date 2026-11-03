---
type: llm
focus: trace
weight: 1
---

The tests for the public `shippingCost` function verify that gold with 9,999 cents pays 500, gold
with exactly 10,000 pays 0, and standard with exactly 10,000 pays 500; they do not verify calls to
private helpers.
