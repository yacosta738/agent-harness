---
tags: [skill-creator]
max_turns: 20
timeout_seconds: 600
allowed_tools: [Read, Glob, Grep, Skill, Write, Edit, Bash]
---

En un servicio TypeScript existe `shippingCost(totalCents, membership)`. Quiero agregar una regla: el envío cuesta 0 cuando el cliente `gold` compra al menos 10 000 centavos; los demás casos conservan el precio actual de 500 centavos. Implementa el cambio con TDD y tests que sigan siendo útiles si reorganizamos las funciones internas.
