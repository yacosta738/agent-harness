---
name: code-review
description: Use when the user requests a code review, provides a pull request URL, asks whether changes are ready to merge, or needs a 4R/RDD assessment.
---

# Revisión de código

## Regla principal

Toda revisión cubre las cuatro lentes de `four-r-review`: **R1 Risk**, **R2 Readability**,
**R3 Reliability** y **R4 Resilience**. Una revisión no puede limitarse a estilo ni declarar un
resultado sin evidencia.

Cada invocación explícita de `/review` inicia RDD, aunque el modo global de RDD esté desactivado.
RDD registra una revisión; no autoriza cambios, commits, push, comentarios en GitHub ni entrega.

## Selección del objetivo

- Si el usuario proporciona una URL de pull request, revisa esa PR.
- Si no proporciona una URL, revisa el working tree actual respecto a `HEAD`, incluidos cambios
  staged, unstaged y archivos untracked.
- Si proporciona otro argumento que no es una URL de PR, no lo conviertas en un comando o ruta de
  shell. Pregunta si quiere revisar la PR por URL o el working tree.

### Objetivo de pull request

1. Inicia RDD para la URL. El control plane verifica autenticación y URL canónica, identifica el
   remoto base, obtiene los refs mediante argumentos Git separados y vuelve a comprobar los OID sin
   cambiar el working tree:

   ```bash
   node ~/.config/opencode/scripts/review.mjs start --required --cwd "$PWD" --pr-url "<url>"
   ```

   Usa `baseSha`, `headSha` y `changedPaths` de la respuesta. Si no puede verificar la PR o traer ambos
   commits, detente. Nunca elijas otro objetivo como sustituto y no uses `gh pr checkout`.

2. El control plane calcula el merge base y el diff hasta `head` antes de iniciar la transacción RDD.

### Objetivo local

Sin URL de PR, inicia RDD para el working tree:

```bash
node ~/.config/opencode/scripts/review.mjs start --required --cwd "$PWD"
```

`--required` hace que `/review` inicie RDD sin habilitarlo globalmente. No omitas este flag. No
mezcles un review de PR con cambios locales que no forman parte de esa PR.

## Revisión y evidencia RDD

1. Sigue la secuencia de `rdd-review`. Usa el binding, el `subjectHash`, los revisores y el
   `next_transition` que devuelve el control plane. No reconstruyas tokens ni identidades.
2. Materializa la revisión con `review.mjs materialize` y entrega a los revisores solo esa copia con
   permisos de escritura eliminados. No les pidas que inspeccionen el working tree vivo.
   En Windows, el bit `read-only` de un directorio no sustituye una ACL; el control plane comprueba
   otra vez el árbol durante `capture`. Si hay procesos locales no confiables, usa un entorno Unix.
3. Usa `changedPaths` devuelto por el control plane para delimitar el diff. Revisa esos archivos y
   el contexto necesario dentro del candidato materializado; no revises todo el repositorio ni uses
   el working tree vivo para reconstruir el alcance.
4. Ejecuta los revisores indicados por el resultado de RDD. Usa `code-reviewer` para una revisión
   focalizada y `lens` más `mirror` en paralelo para una revisión de riesgo alto. Una revisión
   documental pasiva también recibe lectura estructural con las cuatro lentes.
5. Clasifica cada hallazgo bajo su lente primaria de 4R. Registra severidad, ruta, impacto y si el
   hallazgo lo causa el candidato. Cada objeto de `findings` incluye `lens` (`R1`–`R4`), `severity`,
   `candidateCaused`, `file` y `description`. Explica por qué una lente no aplica.
6. Captura los hallazgos con los bindings exactos de `start` y los revisores exactos que devolvió el
   control plane:

   ```bash
   node ~/.config/opencode/scripts/review.mjs materialize --cwd "$PWD" \
     --subject-hash "<subjectHash>"
   node ~/.config/opencode/scripts/review.mjs capture --cwd "$PWD" \
     --lineage "<lineage>" --revision "<revision>" --target "<target>" \
     --subject-hash "<subjectHash>" --candidate-path "<materializedPath>" \
     --findings '<JSON>' --reviewers "<names>" --review-evidence '<JSON>'
   ```

   `review-evidence` debe incluir un registro por revisor asignado, con `reviewer`, `subjectHash`,
   `candidatePath`, `verdict` (`CLEAN` o `FINDINGS`), `findings` y un arreglo `lenses` con cuatro
   objetos. Cada objeto identifica una lente (`R1`, `R2`, `R3` o `R4`), un `outcome` (`PASS`,
   `FINDING` o `NOT_APPLICABLE`) y una `rationale` no vacía. Cada hallazgo lleva un `id` estable y
   los mismos datos (`lens`, `severity`, `candidateCaused`, `file`, `description`) en la lista global
   y en la evidencia de al menos un revisor. El control plane rechaza capturas sin el candidato
   materializado exacto, con hallazgos inconsistentes o sin evidencia de las cuatro lentes.

7. Continúa solo según el `next_transition` devuelto. Si el estado es `approved`, usa su binding y
   token exactos para cerrar el recibo:

   ```bash
   node ~/.config/opencode/scripts/review.mjs acknowledge-approved --cwd "$PWD" \
     --lineage "<lineage>" --revision "<revision>" --target "<target>" \
     --subject-hash "<subjectHash>" --acknowledgement "<token>"
   ```

    Si el estado es `escalated` o el candidato no se puede materializar, informa el bloqueo y pide al
    usuario si quiere abandonar o diferir esta revisión. Solo con esa decisión usa
    el binding exacto y el token de recuperación devueltos:

    ```bash
    node ~/.config/opencode/scripts/review.mjs close --cwd "$PWD" \
      --lineage "<lineage>" --revision "<revision>" --target "<target>" \
      --subject-hash "<subjectHash>" --recovery-token "<token>" \
      --resolution "<decisión del usuario>"
    ```

    El cierre queda como `closed_without_approval`; nunca lo presentes como aprobación.

8. Si el estado es `correction_pending`, detente y pide autorización; no edites código durante una
   revisión. Después de una corrección autorizada, ejecuta `review.mjs assess` para obtener el
   `candidateTree` sucesor. Valida ese candidato en una copia aislada y registra cada comprobación
   con `command`, `status`, `exitCode` y el mismo `candidateTree`. Para una PR, vuelve a consultar los
   OID de la misma URL; la URL no puede cambiar. Captura el sucesor con
    `capture-correction --validator-status PASS --validation-evidence <JSON> --pr-url <url>` para
    una PR; el control plane volverá a resolver la URL. No captures `PASS` sin validaciones aprobadas y
    ligadas al hash del árbol. Materializa el
   candidato sucesor y vuelve a revisarlo con 4R y los revisores que devuelve el control plane. Usa el
   nuevo binding para capturar esa revisión. Un hallazgo CRITICAL/P0/P1 adicional escala y no permite
   otra corrección.

El control plane valida la estructura y el binding de `validationEvidence`, pero no ejecuta el
comando que el agente registra. Conserva el resultado real del proceso y no presentes esta evidencia
como verificación independiente del control plane.

## Herramientas relacionadas

- Usa `coderabbit-review` cuando el usuario solicite CodeRabbit o cuando el flujo aprobado lo
  requiera. Clasifica sus hallazgos con 4R, pero no los presentes como revisión manual.
- Usa `double-blind-review` para revisiones adversariales explícitas o cuando el riesgo requiera dos
  revisores. El ciclo RDD de alto riesgo ya exige `lens` y `mirror`; no dupliques una segunda ronda
  con el mismo objetivo sin una razón.
- `/pr-watch` conserva la propiedad de comentarios, hilos y workflows. Usa esta skill para evaluar
  código cuando un hilo o una corrección lo necesite; no inicies otro ciclo RDD desde `/pr-watch`.

## Informe

Presenta primero hallazgos por severidad y lente, después evidencia de las cuatro lentes, objetivo y
OID/estado RDD, validaciones ejecutadas, limitaciones y la siguiente transición o decisión humana.
No declares aprobación si falta evidencia o si el control plane devuelve `Needs your decision`.
