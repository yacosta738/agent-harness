# TDD en el flujo de equipo

## Alinea primero el comportamiento

Antes de dividir trabajo, comparte ejemplos concretos de entrada y resultado esperado. El equipo
debe poder explicar qué contrato protege cada test, no solo qué archivo o método cubre.

## Mantén la retroalimentación útil

- Ejecuta el test afectado mientras desarrollas y la suite relevante antes de integrar.
- Mantén los tests unitarios rápidos; usa CI para las capas más lentas cuando aporten confianza
  adicional.
- Revisa los tests como parte del cambio: nombres, expectativas independientes y ausencia de
  acoplamiento a detalles internos.
- Si un test es intermitente, registra la causa y el seguimiento. No la normalices con reintentos
  permanentes.
- Acordar patrones de nombres, fixtures y dobles reduce diferencias entre autores; no conviertas una
  convención de estilo en una meta de cobertura.

TDD ayuda a descubrir requisitos y mantener cambios pequeños. No exige que cada persona pida
aprobación para una frontera obvia ni que el equipo use un porcentaje único de tests.
