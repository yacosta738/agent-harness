# OpenCode-first layout

## Objetivo
Reestructurar el harness para usar OpenCode como adapter principal, manteniendo una fuente canónica portable y un bundle generado en `dist/opencode` que no quede versionado ni trackeado.

## Alcance
- Consolidar la política portable en `AGENTS.md` y manterner el overlay OpenCode separado.
- Mover los artefactos específicos de OpenCode a `adapters/opencode/`.
- Mantener `skills/`, `prompts/`, `references/` como fuentes canónicas.
- Convertir `dist/opencode` en salida generada, no versionada.
- Actualizar renderer, verificadores y enlaces para que trabajen con el adapter OpenCode.

## Riesgos
- Romper el flujo de clone directo antiguo si no se documenta y se mantiene un enlace seguro.
- Dejar referencias rotas entre comandos, prompts y skills durante la migración.
- Generar artefactos tracked por error o dejar `.DS_Store`/dist versionados.

## Criterios de aceptación
- `adapters/opencode/adapter.json` define composición y capa de renderizado.
- `scripts/harness-config.mjs` soporta `render`, `verify`, `check` y `link` con `--adapter opencode`.
- `dist/opencode` queda ignorado y sin archivos tracked.
- La documentación recomienda `link` sobre `git clone ... ~/.config/opencode`.
- Las pruebas y smokes usan `verify` y validan determinismo y seguridad del link.

## Trabajo a realizar
1. Inspeccionar `opencode.json`, `scripts/harness-config.mjs` y `.gitignore`.
2. Diseñar el adapter `adapters/opencode` con la composición declarativa requerida.
3. Reorganizar archivos y eliminar copias de salida del repo.
4. Actualizar render/verify/check/link y documentar la migración.
5. Ejecutar validación puntual: Node tests + smoke + diff check.
