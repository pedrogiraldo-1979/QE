# Prospect contact edit safety — Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans inline. No delegation under the current collaboration rules.

**Goal:** Proteger únicamente el guardado de un contacto de prospecto existente.

**Architecture:** Mantener el handler y la tarjeta en su ruta actual. Una ref impide envíos y cambios de editor simultáneos; un estado deshabilita los controles. Conservar payload, filtro por ID y contrato de columnas; sólo confirmar una fila con el ID y prospecto esperados.

**Tech Stack:** Next.js, React, TypeScript y node:test existentes, sin dependencias nuevas.

## Global constraints

- Rama `codex/phase-9-prospect-contact-edit-safety` desde `origin/main` (`a4082c2`). Los PR #44 y #45 no se incorporan ni fusionan.
- No cambiar Supabase, tipos generados, esquema, RLS, Auth, datos, variables ni configuración.
- No tocar alta de contactos, edición de empresas, estados, conversión, rutas o estilos compartidos.
- No reintentar automáticamente ni registrar datos o errores privados.
- La protección es por editor montado, no idempotencia entre pestañas. Navegación y recarga global siguen fuera de alcance.

## Task 1 — Guardado seguro y regresiones

**Files:** modificar `src/app/prospectos/[listId]/page.tsx`; crear `tests/prospectContactEditSafety.test.mjs`; registrar evidencia en `docs/AUDIT.md`.

**Interfaces:** conservar `updateContact(event: FormEvent<HTMLFormElement>, contact: ProspectContact)`. Añadir `savingContact: boolean` y `contactEditInFlightRef`, y `cancelEditingContact(): void`. La tarjeta consume `saving: boolean`.

- [x] Escribir pruebas ejecutando el handler real, sustituyendo sólo transporte y setters. Cubrir excepción, error devuelto, doble envío, respuesta nula/ID diferente/prospecto diferente, conservación del formulario, contrato del payload, nombre vacío y reintento manual. Ejemplo de aserciones:

```js
const first = h.submit();
const second = h.submit();
assert.equal(h.calls.length, 1);
assert.equal(h.state.saving, true);
finish({ data: updated, error: null });
await Promise.all([first, second]);
assert.equal(h.state.editing, null);
```

- [x] Ejecutar `node --test tests/prospectContactEditSafety.test.mjs` y comprobar fallos por ausencia de la guarda, manejo de excepción y validación de respuesta: RED 9 fallos/2 contratos existentes aprobados; GREEN 11/11.
- [x] Implementar la guarda antes de escribir, y liberarla siempre:

```ts
if (contactEditInFlightRef.current || !editContact.full_name.trim()) return;
contactEditInFlightRef.current = true;
setSavingContact(true);
setMessage(null);
try {
  const { data, error } = await supabase
    .from("prospect_contacts")
    .update({
      full_name: editContact.full_name.trim(),
      role: nullIfBlank(editContact.role),
      email: normalizeEmail(editContact.email),
      phone: nullIfBlank(editContact.phone),
      linkedin_url: nullIfBlank(editContact.linkedin_url),
      notes: nullIfBlank(editContact.notes),
      updated_at: new Date().toISOString(),
    })
    .eq("id", contact.id)
    .select(PROSPECT_CONTACT_COLUMNS)
    .single();
  if (error || !data || data.id !== contact.id || data.prospect_id !== contact.prospect_id) {
    setMessage("No se pudo confirmar la actualización del contacto. Revisa sus datos antes de intentar de nuevo.");
    return;
  }
  const updated = data as ProspectContact;
  setContacts(current => current.map(item => item.id === contact.id ? updated : item));
  setEditingContactId(null);
  setEditContact(emptyContactForm);
  setMessage("Contacto prospecto actualizado.");
} catch {
  setMessage("No se pudo confirmar la actualización del contacto. Revisa sus datos antes de intentar de nuevo.");
} finally {
  contactEditInFlightRef.current = false;
  setSavingContact(false);
}
```

- [x] Proteger `startEditingContact` y `cancelEditingContact` con la misma ref. En la tarjeta, añadir un fieldset `disabled={saving}` con `aria-busy={saving}` y estilo neutro; mostrar `Guardando` durante el envío; deshabilitar los botones Editar de otras tarjetas mientras está pendiente.
- [x] Ejecutar pruebas específicas, `pnpm typecheck`, `pnpm test`, `pnpm build`; iniciar `pnpm start` y ejecutar `pnpm test:smoke`: 120/120 pruebas, build y smoke 13/13 aprobados. Detalle dinámico: HTTP 200. Acceso público hidratado, consola sin errores/avisos y ancho de contenido 390 px en viewport de 390 px. Sin inicio de sesión ni mutaciones; el flujo autenticado permanece pendiente.
- [ ] Revisar diff/secretos/alcance, registrar evidencia, crear un commit y publicar PR borrador independiente contra main. No hacer merge.

## Review gate

Antes de release: verificar el editor autenticado en entorno aislado autorizado. El alta de contactos y el fallo Android del PR #44 permanecen pendientes y no quedan cubiertos por esta unidad.
