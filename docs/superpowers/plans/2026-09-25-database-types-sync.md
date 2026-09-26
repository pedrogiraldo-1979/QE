# Sincronización de tipos de QE2026 — plan de implementación

> **Para agentes:** usar `executing-plans` al ejecutar este plan por etapas. No delegar en subagentes salvo petición expresa de Pedro. Este documento no autoriza cambios de Supabase ni su publicación en `main`.

**Objetivo:** hacer que `src/lib/database.types.ts` refleje exactamente el esquema expuesto de QE2026, sin cambiar la base de datos ni introducir comportamiento de campaña.

**Arquitectura:** obtener un único resultado generado de tipos del proyecto productivo, contrastarlo íntegramente con el snapshot versionado y reemplazar sólo el archivo generado con ese resultado. Si aparecen diferencias nuevas o errores de compilación fuera de las cuatro categorías ya observadas, detenerse para revisar el alcance.

**Tecnología:** Supabase, TypeScript estricto, Next.js, pnpm.

## Restricciones globales

- Proyecto fuente de solo lectura: QE2026 (`izbfawwmbilmsrdjaanw`); confirmar su identidad antes de generar.
- No ejecutar SQL, migraciones, `db push`, `migration repair`, pruebas autenticadas o mutantes ni leer filas productivas.
- No editar a mano las formas de tablas o RPC. El archivo final debe ser idéntico al resultado del generador, salvo normalización de saltos de línea.
- No tocar funciones de campaña, rutas, Edge Functions, variables de entorno, datos ni `supabase/migrations/` en este cambio.
- Conservar `.pnpm-store/` y cualquier otro cambio local ajeno a la tarea. Trabajar en una rama separada desde `main` actualizada; no hacer merge automático.

## Evidencia de partida, 2026-09-25

`origin/main` está en `14c77ca`. El snapshot local tiene 882 líneas y el generado remotamente 914. La diferencia exacta consta de 33 líneas añadidas en el remoto y una sustitución local/remota, agrupadas así:

| Contrato | Local | QE2026 |
| --- | --- | --- |
| `campaign_pilot_recipients.batch_key` | Ausente en Row/Insert/Update | `string`, `string?`, `string?` |
| `campaign_pilot_recipients_link_id_fkey.isOneToOne` | `true` | `false` |
| `claim_campaign_batch` | Ausente | RPC con `p_batch_key`, `p_expected_count`, `p_sent_by` y retorno de destinatarios |
| `claim_campaign_pilot_batch` | Retorno sin `batch_key` | Retorno con `batch_key: string` |

El catálogo de producción confirma `batch_key text NOT NULL` y las unicidades compuestas `(batch_key, link_id)` y `(batch_key, sequence)`. La cardinalidad distinta no se debe corregir manualmente. Las seis RPC RBAC ya aparecen en ambos snapshots. `docs/DATA-CONTRACTS.md` afirma que el archivo es el snapshot del esquema remoto, pero hoy sólo refleja el proyecto temporal usado en el ensayo RBAC; la discrepancia está registrada en `docs/AUDIT.md`.

## Archivos previstos

- Modificar: `src/lib/database.types.ts` — reemplazo exclusivo por salida generada.
- Modificar: `docs/DATA-CONTRACTS.md` — fecha, proyecto fuente y límite explícito de la verificación, sólo después de validar el resultado.
- Modificar: `docs/AUDIT.md` — evidencia de generación, diff y pruebas; no reescribir entradas históricas.
- No modificar: `supabase/migrations/`, `src/lib/types.ts`, funciones de campaña o configuración.

### Tarea 1: confirmar la fuente y congelar el diff

- [ ] Confirmar rama, árbol limpio de cambios de la tarea, commit de `main` y ref `izbfawwmbilmsrdjaanw`.
- [ ] Generar los tipos mediante el conector oficial de Supabase para ese ref. No volcar el resultado a logs ni documentación: contiene estructura, no datos, pero el diff es suficiente para revisión.
- [ ] Comparar salida completa normalizada a LF con `src/lib/database.types.ts`. Deben aparecer sólo las cuatro categorías de la tabla anterior; si el esquema cambió, detenerse y registrar un nuevo inventario antes de editar.
- [ ] Confirmar en catálogo, mediante consultas `SELECT` sólo de metadatos, la columna, las dos unicidades compuestas y la firma de `claim_campaign_batch`.

### Tarea 2: actualizar el snapshot generado

- [ ] Aplicar **verbatim** la salida generada al archivo `src/lib/database.types.ts`; no añadir propiedades ni ajustar tipos por intuición. Comprobar comparación byte a byte después de normalizar CRLF/LF.
- [ ] Revisar que el diff del archivo sea exactamente el inventario de la Tarea 1 y que no incluya emails, tokens ni filas. Si cambia una firma consumida por el frontend, detenerse y separar un ajuste funcional con su propio gate.
- [ ] Actualizar `docs/DATA-CONTRACTS.md` y `docs/AUDIT.md` con el proyecto fuente, fecha, diff y límites, sin afirmar que la historia de migraciones ya está reconciliada.

### Tarea 3: verificar y presentar

- [ ] Ejecutar `pnpm typecheck`, `pnpm test` y `pnpm build`; si el build genera `next-env.d.ts` o artefactos, retirarlos del diff sin borrar trabajo ajeno.
- [ ] Revisar `git diff --check`, `git diff --stat` y los archivos staged. Confirmar que no hay cambios de Supabase, datos, secretos o funcionalidad de campaña.
- [ ] Crear un commit descriptivo de tipos/documentación y presentar un PR separado contra `main`; esperar CI y Vercel, sin merge.

## Gate de decisión

Antes de la Tarea 2, Pedro debe confirmar que el esquema productivo QE2026 será la fuente canónica para el snapshot de tipos de este CRM. El plan no decide cómo reconstruir la historia de migraciones ni habilita un `db push` posterior.

## Criterio de cierre

El archivo generado coincide con QE2026, el diff está limitado al contrato enumerado, typecheck/pruebas/build y CI pasan, y el PR queda revisable sin cambios remotos.
