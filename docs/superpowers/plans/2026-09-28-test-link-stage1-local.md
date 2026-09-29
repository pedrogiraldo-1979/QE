# Etapa 1 del enlace de ensayo — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. La política activa no autoriza delegar este trabajo.

**Goal:** Preparar localmente una única migración aditiva que agregue `public.cu_links.is_test boolean not null default false`, sin aplicarla a ningún proyecto.

**Architecture:** La columna clasificaría enlaces, pero esta etapa local no clasifica ninguno: al aplicar la migración en un gate futuro, todos los existentes recibirían `false` y las funciones actuales permanecerían intactas. Una prueba contractual comprueba el contenido exacto del SQL; el ensayo en un proyecto desechable y el release productivo quedan fuera de este plan y exigen autorizaciones independientes.

**Tech Stack:** Supabase CLI 2.118.0 transitoria mediante `pnpm dlx`, PostgreSQL, Node.js `node:test`, TypeScript/Next.js.

## Global Constraints

- Base: `main` en `43aa8e1`; trabajar únicamente en `codex/test-link-stage1-local`.
- La especificación vigente es `docs/superpowers/specs/2026-09-28-test-link-exclusion-design.md`; D-030 y D-031 siguen rigiendo.
- No conectar la CLI a un proyecto, ejecutar SQL, crear proyectos, mutar QE2026, datos, RLS, RPC, Auth ni funciones.
- No modificar los diez SQL históricos, `supabase/baselines/qe2026-schema-only.sql`, `src/lib/database.types.ts`, dependencias ni configuración. Los tipos generados seguirán siendo el snapshot de QE2026 hasta un gate remoto autorizado.
- No usar `db push`, `migration repair`, `apply_migration`, `db reset` ni un flujo que reproduzca el historial divergente.
- Preservar `.pnpm-store/` sin seguimiento y cualquier cambio ajeno; nunca incluir secretos, tokens, identificadores de clientes o payloads en Git.

---

### Task 1: Migración aditiva local y contrato

**Files:**
- Create: `tests/cuLinkTestFlagMigration.test.mjs`
- Create with the CLI, then edit: the single `supabase/migrations/<CLI-generated timestamp>_add_cu_link_test_flag.sql`
- Preserve: all existing `supabase/migrations/*.sql`, `supabase/baselines/qe2026-schema-only.sql`, `src/lib/database.types.ts`

**Interfaces:**
- Consumes: the existing `public.cu_links` table and its `admin`-only RLS policies; neither is changed here.
- Produces: one `boolean not null default false` column named `is_test`; no application code reads it yet.

- [x] **Step 1: Escribir la prueba contractual antes del SQL.** Crear `tests/cuLinkTestFlagMigration.test.mjs` con este contenido:

```js
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const migrationDir = path.join(process.cwd(), 'supabase', 'migrations');
const candidates = readdirSync(migrationDir).filter((name) =>
  /^\d{14}_add_cu_link_test_flag\.sql$/.test(name),
);

test('la Etapa 1 contiene una sola migración aditiva y ningún cambio de datos o permisos', () => {
  assert.equal(candidates.length, 1, 'Debe existir una sola migración creada por la CLI');
  const sql = readFileSync(path.join(migrationDir, candidates[0]), 'utf8').replace(/\r\n?/g, '\n').trim();
  assert.equal(sql, 'alter table public.cu_links\n  add column is_test boolean not null default false;');
});
```

- [x] **Step 2: Verificar RED.** Ejecutar `node --test tests/cuLinkTestFlagMigration.test.mjs`. Debe fallar con `Debe existir una sola migración creada por la CLI` porque todavía no existe el archivo. Si falla por otro motivo, corregir la prueba antes de continuar.

- [x] **Step 3: Verificar la CLI transitoria y crear el archivo.** Ejecutar `pnpm dlx supabase@2.118.0 --version` y `pnpm dlx supabase@2.118.0 migration new --help`; confirmar versión y uso. Ejecutar `pnpm dlx supabase@2.118.0 migration new add_cu_link_test_flag`. La CLI debe devolver la ruta del único archivo nuevo bajo `supabase/migrations/`; comprobar que su timestamp no coincide con los diez archivos históricos. No usar `link`, credenciales ni comandos de base de datos.

- [x] **Step 4: Añadir el SQL mínimo.** Editar **sólo el archivo devuelto por la CLI**, mediante `apply_patch`, para que su contenido ejecutable completo sea:

```sql
alter table public.cu_links
  add column is_test boolean not null default false;
```

No añadir `if not exists`: una columna inesperada debe producir un error visible en el futuro ensayo, no ocultar divergencia. No añadir DML, políticas, grants, RPC ni backfill.

- [x] **Step 5: Verificar GREEN.** Ejecutar `node --test tests/cuLinkTestFlagMigration.test.mjs`; debe pasar 1/1. Después ejecutar `pnpm typecheck` y `pnpm test`; detenerse ante cualquier fallo. Como no existe `.env.local`, cargar sólo las dos variables públicas de `.env.example` en el proceso PowerShell y ejecutar el build sin imprimir sus valores:

```powershell
Get-Content .env.example | ForEach-Object {
  if ($_ -match '^(NEXT_PUBLIC_SUPABASE_URL|NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)=(.*)$') {
    Set-Item "Env:$($Matches[1])" $Matches[2]
  }
}
pnpm build
```

El build y el suite normal no ejecutan SQL remoto. No crear `.env.local` ni guardar los valores de entorno en el repositorio.

- [x] **Step 6: Revisar el alcance y entregar.** Ejecutar `git diff --check`, `git status --short --branch` y `git diff --name-status main...HEAD` más la lista de archivos nuevos. Confirmar que sólo el plan, la prueba y una migración nueva pertenecen al cambio; que no aparecen secretos ni artefactos generados; y que `.pnpm-store/` permanece fuera. Registrar un commit local descriptivo en la rama. No hacer push, PR, ensayo remoto ni release por este plan.

## Evidencia de esta preparación local

- RED: la prueba falló por ausencia de una única migración, con `0 !== 1`.
- CLI transitoria `2.118.0`: creó `supabase/migrations/20260929011508_add_cu_link_test_flag.sql`; su carpeta temporal generada se retiró tras verificar que contenía sólo `cli-latest`.
- GREEN: prueba dirigida 1/1, suite completa 47/47, `pnpm typecheck` y `pnpm build` de 11 rutas aprobados. El build usó sólo las dos variables públicas de `.env.example`; `next-env.d.ts` se restauró tras la generación automática.
- Versiones observadas: Node `v24.19.0` y pnpm `11.25.0`, distintas de las versiones de referencia del repositorio; la futura CI deberá repetir los gates con su entorno fijado.
- Ninguna migración se aplicó a un proyecto y no se ejecutaron pruebas autenticadas/mutantes. La protección real de permisos, el valor predeterminado en PostgreSQL y la cola de respuestas requieren el ensayo aislado posterior.

## Gate posterior, fuera de esta autorización

Antes de ensayar el SQL en un proyecto desechable, solicitar autorización para el proyecto exacto y su costo, comprobar dos veces su `project_ref`, usar sólo datos/usuarios sintéticos y pausar o eliminar al finalizar. Antes de cualquier release de QE2026, seguir `docs/SUPABASE-RELEASE-PROCEDURE.md`: inventario remoto actualizado, respaldo/recuperación, método que seleccione sólo este SQL, dry-run verificable y aprobación específica. La preparación local no acredita que el SQL se haya aplicado ni que la cola de respuestas o la RLS funcionen con la columna nueva.
