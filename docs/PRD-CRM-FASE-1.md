> **Documento cerrado e histórico.** Esta especificación conserva el alcance y las decisiones de la Fase 1 tal como fueron redactados el 2026-07-19. No debe usarse como fuente vigente ni reescribirse para reflejar fases posteriores. La fuente viva del producto es [`docs/PRD-CRM.md`](./PRD-CRM.md).

# PRD — CRM Fase 1

## 1. Estado del documento

- Producto: CRM de Quindío Exquisito
- Fase: 1 — estabilización y organización del MVP existente
- Estado: borrador documental para validación
- Fecha de corte: 2026-07-19
- Base técnica inspeccionada: `main` en `ecc2704c7c0a9e2da3f7f6c1d546b72bb0d644f3`

Este PRD describe el producto observado y propone el alcance de una primera fase. No autoriza cambios funcionales, de Supabase ni de datos.

## 2. Problema

El equipo necesita centralizar la prospección y el seguimiento comercial de empresas y contactos, con suficiente visibilidad sobre estado, prioridad, actividades y próximos pasos. El MVP ya cubre varios flujos, pero su estructura técnica y sus reglas de negocio están distribuidas entre páginas grandes, componentes puente y acceso directo a Supabase. Esto eleva el riesgo de inconsistencias y dificulta evolucionar el producto con seguridad.

## 3. Objetivo de la fase

Convertir el MVP actual en una base comprendida, verificable y preparada para una reorganización gradual, conservando el comportamiento útil existente.

Resultados esperados:

- alcance funcional actual inventariado y validado;
- flujos críticos y criterios de aceptación acordados;
- fuentes canónicas de código definidas antes de eliminar duplicados;
- riesgos de datos, seguridad y operación identificados;
- secuencia de cambios técnicos aprobada y reversible.

## 4. Usuarios y necesidades

### Usuario comercial autenticado

Necesita consultar empresas, contactos y prospectos; filtrar y priorizar su trabajo; registrar actividades; actualizar estados; y conocer el próximo paso sin perder contexto.

### Responsable operativo

Necesita revisar la calidad y completitud de los datos, identificar pendientes y duplicados, y controlar acciones de limpieza con bajo riesgo.

### Contacto externo

Necesita completar o actualizar datos mediante un enlace controlado, sin acceder al CRM interno.

### Administrador técnico

Necesita una estructura mantenible, límites de seguridad explícitos, configuración reproducible y trazabilidad de decisiones.

## 5. Alcance funcional observado

El repositorio contiene implementaciones para:

- autenticación con email y contraseña mediante Supabase Auth;
- inicio comercial con empresas, contactos, actividades y prospectos;
- consulta y actualización de empresas;
- creación y seguimiento de actividades;
- creación de empresas/contactos y creación independiente de contactos;
- listas de prospectos, detalle de lista, alta y limpieza de prospectos;
- contactos asociados a prospectos;
- formulario público por token para actualización de datos mediante RPC;
- revisión interna de respuestas del formulario mediante RPC;
- prueba interna autenticada de correo mediante una Edge Function.

Tablas o recursos referenciados por el código: `companies`, `contacts`, `activities`, `prospect_lists`, `prospects`, `prospect_contacts` y `prospect_activities`. RPC referenciadas: `get_cu_form`, `submit_cu_form`, `get_cu_pending_reviews` y operaciones de revisión cuyo nombre se selecciona en la interfaz. La forma, permisos y políticas remotas se verificaron posteriormente durante la Fase 2 autorizada; los resultados están registrados en `docs/AUDIT.md`.

## 6. Alcance propuesto para Fase 1

### Incluido

- validar con el responsable de producto los flujos observados y su prioridad;
- definir vocabulario y estados de empresa, prospecto y actividad;
- establecer una fuente canónica para rutas, tipos, estilos y cliente de datos;
- planear la división de páginas y estilos de gran tamaño;
- definir una estrategia mínima de verificación para los flujos críticos;
- documentar contratos de datos existentes sin modificar la base;
- resolver, después de aprobación, los duplicados de la raíz de forma reversible.

### Fuera de alcance

- migraciones, nuevas tablas o cambios de RLS;
- modificación, importación, depuración o eliminación de datos;
- cambios en Auth, Edge Functions o secretos;
- automatizaciones de correo o WhatsApp para producción;
- rediseño visual integral;
- analítica avanzada, roles múltiples o permisos por propietario;
- eliminación o movimiento de duplicados antes del gate aprobado.

## 7. Flujos críticos y criterios de aceptación

### Acceso autenticado

- Un usuario autorizado puede iniciar y cerrar sesión.
- Un usuario no autenticado no obtiene acceso a datos internos.
- Los errores de configuración o autenticación se muestran sin revelar secretos.

### Gestión de empresas y contactos

- El usuario puede localizar una empresa por búsqueda o filtros.
- Puede consultar sus contactos y actividad relacionada.
- Puede crear o actualizar registros permitidos y recibe confirmación o error claro.
- Los campos obligatorios y formatos se validan antes de enviar.

### Prospección

- El usuario puede consultar listas y sus métricas básicas.
- Puede crear y editar prospectos y contactos asociados.
- Las acciones destructivas de limpieza requieren confirmación inequívoca.
- La transición de prospecto a empresa evita duplicación accidental o la señala para resolución.

### Actividades

- El usuario puede registrar una actividad para empresa o prospecto.
- Puede marcarla como completada o reprogramarla.
- Fechas, estado y entidad relacionada permanecen consistentes.

### Actualización externa de datos

- Un token válido permite cargar exclusivamente el formulario asociado.
- Un token inválido o vencido no expone datos.
- El envío produce un estado claro y queda disponible para revisión autorizada.

## 8. Requisitos no funcionales

### Seguridad

- RLS debe permanecer habilitado y validado para recursos internos.
- Ningún secreto privado llega al bundle del navegador ni a Git.
- Las rutas internas y funciones sensibles verifican identidad y autorización.
- Las operaciones destructivas tienen confirmación y trazabilidad.

### Calidad

- TypeScript estricto sin errores.
- Build reproducible desde un checkout limpio con dependencias bloqueadas.
- Estados de carga, vacío y error visibles en los flujos críticos.
- Contratos de datos centralizados y alineados con el esquema verificado.

### Usabilidad y accesibilidad

- Navegación y acciones principales utilizables con teclado.
- Controles con etiquetas y foco visibles.
- Densidad de información legible en escritorio y comportamiento básico en pantallas estrechas.

### Operación

- Errores externos distinguibles de errores de validación.
- Diagnóstico suficiente sin registrar datos sensibles.
- Procedimiento documentado para configuración local y despliegue.

## 9. Métricas propuestas

Las metas numéricas requieren una línea base y aprobación. Medir inicialmente:

- porcentaje de empresas con al menos un contacto utilizable;
- porcentaje de prospectos con email válido y contacto identificado;
- actividades vencidas, abiertas y completadas por periodo;
- tiempo desde creación de prospecto hasta primera actividad;
- tasa de formularios externos enviados y revisados;
- errores por flujo crítico y tiempo de recuperación.

## 10. Preguntas abiertas

- ¿Cuál es el flujo comercial oficial y qué estados/transiciones son válidos?
- ¿Cuándo un prospecto se convierte en empresa y cómo se resuelven coincidencias?
- ¿Qué perfiles de usuario existirán además del usuario interno actual?
- ¿Qué campos son obligatorios para empresa, contacto, prospecto y actividad?
- ¿Qué política de retención y auditoría deben tener las eliminaciones?
- ¿Qué rutas son internas, públicas o temporales?
- ¿Cuáles son los objetivos cuantitativos de la Fase 1?

## 11. Gate de salida documental

Antes de iniciar implementación se requiere aprobar:

1. alcance y prioridad de los flujos;
2. fuente canónica de los archivos duplicados;
3. plan de reorganización y recuperación;
4. contrato de no modificación de Supabase/datos o una autorización separada;
5. estrategia de verificación y criterios de aceptación.
