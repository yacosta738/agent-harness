# Design: Capability Adapters

## Technical Approach

Añadir una capa delgada sobre `sdd-quality-runner.mjs`: el registry `capability-registry/v1` resuelve una entrada explícita y `metrics/v1` valida/normaliza su salida. El runner actual conserva ejecución, timeout, argv/shell, allowlist, redaction, límites, evidence, hashes y escrituras de artefactos. No habrá autodetección, descargas, `latest` ni segundo ejecutor.

La extensión de `quality-runner/v1` es aditiva: sin registry conserva legacy; con adapter exige resolución estricta y toolchain pinneado. `quality-runner-result/v1` sigue siendo compatible; control plane usa su envelope `v2` con FSM/handoff, locks, revision y freshness existentes.

## Architecture Decisions

| Decisión | Elección y alternativas rechazadas | Rationale |
|---|---|---|
| Registry | `registry.version = capability-registry/v1`, entradas por id; `capability.adapter` debe coincidir exactamente. Rechazados defaults y autodetección. | Hace provider, semántica y scopes auditables y portables. |
| Ejecución | El adapter devuelve una declaración compatible con `argv`/parser del runner; nunca crea procesos ni escribe archivos. Rechazados ejecutores por Node/Python/ShellCheck. | Evita duplicar timeout, seguridad y evidencia. |
| Toolchains | Resolver sólo acepta provider y versión exactos presentes en `quality-toolchain.lock`; rechaza `latest`, rangos, downloads y network resolution. | Reproducibilidad y ausencia honesta. |
| Scope/estado | `project` conserva el proyecto declarado; `changed-files` exige impacto Git `AVAILABLE`, digest y paths normalizados. Provider ausente es `UNAVAILABLE`; policy `required` lo promueve a `BLOCKED`; disabled es `NOT_TESTED`; ejecución inválida/resultado negativo es `FAIL`. | Nunca convierte scope parcial en global ni confunde imposibilidad con fallo de calidad. |

## Modules and Data Flow

- `metrics.mjs`: registry, resolver y normalizadores de `tests`, `lint`, `coverage`; conserva normalizadores legacy fuera del registry.
- `config.mjs` y schema: validan registry, adapter, policy, scope y referencias; preservan argv y shell opt-in.
- `sdd-quality-runner.mjs`: obtiene scope/toolchain, despacha y entrega la declaración al runner.
- `result.mjs`/`evidence-boundary.mjs`: transportan métricas al envelope; redaction, artifacts y hashes siguen centrales.
- `toolchain.mjs`/`git-impact.mjs`: validan pins y entregan el impacto determinista existente.

```text
manifest -> strict resolver -> scope/toolchain context -> existing runner
                                      |                     |
                                      +-> adapter normalize <- execution
                                                           -> redacted evidence + artifact hashes
```

Para `changed-files`, el resolver sólo pasa la lista POSIX ordenada que proviene del impacto. Si el provider no declara soporte explícito para paths, la capability queda no ejecutable; jamás se reintenta como `project`.

## Interfaces / Contracts

```js
// metrics/v1 (persisted after central redaction/hash collection)
{
  version: 'metrics/v1', metric: 'tests|lint|coverage', adapter: 'tests/node',
  provider: 'node-test', provider_version: '24.16.0', semantics: 'provider-defined/v1',
  scope: 'project|changed-files', raw: {}, normalized: {},
  artifacts: [{ path: '...', sha256: '...', status: 'AVAILABLE|UNAVAILABLE' }]
}
```

`result` conserva `{status, reason}` y añade `metrics` sólo tras resolución válida. `normalized` contiene campos definidos por la entrada y fixture; `raw` conserva la forma parseada y redacted. Providers: Node test y pytest para tests, ShellCheck para lint, y Node coverage; Python coverage sólo con pin local declarado. Ninguno se instala o descubre.

## Parsing, Errors and Security

Se reutilizan `parseOutput` (`none/json/regex`) y parsers declarados por provider. La normalización es fixture-first y versionada. JSON inválido, contrato incompleto o threshold rechazado produce `FAIL`; provider/version, identidad Git, scope, path o pin inválido produce `BLOCKED`; `ENOENT` produce `UNAVAILABLE`; disabled es `NOT_TESTED`. Salidas y métricas pasan por el redactor central. `resolveInside`, `collectArtifacts`, `hashArtifact` y permisos `0600` siguen obligatorios; ningún adapter cruza el root.

## File Changes and Manifests

| Archivo | Acción | Descripción |
|---|---|---|
| `scripts/sdd-runner-lib/metrics.mjs` | Modify | Registry, resolver, contrato y normalizadores iniciales. |
| `scripts/sdd-runner-lib/{config,result,evidence-boundary,toolchain,git-impact}.mjs` | Modify | Validación y transporte aditivo; sin cambiar autoridad. |
| `scripts/sdd-quality-runner.mjs` | Modify | Dispatch y contexto de scope/toolchain. |
| `openspec/quality-runner.schema.json` | Modify | Schema de registry/adapter/policy/scope. |
| `openspec/quality-runner.json` | Preserve | Sigue `enabled:false` y sin capabilities por defecto. |
| `openspec/quality-toolchain.lock` | Modify only when verified | Añadir únicamente pins locales comprobados; no cambiarlo ahora. |
| `scripts/fixtures/` y `scripts/*smoke*.sh` | Create/modify | Fixtures y smokes; sin root test runner. |

No se tocan `opencode.json`, dotfiles, plugins, prompts, `.codegraph` ni `openspec/changes/archive/2026-08-09-capability-driven-agent-control-plane/`.

## Testing Strategy and Slices

Fixture-first RED/GREEN: cada slice añade fixture fallido y mínima implementación; sin root runner no se reclama TDD completo. Slice 1 (registry/schema/resolver/estados): 100–180 líneas. Slice 2 (dispatch, pins, scopes y seguridad): 140–240 líneas. Slice 3 (normalización, artifacts, control-plane y smokes): 180–320 líneas. Cada slice usa guard de 400 líneas, `node --check`, JSON y smokes. Casos: cinco estados, provider ausente, `latest`/rangos/downloads, scope no degradable, raw/normalized/hashes y fixture por versión.

## Rollout / Rollback

Rollout opt-in: registrar entradas y declarations en un change explícito, verificar localmente pins y ejecutar smokes con flags globales `quality_runner`, `control_plane` y `workflow_fsm` apagados. Rollback: retirar declarations/registry y revertir slices; el runner legacy, envelopes existentes, `state.yaml`, handoffs y change archivado permanecen intactos. No requiere migración.

## Open Questions

Ninguna bloqueante; compatibilidad legacy es aditiva y la distinción `UNAVAILABLE`/`BLOCKED` queda fijada por la policy anterior.
