## Exploration: capability-driven-agent-control-plane

### Current State

La petición corresponde a un cambio nuevo, no a una ampliación segura de
`deterministic-quality-runners-fsm`. El cambio anterior ya entregó la primera capa
(runner configurable y FSM opt-in), pero continúa activo en `qa` con `BLOCKED` y
los bloqueadores P1 documentados en
`openspec/changes/deterministic-quality-runners-fsm/qa-report.md:100-116`:
no existe target final/producto u operador independiente, no hay adapter ejecutable
de verify/QA, y el rollout dotfiles/Dotter no está materializado. Su
`state.yaml` permanece en `current_phase: qa`, `next: qa`; no se modifica ni se
archiva como parte de esta exploración.

#### Qué propone SwarmForge y qué significa para este harness

Las dos fuentes estudiadas convergen en un control plane donde el código posee el
workflow, las herramientas poseen las mediciones, la evidencia posee la verdad, el
LLM posee el razonamiento y el humano posee las excepciones
(`swarm-forge.md:610-651`, `deep-research-report-crap-tools.md:1045-1173`). Las
ideas portables son:

| Idea | Valor para OpenCode | Tratamiento recomendado |
|---|---|---|
| Capability separada de role | Un mismo workflow puede usar un worker pequeño o varios especialistas sin cambiar la máquina. SwarmForge ya separa ownership de calidad (`swarm-forge.md:28-77`; `deep-research-report-crap-tools.md:814-851`). | Portar. Declarar `specify`, `edit_product`, `edit_tests`, `review`, `run_quality`, `run_mutation`, `run_acceptance`, `architecture_review` y `approve_waiver` como capabilities; mapear agentes a ellas de forma contextual. |
| Handoffs/queues durables | El filesystem sobrevive a compaction/restart, y los helpers son dueños de `new → in_process → completed`, con selección determinista, atomicidad y rechazo de ambigüedad (`swarm-forge.md:79-139`; `deep-research-report-crap-tools.md:254-306`). | Portar el principio, no tmux. Crear una cola change-scoped con helpers/scripts; el agente solicita un handoff y no mueve estados. |
| Helpers dueños de transiciones | Evita que el agente invente `done`, prioridad o ownership. | Portar extendiendo `sdd-fsm.mjs`; una transición sólo nace de una acción validada y evidencia válida. |
| State capsule mínima | El worker recibe estado actual, objetivo, evidencia, acciones permitidas y resultado esperado, no el procedimiento completo (`swarm-forge.md:147-230`; `deep-research-report-crap-tools.md:507-553`). | Portar. Derivar cápsulas desde FSM/policy y reducir prompts a contexto del estado. |
| Workers frescos y batch | El estado fuera de la conversación permite sustituir modelos y consumir lotes sin memoria procedural (`swarm-forge.md:35-47`; `deep-research-report-crap-tools.md:852-894`). | Portar como estrategia de ejecución, no como seis agentes permanentes. El plugin actual ya tiene sesiones aisladas y notificación batch, pero no queue durable. |
| Ownership independiente de calidad | Coder no certifica mutation/CRAP/DRY; verify y QA son contextos independientes (`swarm-forge.md:47-77`; `deep-research-report-crap-tools.md:87-93`). | Portar y reforzar con capabilities/permisos. La separación de `sdd-apply`, `sdd-verify` y `sdd-qa` ya existe en prompts, pero no está impuesta por runtime. |
| Change Impact Set | Mutation diferencial usa hashes de funciones; la abstracción útil es changed source, affected tests, changed functions, boundaries y acceptance specs (`swarm-forge.md:234-277`; `deep-research-report-crap-tools.md:680-705`). | Portar incrementalmente. Primera versión: base/head SHA y archivos cambiados; función/boundary mapping queda adapter-specific y puede ser `UNAVAILABLE`. |
| Toolchain lock | La reproducibilidad exige identidad y versión/commit de cada provider, separada de upgrades explícitos (`swarm-forge.md:380-448`, `:956-1051`; `deep-research-report-crap-tools.md:916-967`). | Portar. Añadir lock de proyecto y registrar versión/digest; no resolver `latest` durante gates. |
| SHA-bound evidence | Toda evidencia debe estar ligada a task/run/base/head, toolchain, comando/config y hash del artefacto (`deep-research-report-crap-tools.md:1127-1167`). | Portar como prioridad alta. Evidencia vieja queda stale después de cambiar `HEAD`. |
| Waivers humanos | Una excepción explícita mantiene honestidad sin permitir que el agente rebaje una regla (`deep-research-report-crap-tools.md:997-1022`). | Portar. El evento debe exigir identidad humana, razón, finding, alcance y expiración; nunca ser una acción LLM. |
| Capas mutation/CRAP/DRY/acceptance | CRAP combina complejidad y cobertura; mutation mide efectividad de tests; DRY genera candidatos; acceptance mutation comprueba conexión entre especificación y comportamiento (`swarm-forge.md:281-376`; `deep-research-report-crap-tools.md:114-252`). | Portar como capabilities/adapters opcionales, con evidencia normalizada y policy por proyecto. |
| Gates deterministas | El agente puede pedir verificación, pero sólo el harness puede producir `*_PASSED` y cambiar estado (`swarm-forge.md:503-535`; `deep-research-report-crap-tools.md:63-67`). | Portar. Es la evolución natural del runner/FSM existente. |

CRAP debe conservar semántica de sus inputs: la fórmula es
`CC² × (1 - coverage)³ + CC`, pero cobertura por instrucción, statement o form no
es intercambiable entre lenguajes (`swarm-forge.md:777-863`). Mutation no debe
convertirse en un motor genérico: PIT, Stryker, mutmut, cargo-mutants y mutate4*
dependen de lenguaje/runtime (`swarm-forge.md:928-952`). DRY debe producir
candidatos estructurales para revisión semántica, no fallar automáticamente por
similaridad (`deep-research-report-crap-tools.md:969-995`).

#### Qué ya existe

| Superficie | Evidencia concreta | Límite actual |
|---|---|---|
| Runner | `scripts/sdd-quality-runner.mjs:13-17` y `scripts/sdd-runner-lib/{config,exec,result,redact}.mjs` ejecutan argv/shell opt-in, timeout, allowlist de entorno, redacción, parser, artifacts y estados `PASS/FAIL/BLOCKED/UNAVAILABLE/NOT_TESTED`. | No tiene policy `required/preferred/disabled`, impact set, task/base/head SHA, provider/version lock, evidence hash del envelope ni agregación de gates por cambio. El `run_id` y el hostname introducen identidad de ejecución, pero no prueban qué commit fue verificado. |
| FSM | `scripts/sdd-fsm.mjs:23-30` y `scripts/sdd-runner-lib/state.mjs:46-68` ya hacen lock, revision/hash, idempotencia, precondiciones, gates de reports y escritura atómica. | Sólo gobierna fases OpenSpec. No hay event log append-only, handoff queue, claim/recovery de workers, ni validación de evidencia ligada a Git SHA. En raíz permanece `workflow_fsm.enabled: false` (`openspec/config.yaml:91-95`). |
| SDD roles | `opencode.json:329-446` registra executors ocultos `sdd-{phase}`; los prompts fuerzan que sean executors y no deleguen. `sdd-apply`, `sdd-verify` y `sdd-qa` tienen ownership textual separado. | El prompt es la autoridad práctica: `sdd-apply` aún puede usar `bash/edit/write`, verify puede editar según config, y no existe capability registry ni enforcement de que quien produce código no certifique sus gates. |
| Kerrigan/especialistas | `opencode.json:242-318` da a Kerrigan delegación y a especialistas roles amplios (tech lead, senior dev, QA, security, reviewer, etc.). | Son roles estáticos con permisos amplios, no capabilities declaradas. Kerrigan puede orquestar y razonar, pero el runtime no le impide declarar un estado por texto si la ruta de prompt no usa el FSM. |
| Background agents | `plugins/background-agents.ts:505-692` crea sesiones aisladas; `:746-773` completa por `session.idle`; `:836-865` persiste Markdown; `:873-928` notifica y agrupa completions. | `DelegationManager` mantiene el estado vivo en `Map`; sólo persiste el resultado final bajo `~/.local/share/opencode/delegations/{project}/{root-session}`. No hay outbox/inbox, claim atómico, prioridad canónica, `in_process`, restart recovery ni evidencia de gate. La metadata title/description también la genera otro modelo. |
| Engram | `plugins/engram.ts:221-277`, `:330-395` y `:423-447` registran sesiones, prompts, resultados y contexto de compaction. | Es memoria/observabilidad y puede no-op si el servidor no está disponible (`:126-149`); no debe ser source of truth de transición, evidencia o waiver. |
| OpenSpec/QA | `skills/sdd/_shared/openspec-convention.md:5-83`, `openspec/config.yaml:35-84` y `prompts/sdd/sdd-qa.md:22-52` fijan artefactos, verdicts, severidades, fallback y archive gate. | Reports son Markdown escritos por el agente. El QA actual conserva una frontera honesta, pero reporta `BLOCKED` porque no existe adapter ejecutable de verify/QA y el rollout está fuera del checkout (`qa-report.md:79-108`). |
| Integraciones | `opencode.json:80-109`, `:150-163` y `:208-223` habilitan Semgrep, CodeGraph, Playwright/Chrome y dejan SonarQube deshabilitado. | Son herramientas disponibles, no un registry/adapter contract ni una matriz de capabilities por proyecto. |
| Distribución | El source se consume como submódulo de dotfiles; la exploración previa documenta `dotfiles/.gitmodules`, Dotter y referencias relativas (`deterministic-quality-runners-fsm/exploration.md:87-100`). | QA confirma que el submódulo y `~/.config/opencode` no contienen aún runner/FSM (`qa-report.md:82-85`). Source → dotfiles → effective config sigue siendo un gate externo. |

#### Huecos y duplicación con el cambio anterior

El cambio anterior ya debe considerarse la capa **execution/state safety**. No se
debe duplicar otro runner, otro lock de `state.yaml`, otro redactor o una segunda
FSM. La nueva capa debe consumir sus contratos y ampliar solamente:

1. **Policy/identity:** el runner actual ejecuta capabilities declaradas, pero no
   sabe si la capability es obligatoria para este tipo de cambio ni si la evidencia
   corresponde al `HEAD` que se está revisando.
2. **Scope:** no existe Change Impact Set; por eso no se puede pedir mutation/CRAP
   diferencial ni detectar evidencia stale de forma fiable.
3. **Coordination:** la FSM de fases no es una FSM de handoffs; background agents
   tiene persistencia de resultados, no ownership durable.
4. **Agent contract:** prompts describen procedimiento y delegación; no reciben una
   cápsula generada desde el estado ni una lista de outcomes autorizados.
5. **Independent authority:** verify/QA están separados por diseño, pero permisos,
   runner y reportes no impiden que el modelo interprete un fallo como PASS.
6. **Metrics:** sólo existe una capacidad genérica que puede ejecutar cualquier
   comando. No hay schemas normalizados para coverage/complexity/CRAP/mutation/DRY,
   ni fallback explícito por capability no soportada.

### Affected Areas

- `scripts/sdd-quality-runner.mjs` y `scripts/sdd-runner-lib/` — ampliar el envelope con identidad de cambio, Git base/head, impact set, toolchain y policy; conservar ejecución, timeout, redacción y estados existentes.
- `scripts/sdd-fsm.mjs` y `scripts/sdd-runner-lib/state.mjs` — reutilizar la autoridad actual para acciones/guards; añadir más adelante eventos de handoff y validación de evidencia, sin crear una segunda FSM.
- `scripts/` — candidato para helpers standalone de handoff/claim/complete y cápsulas; es el lugar de menor riesgo porque no depende de APIs de OpenCode.
- `openspec/quality-runner.schema.json` y `openspec/quality-runner.json` — evolucionar el contrato de capabilities, requisitos y adapters; no activar defaults globales.
- `openspec/config.yaml` — agregar sólo policy de proyecto (required/preferred/disabled, scopes, thresholds, waiver y feature flags); conservar `quality_runner.enabled: false` y `workflow_fsm.enabled: false` hasta rollout controlado.
- `openspec/changes/{change}/state.yaml` y artefactos — mantener `state.yaml` como estado SDD; añadir referencias a evidence/handoffs sin convertir Markdown del agente en autoridad.
- `prompts/sdd/sdd-apply.md`, `sdd-verify.md`, `sdd-qa.md` y `skills/sdd/**` — convertir instrucciones procedurales en state capsules y adapters de interpretación; conservar reportes y vocabulario QA.
- `commands/sdd-continue.md` — exigir cambio explícito mientras existan dos carpetas activas y consumir el resultado del FSM, nunca inferir desde prompt.
- `plugins/background-agents.ts` — sólo adapter posterior para notificación/launch de acciones; no poner aquí la verdad de colas, policy ni gates.
- `plugins/engram.ts` — mantenerlo como memoria/telemetría; no mezclarlo con evidence store ni workflow state.
- `opencode.json` — no tocar en la primera slice. La configuración actual tiene permisos amplios (`bash *: allow`, `opencode.json:10-19`) y plugins `@latest`; cualquier endurecimiento requiere validación del runtime instalado y rollout source → dotfiles → effective config.
- `README.md` y `.agents/skill-registry.md` — documentar capabilities, fallback, perfiles, distribución y regla de explicit change name después de que exista propuesta aprobada.
- `/Users/acosta/Dev/dotfiles/.gitmodules`, `/Users/acosta/Dev/dotfiles/.dotter/global.toml` y `~/.config/opencode` — sólo rollout/verificación posterior; esta exploración no los modifica.

#### Modelo de integración propuesto

| Agente/rol actual | Capabilities que puede ejercer | No debe poseer |
|---|---|---|
| `kerrigan` | clasificar intención, enrutar, pedir acción, interpretar evidencia, solicitar aprobación humana | declarar gate PASS, mutar evidencia/estado, aprobar waiver por sí mismo |
| `sdd-init`, `sdd-explore`, `sdd-propose`, `sdd-spec`, `sdd-design`, `sdd-tasks` | especificar/diseñar, editar artefactos SDD, preparar criterios y handoff | certificar calidad de código o avanzar estado por prosa |
| `sdd-apply` / `senior-dev` | editar producto/tests, reparar findings, solicitar verificación | calcular/autorizar gates; puede ejecutar feedback local sólo si policy lo permite |
| `sdd-verify` / `qa-engineer` | ejecutar capabilities técnicas, consumir evidence, interpretar findings, escribir verify report | editar producto para “arreglar” el gate o fabricar evidencia |
| `sdd-qa` | ejecutar/observar acceptance, consumir evidence, escribir QA report | modificar source, convertir `UNAVAILABLE` en PASS o archivar |
| `tech-lead` / `code-reviewer` | revisar arquitectura, boundaries, impacto y decisiones semánticas | reemplazar una medición determinista |
| `security-engineer`, `devops-engineer`, `performance-engineer`, `ux-designer`, `product-manager`, `data-engineer` | capability específica según el cambio y target | convertirse en roles permanentes obligatorios para todo cambio |

La cápsula mínima debe contener: `change_id`, `task_id`, `run_id`, `role`,
`capability/state`, objetivo actual, scope/impact-set, base/head SHA, referencias de
evidence, acciones permitidas, outcomes permitidos (`request_verification`,
`blocked`, `implementation_ready`, etc.) y restricciones. Debe omitir la cadena
“paso 1, luego paso 2...” porque esa secuencia pertenece al FSM/policy.

La separación de datos recomendada es:

- `openspec/changes/{change}/state.yaml`: estado SDD compatible, único estado de fase.
- `openspec/changes/{change}/handoffs/{outbox,inbox/new,inbox/in_process,inbox/completed,failed}/`: handoffs change-scoped, si el contrato de cola demuestra que el filesystem es suficiente.
- `artifacts/runs/{run-id}/`: reutilizar la ubicación actual del runner para evidence JSON/Markdown; añadir `change_id`, SHA y digest, no duplicar otro evidence store.
- `openspec/changes/{change}/events.jsonl`: log append-only de acciones/transiciones para auditoría/replay; no sustituir inmediatamente `state.yaml`.
- `openspec/quality-toolchain.lock` (o nombre equivalente definido por propuesta): lock perteneciente al proyecto; no meter toolchain de cada proyecto en `opencode.json`.
- `~/.local/share/opencode/delegations/` y Engram: resultados/recuerdos operativos no autoritativos; nunca gate truth.

Primero deben usarse scripts existentes y sus interfaces observables. Un plugin o
custom tool sólo sería una fachada fina (`status`, `act`, `evidence`, `handoff`)
después de verificar el runtime instalado. El repositorio sí demuestra el uso de
`tool({ args, execute })` y `client.session.*` en `background-agents.ts`, pero no
hay evidencia local suficiente para asumir nuevos hooks, `.opencode/tools/` o APIs
de ejecución adicionales. No se debe introducir esa dependencia en la primera
slice.

#### Policies y métricas

Todas las métricas son project-configurable y cada capability conserva provider,
versión, semántica, scope y razón de no disponibilidad:

| Capability | Política inicial recomendada |
|---|---|
| tests, lint, types/build | `required` sólo cuando el proyecto declara una ejecución válida; scope changed/affected por defecto; un proyecto sin manifest queda en fallback visible. |
| coverage | preferida al inicio; exigir sólo si existe parser/provider y mapping fiable; preferir changed-code coverage, no subir globalmente una deuda histórica. |
| complexity + CRAP | policy de changed-functions. Empezar con warning configurable alrededor de 6 y hard limit/régression definido por proyecto (por ejemplo 12 antes de ratchet), registrando `cyclomatic`, coverage value/semantics/provider y fórmula. CRAP ≤6 no es universal. |
| mutation | provider específico de lenguaje, differential por impact set; registrar total/killed/survived/uncovered/timeout/error. Survivors equivalentes requieren juicio, no un blind failure. |
| DRY | scanner determinista produce pares/similarity como advisory; una decisión de consolidar pertenece a arquitectura/revisión semántica. |
| acceptance | ejecutar sólo si hay target/runner/feature pipeline; acceptance mutation es una segunda capa y no reemplaza source mutation. |
| architecture | required/preferred sólo donde existen reglas o adapter (boundaries/dependency direction/property tests); no inferir una arquitectura universal. |

Semántica de requisitos:

- `required`: si no está disponible, la policy del gate queda bloqueada; nunca se
  transforma en PASS.
- `preferred`: si no está disponible, se registra `UNAVAILABLE`/warning y se puede
  continuar sólo si la policy explícita lo permite.
- `disabled`: no se ejecuta y queda `NOT_TESTED` con razón.

El envelope debe incluir `task/change/run`, `base_sha`, `head_sha`, impact-set
digest, provider/version/commit o digest, command/config digest, timestamp, exit
code, normalized result, artifact hashes y evidencia redacted. Un cambio de `HEAD`
invalida evidence dependiente de ese SHA. Las upgrades de toolchain son operaciones
separadas, revisables y pinneadas; no se debe reproducir la política de descargar
`latest` que la fuente critica (`swarm-forge.md:380-448`).

### Approaches

1. **Continuar `deterministic-quality-runners-fsm`** — añadir capability registry, colas, cápsulas y métricas dentro de la carpeta/ciclo existente.
   - Pros: un solo active change, reutiliza runner/FSM y evita resolución ambigua.
   - Cons: mezcla una capa de arquitectura nueva con un cambio aún `BLOCKED` en QA; invalidaría el alcance ya verificado, duplicaría artifacts y haría imposible distinguir qué bloquea el cierre.
   - Effort: High

2. **Nuevo cambio explícito sobre la fundación existente (recomendado)** — `capability-driven-agent-control-plane`, con la primera slice de identidad/policy/evidence y slices posteriores de handoff, cápsulas y adapters de métricas.
   - Pros: límites y rollback claros; no reabre el cambio anterior; permite capability profiles y adopción gradual; mantiene scripts como núcleo portable.
   - Cons: mientras el cambio anterior siga activo hay dos carpetas; el orchestrator debe exigir `Change name` explícito y no usar auto-resume. La nueva carpeta queda en hold hasta resolver los bloqueadores P1 o aprobar formalmente el trabajo en paralelo.
   - Effort: Medium/High, dividido en slices

3. **Portar sólo roles/prompts o hacer un plugin central** — reforzar `AGENTS.md`, prompts y `background-agents.ts` sin un contrato nuevo de evidencia/queue.
   - Pros: bajo cambio inicial y buena integración visual con OpenCode.
   - Cons: mantiene el procedimiento y la verdad dentro del LLM; el plugin añade riesgo de API/distribución; no resuelve SHA-bound evidence, policy, stale state ni métricas reproducibles.
   - Effort: Low inicialmente, High deuda/riesgo

### Recommendation

Crear el cambio nuevo `capability-driven-agent-control-plane`, pero no iniciar
`sdd-propose` hasta que `deterministic-quality-runners-fsm` tenga una decisión
explícita sobre sus bloqueadores de QA. No es una continuación técnica del mismo
ciclo: es la segunda capa que consume sus contratos. La exploración queda en una
carpeta separada, sin `proposal.md`, `specs/` ni `design.md`, y con un `state.yaml`
de fase `explore` únicamente como marcador de handoff.

La primera slice de mayor ROI debe ser **evidence trust boundary + capability
policy + changed-file impact set**:

1. extender el envelope existente sin duplicar runner/FSM;
2. capturar change/task/base/head, archivos cambiados y digest de configuración;
3. expresar `required/preferred/disabled` y fallback sin convertir unavailable en pass;
4. registrar provider/tool/version/config/artifact hashes y marcar evidence stale;
5. cubrirlo con fixtures/smokes antes de tocar prompts o plugins.

Después:

1. **Handoff queue**: helpers atómicos change-scoped, claim único, prioridad canónica, restart recovery y eventos append-only.
2. **State capsules/adapters**: `sdd-apply`, verify, QA y Kerrigan reciben sólo estado/evidence/outcomes actuales; permisos se endurecen sólo con APIs verificadas.
3. **Capability registry/resolver**: adapters declarativos por proyecto; `FAST/STANDARD/FULL` son perfiles de capabilities, no cantidad de agentes.
4. **Quality layers**: test/lint/types/coverage/complexity/CRAP, luego mutation/acceptance/architecture/DRY según disponibilidad; CRAP y mutation con semantics/provider.
5. **Human waivers + toolchain lock**: eventos no emitibles por agentes y upgrades explícitos.
6. **Distribution/acceptance**: source checkout → dotfiles submodule → Dotter → effective `~/.config/opencode`, con target/operator real antes de cerrar QA.

No portar literalmente tmux, seis roles permanentes, prompts que enumeran
procedimientos, `latest`/unpinned tools, CRAP ≤6 universal, DRY similarity como
fallo automático ni edición de state/evidence por agentes. Esas decisiones son
contrarias a la portabilidad, reproducibilidad o separación de autoridad del
harness actual.

### Risks

- **Ambigüedad de cambios activos:** el cambio anterior sigue en `qa/BLOCKED`. Hasta archivarlo o recibir autorización explícita de paralelo, todas las fases deben recibir `Change name: capability-driven-agent-control-plane`; `/sdd-continue` sin argumento debe detenerse ante múltiples carpetas. No se debe seleccionar por “único active change”.
- **Falsa confianza en evidence:** sin base/head/toolchain/command hashes, un PASS anterior puede referirse a otro estado del mundo. Ésta es la primera prioridad.
- **Policy excesiva:** CRAP ≤6, cobertura global o mutation full-repo convierten cada cambio en remediación histórica y fomentan gaming. Usar changed scope, warning/hard limit por proyecto y ratchet explícito.
- **Semántica por lenguaje:** CRAP/mutation/coverage/acceptance requieren adapters; `UNAVAILABLE` es una señal honesta, no una invitación al LLM a estimar.
- **Colas/races/worktrees:** `background-agents` es in-memory y sus resultados Markdown no garantizan ownership. Helpers deben ser atómicos, rechazar múltiples claims y poder reconstruir estado tras restart.
- **Agente auto-modificando el gate:** `opencode.json` y `sdd-apply` tienen permisos amplios. No confiar sólo en prompt; futuras restricciones deben negar state/evidence/toolchain a workers, pero sin inventar patrones de permission no verificados.
- **Runtime/distribución:** plugins, MCP, dotfiles y `~/.config/opencode` pueden divergir; no añadir integración de runtime hasta probar source, submodule y effective config.
- **Coste y flakiness:** mutation, E2E y MCP pueden exceder timeouts o depender de credenciales/red; policy debe distinguir `FAIL`, `BLOCKED`, `UNAVAILABLE` y `NOT_TESTED`.
- **Scope de review:** la segunda capa cruza scripts, schemas, prompts, plugins y rollout. Cada slice debe forecast y guard de 400 líneas; no mezclar todo en un PR/ciclo.

### Ready for Proposal

**No para ejecución inmediata; sí para propuesta condicionada.** El orquestador
debe primero mantener visible el bloqueo de `deterministic-quality-runners-fsm`,
no archivarlo ni reescribirlo, y decidir si autoriza el nuevo cambio en paralelo.
Cuando exista esa decisión, `sdd-propose` debe convertir esta exploración en un
alcance acotado a la primera slice, declarar compatibilidad con el runner/FSM
existentes, feature flags off por defecto, fallback para proyectos sin manifest,
waiver humana y rollout source → dotfiles → effective config. No debe comenzar por
CRAP/mutation completos ni por un plugin OpenCode.

### Evidence Summary

- Fuentes de referencia: `/Users/acosta/Downloads/swarm-forge/swarm-forge.md` y `/Users/acosta/Downloads/swarm-forge/deep-research-report-crap-tools.md`.
- Fundaciones existentes: `scripts/sdd-quality-runner.mjs`, `scripts/sdd-fsm.mjs`, `scripts/sdd-runner-lib/`, `openspec/quality-runner.schema.json`, `openspec/config.yaml`.
- Roles/prompts: `opencode.json:242-446`, `prompts/sdd/sdd-apply.md`, `prompts/sdd/sdd-verify.md`, `prompts/sdd/sdd-qa.md`.
- Delegación/memoria: `plugins/background-agents.ts:505-1109`, `plugins/engram.ts:221-447`.
- Bloqueo de ciclo previo: `openspec/changes/deterministic-quality-runners-fsm/state.yaml` y `qa-report.md:79-123`.

---

**Status**: success
**Executive Summary**: SwarmForge aporta principios de control plane —capabilities separadas de roles, handoffs durables, cápsulas mínimas, ownership independiente y evidencia determinista— que encajan como segunda capa sobre el runner/FSM existente. La integración debe ser un cambio nuevo, `capability-driven-agent-control-plane`, pero queda condicionada por el QA `BLOCKED` del cambio anterior y requiere selección explícita para evitar ambigüedad.
**Artifacts**: `openspec/changes/capability-driven-agent-control-plane/exploration.md`, `openspec/changes/capability-driven-agent-control-plane/state.yaml`
**Next Recommended**: Resolver/autorizar explícitamente el cierre o paralelismo de `deterministic-quality-runners-fsm`; después ejecutar `sdd-propose` sólo para `capability-driven-agent-control-plane`.
**Risks**: Ambigüedad entre cambios activos, evidence no ligada a SHA, policy de métricas excesiva, adapters por lenguaje ausentes, colas in-memory/races, permisos amplios, runtime/dotfiles skew y review >400 líneas.
