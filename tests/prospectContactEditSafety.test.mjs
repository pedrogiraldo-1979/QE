import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const source = await readFile(new URL("../src/app/prospectos/[listId]/page.tsx", import.meta.url), "utf8");
const uncertain = "No se pudo confirmar la actualización del contacto. Revisa sus datos antes de intentar de nuevo.";
const original = { id: "synthetic-contact", prospect_id: "synthetic-prospect", full_name: "Antes", role: null, email: null, phone: null, linkedin_url: null, notes: null, created_at: "2026-01-01T00:00:00Z", updated_at: "2026-01-01T00:00:00Z" };
const updated = { ...original, full_name: "Contacto" };

// Run the production handlers; substitute only external transport and React setters.
function harness({ response = async () => ({ data: updated, error: null }), name = "  Contacto  " } = {}) {
  const editContact = { full_name: name, role: "", email: "", phone: "", linkedin_url: "", notes: " Nota " };
  const state = { saving: false, message: "Aviso anterior", contacts: [original], editing: original.id, form: editContact };
  const calls = [];
  const contactEditInFlightRef = { current: false };
  const scope = { editContact, emptyContactForm: {}, contactEditInFlightRef, PROSPECT_CONTACT_COLUMNS: "contract", nullIfBlank: value => value.trim() || null, normalizeEmail: value => value.trim().toLowerCase() || null,
    setSavingContact: value => { state.saving = value; }, setMessage: value => { state.message = value; }, setContacts: updater => { state.contacts = updater(state.contacts); }, setEditingContactId: value => { state.editing = value; }, setEditContact: value => { state.form = value; },
    supabase: { from: table => ({ update: payload => ({ eq: (column, id) => { calls.push({ table, column, id, payload }); return { select: columns => { calls.at(-1).columns = columns; return { single: response }; } }; } }) }) },
  };
  const handlers = source.slice(source.indexOf("  function startEditingContact("), source.indexOf("  const normalizedSearch"));
  const js = ts.transpileModule(`${handlers}\nreturn { updateContact, startEditingContact, cancel: typeof cancelEditingContact === "function" ? cancelEditingContact : () => { setEditingContactId(null); setEditContact(emptyContactForm); } };`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  const run = new Function(...Object.keys(scope), js)(...Object.values(scope));
  return { state, calls, ref: contactEditInFlightRef, submit: () => run.updateContact({ preventDefault() {} }, original), start: run.startEditingContact, cancel: run.cancel };
}

for (const mode of ["exception", "returned error"]) {
  test(`editar contacto prospecto: ${mode} conserva editor y no expone detalles`, async () => {
    const h = harness({ response: async () => { if (mode === "exception") throw Error("Private detail"); return { data: null, error: { message: "Private detail" } }; } });
    await assert.doesNotReject(h.submit());
    assert.equal(h.state.message, uncertain);
    assert.equal(h.state.saving, false);
    assert.equal(h.ref.current, false);
    assert.equal(h.state.form.full_name, "  Contacto  ");
    assert.equal(h.state.editing, original.id);
    assert.deepEqual(h.state.contacts, [original]);
    assert.equal(h.calls.length, 1);
  });
}

test("editar contacto prospecto: doble envío pendiente sólo actualiza una vez", async () => {
  let finish;
  const pending = new Promise(resolve => { finish = resolve; });
  const h = harness({ response: () => pending });
  const first = h.submit();
  const second = h.submit();
  const count = h.calls.length;
  const saving = h.state.saving;
  const message = h.state.message;
  finish({ data: updated, error: null });
  await Promise.all([first, second]);
  assert.equal(count, 1);
  assert.equal(saving, true);
  assert.equal(message, null);
  assert.deepEqual(h.state.contacts, [updated]);
  assert.equal(h.state.editing, null);
  assert.deepEqual(h.state.form, {});
  assert.equal(h.state.message, "Contacto prospecto actualizado.");
  assert.equal(h.ref.current, false);
  assert.equal(h.state.saving, false);
});

test("editar contacto prospecto: bloquea cerrar y cambiar de editor mientras guarda", async () => {
  let finish;
  const pending = new Promise(resolve => { finish = resolve; });
  const h = harness({ response: () => pending });
  const first = h.submit();
  h.cancel();
  h.start({ ...original, id: "other-synthetic", full_name: "Otra persona" });
  const editing = h.state.editing;
  const name = h.state.form.full_name;
  finish({ data: null, error: { message: "Private detail" } });
  await first;
  assert.equal(editing, original.id);
  assert.equal(name, "  Contacto  ");
  h.cancel();
  assert.equal(h.state.editing, null);
});

for (const data of [null, { ...updated, id: "different-synthetic" }, { ...updated, prospect_id: "different-prospect" }]) {
  test(`editar contacto prospecto: ${data ? (data.id !== original.id ? "ID distinto" : "prospecto distinto") : "respuesta nula"} no confirma éxito`, async () => {
    const h = harness({ response: async () => ({ data, error: null }) });
    await assert.doesNotReject(h.submit());
    assert.equal(h.state.message, uncertain);
    assert.equal(h.state.editing, original.id);
    assert.equal(h.state.form.full_name, "  Contacto  ");
    assert.deepEqual(h.state.contacts, [original]);
    assert.equal(h.state.saving, false);
  });
}

test("editar contacto prospecto: conserva contrato por ID, columnas y payload", async () => {
  const h = harness();
  await h.submit();
  const { updated_at, ...payload } = h.calls[0].payload;
  assert.deepEqual({ table: h.calls[0].table, column: h.calls[0].column, id: h.calls[0].id, columns: h.calls[0].columns }, { table: "prospect_contacts", column: "id", id: original.id, columns: "contract" });
  assert.ok(Number.isFinite(Date.parse(updated_at)));
  assert.deepEqual(payload, { full_name: "Contacto", role: null, email: null, phone: null, linkedin_url: null, notes: "Nota" });
});

test("editar contacto prospecto: nombre vacío no escribe", async () => {
  const h = harness({ name: "   " });
  await h.submit();
  assert.equal(h.calls.length, 0);
  assert.equal(h.ref.current, false);
});

test("editar contacto prospecto: libera guarda para un reintento manual posterior", async () => {
  let attempts = 0;
  const h = harness({ response: async () => { if (++attempts === 1) throw Error("Private detail"); return { data: updated, error: null }; } });
  await assert.doesNotReject(h.submit());
  await h.submit();
  assert.equal(h.calls.length, 2);
  assert.equal(h.state.message, "Contacto prospecto actualizado.");
});

test("editar contacto prospecto: UI protege controles y no cambia el formulario de alta", () => {
  assert.match(source, /saving=\{savingContact\}/);
  assert.match(source, /onCancelEdit=\{cancelEditingContact\}/);
  const card = source.slice(source.indexOf("function EditableProspectContactCard("), source.indexOf("function QualityPanel("));
  assert.match(card, /<fieldset disabled=\{saving\} aria-busy=\{saving\}/);
  assert.match(card, /\{saving \? "Guardando" : "Guardar contacto"\}/);
  assert.match(card, /disabled=\{saving\} onClick=\{onStartEdit\}/);
  assert.match(source, /<form className="activity-form" onSubmit=\{addContact\}>/);
});
