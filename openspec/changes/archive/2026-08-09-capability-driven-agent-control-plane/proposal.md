# Proposal: Capability-Driven Agent Control Plane

## Intent

La evidencia puede parecer válida aunque corresponda a otro `HEAD`, scope,
toolchain o configuración. Este cambio porta ideas de SwarmForge/Uncle Bob como
segunda capa sobre `scripts/sdd-quality-runner.mjs`, `scripts/sdd-runner-lib/` y
`scripts/sdd-fsm.mjs`: capabilities, impacto determinista y evidencia confiable.
No crea CLI, clona tmux/six-pack ni implementa aún.

## Objectives

- Ligar evidencia a `change/task/run`, `base_sha/head_sha`, impact-set, config,
  toolchain y hashes de artefactos; detectar evidencia stale.
- Hacer project-configurable `required/preferred/disabled` y perfiles
  `FAST/STANDARD/FULL` como capabilities, no como conteo de agentes.
- Mantener fallback visible sin manifest y feature flags off por defecto.

## Scope by slices

1. **Slice 1:** extender envelope/policy con identidad y digest de
   archivos cambiados por Git base→head; registrar impact-set, provider/version/
   commit, toolchain lock/version, command/config y artifact hashes; rechazar
   `latest` durante gates. Definir changed-code scopes para coverage/CRAP/mutation:
   CRAP conserva semantics/provider y ratchet por proyecto; mutation es específica
   por lenguaje; DRY advisory; acceptance opcional.
2. **Contrato de roles:** integrar capabilities con Kerrigan, `sdd-apply`, verify,
   QA y especialistas, sin inventar APIs runtime; ningún agente declara gates.
3. **Posteriores:** adapters de funciones/boundaries/
   acceptance; eventos append-only; waivers humanas con identidad, razón y
   expiración; handoff/state capsules con atomicidad y recuperación.

## Non-objectives and Capabilities

Fuera de alcance: modificar `opencode.json` en Slice 1 o tocar
`deterministic-quality-runners-fsm`, que sigue separado en `qa/BLOCKED`; runtime
plugin, seis agentes permanentes, cobertura global, CRAP universal, DRY como fallo
o acceptance sin target/runner.

**New:** `evidence-trust-boundary`, `change-impact-set`, `capability-policy`.
**Modified:** `acceptance-qa`, para consumir evidencia identificada y conservar
`UNAVAILABLE/BLOCKED/NOT_TESTED` e independencia de verify.

## Approach, Actors and Impact

Kerrigan enruta/interpreta; apply edita; verify certifica mediciones; QA certifica
aceptación; especialistas revisan semántica. Afecta `scripts/sdd-runner-lib/`,
schemas, `openspec/config.yaml`, prompts y documentación; consume ejecución,
timeouts, redacción, estados y guards existentes. Ningún agente declara `PASS` o
aprueba waivers.

## Compatibility, Rollout and Rollback

El cambio anterior no se reabre ni modifica. Rollout: source checkout → submódulo
dotfiles → Dotter → effective `~/.config/opencode`, verificando cada etapa; flags
`quality_runner` y `workflow_fsm` siguen apagados. Rollback: desactivar policy/flags,
retirar artifacts y revertir esta carpeta; los contratos previos quedan intactos.

## Risks

| Risk | Mitigation |
|---|---|
| SHA, scope o semantics incorrectos | hashes/providers explícitos y policy por proyecto |
| Adapter, target o runtime ausente | fallback visible; `UNAVAILABLE/NOT_TESTED`, nunca `PASS` |
| Races, permisos o distribución divergente | slices separadas y rollout source→effective |

## Dependencies

Git, manifest/config opcional y contratos actuales del runner/FSM.

## Approval and Success Criteria

- [ ] Todos los fixtures/smokes prueban identity, impact digest, stale evidence, policy,
  fallback y rechazo de `latest`.
- [ ] Specs/design derivan capabilities; flags siguen off y `opencode.json` no cambia.
- [ ] Rollout/rollback son verificables; `deterministic-quality-runners-fsm` permanece intacto.
- [ ] Cada slice tiene rollback y estrategia de revisión ≤400 líneas cambiadas.
