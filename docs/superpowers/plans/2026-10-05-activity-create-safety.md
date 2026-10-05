# Seguridad del guardado de actividades — plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Ejecución inline; sin delegación.

**Goal:** Liberar controles ante fallos y evitar cierre/envíos simultáneos del alta de actividades.

**Architecture:** Ajuste local en `AddActivityEntryBridge`, conservando portal, rutas, consultas, payloads y tablas. Una referencia síncrona protege la petición; `try/catch/finally` asegura liberar estado. No se extraen módulos.

**Tech Stack:** React, TypeScript, runner nativo Node y transpiler TypeScript ya instalados.

## Global Constraints

- Autorización: Pedro aprobó este ajuste el 2026-10-05; no autoriza publicar o fusionar.
- Rama desde `main` `eb2be27`; preservar el checkout original.
- Sin cambios de Supabase, datos, dependencias, variables, configuración ni búsqueda de prospectos.
- Sin logs de errores/payloads; un fallo de transporte no demuestra que la escritura no ocurrió.
- No reintentar automáticamente; indicar consultar Actividades antes de repetir una creación incierta.

## Tarea 1 — Guardado y cierre protegidos

**Files:** `src/components/AddActivityEntryBridge.tsx`, `tests/activityCreateSafety.test.mjs`, `docs/AUDIT.md`.

**Interfaces:** `handleSubmit(event)` conserva sus inserts; `closeForm()` sólo cierra fuera de guardado; `loadTargets()` conserva columnas y límite.

- [x] Añadir pruebas de handlers reales con transporte sustituido: cliente/prospecto, excepción/error, doble envío, cierre, éxito, validación y carga. Ejecutar `node --test tests/activityCreateSafety.test.mjs` y observar fallos por rechazo, mensaje técnico y cierre/envío permitido.
- [x] Añadir `const saveInFlightRef = useRef(false)`; al enviar ejecutar `if (saveInFlightRef.current || loading) return`, adquirir guarda y liberar en `finally { saveInFlightRef.current = false; setSaving(false); }`. Mantener campos salvo éxito. Catch y error devuelto muestran aviso genérico de creación no confirmada.
- [x] Implementar `function closeForm() { if (saveInFlightRef.current) return; setFormOpen(false); }`; conectar Cerrar/Cancelar con `disabled={saving}` y anunciar mensajes con `role="status"`.
- [x] Proteger la carga con `try/catch/finally`; error devuelto y excepción muestran mensaje genérico, y `finally` libera loading.
- [x] Ejecutar pruebas dirigidas, `pnpm verify`, servidor de producción y `pnpm test:smoke`. Revisar diff/secretos y registrar evidencia local sin inferir prueba autenticada.
- [x] Entregar rama y límites; publicación y preview siguen gates separados. Reversión del código: revertir exclusivamente este ajuste; no SQL productivo.

## Gate posterior — ensayo aislado autorizado

Pedro autorizó por separado reactivar sólo el proyecto temporal `jfmauklmfhuecftvgjms`, crear una cuenta sintética `member` y fixtures, probar y limpiar/pausar. Esta autorización no modifica el alcance de implementación ni permite escrituras productivas.

- [x] Confirmar `ACTIVE_HEALTHY`, restauración de tablas y siete conteos vacíos antes del ensayo; build sólo contra el temporal, sin variables persistidas.
- [x] Crear actividades desde navegador para ambos orígenes y comprobar una fila por origen y sus campos mediante consultas independientes.
- [x] Provocar un error de FK sólo retirando un padre ficticio; comprobar aviso genérico, campos conservados, controles liberados y ausencia de nueva fila.
- [x] Medir escritorio 1280×720 y móvil 390×844 sin overflow; comprobar Tab/Enter en Cancelar. No presentar esto como alta móvil o calendario táctil completos.
- [x] Cerrar sesión, eliminar sólo fixtures/cuenta propios, verificar cero usuarios/sesiones/membresías/clientes/prospectos/actividades y solicitar pausa. Registrar el estado final confirmado en auditoría.
- [x] Repetir typecheck, 109 pruebas y smoke 13/13; registrar evidencia y límites sin credenciales, emails ni UUID de usuarios en Git.
