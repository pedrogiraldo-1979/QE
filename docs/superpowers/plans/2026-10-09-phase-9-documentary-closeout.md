# Phase 9 documentary closeout — Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans inline; no delegation. Las acciones sensibles conservan los gates de AGENTS.md.

**Goal:** Reconciliar evidencia publicada, PR históricos y guía operativa sin declarar funcionalidades pendientes como completadas.

**Architecture:** Una rama documental desde main `361f63b`, conservando la historia y los cambios locales ajenos. Separar aceptación del primer uso, cierre total de fase y futuros releases de backend.

**Tech Stack:** Markdown, Git y GitHub CLI existente; sin dependencias ni datos reales nuevos.

## Global constraints

- No código, configuración, secretos, Supabase, permisos, migraciones, datos ni env nuevos.
- No merge ni publicación productiva de esta rama sin autorización específica.
- Mantener PR #44/Android y aceptación de la hermana pendientes.
- No borrar ramas ni reescribir decisiones o evidencia histórica.
- D-032 sigue vigente: no metas sin baseline, no instrumentación ni históricos implícitos.

## Task 1 — Reconciliación administrativa

**Files:** docs/PHASE-9-CLOSURE.md, docs/AUDIT.md, docs/DECISIONS.md.

- [x] Confirmar #48 integrado, sus tres cambios originales y D-032 como decisión posterior a #30.
- [x] Cerrar #45–47 como incorporados y #30 como sustituido, dejando comentarios y conservando ramas.
- [x] Contrastar diff de #38; recuperar la lectura histórica con fecha, sin afirmar vigencia de herramientas/plan/backups en octubre.
- [ ] Publicar el PR documental y enlazarlo como propuesta de reconciliación de #38, sin fusionar ni cerrar automáticamente ese PR antes de integrar su sustituto.

## Task 2 — Fuentes vivas y operación

**Files:** docs/ROADMAP.md, docs/ACCEPTANCE-COVERAGE.md, docs/PRD-CRM.md, docs/CRM-DAILY-USE.md, docs/SUPABASE-RELEASE-PROCEDURE.md.

- [x] Registrar release #48, límites de pruebas y diferencia entre publicación, persistencia aislada y aceptación real.
- [x] Preparar guía: sesión, búsqueda previa, guardados inciertos, actividades, conciliación y reporte saneado.
- [x] Mantener métricas y backend como pendientes condicionados; no alterar fórmulas D-032 ni inventar medidas/objetivos.
- [x] Preparar orden de trabajo y separar los dos pendientes reservados a Pedro de las unidades técnicas que requieren diseño/release propio.

## Task 3 — Verificación y entrega

**Files:** sólo los Markdown anteriores y este plan.

- [x] Ejecutar pnpm typecheck y pnpm test; exigir cero fallos. Resultado: 141/141 pruebas y typecheck aprobados.
- [x] Revisar git diff --check, enlaces locales y lista de archivos; no código ni artefactos generados. Resultado: nueve documentos y 143 enlaces locales, sin referencias rotas.
- [ ] Crear commit, push de esta rama y un solo PR documental contra main, sin merge; adjuntar PR y esperar CI.
- [ ] Informar lo realmente terminado y los gates técnicos que no pueden declararse cerrados.

## Criterio de salida

PR documental revisable con evidencia y rutina de uso, PR duplicados reconciliados y estado honesto de pendientes. Este plan no implementa auditoría, restauración, métricas ni reemplazos de bridges; completar o aplazar esos frentes requiere sus decisiones propias.
