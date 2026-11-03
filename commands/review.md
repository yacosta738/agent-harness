---
description: Review a pull request URL or the local working tree with mandatory 4R and RDD.
agent: kerrigan
---

# Revisión de código

Usa la skill `code-review` y sigue su procedimiento. Toda invocación de `/review` activa RDD y aplica
las cuatro lentes 4R.

## Selección del objetivo

- Si `$ARGUMENTS` contiene una URL HTTPS de una pull request, revisa esa PR.
- Si no se proporciona argumento, revisa el working tree local respecto a `HEAD`.
- Si se proporciona un argumento que no es una URL de PR, detente y pregunta cuál de esos dos
  objetivos quiere revisar el usuario.

Para una PR, inicia RDD con su URL. El control plane valida la URL y obtiene los refs sin cambiar el
working tree:

```bash
node ~/.config/opencode/scripts/review.mjs start --required --cwd "$PWD" --pr-url "<url>"
```

El comando verifica autenticación, URL canónica, remoto y OID; devuelve `baseSha`, `headSha` y
`changedPaths`. No uses `gh pr checkout`. Si no puede verificar la PR, detente y no revises otro
objetivo como sustituto.

Sin URL de PR, inicia RDD para el working tree local:

```bash
node ~/.config/opencode/scripts/review.mjs start --required --cwd "$PWD"
```

Materializa el candidato y revisa solo esa copia con permisos de escritura eliminados. Usa los revisores y transiciones que
devuelve el control plane. Delimita el review con sus `changedPaths`; revisa esos archivos y solo el
contexto necesario. Abarca R1 Risk, R2 Readability, R3 Reliability y R4 Resilience en cada review;
registra evidencia incluso cuando una lente no aplica.

No arregles código, no publiques comentarios en GitHub, no hagas commit ni push. `/pr-watch` conserva
la gestión de hilos y workflows. Si RDD requiere una corrección o falta evidencia, detente y reporta
la decisión o el requisito pendiente.
