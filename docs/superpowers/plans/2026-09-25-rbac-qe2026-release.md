# Publicación RBAC en QE2026 — plan de ejecución

> **Registro histórico del release:** este plan se preparó antes de la ejecución. La autorización inicial cubría solo su preparación; Pedro aprobó posteriormente y por separado la aplicación de RBAC en QE2026. No repetir sus pasos operativos sin una nueva revisión y autorización.

**Estado posterior (2026-09-25):** Pedro aprobó por separado la ejecución sin copia integral. Se aplicó exclusivamente RBAC mediante el conector y el historial remoto asignó `20260925200537`. Los controles de catálogo, grants y conteos pasaron; Pedro confirmó manualmente un nuevo inicio de sesión con la contraseña restablecida. La evidencia del gate de acceso está en `docs/AUDIT.md`; siguen pendientes la conciliación de versiones de migración y la verificación de otros roles. Las casillas siguientes conservan el procedimiento de release como referencia y no deben interpretarse como tareas por repetir.

**Objetivo:** alinear el backend productivo de QE2026 con el frontend RBAC ya publicado en el código para que el inicio de sesión pueda consultar `get_crm_session_context()` sin relajar la autorización.

**Arquitectura:** conservar `private.crm_authorized_users` como fuente de permisos. Aplicar únicamente `supabase/migrations/20260917000000_phase_9_rbac_foundation.sql` después de reconciliar el historial; verificar funciones, RLS y grants sin ejecutar mutaciones de negocio. Si falla, revertir con `docs/PHASE-9-RBAC-ROLLBACK.md` y el deployment frontend compatible.

**Entorno:** Supabase QE2026 (`izbfawwmbilmsrdjaanw`), PostgreSQL 17.6; Next.js/TypeScript en el repositorio QE.

## Límites y estado comprobado el 2026-09-25

- Al elaborar este plan no se había aplicado SQL ni se habían cambiado datos productivos.
- `get_crm_session_context()` y los wrappers `admin_*` no existen en QE2026; `is_crm_authorized()` sí existe.
- La allowlist contiene una membresía `admin` activa y una `member` activa; no se consultaron identificadores ni correos.
- Las nueve tablas CRM públicas tienen RLS y la política anterior `crm_allowlist_all` para `authenticated`.
- La migración RBAC fue validada 11/11 en un proyecto desechable y su reversión fue ensayada allí; ver `docs/AUDIT.md` y `docs/PHASE-9-RBAC-ROLLBACK.md`.
- El historial remoto sí registra la baseline `20260720000000`, pero varias migraciones previas tienen versiones/nombres distintos de los archivos locales. Por ello está prohibido ejecutar `supabase db push` sin reconciliación y un dry-run que muestre **únicamente** RBAC.
- Los pares a conciliar son, como mínimo: campaña piloto local `20260721023246` / remota `20260721030022`; aprobación y maestros local `20260721170728` / remota `20260721173624`; campaña de colegios local `20260826000000` / remota `20260827015743`. La equivalencia debe comprobarse contra el esquema y el SQL, no por similitud de nombres.
- Revisión de solo lectura posterior: los tres pares anteriores son idénticos al normalizar espacios y comentarios de su SQL registrado; también coinciden exactamente las migraciones locales/remotas `20260720001733`, `20260720002112`, `20260720012701` y `20260720031715`. Dos casos no son textualmente equivalentes: `20260720000000` fue registrado remotamente con una nota de reconciliación porque el esquema ya existía, y `20260720012043` sembró membresías en la versión remota mientras el archivo local fue depurado para no sembrar identidades. Ninguno de los dos debe ejecutarse de nuevo.
- La CLI de Supabase no está instalada en este entorno. No se obtuvo un `migration list --linked` ni un dry-run de CLI; el historial remoto se leyó mediante el conector de Supabase. Antes del despliegue debe habilitarse una herramienta de publicación trazable o aprobarse un procedimiento alternativo específico.
- Las funciones heredadas de revisión, conciliación, autorización y borrado que la migración necesita existen en QE2026; las nueve tablas y las dos membresías activas por rol también. Esta comprobación de catálogo no sustituye una prueba autenticada posterior.
- La organización de QE2026 figura en el plan **Free**. Supabase no ofrece a proyectos Free las copias diarias automáticas de Pro/Team/Enterprise; no se ha verificado ni creado una exportación lógica independiente. El SQL de reversión ensayado protege el esquema/permisos afectados, pero no equivale a una copia completa de la base de datos. Antes de ejecutar, Pedro debe elegir entre obtener una exportación lógica verificable o aceptar expresamente este riesgo residual para una migración sin cambios de filas.
- El archivo RBAC revisado tiene SHA-256 `E3333A7D9C394A6ADABB3E41A4D51BE5791A0BAF920B0797A5B8DDD45135FE1E`. No contiene instrucciones `INSERT`, `UPDATE`, `DELETE`, `TRUNCATE`, `DROP TABLE` ni `ALTER TABLE` al inicio de línea; sí modifica funciones, RLS y grants.
- Los avisos de seguridad previos incluyen las dos RPC públicas por token, las tablas sin política de cliente y la protección de contraseñas filtradas deshabilitada. No confundirlos con una regresión del release.

## Impacto esperado

| Superficie | Antes | Después de RBAC |
| --- | --- | --- |
| Sesión | Comprobación booleana `is_crm_authorized()` | Nuevo contexto con rol `admin` o `member`; la comprobación anterior permanece |
| Trabajo comercial | Política `FOR ALL` para miembros activos | `SELECT`, `INSERT` y `UPDATE` explícitos para miembros activos |
| Enlaces y respuestas de clientes | Acceso por allowlist | Lectura/gestión restringida al rol `admin` mediante RLS y wrappers |
| Borrado físico | Grant anterior disponible | `DELETE` y RPC `delete_prospect` retirados a clientes |
| Filas existentes | Sin transformación prevista | Sin `INSERT`, `UPDATE` ni `DELETE` de negocio en la migración |

El cambio altera permisos productivos. Puede interrumpir el login o las operaciones administrativas si el esquema remoto difiere del ensayado. Por eso el gate de historial, la captura del estado anterior y el rollback son obligatorios.

## Etapa 1 — Reconciliar historial y comprobar precondiciones (solo lectura)

- [ ] Confirmar `git status --short --branch`, commit exacto, versión de Supabase CLI con `supabase --version` y sintaxis vigente con `supabase migration list --help`, `supabase migration repair --help` y `supabase db push --help`.
- [ ] Comparar `supabase migration list --linked` con el historial remoto y con los archivos de `supabase/migrations/`. Explicar por escrito cada par de versiones históricas distintas; no asumir equivalencia por el nombre.
- [ ] Verificar de nuevo el ref enlazado `izbfawwmbilmsrdjaanw`, las nueve tablas y RLS, las dos membresías activas por rol, funciones, políticas y grants. Capturar definiciones de políticas/grants y conteos agregados sin datos personales.
- [ ] Comprobar que ninguna migración anterior sigue pendiente materialmente y que la RBAC no fue aplicada por otro operador. Si existe divergencia de esquema o historial no explicada, detener el release.
- [ ] Preparar una reconciliación de historial separada y revisada si el dry-run no puede aislar RBAC. Reparar historial modifica metadatos remotos y exige autorización explícita; no ejecutar el SQL histórico otra vez.

## Etapa 2 — Preparar release y reversión

- [ ] Confirmar que `supabase/migrations/20260917000000_phase_9_rbac_foundation.sql` es idéntica a la versión ensayada, y que `docs/PHASE-9-RBAC-ROLLBACK.md` restaura las políticas y grants capturados en QE2026. El muestreo de solo lectura del 2026-09-25 coincide: nueve políticas `crm_allowlist_all`, grants de tabla `SELECT/INSERT/UPDATE/DELETE` y ejecución de las seis RPC heredadas para `authenticated`.
- [ ] Resolver el gate de recuperación: obtener una exportación lógica verificable fuera de Git mediante una herramienta apropiada y credenciales manejadas fuera de la conversación, o registrar una aceptación explícita de operar sin backup de datos para esta migración sin DML, usando el rollback SQL ensayado y el snapshot de catálogo. El plan Free no ofrece una copia diaria automática para este proyecto.
- [ ] Preparar el deployment frontend anterior compatible para revertirlo primero, como indica `docs/PHASE-9-RBAC-ROLLBACK.md`.
- [ ] Ejecutar el gate local `pnpm verify`; conservar el resultado de las 11 pruebas aisladas ya realizadas sin volver a ejecutar pruebas mutantes en producción.
- [ ] Obtener un dry-run de la herramienta de despliegue que liste solo `20260917000000_phase_9_rbac_foundation.sql`. Si lista otra migración o no puede conciliar el historial, detenerse.
- [ ] Vía autorizada para preparación: conector de Supabase `apply_migration` con `project_id` `izbfawwmbilmsrdjaanw`, nombre `phase_9_rbac_foundation` y como `query` el contenido exacto del archivo con SHA-256 anterior. No invocar todavía. Este método ejecuta una sola migración y evita un `db push` general, pero no ofrece el mismo dry-run y podría registrar una versión remota distinta de `20260917000000`; conservar el identificador que devuelva y planear su reconciliación con el archivo local.
- [ ] Presentar a Pedro el diff SQL exacto, riesgo, ventana, respaldo disponible, dry-run y pasos de reversión, y solicitar aprobación **separada** para aplicar RBAC en QE2026.

## Etapa 3 — Aplicar solo tras nueva autorización

- [ ] Confirmar nuevamente proyecto/ref e historial inmediatamente antes de ejecutar. No usar un `db push` general si el dry-run no está limpio.
- [ ] Aplicar solamente la migración RBAC aprobada mediante el mecanismo que preserve un historial trazable. Registrar versión, hora y resultado sin incluir correos, UUID, tokens ni payloads.
- [ ] Repetir consultas de solo lectura: función de contexto y cinco wrappers presentes, grants mínimos, RLS/políticas por operación, ausencia de `DELETE` para `authenticated`, y conteos agregados de filas/membresías iguales al estado previo.
- [ ] Revisar advisors de seguridad/rendimiento y distinguir los avisos existentes de nuevos hallazgos. No invocar RPC mutantes ni pruebas con datos reales.
- [ ] Pedir a Pedro que valide login con su contraseña nueva, navegación comercial y acceso administrativo en el preview; no solicitar ni registrar su clave.

## Reversión si falla el gate

1. Detener nuevas publicaciones y guardar únicamente commit, hora, ruta y mensaje de error saneado.
2. Volver primero al deployment frontend compatible con las RPC heredadas; no dejar un frontend que dependa de `admin_*` sobre el esquema revertido.
3. Con autorización de rollback, aplicar el SQL ya ensayado en `docs/PHASE-9-RBAC-ROLLBACK.md` únicamente si el estado remoto coincide con el capturado antes del release.
4. Verificar que vuelven las nueve políticas `crm_allowlist_all`, los grants anteriores y las RPC heredadas; comparar conteos, advisors y login.
5. Reconciliar el historial de migraciones con el estado realmente restaurado. No marcar RBAC como aplicada si sus políticas y grants fueron revertidos.
6. Registrar incidente, evidencia y decisión en `docs/AUDIT.md`. No restaurar datos ni ejecutar purgas: esta migración no modifica filas.

## Criterio de cierre

El release solo se considera cerrado si el historial registra únicamente la migración aprobada, los checks de backend y frontend pasan, los conteos de datos no cambian y Pedro confirma el acceso al CRM. Un build verde o una solicitud de recuperación exitosa no bastan para cerrar el login RBAC.
