---
tags: [ skill-creator ]
max_turns: 20
timeout_seconds: 600
allowed_tools: [ Read, Glob, Grep, Skill, Write, Edit, Bash ]
---

En Java, `CheckoutService` recibe una interfaz pública `PaymentGateway` y devuelve el resultado del
checkout. Necesito probar que un pago aprobado confirma la compra, pero el test no debe llamar a la
pasarela real. Haz el test primero. No quiero que el test dependa del número ni del orden de
llamadas a métodos internos.
