# Guía breve de uso diario del CRM

Preparada el 2026-10-09 sobre el release `361f63b` del PR #48. No certifica todavía la aceptación por la operadora ni Android Chrome.

## Entrada y rutina

1. Abrir [el CRM publicado](https://qe-crm.vercel.app/), no una URL de preview ni localhost.
2. Iniciar sesión con la cuenta comercial autorizada. La contraseña del CRM no es la de Vercel, la contraseña de la base Supabase ni una clave de cifrado. No compartir claves en chats.
3. En Inicio, revisar los seguimientos vencidos y las acciones sugeridas. Los contadores actuales no son todavía los tres indicadores exactos de D-032 ni una evaluación de desempeño.
4. Buscar la empresa o el prospecto antes de crear otro. Revisar nombre, NIT si existe y contactos para evitar duplicados.
5. Después de una gestión comercial real, registrar una actividad en la entidad correcta y dejar el siguiente paso con su fecha cuando corresponda.
6. Al terminar, cerrar sesión, especialmente en equipos compartidos.

## Clientes y contactos

- Buscar la empresa, abrir su detalle y comprobar que sea la entidad correcta.
- Completar sólo información conocida. No inventar nombre, cargo, email ni teléfono para eliminar un aviso de calidad.
- Antes de guardar, revisar los campos modificados. Esperar la confirmación y comprobar el resultado; recargar permite contrastar persistencia.
- No crear contactos repetidos para corregir un contacto existente: usar su editor cuando esté disponible.

## Seguimientos

- Crear la actividad vinculada al cliente o prospecto correspondiente.
- Completarla sólo cuando la acción se realizó. Si cambia la fecha, reprogramar indicando una fecha válida; no marcar como completada para ocultar un vencimiento.
- Las notas no sustituyen una acción futura con fecha. No cambiar fechas ni estados de forma masiva.

## Prospección

- Abrir una lista y seleccionar el prospecto correcto antes de editar empresa o contacto.
- Los guardados de edición de prospecto y edición/alta de contacto muestran estado pendiente y bloquean el doble envío simultáneo en esa instancia.
- Una respuesta incierta conserva el formulario. Antes de reintentar un alta, revisar si el contacto ya apareció: la protección no garantiza deduplicación entre pestañas o reintentos manuales.
- El alta de prospectos del PR #44 y su validación Android continúan pendientes; no confundir la entrega #48 con aquel arreglo.
- No convertir coincidencias ambiguas, fusionar registros ni borrar datos como parte de la prueba inicial.

## Operaciones administrativas

Si el acceso autorizado permite revisar actualizaciones de clientes, aprobar únicamente información comprobada. Una aprobación con cambios no significa que las hojas maestras estén actualizadas: la conciliación debe verificarse en ambas hojas antes de marcarla terminada.

No usar Piloto de campaña ni Prueba de correo durante el onboarding. Un envío nuevo requiere aprobación independiente. No se ofrece todavía eliminación recuperable; mantener bloqueado el borrado físico.

## Si algo falla

- Si no hay confirmación de guardado, no asumir éxito ni insistir repetidamente. Conservar lo escrito y comprobar el registro antes de reintentar.
- Si aparece un error de acceso, no cambiar permisos ni intentar otra clave de servicio: comunicarlo a Pedro.
- Para reportar, indicar pantalla, acción, hora y mensaje genérico. No enviar contraseñas, tokens, payloads, datos de clientes ni capturas que los expongan.
- Ante pantalla en blanco en Android, mantener el pendiente separado y usar un equipo ya validado; no desactivar protecciones del navegador ni de Vercel.

## Aceptación pendiente con la operadora

Realizar una sesión guiada: entrar/salir, buscar/abrir empresa, consultar contacto, localizar un prospecto y entender la diferencia entre éxito y respuesta incierta. Cualquier creación, edición o seguimiento real durante esa sesión requiere acordar antes los registros y operaciones; esta guía no autoriza escribir datos productivos como prueba.

Registrar sólo fecha, flujo, resultado y dificultad observada. No compartir la contraseña. La prueba de Android sigue siendo un pendiente distinto.
