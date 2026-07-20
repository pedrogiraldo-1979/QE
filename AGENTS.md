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
- `supabase/functions/`: Edge Functions; fuera de alcance salvo autorización expresa.
- `docs/`: producto, roadmap, decisiones y auditoría.
- Raíz: configuración del proyecto y un conjunto de archivos duplicados heredados. Su tratamiento sigue pendiente de una aprobación separada.

La fuente canónica de código es `src/`. Esta decisión fue aprobada el 2026-07-19 después de verificar alias, imports, typecheck, build, manifests, source maps y rutas locales. Los duplicados de raíz no deben editarse ni eliminarse sin el gate específico de limpieza.

## Flujo de trabajo

1. Comprobar rama, estado del árbol y commit base.
2. Leer la documentación aplicable y delimitar el cambio.
3. Inspeccionar antes de editar; no inferir el esquema remoto únicamente desde los tipos TypeScript.
4. Implementar sin ampliar el alcance.
5. Ejecutar verificaciones proporcionales: como mínimo `pnpm typecheck` y `pnpm test`; para cambios funcionales, `pnpm build` cuando el entorno lo permita.
6. Revisar `git diff` y confirmar que no se incluyeron secretos, datos ni archivos generados.
7. Actualizar `docs/DECISIONS.md` si se adopta una decisión arquitectónica y `docs/AUDIT.md` si cambia el estado estructural.

## Convenciones

- TypeScript estricto; evitar `any` salvo justificación documentada.
- Usar el alias `@/` para módulos dentro de `src/`.
- Mantener las consultas y mutaciones de datos explícitas y con manejo visible de errores.
- Para operaciones destructivas en la interfaz, exigir confirmación y una estrategia de recuperación cuando corresponda.
- Documentar supuestos que dependan del esquema, RLS, RPC o servicios externos.

## Gates de aprobación

Se necesita aprobación explícita antes de:

- eliminar o mover los duplicados de la raíz;
- reorganizar rutas o extraer módulos de las páginas actuales;
- cambiar tablas, RPC, RLS, Auth, Edge Functions o datos de Supabase;
- introducir dependencias, servicios externos o variables de entorno nuevas;
- ejecutar migraciones, importaciones, limpiezas o borrados de datos.
