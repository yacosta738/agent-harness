---
name: test-driven-development
description: Usa esta skill al implementar o cambiar comportamiento, corregir errores o refactorizar con test-first; también cuando se solicite TDD, Red–Green–Refactor, diseño de tests unitarios/integración/E2E, cobertura, dobles de prueba, diagnóstico de tests intermitentes o tests para código legacy.
license: MIT
---

# Desarrollo dirigido por tests

## Principio

Usa los tests para describir el comportamiento que exige el contrato, no la estructura interna que
lo implementa. Un refactor que conserva el comportamiento no debería obligar a reescribir los tests.

## Cuándo usarla

- Usa test-first para cambios de comportamiento, funcionalidades y correcciones de errores, salvo
  que las instrucciones del proyecto o de la sesión definan otro modo.
- Para documentación, código generado y cambios sin efecto de comportamiento, sigue las reglas del
  proyecto; no inventes una prueba que no aporta señal.
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
