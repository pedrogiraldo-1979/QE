# Prospect safety authenticated acceptance — Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans inline; no delegation. Preparado, no autorizado para ejecución remota.

**Goal:** Validar en navegador los tres formularios de PR #45–47 juntos, con persistencia sintética aislada y sin release.

**Architecture:** Conservar la rama local `codex/phase-9-prospect-safety-validation`. Usar exclusivamente el proyecto temporal existente `jfmauklmfhuecftvgjms`, previa comprobación de identidad y autorización específica para reanudar, crear fixtures y limpiar. No modificar código ni backend para facilitar el ensayo.

**Tech Stack:** Aplicación Next.js existente, navegador conectado y herramientas oficiales de Supabase; sin nuevas dependencias.

## Global constraints

- Sin push, nuevo PR, merge, deployment, producción ni cambios de esquema/RLS/RPC/Edge Functions.
- PR #44 y aceptación Android permanecen fuera del ensayo.
- No ejecutar `pnpm test:integration` ni `pnpm test:campaign:e2e`: sus fixtures y operaciones exceden estos tres formularios.
- No aplicar baseline ni migraciones. Si falta un contrato requerido, detener y presentar la diferencia.
- Usar cuenta sintética `member` con correo `example.invalid` y contraseña aleatoria; no reutilizar la cuenta comercial ni registrar credenciales, sesiones o IDs de usuario.
- Crear una lista, dos prospectos y dos contactos previos, identificados por un prefijo único de ensayo. Ningún correo real, llamada, campaña, conversión o formulario público.
- Las variables `QE_TEST_*` y las públicas para el build sólo existen en el proceso del ensayo; no crear archivos de secretos ni cambiar `.env.example`.
- La limpieza exige privilegios del orquestador: los clientes CRM no tienen permiso de borrado físico. Limpiar sólo IDs creados por este ensayo, sin filtros amplios ni cascadas inferidas.

## Task 1 — Preparación y gate remoto

**Files:** este plan; ninguna modificación funcional.

- [x] Revisar las reglas del repositorio, el checklist de release y los handlers integrados.
- [x] Confirmar que la suite existente no es una prueba acotada de estos formularios.
- [ ] Obtener autorización explícita para reanudar el proyecto temporal, crear cuenta/rol y fixtures sintéticos, mutarlos desde la interfaz, limpiar exclusivamente esos registros y volver a pausarlo. Una confirmación genérica de continuar no sustituye este alcance.
- [ ] Comprobar por detalle/listado nombre, organización y referencia del temporal. Rechazar `izbfawwmbilmsrdjaanw` y cualquier referencia distinta de `jfmauklmfhuecftvgjms`; comprobar costo si la plataforma anuncia alguno.
- [ ] Tras reanudar, regenerar los tipos del temporal para contraste en memoria; verificar contratos de `prospect_lists`, `prospects`, `prospect_contacts` y contexto de sesión sin sobrescribir `database.types.ts`.
- [ ] Inventariar filas previas sin extraer contenido ni identidades; registrar únicamente conteos. Crear la cuenta y asignación `member` exclusivas del temporal; confirmar contexto `{ authorized: true, role: "member" }`.
- [ ] Crear la lista, dos prospectos y dos contactos sintéticos; mantener sus IDs sólo en memoria durante ejecución y limpieza.
- [ ] Configurar el proceso con `QE_TEST_SUPABASE_PROJECT_REF` y `QE_TEST_CONFIRM_DISPOSABLE_PROJECT` iguales al temporal. Verificar que URL y ambas confirmaciones coinciden; build con las variables públicas del mismo temporal, nunca las de `.env.example` productiva.

## Task 2 — Tres recorridos autenticados

**Files:** `src/app/prospectos/[listId]/page.tsx` como superficie bajo prueba, sin editar; evidencia agregada posterior en `docs/AUDIT.md`.

- [ ] Ejecutar `pnpm typecheck`, `pnpm test`, `pnpm build`; iniciar servidor local en loopback y puerto libre identificado. Ejecutar smoke público antes de iniciar sesión.
- [ ] Abrir pestaña nueva, autenticar sólo la cuenta sintética y abrir la lista de ensayo. Confirmar que ambos prospectos y contactos son visibles sin volcar contenido al log.
- [ ] Edición de prospecto: seleccionar el primero, cambiar sólo Ciudad por `Ciudad ensayo A`, guardar y comprobar aviso de éxito. Recargar y confirmar persistencia y conservación del segundo prospecto.
- [ ] Edición de contacto: abrir el primer contacto, modificar sólo Cargo por `Cargo ensayo A`, guardar y comprobar cierre del editor/aviso. Recargar y confirmar persistencia y conservación del otro contacto.
- [ ] Alta de contacto: agregar `Contacto ensayo nuevo` con correo `contacto@example.invalid`; confirmar una sola tarjeta nueva, borrador limpio y aviso de éxito. Recargar y confirmar exactamente un contacto adicional enlazado al prospecto esperado.
- [ ] Repetir edición de Ciudad y Cargo con sufijo `B` en viewport 390 × 844; verificar etiquetas, teclado/foco y ausencia de overflow. Capturar sólo evidencia visual sintética, sin credenciales o identificadores de Auth.
- [ ] Comprobar controles durante el guardado si la latencia permite observarlos. Si no, registrar esa limitación y mantener como evidencia los tests de handlers; no introducir interceptores ni afirmar que el bloqueo fue observado.
- [ ] No provocar errores contra datos reales. Los escenarios de excepción, respuesta vacía/incorrecta y doble envío siguen cubiertos por los tests de transporte simulado; no presentarlos como errores remotos observados.

## Task 3 — Limpieza y evidencia

**Files:** anexar resultado fechado en `docs/AUDIT.md` y actualizar este plan, sólo después del ensayo.

- [ ] Cerrar sesión y revocar las sesiones de la cuenta sintética antes de retirarla. Cerrar la pestaña de ensayo y restaurar viewport.
- [ ] Con orquestador autorizado, borrar sólo los tres contactos del ensayo, sus dos prospectos y la lista, en ese orden; comprobar que sus IDs ya no existen y los conteos previos quedaron restaurados.
- [ ] Retirar sólo el rol/membresía de la cuenta creada. Antes de eliminar irreversiblemente esa cuenta por interfaz, solicitar la confirmación requerida por la herramienta con el destino exacto; no borrar ninguna otra identidad.
- [ ] Confirmar limpieza agregada, pausar el proyecto temporal y verificar estado inactivo. Si cualquier limpieza falla, reportar los residuos sin publicar datos ni declarar el ensayo limpio.
- [ ] Identificar por puerto y ruta el proceso local antes de detenerlo; restaurar únicamente cambios automáticos de `next-env.d.ts` y excluir archivos generados.
- [ ] Registrar commit probado, resultados de cada recorrido, alcance de las lecturas de persistencia, vista móvil y limitaciones. No declarar cierre de Fase 9 ni resolver el reporte Android por esta prueba.
- [ ] Revisar diff y secretos; guardar evidencia sólo en commit local. Una futura publicación/integración requiere decisión aparte.

## Estado

Plan preparado el 2026-10-06. No se reanudó el temporal, no se crearon cuentas/fixtures y no se hicieron lecturas ni mutaciones remotas en esta preparación. La ejecución permanece pendiente de autorización específica.
