---
name: test-driven-development
description: Usa esta skill para cambiar comportamiento de negocio o producto en RPI o SDD, corregir errores de esa lógica, o cuando se solicite TDD, Red–Green–Refactor, diseño de tests, cobertura, dobles de prueba, diagnóstico de tests intermitentes o tests para código legacy.
license: MIT
---

# Desarrollo dirigido por tests

## Principio

Usa los tests para describir el comportamiento que exige el contrato, no la estructura interna que
lo implementa. Un refactor que conserva el comportamiento no debería obligar a reescribir los tests.

## Cuándo usarla

- TDD es obligatorio en RPI y SDD cuando una tarea cambia lógica de negocio o del producto, incluidas
  funcionalidades, errores de comportamiento y refactors de esa lógica. No existe un modo que el
  proyecto pueda apagar.
- Para comportamiento nuevo o modificado, escribe primero un test que falle y completa
  RED → GREEN → REFACTOR. Para un refactor que conserva el comportamiento, empieza con tests existentes
  que protejan el contrato o añade un test de caracterización antes de refactorizar.
- No uses TDD para documentación, código generado ni cambios de configuración, CI, infraestructura
  o automatización que no contengan lógica de negocio o producto. Ejecuta las validaciones adecuadas
  para esos artefactos y no inventes tests sin señal.
- Si un script o workflow implementa lógica de negocio, usa TDD para esa lógica y valida por separado
  su configuración o empaquetado.
- Si una tarea debe cambiar lógica de negocio o producto y no hay un test runner ejecutable, detén esa
  parte del trabajo y pide configurar o identificar un runner. No sustituyas TDD por tests escritos
  después.
- Antes de cambiar código, revisa las instrucciones del proyecto, el vocabulario de dominio y las
  decisiones de arquitectura cercanas.

## Ciclo Red–Green–Refactor

1. **Define el resultado observable.** Identifica el requisito y la frontera pública adecuada. Elige
   la capa que ofrece señal útil sin hacer el test más amplio de lo necesario. Explica la frontera
   elegida; pregunta solo si el contrato o el alcance no están claros.
2. **RED — escribe un test para una conducta.** Usa la interfaz pública y un resultado esperado
   independiente. Ejecuta el test. Confirma que falla por la conducta ausente, no por errores de
   sintaxis o configuración. Si pasa porque la conducta ya existe, trata el caso como
   caracterización y consulta `references/legacy.md` cuando corresponda.
3. **GREEN — implementa lo mínimo.** Cambia solo lo necesario para pasar el test. Ejecuta el test
   otra vez.
4. **REFACTOR — limpia sin cambiar el comportamiento.** Reduce duplicación o aclara nombres. Mantén
   los tests verdes y vuelve a ejecutarlos después de refactorizar.
5. **Repite en cortes verticales.** Avanza una conducta por ciclo; no escribas toda la batería de
   tests antes de entender lo que enseña cada resultado.

Usa el runner y los comandos que ya define el proyecto. Ejecuta primero el test afectado y después
la validación relevante del proyecto. No reportes RED o GREEN sin la salida que lo demuestra.

## Carga referencias solo cuando apliquen

No leas todas las referencias al activar la skill. Elige las que resuelvan la pregunta actual.

| Necesidad                                                                     | Referencia                                                     |
|-------------------------------------------------------------------------------|----------------------------------------------------------------|
| Definir una unidad de prueba, elegir niveles o interpretar cobertura          | [Fundamentos y niveles de prueba](references/fundamentos.md)   |
| Mejorar estructura, nombres, AAA/GWT, responsabilidad única o datos de prueba | [Diseño y legibilidad de tests](references/diseno-de-tests.md) |
| Elegir entre Dummy, Stub, Fake, Spy y Mock                                    | [Dobles de prueba](references/dobles-de-prueba.md)             |
| Diagnosticar flakiness o reducir falsas señales de confianza                  | [Fiabilidad de los tests](references/fiabilidad.md)            |
| Añadir tests a código sin cobertura o refactorizar código legacy              | [Tests en código legacy](references/legacy.md)                 |
| Acordar prácticas TDD en un equipo                                            | [Flujo de equipo](references/flujo-de-equipo.md)               |
| Consultar ejemplos de código por lenguaje                                     | [Ejemplos de código](references/ejemplos-de-codigo.md)         |
