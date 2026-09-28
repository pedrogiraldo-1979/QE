# Matriz de cobertura — Fase 9

## Propósito y alcance

Este registro vivo relaciona cada criterio `P9-*` con su evidencia, límite, responsable y siguiente gate. No autoriza implementación, instrumentación, cambios de código, Supabase, datos ni servicios externos. La evidencia aislada no equivale a un release en un entorno compartido.

| Estado | Significado |
| --- | --- |
| `documentado` | La regla o definición está aprobada y su evidencia es un documento vigente; no implica que esté implementada. |
| `cubierto_parcialmente` | Existe evidencia técnica o manual, pero queda una limitación explícita antes de cerrar el criterio. |
| `cubierto` | La evidencia indicada satisface por completo el criterio dentro de su alcance declarado. |
| `bloqueado_por_gate` | El siguiente paso requiere una autorización, una decisión o un entorno que todavía no existe. |

## Criterios

| Criterio | Estado | Evidencia actual | Vacío o límite | Responsable | Gate de cierre | Prueba futura |
| --- | --- | --- | --- | --- | --- | --- |
| `P9-WF-01` | `documentado` | [Especificación comercial](./superpowers/specs/2026-07-21-phase-9-commercial-contract-design.md) | Catálogo no está aplicado a todos los flujos. | Producto + Ingeniería | Plan técnico por flujo aprobado. | Contrato + integración aislada. |
| `P9-WF-02` | `documentado` | Especificación comercial, secciones de transiciones. | No todas las transiciones tienen ejecución backend. | Producto + Ingeniería | Entrega aislada por transición. | Contrato + integración aislada. |
| `P9-WF-03` | `documentado` | [D-026](./DECISIONS.md#d-026--aprobar-el-contrato-comercial-de-la-etapa-1) y especificación comercial. | `por_validar` sigue compatible en lectura. | Producto + Ingeniería | Decisión de migración o retiro con reversión. | Contrato + integración aislada. |
| `P9-FLD-01` | `documentado` | Especificación comercial, matriz de campos. | Formularios y datos existentes no se alteraron. | Producto + Ingeniería | Entrega de validación por entidad. | Unitaria + visual/manual. |
| `P9-FLD-02` | `documentado` | Especificación comercial, reglas de validación. | Mensajes no están comprobados en todos los formularios. | Producto + Ingeniería | Entrega por formulario. | Unitaria + visual/manual. |
| `P9-CONV-01` | `documentado` | [D-026](./DECISIONS.md#d-026--aprobar-el-contrato-comercial-de-la-etapa-1) y especificación comercial. | Señales aprobadas no sustituyen la RPC actual. | Producto + Ingeniería | Diseño técnico de conversión autorizado. | Contrato + integración aislada. |
| `P9-CONV-02` | `documentado` | Especificación comercial, tabla de resultados. | Revisión humana no tiene flujo nuevo. | Producto + Operación | Entrega aislada de conflictos. | Integración aislada + manual. |
| `P9-CONV-03` | `cubierto_parcialmente` | `tests/supabase.integration.mjs` y evidencia de Fases 6/9. | Idempotencia existe para el contrato actual, no para todas las señales nuevas. | Ingeniería | Plan de conversión autorizado. | Integración aislada. |
| `P9-RBAC-01` | `cubierto_parcialmente` | [D-027](./DECISIONS.md#d-027--aprobar-el-gobierno-y-la-recuperación-de-la-etapa-2), `tests/authorizationModel.test.mjs` y validación aislada Fase 9. | La migración no está publicada en el entorno compartido. | Ingeniería + Operación | Release RBAC autorizado con rollback. | Integración aislada + smoke autenticado. |
| `P9-RBAC-02` | `cubierto_parcialmente` | [D-027](./DECISIONS.md#d-027--aprobar-el-gobierno-y-la-recuperación-de-la-etapa-2), `tests/authorizationModel.test.mjs`, `tests/dataContracts.test.mjs`. | Sólo la base RBAC está implementada; membresías y recuperación no. | Producto + Ingeniería | Planes separados aprobados. | Contrato + integración aislada. |
| `P9-RBAC-03` | `bloqueado_por_gate` | [Rollback RBAC](./PHASE-9-RBAC-ROLLBACK.md) y auditoría Fase 9. | Falta autorización de release compartido. | Operación + Ingeniería | Historial baseline, autorización y reversión aprobada. | Integración aislada + release smoke. |
| `P9-AUD-01` | `documentado` | [D-027](./DECISIONS.md#d-027--aprobar-el-gobierno-y-la-recuperación-de-la-etapa-2) y especificación de gobierno. | No hay modelo ni historial implementado. | Producto + Ingeniería | Plan de auditoría autorizado. | Contrato + integración aislada. |
| `P9-AUD-02` | `documentado` | [D-027](./DECISIONS.md#d-027--aprobar-el-gobierno-y-la-recuperación-de-la-etapa-2) y especificación de gobierno. | No hay eliminación lógica implementada. | Producto + Ingeniería | Plan de recuperación autorizado. | Integración aislada + visual/manual. |
| `P9-AUD-03` | `documentado` | [D-027](./DECISIONS.md#d-027--aprobar-el-gobierno-y-la-recuperación-de-la-etapa-2) y especificación de gobierno. | No existe restauración ni procedimiento de purga aprobado. | Operación + Ingeniería | Plan de recuperación y purga excepcional. | Integración aislada + manual. |
| `P9-CU-01` | `documentado` | [D-027](./DECISIONS.md#d-027--aprobar-el-gobierno-y-la-recuperación-de-la-etapa-2) y especificación de gobierno. | El ciclo único no está implementado. | Producto + Ingeniería | Plan de enlaces y respuestas autorizado. | Contrato + integración aislada. |
| `P9-CU-02` | `documentado` | [D-027](./DECISIONS.md#d-027--aprobar-el-gobierno-y-la-recuperación-de-la-etapa-2) y especificación de gobierno. | El historial actual no representa el ciclo nuevo. | Producto + Ingeniería | Plan de enlaces y respuestas autorizado. | Contrato + integración aislada. |
| `P9-CU-03` | `documentado` | [D-027](./DECISIONS.md#d-027--aprobar-el-gobierno-y-la-recuperación-de-la-etapa-2) y especificación de gobierno. | Estados actuales no se migran por esta decisión. | Producto + Ingeniería | Plan reversible autorizado. | Integración aislada. |
| `P9-COV-01` | `cubierto` | Esta matriz, PRD y checklist de release. | Debe mantenerse al abrir cada entrega futura. | Ingeniería + Operación | Revisión en cada PR de Fase 9. | Contrato documental. |
| `P9-COV-02` | `cubierto` | Esta matriz, con vacío, responsable y gate por fila. | Los nuevos criterios deben añadir su propia fila. | Producto + Ingeniería + Operación | Revisión en cada PR de Fase 9. | Contrato documental. |
| `P9-MET-01` | `cubierto` | [Catálogo de métricas](./PHASE-9-METRICS.md). | Definición no implica fuente habilitada. | Producto + Operación | Revisión trimestral de definiciones. | Contrato documental. |
| `P9-MET-02` | `cubierto` | [Catálogo de métricas](./PHASE-9-METRICS.md). | Objetivos iniciales son hipótesis, no baseline. | Producto + Operación | Baseline agregada autorizada. | Revisión operativa. |
| `P9-MET-03` | `cubierto` | [Catálogo de métricas](./PHASE-9-METRICS.md), privacidad y retención. | No hay instrumentación ni proveedor aprobados. | Producto + Operación + Ingeniería | Revisión de privacidad e instrumentación. | Revisión de diseño. |
| `P9-TECH-01` | `cubierto_parcialmente` | [AUDIT.md](./AUDIT.md) y roadmap Etapa 4. | Falta inventario priorizado en un registro único. | Ingeniería | Entrega de mantenibilidad aprobada. | Contrato + visual/manual. |
| `P9-TECH-02` | `bloqueado_por_gate` | Checklist de release y evidencia Fase 8. | Ningún bridge nuevo ha sido retirado bajo el contrato P9. | Ingeniería | Plan por bridge aprobado. | Unitaria + build + smoke + visual. |
| `P9-TECH-03` | `cubierto_parcialmente` | `AGENTS.md`, roadmap y Fase 4. | Requiere revisión por cada intervención futura. | Ingeniería | Revisión de alcance por PR. | Revisión de diff. |

## Mantenimiento

- Actualizar una fila en el mismo PR que cambie su evidencia o su gate.
- No cambiar `bloqueado_por_gate` a otro estado sin enlazar la autorización y la evidencia exigidas.
- Conservar los límites aunque una prueba nueva pase; una prueba no cubre una superficie distinta de la que ejecuta.
- Registrar una contradicción documental en [AUDIT.md](./AUDIT.md) antes de elegir una versión como canónica.
