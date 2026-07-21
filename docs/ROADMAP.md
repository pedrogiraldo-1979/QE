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

- Baseline publicado en `main`: `ab1a616a39c87c7617cc9996eab25b69c8f61fa4`.
- Fuente viva de producto: [`PRD-CRM.md`](./PRD-CRM.md).
- PRD de Fase 1: cerrado y conservado como documento histórico.
- Fuente canónica de código: `src/`.
- Stack reproducible: Node 24.14.0, pnpm 11.7.0 y lockfile versionado.
- Superficie: diez rutas de Next.js, nueve tablas CRM con RLS, ocho RPC públicas tipadas y una función privada de autorización.
- Autorización: allowlist privada; `admin` y `member` comparten actualmente el mismo CRUD.
- Calidad publicada: typecheck, 22 pruebas unitarias/de contrato, build de diez rutas, smoke HTTP y suite de integración aislada 8/8.
- Baseline de Supabase: seis migraciones reproducen el esquema desde cero sin usuarios ni datos.
- Entorno temporal de pruebas: limpio y en pausa después de las validaciones aisladas.
- Fase 8: cerrada y publicada en `main` como `ab1a616` mediante el [PR #13](https://github.com/pedrogiraldo-1979/QE/pull/13).

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
| 8 — Cierre visual autenticado | Se verificaron Prospección, portales y cinco bridges en escritorio y móvil; se corrigieron límites responsive y accesibles sin cambiar reglas de negocio. | [PR #13](https://github.com/pedrogiraldo-1979/QE/pull/13) y `AUDIT.md` sección 21. |

Las afirmaciones históricas de cada fase se conservan en `AUDIT.md` y `DECISIONS.md`. Esta tabla expresa su estado vigente y sustituye los pendientes intermedios que quedaron resueltos por fases posteriores.

## Fase activa

### Fase 9 — Definiciones de producto y operación (planificación)

Objetivo: convertir las decisiones abiertas de producto y operación en contratos aprobados antes de retirar bridges, ampliar funciones o modificar backend y datos.

Estado al corte:

- Fase 8 publicada y su gate visual cerrado;
- no hay implementación funcional de Fase 9 autorizada;
- permanecen abiertas las definiciones de workflow, campos obligatorios, permisos, eliminación/recuperación y métricas;
- cualquier cambio de Supabase, datos, dependencias, servicios externos o rutas conserva su gate independiente.

Gate de salida documental:

1. aprobar el workflow comercial y sus transiciones;
2. definir campos obligatorios y reglas de validación por entidad;
3. acordar la matriz de permisos para `admin` y `member`;
4. definir confirmación, auditoría, retención y recuperación de eliminaciones;
5. definir métricas con fórmula, fuente, objetivo, responsable y frecuencia;
6. actualizar el PRD vivo, las decisiones y los criterios de aceptación.

Cerrar este gate no autoriza por sí mismo implementación, migraciones, cambios de RLS/Auth, datos, ERP ni proveedores de telemetría.

## Backlog futuro

El orden es propuesto. Cada bloque necesita alcance y aprobación antes de iniciar implementación.

### Prioridad 1 — Deuda arquitectónica verificada

- reemplazar un bridge por vez con composición React propietaria;
- comenzar por `ContactCompletionBridge` y `AddActivityEntryBridge`, por su dependencia de DOM/portal;
- repetir typecheck, pruebas, build y gate visual tras cada sustitución;
- centralizar repositorios adicionales sólo cuando una ruta sea intervenida;
- evitar reorganizaciones de rutas sin una aprobación específica.

Gate: equivalencia funcional y visual, rollback claro y ausencia de cambios de backend.

### Prioridad 2 — Calidad y automatización

- decidir si se versiona automatización de navegador y aprobar su dependencia;
- trazar criterios del PRD a pruebas unitarias, integración, smoke o evidencia manual;
- cubrir progresivamente creación/edición y actividades sin usar producción para fixtures;
- mantener la suite mutante fuera del CI normal mientras requiera un proyecto desechable.

Gate: cobertura reproducible sin secretos ni datos reales.

### Prioridad 3 — Gates independientes de backend y datos

- reconciliar la baseline en el historial productivo antes de otra migración;
- evaluar protección de contraseñas filtradas;
- decidir si se migran estados legados;
- decidir unicidad o reenvíos de respuestas públicas;
- diseñar paginación con orden estable;
- evaluar mejoras de integridad para altas conjuntas.

Gate: plan específico, autorización expresa, respaldo/reversión y pruebas aisladas. Ningún punto de este bloque queda autorizado por este roadmap.

### Prioridad 4 — Evolución comercial posterior

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
