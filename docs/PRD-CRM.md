# PRD vivo — CRM de Quindío Exquisito

## 1. Estado del documento

- Producto: CRM de Quindío Exquisito.
- Tipo: fuente viva de requisitos de producto.
- Estado: vigente.
- Responsable de producto: Pedro.
- Última revisión: 2026-07-21.
- Baseline publicado inspeccionado: `main` en `f55ae78d90ff05eb4ea7c57b6c0ea7e9c70a7490`.
- Fase activa: Fase 9 — Cierre funcional y operativo.
- Antecedente histórico: [`PRD-CRM-FASE-1.md`](./PRD-CRM-FASE-1.md).

Este documento describe el CRM vigente y sus límites de producto. El comportamiento sólo se considera publicado cuando el cambio correspondiente está fusionado en `main` y ha superado los gates de release. El trabajo aún abierto en un PR se registra en el roadmap, pero no amplía por sí solo el alcance publicado.

## 2. Propósito del producto

Centralizar la prospección y el seguimiento comercial de Quindío Exquisito para que el equipo pueda:

- mantener una vista compartida de empresas, contactos y prospectos;
- priorizar oportunidades y calidad de datos;
- registrar actividades y próximos pasos;
- convertir prospectos de forma controlada;
- solicitar y revisar actualizaciones de datos;
- operar con autorización explícita y trazabilidad técnica.

El objetivo actual es consolidar un CRM interno confiable. No es un ERP ni pretende cubrir inventario, compras, contabilidad, nómina o facturación.

## 3. Usuarios

### Usuario comercial autorizado

Consulta empresas, contactos, actividades y prospectos; usa búsquedas y filtros; registra seguimiento; y actualiza los estados permitidos.

### Responsable operativo

Supervisa calidad y completitud de los datos, revisa respuestas de actualización y ejecuta limpiezas únicamente mediante flujos confirmados.

### Contacto externo

Accede sólo al formulario asociado a un token válido para confirmar o proponer cambios de datos. No accede al CRM interno.

### Administrador técnico

Mantiene autorización, contratos, despliegues y recuperación operativa. Los cambios de backend o datos requieren autorización independiente.

## 4. Alcance funcional vigente

### Acceso y autorización

- inicio y cierre de sesión mediante Supabase Auth;
- autorización interna mediante allowlist privada;
- rechazo y cierre de sesión para identidades no autorizadas;
- defensa adicional mediante RLS en las tablas CRM;
- roles `admin` y `member` registrados, actualmente con el mismo CRUD.

### Empresas y contactos

- búsqueda y filtrado de empresas;
- consulta de detalle, contactos, notas y actividad relacionada;
- creación de empresa con contacto principal;
- creación independiente de contactos;
- actualización de empresa y contacto desde los flujos disponibles;
- indicadores de calidad y completitud.

### Actividades

- consulta de actividades de empresas y prospectos;
- creación con fecha y entidad relacionada;
- marcado como completada;
- reprogramación de actividades abiertas;
- visibilidad de vencimientos y próximo paso.

### Prospección

- consulta de listas, métricas y detalle;
- creación y edición de prospectos y contactos asociados;
- búsqueda y filtros por estado, prioridad y ciudad;
- conversión transaccional e idempotente a empresa;
- eliminación transaccional con confirmación explícita;
- normalización en frontend del vocabulario legado de estados.

### Actualización externa de datos

- lectura de formulario mediante token activo y no vencido;
- envío público con payload limitado;
- revisión interna de respuestas pendientes;
- aprobación o rechazo como decisiones terminales.
- aprobación transaccional de empresa, contacto principal, celular, teléfono fijo y segundo contacto opcional;
- cola explícita para reconciliar `Hoja1` y `contactos_base` después de aprobar cambios.

### Operación interna de correo

- ruta interna autenticada para una prueba controlada de ZeptoMail;
- destinatario y usuario restringidos;
- secreto conservado exclusivamente en el runtime de la Edge Function.
- piloto real separado para exactamente cinco destinatarios aprobados;
- vista previa cerrada, confirmación en dos pasos, reclamación atómica y bloqueo de duplicados;
- destinatarios y tokens provisionados por entorno, nunca incluidos en Git ni aceptados desde el navegador.

## 5. Reglas de negocio vigentes

1. Una cuenta de Auth no obtiene acceso al CRM si no está activa en la allowlist privada.
2. `admin` y `member` comparten capacidades hasta que producto apruebe una matriz de permisos.
3. Los estados heredados de prospectos se normalizan al leer; no se reescriben datos automáticamente.
4. Una conversión repetida devuelve la empresa ya enlazada y no debe crear otra.
5. Las eliminaciones de prospectos requieren confirmación y usan una operación transaccional; la política de recuperación sigue pendiente.
6. Las únicas operaciones anónimas deliberadas son cargar y enviar el formulario público por token.
7. Ningún cambio de interfaz autoriza por sí mismo cambios de esquema, RLS, Auth, Edge Functions, secretos o datos.

## 6. Criterios de aceptación por flujo

| ID | Flujo | Criterio |
| --- | --- | --- |
| AUTH-01 | Acceso | Un miembro activo puede iniciar y cerrar sesión. |
| AUTH-02 | Acceso | Una identidad fuera de la allowlist no puede leer ni mutar filas CRM. |
| AUTH-03 | Acceso | Los errores no revelan secretos, tokens ni detalles sensibles. |
| CRM-01 | Empresas | El usuario puede localizar una empresa por búsqueda o filtros y abrir su detalle. |
| CRM-02 | Contactos | El usuario puede consultar, crear y actualizar contactos con errores visibles. |
| CRM-03 | Calidad | Los campos incompletos se identifican sin alterar datos automáticamente. |
| ACT-01 | Actividades | El usuario puede registrar una actividad para empresa o prospecto. |
| ACT-02 | Actividades | Puede completarla o reprogramarla conservando entidad, estado y fecha consistentes. |
| PRO-01 | Prospección | El usuario puede consultar listas, métricas, filtros y detalle. |
| PRO-02 | Prospección | Puede crear y editar prospectos y contactos asociados. |
| PRO-03 | Conversión | La conversión es transaccional, idempotente y evita duplicación accidental. |
| PRO-04 | Eliminación | Una eliminación exige confirmación y no deja dependencias parciales. |
| CU-01 | Formulario público | Un token válido expone únicamente el formulario asociado. |
| CU-02 | Formulario público | Un token inválido o vencido no expone datos. |
| CU-03 | Revisión | Una respuesta sólo puede aprobarse o rechazarse desde el estado pendiente. |
| CU-04 | Aplicación | Una aprobación aplica empresa y contactos en una transacción y no duplica un segundo contacto al reintentarse. |
| CU-05 | Maestros | Una aprobación con cambios queda pendiente de maestros hasta confirmar `Hoja1` y `contactos_base`; confirmar sin cambios no crea tarea. |
| COM-01 | Piloto de correo | Sólo el usuario autorizado puede previsualizar y reclamar exactamente cinco destinatarios provisionados; un segundo intento no puede reenviar un registro reclamado. |
| UX-01 | Interfaz | Acciones y filtros principales tienen nombre accesible y foco visible. |
| UX-02 | Responsive | Los flujos críticos son utilizables en escritorio y en un viewport móvil de 390 px. |
| OPS-01 | Release | Typecheck, pruebas, build, smoke y deployment deben aprobar antes de cerrar una fase publicable. |

La cobertura y evidencia de estos criterios se registran en [`AUDIT.md`](./AUDIT.md), [`RELEASE-CHECKLIST.md`](./RELEASE-CHECKLIST.md) y las pruebas del repositorio. Un criterio implementado no se considera totalmente automatizado si sólo cuenta con evidencia manual.

## 7. Requisitos no funcionales

### Seguridad

- RLS habilitado en toda tabla expuesta y políticas alineadas con el modelo de autorización;
- ningún `service_role`, token privado o secreto en Git o en el bundle del navegador;
- privilegio mínimo para tablas y RPC;
- confirmación y estrategia de recuperación para operaciones destructivas;
- logs sin emails, UUID, payloads ni credenciales.

### Calidad y mantenibilidad

- TypeScript estricto;
- dependencias reproducibles mediante runtime, gestor y lockfile definidos;
- consultas con columnas explícitas y contratos derivados del esquema verificado;
- cambios pequeños, reversibles y separados por alcance;
- deuda de bridges retirada sólo con equivalencia funcional y visual comprobada.

### Usabilidad

- estados de carga, vacío, éxito y error visibles;
- navegación principal utilizable con teclado;
- controles con nombres accesibles;
- ausencia de overflow global en los viewports soportados.

### Operación

- CI obligatorio para PR y `main`;
- preview de Vercel para cambios publicables;
- rollback trazable mediante revert y deployment estable anterior;
- pruebas mutantes sólo en un proyecto desechable confirmado.

## 8. Fase 9 — Cierre funcional y operativo

### Objetivo

Cerrar las definiciones funcionales y operativas que todavía impiden evolucionar el CRM con reglas consistentes, evidencia trazable y recuperación segura. La fase debe convertir decisiones abiertas en contratos aprobados, criterios verificables y entregas incrementales; no autoriza por sí sola cambios de backend, datos o servicios externos.

### Alcance

1. **Cierre funcional del workflow comercial.** Definir estados canónicos de empresas, prospectos y actividades; transiciones permitidas; responsables; condiciones de entrada y salida; excepciones; y tratamiento del estado legado `por_validar`.
2. **Definición de campos obligatorios.** Establecer por entidad y operación qué campos son requeridos, recomendados u opcionales, incluyendo creación, edición, conversión, importación futura y formulario público.
3. **Conversión de prospectos y resolución de duplicados.** Aprobar señales de coincidencia, umbrales, precedencia, resultados ante conflicto, revisión humana e invariantes de idempotencia, sin limpiar ni reescribir datos como efecto secundario.
4. **Roles y permisos `admin`/`member`.** Definir una matriz por acción y dominio, separando capacidades funcionales de la implementación posterior en frontend, RLS, RPC y operación de membresías.
5. **Auditoría, eliminación lógica y recuperación.** Determinar eventos auditables, retención mínima, entidades sujetas a borrado lógico, restauración, purga definitiva y responsabilidades operativas.
6. **Política de múltiples respuestas del formulario.** Decidir si un enlace admite una respuesta, reenvíos o reapertura; cómo se conserva el historial; y qué estados son terminales para revisión y enlace.
7. **Matriz de criterios de aceptación y cobertura.** Relacionar cada criterio vigente y nuevo con pruebas unitarias, de contrato, integración, smoke o evidencia manual, haciendo visibles los vacíos y su gate de cierre.
8. **Definición operable de métricas.** Especificar fórmula, fuente, granularidad, zona horaria, frecuencia, responsable, objetivo, privacidad y retención antes de instrumentar empresas con contacto utilizable, calidad de prospectos, actividades, primera gestión, conversión, formularios y errores críticos.
9. **Reducción incremental de deuda técnica y bridges.** Sustituir un bridge por vez con composición React propietaria, comenzando por `ContactCompletionBridge` y `AddActivityEntryBridge`, y centralizar repositorios sólo cuando se intervenga su ruta y exista equivalencia comprobada.

### Fuera de alcance de la fase

- funcionalidades ERP, incluidas inventario, compras, contabilidad, nómina y facturación;
- una migración, cambio de RLS/Auth/RPC, Edge Function o mutación de datos sin su gate independiente;
- limpieza masiva de duplicados, reescritura automática de estados legados o purga definitiva de registros;
- incorporación inmediata de proveedores de telemetría, email, WhatsApp u otros servicios externos;
- rediseño visual integral, reorganización amplia de rutas o sustitución simultánea de varios bridges;
- permisos por propietario, multi-organización o automatizaciones comerciales no definidos por producto.

### Criterios de aceptación

| ID | Frente | Criterio |
| --- | --- | --- |
| P9-WF-01 | Workflow | Existe un catálogo aprobado de estados canónicos y transiciones permitidas por entidad. |
| P9-WF-02 | Workflow | Cada transición identifica actor autorizado, precondiciones, resultado y tratamiento de error. |
| P9-WF-03 | Workflow | El estado legado `por_validar` tiene una decisión explícita de lectura, migración o retiro. |
| P9-FLD-01 | Campos | Cada entidad cuenta con una matriz de campos requeridos, recomendados y opcionales por operación. |
| P9-FLD-02 | Campos | Los criterios de validación y los mensajes esperados están definidos antes de cambiar formularios o datos. |
| P9-CONV-01 | Conversión | Las señales y la precedencia para detectar una empresa coincidente están aprobadas y son explicables. |
| P9-CONV-02 | Conversión | Cada tipo de coincidencia o conflicto conduce a crear, enlazar, bloquear o solicitar revisión humana. |
| P9-CONV-03 | Conversión | La conversión repetida conserva idempotencia y no modifica coincidencias ambiguas sin confirmación. |
| P9-RBAC-01 | Permisos | Existe una matriz `admin`/`member` para lectura, creación, actualización, eliminación, recuperación y administración. |
| P9-RBAC-02 | Permisos | Toda diferencia de permisos tiene una regla de producto y una estrategia de prueba antes de implementarse. |
| P9-RBAC-03 | Permisos | Cualquier cambio de RLS, RPC o membresías se ejecuta mediante un gate de backend separado y reversible. |
| P9-AUD-01 | Auditoría | Se definen eventos, actor, fecha, entidad, cambio mínimo registrable, retención y acceso al historial. |
| P9-AUD-02 | Eliminación | Las entidades aprobadas usan eliminación lógica por defecto y distinguen registro activo, eliminado y recuperado. |
| P9-AUD-03 | Recuperación | Existe un flujo autorizado de restauración y una política separada para purga irreversible. |
| P9-CU-01 | Formulario | Se aprueba si un enlace permite una respuesta, reenvíos controlados o reapertura. |
| P9-CU-02 | Formulario | El historial de respuestas y la relación con el estado del enlace quedan definidos sin exponer datos adicionales. |
| P9-CU-03 | Formulario | Aprobación, rechazo, reapertura y expiración tienen transiciones terminales o reversibles explícitas. |
| P9-COV-01 | Cobertura | Cada criterio del PRD se mapea a prueba unitaria, contrato, integración, smoke o evidencia manual. |
| P9-COV-02 | Cobertura | Todo vacío de cobertura registra riesgo, responsable, evidencia requerida y gate de cierre. |
| P9-MET-01 | Métricas | Cada métrica aprobada tiene nombre, fórmula, fuente, granularidad y zona horaria inequívocos. |
| P9-MET-02 | Métricas | Cada métrica tiene responsable, frecuencia, objetivo o umbral y acción esperada. |
| P9-MET-03 | Métricas | Privacidad, retención, acceso y alertas se aprueban antes de añadir instrumentación o proveedores. |
| P9-TECH-01 | Deuda técnica | Existe un inventario priorizado de bridges y dependencias DOM/portal con rollback por unidad. |
| P9-TECH-02 | Deuda técnica | Cada bridge retirado demuestra equivalencia funcional, visual y accesible mediante los gates aplicables. |
| P9-TECH-03 | Deuda técnica | No se reorganizan rutas ni se centralizan capas ajenas a la unidad intervenida sin aprobación específica. |

### Contrato comercial aprobado — Etapa 1

La Etapa 1 quedó aprobada e integrada mediante la [especificación del contrato comercial](./superpowers/specs/2026-07-21-phase-9-commercial-contract-design.md) y se registra como `D-026` en [DECISIONS.md](./DECISIONS.md).

El contrato:

- separa etapa comercial, calidad y clasificación;
- define estados y transiciones para prospectos, empresas y actividades, incluida la lectura temporal de `por_validar`;
- clasifica campos obligatorios, recomendados y opcionales por entidad y operación;
- establece señales y precedencia para duplicados, revisión humana e invariantes de conversión idempotente.

Los criterios `P9-WF-01..03`, `P9-FLD-01..02` y `P9-CONV-01..03` quedan aceptados como contrato funcional. Su implementación, persistencia y evidencia automatizada conservan gates independientes; esta aprobación no autoriza cambios de Supabase, datos ni comportamiento.

### Gobierno y recuperación aprobados — Etapa 2

La Etapa 2 quedó aprobada e integrada mediante la [especificación de gobierno y recuperación](./superpowers/specs/2026-07-21-phase-9-governance-recovery-design.md) y se registra como `D-027` en [DECISIONS.md](./DECISIONS.md). El [plan RBAC](./superpowers/plans/2026-07-21-phase-9-rbac-foundation.md) es la primera unidad técnica propuesta y conserva un gate de ejecución independiente.

El contrato:

- separa el trabajo comercial de `member` y las operaciones sensibles de `admin`;
- define auditoría mínima, retención de cinco años y acceso administrativo;
- adopta eliminación lógica y restauración atómica por lote para las entidades aprobadas;
- excluye la purga definitiva de la aplicación y exige un procedimiento excepcional;
- establece un enlace por ciclo, una sola respuesta válida y estados terminales sin reapertura.

Los criterios `P9-RBAC-01..03`, `P9-AUD-01..03` y `P9-CU-01..03` quedan aceptados como contrato funcional. Aceptarlos no implementa RLS, RPC, Auth, auditoría, eliminación lógica, recuperación ni el nuevo ciclo público; cada unidad necesita plan, aprobación, reversión y pruebas aisladas.

### Decisiones pendientes
- cobertura mínima automatizada por flujo y evidencia manual aceptable;
- catálogo inicial de métricas, objetivos, responsables y política de privacidad;
- orden definitivo de bridges y criterio de salida de cada sustitución;
- política de paginación con orden estable antes de superar 1.000 entidades por dominio.

### Dependencias

- aprobación de las decisiones de producto antes de diseñar implementación;
- contratos generados y esquema remoto contrastado antes de asumir columnas, RPC o políticas;
- gate independiente para cualquier cambio de Supabase, RLS, Auth, Edge Functions o datos;
- reconciliación de la baseline en el historial productivo antes de desplegar otra migración;
- proyecto desechable confirmado para pruebas autenticadas o mutantes;
- matriz de criterios y cobertura actualizada antes de cerrar cada frente;
- release checklist, preview y rollback trazable para toda entrega publicable.

### Riesgos y mitigaciones

| Riesgo | Mitigación |
| --- | --- |
| La fase agrupa demasiados frentes y pierde trazabilidad. | Ejecutar un frente por gate, con decisión, criterio, evidencia y rollback propios. |
| Una definición funcional implica cambios de backend no autorizados. | Separar aprobación de producto, diseño técnico y gate de Supabase. |
| La resolución de duplicados altera datos correctos. | Exigir señales explicables, revisión humana para ambigüedad y pruebas aisladas. |
| El borrado lógico convive de forma inconsistente con eliminaciones actuales. | Definir alcance por entidad, compatibilidad, recuperación y transición antes de migrar. |
| Las métricas incentivan comportamiento incorrecto o exponen datos. | Aprobar fórmula, contexto, responsable, privacidad y acción antes de instrumentar. |
| El retiro de bridges introduce regresiones visuales o funcionales. | Sustituir uno por vez y repetir typecheck, pruebas, build, smoke y gate visual. |

La activación documental de la Fase 9 no cambia por sí misma el alcance funcional publicado descrito en las secciones 4 y 5. Cada comportamiento nuevo se incorporará allí únicamente después de implementarse, verificarse y fusionarse.

## 9. Fuera de alcance actual

- funcionalidades ERP: inventario, compras, contabilidad, nómina y facturación;
- migraciones, cambios de RLS/Auth, Edge Functions o datos sin un gate separado;
- importaciones o limpiezas de datos no autorizadas;
- automatización masiva de email o WhatsApp más allá del piloto cerrado de cinco destinatarios;
- analítica avanzada o telemetría sin política aprobada;
- rediseño visual integral;
- permisos por propietario o multi-organización no definidos por producto.

## 10. Mantenimiento de esta fuente viva

- Actualizar este PRD cuando cambie el alcance o una regla de negocio publicada.
- Registrar decisiones nuevas o sustituidas en [`DECISIONS.md`](./DECISIONS.md).
- Registrar evidencia, contradicciones y resultados en [`AUDIT.md`](./AUDIT.md).
- Mantener fases, gates y prioridades en [`ROADMAP.md`](./ROADMAP.md).
- No reescribir el PRD histórico de Fase 1; cualquier corrección histórica debe añadirse como nota explícita.
