# Diseño funcional — Fase 9, Etapa 1: contrato comercial

## Estado del documento

- Fecha: 2026-07-21.
- Estado: diseño funcional aprobado, revisado e integrado en `main` mediante el PR #23.
- Baseline: `main` en `6f3dadf` al iniciar la integración; especificación publicada después mediante el PR #23 (`3a545f5`).
- Criterios de Fase 9 cubiertos: `P9-WF-01..03`, `P9-FLD-01..02` y `P9-CONV-01..03`.
- Tipo de entrega: especificación documental. No autoriza implementación, migraciones ni cambios de Supabase o datos.

## 1. Objetivo

Definir un contrato comercial único para prospectos, empresas, contactos y actividades. El contrato separa avance comercial, calidad de datos y clasificación; fija campos mínimos por operación; y determina cómo convertir prospectos sin crear duplicados ni sobrescribir información de forma implícita.

## 2. Alcance

Esta especificación define:

- estados canónicos y transiciones permitidas para prospectos, empresas y actividades;
- interpretación temporal del estado legado `por_validar`;
- campos obligatorios, recomendados y opcionales por entidad y operación;
- señales, precedencia y resultados para resolver duplicados durante una conversión;
- invariantes de idempotencia, conservación de datos y tratamiento de errores;
- evidencia requerida para aceptar una implementación futura.

## 3. Fuera de alcance

- implementar cambios de interfaz o comportamiento;
- cambiar esquema, tablas, constraints, RPC, RLS, Auth, Edge Functions o datos de Supabase;
- migrar los 220 prospectos heredados o retirar todavía la compatibilidad de lectura;
- definir diferencias de permisos entre `admin` y `member`, materia de la Etapa 2;
- implantar auditoría persistente, eliminación lógica o recuperación;
- limpiar en masa empresas, contactos o prospectos duplicados;
- incorporar ERP, telemetría, proveedores o dependencias nuevas.

## 4. Principios del modelo

1. Una etapa comercial expresa avance de venta; no expresa calidad del dato ni tipo de registro.
2. La calidad se deriva de campos observables y puede cambiar sin mover la etapa comercial.
3. La clasificación identifica condiciones como cliente existente o posible duplicado y no sustituye la etapa.
4. Ninguna coincidencia ambigua modifica datos sin una decisión humana explícita.
5. Una conversión es atómica e idempotente: termina completa o no produce cambios parciales.
6. Mientras no exista una matriz RBAC aprobada, “usuario autorizado” significa cualquier miembro activo de la allowlist del CRM.

## 5. Workflow canónico

### 5.1 Prospectos

#### Dimensiones

| Dimensión | Valores |
| --- | --- |
| Etapa comercial | `nuevo`, `por_gestionar`, `contactado`, `interesado`, `cotizacion_enviada`, `convertido`, `descartado` |
| Calidad | `completo`, `incompleto`, `requiere_revision` |
| Clasificación | `prospecto`, `cliente_existente`, `posible_duplicado` |

La calidad y la clasificación son conceptos del contrato. Esta especificación no determina si una implementación futura los persistirá o los derivará.

#### Transiciones

| Origen | Destino | Actor | Precondición | Resultado | Error esperado |
| --- | --- | --- | --- | --- | --- |
| `nuevo` | `por_gestionar` | Usuario autorizado | Prospecto identificable | Queda disponible para gestión comercial | Se conserva `nuevo` si falla el guardado |
| Cualquier etapa activa | Otra etapa activa | Usuario autorizado | Destino seleccionado; motivo si retrocede | Se registra el nuevo avance | No cambia la etapa ante conflicto o error |
| Cualquier etapa activa | `descartado` | Usuario autorizado | Motivo obligatorio | Sale del embudo activo | No se descarta sin motivo válido |
| `descartado` | `por_gestionar` | Usuario autorizado | Motivo de reactivación obligatorio | Regresa al embudo activo | Permanece descartado si falla la operación |
| Cualquier etapa activa | `convertido` | Usuario autorizado | Cumple el contrato de conversión de la sección 8 | Queda enlazado a una empresa | No se producen cambios parciales |

Son etapas activas `nuevo`, `por_gestionar`, `contactado`, `interesado` y `cotizacion_enviada`. `convertido` es terminal e irreversible desde el prospecto. Una corrección posterior se tramita sobre la empresa enlazada, no reabriendo el prospecto.

### 5.2 Empresas

| Estado | Significado |
| --- | --- |
| `pendiente_completar` | Cuenta creada o convertida que aún requiere completar o validar datos |
| `activa` | Cuenta habilitada para gestión habitual |
| `en_pausa` | Relación temporalmente suspendida, conservando historial |
| `inactiva` | Cuenta sin gestión comercial vigente |

Transiciones permitidas:

| Origen | Destino | Actor | Precondición | Resultado | Error esperado |
| --- | --- | --- | --- | --- | --- |
| `pendiente_completar` | `activa` | Usuario autorizado | Confirmar que la cuenta puede operarse | Queda habilitada para gestión habitual | Conserva `pendiente_completar` si falla la operación |
| `activa` | `en_pausa` | Usuario autorizado | Motivo de pausa obligatorio | Suspende temporalmente la gestión y conserva el historial | Conserva `activa` si falta el motivo o falla la operación |
| `en_pausa` | `activa` | Usuario autorizado | Motivo de reactivación obligatorio | Reanuda la gestión habitual | Conserva `en_pausa` si falta el motivo o falla la operación |
| `activa` o `en_pausa` | `inactiva` | Usuario autorizado | Motivo de inactivación obligatorio | Sale de la gestión comercial vigente y conserva el historial | Conserva el estado anterior si falta el motivo o falla la operación |
| `inactiva` | `activa` | Usuario autorizado | Motivo de reactivación obligatorio | Regresa a la gestión habitual | Conserva `inactiva` si falta el motivo o falla la operación |

La falta de NIT, dirección u otro recomendado afecta la calidad, pero no crea estados adicionales.

### 5.3 Actividades y notas

| Tipo de registro | Estados | Campos mínimos | Regla temporal |
| --- | --- | --- | --- |
| Acción de seguimiento | `pendiente`, `completada`, `cancelada` | Entidad, tipo, fecha prevista y descripción | `vencida` se deriva cuando sigue pendiente después de su fecha |
| Nota | No aplica workflow de tarea | Entidad y contenido | No requiere fecha prevista ni genera vencimiento |

Una acción pendiente puede completarse, cancelarse o reprogramarse. Reprogramar cambia la fecha y registra el evento, pero conserva `pendiente`. `completada` y `cancelada` son terminales; una necesidad posterior se registra como una actividad nueva.

| Origen | Destino | Actor | Precondición | Resultado | Error esperado |
| --- | --- | --- | --- | --- | --- |
| `pendiente` | `completada` | Usuario autorizado | La acción continúa pendiente | Cierra la acción como realizada | Conserva `pendiente` ante conflicto o error |
| `pendiente` | `cancelada` | Usuario autorizado | Motivo de cancelación obligatorio | Cierra la acción sin marcarla como realizada | Conserva `pendiente` si falta el motivo o falla la operación |
| `pendiente` | `pendiente` | Usuario autorizado | Nueva fecha válida y motivo de reprogramación | Actualiza la fecha prevista y registra la reprogramación | Conserva la fecha anterior ante conflicto o error |

Las notas no tienen transiciones de estado. Su edición o corrección futura deberá conservar la trazabilidad definida en la sección 10.

## 6. Compatibilidad de `por_validar`

Durante la transición, todo prospecto leído con estado legado `por_validar` se interpreta como:

- etapa comercial: `nuevo`;
- calidad: `requiere_revision`;
- clasificación: la que resulte de las reglas vigentes, sin asumir que es duplicado.

La normalización de lectura permanece hasta que un gate posterior:

1. inventaríe los valores heredados;
2. apruebe una migración reversible;
3. verifique conteos y equivalencia en un proyecto aislado;
4. confirme que no quedan valores legados antes de retirar la compatibilidad.

## 7. Matriz de campos

### 7.1 Prospecto

| Operación | Obligatorios | Recomendados | Opcionales |
| --- | --- | --- | --- |
| Crear | Nombre comercial; al menos uno entre lista y origen | Ciudad, segmento, prioridad, contacto inicial | NIT, razón social, web, teléfono, dirección, notas |
| Editar | Nombre comercial; conservar al menos uno entre lista y origen | Completar campos señalados por calidad | Cualquier campo no obligatorio |
| Convertir | Nombre comercial; contacto utilizable; duplicados resueltos; confirmación explícita | NIT, dirección, segmento | Notas adicionales |

“Contacto utilizable” significa un contacto con nombre completo y al menos un email válido o teléfono válido.

### 7.2 Empresa

Una empresa creada por conversión inicia como `pendiente_completar`. El nombre comercial es obligatorio. NIT, razón social, dirección, ciudad, segmento, teléfono y datos administrativos son recomendados; su ausencia produce indicadores de calidad y no bloquea la conversión.

### 7.3 Contacto

| Obligatorios | Recomendados | Opcionales |
| --- | --- | --- |
| Exactamente una entidad asociada; nombre completo; al menos email o teléfono válido | Cargo o función comercial; marcar contacto principal cuando corresponda | Notas y canales adicionales |

Si se informa email debe tener formato válido. Un teléfono válido contiene al menos siete dígitos después de normalizarlo. La entidad asociada es una empresa o un prospecto, nunca ambas en el mismo registro lógico.

### 7.4 Actividad o nota

| Registro | Obligatorios | Recomendados | Opcionales |
| --- | --- | --- | --- |
| Acción de seguimiento | Exactamente una entidad; tipo distinto de nota; fecha prevista; descripción | Próximo resultado esperado | Detalles adicionales |
| Nota | Exactamente una entidad; contenido | Categoría | Fecha de referencia y metadatos adicionales |

## 8. Conversión y resolución de duplicados

### 8.1 Señales y precedencia

Las comparaciones usan valores normalizados y no alteran los datos fuente.

| Nivel | Señal | Resultado obligatorio |
| --- | --- | --- |
| Fuerte | NIT exacto | Bloquear la creación de otra empresa y solicitar confirmación para enlazar la existente |
| Probable | Nombre y además teléfono o dirección coincidente | Exigir decisión humana entre enlazar o justificar una empresa nueva |
| Débil | Sólo nombre, sólo teléfono o sólo dirección | Mostrar advertencia y permitir enlazar o crear con decisión explícita |
| Ambiguo | Más de una empresa candidata | Bloquear hasta seleccionar una candidata o justificar una empresa nueva |
| Sin coincidencia | Ninguna señal | Permitir crear una empresa |

Una justificación queda exigida cuando se crea una empresa pese a una coincidencia probable, débil o ambigua. La Etapa 2 determinará su persistencia y consulta en auditoría.

La precedencia se aplica así:

1. Una coincidencia fuerte por NIT siempre prevalece sobre las señales probables o débiles.
2. Si existe exactamente una candidata con NIT exacto, se bloquea la creación de otra empresa y sólo se permite confirmar el enlace con esa candidata.
3. Si más de una candidata comparte el NIT exacto, la conversión se bloquea como inconsistencia de datos; no se permite justificar una empresa nueva hasta resolverla mediante un gate separado.
4. El resultado ambiguo se aplica cuando no existe coincidencia fuerte y hay más de una candidata probable o débil.
5. Cuando existe una sola candidata sin NIT exacto, se aplica el nivel más fuerte de las señales que la identifican.

### 8.2 Contactos duplicados

| Señal dentro de la empresa destino | Resultado |
| --- | --- |
| Email normalizado idéntico | Tratar como el mismo contacto |
| Teléfono normalizado idéntico | Tratar como el mismo contacto |
| Email y teléfono coinciden con contactos destino diferentes | Bloquear y solicitar revisión humana; no crear ni modificar contactos |
| Nombre similar sin coincidencia de email o teléfono | Advertir y solicitar revisión humana |
| Ninguna señal | Permitir crear el contacto |

“Tratar como el mismo contacto” significa seleccionar el contacto existente de la empresa destino y no crear otro registro. Antes de enlazarlo, se muestra una comparación campo por campo. Sólo se pueden copiar valores aprobados de forma explícita a campos vacíos; un valor existente no se sobrescribe automáticamente. Si el usuario no aprueba ninguna copia, el contacto existente se conserva sin cambios.

### 8.3 Flujo de conversión

1. Validar los campos mínimos del prospecto y del contacto.
2. Detectar empresas candidatas y ordenar las señales por precedencia.
3. Obtener una decisión humana cuando el resultado no sea “sin coincidencia”.
4. Crear una empresa o seleccionar la existente.
5. Mostrar comparación campo por campo y copiar únicamente valores aprobados.
6. Resolver contactos con las reglas de la sección 8.2.
7. Enlazar el prospecto con la empresa destino.
8. Marcar el prospecto `convertido` y devolver la empresa enlazada.

Si se enlaza una empresa existente, ésta conserva todos sus valores por defecto. El prospecto puede quedar convertido aunque el usuario decida no copiar ningún campo.

### 8.4 Invariantes

- Repetir una conversión devuelve la empresa ya enlazada.
- Un prospecto convertido no crea una segunda empresa.
- Una coincidencia ambigua no modifica empresa, contacto ni prospecto sin confirmación.
- Un fallo deja intactos prospecto, empresa y contactos.
- No se limpia, fusiona ni elimina información como efecto secundario de convertir.

## 9. Errores y concurrencia

| Situación | Respuesta operable |
| --- | --- |
| Campo obligatorio ausente | Identificar campo, regla y corrección requerida |
| Email o teléfono inválido | Conservar el formulario y señalar el formato esperado |
| Coincidencia detectada | Mostrar señales y empresas candidatas sin decidir automáticamente |
| Varias candidatas | Bloquear y solicitar selección o justificación |
| Registro cambió durante la decisión | No guardar; recargar la versión vigente antes de continuar |
| Conversión fallida | Mostrar error sin cambios parciales y permitir reintento seguro |
| Conversión ya ejecutada | Devolver la empresa enlazada como éxito idempotente |

## 10. Trazabilidad requerida

Cada transición futura debe poder identificar:

- actor;
- fecha y hora;
- entidad;
- estado anterior y nuevo;
- motivo obligatorio para retroceso, descarte, reactivación o creación pese a coincidencias;
- empresa enlazada y decisión de copia durante una conversión.

Esta sección define la evidencia funcional. El mecanismo persistente se diseñará en la Etapa 2 junto con auditoría y permisos.

## 11. Cobertura y aceptación

| Criterio | Evidencia mínima futura |
| --- | --- |
| `P9-WF-01` | Catálogos y matrices de transición de las secciones 5 y 6 aprobados |
| `P9-WF-02` | Pruebas unitarias de transiciones válidas e inválidas; evidencia de actor, precondición, resultado y error |
| `P9-WF-03` | Prueba de normalización de `por_validar`; plan y gate separados para migración y retiro |
| `P9-FLD-01` | Matriz de la sección 7 trazada a formularios y contratos por operación |
| `P9-FLD-02` | Pruebas de obligatorios, formatos y mensajes; evidencia manual de errores visibles |
| `P9-CONV-01` | Pruebas unitarias de normalización, señales y precedencia |
| `P9-CONV-02` | Pruebas para crear, enlazar, bloquear y solicitar decisión humana |
| `P9-CONV-03` | Integración aislada que repita conversiones y compruebe conteos e invariantes |

Una implementación futura no cierra estos criterios sólo con evidencia manual cuando la regla sea automatizable.

## 12. Dependencias y secuencia posterior

1. Registrar estas decisiones en el PRD vivo y `DECISIONS.md` mediante un cambio documental separado.
2. Contrastar el contrato con el esquema remoto y la RPC vigente antes de diseñar columnas o argumentos.
3. Preparar unidades de implementación independientes: modelo puro, interfaz, backend/migración y compatibilidad.
4. Solicitar autorización específica antes de cualquier cambio de Supabase o datos.
5. Ejecutar pruebas mutantes únicamente en el proyecto desechable confirmado.

## 13. Riesgos y mitigaciones

| Riesgo | Mitigación |
| --- | --- |
| El nuevo vocabulario se confunde con valores ya persistidos | Mantener una capa de compatibilidad explícita y no migrar dentro del cambio documental |
| La calidad vuelve a mezclarse con la etapa | Probar ambas dimensiones por separado y evitar estados híbridos |
| Una regla de duplicados produce falsos positivos | Mantener revisión humana y exigir más de una señal para coincidencia probable |
| La conversión sobrescribe información confiable | Conservar por defecto la empresa existente y copiar sólo campos aprobados |
| La fase se convierte en una migración amplia | Dividir implementación, backend y datos en gates independientes y reversibles |

## 14. Reversión documental

Revertir únicamente este archivo si el contrato no se aprueba finalmente. No modificar el PRD vigente, el comportamiento, Supabase ni los datos como parte de esa reversión.
