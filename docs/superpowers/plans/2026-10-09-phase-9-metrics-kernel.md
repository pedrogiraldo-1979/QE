# Plan de implementación — núcleo local de MET-D01 y MET-D03

> Ejecución inline con `executing-plans`, sin delegación. Alcance aprobado por Pedro en este chat el 2026-10-09: cálculos y pruebas locales, sin interfaz ni conexión a datos reales.

**Objetivo:** implementar dos funciones puras verificables del catálogo D-032, sin activar indicadores operativos.

**Arquitectura:** nuevo módulo independiente `src/features/crm/operationalMetrics.ts`, sin imports de Supabase ni de páginas. Recibe proyecciones locales y un estado explícito de completitud por fuente; devuelve únicamente agregados o una causa genérica de indisponibilidad. No se extraen ni cambian funciones existentes.

**Stack:** TypeScript estricto y runner nativo de Node existentes; ninguna dependencia nueva.

## Límites

- Rama `codex/phase-9-metrics-kernel`, desde `origin/main` en `361f63b`; PR #49 permanece independiente.
- No consultas, tipos remotos regenerados, credenciales, datos, Auth, SQL, RLS, configuración, proveedores, persistencia ni telemetría. No se necesita el esquema remoto para probar estas funciones sobre entradas sintéticas; contrastarlo será obligatorio antes de cualquier adaptador real.
- No cambiar la validación de formularios, `isOverdue`, estados de prospectos ni contadores publicados. No implementar MET-D02.
- No declarar satisfechos P9-MET ni cerrar Fase 9. Sin metas, umbrales o histórica.
- `complete` es una precondición explícita del llamador, no una prueba de paginación. Un futuro adaptador debe demostrarla antes de invocar el núcleo.

## Contrato local

`MetricSource<T>` es `{ status: "complete", rows: readonly T[] }` o `{ status: "error" | "incomplete" }`. No admite mensajes de error con datos personales. Si cualquier fuente falla o es parcial, no devuelve cifras ni ceros.

`calculateCompanyContactCoverage(companies, contacts)` consume empresas con `id` y contactos con `company_id`, `full_name`, `email`, `phone`; devuelve `{status:"available", numerator, denominator, percentage}`. Usa empresas distintas; ignora contactos huérfanos y cuenta cada empresa una vez. Nombre recortado y email válido o teléfono normalizado de al menos siete dígitos. Porcentaje sin redondeo de presentación; base vacía = `percentage: null`, a presentar como “sin base” en una futura interfaz.

`calculateOverdueFollowUps(companyActivities, prospectActivities, asOf)` consume acciones proyectadas con `kind: "follow_up" | "note"`, `dueDate: string | null`, `completed: boolean | null`. Devuelve `{status:"available", count}`. El llamador futuro debe mapear tipos remotos a `kind`; aquí no se inventa esa correspondencia. Excluye notas, completadas, sin fecha y fechas de hoy/futuras; compara fechas civiles válidas con el día de `asOf` en `America/Bogota`. Fecha inválida o finalización desconocida de una acción fechada = indisponible, no cero.

Ambas funciones pueden devolver `{status:"unavailable", reason:"source-error"|"incomplete-source"|"invalid-input"}`. No devuelven identificadores, nombres ni canales. No mutan entradas.

## Tarea 1 — Cobertura de contactos

- [x] Crear `tests/operationalMetrics.test.mjs`, importando las funciones desde el módulo nuevo. Afirmar razón 2/3, porcentaje, nombre vacío, canales inválidos, teléfono de seis/siete dígitos, email inválido con teléfono válido, huérfanos, duplicados, base vacía, error y parcialidad de ambas fuentes, salida agregada e inmutabilidad.
- [x] Ejecutar `node --test tests/operationalMetrics.test.mjs`; observar RED por módulo todavía inexistente, sin errores ajenos.
- [x] Implementar contrato y `calculateCompanyContactCoverage` conforme a estas aserciones. Ejecutar el mismo comando hasta GREEN para esta tarea.

## Tarea 2 — Seguimientos vencidos

- [x] Añadir aserciones a la misma suite: suma de ambas fuentes; notas/completadas/sin fecha/hoy/futuro excluidos; cambio de día Bogotá a `2026-10-10T04:59:59Z` y `2026-10-10T05:00:00Z`; año bisiesto; fecha inexistente; referencia inválida; finalización desconocida; fuentes fallidas/parciales; salida agregada e inmutabilidad.
- [x] Observar RED antes de implementar `calculateOverdueFollowUps`.
- [x] Implementar el cálculo puro, sin reinterpretar tipos ni nulabilidad remotos. Repetir suite hasta GREEN.

## Tarea 3 — Revisión y entrega local

- [x] Registrar diferencias confirmadas y límites en `docs/AUDIT.md`, sin reescribir historia ni incorporar documentos del PR #49.
- [x] Ejecutar `pnpm typecheck`, `pnpm test`, `pnpm build`; iniciar producción local y ejecutar `pnpm test:smoke`. No usar sesión autenticada ni hacer mutaciones.
- [x] Revisar diff, ausencia de imports de producción del nuevo núcleo, secretos, datos reales y artefactos generados. Sólo los dos archivos nuevos de código/pruebas, este plan y el anexo de auditoría.
- [x] Conservar rama y trabajo verificable. Sin merge, publicación productiva o PR nuevo automático; comunicar resultado y siguiente gate de integración real.

## Resultado de ejecución

41 pruebas nuevas, 182 pruebas totales, typecheck, build y smoke HTTP local 13/13 aprobados. Corte Bogotá repetido con zonas del proceso Auckland y Los Ángeles. Revisión inline: funciones sin imports ni consumidores, entradas readonly, resultados agregados, ningún cambio de contrato remoto. Servidor de prueba detenido; artefacto `next-env.d.ts` restituido. La siguiente unidad exige aprobar el adaptador de lectura/completitud y presentación; no forma parte de este plan.

Los comandos pnpm se ejecutaron con `--config.manage-package-manager-versions=false --config.package-manager-strict=false`, sólo para usar la herramienta existente sin instalación automática ni edición de configuración; ver límites de versión en auditoría.

## Reversión

El núcleo no tiene consumidores de aplicación. Retirar esta unidad en un cambio posterior elimina sólo el módulo y sus pruebas; la aplicación publicada y Supabase permanecen iguales. No borrar ramas, históricos ni archivos ajenos.
