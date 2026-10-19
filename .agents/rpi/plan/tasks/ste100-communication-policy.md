# Política de comunicación inspirada en ASD-STE100

## Ruta
Delegated direct. La integración conecta instrucciones globales de OpenCode, estilo existente, composición de presets y validación. No se inicia SDD porque no se solicitó un ciclo durable de propuesta, especificación, diseño y aplicación.

## Objetivo
Aplicar principios de comunicación técnica clara y consistente en todos los agentes. Usar ASD-STE100 para comunicación técnica en inglés sin declarar conformidad oficial; conservar el idioma de la solicitud y la exactitud del contenido.

## Tareas
- [x] RPI-001 Inspeccionar configuración OpenCode, estilo, presets y validadores actuales.
- [x] RPI-002 Añadir una política compartida y conectarla a OpenCode y los presets.
- [x] RPI-003 Resolver conflictos entre la política y el estilo/persona existentes sin alterar contratos de agentes.
- [x] RPI-004 Añadir comprobación de referencias e inspección de bundles para idioma, estructura y preservación semántica normativa.
- [x] RPI-005 Ejecutar validaciones enfocadas y registrar evidencia.

## Criterios de aceptación
- Todos los presets incluyen la política compartida en el bundle.
- OpenCode carga la política mediante configuración nativa, sin plugin Claude.
- Se conserva el idioma de la solicitud y la terminología/identificadores técnicos exactos.
- La política no cambia `MUST`, `SHOULD`, `MAY`, negaciones, cifras, condiciones ni incertidumbre.
- Se conserva la personalidad conversacional existente fuera de la comunicación técnica.
- Las pruebas y validaciones relevantes pasan; las limitaciones se documentan.

## Evidencia
- `npm run validate` — PASS; verificó 28 referencias `{file:}`/instrucciones y 38 patrones del adapter.
- `npm run deploy -- --preset minimal` — PASS; `dist/opencode/opencode.json` carga la política y el archivo está presente.
- `npm run deploy -- --preset recommended` — PASS; la política está presente y configurada.
- `npm run deploy -- --preset full` — PASS; la política está presente y configurada.
- Comprobación Node de los tres bundles — PASS; todos contienen la ruta en `instructions` y el archivo de política.
- `git diff --check` — PASS.
- Limitación: una primera ejecución paralela de deploy falló por competir por el mismo directorio `dist/opencode`; se repitió secuencialmente y los tres presets pasaron.

## Estado
Ready — todos los presets cargan y distribuyen la política. No se afirma conformidad oficial ASD-STE100 ni se automatizó una evaluación lingüística del modelo. La siguiente etapa opcional sería evaluar respuestas generadas con casos de prueba y considerar linter con diccionario licenciado.
