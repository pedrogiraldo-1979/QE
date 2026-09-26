# Contratos de datos y Supabase

Fecha de verificación del contrato base: 2026-07-19. La validación RBAC del 2026-09-24 se hizo en el proyecto desechable `QE RBAC Validation Temp` (`xuqcgcfqzpjuxjnchukb`), sin modificar producción. El snapshot de tipos se contrastó de nuevo el 2026-09-25 con QE2026 (`izbfawwmbilmsrdjaanw`) mediante generación de solo lectura; la conciliación del historial de migraciones sigue pendiente.

## Fuente canónica

- `src/lib/database.types.ts` es el snapshot generado del esquema remoto expuesto por la Data API de QE2026. La salida del generador y el archivo versionado coinciden tras normalizar CRLF/LF; esta coincidencia no demuestra que los archivos de migración locales reproduzcan todo el esquema productivo.
- `src/lib/types.ts` conserva únicamente vocabulario de dominio y compatibilidad de lectura sobre los tipos generados.
- `src/lib/data/queryColumns.ts` define las columnas que el frontend solicita; no se usa `select("*")`.
- `src/lib/data/queryLimits.ts` distingue selectores de referencia de feeds resumidos.
- Los tipos deben regenerarse desde Supabase después de cada migración y revisarse en el mismo commit; no se editan formas de tablas o RPC manualmente.
- `supabase/migrations/20260720000000_initial_crm_baseline.sql` es la fuente estructural para proyectos vacíos. No contiene usuarios, membresías ni filas; las migraciones posteriores conservan la evolución incremental.

El ajuste del 2026-09-25 incorporó al snapshot `campaign_pilot_recipients.batch_key`, la cardinalidad real de su vínculo con `cu_links`, `claim_campaign_batch` y el campo `batch_key` del retorno de `claim_campaign_pilot_batch`. Sólo cambió el contrato TypeScript generado; no se desplegaron funciones, políticas ni migraciones.

Backend registrado en la verificación anterior: PostgreSQL `17.6.1.127`, PostgREST `14.5`, estado `ACTIVE_HEALTHY`. El proyecto QE2026 seguía `ACTIVE_HEALTHY` al generar los tipos el 2026-09-25; esta tarea no revalidó la versión de PostgREST.

## Tablas expuestas

| Tabla | Filas verificadas | RLS | Acceso cliente |
| --- | ---: | --- | --- |
| `companies` | 83 | habilitado | lectura, creación y actualización para roles CRM activos; sin borrado cliente |
| `contacts` | 83 | habilitado | lectura, creación y actualización para roles CRM activos; sin borrado cliente |
| `activities` | 2 | habilitado | lectura, creación y actualización para roles CRM activos; sin borrado cliente |
| `cu_links` | 83 | habilitado | sólo `admin`; sin borrado cliente |
| `cu_responses` | 8 | habilitado | sólo lectura `admin`; las respuestas públicas usan RPC |
| `prospect_lists` | 3 | habilitado | lectura, creación y actualización para roles CRM activos; sin borrado cliente |
| `prospects` | 225 | habilitado | lectura, creación y actualización para roles CRM activos; sin borrado cliente |
| `prospect_contacts` | 31 | habilitado | lectura, creación y actualización para roles CRM activos; sin borrado cliente |
| `prospect_activities` | 80 | habilitado | lectura, creación y actualización para roles CRM activos; sin borrado cliente |

`anon` no tiene privilegios directos sobre estas tablas. Las políticas comerciales exigen membresía CRM activa; las políticas de enlaces y respuestas exigen además rol `admin`. La tabla `private.crm_authorized_users` no está expuesta a la Data API.

Las tablas nuevas ya no deben asumirse expuestas automáticamente: toda migración futura debe declarar `GRANT` explícito y RLS antes de ser consumida desde el frontend.

Desde `20260827015743_add_prospect_campaign_targeting`, `prospects.campaign` conserva una etiqueta operativa opcional independiente de `segment` y `list_id`. La campaña `Colegios Norte 153+ / antes del peaje` contiene 31 prospectos y 31 canales institucionales públicos; la migración no modifica RLS ni privilegios existentes.

La reproducción desde cero se contrastó en una validación anterior mediante firmas normalizadas de columnas, constraints, índices, funciones, políticas y grants, sin leer ni copiar filas productivas. Esa equivalencia no se ha revalidado después de los cambios productivos de campaña y RBAC; ver `docs/AUDIT.md` y el plan separado de conciliación del historial.

## RPC públicas

| RPC | Rol | Seguridad | Contrato operativo |
| --- | --- | --- | --- |
| `is_crm_authorized()` | `authenticated` | invoker | Devuelve únicamente la autorización de la sesión actual. |
| `get_crm_session_context()` | `authenticated` | invoker | Devuelve autorización y rol vigentes sin confiar en `user_metadata`. |
| `get_cu_form(p_token)` | `anon`, `authenticated` | definer | Devuelve el formulario de un enlace activo y no vencido. |
| `submit_cu_form(p_token, p_payload)` | `anon`, `authenticated` | definer | Acepta sólo un objeto JSON de máximo 32 KB. |
| `admin_get_cu_pending_reviews()` | `authenticated` | definer protegido | Lista respuestas pendientes sólo para `admin`. |
| `admin_approve_cu_response(p_response_id)` | `authenticated` | definer protegido | Aprueba una respuesta pendiente sólo para `admin`. |
| `admin_reject_cu_response(p_response_id)` | `authenticated` | definer protegido | Rechaza una respuesta pendiente sólo para `admin`. |
| `admin_get_cu_master_sync_queue()` | `authenticated` | definer protegido | Lista conciliaciones pendientes sólo para `admin`. |
| `admin_complete_cu_master_sync(p_response_id, p_notes)` | `authenticated` | definer protegido | Cierra una conciliación sólo para `admin`. |
| `convert_prospect_to_company(p_prospect_id, p_notes)` | `authenticated` | invoker | Bloquea el prospecto, crea y enlaza en una transacción; reintentos devuelven la empresa enlazada. |
| `get_cu_pending_reviews()`, `approve_cu_response(...)`, `reject_cu_response(...)`, `get_cu_master_sync_queue()`, `complete_cu_master_sync(...)` | sin acceso cliente | invoker | Se conservan internamente, pero su ejecución directa fue revocada. |
| `delete_prospect(p_prospect_id)` | sin acceso cliente | invoker | La eliminación física fue retirada de la interfaz y su ejecución fue revocada. |

Todas las funciones verificadas fijan `search_path = ''`. El argumento de las dos RPC de revisión es `p_response_id`; el nombre anterior usado por el frontend, `response_id`, no pertenecía al contrato remoto.

## Auth y autorización

Supabase Auth verifica identidad. La autorización de negocio reside en `private.crm_authorized_users`; no usa `user_metadata`. El frontend consulta `public.get_crm_session_context()` y el backend repite la comprobación mediante RLS y wrappers administrativos. `member` conserva el trabajo comercial y la conversión; `admin` añade administración de enlaces, respuestas y conciliación. Ningún rol cliente tiene borrado físico.

La protección de contraseñas filtradas continúa deshabilitada y requiere una decisión/configuración independiente en Auth.

## Edge Function

`send-internal-update-test` está activa en versión 2 con `verify_jwt = true`. Además de validar el JWT mediante `auth.getUser()`, restringe UUID y correo autorizados, destinatario fijo y confirmación explícita. El token de ZeptoMail permanece en secretos del runtime y no forma parte de los tipos ni del repositorio.

## Límites y paginación

- Los selectores de empresas/prospectos usan un límite compartido de 1.000, suficiente para el baseline verificado de 83/220 filas.
- Los workbenches de actividades son resúmenes deliberados de 200 o 300 filas.
- Antes de superar 1.000 entidades por dominio se debe implementar paginación con orden estable; estos límites no son contratos de exportación completa.

## Riesgos y decisiones pendientes

- Las ocho respuestas actuales pertenecen a un único enlace de prueba duplicado; imponer unicidad por `link_id` requeriría una decisión de producto y limpieza de datos separada.
- La cola de maestros registra estado y trazabilidad; la escritura en Google Sheets continúa siendo un paso controlado posterior a la aprobación, no una mutación directa desde el formulario público.
- Los 220 prospectos conservan el estado legado `por_validar`, normalizado en el frontend sin reescritura.
- Las dos RPC públicas por token generan warnings esperados del advisor por usar `SECURITY DEFINER`; su exposición es deliberada y debe reevaluarse si cambia el flujo público.
- Los cinco wrappers `admin_*` también generan un aviso del advisor por ser `SECURITY DEFINER` ejecutable por `authenticated`; cada uno exige `private.require_crm_admin()` y la prueba aislada confirmó la denegación para `member`.
- Advisor de Auth: [protección de contraseñas filtradas](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).
- Advisor de RLS: [tabla privada sin políticas](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy), informativo porque no existen grants de cliente sobre la tabla.
