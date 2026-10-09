import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const source = await readFile(new URL("../src/app/prospectos/[listId]/page.tsx", import.meta.url), "utf8");
const uncertain = "No se pudo confirmar el alta del contacto. Revisa los contactos del prospecto antes de intentar de nuevo.";
const created = { id: "synthetic-contact", prospect_id: "synthetic-prospect", full_name: "Contacto", role: "Compras", email: "synthetic@example.invalid", phone: "123", linkedin_url: "https://example.invalid/profile", notes: "Nota", created_at: "2026-01-01T00:00:00Z", updated_at: "2026-01-01T00:00:00Z" };
const existing = { ...created, id: "existing-synthetic" };

// Exercise the production handler; replace only external transport and React setters.
function harness({ response = async () => ({ data: created, error: null }), selected = { id: created.prospect_id }, name = "  Contacto  " } = {}) {
  const form = { full_name: name, role: " Compras ", email: " SYNTHETIC@EXAMPLE.INVALID ", phone: " 123 ", linkedin_url: " https://example.invalid/profile ", notes: " Nota " };
  const state = { saving: false, message: "Aviso anterior", contacts: [existing], form };
  const calls = [];
  const newContactInFlightRef = { current: false };
  const scope = { selectedProspect: selected, newContact: form, emptyContactForm: {}, newContactInFlightRef, PROSPECT_CONTACT_COLUMNS: "contract", nullIfBlank: value => value.trim() || null, normalizeEmail: value => value.trim().toLowerCase() || null,
    setSavingNewContact: value => { state.saving = value; }, setMessage: value => { state.message = value; }, setContacts: updater => { state.contacts = updater(state.contacts); }, setNewContact: value => { state.form = value; },
    supabase: { from: table => ({ insert: payload => { calls.push({ table, payload }); return { select: columns => { calls.at(-1).columns = columns; return { single: response }; } }; } }) },
  };
  const handler = source.slice(source.indexOf("  async function addContact("), source.indexOf("  function startEditingContact("));
  const js = ts.transpileModule(`${handler}\nreturn addContact;`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  const run = new Function(...Object.keys(scope), js)(...Object.values(scope));
  return { state, calls, ref: newContactInFlightRef, submit: () => run({ preventDefault() {} }) };
}

for (const mode of ["exception", "returned error"]) {
  test(`agregar contacto prospecto: ${mode} conserva borrador y no expone detalles`, async () => {
    const h = harness({ response: async () => { if (mode === "exception") throw Error("Private detail"); return { data: null, error: { message: "Private detail" } }; } });
    await assert.doesNotReject(h.submit());
    assert.equal(h.state.message, uncertain);
    assert.equal(h.state.saving, false);
    assert.equal(h.ref.current, false);
    assert.equal(h.state.form.full_name, "  Contacto  ");
    assert.deepEqual(h.state.contacts, [existing]);
    assert.equal(h.calls.length, 1);
  });
}

test("agregar contacto prospecto: doble envío pendiente crea una solicitud", async () => {
  let finish;
  const pending = new Promise(resolve => { finish = resolve; });
  const h = harness({ response: () => pending });
  const first = h.submit();
  const second = h.submit();
  const count = h.calls.length;
  const saving = h.state.saving;
  const message = h.state.message;
  finish({ data: created, error: null });
  await Promise.all([first, second]);
  assert.equal(count, 1);
  assert.equal(saving, true);
  assert.equal(message, null);
  assert.deepEqual(h.state.contacts, [created, existing]);
  assert.deepEqual(h.state.form, {});
  assert.equal(h.state.message, "Contacto prospecto agregado.");
  assert.equal(h.ref.current, false);
  assert.equal(h.state.saving, false);
});

for (const [label, data] of [["respuesta nula", null], ["sin ID", { ...created, id: null }], ["ID vacío", { ...created, id: "" }], ["ID de espacios", { ...created, id: "   " }], ["prospecto diferente", { ...created, prospect_id: "other-synthetic" }]]) {
  test(`agregar contacto prospecto: ${label} no confirma ni limpia ni reintenta`, async () => {
    const h = harness({ response: async () => ({ data, error: null }) });
    await assert.doesNotReject(h.submit());
    assert.equal(h.state.message, uncertain);
    assert.equal(h.state.form.full_name, "  Contacto  ");
    assert.deepEqual(h.state.contacts, [existing]);
    assert.equal(h.calls.length, 1);
    assert.equal(h.ref.current, false);
    assert.equal(h.state.saving, false);
  });
}

test("agregar contacto prospecto: conserva destino, columnas y normalización", async () => {
  const h = harness();
  await h.submit();
  assert.deepEqual(h.calls[0], { table: "prospect_contacts", columns: "contract", payload: { prospect_id: created.prospect_id, full_name: "Contacto", role: "Compras", email: "synthetic@example.invalid", phone: "123", linkedin_url: "https://example.invalid/profile", notes: "Nota" } });
});

test("agregar contacto prospecto: selección ausente o nombre vacío no escriben", async () => {
  for (const options of [{ selected: null }, { name: "   " }]) {
    const h = harness(options);
    await h.submit();
    assert.equal(h.calls.length, 0);
    assert.equal(h.ref.current, false);
  }
});

test("agregar contacto prospecto: fallo libera guarda para intento manual posterior", async () => {
  let attempts = 0;
  const h = harness({ response: async () => { if (++attempts === 1) throw Error("Private detail"); return { data: created, error: null }; } });
  await assert.doesNotReject(h.submit());
  await h.submit();
  assert.equal(h.calls.length, 2);
  assert.equal(h.state.message, "Contacto prospecto agregado.");
});

test("agregar contacto prospecto: UI protege sólo el alta durante el envío", () => {
  assert.ok(/<form className="activity-form" onSubmit=\{addContact\}>\s*<fieldset disabled=\{savingNewContact\} aria-busy=\{savingNewContact\}/.test(source));
  assert.ok(/\{savingNewContact \? "Guardando" : "Agregar contacto"\}/.test(source));
  assert.equal((source.match(/disabled=\{savingNewContact\}/g) || []).length, 1);
  const card = source.slice(source.indexOf("function EditableProspectContactCard("), source.indexOf("function QualityPanel("));
  assert.equal(card.includes("savingNewContact"), false);
});
