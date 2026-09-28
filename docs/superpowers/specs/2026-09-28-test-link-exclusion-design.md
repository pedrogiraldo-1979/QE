# Aislamiento del enlace de ensayo — diseño documental

Estado: aprobado por Pedro el 2026-09-28 **para documentar y revisar en un PR separado**. No autoriza implementación, modificación de QE2026, desactivación del enlace ni despliegue. La decisión de producto D-031 está propuesta en el [PR #32](https://github.com/pedrogiraldo-1979/QE/pull/32), aún separado de esta rama; este diseño depende de ella y no la fusiona.

## Problema y objetivo

La función productiva `get_cu_pending_reviews()` omite mediante dos valores literales ocho respuestas pendientes de un enlace de ensayo. Pedro confirmó que las ocho son pruebas y deben permanecer fuera de la cola real. La baseline estructural para proyectos vacíos no contiene esos valores, por lo que la diferencia funcional está documentada pero no resuelta. La revisión agregada también observó que el enlace de ensayo estaba activo y sin fecha de vencimiento; las funciones públicas `get_cu_form` y `submit_cu_form` aceptan un enlace activo no vencido. No se reproducen aquí el token, nombre de empresa, identificadores ni respuestas.

El objetivo futuro es conservar las ocho respuestas, impedir nuevos envíos por ese enlace y sustituir las exclusiones literales por una clasificación explícita. Hasta que se apruebe y complete un release independiente, QE2026 conserva sus filtros y datos actuales.

## Alternativas consideradas

1. **Clasificar el enlace y desactivarlo — opción recomendada.** Un campo booleano `cu_links.is_test` permite excluir respuestas por su enlace sin guardar tokens o nombres de prueba en la función. Desactivar el enlace impide nuevos envíos. Requiere cambios de esquema, datos y RPC, con gates propios.
2. **Desactivar el enlace y dejar los filtros literales.** Evita nuevos envíos con menos cambios, pero mantiene la diferencia entre QE2026 y la baseline y obliga a conservar valores concretos dentro de la función.
3. **Rechazar las ocho respuestas y quitar los filtros.** Conserva físicamente las filas, pero usa una decisión terminal de revisión para cerrar un ensayo; falsearía el historial operativo y no se recomienda.

## Diseño recomendado

La clasificación vive en `cu_links`, no en el nombre de la empresa ni en cada una de las ocho respuestas: las ocho comparten un único enlace. El futuro campo `is_test boolean not null default false` conserva el comportamiento de todos los enlaces existentes hasta marcar expresamente el de ensayo. La marca se administra sólo por los permisos ya previstos para `cu_links`; no se amplían grants ni políticas RLS por este diseño. No se añaden dependencias, servicios externos ni variables de entorno.

El cambio se separa en tres etapas con parada entre ellas:

1. **Preparar el esquema.** En una migración nueva, añadir `cu_links.is_test` con valor predeterminado `false`. Mantener los dos filtros productivos existentes. Verificar en un proyecto desechable que la nueva columna no cambia la cola ni habilita permisos cliente.
2. **Clasificar y desactivar el enlace confirmado.** Bajo una autorización de datos específica, comprobar el proyecto y el conjunto esperado, marcar **un único enlace** como `is_test = true` y poner `is_active = false` en una operación controlada. Conservar las ocho respuestas y sus estados. El identificador exacto se suministraría por un canal operativo protegido, nunca en Git, logs, PR o documentación. Si el enlace o los conteos no coinciden con el preflight, detenerse sin actualizar. Los filtros literales permanecen como protección durante esta etapa.
3. **Cambiar las RPC.** Sólo después de verificar la etapa 2, una migración nueva sustituiría en `get_cu_pending_reviews()` los filtros por `not l.is_test`. `admin_get_cu_pending_reviews()` conserva su gate de administrador. `get_cu_form` y `submit_cu_form` también rechazarían enlaces marcados como prueba, de forma que una reactivación accidental no reabra el formulario de ensayo. Las respuestas históricas no se reescriben.

Las migraciones históricas y `supabase/baselines/qe2026-schema-only.sql` no se editan retroactivamente. En proyectos nuevos, la baseline se aplicaría únicamente a una base vacía y los cambios futuros se reproducirían después mediante sus migraciones nuevas. El procedimiento de publicación D-030, propuesto también en el PR #32 y todavía no incorporado a `main`, deberá resolverse antes de cualquier release: no se presupone que `db push` sea seguro con el historial actual.

## Seguridad, pruebas y condiciones de parada

- Ensayar las tres etapas sólo en un proyecto desechable, identificado dos veces por `project_ref`, con empresas, enlaces y respuestas sintéticos. Probar un enlace real y otro de ensayo, respuestas pendientes en ambos, acceso `admin`/`member`, formulario anónimo antes y después de desactivar y ausencia de nuevas respuestas en el enlace de prueba.
- Regenerar y contrastar los tipos del esquema ensayado; repetir typecheck, pruebas, build y smoke pertinentes. La prueba autenticada y mutante no debe apuntar a QE2026.
- Antes de cada cambio productivo futuro: inventario actualizado, respaldo y plan de recuperación, revisión de SQL nuevo, dry-run que liste sólo la versión prevista y autorización explícita. Si el método de release o la selección de migraciones no son demostrables, detenerse.
- En QE2026, comprobar sin divulgar filas que hay exactamente un enlace de ensayo confirmado y que ninguna respuesta de ese enlace entra en la cola real. Tras el cambio de RPC, comprobar que la cola administrativa conserva las respuestas reales y excluye las ocho de ensayo. No basarse en que el total de respuestas reales permanezca fijo durante días: puede cambiar por operación normal.
- Si falla la clasificación o desactivación, no retirar los filtros literales. Si falla el cambio de RPC, detener el release y aplicar el plan de recuperación aprobado; la definición productiva anterior debe quedar resguardada fuera de Git porque contiene valores sensibles. No reactivar automáticamente el enlace de ensayo como parte de un rollback.

## Límites y revisión

Este PR contendrá sólo esta especificación. No crea migraciones, modifica funciones, esquema, RLS, Auth, datos, tipos generados, frontend ni configuración. No ejecuta SQL sobre QE2026 ni pruebas mutantes. El diseño técnico definitivo y cada etapa productiva requieren aprobación separada después de revisar esta especificación y el estado del PR #32.
