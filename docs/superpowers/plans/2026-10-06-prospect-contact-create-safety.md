# Prospect contact creation safety — Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans inline; no delegation under current collaboration rules.

**Goal:** Proteger únicamente «Agregar contacto» dentro del detalle de un prospecto.

**Architecture:** Conservar handler, ruta, payload y contrato actuales. Una ref bloquea envíos simultáneos y un estado deshabilita el formulario. Una respuesta incierta conserva el borrador y pide revisar contactos antes de reintentar, sin afirmar que la escritura falló.

**Tech Stack:** Next.js, React, TypeScript y node:test existentes.

## Global constraints

- Rama `codex/phase-9-prospect-contact-create-safety` desde main `a4082c2`; no incorporar ni fusionar PR #44, #45 o #46.
- Sin modificaciones de Supabase, esquema, Auth, RLS, datos, tipos generados, configuración, dependencias o variables nuevas.
- No cambiar edición de contactos, edición/alta de empresas, estados, conversión, rutas o CSS compartido.
- No reintentos automáticos; no logs de payloads, credenciales o errores privados.
- Guarda por instancia montada, no deduplicación entre pestañas ni garantía ante reintentos posteriores a una respuesta incierta.

## Task 1 — Alta protegida

**Files:** modificar `src/app/prospectos/[listId]/page.tsx`; crear `tests/prospectContactCreateSafety.test.mjs`; añadir evidencia fechada en `docs/AUDIT.md`.

**Interfaces:** conservar `addContact(event: FormEvent<HTMLFormElement>)`; añadir `savingNewContact: boolean` y `newContactInFlightRef`.

- [x] Escribir pruebas del handler real con sólo transporte y setters sustituidos: doble envío, excepción, error, respuesta nula, ID inválido, prospecto distinto, validaciones actuales, payload y reintento manual. Aserción principal:

```js
const first = h.submit();
const second = h.submit();
assert.equal(h.calls.length, 1);
finish({ data: created, error: null });
await Promise.all([first, second]);
assert.equal(h.state.contacts.length, 2); // contacto previo y uno nuevo
```

- [x] Ejecutar `node --test tests/prospectContactCreateSafety.test.mjs` y observar fallos por las protecciones ausentes, antes de cambiar producción: RED 10 fallos/2 contratos existentes aprobados; GREEN 12/12.
- [x] Implementar el siguiente flujo conservando los campos existentes:

```ts
event.preventDefault();
if (newContactInFlightRef.current || !selectedProspect || !newContact.full_name.trim()) return;
const prospectId = selectedProspect.id;
newContactInFlightRef.current = true;
setSavingNewContact(true);
setMessage(null);
try {
  const { data, error } = await supabase
    .from("prospect_contacts")
    .insert({
      prospect_id: prospectId,
      full_name: newContact.full_name.trim(),
      role: nullIfBlank(newContact.role),
      email: normalizeEmail(newContact.email),
      phone: nullIfBlank(newContact.phone),
      linkedin_url: nullIfBlank(newContact.linkedin_url),
      notes: nullIfBlank(newContact.notes),
    })
    .select(PROSPECT_CONTACT_COLUMNS)
    .single();
  if (error || !data || typeof data.id !== "string" || !data.id.trim() || data.prospect_id !== prospectId) {
    setMessage("No se pudo confirmar el alta del contacto. Revisa los contactos del prospecto antes de intentar de nuevo.");
    return;
  }
  setContacts(current => [data as ProspectContact, ...current]);
  setNewContact(emptyContactForm);
  setMessage("Contacto prospecto agregado.");
} catch {
  setMessage("No se pudo confirmar el alta del contacto. Revisa los contactos del prospecto antes de intentar de nuevo.");
} finally {
  newContactInFlightRef.current = false;
  setSavingNewContact(false);
}
```

- [x] Envolver únicamente los campos y botón de alta en `<fieldset disabled={savingNewContact} aria-busy={savingNewContact} className="form-stack" style={{ border: 0, margin: 0, padding: 0, minWidth: 0 }}>`; usar etiqueta `{savingNewContact ? "Guardando" : "Agregar contacto"}`.
- [x] Ejecutar prueba específica, `pnpm typecheck`, `pnpm test` y build con las variables públicas existentes; `pnpm start`, `pnpm test:smoke` y comprobación de hidratación pública: 12/12 específicas, 121/121 totales, build y smoke 13/13 aprobados. Detalle dinámico HTTP 200; login hidratado, consola sin errores/avisos, contenido de 390 px en viewport 390 px. Sin sesión ni mutaciones; servidor temporal detenido tras comprobar su identidad.
- [ ] Revisar diff y secretos, registrar evidencia, crear un commit y PR borrador separado contra main; esperar CI/Vercel sin merge ni producción.

## Gate antes de release

El formulario autenticado requiere prueba en entorno aislado autorizado. El reporte Android del PR #44 permanece pendiente; esta unidad no lo resuelve ni autoriza fusionar las otras ramas.
