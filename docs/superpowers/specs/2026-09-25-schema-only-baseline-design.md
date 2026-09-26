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

## Adenda — guarda de proyecto vacío

Estado: Pedro aprobó añadir una guarda al PR #34 y probar su rechazo en el proyecto temporal existente. Esta adenda documenta el diseño antes de modificar el SQL.

**Opciones evaluadas.** Mantener sólo la advertencia actual y una comprobación manual evita cambios al archivo, pero deja abierta la ejecución accidental sobre una base con CRM. Un script externo que exija un `project_ref` añade otra vía de ejecución y mantenimiento, sin proteger a quien abra el SQL directamente. Se elige una guarda dentro del propio SQL, al inicio del archivo, combinada con la comprobación operativa del `project_ref`.

**Comportamiento.** Antes de cualquier `CREATE`, `ALTER`, `DROP` o `GRANT`, un bloque `DO` comprueba si ya existe alguna de las diez tablas públicas del CRM o `private.crm_authorized_users`. Si encuentra al menos una, lanza un error genérico y termina sin recorrer el replay. No consulta ni registra filas, usuarios, correos, tokens o referencias de proyecto. En un proyecto vacío permite continuar con el SQL ya ensayado. Esta guarda protege de una aplicación accidental sobre QE2026 o un esquema CRM parcial, pero no identifica por sí sola un proyecto vacío equivocado: el operador aún debe confirmar el `project_ref`. El comentario histórico que llama reutilizable a la primera migración no debe interpretarse como permiso para reutilizar el archivo completo.

**Prueba y límites.** Una prueba contractual nueva debe fallar primero porque la guarda falta, luego verificar que cubre las once relaciones y precede la primera instrucción de cambio de esquema. Para el ensayo real se confirma dos veces que `hsuxurarysmvmprgdeqo` es el proyecto temporal, se reanuda, se captura su catálogo y sus conteos sin leer filas, y se intenta allí el archivo completo. El resultado esperado es el error de la guarda, sin alteración de catálogo ni datos; finalmente se pausa y se confirma `INACTIVE`. El replay anterior ya aprobó sobre ese proyecto cuando estaba vacío; este ensayo adicional comprueba el camino de rechazo, no equivale a ejecutar la versión con guarda sobre un tercer proyecto vacío. No se creará otro proyecto ni se ejecutará SQL sobre QE2026.

**Publicación.** La corrección queda en el mismo PR #34, que permanece en borrador. Se actualizan la prueba y `docs/AUDIT.md` con la evidencia exacta, se repiten las verificaciones locales y CI; no se hace merge ni se habilitan `db push` o `migration repair`.
