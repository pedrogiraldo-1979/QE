# Metodología de desarrollo

## Fuente y versión local

QE adopta [obra/superpowers](https://github.com/obra/superpowers) como metodología complementaria de desarrollo a partir del 2026-07-20.

- Origen: `https://github.com/obra/superpowers`
- Commit instalado: `d884ae04edebef577e82ff7c4e143debd0bbec99`
- Copia local: `.superpowers/`
- Entrada obligatoria: `.superpowers/skills/using-superpowers/SKILL.md`
- Adaptación de herramientas: `.superpowers/skills/using-superpowers/references/codex-tools.md`
- Licencia local: `.superpowers/LICENSE`

La copia se mantiene fuera de Git mediante `/.superpowers/`: es memoria local de desarrollo y no forma parte del código, dependencias o despliegue del CRM. El commit anterior permite reconstruir exactamente la instalación. Para actualizarla se debe revisar primero el cambio upstream y registrar el nuevo commit en este documento.

## Precedencia

1. Instrucciones del sistema y del usuario.
2. `AGENTS.md`, el PRD vigente, el roadmap y los gates propios de QE.
3. Skills de Superpowers aplicables.
4. Convenciones generales del agente.

Superpowers no autoriza por sí mismo cambios de Supabase, datos, rutas, dependencias, servicios externos ni ninguna otra acción protegida por un gate de QE. Las skills que usan subagentes sólo se aplican cuando el usuario o las reglas activas autorizan expresamente ese modo de trabajo.

## Flujo operativo

Para cada tarea:

1. Leer `using-superpowers` y seleccionar la skill aplicable antes de explorar o editar.
2. Para nuevas funcionalidades o cambios de comportamiento, usar `brainstorming` antes de diseñar la solución.
3. Para errores, usar `systematic-debugging` y establecer la causa antes de proponer un arreglo.
4. Para trabajos de varias etapas, usar `writing-plans`; ejecutar el plan con `executing-plans` dentro del alcance aprobado.
5. Para implementación, aplicar `test-driven-development` cuando sea técnicamente pertinente y compatible con el cambio.
6. Antes de declarar un resultado terminado, aplicar `verification-before-completion` y además cumplir los gates de QE: como mínimo typecheck y pruebas; build y smoke para cambios funcionales.
7. Usar `requesting-code-review`, `receiving-code-review` y `finishing-a-development-branch` cuando el trabajo llegue a esas etapas.

Las skills `dispatching-parallel-agents` y `subagent-driven-development` son opcionales y quedan subordinadas a la política activa de colaboración. `using-git-worktrees` debe respetar la rama, los cambios locales existentes y las restricciones del workspace.

## Skills instaladas

- `brainstorming`
- `dispatching-parallel-agents`
- `executing-plans`
- `finishing-a-development-branch`
- `receiving-code-review`
- `requesting-code-review`
- `subagent-driven-development`
- `systematic-debugging`
- `test-driven-development`
- `using-git-worktrees`
- `using-superpowers`
- `verification-before-completion`
- `writing-plans`
- `writing-skills`

Los archivos auxiliares referenciados por estas skills también están instalados bajo `.superpowers/skills/`.
