---
tags: [skill-creator]
max_turns: 20
timeout_seconds: 600
allowed_tools: [Read, Glob, Grep, Skill, Write, Edit, Bash]
---

En el servicio TypeScript `shippingCost(totalCents, membership)`, agrega esta regla: un cliente
`gold` recibe envío gratis cuando compra por al menos 10 000 centavos; los demás casos conservan el
precio actual de 500 centavos. Los tests deben cubrir un pedido gold por debajo del umbral, uno
exactamente en 10 000 centavos y uno standard en el umbral. Implementa el cambio con TDD: observa
RED, haz el cambio mínimo y verifica GREEN. Prueba la interfaz pública y no los helpers internos.

Input files: package.json, shipping-cost.ts
