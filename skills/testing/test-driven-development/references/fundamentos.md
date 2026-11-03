# Fundamentos y niveles de prueba

## Qué significa “unidad” en un test unitario

Una unidad es una conducta con sentido propio, no necesariamente una clase o una función aislada. El
test observa esa conducta desde una frontera pública. Puede usar colaboradores internos reales;
aísla dependencias externas solo cuando aportan coste, no determinismo o efectos secundarios que no
pertenecen al test.

## Niveles de prueba

La pirámide es una heurística para balancear rapidez y realismo, no una cuota fija:

| Nivel       | Qué verifica                                                                | Uso habitual                                                                               |
|-------------|-----------------------------------------------------------------------------|--------------------------------------------------------------------------------------------|
| Unitario    | Una conducta mediante una frontera pública pequeña                          | Muchos tests rápidos para reglas y decisiones de negocio                                   |
| Integración | La colaboración real entre componentes o con infraestructura de prueba      | Menos tests para detectar errores de configuración, persistencia y contratos entre módulos |
| E2E         | Un recorrido representativo desde una entrada de usuario hasta un resultado | Pocos recorridos críticos, porque suelen ser más lentos y costosos de diagnosticar         |

Las pruebas manuales complementan la automatización. No son otro nivel de la pirámide ni sustituyen
las regresiones reproducibles.

Elige el nivel más pequeño que demuestre el requisito con confianza suficiente. Sube de nivel cuando
el riesgo esté en la colaboración, la infraestructura o el recorrido completo.

## Cobertura de código

No conviertas el 100% de cobertura en un objetivo universal. La cobertura indica qué código
ejecutaron los tests; no demuestra que las aserciones sean correctas ni que validen el requisito.

Usa la cobertura para encontrar zonas sin señal. Prioriza comportamientos críticos, decisiones,
límites, errores y riesgos del producto. Una línea ejecutada sin una expectativa significativa no es
evidencia de calidad.

Para ejemplos por lenguaje, consulta [los ejemplos de código](ejemplos-de-codigo.md).
