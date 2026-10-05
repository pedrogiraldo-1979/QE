# Confirmación de escritura de actividades

## Diseño aprobado

Pedro aprobó comprobar la fila actualizada antes de anunciar éxito al completar o reprogramar una actividad. Rama: `codex/phase-9-activity-write-verification`, desde `main` publicado `f7871f7`. Este documento precede al plan y a la implementación.

## Problema y alternativas

Los dos handlers actuales sólo comprueban `error`. Una actualización sin filas afectadas puede terminar sin error, por lo que esa comprobación no acredita el guardado.

- Elegido: solicitar únicamente `id` en la respuesta de la misma actualización y comprobar que devuelve exactamente una fila con el ID solicitado.
- Descartado: consultar después de actualizar. Añade otra petición y una lectura posterior no demuestra por sí sola que esta operación haya escrito.

## Contrato acotado

Conservar las tablas por origen (`activities` o `prospect_activities`), el filtro por ID y los patches existentes: `{ completed: true }` al completar y `{ due_date: nextDate, completed: false }` al reprogramar. Encadenar `.select("id")` a cada actualización. Sólo una respuesta sin error, con exactamente una fila y el ID solicitado, permite anunciar éxito y efectuar la recarga habitual.

Un error, respuesta vacía/nula, más de una fila o ID distinto muestra un aviso genérico: no se pudo confirmar la actualización. No se afirma que la escritura necesariamente haya fallado: una interrupción de transporte puede dejar un resultado incierto. No habrá reintento automático ni una segunda escritura. Reprogramar conservará el formulario y la fecha; completar no anunciará éxito. Las excepciones de transporte tampoco expondrán detalles del backend. No se registran IDs, payloads ni errores privados en logs.

Se conserva el comportamiento de foco, confirmaciones y recarga posterior a éxito del PR #40. No se amplía este ajuste a concurrencia entre acciones, timezone, otras pantallas, reorganización de rutas o extracción de módulos.

## Verificación

Extender el harness existente para sustituir exclusivamente el transporte y ejecutar los handlers reales. Cubrir ambos orígenes y ambas acciones: una fila correcta, cero filas, respuesta nula, ID diferente, múltiples filas, error explícito y excepción. Verificar filtro/tabla/patch y selección exclusiva de `id`; ausencia de éxito/recarga ante resultado no confirmado; conservación de edición/fecha al reprogramar y liberación del estado de guardado. Mantener las pruebas previas de fecha, cancelación, foco y confirmaciones.

Ejecutar typecheck, suite completa, build y smoke contra servidor de producción local. Revisar el diff para excluir secretos, fixtures y artefactos generados. Documentar qué evidencia es local y qué validación remota sigue pendiente; las pruebas locales no cierran por sí solas ACT-02.

## Límites y gates

No se cambian esquema, RLS, RPC, Auth, dependencias, servicios, variables, migraciones ni datos productivos. No regenerar tipos desde producción como efecto de este diseño: las columnas ya existentes no cambian y cualquier contraste remoto será de sólo lectura y tendrá alcance explícito. Una prueba autenticada mutante requerirá autorización separada para el proyecto desechable confirmado, limpieza y pausa final. Push, PR, merge y producción no quedan autorizados por aprobar este documento.

## Fuente

La documentación oficial de actualización de Supabase describe el retorno de filas mediante `select`: https://supabase.com/docs/reference/javascript/update . La implementación se contrastará también con la versión instalada del cliente.
