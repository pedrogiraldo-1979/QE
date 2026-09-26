# Baseline estructural aislada de QE2026 — diseño aprobado

Estado: aprobado por Pedro el 2026-09-25 para preparación en un PR separado y ensayo exclusivamente aislado. No autoriza ninguna aplicación en QE2026.

## Problema y objetivo

Los diez archivos bajo `supabase/migrations/` reconstruyen un esquema anterior al de QE2026. El ensayo del PR #32 encontró que faltan `campaign_pilot_recipients.batch_key`, las unicidades e índice por lote, `claim_campaign_batch` y versiones posteriores de cuatro funciones. Las versiones locales y remotas de la historia también difieren. Se necesita una fuente estructural para proyectos vacíos que no arrastre identidades, contactos, prospectos ni operaciones de reparación del historial productivo.

## Alternativas consideradas

- Reconstruir los 29 registros remotos como archivos en `supabase/migrations/`: permitiría aspirar al flujo normal de la CLI, pero duplicaría SQL histórico, podría incluir datos y exigiría resolver versiones y dos SQL no equivalentes antes de cualquier `db push`.
- Crear una baseline estructural independiente: conserva intactos los diez archivos históricos, permite probar el catálogo final en una base vacía y no se interpreta como migración pendiente de QE2026. Esta es la opción aprobada.
- Usar sólo un dump remoto: puede incluir objetos administrados, datos o sentencias destructivas no relacionadas; no ofrece por sí solo una revisión clara de las excepciones.

## Arquitectura

Crear `supabase/baselines/qe2026-schema-only.sql`, fuera de `supabase/migrations/`. El archivo será un replay auto-contenido para un proyecto Supabase nuevo y vacío, compuesto en orden por los ocho archivos locales seguros, seis cambios estructurales/funcionales remotos posteriores a julio 21 sin dos `UPDATE` de backfill, el DDL de `prospects.campaign` sin la carga de 31 contactos y RBAC al final. Cada tramo tendrá comentario de procedencia y límites. No se ejecutará sobre una base que tenga filas CRM ni sobre QE2026.

La función remota `get_cu_pending_reviews` incluye dos exclusiones de pruebas ligadas a valores concretos de QE2026; una es un token. Esos valores no se copiarán a Git. La baseline conservará la lógica general de la función sin esas dos líneas. Por tanto, la comparación debe registrar esta única divergencia funcional intencional; no se presentará como equivalencia textual total hasta que producto decida cómo tratar los fixtures históricos.

## Seguridad y datos

- Ningún `INSERT`, `UPDATE`, `DELETE` o `TRUNCATE` de nivel superior en el archivo; el DML dentro de cuerpos de funciones permanece porque define comportamiento, no lo invoca.
- Ningún correo, UUID de usuario, token ni fila comercial real en Git o en el proyecto aislado.
- RLS, grants y ejecución de RPC se compararán con QE2026; ningún permiso adicional se aceptará silenciosamente.
- La baseline no añade nuevas tablas de negocio ni cambia el frontend, Edge Functions, Auth o tipos del proyecto.
- La rama y el PR serán separados del PR #32, basados en `origin/main` en `14c77ca`; no se hará merge.

## Verificación

Primero, una prueba de contrato fallará porque el archivo aún no existe. Luego se comprobarán sus límites de datos y sus objetos esperados. En un Supabase desechable sin datos reales se aplicará el SQL, se consultará el catálogo y se compararán columnas, constraints, índices, funciones, RLS, políticas, grants y tipos generados con QE2026. Se verificarán cero filas CRM y cero usuarios Auth antes y después. La diferencia de la función con filtros de prueba quedará registrada. El proyecto se pausará al terminar. Si la creación del entorno presenta un costo distinto de $0 o falta un gate, se detendrá antes de crearlo.

## Publicación y reversión

El PR contendrá sólo el SQL estructural, su prueba de contrato y la documentación de decisión/evidencia necesaria. Revertir el commit retirará el artefacto local; no habrá reversión productiva porque no se aplicará en QE2026. `db push` y `migration repair` seguirán bloqueados hasta una decisión separada sobre historia y release.
