# Tests en código legacy

## Captura primero lo que el sistema ya hace

Cuando el comportamiento existe pero no está documentado, escribe un **test de caracterización** con
ejemplos observables y ejecuta el test contra el sistema actual. Es normal que pase desde el primer
intento: registra la conducta que se debe preservar; no pretende demostrar una funcionalidad
ausente.

Cuando corriges un bug o agregas una regla nueva, escribe un **test de regresión** que represente el
resultado exigido. Ese test debe fallar por la conducta incorrecta antes de implementar el cambio.

## Avanza por riesgo y por cortes pequeños

1. Identifica el código que cambiará y los resultados que los usuarios ya observan.
2. Cubre primero los caminos críticos o las zonas que se modifican con frecuencia.
3. Usa la interfaz disponible. Si no hay una frontera práctica para probar, introduce el cambio más
   pequeño que permita observar el comportamiento sin rediseñar todo el sistema.
4. Refactoriza después de tener una caracterización útil y conserva los tests verdes.
5. Añade el siguiente test cerca del próximo cambio, en lugar de perseguir cobertura total antes de
   trabajar.

No describas un test de caracterización que pasa como el RED de TDD. Después de fijar la conducta
existente, vuelve al ciclo test-first para cada bug o requisito nuevo.
