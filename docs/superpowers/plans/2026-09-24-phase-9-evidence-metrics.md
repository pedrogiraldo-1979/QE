# Phase 9 Evidence and Metrics Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publish an auditable Phase 9 coverage matrix and a privacy-safe metrics catalog, then reconcile the CRM's canonical documentation without instrumenting anything.

**Architecture:** Add two focused, living Markdown records: one maps all 25 `P9-*` criteria to current evidence and closure gates; the other defines seven future metrics at aggregate level only. The PRD remains the product source of truth, while the roadmap, decisions, and audit record the approved contract and its limits.

**Tech Stack:** Markdown, Git, Node test runner, pnpm 11.7.0, TypeScript 5.7, Next.js 16.

## Global Constraints

- Work only on `codex/phase-9-evidence-metrics`, based on `main` commit `14c77ca` or its current fast-forward successor.
- Do not modify application code, dependencies, configuration, Supabase schema, RLS, Auth, RPC, Edge Functions, secrets, environment variables, data, or generated artifacts.
- Do not execute authenticated or mutating Supabase checks.
- Do not collect, calculate, log, export, or publish metrics; every metric remains `no_instrumentada`.
- Do not include emails, phones, names, user UUIDs, tokens, payloads, notes, customer data, or provider credentials in any document.
- Preserve historical documents and existing audit entries; add dated entries instead of rewriting history.
- Preserve unrelated local files such as `.pnpm-store/` and never stage them.
- Treat the RBAC foundation as release-pending until the migration has an independently authorized shared-environment release; do not call it active in production.

---

### Task 1: Create the Phase 9 coverage matrix

**Files:**
- Create: `docs/PHASE-9-COVERAGE.md`
- Reference: `docs/PRD-CRM.md:171-282`
- Reference: `docs/ROADMAP.md:56-113`
- Reference: `docs/AUDIT.md:1-28`
- Reference: `docs/superpowers/specs/2026-09-24-phase-9-evidence-metrics-design.md`

**Interfaces:**
- Consumes: the exact 25 criteria in the PRD and their currently published documents, tests and release evidence.
- Produces: one row per `P9-*` identifier with `estado`, `evidencia actual`, `vacío o límite`, `responsable`, `gate de cierre`, and `prueba futura`.

- [ ] **Step 1: Create the matrix with its status vocabulary**

Create `docs/PHASE-9-COVERAGE.md` with a scope statement that it is a living evidence register and cannot authorize implementation. Define the only valid states as follows:

```markdown
| Estado | Significado |
| --- | --- |
| `documentado` | La regla o definición está aprobada y su evidencia es un documento vigente; no implica que esté implementada. |
| `cubierto_parcialmente` | Existe evidencia técnica o manual, pero queda una limitación explícita antes de cerrar el criterio. |
| `cubierto` | La evidencia indicada satisface por completo el criterio dentro de su alcance declarado. |
| `bloqueado_por_gate` | El siguiente paso requiere una autorización, una decisión o un entorno que todavía no existe. |
```

- [ ] **Step 2: Add the 25 criterion rows without overstating coverage**

Use these exact mappings as the initial matrix. Keep each row one line in Markdown; paths may be shortened only when they remain unambiguous.

| Criterio | Estado | Evidencia actual | Vacío o límite | Responsable | Gate de cierre | Prueba futura |
| --- | --- | --- | --- | --- | --- | --- |
| `P9-WF-01` | `documentado` | `docs/superpowers/specs/2026-07-21-phase-9-commercial-contract-design.md` | Catálogo no está aplicado a todos los flujos. | Producto + Ingeniería | Plan técnico por flujo aprobado. | Contrato + integración aislada. |
| `P9-WF-02` | `documentado` | Especificación comercial, secciones de transiciones. | No todas las transiciones tienen ejecución backend. | Producto + Ingeniería | Entrega aislada por transición. | Contrato + integración aislada. |
| `P9-WF-03` | `documentado` | D-026 y especificación comercial. | `por_validar` sigue compatible en lectura. | Producto + Ingeniería | Decisión de migración o retiro con reversión. | Contrato + integración aislada. |
| `P9-FLD-01` | `documentado` | Especificación comercial, matriz de campos. | Formularios y datos existentes no se alteraron. | Producto + Ingeniería | Entrega de validación por entidad. | Unitaria + visual/manual. |
| `P9-FLD-02` | `documentado` | Especificación comercial, reglas de validación. | Mensajes no están comprobados en todos los formularios. | Producto + Ingeniería | Entrega por formulario. | Unitaria + visual/manual. |
| `P9-CONV-01` | `documentado` | D-026 y especificación comercial. | Señales aprobadas no sustituyen la RPC actual. | Producto + Ingeniería | Diseño técnico de conversión autorizado. | Contrato + integración aislada. |
| `P9-CONV-02` | `documentado` | Especificación comercial, tabla de resultados. | Revisión humana no tiene flujo nuevo. | Producto + Operación | Entrega aislada de conflictos. | Integración aislada + manual. |
| `P9-CONV-03` | `cubierto_parcialmente` | `tests/supabase.integration.mjs` y evidencia Fase 6/9. | Idempotencia existe para el contrato actual, no para todas las señales nuevas. | Ingeniería | Plan de conversión autorizado. | Integración aislada. |
| `P9-RBAC-01` | `cubierto_parcialmente` | D-027, `authorizationModel.test.mjs`, validación aislada Fase 9. | La migración no está publicada en el entorno compartido. | Ingeniería + Operación | Release RBAC autorizado con rollback. | Integración aislada + smoke autenticado. |
| `P9-RBAC-02` | `cubierto_parcialmente` | D-027, `authorizationModel.test.mjs`, `dataContracts.test.mjs`. | Sólo la base RBAC está implementada; membresías y recuperación no. | Producto + Ingeniería | Planes separados aprobados. | Contrato + integración aislada. |
| `P9-RBAC-03` | `bloqueado_por_gate` | `PHASE-9-RBAC-ROLLBACK.md` y auditoría Fase 9. | Falta autorización de release compartido. | Operación + Ingeniería | Historial baseline, autorización y reversión aprobada. | Integración aislada + release smoke. |
| `P9-AUD-01` | `documentado` | D-027 y especificación de gobierno. | No hay modelo ni historial implementado. | Producto + Ingeniería | Plan de auditoría autorizado. | Contrato + integración aislada. |
| `P9-AUD-02` | `documentado` | D-027 y especificación de gobierno. | No hay eliminación lógica implementada. | Producto + Ingeniería | Plan de recuperación autorizado. | Integración aislada + visual/manual. |
| `P9-AUD-03` | `documentado` | D-027 y especificación de gobierno. | No existe restauración ni procedimiento de purga aprobado. | Operación + Ingeniería | Plan de recuperación y purga excepcional. | Integración aislada + manual. |
| `P9-CU-01` | `documentado` | D-027 y especificación de gobierno. | El ciclo único no está implementado. | Producto + Ingeniería | Plan de enlaces y respuestas autorizado. | Contrato + integración aislada. |
| `P9-CU-02` | `documentado` | D-027 y especificación de gobierno. | El historial actual no representa el ciclo nuevo. | Producto + Ingeniería | Plan de enlaces y respuestas autorizado. | Contrato + integración aislada. |
| `P9-CU-03` | `documentado` | D-027 y especificación de gobierno. | Estados actuales no se migran por esta decisión. | Producto + Ingeniería | Plan reversible autorizado. | Integración aislada. |
| `P9-COV-01` | `cubierto` | Esta matriz, PRD y checklist de release. | Debe mantenerse al abrir cada entrega futura. | Ingeniería + Operación | Revisión en cada PR de Fase 9. | Contrato documental. |
| `P9-COV-02` | `cubierto` | Esta matriz, con vacío, responsable y gate por fila. | Los nuevos criterios deben añadir su propia fila. | Producto + Ingeniería + Operación | Revisión en cada PR de Fase 9. | Contrato documental. |
| `P9-MET-01` | `cubierto` | `docs/PHASE-9-METRICS.md`. | Definición no implica fuente habilitada. | Producto + Operación | Revisión trimestral de definiciones. | Contrato documental. |
| `P9-MET-02` | `cubierto` | `docs/PHASE-9-METRICS.md`. | Objetivos iniciales son hipótesis, no baseline. | Producto + Operación | Baseline agregada autorizada. | Revisión operativa. |
| `P9-MET-03` | `cubierto` | `docs/PHASE-9-METRICS.md`, privacidad y retención. | No hay instrumentación ni proveedor aprobados. | Producto + Operación + Ingeniería | Revisión de privacidad e instrumentación. | Revisión de diseño. |
| `P9-TECH-01` | `cubierto_parcialmente` | `AUDIT.md` y roadmap Etapa 4. | Falta inventario priorizado en un registro único. | Ingeniería | Entrega de mantenibilidad aprobada. | Contrato + visual/manual. |
| `P9-TECH-02` | `bloqueado_por_gate` | Checklist de release y evidencia Fase 8. | Ningún bridge nuevo ha sido retirado bajo el contrato P9. | Ingeniería | Plan por bridge aprobado. | Unitaria + build + smoke + visual. |
| `P9-TECH-03` | `cubierto_parcialmente` | `AGENTS.md`, roadmap y Fase 4. | Requiere revisión por cada intervención futura. | Ingeniería | Revisión de alcance por PR. | Revisión de diff. |

- [ ] **Step 3: Add maintenance and verification rules**

Append these rules:

```markdown
## Mantenimiento

- Actualizar una fila en el mismo PR que cambie su evidencia o su gate.
- No cambiar `bloqueado_por_gate` a otro estado sin enlazar la autorización y la evidencia exigidas.
- Conservar los límites aunque una prueba nueva pase; una prueba no cubre una superficie distinta de la que ejecuta.
- Registrar una contradicción documental en `docs/AUDIT.md` antes de elegir una versión como canónica.
```

- [ ] **Step 4: Verify the matrix is complete and well-formed**

Run:

```powershell
$matrix = Get-Content docs\PHASE-9-COVERAGE.md -Raw
@('P9-WF-01','P9-WF-02','P9-WF-03','P9-FLD-01','P9-FLD-02','P9-CONV-01','P9-CONV-02','P9-CONV-03','P9-RBAC-01','P9-RBAC-02','P9-RBAC-03','P9-AUD-01','P9-AUD-02','P9-AUD-03','P9-CU-01','P9-CU-02','P9-CU-03','P9-COV-01','P9-COV-02','P9-MET-01','P9-MET-02','P9-MET-03','P9-TECH-01','P9-TECH-02','P9-TECH-03') | ForEach-Object { if (($matrix | Select-String -SimpleMatch $_).Count -ne 1) { throw "Criterio inválido: $_" } }
```

Expected: command exits `0` without output.

- [ ] **Step 5: Commit the coverage matrix**

```powershell
git add docs/PHASE-9-COVERAGE.md
git commit -m "docs: add phase 9 coverage matrix"
```

### Task 2: Create the privacy-safe metrics catalog

**Files:**
- Create: `docs/PHASE-9-METRICS.md`
- Reference: `docs/superpowers/specs/2026-09-24-phase-9-evidence-metrics-design.md:63-91`
- Reference: `docs/PRD-CRM.md:185-186`

**Interfaces:**
- Consumes: the seven metric identifiers and privacy constraints from the approved design.
- Produces: seven self-contained metric definitions with identical fields and state `no_instrumentada`.

- [ ] **Step 1: Create the catalog header and common guardrails**

State that all dates use `America/Bogota`, all calculations are future aggregate calculations, and no metric is instrumented. Add this shared privacy rule:

```markdown
No ficha puede registrar o mostrar emails, teléfonos, nombres, UUID de usuarios, tokens, payloads, notas, valores de campos ni identificadores de clientes. Cualquier captura, almacenamiento, dashboard, alerta o proveedor requiere una entrega y autorización independientes.
```

- [ ] **Step 2: Add the seven metric definitions**

Use this exact structure for each `MET-01` through `MET-07`:

```markdown
## MET-01 — Empresas con contacto utilizable

- Estado: `no_instrumentada`.
- Decisión: priorizar enriquecimiento comercial.
- Fórmula: `empresas activas con al menos un contacto activo que tenga email válido o teléfono no vacío / empresas activas`.
- Exclusiones: empresas eliminadas, contactos eliminados y registros de prueba.
- Fuente propuesta: `companies` y `contacts`; requiere validación de esquema y autorización antes de consulta operativa.
- Unidad y granularidad: porcentaje diario y mensual por CRM completo; zona horaria `America/Bogota`.
- Frecuencia y responsable: revisión semanal por Operación.
- Objetivo inicial: establecer baseline durante el primer trimestre autorizado; sin umbral hasta entonces.
- Acción: si baja frente a la baseline aprobada, abrir revisión de calidad, no automatizar cambios.
- Acceso y retención: agregado visible sólo a `admin` y responsables autorizados; diario 90 días, mensual 13 meses si se aprueba almacenamiento.
- Gate: decisión de fuente, revisión de privacidad, diseño de captura agregada y autorización de instrumentación.
```

Define las demás con estas fórmulas y acciones:

| ID | Fórmula | Acción si se desvía |
| --- | --- | --- |
| `MET-02` | `prospectos activos con estado compatible con gestión y campos mínimos definidos / prospectos activos` | Revisar cola de calidad; no reclasificar automáticamente. |
| `MET-03` | `actividades abiertas con fecha anterior al inicio del día local` | Revisar priorización de seguimiento. |
| `MET-04` | `prospectos nuevos con primera actividad dentro del SLA aprobado / prospectos nuevos elegibles` | Revisar capacidad y asignación; el SLA requiere decisión de Producto. |
| `MET-05` | `prospectos convertidos en el período / prospectos elegibles al inicio del período más creados elegibles` | Revisar calidad de la entrada y bloqueos de conversión; no incentivar conversiones forzadas. |
| `MET-06` | `respuestas públicas válidas recibidas en el período / enlaces activos elegibles en el período` | Revisar claridad de comunicación y vencimientos sin exponer tokens. |
| `MET-07` | `errores críticos saneados por flujo / ejecuciones agregadas del flujo` | Abrir incidente o priorizar corrección; nunca registrar payloads, credenciales o identidades. |

For each remaining metric, repeat the ten bullet fields from `MET-01`, set `Estado` to `no_instrumentada`, and state its proposed tables or aggregate error source as unverified future sources.

- [ ] **Step 3: Add target and interpretation guardrails**

Append:

```markdown
## Interpretación

- Los objetivos sólo se fijan después de una baseline agregada aprobada; antes de eso son `sin_objetivo`.
- Ninguna métrica se usa para evaluar personas, comisiones o decisiones automáticas.
- Un cambio en una métrica exige inspección de calidad, período, cobertura y definición antes de atribuir una causa.
- Producto y Operación revisan trimestralmente definiciones, objetivos y retención; Ingeniería revisa cualquier propuesta de captura.
```

- [ ] **Step 4: Verify the catalog is complete and excludes sensitive fields**

Run:

```powershell
$catalog = Get-Content docs\PHASE-9-METRICS.md -Raw
1..7 | ForEach-Object { if (($catalog | Select-String -SimpleMatch ("MET-0" + $_)).Count -ne 1) { throw "Métrica inválida: MET-0$_" } }
if ($catalog -match 'service_role|NEXT_PUBLIC_|ZEPTOMAIL|sb_publishable_[A-Za-z0-9_-]+') { throw 'El catálogo contiene una referencia sensible.' }
```

Expected: command exits `0` without output.

- [ ] **Step 5: Commit the metrics catalog**

```powershell
git add docs/PHASE-9-METRICS.md
git commit -m "docs: define phase 9 metrics catalog"
```

### Task 3: Reconcile the canonical documentation

**Files:**
- Modify: `docs/PRD-CRM.md`
- Modify: `docs/ROADMAP.md`
- Modify: `docs/DECISIONS.md`
- Modify: `docs/AUDIT.md`
- Reference: `docs/PHASE-9-COVERAGE.md`
- Reference: `docs/PHASE-9-METRICS.md`

**Interfaces:**
- Consumes: the completed coverage matrix and metrics catalog.
- Produces: a single, consistent statement that Etapa 3 is closed only as a documented contract; implementation and data collection remain separately gated.

- [ ] **Step 1: Update the PRD without changing published behavior**

After the Etapa 2 section in `docs/PRD-CRM.md`, add an Etapa 3 section that links `PHASE-9-COVERAGE.md` and `PHASE-9-METRICS.md`, states `P9-COV-01..02` and `P9-MET-01..03` are fulfilled as documentation, and repeats that neither record authorizes telemetry, data reads, providers, storage or code changes. Remove only the two now-resolved bullets from “Decisiones pendientes”; retain the bridge order and pagination decisions.

- [ ] **Step 2: Update the roadmap state and gate**

Change `docs/ROADMAP.md` Etapa 3 from active to “cerrada documentalmente” with the current date. Link the two records and D-029. Preserve a clearly labelled follow-up: any instrumentation, dashboards, retention storage, alerting or provider requires a new plan, privacy review and approval. Do not mark Etapa 4 closed.

- [ ] **Step 3: Record D-029**

Add `D-029 — Aprobar evidencia operable y catálogo de métricas` to `docs/DECISIONS.md` with:

```markdown
- Estado: Aceptada
- Responsable: Pedro
- Decisión: adoptar la matriz de cobertura P9 y el catálogo de siete métricas agregadas, no instrumentadas.
- Restricción: no autoriza captura, almacenamiento, consultas operativas, dashboards, alertas, proveedores, variables de entorno, cambios de código ni Supabase.
- Consecuencia: los vacíos y gates quedan visibles por criterio; toda instrumentación requiere una decisión y entrega posteriores.
```

Include links to both records and the design specification as evidence.

- [ ] **Step 4: Add a dated audit entry**

Prepend a new `## 28.` entry to `docs/AUDIT.md`. Record the branch baseline, documents changed, exact scope, no-system-change limit, and that the RBAC release remains independent. Do not alter entries 1–27.

- [ ] **Step 5: Verify document coherence**

Run:

```powershell
$files = @('docs/PRD-CRM.md','docs/ROADMAP.md','docs/DECISIONS.md','docs/AUDIT.md','docs/PHASE-9-COVERAGE.md','docs/PHASE-9-METRICS.md')
$files | ForEach-Object { if (-not (Test-Path $_)) { throw "Falta $_" } }
$joined = Get-Content $files -Raw
if ($joined -match 'telemetría.*implementada|métricas.*instrumentadas') { throw 'La documentación afirma instrumentación fuera de alcance.' }
git diff --check
```

Expected: command exits `0` without output.

- [ ] **Step 6: Run proportional repository verification**

Run:

```powershell
pnpm typecheck
pnpm test
```

Expected: both commands exit `0`. The documentation-only change does not require a build unless a changed verification command, configuration or application file makes it relevant.

- [ ] **Step 7: Review the staged scope and commit**

```powershell
git status --short
git diff --check
git diff -- docs/PRD-CRM.md docs/ROADMAP.md docs/DECISIONS.md docs/AUDIT.md docs/PHASE-9-COVERAGE.md docs/PHASE-9-METRICS.md
git add docs/PRD-CRM.md docs/ROADMAP.md docs/DECISIONS.md docs/AUDIT.md docs/PHASE-9-COVERAGE.md docs/PHASE-9-METRICS.md
git commit -m "docs: close phase 9 evidence contract"
```

Expected: only the six listed documentation files are staged; `.pnpm-store/` remains untracked and unstaged.

## Plan Self-Review

- Spec coverage: Task 1 delivers the complete criterion matrix and explicit gates; Task 2 delivers all seven metric definitions and privacy restrictions; Task 3 reconciles the canonical documentation and verifies the no-instrumentation boundary.
- No placeholders: all file paths, initial statuses, metric identifiers, formulas, commands and commit boundaries are explicit.
- Consistency: `P9-COV` and `P9-MET` become documentary coverage; RBAC remains release-pending; the plan creates no source, query, event, metric result or remote state.
