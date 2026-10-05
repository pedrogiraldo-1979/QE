# Reprogramación de actividades con selector de fecha

## Alcance aprobado

Pedro aprobó reemplazar el diálogo nativo de reprogramación por un selector de fecha con Guardar y Cancelar. Se trabaja en `codex/phase-9-activity-feedback`, sobre `main` publicado `57cd6d8`, conservando la corrección de confirmaciones `497d849`.

## Alternativas y elección

- Conservar `window.prompt`: mínimo cambio, pero exige escribir el formato y bloquea la comprobación con el navegador integrado.
- Formulario inline en la actividad (elegido): mantiene el contexto de cliente/prospecto, usa controles HTML conocidos y no necesita gestión de foco de un modal.
- Modal: separa la edición, pero añade foco contenido, cierre y presentación sin beneficio necesario para un único campo.

## Interfaz y comportamiento

Al pulsar Reprogramar, la misma fila muestra un formulario con etiqueta «Nueva fecha de vencimiento», input `type=date`, Guardar y Cancelar. Sólo se edita una actividad a la vez. Se precarga su fecha actual o, si no existe, la fecha de referencia que ya usa el workbench. Se permite una fecha pasada: este ajuste no añade reglas comerciales.

El campo recibe el foco al abrir. Cancelar no ejecuta ninguna escritura, cierra el formulario y devuelve el foco al botón Reprogramar. Escape equivale a Cancelar cuando no se está guardando. Salir de la vista descarta la edición sin escribir.

Guardar exige una fecha real y no vacía en formato YYYY-MM-DD. Durante el guardado se bloquean las acciones que podrían duplicar o interrumpir la operación. Un error conserva fecha y formulario y muestra un mensaje genérico, sin detalles del backend. Un éxito cierra el formulario, recarga la cola conservando «Actividad reprogramada.» y devuelve el foco al botón si la fila permanece visible; si sale de la cola, al encabezado de actividades. El estado informativo será anunciable para tecnología de asistencia.

## Datos y límites

Se conserva la selección de tabla por origen y la actualización existente por ID con `{ due_date: fecha, completed: false }`. No cambia la entidad, notas ni tipo. No se cambia esquema, RLS, Auth, RPC, dependencias, servicios o configuración. Tampoco se reorganizan rutas ni se extraen módulos de páginas. La ausencia de verificación de filas afectadas es una limitación preexistente y no se declarará resuelta con este cambio.

## Implementación acotada

Estado de edición y guardado, formulario y validación dentro de `ActivitiesOperationalWorkbench.tsx`; ajustes responsive mínimos en su hoja existente si hacen falta. Adaptar las pruebas de handlers para suministrar la fecha desde el formulario en lugar de un prompt. No crear una ruta pública de ensayo ni incluir credenciales o fixtures reales.

## Verificación y aceptación

Pruebas previas a implementación: fecha vacía, formato inválido, fecha imposible y año bisiesto; cancelación sin escritura; contrato de tabla/ID/patch para cliente y prospecto; confirmación conservada; error con formulario y valores preservados; bloqueo mientras guarda.

Ejecutar typecheck, suite, build y smoke de producción local. Comprobar visualmente apertura, foco, teclado, cancelación y ausencia de overflow a 390 px. La persistencia autenticada sólo podrá probarse en el proyecto desechable confirmado, con autorización aplicable, limpieza y pausa al terminar; no en producción. Si esa comprobación no se realiza, quedará explícitamente pendiente y ACT-02 no se cerrará.

No se publica, fusiona o despliega como consecuencia automática de aprobar este diseño.
