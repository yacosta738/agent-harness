# Consistencia de idioma y limpieza de integraciones V2

## Objetivo

Evitar que los planes RPI y demás artefactos generados mezclen inglés y español sin una razón técnica, y retirar del arnés las integraciones incompatibles o descartadas para OpenCode V2.

## Ruta

Directo en línea. El comportamiento esperado está suficientemente definido y la limpieza está acotada a las instrucciones del orquestador, la configuración MCP y la documentación/skill de OpenPencil. No se selecciona SDD porque no se solicitó un ciclo formal de propuesta, especificación, diseño y tareas.

## Tareas

- [x] RPI-001 Establecer una política explícita de idioma para la prosa generada y los planes persistentes.
- [x] RPI-002 Eliminar la skill y la configuración MCP de OpenPencil.
- [x] RPI-003 Actualizar la documentación para retirar referencias a OpenPencil.
- [x] RPI-004 Confirmar que `opencode-subagents-statusline` no se configure ni se incluya en el bundle V2.
- [x] RPI-005 Ejecutar validaciones enfocadas y comprobar que no queden referencias activas.

> Nota: la configuración actual ya tiene `"plugins": []` y no contiene ese plugin; por tanto, no hubo un archivo adicional que eliminar para este punto.

## Criterios de aceptación

- La prosa de los planes, tareas, evidencias, estados y resúmenes sigue el idioma principal de la solicitud del usuario.
- Los literales técnicos —rutas, nombres de archivo, símbolos, comandos, ramas, variables, API y acrónimos— se conservan sin traducir cuando deben permanecer exactos.
- Las respuestas en español usan encabezados y etiquetas en español, incluyendo la forma localizada de la ruta, sin traducir identificadores técnicos.
- No existe la skill `skills/design/open-pencil/`.
- `adapters/opencode/opencode.json` no configura el servidor MCP `openpencil`.
- La documentación del repositorio no menciona OpenPencil.
- Las validaciones enfocadas pasan y la búsqueda final no encuentra referencias activas a OpenPencil.

## Evidencia

- El problema reportado muestra encabezados y etiquetas en inglés dentro de un plan redactado en español.
- La política vigente en `prompts/ORCHESTRATOR.md` exige crear planes RPI, pero no especifica el idioma de su contenido.
- La integración de OpenPencil estaba en `README.md`, `adapters/opencode/opencode.json` y `skills/design/open-pencil/SKILL.md`; también se revisó la ausencia de `opencode-subagents-statusline` en la configuración y los archivos incluidos.

## Estado

En progreso.
