# PRD vivo — CRM de Quindío Exquisito

## 1. Estado del documento

- Producto: CRM de Quindío Exquisito.
- Tipo: fuente viva de requisitos de producto.
- Estado: vigente.
- Responsable de producto: Pedro.
- Última revisión: 2026-07-21.
- Baseline publicado inspeccionado: `main` en `ab1a616a39c87c7617cc9996eab25b69c8f61fa4`.
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

### Operación interna de correo

- ruta interna autenticada para una prueba controlada de ZeptoMail;
- destinatario y usuario restringidos;
- secreto conservado exclusivamente en el runtime de la Edge Function.

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

## 8. Métricas candidatas

Estas métricas aún requieren definición de fuente, fórmula, frecuencia, responsable, objetivo y retención antes de instrumentarse:

- empresas con al menos un contacto utilizable;
- prospectos con contacto identificado y email válido;
- actividades abiertas, vencidas y completadas por periodo;
- tiempo desde alta de prospecto hasta primera actividad;
- tiempo hasta conversión;
- formularios enviados, revisados y pendientes;
- errores por flujo crítico y tiempo de recuperación.

No se debe añadir telemetría de aplicación ni un proveedor externo sin aprobar primero privacidad, retención, alertas y variables necesarias.

## 9. Decisiones de producto pendientes

- workflow comercial oficial y transiciones permitidas;
- campos obligatorios por entidad;
- criterio definitivo para coincidencias y duplicados durante conversión;
- matriz de permisos para `admin` y `member`;
- auditoría, retención y recuperación de eliminaciones;
- semántica de múltiples respuestas para un mismo enlace público;
- objetivos cuantitativos y responsables de las métricas;
- política de paginación antes de superar 1.000 entidades por dominio.

## 10. Fuera de alcance actual

- funcionalidades ERP: inventario, compras, contabilidad, nómina y facturación;
- migraciones, cambios de RLS/Auth, Edge Functions o datos sin un gate separado;
- importaciones o limpiezas de datos no autorizadas;
- automatización productiva de email o WhatsApp;
- analítica avanzada o telemetría sin política aprobada;
- rediseño visual integral;
- permisos por propietario o multi-organización no definidos por producto.

## 11. Mantenimiento de esta fuente viva

- Actualizar este PRD cuando cambie el alcance o una regla de negocio publicada.
- Registrar decisiones nuevas o sustituidas en [`DECISIONS.md`](./DECISIONS.md).
- Registrar evidencia, contradicciones y resultados en [`AUDIT.md`](./AUDIT.md).
- Mantener fases, gates y prioridades en [`ROADMAP.md`](./ROADMAP.md).
- No reescribir el PRD histórico de Fase 1; cualquier corrección histórica debe añadirse como nota explícita.
