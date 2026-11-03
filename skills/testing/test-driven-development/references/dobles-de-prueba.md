# Dobles de prueba

Usa un doble cuando la dependencia real haga el test lento, no determinista, costoso o capaz de producir un efecto externo. Prefiere primero la dependencia real, un entorno de prueba o una implementación falsa pequeña. No simules colaboradores internos solo para controlar cada llamada.

| Tipo | Propósito | Ejemplo de uso |
|---|---|---|
| **Dummy** | Ocupa un parámetro que el escenario no usa | Un contexto requerido por una interfaz, irrelevante para el comportamiento probado |
| **Stub** | Devuelve una respuesta preparada | Una respuesta de rechazo de una pasarela externa |
| **Fake** | Tiene una implementación simplificada pero funcional | Un repositorio en memoria que conserva y recupera datos |
| **Spy** | Registra una interacción para observarla después | Confirmar que se envió un mensaje requerido a un destinatario concreto |
| **Mock** | Define expectativas sobre interacciones | Comprobar un contrato externo cuando el resultado no basta para observarlo |

No trates todos los dobles como equivalentes. Elige el menor que preserve el comportamiento necesario para el test:

1. Usa la dependencia real cuando sea rápida, determinista y segura.
2. Usa un fake o stub cuando necesites controlar una frontera externa sin perder el comportamiento del sistema bajo prueba.
3. Usa un spy solo cuando la interacción sea parte del contrato, no para inspeccionar la colaboración interna.
4. Usa un mock de interacción con moderación. Si un refactor que conserva el comportamiento rompe el test, el test probablemente verifica un detalle interno.

No compruebes que el doble “funciona”; comprueba el resultado del sistema. Mantén la forma de los datos preparados coherente con el contrato real y evita respuestas parciales que oculten supuestos.

No añadas métodos a clases de producción solo para facilitar el setup o la limpieza de tests. Coloca esa responsabilidad en utilidades de prueba, salvo que el ciclo de vida también pertenezca al contrato de producción. Cuando prepares respuestas externas, representa los campos que el sistema consume según el esquema real; un doble incompleto puede ocultar un fallo de integración.

Si configurar el doble ocupa más que la conducta bajo prueba, si simula demasiados colaboradores o si no puedes explicar por qué hace falta, prueba primero con componentes reales en un test de integración. El test no debe pasar solo porque exista un doble.

Los [ejemplos de código por lenguaje](ejemplos-de-codigo.md) muestran una implementación falsa que también registra el dato enviado a una frontera externa. Esa observación es válida porque el importe enviado forma parte del contrato del checkout.
