# Proposal: Capability Adapters

## Problema y objetivo

El runner existente ejecuta comandos de forma segura y ya distingue `PASS`, `FAIL`, `BLOCKED`, `UNAVAILABLE` y `NOT_TESTED`, pero no existe un registry formal ni un contrato versionado que haga comparables los resultados de tests, lint y coverage. Sin esa frontera, provider, scope, semántica, toolchain y artefactos pueden perderse o interpretarse como salud global. El objetivo es añadir adapters deterministas sobre el runner actual, sin crear otro ejecutor ni activar enforcement global.

## No-objetivos

- CRAP, mutation, DRY, acceptance y architecture adapters.
- Permisos runtime, prompts/skills, distribución/Dotter.
- Cambios en `opencode.json`, dotfiles, plugins, `.codegraph` o el change archivado `capability-driven-agent-control-plane`.
- Activar gates globales o introducir un root test runner.

## Alcance por slices pequeños

1. Registry/versionado, schema y validación de declaraciones; contrato `metrics/v1` con `provider`, `provider_version`, `semantics`, `scope`, `raw`, `normalized`, `artifacts` y estado.
2. Integración con el runner existente, preservando argv por defecto, shell opt-in, redacción, límites, hashes y compatibilidad runner v1/v2/control plane previo.
3. Adapters reales iniciales para tests y lint, con providers explícitos y normalización fixture-first.
4. Coverage usando providers disponibles y pinneados; ausencia de provider produce `UNAVAILABLE`/`BLOCKED`, nunca un pass implícito.
5. Scopes explícitos `project` y `changed-files`; este último exige evidencia Git y jamás se deriva de un resultado global. Añadir fixtures/smoke tests para estados, scopes, artefactos y rechazo de `latest`, rangos, downloads o network resolution.

La planificación deberá mantener cada slice revisable y pronosticar el guard de 400 líneas; gates globales permanecen off.

## Capabilities

### New Capabilities
- `capability-adapters`: registry versionado, contrato `metrics/v1`, adapters de test/lint/coverage, scopes, toolchains y estados honestos.

### Modified Capabilities
- `capability-policy`: registry explícito, providers pinneados y disponibilidad sin inferencia.
- `evidence-trust-boundary`: envelope adapter-bound con semántica, scope, normalización y artefactos.
- `change-impact-set`: evidencia obligatoria para `changed-files` y rechazo de scope supuesto.

## Compatibilidad y áreas afectadas

Extender aditivamente `metrics/v1` y conservar lectura de resultados existentes; no modificar el change archivado. Impacta `scripts/sdd-runner-lib/{metrics,config,result,toolchain,git-impact}.mjs`, `scripts/sdd-quality-runner.mjs`, `openspec/quality-runner.schema.json`, lock de toolchains y fixtures. `openspec/quality-runner.json`, control plane y FSM siguen desactivados.

## Riesgos y mitigación

| Riesgo | Mitigación |
|---|---|
| Drift de providers/salidas | pins inmutables y fixtures por versión |
| False pass por scope o cobertura ausente | evidencia obligatoria y estados no-passing |
| Ruptura de consumidores `metrics/v1` | extensión aditiva y compatibilidad de lectura |
| Diff no revisable | slices y guard de 400 líneas |

## Rollback

Revertir los cambios de registry/adapters/schema/fixtures y retirar sus declaraciones; mantener intactos el runner previo, sus evidencias y el change archivado. Con gates off, el rollback no requiere migración ni cambio de enforcement.

## Criterios de éxito

- [ ] Registry y contrato `metrics/v1` validan todos los campos y estados definidos.
- [ ] Tests, lint y coverage usan únicamente providers locales, pinneados y declarados.
- [ ] `project`/`changed-files`, artefactos y normalización quedan auditables; ningún global se presenta como changed-files.
- [ ] Fixtures/smokes prueban PASS/FAIL/BLOCKED/UNAVAILABLE/NOT_TESTED y rechazo de toolchains no pinneados.
- [ ] Gates globales, runner previo y control plane permanecen sin activarse.

## Preguntas abiertas

- ¿La extensión aditiva de `metrics/v1` requiere una ventana explícita de compatibilidad para consumidores legacy?
- ¿Qué providers locales deben entrar en el lock inicial además de Node test/coverage, pytest y ShellCheck?
- ¿Qué política exacta decide `BLOCKED` frente a `UNAVAILABLE` por capability requerida/preferred?
