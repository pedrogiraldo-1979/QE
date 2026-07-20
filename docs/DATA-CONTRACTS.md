# Contratos de datos y Supabase

Fecha de verificación: 2026-07-19. Proyecto: `QE2026` (`izbfawwmbilmsrdjaanw`).

## Fuente canónica

- `src/lib/database.types.ts` es el snapshot generado del esquema remoto expuesto por la Data API.
- `src/lib/types.ts` conserva únicamente vocabulario de dominio y compatibilidad de lectura sobre los tipos generados.
- `src/lib/data/queryColumns.ts` define las columnas que el frontend solicita; no se usa `select("*")`.
- `src/lib/data/queryLimits.ts` distingue selectores de referencia de feeds resumidos.
- Los tipos deben regenerarse desde Supabase después de cada migración y revisarse en el mismo commit; no se editan formas de tablas o RPC manualmente.

Backend verificado: PostgreSQL `17.6.1.127`, PostgREST `14.5`, estado `ACTIVE_HEALTHY`.

## Tablas expuestas

| Tabla | Filas verificadas | RLS | Acceso cliente |
| --- | ---: | --- | --- |
| `companies` | 83 | habilitado | CRUD `authenticated` bajo allowlist |
| `contacts` | 83 | habilitado | CRUD `authenticated` bajo allowlist |
| `activities` | 2 | habilitado | CRUD `authenticated` bajo allowlist |
| `cu_links` | 83 | habilitado | CRUD `authenticated` bajo allowlist |
| `cu_responses` | 8 | habilitado | CRUD `authenticated` bajo allowlist |
| `prospect_lists` | 3 | habilitado | CRUD `authenticated` bajo allowlist |
| `prospects` | 220 | habilitado | CRUD `authenticated` bajo allowlist |
| `prospect_contacts` | 0 | habilitado | CRUD `authenticated` bajo allowlist |
| `prospect_activities` | 80 | habilitado | CRUD `authenticated` bajo allowlist |

`anon` no tiene privilegios directos sobre estas tablas. Cada política pública exige `private.is_crm_authorized()` tanto en `USING` como en `WITH CHECK`. La tabla `private.crm_authorized_users` no está expuesta a la Data API y contiene dos membresías activas.

Las tablas nuevas ya no deben asumirse expuestas automáticamente: toda migración futura debe declarar `GRANT` explícito y RLS antes de ser consumida desde el frontend.

## RPC públicas

| RPC | Rol | Seguridad | Contrato operativo |
| --- | --- | --- | --- |
| `is_crm_authorized()` | `authenticated` | invoker | Devuelve únicamente la autorización de la sesión actual. |
| `get_cu_form(p_token)` | `anon`, `authenticated` | definer | Devuelve el formulario de un enlace activo y no vencido. |
| `submit_cu_form(p_token, p_payload)` | `anon`, `authenticated` | definer | Acepta sólo un objeto JSON de máximo 32 KB. |
| `get_cu_pending_reviews()` | `authenticated` | invoker | Lista respuestas pendientes bajo RLS. |
| `approve_cu_response(p_response_id)` | `authenticated` | invoker | Aplica únicamente una respuesta pendiente; reintentos posteriores no vuelven a aplicar cambios. |
| `reject_cu_response(p_response_id)` | `authenticated` | invoker | Desde `20260720031715`, sólo cambia respuestas pendientes. |
| `convert_prospect_to_company(p_prospect_id, p_notes)` | `authenticated` | invoker | Bloquea el prospecto, crea y enlaza en una transacción; reintentos devuelven la empresa enlazada. |
| `delete_prospect(p_prospect_id)` | `authenticated` | invoker | Elimina el prospecto en una transacción; las FK retiran dependencias por cascada. |

Todas las funciones verificadas fijan `search_path = ''`. El argumento de las dos RPC de revisión es `p_response_id`; el nombre anterior usado por el frontend, `response_id`, no pertenecía al contrato remoto.

## Auth y autorización

Supabase Auth verifica identidad. La autorización de negocio reside en `private.crm_authorized_users`; no usa `user_metadata`. El frontend consulta `public.is_crm_authorized()` y RLS repite la comprobación en el backend. Los roles `admin` y `member` aún comparten el mismo CRUD hasta que producto defina una separación.

La protección de contraseñas filtradas continúa deshabilitada y requiere una decisión/configuración independiente en Auth.

## Edge Function

`send-internal-update-test` está activa en versión 2 con `verify_jwt = true`. Además de validar el JWT mediante `auth.getUser()`, restringe UUID y correo autorizados, destinatario fijo y confirmación explícita. El token de ZeptoMail permanece en secretos del runtime y no forma parte de los tipos ni del repositorio.

## Límites y paginación

- Los selectores de empresas/prospectos usan un límite compartido de 1.000, suficiente para el baseline verificado de 83/220 filas.
- Los workbenches de actividades son resúmenes deliberados de 200 o 300 filas.
- Antes de superar 1.000 entidades por dominio se debe implementar paginación con orden estable; estos límites no son contratos de exportación completa.

## Riesgos y decisiones pendientes

- Las ocho respuestas actuales pertenecen a un único enlace de prueba duplicado; imponer unicidad por `link_id` requeriría una decisión de producto y limpieza de datos separada.
- Los 220 prospectos conservan el estado legado `por_validar`, normalizado en el frontend sin reescritura.
- Las dos RPC públicas por token generan warnings esperados del advisor por usar `SECURITY DEFINER`; su exposición es deliberada y debe reevaluarse si cambia el flujo público.
- Advisor de Auth: [protección de contraseñas filtradas](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).
- Advisor de RLS: [tabla privada sin políticas](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy), informativo porque no existen grants de cliente sobre la tabla.
