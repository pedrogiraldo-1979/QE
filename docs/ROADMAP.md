# Roadmap vigente del CRM

## Principios

- Conservar primero el comportamiento y mejorar en pasos pequeños.
- Separar documentación, frontend, backend, datos y operación en cambios trazables.
- No considerar cerrado un trabajo hasta que su evidencia y su release estén completos.
- No modificar Supabase o datos como efecto secundario de una reorganización.
- Exigir autorización independiente para acciones destructivas, dependencias y servicios externos.
- Mantener el CRM como alcance actual; ERP permanece fuera de alcance.

## Estado actual

Fecha de corte: 2026-07-21.

- Baseline publicado en `main`: `f55ae78d90ff05eb4ea7c57b6c0ea7e9c70a7490`.
- Fuente viva de producto: [`PRD-CRM.md`](./PRD-CRM.md).
- PRD de Fase 1: cerrado y conservado como documento histórico.
- Fuente canónica de código: `src/`.
- Stack reproducible: Node 24.14.0, pnpm 11.7.0 y lockfile versionado.
- Superficie: diez rutas de Next.js, nueve tablas CRM con RLS, ocho RPC públicas tipadas y una función privada de autorización.
- Autorización: allowlist privada; `admin` y `member` comparten actualmente el mismo CRUD.
- Calidad publicada: typecheck, 25 pruebas unitarias/de contrato, build de diez rutas, smoke HTTP 10/10, gate visual autenticado, smoke de campaña no mutante y suites aisladas de integración/E2E.
- Baseline de Supabase: seis migraciones reproducen el esquema desde cero sin usuarios ni datos.
- Entorno temporal de pruebas: limpio y en pausa después de las validaciones aisladas.
- Fase 8: cerrada, fusionada mediante el [PR #13](https://github.com/pedrogiraldo-1979/QE/pull/13) y publicada.
- Fase 9: fase activa para cerrar definiciones funcionales, gobierno, evidencia operable y deuda técnica incremental.

Riesgos y decisiones abiertas que no bloquean el uso interno actual:

- reconciliar el historial productivo de la baseline antes de otra migración;
- decidir el tratamiento del estado legado `por_validar`;
- habilitar la protección de contraseñas filtradas mediante un gate de Auth;
- definir permisos diferentes para `admin` y `member`;
- definir auditoría y recuperación para eliminaciones;
- acordar la semántica de múltiples respuestas por enlace;
- definir métricas, retención, alertas y observabilidad;
- implementar paginación antes de superar 1.000 entidades por dominio.

## Fases cerradas

| Fase | Resultado cerrado | Evidencia principal |
| --- | --- | --- |
| 0 — Documentación e inventario | Se crearon reglas operativas, PRD inicial, roadmap, decisiones y auditoría. | `AGENTS.md`, PRD histórico y secciones 1–10 de `AUDIT.md`. |
| 1 — Baseline técnico | Se verificaron typecheck, build, rutas, manifests, source maps y `src/` como fuente activa. | `AUDIT.md` secciones 11–12. |
| 2 — Estabilización | Se unificaron contratos de prospectos, se aisló Auth/rutas, se reforzaron RLS/RPC y se adoptó la allowlist. | D-007 a D-016 y `AUDIT.md` secciones 13–14. |
| 3 — Duplicados | Se auditaron y retiraron las cinco copias raíz con aprobación y rollback trazable. | `PHASE-3-DUPLICATES.md`, D-017 y `AUDIT.md` sección 15. |
| 4 — Modularización inicial | Se separaron modelo, hook de datos y vistas del dashboard; tres bridges simples se retiraron. | D-005, D-018 y `AUDIT.md` sección 16. |
| 5 — Contratos de datos | Se generaron tipos remotos, columnas explícitas, repositorio del dashboard y guardas de revisión. | `DATA-CONTRACTS.md`, D-019 y `AUDIT.md` sección 17. |
| 6 — Calidad y operación | Se añadió CI, smoke, release checklist y una suite autenticada/mutante en un proyecto desechable. | D-008, D-020 y `AUDIT.md` secciones 18–19. |
| 7 — Reproducibilidad de Supabase | El esquema se reconstruyó desde cero y coincidió con producción sin copiar identidades ni datos. | D-021 y `AUDIT.md` sección 20. |
| 8 — Cierre visual autenticado y publicación | Se cerró la comparación visual, se corrigieron regresiones responsive y de accesibilidad y se publicó el alcance sin cambios de backend. | PR #13, `AUDIT.md` sección 21, 22/22 pruebas, build de diez rutas y gate visual autenticado en escritorio y móvil. |

Las afirmaciones históricas de cada fase se conservan en `AUDIT.md` y `DECISIONS.md`. Esta tabla expresa su estado vigente y sustituye los pendientes intermedios que quedaron resueltos por fases posteriores.

## Fase activa

### Fase 9 — Cierre funcional y operativo

Objetivo: convertir las decisiones funcionales y operativas pendientes en contratos aprobados, criterios verificables y entregas incrementales, manteniendo separados producto, frontend, backend, datos y operación.

#### Etapa 1 — Contrato comercial

- aprobar workflow, estados, transiciones y tratamiento de `por_validar`;
- definir campos obligatorios por entidad y operación;
- acordar señales, precedencia y resolución humana para conversión y duplicados.

Gate: decisiones registradas en el PRD, criterios `P9-WF`, `P9-FLD` y `P9-CONV` aceptados y ausencia de mutaciones de datos.

#### Etapa 2 — Gobierno y recuperación

- aprobar la matriz de permisos `admin`/`member`;
- definir auditoría, eliminación lógica, restauración, retención y purga;
- decidir la semántica de múltiples respuestas, reenvíos y reapertura del formulario público.

Gate: criterios `P9-RBAC`, `P9-AUD` y `P9-CU` aceptados; cualquier cambio de RLS, Auth, RPC, esquema o datos cuenta con un plan y una autorización independientes.

#### Etapa 3 — Evidencia operable

- mapear criterios del PRD a pruebas unitarias, contratos, integración, smoke o evidencia manual;
- registrar vacíos de cobertura, responsables y gates;
- definir métricas con fórmula, fuente, granularidad, zona horaria, frecuencia, objetivo, responsable, privacidad y retención.

Gate: matriz de cobertura revisada, criterios `P9-COV` y `P9-MET` aceptados y ninguna telemetría o dependencia externa introducida sin aprobación.

#### Etapa 4 — Mantenibilidad incremental

- priorizar `ContactCompletionBridge` y `AddActivityEntryBridge`;
- sustituir un bridge por entrega con composición React propietaria;
- centralizar repositorios sólo al intervenir su ruta;
- repetir typecheck, pruebas, build, smoke y gate visual tras cada sustitución.

Gate: criterios `P9-TECH` aceptados, equivalencia funcional/visual/accesible, rollback claro y ausencia de cambios de backend no autorizados.

#### Gate de salida

1. cerrar o rechazar explícitamente todas las decisiones pendientes de la Fase 9;
2. actualizar reglas y alcance funcional publicado en el PRD sólo para comportamientos implementados y fusionados;
3. completar la matriz de criterios y cobertura con evidencia reproducible;
4. aprobar un catálogo operable de métricas sin instrumentación implícita;
5. verificar cada sustitución técnica como entrega independiente;
6. completar typecheck, pruebas, build, smoke, preview, revisión visual y rollback de cada cambio publicable;
7. registrar en decisiones y auditoría los resultados, límites y deuda que se posponga.

La activación de esta fase no autoriza implementar todos los frentes como una unidad ni modifica Supabase o datos por efecto del roadmap.

## Backlog futuro y trabajo condicionado

Los puntos siguientes no forman parte automática de la Fase 9. Cada uno necesita alcance, aprobación y gate propios.

### Calidad y automatización posterior

- decidir si se versiona automatización de navegador y aprobar su dependencia;
- ampliar la automatización de creación, edición y actividades después de aprobar la matriz de cobertura;
- mantener la suite mutante fuera del CI normal mientras requiera un proyecto desechable.

Gate: cobertura reproducible sin secretos ni datos reales.

### Gates independientes de backend y datos

- reconciliar la baseline en el historial productivo antes de otra migración;
- evaluar protección de contraseñas filtradas;
- ejecutar, si se aprueba en Fase 9, la migración de estados legados mediante un plan reversible;
- implementar, si se aprueba en Fase 9, la política de respuestas públicas mediante un gate aislado;
- diseñar paginación con orden estable;
- evaluar mejoras de integridad para altas conjuntas.

Gate: plan específico, autorización expresa, respaldo/reversión y pruebas aisladas. Ningún punto de este bloque queda autorizado por este roadmap.

### Evolución comercial posterior

- mejorar calidad y deduplicación de contactos;
- definir un flujo de importación/reimportación revisable;
- incorporar prioridad y próxima acción sólo después de aprobar el contrato;
- evaluar plantillas de comunicación cuando la calidad de datos y la operación estén listas.

Gate: problema, usuario, criterio de aceptación y riesgo de datos documentados en el PRD vivo.

## Fuera de alcance

- ERP: inventario, compras, contabilidad, nómina y facturación;
- migraciones, cambios de RLS/Auth, Edge Functions o datos sin gate independiente;
- limpiezas, importaciones o borrados no autorizados;
- automatización productiva de email o WhatsApp;
- telemetría o servicios externos sin política y aprobación;
- rediseño visual integral;
- multi-organización, ownership por fila o permisos no definidos por producto;
- retirada masiva de bridges o CSS sin equivalencia comprobada;
- merge automático de PR o publicación directa sobre `main`.
