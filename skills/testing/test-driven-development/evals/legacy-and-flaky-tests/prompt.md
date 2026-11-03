---
tags: [skill-creator]
max_turns: 20
timeout_seconds: 600
allowed_tools: [Read, Glob, Grep, Skill, Write, Edit, Bash]
---

Tengo una aplicación Java legacy sin tests alrededor del cálculo de facturas. Conozco estos
resultados actuales: una factura de 1000 centavos con tasa del 10% produce 1100 centavos; una
factura vacía produce 0. Quiero extraer el cálculo a un módulo, pero no cambies reglas del negocio.
Además, una prueba de integración falla de forma aleatoria porque depende de la hora y del estado
compartido. ¿Cómo lo abordarías?
