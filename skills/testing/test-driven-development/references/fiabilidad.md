# Fiabilidad de los tests

## Diagnostica tests intermitentes

Un test que pasa unas veces y falla otras no es una señal confiable. Reproduce el fallo y busca una
causa antes de modificar las aserciones.

Revisa estas fuentes:

- Dependencia del reloj, zonas horarias o fechas límite.
- Aleatoriedad sin semilla controlada.
- Estado global o compartido entre tests.
- Orden de ejecución, concurrencia o carreras de datos.
- Red, servicios externos, puertos y límites de tiempo.
- Recursos que no se limpian: archivos, procesos, conexiones o datos de prueba.
- Esperas fijas que asumen una duración en vez de esperar una condición.

Prefiere reloj inyectable, semilla reproducible, datos aislados, limpieza explícita y esperas por
condición. No añadas `sleep` arbitrarios ni reintentos a ciegas: pueden esconder la causa. Un
reintento solo es una contención temporal con seguimiento claro, no una corrección.

## Reduce la brecha entre tests y producción

Ninguna suite puede garantizar que el sistema no falle en producción. Los tests reducen riesgo; no
eliminan diferencias de datos, infraestructura, carga o configuración.

Reduce la falsa confianza con evidencia de varios niveles:

- Ejecuta integración con infraestructura de prueba realista cuando el contrato depende de ella.
- Valida contratos externos con respuestas y esquemas documentados; no simules solo los campos que
  el test inmediato espera.
- Mantén la configuración de prueba lo más cercana posible a la configuración real.
- Añade E2E para recorridos críticos, no para cada detalle interno.
- No conviertas una suite de mocks en la única prueba de una integración importante.

Para elegir el nivel adecuado, consulta [fundamentos y niveles](fundamentos.md). Para el trabajo con
sistemas sin cobertura, consulta [tests en código legacy](legacy.md).
