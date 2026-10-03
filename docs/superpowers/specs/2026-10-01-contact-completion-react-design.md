# Diseño: editor React directo para contactos

## Estado

- Diseño aprobado en conversación por Pedro el 2026-10-01.
- Implementado localmente; no publicado. La prueba autenticada de lectura/edición/guardado se completó el 2026-10-01, con autorización separada, en un proyecto temporal cuyos datos se limpiaron y que quedó pausado; la revisión visual local a 390×844 se completó el 2026-10-02. Evidencia en [AUDIT.md](../../AUDIT.md). Sigue pendiente validar el preview. Esta especificación no autoriza nuevas mutaciones ni cambios de Supabase.
- Alcance: reemplazar únicamente `ContactCompletionBridge` en la vista Contactos del dashboard `/`.

## Problema observado

`ContactsTable` ya renderiza una acción React por contacto y su callback actual prepara un mensaje genérico. En paralelo, `ContactCompletionBridge` captura los clics antes del callback, identifica el registro leyendo celdas de la tabla y compara nombre, teléfono y empresa. Si el nombre se repite, las heurísticas pueden seleccionar un registro distinto. El bridge además mantiene una lectura local de `contacts`, una escucha global de clics, dos `MutationObserver`, un portal y una consulta al botón de refresco del DOM.

## Diseño aprobado

1. `ContactsTable` emitirá el `Contact` de la fila seleccionada (y, por tanto, su ID estable) a un callback con un nombre explícito de edición. El flujo no inferirá identidad a partir de texto visible.
2. Un componente React enfocado al editor mostrará un panel inline dentro de la vista Contactos y usará una referencia React para desplazarlo a la vista al abrirlo, conservando el acceso inmediato del bridge actual sin seleccionar nodos globales. Al abrir, moverá el foco a su encabezado con nombre de contacto; al cerrar/cancelar, la página restaurará el foco al botón exacto que originó la apertura, si sigue conectado. El panel conservará los cinco campos y la interacción existentes: nombre obligatorio; rol, email, teléfono y notas opcionales; cancelar/cerrar; indicador de guardado; mensajes de error y confirmación.
3. La página `/` será dueña de la mutación y el estado de datos. Actualizará `contacts` por `id` con el mismo contenido funcional del bridge: nombre, rol, email normalizado, teléfono, notas y `updated_at`. Los valores vacíos opcionales continuarán almacenándose como `null`; el nombre seguirá recortado y colapsado en espacios, y el email convertido a minúsculas. La mutación seleccionará el contrato de columnas existente y actualizará `data.contacts` sólo tras éxito. Un error mantiene el formulario abierto y no altera el estado local.
4. La vista utilizará los contactos ya cargados por `useCrmDashboardData`; no conservará la consulta adicional de contactos del bridge ni simulará un clic en “Refrescar”. Tras guardar, el panel permanecerá abierto con los datos devueltos y la tabla reflejará el registro actualizado.
5. Al completar la equivalencia se retirará únicamente `ContactCompletionBridge`: su importación dinámica y montaje en `CrmClientBridges`, la importación/archivo CSS dedicado y el propio componente. Se conservarán intactos los otros cuatro bridges y los estilos de ellos.

## Archivos previstos

- Modificar `src/components/crm/ContactsTable.tsx` para entregar el registro exacto al callback de edición.
- Crear `src/components/crm/ContactQuickEditPanel.tsx` para el panel y su estado de formulario, sin acceso directo a Supabase.
- Modificar `src/app/page.tsx` para seleccionar por ID, ejecutar la mutación desde el cliente existente, actualizar `data.contacts` y renderizar el panel sólo en la vista Contactos.
- Modificar `src/components/CrmClientBridges.tsx` para desmontar sólo `ContactCompletionBridge`.
- Modificar `src/app/layout.tsx` y renombrar `src/app/contact-completion-bridge.css` a `src/app/contact-quick-edit.css`, conservando las reglas visuales necesarias del panel.
- Crear `src/features/crm/contactEditorModel.ts` y `tests/contactEditorModel.test.mjs` para validar y normalizar los campos de manera pura y testeable.
- Actualizar `tests/dataContracts.test.mjs` para asegurar que la acción de la fila entrega el contacto/ID por React y que el coordinador ya no monta el bridge retirado.
- Eliminar `src/components/ContactCompletionBridge.tsx` y el nombre CSS anterior sólo en la misma entrega en que panel, guardado y gates queden aprobados.

## Pruebas de aceptación

- Pruebas de modelo: nombre vacío es rechazado; el nombre se recorta y normaliza; email se recorta y pasa a minúsculas; opcionales vacíos se convierten en `null`; los valores no vacíos se conservan tras el saneamiento existente.
- Prueba de contrato de UI: la fila seleccionada entrega su `contact.id` y no requiere `document`, selectores de tabla ni matching textual.
- Guardado correcto: modifica sólo el ID seleccionado con los cinco campos editables y `updated_at`; actualiza la fila local con el registro devuelto y conserva el panel abierto con confirmación.
- Error de guardado: presenta el error de forma visible en el panel, conserva los valores escritos y no cambia `data.contacts`; no exponer credenciales ni datos de otros contactos.
- Cancelación/cierre: no ejecuta la mutación y no descarta cambios sin una acción explícita del usuario.
- Teclado: después de abrir desde la fila, el encabezado recibe foco; Tab entra al primer control del panel; Cerrar y Cancelar devuelven foco al botón que abrió el panel.
- Regresión: `pnpm typecheck`, `pnpm test`, `pnpm build`, `pnpm start` y `pnpm test:smoke`; revisión visual autenticada de Contactos en escritorio y móvil, con teclado/foco y estados de carga, éxito y error.

## Límites de seguridad y release

- No alterar esquema, tablas, columnas, RPC, RLS, Auth, Edge Functions, secretos ni permisos.
- No probar el guardado contra QE2026, producción ni una preview que apunte a datos productivos.
- La cobertura que requiera ejecutar la mutación debe usar un proyecto descartable ya aprobado, confirmar el `project_ref` y utilizar fixtures sintéticos. Si el entorno aislado no está disponible, el gate de guardado remoto queda pendiente y no se declara equivalencia completa.
- La previsualización visual no guardará cambios. No se crearán ni reactivarán proyectos Supabase como parte de esta especificación.
- Reversión: revertir el commit exclusivo del reemplazo; restaura el import, montaje, stylesheet y bridge anteriores. No revertir ni modificar datos.

## Fuera de alcance

- `AddActivityEntryBridge`, `HomeCommercialWorkbench`, `ActivitiesOperationalWorkbench` y `LegacyViewLayoutPolish`.
- Cambios en `useCrmDashboardData`, repositorios compartidos o contratos de columnas más allá de lo necesario para usar el contrato existente.
- Nuevas validaciones de negocio, conversión de datos, eliminación lógica o cambios de permisos.
