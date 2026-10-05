# Roadmap vigente del CRM

## Principios

- Conservar primero el comportamiento y mejorar en pasos pequeños.
- Separar documentación, frontend, backend, datos y operación en cambios trazables.
- No considerar cerrado un trabajo hasta que su evidencia y su release estén completos.
- No modificar Supabase o datos como efecto secundario de una reorganización.
- Exigir autorización independiente para acciones destructivas, dependencias y servicios externos.
- Mantener el CRM como alcance actual; ERP permanece fuera de alcance.

## Estado actual

### Corte vigente — 2026-10-05

- Baseline publicado: `main` en `1d1b45c`, PR #41.
- Recuperación de clave: PR #31 publicado; aceptación del correo y clave reales por la titular sigue independiente.
- Editor React de contactos: PR #39 publicado; se retiró sólo `ContactCompletionBridge`.
- Actividades: PR #40 publicó selector inline/confirmaciones; PR #41 exige exactamente una fila con ID coincidente antes de anunciar éxito. Completar/reprogramar y cero filas se verificaron sólo con fixtures aislados; sin escritura productiva.
- Calidad del release #41: 99 pruebas, typecheck, build, smoke CI; smoke público 13/13; Vercel `qe-crm` Production/Ready y login sin errores de consola. La solicitud de viewport móvil no se aplicó: sigue pendiente aceptación móvil del deployment.
- Cobertura: [matriz de 46 criterios](./ACCEPTANCE-COVERAGE.md), aceptada documentalmente en P9-COV, no certificado de uso diario.
- D-032: tres métricas diarias definidas, sin instrumentación ni metas; P9-MET-01 parcial, P9-MET-02 abierto, P9-MET-03 aceptado como política preventiva.
- Fase 9 y Etapa 3 siguen abiertas. Rol/acceso de la hermana, recorridos restantes y aceptación operativa requieren gates propios.

### Corte histórico conservado

Fecha de corte de los indicadores históricos de esta sección: 2026-07-21. Estado de migraciones actualizado el 2026-09-28.

- Baseline publicado en `main`: `f55ae78d90ff05eb4ea7c57b6c0ea7e9c70a7490`.
- Fuente viva de producto: [`PRD-CRM.md`](./PRD-CRM.md).
- PRD de Fase 1: cerrado y conservado como documento histórico.
- Fuente canónica de código: `src/`.
- Stack reproducible: Node 24.14.0, pnpm 11.7.0 y lockfile versionado.
- Superficie: diez rutas de Next.js, nueve tablas CRM con RLS, ocho RPC públicas tipadas y una función privada de autorización.
- Autorización: allowlist privada; la base RBAC figura aplicada en QE2026 y separa trabajo comercial de operaciones administrativas. Esta revisión no repitió pruebas autenticadas en producción.
- Calidad publicada: typecheck, 25 pruebas unitarias/de contrato, build de diez rutas, smoke HTTP 10/10, gate visual autenticado, smoke de campaña no mutante y suites aisladas de integración/E2E.
- Baseline de Supabase en el corte de 2026-07-21: seis migraciones reprodujeron el esquema observado entonces; esa prueba no acredita la paridad actual de la cadena histórica con QE2026.
- Entorno temporal de pruebas: limpio y en pausa después de las validaciones aisladas.
- Fase 8: cerrada, fusionada mediante el [PR #13](https://github.com/pedrogiraldo-1979/QE/pull/13) y publicada.
- Fase 9: fase activa para cerrar definiciones funcionales, gobierno, evidencia operable y deuda técnica incremental.

Actualización de migraciones (2026-09-28): QE2026 conserva 29 entradas y el repositorio diez SQL históricos con versiones divergentes. El PR #34 publicó una baseline estructural independiente, ensayada sólo en proyectos vacíos, y el PR #33 sincronizó los tipos generados. D-030 aprobó conservar ambas historias intactas y reservar los cambios nuevos para releases SQL individuales con revisión y gate propio. La [matriz](./MIGRATION-HISTORY-MATRIX.md) y el [procedimiento condicionado](./SUPABASE-RELEASE-PROCEDURE.md) están preparados; aún falta verificar un método de despliegue y el dry-run de un SQL concreto. La estrategia no autoriza reparar el historial ni desplegar otra migración.

Riesgos y trabajo abierto que no bloquean el uso interno actual:

- verificar para un SQL nuevo el procedimiento de release, con respaldo y dry-run que no reaplique SQL antiguo;
- evaluar un mecanismo explícito, sólo mediante diseño y release aprobados, para reemplazar los filtros literales que hoy mantienen fuera de la cola real ocho respuestas de ensayo confirmadas por Pedro (D-031); conservar mientras tanto los registros y el comportamiento productivo;
- decidir el tratamiento del estado legado `por_validar`;
- habilitar la protección de contraseñas filtradas mediante un gate de Auth;
- completar la evidencia autenticada que corresponda a la base RBAC observada en QE2026 y tratar cualquier evolución de permisos mediante un gate nuevo;
- implementar por unidades aprobadas la auditoría, eliminación lógica y recuperación ya definidas en D-027;
- implementar mediante un gate propio el ciclo de enlaces y respuestas definido en D-027;
- completar definiciones/fuentes pendientes de métricas y decidir operador; conservar D-032 sin metas hasta baseline y sin instrumentación implícita;
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

Las afirmaciones históricas de cada fase se conservan en `AUDIT.md` y `DECISIONS.md`. La equivalencia de la Fase 7 corresponde a su corte de 2026-07-20; no debe extrapolarse al esquema productivo posterior de campaña y RBAC. D-030 rige la estrategia actual de historia y baseline.

## Fase activa

### Fase 9 — Cierre funcional y operativo

Objetivo: convertir las decisiones funcionales y operativas pendientes en contratos aprobados, criterios verificables y entregas incrementales, manteniendo separados producto, frontend, backend, datos y operación.

#### Etapa 1 — Contrato comercial (cerrada)

Estado: cerrada documentalmente el 2026-07-21.

- workflow, estados, transiciones y tratamiento de `por_validar` aprobados;
- campos obligatorios definidos por entidad y operación;
- señales, precedencia y resolución humana para conversión y duplicados acordadas.

Gate: cumplido mediante la especificación aprobada, su registro en el PRD y `D-026`; los criterios `P9-WF`, `P9-FLD` y `P9-CONV` quedan aceptados sin mutaciones de datos.

Evidencia: PR #23 publicó la especificación y PR #24 reconcilió sus metadatos. La implementación futura conserva gates independientes.

#### Etapa 2 — Gobierno y recuperación (cerrada)

Estado: cerrada documentalmente el 2026-07-21.

- matriz de permisos `admin`/`member` aprobada;
- auditoría, eliminación lógica, restauración, retención y purga excepcional definidas;
- enlace único por ciclo, reenvío controlado y ausencia de reapertura acordados.

Gate: cumplido mediante la especificación aprobada y `D-027`; los criterios `P9-RBAC`, `P9-AUD` y `P9-CU` quedan aceptados sin cambios de backend ni datos.

Evidencia: PR #26 publicó la especificación y el primer plan RBAC. La base RBAC se implementó y validó en un proyecto Supabase desechable el 2026-09-24; el historial posterior de QE2026 registra ese SQL bajo `20260925200537` y la comparación estructural observó sus políticas y contratos. No se repitió aquí una prueba autenticada en QE2026. Auditoría, recuperación, administración de membresías y nuevo ciclo público conservan planes y autorizaciones propios.

#### Etapa 3 — Evidencia operable

- P9-COV-01/02: matriz aceptada documentalmente el 2026-10-01 y reconciliada con releases #39–41 en esta entrega; mantener evidencia, vacíos y gates.
- P9-MET: D-032 aprueba el [catálogo mínimo](./superpowers/specs/2026-10-01-phase-9-metrics-design.md) y privacidad preventiva; operador, objetivos posteriores a baseline y fuentes diferidas siguen abiertos.
- El [PR #30](https://github.com/pedrogiraldo-1979/QE/pull/30) mantiene una propuesta anterior de siete métricas y cierre de etapa. No tomarla como vigente ni fusionarla sin reconciliación. No se cambia aquel PR desde esta rama.

Gate pendiente: resolver alcance restante de P9-MET y sus responsabilidades sin inventar metas; aceptación de documentos no autoriza telemetría, proveedores o cambios de datos. La etapa permanece abierta.

#### Etapa 4 — Mantenibilidad incremental

- `ContactCompletionBridge`: entrega publicada en PR #39, no pendiente de sustitución;
- `AddActivityEntryBridge` y demás unidades: pendientes de inventario/orden aceptado y aprobación independiente; no retirarlas como efecto de esta documentación;
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

La activación de esta fase no autoriza implementar todos los frentes como una unidad ni modifica Supabase o datos por efecto del roadmap. Pedro confirmó el 2026-09-26 que ya realizó el piloto de correo. La aprobación inicial de cinco destinatarios en 2026-07-21 es un antecedente histórico, no un límite permanente; esta actualización no identifica cuál lote se envió ni autoriza otros lotes o una automatización general.

## Backlog futuro y trabajo condicionado

Los puntos siguientes no forman parte automática de la Fase 9. Cada uno necesita alcance, aprobación y gate propios.

### Prioridad inmediata — preparación del uso diario

1. Confirmar identidad, acceso y rol de la operadora; recomendar menor privilegio suficiente, sin provisionar desde el roadmap.
2. Completar búsqueda/filtros/detalle, alta/edición de prospectos/contactos, alta de actividades, errores y teclado/móvil; mutaciones de prueba sólo aisladas.
3. Si revisará respuestas, validar el recorrido y token vencido en entorno controlado; verificar hojas antes de marcar conciliación.
4. Preparar guía breve y primera sesión acompañada. No repetir como pendiente técnico el ajuste de completar/reprogramar ya publicado.
5. Reconciliar propuestas documentales abiertas por separado: PR #30 no cierra métricas; PR #38 no demuestra por sí solo respaldo recuperable ni dry-run exclusivo de SQL nuevo.

Auditoría avanzada, eliminación/restauración, instrumentación y retirada de otros bridges pueden posponerse explícitamente; no se presentan como implementados ni como prerrequisito automático de tareas comerciales que no los usan.

### Calidad y automatización posterior

- decidir si se versiona automatización de navegador y aprobar su dependencia;
- ampliar la automatización de creación, edición y actividades después de aprobar la matriz de cobertura;
- mantener la suite mutante fuera del CI normal mientras requiera un proyecto desechable.

Gate: cobertura reproducible sin secretos ni datos reales.

### Gates independientes de backend y datos

- actualizar la matriz local/remoto ya documentada antes de cada release y validar un SQL nuevo con respaldo, recuperación, ensayo aislado y dry-run que liste únicamente esa nueva versión; conservar intacto el historial de QE2026 conforme a D-030;
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
- nuevos lotes o automatización masiva de email o WhatsApp sin gate propio;
- telemetría o servicios externos sin política y aprobación;
- rediseño visual integral;
- multi-organización, ownership por fila o permisos no definidos por producto;
- retirada masiva de bridges o CSS sin equivalencia comprobada;
- merge automático de PR o publicación directa sobre `main`.
