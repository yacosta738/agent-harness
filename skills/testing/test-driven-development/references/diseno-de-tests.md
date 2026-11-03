# Diseño y legibilidad de tests

## Verifica el comportamiento, no la estructura interna

Describe qué puede observar quien usa el módulo. Prefiere resultados, estado público o efectos
externos que formen parte del contrato. Evita tests de métodos privados, llamadas internas, conteos
y orden de colaboración cuando esos detalles no sean un requisito observable.

El dato esperado debe tener una fuente independiente: un valor conocido, un ejemplo trabajado o el
contrato. No vuelvas a implementar el mismo algoritmo dentro del test para calcular la expectativa.

## Una conducta por test

Aplica responsabilidad única al motivo del test: valida una conducta observable y tiene una razón
principal para fallar. Puede contener varias aserciones si todas explican el mismo resultado. No
mezcles comportamientos independientes solo para reducir el número de tests.

## Arrange–Act–Assert y Given–When–Then

Usa **Arrange–Act–Assert (AAA)** como estructura predeterminada, salvo que el proyecto ya use una
convención de comportamiento como GWT:

1. **Arrange:** prepara el escenario y los datos relevantes.
2. **Act:** ejecuta la operación bajo prueba una vez.
3. **Assert:** comprueba el resultado observable.

**Given–When–Then (GWT)** expresa una idea cercana con lenguaje de escenario: dado un contexto,
cuando ocurre una acción, entonces se observa un resultado. Si el equipo usa GWT, mantén esa
convención. No dupliques las dos estructuras en un mismo test.

## Nombres y datos

- Nombra el comportamiento y el resultado esperado; evita nombres como `works` o `test1`.
- Haz que la preparación revele solo los datos que cambian el escenario.
- Prefiere valores explícitos y funciones de fixture con nombres de escenario.
- `Object Mother` puede ayudar cuando representa estados válidos y reconocibles. No lo conviertas en
  una fábrica global con defaults ocultos o decenas de parámetros opcionales.
- Mantén el setup local si compartirlo hace que el test dependa de estado mutable o de una
  configuración escondida.

Para ejemplos ejecutables que muestran una frontera externa,
consulta [los ejemplos de código](ejemplos-de-codigo.md).
