# Prospect safety authenticated acceptance — Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans inline; no delegation. Ensayo remoto autorizado el 2026-10-06; confirmar en la interfaz las acciones que requieran aprobación en el momento.

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
- [x] Obtener autorización explícita para reanudar el proyecto temporal, crear cuenta/rol y fixtures sintéticos, mutarlos desde la interfaz, limpiar exclusivamente esos registros y volver a pausarlo. Una confirmación genérica de continuar no sustituye este alcance.
- [x] Comprobar por detalle/listado nombre, organización y referencia del temporal. Rechazar `izbfawwmbilmsrdjaanw` y cualquier referencia distinta de `jfmauklmfhuecftvgjms`; comprobar costo si la plataforma anuncia alguno.
- [x] Tras reanudar, regenerar los tipos del temporal para contraste en memoria; verificar contratos de `prospect_lists`, `prospects`, `prospect_contacts` y contexto de sesión sin sobrescribir `database.types.ts`.
- [x] Inventariar filas previas sin extraer contenido ni identidades; registrar únicamente conteos. Crear la cuenta y asignación `member` exclusivas del temporal; confirmar contexto `{ authorized: true, role: "member" }`.
- [x] Crear la lista, dos prospectos y dos contactos sintéticos; mantener sus IDs sólo en memoria durante ejecución y limpieza.
- [x] Configurar el proceso con `QE_TEST_SUPABASE_PROJECT_REF` y `QE_TEST_CONFIRM_DISPOSABLE_PROJECT` iguales al temporal. Verificar que URL y ambas confirmaciones coinciden; build con las variables públicas del mismo temporal, nunca las de `.env.example` productiva.

## Task 2 — Tres recorridos autenticados

**Files:** `src/app/prospectos/[listId]/page.tsx` como superficie bajo prueba, sin editar; evidencia agregada posterior en `docs/AUDIT.md`.

- [x] Ejecutar `pnpm typecheck`, `pnpm test`, `pnpm build`; iniciar servidor local en loopback y puerto libre identificado. Ejecutar smoke público antes de iniciar sesión.
- [x] Abrir pestaña nueva, autenticar sólo la cuenta sintética y abrir la lista de ensayo. Confirmar que ambos prospectos y contactos son visibles sin volcar contenido al log.
- [x] Edición de prospecto: seleccionar el primero, cambiar sólo Ciudad por `Ciudad ensayo A`, guardar y comprobar aviso de éxito. Recargar y confirmar persistencia y conservación del segundo prospecto.
- [x] Edición de contacto: abrir el primer contacto, modificar sólo Cargo por `Cargo ensayo A`, guardar y comprobar cierre del editor/aviso. Recargar y confirmar persistencia y conservación del otro contacto.
- [x] Alta de contacto: agregar `Contacto ensayo nuevo` con correo `contacto@example.invalid`; confirmar una sola tarjeta nueva, borrador limpio y aviso de éxito. Recargar y confirmar exactamente un contacto adicional enlazado al prospecto esperado.
- [x] Repetir edición de Ciudad y Cargo con sufijo `B` en viewport 390 × 844; verificar etiquetas, teclado/foco y ausencia de overflow. Capturar sólo evidencia visual sintética, sin credenciales o identificadores de Auth.
- [x] Comprobar controles durante el guardado si la latencia permite observarlos. Si no, registrar esa limitación y mantener como evidencia los tests de handlers; no introducir interceptores ni afirmar que el bloqueo fue observado. La latencia no permitió capturar el estado pendiente; no se declara observado.
- [x] No provocar errores contra datos reales. Los escenarios de excepción, respuesta vacía/incorrecta y doble envío siguen cubiertos por los tests de transporte simulado; no presentarlos como errores remotos observados.

## Task 3 — Limpieza y evidencia

**Files:** anexar resultado fechado en `docs/AUDIT.md` y actualizar este plan, sólo después del ensayo.

- [x] Cerrar sesión y revocar las sesiones de la cuenta sintética antes de retirarla. Cerrar la pestaña de ensayo y restaurar viewport.
- [x] Con orquestador autorizado, borrar sólo los tres contactos del ensayo, sus dos prospectos y la lista, en ese orden; comprobar que sus IDs ya no existen y los conteos previos quedaron restaurados.
- [ ] Retirar sólo el rol/membresía de la cuenta creada. Antes de eliminar irreversiblemente esa cuenta por interfaz, solicitar la confirmación requerida por la herramienta con el destino exacto; no borrar ninguna otra identidad.
- [ ] Confirmar limpieza agregada, pausar el proyecto temporal y verificar estado inactivo. Si cualquier limpieza falla, reportar los residuos sin publicar datos ni declarar el ensayo limpio.
- [x] Identificar por puerto y ruta el proceso local antes de detenerlo; restaurar únicamente cambios automáticos de `next-env.d.ts` y excluir archivos generados.
- [x] Registrar commit probado, resultados de cada recorrido, alcance de las lecturas de persistencia, vista móvil y limitaciones. No declarar cierre de Fase 9 ni resolver el reporte Android por esta prueba.
- [ ] Revisar diff y secretos; guardar evidencia sólo en commit local. Una futura publicación/integración requiere decisión aparte.

## Estado

Plan preparado el 2026-10-06. No se reanudó el temporal, no se crearon cuentas/fixtures y no se hicieron lecturas ni mutaciones remotas en esta preparación. La ejecución permanece pendiente de autorización específica.

Avance posterior autorizado el 2026-10-06: destino comprobado por detalle/listado y organización Free. Reactivación completada hasta `ACTIVE_HEALTHY`; no se interpretó el catálogo vacío durante `COMING_UP`/`RESTORING` como pérdida de esquema. Una vez activo, conteos iniciales de listas, prospectos, contactos, usuarios y membresías: cero. Tipos regenerados en memoria; los tres bloques de contratos coinciden con el snapshot local. Se crearon únicamente una lista, dos prospectos y dos contactos sintéticos. Typecheck, 141/141 pruebas y build con la URL/clave públicas del temporal aprobados. Creación de la cuenta detenida antes de pulsar `Create user`, pendiente de confirmación de acceso en el momento; no hay sesión ni resultados autenticados. Los fixtures y el temporal activo quedan reservados para continuar este ensayo y requieren limpieza/pausa al finalizar, también si se cancela.

Avance siguiente: cuenta sintética `member` creada tras confirmación; contexto autorizado verificado. Los tres recorridos confirmaron éxito y persistencia después de recargar, con una sola alta y conservación del segundo prospecto/contacto. Ediciones móviles también persistieron; viewport 390 px, contenido 375 px, sin errores/avisos de consola. Tab desde Ciudad movió el foco a Teléfono, con contorno visible en captura sintética. Se cerró sesión, se restauró viewport y se cerró pestaña local. Limpieza exacta por IDs: listas, prospectos, contactos, membresías y sesiones de prueba quedaron en cero. Servidor local identificado y detenido; typecheck y 141/141 pruebas repetidos con éxito. Cuenta Auth aún existente sin rol ni sesiones: borrado irreversible detenido en el diálogo de Supabase, pendiente de confirmación en el momento. Pausa pendiente después de ese borrado; no declarar limpieza completa todavía.
