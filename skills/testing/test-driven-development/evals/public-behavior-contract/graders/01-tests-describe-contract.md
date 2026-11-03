---
type: llm
focus: trace
weight: 1
---

Los tests de la función pública `shippingCost` verifican que gold con 9 999 centavos paga 500, gold
con exactamente 10 000 paga 0 y standard con exactamente 10 000 paga 500; no verifican llamadas a
helpers privados.
