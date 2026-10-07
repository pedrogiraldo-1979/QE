# Guardado de edición de prospectos — implementación

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans. Ejecución inline, sin delegación.

**Goal:** Proteger únicamente Guardar cambios de empresa prospecto frente a errores y envíos simultáneos.

**Architecture:** Guarda síncrona `useRef`, estado de guardado y `try/catch/finally` en `updateSelectedProspect`. Fieldset externo exclusivo de edición, sin modificar el componente compartido de alta ni sus campos.

**Tech Stack:** React, TypeScript y runner Node existentes.

## Restricciones

Pedro aprobó esta unidad el 2026-10-06. Base `a4082c2`, rama `codex/phase-9-prospect-edit-safety`; PR #44 y su validación Android siguen independientes. Sin cambios de campos, validaciones comerciales, payload, columnas, Supabase, contactos, estados, alta, rutas, dependencias ni configuración. No se garantiza idempotencia entre pestañas ni se bloquean navegación o acciones distintas del formulario de edición. Ensayo autenticado y publicación productiva mantienen gates propios.

## Tarea única

**Files:** `src/app/prospectos/[listId]/page.tsx`, `tests/prospectEditSafety.test.mjs`, `docs/AUDIT.md` y este plan.

**Interfaces:** conservar `updateSelectedProspect(event: FormEvent<HTMLFormElement>)` y `ProspectFormFields`; no extraer módulos ni introducir APIs.

- [x] Crear tests del handler real transpilado, sustituyendo sólo transporte y setters: excepción/error, guardado simultáneo, payload/ID, respuesta nula/ID distinto, validaciones y recuperación posterior. Ejecutar `node --test tests/prospectEditSafety.test.mjs`; comprobar RED antes de código.
- [x] Importar `useRef`; declarar `prospectEditInFlightRef = useRef(false)` y `savingProspect`. Guardar: `if (prospectEditInFlightRef.current) return;` antes de validar; adquirir antes de await, limpiar mensaje y liberar siempre mediante `finally { prospectEditInFlightRef.current = false; setSavingProspect(false); }`.
- [x] Conservar payload y consulta `update(...).eq("id", selectedProspect.id).select(PROSPECT_COLUMNS).single()`. Error, excepción, respuesta nula o ID distinto: `setMessage("No se pudo confirmar la actualización del prospecto. Revisa sus datos antes de intentar de nuevo.")`; sin modificar formulario ni confirmar éxito. Éxito: mantener reemplazo por ID y mensaje existente.
- [x] Envolver sólo la instancia de edición en `<fieldset disabled={savingProspect} aria-busy={savingProspect} style={{ border: 0, margin: 0, padding: 0, minWidth: 0 }}>`; label `savingProspect ? "Guardando" : "Guardar cambios"`. El formulario de alta y contactos quedan intactos. Test de wiring; no presentarlo como prueba browser autenticada.
- [x] Ejecutar GREEN, `pnpm verify`, producción local y smoke 13/13. Comprobar login hidratado sin errores; no iniciar sesión ni probar mutaciones remotas. Restaurar sólo cambio automático de next-env.d.ts, revisar diff y secretos; registrar evidencias y límites.
- [ ] Commit local y PR independiente sin merge. Release/ensayo autenticado pendientes; reversión mediante revert del código, sin SQL.
