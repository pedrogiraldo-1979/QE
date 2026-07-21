# Diseño funcional — Fase 9, Etapa 2: gobierno y recuperación

## Estado del documento

- Fecha: 2026-07-21.
- Estado: diseño funcional aprobado en conversación; propuesta pendiente de revisión documental y commit.
- Baseline documental: `main` en `28b4bc9`, después del cierre de la Etapa 1 mediante el PR #25.
- Criterios de Fase 9 cubiertos: `P9-RBAC-01..03`, `P9-AUD-01..03` y `P9-CU-01..03`.
- Tipo de entrega: especificación documental. No autoriza implementación, migraciones ni cambios de Supabase o datos.

## 1. Objetivo

Definir el gobierno operativo del CRM para separar las facultades de `admin` y `member`, conservar evidencia auditable, recuperar eliminaciones lógicas sin reactivar registros ajenos a la operación original y fijar un ciclo inequívoco para enlaces y respuestas públicas.

## 2. Alcance

Esta especificación define:

- la matriz funcional de permisos y las salvaguardas de membresía;
- los eventos, contenido mínimo, acceso y retención de auditoría;
- el alcance de eliminación lógica, restauración por lote y purga excepcional;
- la semántica de emisión, reenvío, consumo, vencimiento y revocación de enlaces;
- los estados terminales y reversibles de respuestas y conciliación;
- la evidencia exigida a una implementación futura.

## 3. Fuera de alcance

- implementar interfaz, servicios o comportamiento;
- cambiar tablas, columnas, constraints, RPC, RLS, Auth, Edge Functions o datos de Supabase;
- migrar o eliminar registros existentes;
- crear un mecanismo concreto para administrar la allowlist;
- habilitar purga definitiva desde la aplicación;
- introducir proveedores, dependencias, secretos o variables de entorno;
- definir métricas y observabilidad, materia de la Etapa 3.

## 4. Enfoque aprobado

Se adopta un gobierno operativo equilibrado:

1. `member` ejecuta el trabajo comercial cotidiano.
2. `admin` hereda esas facultades y controla operaciones sensibles.
3. La autorización se aplica en el backend; la visibilidad de la interfaz no constituye un control suficiente.
4. Las operaciones sensibles exigen motivo y dejan evidencia auditable.
5. Los cambios de backend y datos se dividen en planes pequeños, reversibles y sujetos a autorización independiente.

Se rechazaron como patrón general tanto el control centralizado, que convertiría al administrador en cuello de botella, como el control meramente posterior, que permitiría acciones sensibles antes de su revisión.

## 5. Matriz de permisos

| Operación | `member` | `admin` | Regla de producto |
| --- | --- | --- | --- |
| Consultar registros comerciales activos | Sí | Sí | Ambos roles necesitan contexto para operar el CRM. |
| Crear y editar empresas, contactos, prospectos y actividades | Sí | Sí | Es trabajo comercial cotidiano. |
| Cambiar estados comerciales y convertir prospectos | Sí | Sí | La conversión sigue el contrato de la Etapa 1 y queda auditada. |
| Consultar registros eliminados | No | Sí | La papelera expone historial y habilita recuperación. |
| Eliminar o restaurar registros | No | Sí | Son operaciones sensibles con impacto relacional. |
| Emitir un enlace público nuevo | No | Sí | Cada emisión abre un ciclo externo controlado. |
| Reenviar, revocar o sustituir enlaces | No | Sí | Estas acciones modifican acceso externo o su entrega. |
| Aprobar o rechazar respuestas públicas | No | Sí | La respuesta puede afectar datos maestros. |
| Ejecutar o reintentar conciliación maestra | No | Sí | La conciliación debe quedar separada de la captura pública. |
| Consultar auditoría | No | Sí | El historial contiene decisiones y cambios sensibles. |
| Invitar, activar o desactivar miembros y cambiar roles | No | Sí | La administración de acceso no forma parte del trabajo comercial. |
| Ejecutar purga definitiva desde la aplicación | No | No | La purga sólo existe como procedimiento excepcional externo. |

Una operación prohibida debe fallar aunque se invoque sin usar la interfaz. La autorización se revalida al ejecutar la operación; una sesión iniciada antes de una desactivación no conserva facultades por ese hecho.

## 6. Gobierno de membresías

Sólo `admin` puede invitar, activar, desactivar o cambiar roles. Toda modificación registra actor, miembro afectado, valor anterior, valor nuevo, motivo y fecha.

Debe permanecer al menos un administrador activo después de cada operación. La validación se realiza de forma atómica para impedir que dos cambios concurrentes desactiven o degraden simultáneamente a los últimos administradores. Una autodegradación sólo es válida cuando otro administrador activo permanece disponible.

Esta especificación define la autoridad de producto, pero no autoriza una RPC pública, migración, pantalla ni otro mecanismo técnico para administrar la allowlist actual.

## 7. Auditoría

### 7.1 Eventos mínimos

La implementación futura debe auditar:

- cambios de estado comercial y sus motivos;
- conversiones y decisiones ante duplicados;
- emisión, reenvío, revocación y consumo de enlaces;
- aprobación o rechazo de respuestas;
- inicio, resultado y reintento de conciliaciones;
- eliminación lógica y restauración;
- cambios de membresía y rol;
- procedimientos excepcionales de purga.

### 7.2 Contenido mínimo

Cada evento identifica:

- actor mediante su identificador interno, sin registrar email ni token;
- fecha y hora en UTC;
- tipo e identificador de entidad;
- acción y resultado;
- motivo cuando la regla de producto lo exige;
- campos modificados con sus valores mínimos anterior y posterior;
- identificador de correlación o lote cuando una operación afecta varios registros.

La auditoría no duplica el registro completo, payloads públicos, credenciales ni secretos. Los valores anterior y posterior se limitan a los campos necesarios para explicar la decisión o reconstruir la transición.

### 7.3 Acceso y retención

Sólo `admin` puede consultar la auditoría. Los eventos se conservan cinco años y no tienen purga automática. Cualquier política posterior de archivo requerirá una nueva decisión funcional y no podrá reducir la disponibilidad ni la integridad de la evidencia durante ese periodo.

Los eventos son inmutables desde el producto. Una corrección se registra como un evento nuevo; no se edita ni elimina el evento original.

## 8. Eliminación lógica

### 8.1 Entidades cubiertas

La eliminación lógica se aplica a:

- empresas;
- contactos de empresa;
- prospectos;
- contactos de prospecto;
- actividades y notas.

Los enlaces y las respuestas públicas conservan su historia mediante estados y no usan eliminación lógica como comportamiento predeterminado.

Un registro debe distinguir, como mínimo, los estados activo, eliminado y recuperado. Las consultas operativas ordinarias excluyen los eliminados; sólo `admin` puede consultarlos en una vista de recuperación.

### 8.2 Eliminación por lote

Eliminar directamente un contacto, una actividad o una nota afecta únicamente ese registro. Eliminar una empresa o un prospecto constituye una operación atómica por lote:

1. identifica el registro principal;
2. identifica sus contactos, actividades y notas que estén activos;
3. asigna un identificador único al lote;
4. marca como eliminados el principal y los dependientes identificados;
5. registra la relación completa en auditoría.

Si cualquier parte falla, ningún registro del lote cambia de estado. Los registros que ya estaban eliminados antes de iniciar la operación no se incorporan al lote nuevo.

### 8.3 Restauración selectiva

Restaurar un registro principal recupera exclusivamente los registros eliminados por el mismo lote. Un registro eliminado antes, después o mediante otro lote permanece eliminado.

La restauración es atómica y exige motivo. Si una restricción vigente impide restaurar un elemento, no se restaura parcialmente el lote; la operación informa el conflicto sin sobrescribir datos actuales.

Una eliminación posterior a una restauración genera un lote nuevo. Los identificadores de lote no se reutilizan.

## 9. Purga definitiva

La aplicación no ofrece purga definitiva a ningún rol. Una purga excepcional requiere:

1. autorización explícita y documentada del propietario operativo designado del CRM, independiente del rol `admin`;
2. inventario exacto de registros e impacto relacional;
3. respaldo o exportación verificable;
4. plan técnico separado con reversión, pruebas y evidencia;
5. aprobación específica para cualquier migración o mutación de datos.

La purga no puede eliminar eventos de auditoría que estén dentro de su retención de cinco años. Su ejecución queda fuera de esta especificación y de cualquier implementación ordinaria de la Etapa 2.

## 10. Enlaces públicos

### 10.1 Ciclo y estados

Cada ciclo de actualización usa un enlace independiente y acepta una sola respuesta válida.

| Estado | Significado | Transiciones permitidas |
| --- | --- | --- |
| `activo` | Puede recibir una respuesta hasta su vencimiento | `respondido`, `vencido` o `revocado` |
| `respondido` | Una entrega válida reclamó el enlace | Terminal |
| `vencido` | Alcanzó su fecha límite sin respuesta válida | Terminal |
| `revocado` | Un administrador cerró el acceso antes de responder | Terminal |

Ningún estado terminal se reabre. Para corregir, actualizar o repetir el proceso, `admin` emite un enlace nuevo y el ciclo anterior permanece inmutable.

### 10.2 Reenvío y sustitución

Reenviar un enlace `activo` vuelve a entregar el mismo enlace. No cambia su identidad, fecha de vencimiento ni ciclo y deja un evento de auditoría.

Un enlace `respondido`, `vencido` o `revocado` no puede reenviarse como activo. `admin` debe emitir un enlace nuevo. Emitirlo no elimina ni modifica el anterior.

### 10.3 Consumo y concurrencia

La primera entrega válida reclama el enlace y lo marca `respondido` inmediatamente, aunque la respuesta continúe pendiente de revisión. La validación y el consumo forman una operación atómica.

Los intentos simultáneos se resuelven de modo que sólo uno tenga éxito. Un intento posterior recibe un resultado estable de enlace ya respondido, sin revelar el contenido ni la identidad de la respuesta aceptada.

Un payload inválido no consume el enlace. La respuesta de error identifica los campos corregibles sin exponer datos internos, reglas de autorización ni trazas técnicas.

## 11. Respuestas y conciliación

### 11.1 Revisión

| Estado | Transiciones | Reversibilidad |
| --- | --- | --- |
| `pendiente_revision` | `aprobada` o `rechazada` | No terminal |
| `aprobada` | Inicia o habilita conciliación | Terminal |
| `rechazada` | Cierra la respuesta sin conciliar | Terminal |

La aprobación y el rechazo exigen una decisión explícita de `admin`. Una corrección posterior usa un ciclo nuevo; no reescribe la respuesta ni reabre el enlace anterior.

### 11.2 Conciliación

Una respuesta aprobada mantiene un estado de conciliación independiente:

| Estado | Significado | Transiciones |
| --- | --- | --- |
| `pendiente` | Aún no se aplicó o confirmó la conciliación | `completada` o `fallida` |
| `fallida` | El intento no terminó de forma válida | `pendiente` mediante reintento autorizado |
| `completada` | La conciliación terminó y conserva evidencia | Terminal |

Un reintento no altera la respuesta pública original. La conciliación debe ser idempotente y no dejar cambios parciales. Esta regla funcional no prescribe todavía RPC, transacción ni esquema.

## 12. Errores y respuestas operables

| Situación | Resultado esperado |
| --- | --- |
| Rol insuficiente | Rechazar sin mutación ni detalles internos; la telemetría de intentos denegados queda para la Etapa 3. |
| Actor desactivado durante la sesión | Rechazar al revalidar membresía. |
| Último administrador en riesgo | Rechazar el cambio de membresía sin estado parcial. |
| Eliminación o restauración parcial | Revertir toda la operación y conservar los estados anteriores. |
| Conflicto al restaurar | Identificar la entidad en conflicto sin sobrescribir datos. |
| Enlace vencido, revocado o respondido | Rechazar de forma estable sin revelar la respuesta previa. |
| Dos envíos válidos simultáneos | Aceptar exactamente uno y rechazar los demás como ya respondido. |
| Payload público inválido | Conservar el enlace activo y señalar campos corregibles. |
| Conciliación fallida | Conservar la respuesta aprobada y permitir reintento idempotente por `admin`. |

Los mensajes de producto son comprensibles y accionables. Las trazas técnicas permanecen fuera de la respuesta pública y no contienen secretos ni datos personales completos.

## 13. Arquitectura funcional futura

La implementación deberá mantener límites verificables entre:

1. **Autorización:** resuelve el rol vigente y valida la acción solicitada.
2. **Operaciones comerciales:** aplica creación, edición, estados y conversión según la Etapa 1.
3. **Gobierno:** coordina membresías, eliminación, restauración y operaciones administrativas.
4. **Auditoría:** recibe eventos mínimos e inmutables de operaciones confirmadas.
5. **Ciclo público:** administra enlaces, respuestas, revisión y conciliación sin mezclar sus estados.

La interfaz consume estas capacidades, pero no decide por sí sola si una acción está autorizada. El mecanismo concreto se diseñará después de contrastar el esquema remoto, las RLS y las RPC vigentes.

## 14. Cobertura y aceptación

| Criterio | Evidencia mínima futura |
| --- | --- |
| `P9-RBAC-01` | Matriz de la sección 5 trazada a cada operación expuesta. |
| `P9-RBAC-02` | Pruebas positivas y negativas de backend por diferencia de rol, más evidencia de visibilidad en interfaz. |
| `P9-RBAC-03` | Plan reversible y aprobación independiente antes de cambios de RLS, Auth, RPC o esquema. |
| `P9-AUD-01` | Pruebas de actor, fecha, entidad, acción, motivo, cambios mínimos y acceso administrativo. |
| `P9-AUD-02` | Pruebas de consultas activas, papelera y eliminación atómica por lote. |
| `P9-AUD-03` | Pruebas de restauración selectiva; procedimiento de purga separado y sin interfaz. |
| `P9-CU-01` | Pruebas de enlace único por ciclo, reenvío sin reinicio y nueva emisión para otro ciclo. |
| `P9-CU-02` | Pruebas de historia inmutable y estados de enlace, respuesta y conciliación. |
| `P9-CU-03` | Pruebas de transiciones terminales, reintento de conciliación y ausencia de reapertura. |

Las pruebas futuras se distribuyen entre:

- unidades puras para matrices, transiciones e invariantes;
- contratos de repositorio y backend para autorización negativa;
- integración aislada para concurrencia, atomicidad e idempotencia;
- evidencia manual o E2E para controles visibles, mensajes y recuperación operable.

Una implementación no cierra un criterio sólo ocultando controles ni mediante evidencia manual cuando la regla sea automatizable.

## 15. Secuencia y gates posteriores

La implementación se descompone en entregas independientes:

1. autorización y auditoría;
2. eliminación lógica y recuperación por lote;
3. ciclo de enlaces, respuestas y conciliación;
4. adaptación de interfaz y pruebas integrales.

Antes de cada entrega se debe:

- contrastar el diseño con el esquema remoto y el comportamiento publicado;
- preparar un plan pequeño con reversión y compatibilidad de datos;
- solicitar aprobación explícita para RLS, Auth, RPC, esquema, migraciones o datos;
- ejecutar pruebas mutantes sólo contra el proyecto desechable cuyo `project_ref` se haya verificado;
- completar las verificaciones proporcionales del repositorio.

Esta especificación no autoriza preparar ni ejecutar esas implementaciones.

## 16. Riesgos y mitigaciones

| Riesgo | Mitigación |
| --- | --- |
| La interfaz se usa como única barrera | Exigir pruebas negativas directas del backend. |
| Una eliminación relacional queda incompleta | Operación atómica, lote explícito y auditoría correlacionada. |
| Restaurar revive registros eliminados anteriormente | Recuperar sólo miembros del mismo lote. |
| Dos administradores eliminan el último acceso administrativo | Validar atómicamente que permanezca al menos un `admin` activo. |
| Un enlace admite respuestas múltiples por concurrencia | Reclamo atómico y estado terminal tras la primera respuesta válida. |
| Una respuesta corregida borra historia | Crear un ciclo nuevo y conservar el anterior inmutable. |
| La auditoría acumula datos personales innecesarios | Registrar sólo cambios mínimos, identificadores internos y motivos necesarios. |
| La Etapa 2 se convierte en una migración amplia | Mantener planes, aprobaciones y entregas independientes. |

## 17. Reversión documental

Antes de integrar este contrato, su reversión consiste en descartar únicamente este archivo. Después de integrarlo, cualquier cambio funcional requiere una decisión documental posterior que conserve el historial; revertir la especificación no modifica por sí solo interfaz, Supabase ni datos.
