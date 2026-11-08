---
description: Revisa una PR y, si el runtime lo permite, programa seguimiento limitado.
---

# Vigilar una pull request

Carga `skills/github/pr-watch/SKILL.md` y sigue sus instrucciones. Transmite `$ARGUMENTS` sin
alterarlo como identificador opcional de PR (número o URL); si está vacío, la skill resolverá la PR
de la rama actual. Invocar `/pr-watch` autoriza cambios locales dentro del alcance y respuestas o
resoluciones de hilos justificadas por evidencia, pero no autoriza commit ni push. Las instrucciones
explícitas de solo lectura prevalecen. Las correcciones de GitHub Actions requieren la aprobación
explícita exigida por `gh-fix-ci`.
