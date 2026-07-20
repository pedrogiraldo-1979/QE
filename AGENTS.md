# Guía de trabajo para agentes

## Propósito del repositorio

Este repositorio contiene el CRM MVP de Quindío Exquisito. La aplicación usa Next.js App Router, React, TypeScript y Supabase.

## Fuentes de contexto

Antes de proponer o implementar cambios, leer:

1. `README.md`
2. `docs/PRD-CRM-FASE-1.md`
3. `docs/ROADMAP.md`
4. `docs/DECISIONS.md`
5. `docs/AUDIT.md`

Si la documentación contradice el comportamiento comprobado del sistema, registrar la diferencia en `docs/AUDIT.md` y pedir una decisión antes de asumir cuál versión es correcta.

## Reglas de alcance

- No cambiar Supabase, su esquema, funciones, políticas RLS, secretos ni datos sin autorización explícita.
- No borrar, mover ni consolidar archivos duplicados sin presentar primero el inventario, el impacto y un plan reversible, y recibir aprobación.
- No incluir secretos en Git. Las credenciales públicas permitidas deben conservar el prefijo `NEXT_PUBLIC_`; nunca exponer claves `service_role` ni tokens de ZeptoMail.
- Mantener los cambios pequeños, trazables y limitados al objetivo acordado.
- Preservar cambios locales existentes que no pertenezcan a la tarea.
- No modificar artefactos generados como `.next/`, `node_modules/` o `tsconfig.tsbuildinfo`.

## Estructura observada

- `src/app/`: rutas, layouts y estilos del App Router.
- `src/components/`: componentes y bridges de interfaz.
- `src/lib/`: cliente de Supabase, tipos y operaciones compartidas.
- `src/lib/database.types.ts`: snapshot generado del esquema remoto público.
- `src/lib/data/`: contratos de columnas, límites y repositorios de acceso a datos.
- `supabase/functions/`: Edge Functions; fuera de alcance salvo autorización expresa.
- `docs/`: producto, roadmap, decisiones y auditoría.
- Raíz: configuración del proyecto. Los duplicados heredados fueron auditados y retirados en la Fase 3 autorizada.

La fuente canónica de código es `src/`. Esta decisión fue aprobada el 2026-07-19 después de verificar alias, imports, typecheck, build, manifests, source maps y rutas locales. La Fase 4 separó el modelo puro del dashboard, su acceso a datos y las vistas por dominio bajo `src/features/`, `src/hooks/` y `src/components/crm/`.

## Flujo de trabajo

1. Comprobar rama, estado del árbol y commit base.
2. Leer la documentación aplicable y delimitar el cambio.
3. Inspeccionar antes de editar; regenerar y contrastar `database.types.ts`, sin inferir el esquema remoto únicamente desde tipos manuales.
4. Implementar sin ampliar el alcance.
5. Ejecutar verificaciones proporcionales: como mínimo `pnpm typecheck` y `pnpm test`; para cambios funcionales, `pnpm build` y el smoke HTTP con un servidor de producción local.
6. Revisar `git diff` y confirmar que no se incluyeron secretos, datos ni archivos generados.
7. Actualizar `docs/DECISIONS.md` si se adopta una decisión arquitectónica y `docs/AUDIT.md` si cambia el estado estructural.

La verificación completa local usa `pnpm verify`. Después del build, iniciar `pnpm start` y ejecutar `pnpm test:smoke`. Las variables `NEXT_PUBLIC_` de Supabase deben existir durante el build para que el bundle del navegador pueda hidratar; un HTTP `200` por sí solo no demuestra que la interfaz cargue.

La publicación y reversión deben seguir `docs/RELEASE-CHECKLIST.md`. No registrar payloads, tokens, emails, UUID de usuarios ni credenciales en logs de CI, navegador o despliegue.

Las pruebas autenticadas o mutantes de Supabase deben ejecutarse únicamente contra un proyecto desechable y aislado, usando variables `QE_TEST_*`. Antes de ejecutarlas, comprobar explícitamente el `project_ref`; nunca apuntarlas al proyecto productivo. El entorno debe limpiarse y pausarse o eliminarse al finalizar.

## Convenciones

- TypeScript estricto; evitar `any` salvo justificación documentada.
- Usar el alias `@/` para módulos dentro de `src/`.
- Mantener las consultas y mutaciones de datos explícitas y con manejo visible de errores.
- Para operaciones destructivas en la interfaz, exigir confirmación y una estrategia de recuperación cuando corresponda.
- Documentar supuestos que dependan del esquema, RLS, RPC o servicios externos.

## Gates de aprobación

Se necesita aprobación explícita antes de:

- reorganizar rutas o extraer módulos de las páginas actuales;
- cambiar tablas, RPC, RLS, Auth, Edge Functions o datos de Supabase;
- introducir dependencias, servicios externos o variables de entorno nuevas;
- ejecutar migraciones, importaciones, limpiezas o borrados de datos.
