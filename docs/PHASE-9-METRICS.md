# Catálogo de métricas — Fase 9

## Estado y guardrails

Este catálogo define métricas futuras para apoyar decisiones operativas. Todas están `no_instrumentada`: no se calculan, consultan, almacenan, muestran ni envían como parte de esta entrega. Todas las fechas futuras usan `America/Bogota`.

No ficha puede registrar o mostrar emails, teléfonos, nombres, UUID de usuarios, tokens, payloads, notas, valores de campos ni identificadores de clientes. Cualquier captura, almacenamiento, dashboard, alerta o proveedor requiere una entrega y autorización independientes.

Las fuentes nombradas son hipótesis de diseño que deben validarse contra el contrato y esquema autorizados antes de cualquier uso. Los registros eliminados y fixtures de prueba se excluyen cuando el modelo futuro de la fuente los distinga.

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

## MET-02 — Prospectos con calidad apta

- Estado: `no_instrumentada`.
- Decisión: priorizar revisión y enriquecimiento de prospectos.
- Fórmula: `prospectos activos con estado compatible con gestión y campos mínimos definidos / prospectos activos`.
- Exclusiones: prospectos eliminados, excluidos por política comercial y fixtures de prueba.
- Fuente propuesta: `prospects`, `prospect_contacts` y contrato de campos de la Etapa 1; requiere validar reglas y esquema antes de consulta operativa.
- Unidad y granularidad: porcentaje semanal y mensual por CRM completo; zona horaria `America/Bogota`.
- Frecuencia y responsable: revisión semanal por Operación.
- Objetivo inicial: establecer baseline durante el primer trimestre autorizado; sin umbral hasta entonces.
- Acción: revisar cola de calidad; no reclasificar automáticamente.
- Acceso y retención: agregado visible sólo a `admin` y responsables autorizados; semanal 90 días, mensual 13 meses si se aprueba almacenamiento.
- Gate: validación del estado compatible con gestión, revisión de privacidad y autorización de instrumentación.

## MET-03 — Actividades vencidas

- Estado: `no_instrumentada`.
- Decisión: gestionar compromisos comerciales abiertos.
- Fórmula: `actividades abiertas con fecha anterior al inicio del día local`.
- Exclusiones: actividades completadas, eliminadas y fixtures de prueba.
- Fuente propuesta: `activities` y `prospect_activities`; requiere validar semántica de estado y fecha antes de consulta operativa.
- Unidad y granularidad: conteo diario por CRM completo; zona horaria `America/Bogota`.
- Frecuencia y responsable: revisión diaria por Operación.
- Objetivo inicial: establecer baseline durante el primer trimestre autorizado; sin umbral hasta entonces.
- Acción: revisar priorización de seguimiento, sin cerrar ni reprogramar automáticamente.
- Acceso y retención: agregado visible sólo a `admin` y responsables autorizados; diario 90 días, mensual 13 meses si se aprueba almacenamiento.
- Gate: validación de semántica de actividad, revisión de privacidad y autorización de instrumentación.

## MET-04 — Primera gestión oportuna

- Estado: `no_instrumentada`.
- Decisión: detectar retrasos de seguimiento inicial.
- Fórmula: `prospectos nuevos con primera actividad dentro del SLA aprobado / prospectos nuevos elegibles`.
- Exclusiones: prospectos importados sin fecha comparable, eliminados, excluidos y fixtures de prueba.
- Fuente propuesta: `prospects`, `prospect_activities` y contrato de workflow; requiere definir SLA y validar campos temporales antes de consulta operativa.
- Unidad y granularidad: porcentaje semanal y mensual por CRM completo; zona horaria `America/Bogota`.
- Frecuencia y responsable: revisión semanal por Operación.
- Objetivo inicial: `sin_objetivo` hasta aprobar SLA y baseline.
- Acción: revisar capacidad y asignación; el SLA requiere decisión de Producto.
- Acceso y retención: agregado visible sólo a `admin` y responsables autorizados; semanal 90 días, mensual 13 meses si se aprueba almacenamiento.
- Gate: decisión de SLA, validación de fuente, revisión de privacidad y autorización de instrumentación.

## MET-05 — Conversión de prospectos

- Estado: `no_instrumentada`.
- Decisión: evaluar avance comercial sin confundirlo con creación de registros.
- Fórmula: `prospectos convertidos en el período / prospectos elegibles al inicio del período más creados elegibles`.
- Exclusiones: conversiones revertidas por una futura política aprobada, prospectos eliminados, no elegibles y fixtures de prueba.
- Fuente propuesta: `prospects`, empresa enlazada y contrato de conversión; requiere validar estados, período y tratamiento de reversión antes de consulta operativa.
- Unidad y granularidad: porcentaje mensual por CRM completo; zona horaria `America/Bogota`.
- Frecuencia y responsable: revisión mensual por Producto y Operación.
- Objetivo inicial: establecer baseline durante el primer trimestre autorizado; sin umbral hasta entonces.
- Acción: revisar calidad de entrada y bloqueos de conversión; no incentivar conversiones forzadas.
- Acceso y retención: agregado visible sólo a `admin` y responsables autorizados; mensual 13 meses si se aprueba almacenamiento.
- Gate: validación de fuente y elegibilidad, revisión de privacidad y autorización de instrumentación.

## MET-06 — Formularios válidos recibidos

- Estado: `no_instrumentada`.
- Decisión: vigilar el ciclo de actualización sin exponer enlaces o respuestas.
- Fórmula: `respuestas públicas válidas recibidas en el período / enlaces activos elegibles en el período`.
- Exclusiones: enlaces revocados, vencidos, sintéticos, duplicados según la política futura y fixtures de prueba.
- Fuente propuesta: `cu_links`, `cu_responses` y política de ciclo público; requiere validar la semántica de una respuesta por ciclo antes de consulta operativa.
- Unidad y granularidad: porcentaje mensual por CRM completo; zona horaria `America/Bogota`.
- Frecuencia y responsable: revisión mensual por Operación.
- Objetivo inicial: establecer baseline durante el primer trimestre autorizado; sin umbral hasta entonces.
- Acción: revisar claridad de comunicación y vencimientos sin exponer tokens.
- Acceso y retención: agregado visible sólo a `admin` y responsables autorizados; mensual 13 meses si se aprueba almacenamiento.
- Gate: plan de enlaces y respuestas aprobado, revisión de privacidad y autorización de instrumentación.

## MET-07 — Errores críticos por flujo

- Estado: `no_instrumentada`.
- Decisión: priorizar correcciones de flujos críticos.
- Fórmula: `errores críticos saneados por flujo / ejecuciones agregadas del flujo`.
- Exclusiones: errores de desarrollo local, fixtures de prueba, duplicados de una misma incidencia y eventos que contengan datos sensibles.
- Fuente propuesta: registro agregado de errores diseñado en una entrega futura; no existe fuente autorizada actualmente.
- Unidad y granularidad: tasa semanal por flujo crítico; zona horaria `America/Bogota`.
- Frecuencia y responsable: revisión semanal por Ingeniería y Operación.
- Objetivo inicial: `sin_objetivo` hasta definir clasificación de criticidad y baseline.
- Acción: abrir incidente o priorizar corrección; nunca registrar payloads, credenciales o identidades.
- Acceso y retención: agregado visible sólo a `admin` y responsables autorizados; semanal 90 días, mensual 13 meses si se aprueba almacenamiento.
- Gate: clasificación de criticidad, revisión de privacidad, diseño de agregación y autorización de instrumentación.

## Interpretación

- Los objetivos sólo se fijan después de una baseline agregada aprobada; antes de eso son `sin_objetivo`.
- Ninguna métrica se usa para evaluar personas, comisiones o decisiones automáticas.
- Un cambio en una métrica exige inspección de calidad, período, cobertura y definición antes de atribuir una causa.
- Producto y Operación revisan trimestralmente definiciones, objetivos y retención; Ingeniería revisa cualquier propuesta de captura.
