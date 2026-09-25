# Diseño funcional — Fase 9, Etapa 3: evidencia operable y métricas

## Estado del documento

- Fecha: 2026-09-24.
- Estado: propuesta funcional alineada con el alcance aprobado; pendiente de revisión del documento y de su plan de implementación.
- Baseline: `main` en `14c77ca` después de fusionar el PR #29 de la base RBAC.
- Criterios de Fase 9 cubiertos: `P9-COV-01..02` y `P9-MET-01..03`.
- Tipo de entrega: especificación documental. No autoriza instrumentación, proveedores, cambios de código, migraciones, RLS, Auth, RPC, Edge Functions, secretos ni datos.

## 1. Objetivo

Convertir la evidencia de calidad existente en un registro único, verificable y mantenible; y fijar un catálogo inicial de métricas comerciales y operativas antes de recoger, exponer o enviar telemetría.

## 2. Alcance

La entrega documental debe producir dos artefactos vivos:

1. Una matriz de cobertura que relacione cada criterio `P9-*` con su estado, evidencia existente, vacío conocido, responsable y gate de cierre.
2. Un catálogo de métricas con definición exacta, fuente futura, granularidad, zona horaria, frecuencia, objetivo, responsable, acción operativa, privacidad y retención.

También debe reconciliar el PRD, roadmap, decisiones y auditoría para que la Etapa 3 figure como contrato aprobado, no como funcionalidad ya instrumentada.

## 3. Fuera de alcance

- añadir eventos, logs de negocio, analítica, dashboards, exportaciones o alertas;
- introducir proveedores, SDK, dependencias, secretos o variables de entorno;
- consultar, modificar o copiar datos de producción;
- modificar tablas, políticas, RPC, Auth, Edge Functions o migraciones;
- alterar criterios funcionales de las Etapas 1 y 2;
- declarar cubierto un criterio que sólo tenga diseño documental o una prueba no equivalente.

## 4. Enfoque aprobado

Se adopta una fuente única por tipo de información:

| Información | Fuente viva | Regla |
| --- | --- | --- |
| Cobertura de criterios y vacíos | `docs/PHASE-9-COVERAGE.md` | Una fila por criterio `P9-*`; la evidencia debe ser localizable y no contener datos sensibles. |
| Definición de métricas | `docs/PHASE-9-METRICS.md` | Una ficha por métrica; una definición no habilita su instrumentación. |
| Alcance y criterios de producto | `docs/PRD-CRM.md` | Resume el contrato y enlaza a los dos registros operables. |
| Secuencia, gates y estado | `docs/ROADMAP.md` | Declara la Etapa 3 cerrada documentalmente sólo después de que los registros estén revisados. |
| Decisión aprobada | `docs/DECISIONS.md` | Registra la decisión de aceptar el contrato documental. |
| Evidencia cronológica | `docs/AUDIT.md` | Registra alcance, baseline, límites y ausencia de cambios de sistema. |

La alternativa de dispersar esta información dentro de cada prueba se rechaza porque no permite ver vacíos de criterio. La alternativa de instrumentar primero y documentar después se rechaza porque expone datos y dependencias antes de tener una definición aprobada.

## 5. Matriz de cobertura

Cada fila debe contener estos campos obligatorios:

- `criterio`: identificador exacto `P9-*`;
- `estado`: `documentado`, `cubierto_parcialmente`, `cubierto` o `bloqueado_por_gate`;
- `evidencia actual`: rutas de documento, prueba, comando o evidencia manual verificable;
- `vacío o límite`: qué no prueba la evidencia y por qué importa;
- `responsable`: `Producto`, `Ingeniería`, `Operación` o una combinación explícita;
- `gate de cierre`: condición objetiva que permitiría cambiar el estado;
- `clasificación de prueba futura`: unitaria, contrato, integración aislada, smoke, visual/manual o no aplicable.

La matriz debe cubrir los 25 criterios definidos en el PRD. Debe distinguir:

- contrato aprobado de comportamiento implementado;
- prueba local de validación remota o visual;
- evidencia aislada de evidencia sobre producción;
- un vacío legítimo de una afirmación no sustentada.

## 6. Catálogo inicial de métricas

Cada ficha de métrica debe contener:

- identificador estable y nombre legible;
- propósito de decisión;
- fórmula exacta, incluyendo numerador, denominador y exclusiones;
- fuente de datos propuesta, sin asumir que exista o esté autorizada;
- unidad, granularidad y zona horaria (`America/Bogota`);
- frecuencia de cálculo y responsable;
- objetivo o umbral inicial y la acción esperada si se incumple;
- acceso permitido, nivel de agregación, datos que no se deben registrar y retención;
- estado de instrumentación, inicialmente `no_instrumentada`;
- gate necesario antes de añadir captura, almacenamiento, dashboard, alerta o proveedor.

El catálogo inicial debe definir, sin calcularlas aún, estas métricas:

| ID | Métrica | Propósito |
| --- | --- | --- |
| `MET-01` | Empresas con contacto utilizable | Identificar cobertura mínima para gestión comercial. |
| `MET-02` | Prospectos con calidad apta | Priorizar revisión y enriquecimiento. |
| `MET-03` | Actividades vencidas | Gestionar compromisos comerciales abiertos. |
| `MET-04` | Primera gestión oportuna | Detectar retrasos de seguimiento inicial. |
| `MET-05` | Conversión de prospectos | Evaluar avance sin confundirlo con creación de registros. |
| `MET-06` | Formularios válidos recibidos | Vigilar el ciclo de actualización sin exponer enlaces o respuestas. |
| `MET-07` | Errores críticos por flujo | Priorizar correcciones sin registrar payloads ni identidades. |

Los objetivos iniciales son hipótesis operativas, no compromisos de desempeño. Se revisan trimestralmente por Producto y Operación antes de usarse para evaluar personas o automatizar acciones.

## 7. Privacidad y retención

Las métricas usan sólo conteos agregados. No deben incluir emails, teléfonos, nombres, UUID de usuarios, tokens, payloads de formulario, contenido de notas ni valores de campos comerciales.

El catálogo debe definir retención propuesta de 13 meses para agregados mensuales y 90 días para agregados diarios, sujeta a aprobación antes de almacenar cualquier dato. El acceso futuro queda limitado a `admin` y a responsables operativos autorizados; `member` sólo podrá ver resúmenes si una entrega posterior lo aprueba.

## 8. Manejo de vacíos y gates

Un vacío no se resuelve cambiando de nombre a su estado. Cada vacío debe indicar un único siguiente gate:

| Tipo de vacío | Gate de cierre |
| --- | --- |
| Regla de producto aprobada pero no implementada | Diseño técnico y entrega aislada aprobados. |
| Backend o RLS pendiente | Autorización explícita, plan reversible, proyecto desechable y validación aislada. |
| Flujo visual pendiente | Preview, escenarios manuales definidos y revisión en escritorio y móvil. |
| Métrica sin fuente autorizada | Decisión de producto, revisión de privacidad y autorización de instrumentación. |
| Evidencia local sin release | CI, preview, rollback y PR fusionado. |

## 9. Verificación documental

La entrega se considera coherente cuando:

1. los 25 criterios `P9-*` aparecen una sola vez en la matriz;
2. cada fila tiene estado, evidencia, límite, responsable y gate;
3. las siete métricas contienen todos los campos de la sección 6;
4. ninguna fuente promete instrumentación, acceso a datos o cambios de backend;
5. PRD, roadmap, decisión y auditoría concuerdan con el estado documental;
6. un chequeo de Markdown y enlaces internos no detecta rutas inexistentes.

## 10. Reversión

Al ser una entrega documental, su reversión consiste en revertir el commit o el PR. No hay migración, dato, proveedor, secreto ni estado remoto que recuperar.
