# Corregir la ruta global de instrucciones STE

## Ruta
Direct inline. Se corrige un hallazgo confirmado de CodeRabbit en la PR #20 y se verifica la ruta instalada en OpenCode V2. No se inicia SDD.

## Objetivo
Asegurar que OpenCode carga la política STE-inspired desde workspaces que no son este repositorio y que el validador verifica la ruta configurada en el bundle.

## Tareas
- [x] RPI-001 Cambiar `instructions` a una ruta global `~/.config/opencode/...` y ajustar `check-refs.mjs` para comprobar el artefacto desplegado.
- [x] RPI-002 Desplegar la configuración en un destino aislado/prueba y abrir OpenCode desde otro workspace para confirmar la carga global.
- [x] RPI-003 Ejecutar `npm run validate`, deploy de presets y comprobaciones enfocadas; actualizar evidencia.
- [ ] RPI-004 Commit y push al branch actual de la PR #20.

## Criterios de aceptación
- La configuración usa una ruta inequívoca que carga fuera del repositorio.
- El validador falla si falta el archivo objetivo en el bundle y pasa cuando está incluido.
- El comportamiento de carga se comprueba con OpenCode V2 desde un workspace independiente, o se registra claramente el bloqueo si requiere intervención.
- Los tres presets continúan siendo autocontenidos.

## Evidencia
- `npm run validate` — PASS; 28 referencias de instrucciones/archivos y 38 patrones del adapter.
- `npm run deploy -- --preset minimal` — PASS; referencias del bundle resuelven 3/3.
- `npm run deploy -- --preset recommended` — PASS; referencias del bundle resuelven 28/28.
- `npm run deploy -- --preset full` — PASS; referencias del bundle resuelven 28/28.
- Prueba negativa `node scripts/check-refs.mjs --root <bundle-sin-politica>` — PASS; el checker falla con `instruction ... MISSING` cuando se quita el archivo del bundle.
- Prueba OpenCode V2.0.32 desde workspace temporal independiente, con un `HOME` y `XDG_CONFIG_HOME` aislados y el bundle instalado en `~/.config/opencode`: logs muestran watcher para `~/.config/opencode/prompts/communication/CONTROLLED_LANGUAGE.md`; también registra que carga el prompt desde esa ruta.
- `git diff --check` — PASS.
- Limitación: una prueba inicial interactiva se quedó abierta en el TUI porque Linear MCP expiró; se cerró el proceso y se eliminó el HOME temporal. Logs verifican que OpenCode descubrió el archivo global, pero no se verificó la generación/respuesta de un agente ni una delegación a `tech-lead`.

## Estado
Working — la ruta global y su resolución están corregidas; aceptación de descubrimiento confirmada en workspace externo. Falta completar RPI-004: commit y push del arreglo a PR #20. La prueba de conducta de agentes queda pendiente.
