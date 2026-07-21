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

- Baseline publicado en `main`: `862e195d79b0be4c895b859aa8e415d7a06ef3b9`.
- Fuente viva de producto: [`PRD-CRM.md`](./PRD-CRM.md).
- PRD de Fase 1: cerrado y conservado como documento histórico.
- Fuente canónica de código: `src/`.
- Stack reproducible: Node 24.14.0, pnpm 11.7.0 y lockfile versionado.
- Superficie: diez rutas de Next.js, nueve tablas CRM con RLS, ocho RPC públicas tipadas y una función privada de autorización.
- Autorización: allowlist privada; `admin` y `member` comparten actualmente el mismo CRUD.
- Calidad publicada: typecheck, 16 pruebas unitarias/de contrato, build de diez rutas, smoke HTTP y suite de integración aislada 8/8.
- Baseline de Supabase: seis migraciones reproducen el esquema desde cero sin usuarios ni datos.
- Entorno temporal de pruebas: limpio y en pausa después de las validaciones aisladas.
- Fase 8: implementada y verificada en el [PR #13](https://github.com/pedrogiraldo-1979/QE/pull/13), todavía fuera de `main` mientras el PR siga sin fusionar.

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

Las afirmaciones históricas de cada fase se conservan en `AUDIT.md` y `DECISIONS.md`. Esta tabla expresa su estado vigente y sustituye los pendientes intermedios que quedaron resueltos por fases posteriores.

## Fase activa

### Fase 8 — Cierre visual autenticado y publicación

Objetivo: cerrar la comparación visual autenticada de Prospección, portales y los cinco bridges complejos sin cambiar reglas de negocio ni datos productivos.

Estado al corte:

- implementación y documentación asociada publicadas en el PR borrador #13;
- CI de GitHub aprobado;
- preview de Vercel en estado `READY`;
- validación local completada con 22/22 pruebas y build de diez rutas;
- entorno de prueba aislado limpiado y pausado;
- producción y `main` sin este cambio hasta que exista una decisión de merge.

Gate de salida:

1. revisar manualmente el preview en escritorio y móvil;
2. confirmar que el PR #13 conserva únicamente el alcance de Fase 8;
3. fusionar mediante el flujo normal sólo con aprobación explícita;
4. esperar deployment de producción `READY`;
5. ejecutar smoke no mutante y revisar hidratación/errores;
6. registrar el cierre remoto sin mezclar trabajo de fases futuras.

No forman parte de este gate la retirada de bridges, nuevas funciones de producto ni cambios de Supabase.

## Backlog futuro

El orden es propuesto. Cada bloque necesita alcance y aprobación antes de iniciar implementación.

### Prioridad 1 — Definiciones de producto y operación

- aprobar workflow comercial y transiciones permitidas;
- definir campos obligatorios por entidad;
- acordar matriz de permisos `admin`/`member`;
- definir política de eliminación, auditoría y recuperación;
- definir métricas con fórmula, fuente, objetivo, responsable y frecuencia;
- aprobar política de telemetría, retención y alertas antes de elegir proveedor.

Gate: decisiones registradas y criterios de aceptación actualizados en el PRD vivo.

### Prioridad 2 — Deuda arquitectónica verificada

- reemplazar un bridge por vez con composición React propietaria;
- comenzar por `ContactCompletionBridge` y `AddActivityEntryBridge`, por su dependencia de DOM/portal;
- repetir typecheck, pruebas, build y gate visual tras cada sustitución;
- centralizar repositorios adicionales sólo cuando una ruta sea intervenida;
- evitar reorganizaciones de rutas sin una aprobación específica.

Gate: equivalencia funcional y visual, rollback claro y ausencia de cambios de backend.

### Prioridad 3 — Calidad y automatización

- decidir si se versiona automatización de navegador y aprobar su dependencia;
- trazar criterios del PRD a pruebas unitarias, integración, smoke o evidencia manual;
- cubrir progresivamente creación/edición y actividades sin usar producción para fixtures;
- mantener la suite mutante fuera del CI normal mientras requiera un proyecto desechable.

Gate: cobertura reproducible sin secretos ni datos reales.

### Prioridad 4 — Gates independientes de backend y datos

- reconciliar la baseline en el historial productivo antes de otra migración;
- evaluar protección de contraseñas filtradas;
- decidir si se migran estados legados;
- decidir unicidad o reenvíos de respuestas públicas;
- diseñar paginación con orden estable;
- evaluar mejoras de integridad para altas conjuntas.

Gate: plan específico, autorización expresa, respaldo/reversión y pruebas aisladas. Ningún punto de este bloque queda autorizado por este roadmap.

### Prioridad 5 — Evolución comercial posterior

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
