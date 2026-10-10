# Plan — integración local D01/D03

> Ejecución inline con `executing-plans`, sin delegación. Diseño e implementación acotada aprobados en este chat; ver [especificación](../specs/2026-10-09-phase-9-metrics-integration-design.md).

**Objetivo:** conectar el núcleo puro a lecturas completas y tarjetas, sin cambios de backend.

**Arquitectura:** repositorio paginado independiente → controlador cancelable por instancia → hook habilitado por sesión/vista → tarjetas. Las cargas heredadas permanecen separadas.

**Stack:** TypeScript, React y runner Node ya existentes. No dependencias nuevas.

## Restricciones globales

Sólo lecturas del cliente con RLS y autorización actuales. No pruebas autenticadas productivas, migraciones, datos, ERP, logs, metas ni publicación. Páginas 500 × máximo 20; timeout 15 s. Descartar parciales y respuestas antiguas; sin reintentos automáticos. No interpretar nulabilidad/tipos desconocidos como datos válidos.

## Tarea 1 — Repositorio y paginación

Archivos nuevos: `src/lib/data/operationalMetricsRepository.ts`, `tests/operationalMetricsRepository.test.mjs`.

Interfaces: `readCompleteMetricSource<T extends {id:string}>(fetchPage, signal): Promise<MetricSource<T>>`; fetchPage recibe offsets inclusivos y devuelve `{data,error,count}`. `fetchOperationalMetrics(client, signal)` devuelve `{coverage,overdue}` calculados con el núcleo; funciones de consulta tipadas y columnas explícitas.

- [x] RED: pruebas con fuentes sintéticas y transporte simulado; páginas 500/500/1, cero, error/throw, conteo nulo/cambiante, respuesta corta, IDs duplicados, más de 10.000 filas y aborto. Ejemplo de aserción: `assert.deepEqual(await readCompleteMetricSource(async () => ({data:[],error:null,count:0}), signal), {status:"complete",rows:[]})`.
- [x] GREEN: recorrer offsets `from=0; from<count; from+=500`, exigir conteo estable, IDs únicos y longitud esperada; devolver sólo `error`/`incomplete` ante fallo. Iniciar cuatro fuentes en paralelo; adaptar tipos conocidos y ejecutar núcleo. Ejecutar `node --test tests/operationalMetricsRepository.test.mjs`.

## Tarea 2 — Lifecycle

Archivos nuevos: `src/features/crm/operationalMetricsLoader.ts`, `src/hooks/useOperationalMetrics.ts`, `tests/operationalMetricsLoader.test.mjs`.

Interfaces: `createOperationalMetricsLoader(fetchMetrics,onChange)` devuelve `refresh(): Promise<void>` y `clear(): void`. Estado unión `idle|loading|ready`; ready contiene los dos resultados agregados. El hook recibe cliente y boolean enabled; devuelve estado y refresh.

- [x] RED: peticiones diferidas demuestran descarte fuera de orden, clear/desmontaje, aborto previo, error saneado y carga inmediata. `loader.clear(); deferred.resolve(result); await pending; assert.equal(states.at(-1).status,"idle")`.
- [x] GREEN: generación por instancia y AbortController; sólo publicar si coincide generación y señal no abortada. Hook cancela/limpia en efecto, invalida por evento Auth y oculta estado al estar deshabilitado. Ejecutar `node --test tests/operationalMetricsLoader.test.mjs`.

## Tarea 3 — Presentación y wiring

Nuevo: `src/components/crm/OperationalMetricCards.tsx`, `tests/operationalMetricsPresentation.test.mjs`. Modificar sólo consumidores `src/app/page.tsx` y etiqueta/aclaración de actividad heredada en `src/components/crm/HomePanel.tsx`; no extraer páginas ni alterar agenda/formularios.

- [x] RED: render con React DOM Server existente; loading/idle, sin base, ratio/porcentaje, cero real y fuente indisponible. Wiring exige sesión lista, vista Inicio y refresco; no usa el fallback de listas vacías.
- [x] GREEN: dos artículos `.metric-card` con valores accesibles y mensaje de lectura no transaccional; sustituir tarjeta superior antigua D03 y añadir cobertura. Ejecutar suite de presentación y `pnpm typecheck`.

## Tarea 4 — Evidencia y entrega

- [x] Registrar contraste de metadatos y diferencias en `docs/AUDIT.md`; no declarar resueltas las reglas heredadas o Fase 9.
- [x] `pnpm typecheck`, `pnpm test`, `pnpm build`; servidor local de producción, `pnpm test:smoke`, revisión de login/bundle sin sesión ni escrituras; detener servidor y restituir archivos generados.
- [x] Revisar React, diff y alcance; conservar cambios originales. Entrega mediante commit local sin push/PR/merge automáticos. Documentar cualquier aceptación aún no ejecutada.

Los comandos pnpm usan flags sólo de invocación `--config.manage-package-manager-versions=false --config.package-manager-strict=false`, por las herramientas ya disponibles. No cambiar configuración ni instalar paquetes.

Resultado local: 211/211 pruebas, typecheck, build y smoke 13/13 aprobados; login hidratado sin errores/avisos de consola. El SDK real con transporte sintético reintentaba HTTP 503 (16 peticiones); regresión RED y GREEN al desactivar explícitamente sus reintentos (cuatro peticiones). Falta aceptación del dashboard autenticado en entorno aislado autorizado; no se afirma aceptación remota ni cierre de Fase 9.
