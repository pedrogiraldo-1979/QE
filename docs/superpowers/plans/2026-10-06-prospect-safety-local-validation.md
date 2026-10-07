# Prospect safety local validation — Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans inline; no delegation.

**Goal:** Comprobar juntos los cambios ya aprobados de PR #45, #46 y #47, sin release.

**Architecture:** Rama local `codex/phase-9-prospect-safety-validation` desde main `a4082c2`; copiar los tres commits mediante cherry-pick sin modificar sus ramas originales. Resolver únicamente solapamientos preservando las tres guardas y toda la evidencia histórica.

**Tech Stack:** Git, Next.js, React, TypeScript y pruebas existentes; sin dependencias nuevas.

## Constraints

- Sin push, nuevo PR, merge de main, producción, Supabase, sesión autenticada ni datos remotos.
- PR #44 queda excluido; el reporte Android sigue pendiente.
- No nuevas funcionalidades ni refactors; mantener intactos payloads, columnas y contratos.
- Restaurar sólo el cambio automático de `next-env.d.ts`; no versionar artefactos generados.

## Task 1 — Integración local y comprobaciones

**Files:** `src/app/prospectos/[listId]/page.tsx`, los tres tests y planes de PR #45–47, `docs/AUDIT.md`, este plan.

- [x] Verificar árbol limpio, entorno aislado y baseline de 109 pruebas.
- [x] Copiar, en orden, estos commits:

```text
git cherry-pick 84ad0ba76fcfcf6ec963dfb2146b532d3bdfbd83
git cherry-pick 81541073e2d0d20291f3b277b8c9a52394b5da8e
git cherry-pick 86e5456d825a7517ae1844ff77460415962d9eb6
```

- [x] Si `docs/AUDIT.md` entra en conflicto, eliminar sólo los marcadores y concatenar ambos anexos completos. Revisar que el código conserva `prospectEditInFlightRef`, `contactEditInFlightRef` y `newContactInFlightRef` una vez cada uno; no cambiar su lógica.
- [x] Ejecutar `pnpm typecheck`, `pnpm test` (141 pruebas esperadas) y `pnpm build` usando sólo variables públicas existentes. Si hay una regresión, investigar antes de ampliar el cambio.
- [x] Iniciar `pnpm start --port 3115 --hostname 127.0.0.1`, ejecutar `pnpm test:smoke` con `CRM_BASE_URL=http://127.0.0.1:3115`, comprobar el detalle dinámico y el login hidratado en navegador de escritorio/móvil sin iniciar sesión; detener sólo el servidor identificado.
- [x] Revisar diff, contratos intactos, ausencia de PR #44 y estado final; registrar evidencia local y pendientes de aceptación autenticada. Conservar la rama sin publicar.

## Resultado local

Integración: `0453991`, `8cc4b8b` y `371dc2f`. Único conflicto: anexos de `docs/AUDIT.md`, conservados completos. Los segmentos de los tres handlers coinciden exactamente con sus commits originales y cada guarda tiene una única declaración. Typecheck, 141/141 pruebas, build y smoke 13/13 aprobados; detalle dinámico HTTP 200. Login sin sesión visible, consola sin errores/avisos y contenido de 390 px en viewport de 390 px. Servidor de prueba detenido y pestaña temporal cerrada. Sin publicación, cambios remotos ni inclusión de PR #44.

## Gate posterior

Las pruebas de handlers usan transporte simulado; el login público no acredita formularios autenticados ni persistencia real. Cualquier ensayo mutante en proyecto Supabase desechable, publicación o merge requiere autorización posterior independiente.
