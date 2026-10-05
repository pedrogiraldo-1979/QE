# Alta de prospectos protegida — implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans. Ejecución inline, sin delegación.

**Goal:** Evitar envíos simultáneos y recuperar controles del alta de prospectos ante fallos.

**Architecture:** Ajuste sólo en la página existente, sin extraer módulos. Guarda síncrona con `useRef`, carga y alta con `try/catch/finally`; formulario deshabilitado durante guardado y enlaces locales de cancelación sustituidos por texto deshabilitado.

**Tech Stack:** React, TypeScript y runner Node existentes.

## Restricciones

Pedro aprobó este alcance el 2026-10-05. Base `a4082c2`; rama separada, preservando la auditoría previa y el checkout original. No cambiar campos, validaciones comerciales, payload, estados heredados, columnas, rutas, dependencias, Supabase ni variables persistidas. Sin reintento automático ni garantía de idempotencia entre pestañas. Publicación y ensayo autenticado conservan gates independientes.

## Tarea única

**Files:** `src/app/prospectos/nuevo/page.tsx`, `tests/prospectCreateSafety.test.mjs`, `docs/AUDIT.md`.

**Interfaces:** conservar `createProspect(event)`, `loadLists()` y componentes de campos; no introducir APIs nuevas.

- [x] Crear pruebas del handler real transpilado: excepción/error conserva campos y libera saving; dos envíos pendientes generan un insert; éxito conserva payload y reinicia formulario; carga fallida libera loading; validaciones existentes no escriben; wiring disabled/status. Ejecutar `node --test tests/prospectCreateSafety.test.mjs`, observar fallos por el comportamiento auditado.
- [x] Importar `useRef`, declarar `const saveInFlightRef = useRef(false)`. Inicio del alta: `if (saveInFlightRef.current || loading) return;`. Adquirir antes del await; liberar siempre en `finally { saveInFlightRef.current = false; setSaving(false); }`. Mantener campos ante fallo; mostrar «No se pudo confirmar la creación del prospecto. Revisa la lista antes de intentar de nuevo para evitar duplicados.» tanto en catch como error devuelto.
- [x] En carga: `if (saveInFlightRef.current) return;`; conservar consulta/selección inicial y envolver en try/catch/finally. Mensaje de carga: «No pudimos cargar las listas. Pulsa Refrescar para intentar de nuevo.»; liberar loading en finally.
- [x] Envolver campos en `<fieldset disabled={saving || loading} style={{ border: 0, margin: 0, padding: 0, minWidth: 0 }}>`; añadir `role="status"` al mensaje; cancelar/volver usan span con `aria-disabled="true"` mientras saving. Deshabilitar Refrescar y Salir durante saving. No bloquear navegación global ni cierre de pestaña.
- [x] Ejecutar pruebas dirigidas y `pnpm verify`, iniciar producción local y smoke HTTP 13/13. Revisar diff y secretos; restaurar sólo cambio automático de next-env.d.ts. Registrar límites: handlers no equivalen a browser autenticado; no escrituras remotas ni publicación.
- [x] Guardar commit local y entregar alcance/evidencia; rollback del código mediante revert del ajuste, sin SQL.

## Evidencia de ejecución

2026-10-05: RED 0/8; GREEN 8/8; `pnpm verify` aprobó typecheck, 117 pruebas y build. Smoke de producción local 13/13; acceso de nuevo prospecto visible con controles habilitados, sin overlay ni errores/warnings capturados. Sin sesión autenticada, escrituras remotas ni publicación. Ensayo autenticado/visual y release pendientes de gates independientes.

## Ensayo autenticado autorizado

2026-10-05: build de `2e1ed77` aislado en `jfmauklmfhuecftvgjms`. Alta y error FK comprobados con cuenta `member` y fixtures ficticias; campos conservados y controles recuperados. Gate móvil fallido: regla CSS previa comprime el formulario a 1,3 px a 390 px; no se publica ni se amplía el diseño sin aprobación. Limpieza comprobada en cero; pausa confirmada `INACTIVE`, servidor cerrado y viewport restablecido. Evidencia y límites en `docs/AUDIT.md`.
